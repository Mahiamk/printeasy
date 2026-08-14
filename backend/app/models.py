import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Enum as PgEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
import enum


class PrintJobStatus(str, enum.Enum):
    queued = "queued"
    printed = "printed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    printing_code_encrypted: Mapped[str | None] = mapped_column(String, nullable=True)
    printing_code_salt: Mapped[str | None] = mapped_column(String, nullable=True)
    printing_code_iv: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_type: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    color_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="bw")
    page_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    blob_url: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[PrintJobStatus] = mapped_column(
        PgEnum(PrintJobStatus, name="print_job_status", create_type=False),
        default=PrintJobStatus.queued,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    printed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
