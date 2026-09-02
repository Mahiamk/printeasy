from datetime import datetime, timezone, timedelta
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import PrintJob, PrintJobStatus
from ..schemas import PrintJobOut
from ..blob import get_blob_file_bytes, delete_blob_file

router = APIRouter(prefix="/api/relay", tags=["relay"])

# Secret token to authenticate the campus relay agent on the lab PC
RELAY_SECRET_TOKEN = "printeasy-campus-relay-key-2026"

# In-memory relay status & queue store
_relay_state = {
    "last_heartbeat": None,
    "agent_name": "Lab Station Relay",
    "printer_host": "172.16.48.54",
    "printer_online": False,
}

_pending_relay_jobs: dict[str, dict] = {}


class RelayHeartbeatRequest(BaseModel):
    agent_name: str = "Lab Station Relay"
    printer_host: str = "172.16.48.54"
    printer_online: bool = False


class RelayJobEnqueueRequest(BaseModel):
    printer_id: str = "toshiba-library-3525ac"
    printer_host: str = "172.16.48.54"
    printer_port: int = 9100
    department_code: str = ""
    color_mode: str = "bw"
    page_count: int = 1
    copies: int = 1
    purge_file: bool = False


class RelayJobCompleteRequest(BaseModel):
    success: bool
    error_message: Optional[str] = None
    spooled_bytes: Optional[int] = 0


def verify_relay_token(x_relay_token: Optional[str] = Header(None)):
    if not x_relay_token or x_relay_token != RELAY_SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing campus relay token.",
        )
    return True


@router.get("/status")
async def get_relay_status():
    """Public status endpoint for frontend to show if Library Relay is currently active."""
    last_hb = _relay_state.get("last_heartbeat")
    is_active = False
    if last_hb:
        diff_seconds = (datetime.now(timezone.utc) - last_hb).total_seconds()
        is_active = diff_seconds < 60  # Heartbeat within last 60 seconds

    return {
        "is_relay_active": is_active,
        "last_heartbeat": last_hb.isoformat() if last_hb else None,
        "agent_name": _relay_state.get("agent_name"),
        "printer_host": _relay_state.get("printer_host"),
        "printer_online": _relay_state.get("printer_online", False) and is_active,
        "pending_queue_count": len(_pending_relay_jobs),
    }


@router.post("/heartbeat")
async def relay_heartbeat(
    req: RelayHeartbeatRequest,
    _: bool = Depends(verify_relay_token),
):
    """Heartbeat sent by the Lab PC relay agent every 15-30 seconds."""
    _relay_state["last_heartbeat"] = datetime.now(timezone.utc)
    _relay_state["agent_name"] = req.agent_name
    _relay_state["printer_host"] = req.printer_host
    _relay_state["printer_online"] = req.printer_online
    return {"status": "ok", "pending_jobs": len(_pending_relay_jobs)}


@router.get("/pending")
async def get_pending_relay_jobs(
    _: bool = Depends(verify_relay_token),
):
    """Called by the campus relay agent to retrieve print jobs waiting for transmission to 172.16.48.54."""
    jobs_list = list(_pending_relay_jobs.values())
    return jobs_list


@router.post("/jobs/{job_id}/complete")
async def mark_relay_job_complete(
    job_id: str,
    req: RelayJobCompleteRequest,
    _: bool = Depends(verify_relay_token),
    db: AsyncSession = Depends(get_db),
):
    """Called by the relay agent after successfully spooling bytes to Toshiba printer."""
    job_data = _pending_relay_jobs.pop(job_id, None)

    try:
        uuid_obj = UUID(job_id)
        stmt = select(PrintJob).where(PrintJob.id == uuid_obj)
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()

        if job:
            if req.success:
                job.status = PrintJobStatus.printed
                job.printed_at = datetime.now(timezone.utc)
                if job_data and job_data.get("purge_file"):
                    await delete_blob_file(job.blob_url)
                await db.commit()
            else:
                # Log failure
                print(f"[Relay] Job {job_id} failed: {req.error_message}")
    except Exception as e:
        print(f"[Relay] Error finalizing completed job {job_id}: {e}")

    return {"status": "ok", "job_id": job_id}
