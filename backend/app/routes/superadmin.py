from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User, PrintJob, PrintJobStatus
from ..schemas import (
    SuperadminStatsResponse,
    SuperadminTrendsResponse,
    PrintTrendPoint,
    AdminUserItem,
)
from ..auth import get_current_superadmin, AuthenticatedUser

router = APIRouter(prefix="/api/admin", tags=["superadmin"])


@router.get("/stats", response_model=SuperadminStatsResponse)
async def get_superadmin_stats(
    current_user: AuthenticatedUser = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    # 1. Total Users
    users_stmt = select(func.count(User.id))
    users_res = await db.execute(users_stmt)
    total_users = users_res.scalar() or 0

    # 2. Total Print Jobs & Page metrics
    jobs_stmt = select(PrintJob)
    jobs_res = await db.execute(jobs_stmt)
    all_jobs = jobs_res.scalars().all()

    total_printed_jobs = sum(1 for j in all_jobs if j.status == PrintJobStatus.printed)
    total_queued_jobs = sum(1 for j in all_jobs if j.status == PrintJobStatus.queued and j.expires_at > now)
    total_storage_mb = sum(j.file_size for j in all_jobs if j.status == PrintJobStatus.queued and j.expires_at > now) / (1024 * 1024)

    total_bw_pages_printed = sum(
        j.page_count for j in all_jobs
        if j.status == PrintJobStatus.printed and j.color_mode != "color"
    )
    total_color_pages_printed = sum(
        j.page_count for j in all_jobs
        if j.status == PrintJobStatus.printed and j.color_mode == "color"
    )

    return SuperadminStatsResponse(
        total_users=total_users,
        total_printed_jobs=total_printed_jobs,
        total_queued_jobs=total_queued_jobs,
        total_bw_pages_printed=total_bw_pages_printed,
        total_color_pages_printed=total_color_pages_printed,
        total_storage_mb=round(total_storage_mb, 2),
    )


@router.get("/trends", response_model=SuperadminTrendsResponse)
async def get_superadmin_trends(
    period: Literal["daily", "weekly", "monthly"] = Query(
        default="daily", description="Time interval grouping: daily (14 days), weekly (12 weeks), monthly (12 months)"
    ),
    current_user: AuthenticatedUser = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # Fetch all jobs
    jobs_stmt = select(PrintJob)
    jobs_res = await db.execute(jobs_stmt)
    all_jobs = jobs_res.scalars().all()

    points: list[PrintTrendPoint] = []

    if period == "daily":
        # Last 14 days
        DAYS_COUNT = 14
        start_date = today - timedelta(days=DAYS_COUNT - 1)

        buckets: dict[str, dict] = {}
        for i in range(DAYS_COUNT):
            d = start_date + timedelta(days=i)
            key = d.strftime("%Y-%m-%d")
            label = d.strftime("%b %d")
            buckets[key] = {
                "label": label,
                "raw_date": key,
                "bw_pages": 0,
                "color_pages": 0,
                "total_jobs": 0,
                "bw_jobs": 0,
                "color_jobs": 0,
            }

        for j in all_jobs:
            target_time = j.printed_at if j.printed_at else j.created_at
            if target_time and target_time >= start_date:
                key = target_time.strftime("%Y-%m-%d")
                if key in buckets:
                    buckets[key]["total_jobs"] += 1
                    if j.color_mode == "color":
                        buckets[key]["color_pages"] += j.page_count
                        buckets[key]["color_jobs"] += 1
                    else:
                        buckets[key]["bw_pages"] += j.page_count
                        buckets[key]["bw_jobs"] += 1

        points = [
            PrintTrendPoint(
                date_label=v["label"],
                raw_date=v["raw_date"],
                bw_pages=v["bw_pages"],
                color_pages=v["color_pages"],
                total_jobs=v["total_jobs"],
                bw_jobs=v["bw_jobs"],
                color_jobs=v["color_jobs"],
            )
            for v in buckets.values()
        ]

    elif period == "weekly":
        # Last 12 weeks
        WEEKS_COUNT = 12
        # Start of current week (Monday)
        current_monday = today - timedelta(days=today.weekday())
        start_monday = current_monday - timedelta(weeks=WEEKS_COUNT - 1)

        buckets: dict[str, dict] = {}
        for i in range(WEEKS_COUNT):
            w_start = start_monday + timedelta(weeks=i)
            w_end = w_start + timedelta(days=6)
            key = w_start.strftime("%Y-%m-%d")
            label = f"{w_start.strftime('%b %d')}"
            buckets[key] = {
                "label": label,
                "raw_date": key,
                "start_dt": w_start,
                "end_dt": w_end + timedelta(days=1),
                "bw_pages": 0,
                "color_pages": 0,
                "total_jobs": 0,
                "bw_jobs": 0,
                "color_jobs": 0,
            }

        for j in all_jobs:
            target_time = j.printed_at if j.printed_at else j.created_at
            if target_time and target_time >= start_monday:
                for k, v in buckets.items():
                    if v["start_dt"] <= target_time < v["end_dt"]:
                        v["total_jobs"] += 1
                        if j.color_mode == "color":
                            v["color_pages"] += j.page_count
                            v["color_jobs"] += 1
                        else:
                            v["bw_pages"] += j.page_count
                            v["bw_jobs"] += 1
                        break

        points = [
            PrintTrendPoint(
                date_label=v["label"],
                raw_date=v["raw_date"],
                bw_pages=v["bw_pages"],
                color_pages=v["color_pages"],
                total_jobs=v["total_jobs"],
                bw_jobs=v["bw_jobs"],
                color_jobs=v["color_jobs"],
            )
            for v in buckets.values()
        ]

    elif period == "monthly":
        # Last 12 months
        MONTHS_COUNT = 12
        buckets: list[dict] = []

        # Generate last 12 months
        year = now.year
        month = now.month
        for _ in range(MONTHS_COUNT):
            start_m = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                next_m = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                next_m = datetime(year, month + 1, 1, tzinfo=timezone.utc)

            buckets.insert(0, {
                "label": start_m.strftime("%b %Y"),
                "raw_date": start_m.strftime("%Y-%m"),
                "start_dt": start_m,
                "end_dt": next_m,
                "bw_pages": 0,
                "color_pages": 0,
                "total_jobs": 0,
                "bw_jobs": 0,
                "color_jobs": 0,
            })

            month -= 1
            if month == 0:
                month = 12
                year -= 1

        for j in all_jobs:
            target_time = j.printed_at if j.printed_at else j.created_at
            if target_time:
                for v in buckets:
                    if v["start_dt"] <= target_time < v["end_dt"]:
                        v["total_jobs"] += 1
                        if j.color_mode == "color":
                            v["color_pages"] += j.page_count
                            v["color_jobs"] += 1
                        else:
                            v["bw_pages"] += j.page_count
                            v["bw_jobs"] += 1
                        break

        points = [
            PrintTrendPoint(
                date_label=v["label"],
                raw_date=v["raw_date"],
                bw_pages=v["bw_pages"],
                color_pages=v["color_pages"],
                total_jobs=v["total_jobs"],
                bw_jobs=v["bw_jobs"],
                color_jobs=v["color_jobs"],
            )
            for v in buckets
        ]

    return SuperadminTrendsResponse(period=period, data=points)


@router.get("/users", response_model=list[AdminUserItem])
async def get_superadmin_users(
    current_user: AuthenticatedUser = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    users_stmt = select(User).order_by(User.created_at.desc())
    users_res = await db.execute(users_stmt)
    users = users_res.scalars().all()

    jobs_stmt = select(PrintJob)
    jobs_res = await db.execute(jobs_stmt)
    all_jobs = jobs_res.scalars().all()

    # Map jobs per user
    user_jobs: dict[str, list[PrintJob]] = {}
    for j in all_jobs:
        u_str = str(j.user_id)
        if u_str not in user_jobs:
            user_jobs[u_str] = []
        user_jobs[u_str].append(j)

    result: list[AdminUserItem] = []
    for u in users:
        u_id_str = str(u.id)
        u_list = user_jobs.get(u_id_str, [])
        total_jobs = len(u_list)
        printed_jobs = sum(1 for j in u_list if j.status == PrintJobStatus.printed)
        bw_pages_used = sum(j.page_count for j in u_list if j.color_mode != "color")
        color_pages_used = sum(j.page_count for j in u_list if j.color_mode == "color")

        result.append(
            AdminUserItem(
                id=u.id,
                email=u.email,
                created_at=u.created_at,
                is_superadmin=getattr(u, "is_superadmin", False),
                total_jobs=total_jobs,
                printed_jobs=printed_jobs,
                bw_pages_used=bw_pages_used,
                color_pages_used=color_pages_used,
            )
        )

    return result
