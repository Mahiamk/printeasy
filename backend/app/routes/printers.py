from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import PrintJob, PrintJobStatus
from ..schemas import PrintJobOut
from ..auth import get_current_user, AuthenticatedUser
from ..blob import get_blob_file_bytes, delete_blob_file
from ..printers import CAMPUS_PRINTERS, CampusPrinter, get_printers_with_status, stream_job_to_printer, check_printer_online
from .relay import _pending_relay_jobs, _relay_state

router = APIRouter(prefix="/api/printers", tags=["printers"])


class NetworkSpoolRequest(BaseModel):
    printer_id: str
    department_code: Optional[str] = ""
    pin_code: Optional[str] = ""  # alias for department_code
    color_mode: Optional[str] = "bw"
    page_count: Optional[int] = 1
    copies: Optional[int] = 1
    purge_file: Optional[bool] = False


class NetworkSpoolResponse(BaseModel):
    success: bool
    message: str
    printer_name: str
    printer_host: str
    spooled_bytes: int
    department_code_used: str
    via_relay: bool
    job: PrintJobOut


@router.get("", response_model=list[CampusPrinter])
async def list_printers():
    """Returns list of campus printers with live connectivity status."""
    return await get_printers_with_status()


@router.post("/spool/{job_id}", response_model=NetworkSpoolResponse)
async def spool_job_to_printer(
    job_id: UUID,
    req: NetworkSpoolRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Directly streams document bytes with Department Code over the campus network to the selected printer (172.16.48.54:9100).
    If running in cloud, dispatches job via the Campus Relay Agent on the Lab PC.
    """
    # 1. Locate printer
    target_printer = next((p for p in CAMPUS_PRINTERS if p.id == req.printer_id), None)
    if not target_printer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Printer '{req.printer_id}' not found.",
        )

    # 2. Locate print job
    stmt = select(PrintJob).where(
        and_(PrintJob.id == job_id, PrintJob.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found.")

    # 3. Retrieve document bytes
    try:
        doc_bytes = await get_blob_file_bytes(job.blob_url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not retrieve document stream: {str(e)}",
        )

    user_display = current_user.user.email.split("@")[0]
    dept_code = (req.department_code or req.pin_code or "").strip()
    copies_to_use = max(1, min(req.copies or 1, 50))
    mode_to_use = (req.color_mode or "bw").lower()

    # 4. Check if backend can reach 172.16.48.54 directly (e.g. running on campus network)
    can_direct_reach = await check_printer_online(target_printer.host, target_printer.port, timeout=1.0)

    via_relay = False
    if can_direct_reach:
        # Direct socket stream
        success, log_msg = await stream_job_to_printer(
            host=target_printer.host,
            port=target_printer.port,
            file_bytes=doc_bytes,
            job_name=job.file_name,
            user_name=user_display,
            department_code=dept_code,
            color_mode=mode_to_use,
            copies=copies_to_use,
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Printer spool failed: {log_msg}.",
            )
        job.status = PrintJobStatus.printed
        job.printed_at = datetime.now(timezone.utc)
    else:
        # Enqueue for Lab PC Campus Relay Agent (Scenario B Option 2)
        via_relay = True
        _pending_relay_jobs[str(job.id)] = {
            "job_id": str(job.id),
            "file_name": job.file_name,
            "blob_url": job.blob_url,
            "printer_id": target_printer.id,
            "printer_host": target_printer.host,
            "printer_port": target_printer.port,
            "department_code": dept_code,
            "color_mode": mode_to_use,
            "page_count": req.page_count or job.page_count,
            "copies": copies_to_use,
            "purge_file": req.purge_file or False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        # Mark as queued in database
        job.status = PrintJobStatus.printed
        job.printed_at = datetime.now(timezone.utc)

    # 5. Apply quota & settings update
    if req.color_mode and req.color_mode.lower() in ("color", "bw"):
        job.color_mode = req.color_mode.lower()
    if req.page_count is not None and req.page_count > 0:
        job.page_count = max(1, min(req.page_count * copies_to_use, 500))

    if req.purge_file and not via_relay:
        await delete_blob_file(job.blob_url)

    await db.commit()
    await db.refresh(job)

    if via_relay:
        msg = f"Document sent to Library Relay! The Toshiba printer will output your pages with Department Code: {dept_code or 'None'}."
    else:
        msg = f"Document directly sent to {target_printer.name}! Outputting physical pages with Department Code: {dept_code or 'None'}."

    return NetworkSpoolResponse(
        success=True,
        message=msg,
        printer_name=target_printer.name,
        printer_host=f"{target_printer.host}:{target_printer.port}",
        spooled_bytes=len(doc_bytes),
        department_code_used=dept_code,
        via_relay=via_relay,
        job=job,
    )
