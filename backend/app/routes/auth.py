from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from ..schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserOut,
    GoogleLoginRequest,
    GoogleConfigResponse,
)
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    AuthenticatedUser,
    SECRET_KEY_BYTES,
)
import os
import hmac
import hashlib
import httpx

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("CLIENT_ID") or ""


@router.get("/google/config", response_model=GoogleConfigResponse)
async def get_google_config():
    client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("CLIENT_ID") or None
    return GoogleConfigResponse(client_id=client_id)


@router.post("/google", response_model=TokenResponse)
async def google_auth(req: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    if not req.id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token is required.",
        )

    # Verify ID token with Google's tokeninfo endpoint
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={req.id_token}"
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Google token.",
                )
            payload = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google authentication service error: {str(e)}",
        )

    # Verify audience if client id is configured
    configured_client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("CLIENT_ID")
    if configured_client_id:
        token_aud = payload.get("aud")
        if token_aud != configured_client_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google Client ID mismatch.",
            )

    email = payload.get("email", "").strip().lower()
    email_verified = payload.get("email_verified", "false")
    google_sub = payload.get("sub", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return a valid email address.",
        )

    if email_verified not in (True, "true", "True", 1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is not verified.",
        )

    # Deterministic session secret derived from server master secret + user's unique Google Sub ID
    # Allows AES-256-GCM encrypted printing code to be decrypted within session
    session_password = hmac.new(
        SECRET_KEY_BYTES, f"google_oauth:{google_sub}".encode("utf-8"), hashlib.sha256
    ).hexdigest()

    # Check if user already exists
    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        # Create new user for Google login
        dummy_hash = hash_password(session_password)
        user = User(
            email=email,
            password_hash=dummy_hash,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user.id, user.email, session_password)
    return TokenResponse(access_token=token)


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    email = req.email.strip().lower()
    if req.password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )
    if len(req.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    # Check existing user
    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        email=email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, user.email, req.password)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    email = req.email.strip().lower()
    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(user.id, user.email, req.password)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    return UserOut(
        id=current_user.user.id,
        email=current_user.user.email,
        created_at=current_user.user.created_at,
        has_printing_code=bool(current_user.user.printing_code_encrypted),
        is_superadmin=current_user.is_superadmin,
    )
