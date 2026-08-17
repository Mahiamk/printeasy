from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import PrintJob, PrintJobStatus
from ..schemas import StatsResponse, DailyCount
from ..auth import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
async def get_user_stats(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=6)
    start_date = datetime(seven_days_ago.year, seven_days_ago.month, seven_days_ago.day, tzinfo=timezone.utc)

    # Fetch all user jobs
    stmt = select(PrintJob).where(PrintJob.user_id == current_user.id)
    res = await db.execute(stmt)
    all_jobs = res.scalars().all()

    total_uploads = len(all_jobs)
    total_printed = sum(1 for j in all_jobs if j.status == PrintJobStatus.printed)
    total_queued = sum(1 for j in all_jobs if j.status == PrintJobStatus.queued and j.expires_at > now)
    storage_mb = sum(j.file_size for j in all_jobs if j.status == PrintJobStatus.queued and j.expires_at > now) / (1024 * 1024)

    # Quota calculations (400 B&W, 20 Color) based strictly on pages ACTUALLY PRINTED
    BW_TOTAL = 400
    COLOR_TOTAL = 20

    bw_used = sum(
        j.page_count for j in all_jobs
        if j.status == PrintJobStatus.printed and j.color_mode != "color"
    )
    color_used = sum(
        j.page_count for j in all_jobs
        if j.status == PrintJobStatus.printed and j.color_mode == "color"
    )

    # Calculate 7-day sparkline buckets
    daily_uploads: dict[str, int] = {}
    daily_prints: dict[str, int] = {}
    daily_sizes: dict[str, float] = {}
    daily_bw_pages: dict[str, int] = {}
    daily_color_pages: dict[str, int] = {}

    for i in range(7):
        d = start_date + timedelta(days=i)
        day_key = d.strftime("%b %d")
        daily_uploads[day_key] = 0
        daily_prints[day_key] = 0
        daily_sizes[day_key] = 0.0
        daily_bw_pages[day_key] = 0
        daily_color_pages[day_key] = 0

    for job in all_jobs:
        if job.created_at >= start_date:
            day_key = job.created_at.strftime("%b %d")
            if day_key in daily_uploads:
                daily_uploads[day_key] += 1
                daily_sizes[day_key] += job.file_size / (1024 * 1024)

        if job.printed_at and job.printed_at >= start_date and job.status == PrintJobStatus.printed:
            day_key = job.printed_at.strftime("%b %d")
            if day_key in daily_prints:
                daily_prints[day_key] += 1
            if day_key in daily_color_pages and job.color_mode == "color":
                daily_color_pages[day_key] += job.page_count
            elif day_key in daily_bw_pages:
                daily_bw_pages[day_key] += job.page_count

    uploads_per_day = [
        DailyCount(date=k, count=v, size_mb=round(daily_sizes[k], 2))
        for k, v in daily_uploads.items()
    ]
    prints_per_day = [
        DailyCount(date=k, count=v, size_mb=0.0)
        for k, v in daily_prints.items()
    ]
    size_per_day = [
        DailyCount(date=k, count=int(v), size_mb=round(v, 2))
        for k, v in daily_sizes.items()
    ]
    bw_pages_per_day = [
        DailyCount(date=k, count=v, size_mb=0.0)
        for k, v in daily_bw_pages.items()
    ]
    color_pages_per_day = [
        DailyCount(date=k, count=v, size_mb=0.0)
        for k, v in daily_color_pages.items()
    ]

    return StatsResponse(
        total_uploads=total_uploads,
        total_printed=total_printed,
        total_queued=total_queued,
        storage_mb=round(storage_mb, 2),
        bw_quota_total=BW_TOTAL,
        bw_quota_used=bw_used,
        bw_quota_remaining=max(0, BW_TOTAL - bw_used),
        color_quota_total=COLOR_TOTAL,
        color_quota_used=color_used,
        color_quota_remaining=max(0, COLOR_TOTAL - color_used),
        uploads_per_day=uploads_per_day,
        prints_per_day=prints_per_day,
        size_per_day=size_per_day,
        bw_pages_per_day=bw_pages_per_day,
        color_pages_per_day=color_pages_per_day,
    )
