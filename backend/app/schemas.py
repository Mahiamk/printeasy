from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID
from typing import Optional
from .models import PrintJobStatus


# --- Generic ---
class MessageResponse(BaseModel):
    message: str


# --- Auth ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    has_printing_code: bool
    is_superadmin: bool = False

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserOut] = None


class GoogleLoginRequest(BaseModel):
    id_token: str


class GoogleConfigResponse(BaseModel):
    client_id: Optional[str] = None


# --- QR Code Login ---
class QRInitiateRequest(BaseModel):
    device_info: Optional[str] = None


class QRInitiateResponse(BaseModel):
    token: str
    expires_at: datetime
    expires_in_seconds: int
    device_info: Optional[str] = None


class QRStatusResponse(BaseModel):
    status: str  # pending, approved, consumed, expired, rejected
    access_token: Optional[str] = None
    user: Optional[UserOut] = None
    device_info: Optional[str] = None


class QRInfoResponse(BaseModel):
    token: str
    status: str
    device_info: Optional[str] = None
    created_at: datetime
    expires_at: datetime


class QRAuthorizeRequest(BaseModel):
    token: str
    action: str = "approve"  # "approve" or "reject"




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


class MarkPrintedRequest(BaseModel):
    color_mode: Optional[str] = None
    page_count: Optional[int] = None
    copies: Optional[int] = 1
    purge_file: Optional[bool] = True



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


# --- Superadmin Analytics ---
class SuperadminStatsResponse(BaseModel):
    total_users: int
    total_printed_jobs: int
    total_queued_jobs: int
    total_bw_pages_printed: int
    total_color_pages_printed: int
    total_storage_mb: float


class PrintTrendPoint(BaseModel):
    date_label: str
    raw_date: str
    bw_pages: int
    color_pages: int
    total_jobs: int
    bw_jobs: int
    color_jobs: int


class SuperadminTrendsResponse(BaseModel):
    period: str  # 'daily' | 'weekly' | 'monthly'
    data: list[PrintTrendPoint]


class AdminUserItem(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    is_superadmin: bool = False
    total_jobs: int
    printed_jobs: int
    bw_pages_used: int
    color_pages_used: int
