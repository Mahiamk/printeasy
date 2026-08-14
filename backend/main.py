import os
from contextlib import asynccontextmanager
from pathlib import Path
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import select, or_
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import AsyncSessionLocal
from app.models import PrintJob, PrintJobStatus
from app.blob import delete_blob_file, LOCAL_UPLOADS_DIR
from app.routes.auth import router as auth_router
from app.routes.jobs import router as jobs_router
from app.routes.code import router as code_router
from app.routes.stats import router as stats_router


async def cleanup_expired_jobs():
    """Periodic job to clean up expired/printed jobs and files."""
    try:
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            stmt = select(PrintJob).where(
                or_(
                    lt(PrintJob.expires_at, now),
                    PrintJob.status == PrintJobStatus.printed,
                )
            )
            res = await db.execute(stmt)
            expired_jobs = res.scalars().all()
            for job in expired_jobs:
                await delete_blob_file(job.blob_url)
                await db.delete(job)
            await db.commit()
    except Exception as e:
        print(f"[Cleanup Scheduler Error] {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background cleanup task
    scheduler = AsyncIOScheduler()
    scheduler.add_job(cleanup_expired_jobs, "interval", minutes=30)
    scheduler.start()
    yield
    scheduler.shutdown()


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


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/files/download/{filename}")
async def download_local_file(filename: str):
    file_path = LOCAL_UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found or has expired.")
    return FileResponse(
        path=file_path,
        filename=filename.split("-", 1)[-1] if "-" in filename else filename,
    )
