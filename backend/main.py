import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


from app.database import AsyncSessionLocal, get_db
from app.models import PrintJob, PrintJobStatus
from app.blob import delete_blob_file, LOCAL_UPLOADS_DIR
from app.routes.auth import router as auth_router
from app.routes.jobs import router as jobs_router
from app.routes.code import router as code_router
from app.routes.stats import router as stats_router
from app.routes.superadmin import router as superadmin_router
from app.routes.printers import router as printers_router
from app.routes.relay import router as relay_router


async def cleanup_expired_jobs():
    """Periodic job to clean up expired queued jobs and blob files."""
    try:
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            # Only remove expired unprinted queued jobs from storage and database
            stmt = select(PrintJob).where(
                PrintJob.status == PrintJobStatus.queued,
                PrintJob.expires_at < now,
            )
            res = await db.execute(stmt)
            expired_jobs = res.scalars().all()
            for job in expired_jobs:
                await delete_blob_file(job.blob_url)
                await db.delete(job)
            # Clean up expired or consumed QR login sessions
            from app.models import QRLoginSession
            stmt_qr = select(QRLoginSession).where(
                or_(
                    QRLoginSession.expires_at < now,
                    QRLoginSession.status.in_(["consumed", "expired", "rejected"]),
                )
            )
            res_qr = await db.execute(stmt_qr)
            for qr_sess in res_qr.scalars().all():
                await db.delete(qr_sess)

            await db.commit()
    except Exception as e:
        print(f"[Cleanup Scheduler Error] {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables exist in database
    try:
        from app.database import engine, Base
        import app.models  # noqa
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"[DB Init Note] {e}")

    # Only start background scheduler if running as a standalone persistent server (not on Vercel Serverless)
    scheduler = None
    is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
    if not is_serverless:
        try:
            scheduler = AsyncIOScheduler()
            scheduler.add_job(cleanup_expired_jobs, "interval", minutes=30)
            scheduler.start()
        except Exception as e:
            print(f"[Lifespan Scheduler Note] {e}")

    yield

    if scheduler and scheduler.running:
        try:
            scheduler.shutdown(wait=False)
        except Exception:
            pass


app = FastAPI(
    title="PrintEasy API",
    description="Secure Library Print Queue Backend with AES-256-GCM encryption & D3 stats",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(code_router)
app.include_router(stats_router)
app.include_router(superadmin_router)
app.include_router(printers_router)
app.include_router(relay_router)


@app.get("/api/health")
async def health_check():
    return {"status": "I m fine", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/files/download/{filename}")
async def download_local_file(filename: str, db: AsyncSession = Depends(get_db)):
    # 1. Check local filesystem cache
    file_path = LOCAL_UPLOADS_DIR / filename
    if file_path.exists():
        return FileResponse(
            path=file_path,
            filename=filename.split("-", 1)[-1] if "-" in filename else filename,
        )

    # 2. Check Database fallback (Neon Postgres)
    # Critical for Vercel serverless / multi-instance setups where disk is ephemeral
    stmt = (
        select(PrintJob)
        .where(
            or_(
                PrintJob.blob_url.like(f"%{filename}%"),
                PrintJob.file_name == filename,
            )
        )
        .order_by(PrintJob.created_at.desc())
    )
    res = await db.execute(stmt)
    job = res.scalars().first()

    if job and job.file_data:
        # Cache locally to disk if writable
        try:
            with open(file_path, "wb") as f:
                f.write(job.file_data)
        except Exception:
            pass

        # Return file content stream
        clean_name = job.file_name or (filename.split("-", 1)[-1] if "-" in filename else filename)
        return Response(
            content=job.file_data,
            media_type=job.file_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'inline; filename="{clean_name}"',
                "Cache-Control": "public, max-age=3600",
            },
        )

    # 3. If job exists with external URL (e.g. Vercel Blob)
    if job and job.blob_url and (job.blob_url.startswith("http://") or job.blob_url.startswith("https://")):
        return RedirectResponse(url=job.blob_url)

    raise HTTPException(
        status_code=404,
        detail="Document file not found in storage (it may have expired or been purged after printing).",
    )

