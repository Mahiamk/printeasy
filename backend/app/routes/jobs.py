from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import PrintJob, PrintJobStatus
from ..schemas import PrintJobOut
from ..auth import get_current_user, AuthenticatedUser
from ..blob import upload_blob_file, delete_blob_file

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".tif", ".webp"
}
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi", ".com", ".scr", ".pif", ".vbs", ".js", ".jar",
    ".app", ".dmg", ".deb", ".rpm", ".bin", ".run", ".cpl", ".inf", ".reg", ".sys", ".dll"
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_QUEUE_SIZE = 15


@router.get("", response_model=list[PrintJobOut])
async def list_print_jobs(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(PrintJob)
        .where(
            and_(
                PrintJob.user_id == current_user.id,
                PrintJob.status == PrintJobStatus.queued,
                PrintJob.expires_at > now,
            )
        )
        .order_by(PrintJob.created_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{job_id}", response_model=PrintJobOut)
async def get_print_job(
    job_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PrintJob).where(
        and_(PrintJob.id == job_id, PrintJob.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found.")
    return job


from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status

BW_QUOTA_MAX = 400
COLOR_QUOTA_MAX = 20


@router.post("/upload", response_model=PrintJobOut)
async def upload_job(
    file: UploadFile = File(...),
    color_mode: str = Form("bw"),
    page_count: int = Form(1),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filename = file.filename or "unknown_file"
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""

    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Executable file types are strictly prohibited.")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, DOCX, DOC, PNG, JPG, GIF, BMP, TIFF, WEBP.",
        )

    mode = "color" if color_mode.lower() == "color" else "bw"
    pages = max(1, min(page_count, 100))

    # Calculate current quota usage (printed + active in queue)
    now = datetime.now(timezone.utc)
    all_jobs_stmt = select(PrintJob).where(PrintJob.user_id == current_user.id)
    all_jobs_res = await db.execute(all_jobs_stmt)
    user_jobs = all_jobs_res.scalars().all()

    active_queued = [j for j in user_jobs if j.status == PrintJobStatus.queued and j.expires_at > now]
    if len(active_queued) >= MAX_QUEUE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Queue limit reached ({MAX_QUEUE_SIZE} files maximum).",
        )

    # Check color / BW quota
    if mode == "color":
        used_color = sum(j.page_count for j in user_jobs if j.color_mode == "color")
        if used_color + pages > COLOR_QUOTA_MAX:
            remaining = max(0, COLOR_QUOTA_MAX - used_color)
            raise HTTPException(
                status_code=400,
                detail=f"Color quota exceeded! You requested {pages} pages, but only have {remaining} color pages remaining (out of {COLOR_QUOTA_MAX}).",
            )
    else:
        used_bw = sum(j.page_count for j in user_jobs if j.color_mode != "color")
        if used_bw + pages > BW_QUOTA_MAX:
            remaining = max(0, BW_QUOTA_MAX - used_bw)
            raise HTTPException(
                status_code=400,
                detail=f"Black & White quota exceeded! You requested {pages} pages, but only have {remaining} B&W pages remaining (out of {BW_QUOTA_MAX}).",
            )

    # Read and validate size
    file_size = 0
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({(file_size / (1024*1024)):.1f}MB). Maximum allowed is 20MB.",
        )

    # Upload to Vercel Blob or local storage
    blob_url = await upload_blob_file(file, filename)

    job = PrintJob(
        user_id=current_user.id,
        file_name=filename,
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        color_mode=mode,
        page_count=pages,
        blob_url=blob_url,
        status=PrintJobStatus.queued,
        expires_at=now + timedelta(hours=24),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    return job


@router.patch("/{job_id}/print", response_model=PrintJobOut)
async def mark_as_printed(
    job_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PrintJob).where(
        and_(PrintJob.id == job_id, PrintJob.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found.")

    # Delete blob storage
    await delete_blob_file(job.blob_url)

    job.status = PrintJobStatus.printed
    job.printed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(job)

    return job


@router.delete("/{job_id}")
async def delete_job(
    job_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PrintJob).where(
        and_(PrintJob.id == job_id, PrintJob.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found.")

    await delete_blob_file(job.blob_url)
    await db.delete(job)
    await db.commit()

    return {"success": True}
