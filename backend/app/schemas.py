from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID
from typing import Optional
from .models import PrintJobStatus


# --- Auth ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleLoginRequest(BaseModel):
    id_token: str


class GoogleConfigResponse(BaseModel):
    client_id: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    has_printing_code: bool

    class Config:
        from_attributes = True


# --- Print Jobs ---
class PrintJobOut(BaseModel):
    id: UUID
    file_name: str
    file_type: str
    file_size: int
    color_mode: str = "bw"
    page_count: int = 1
    blob_url: str
    status: PrintJobStatus
    created_at: datetime
    expires_at: datetime
    printed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Printing Code ---
class SavePrintingCodeRequest(BaseModel):
    printing_code: str


class PrintingCodeResponse(BaseModel):
    code: str


# --- Stats & Quotas ---
class DailyCount(BaseModel):
    date: str
    count: int
    size_mb: float


class StatsResponse(BaseModel):
    total_uploads: int
    total_printed: int
    total_queued: int
    storage_mb: float
    # Quotas: Color (20 pages), B&W (400 pages)
    bw_quota_total: int = 400
    bw_quota_used: int = 0
    bw_quota_remaining: int = 400
    color_quota_total: int = 20
    color_quota_used: int = 0
    color_quota_remaining: int = 20
    uploads_per_day: list[DailyCount]
    prints_per_day: list[DailyCount]
    size_per_day: list[DailyCount]
    bw_pages_per_day: list[DailyCount]
    color_pages_per_day: list[DailyCount]
