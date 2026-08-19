import base64
import json
import os
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .database import get_db
from .models import User

import bcrypt

security = HTTPBearer()

RAW_SECRET = os.getenv("JWT_SECRET", "default_insecure_secret_key_32_bytes_long_12345")
# Ensure 32-byte key for AES-GCM encryption of session secrets
if len(RAW_SECRET) == 64 and all(c in "0123456789abcdefABCDEF" for c in RAW_SECRET):
    SECRET_KEY_BYTES = bytes.fromhex(RAW_SECRET)
else:
    # Hash or pad to 32 bytes
    import hashlib
    SECRET_KEY_BYTES = hashlib.sha256(RAW_SECRET.encode("utf-8")).digest()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 4  # 4 hours

# Superadmin email whitelist from environment
SUPERADMIN_EMAILS = [
    e.strip().lower()
    for e in os.getenv("SUPERADMIN_EMAILS", "").split(",")
    if e.strip()
]


def check_is_superadmin(user: User) -> bool:
    if getattr(user, "is_superadmin", False):
        return True
    if user.email and user.email.lower() in SUPERADMIN_EMAILS:
        return True
    # If no superadmin emails configured, default allow for local dev / first user if needed
    if not SUPERADMIN_EMAILS and (user.email.startswith("admin") or user.email.endswith("@admin.com")):
        return True
    return False


def hash_password(password: str) -> str:
    # Truncate at 72 bytes per bcrypt spec
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def _encrypt_session_data(data: str) -> str:
    """Encrypt session password with server secret for in-JWT storage"""
    iv = os.urandom(12)
    aesgcm = AESGCM(SECRET_KEY_BYTES)
    ciphertext = aesgcm.encrypt(iv, data.encode("utf-8"), None)
    payload = iv + ciphertext
    return base64.b64encode(payload).decode("ascii")


def _decrypt_session_data(token_str: str) -> str:
    raw = base64.b64decode(token_str)
    iv = raw[:12]
    ciphertext = raw[12:]
    aesgcm = AESGCM(SECRET_KEY_BYTES)
    decrypted = aesgcm.decrypt(iv, ciphertext, None)
    return decrypted.decode("utf-8")


def create_access_token(user_id: UUID, email: str, password: str, is_superadmin: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    encrypted_pw = _encrypt_session_data(password)
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "pdk": encrypted_pw,
        "admin": is_superadmin,
        "exp": expire,
    }
    encoded_jwt = jwt.encode(to_encode, RAW_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


class AuthenticatedUser:
    def __init__(self, user: User, session_password: str):
        self.user = user
        self.session_password = session_password

    @property
    def id(self) -> UUID:
        return self.user.id

    @property
    def email(self) -> str:
        return self.user.email

    @property
    def is_superadmin(self) -> bool:
        return check_is_superadmin(self.user)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> AuthenticatedUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, RAW_SECRET, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        encrypted_pw: str = payload.get("pdk")
        if user_id_str is None or encrypted_pw is None:
            raise credentials_exception
        user_id = UUID(user_id_str)
        session_password = _decrypt_session_data(encrypted_pw)
    except (JWTError, Exception):
        raise credentials_exception

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return AuthenticatedUser(user=user, session_password=session_password)


async def get_current_superadmin(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Superadmin privilege required.",
        )
    return current_user
