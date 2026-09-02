from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
import secrets

from ..database import get_db
from ..models import User, QRLoginSession
from ..schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserOut,
    GoogleLoginRequest,
    GoogleConfigResponse,
    MessageResponse,
    QRInitiateRequest,
    QRInitiateResponse,
    QRStatusResponse,
    QRInfoResponse,
    QRAuthorizeRequest,
)
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    check_is_superadmin,
    AuthenticatedUser,
    SECRET_KEY_BYTES,
)
from ..email_service import send_verification_email
import os
import uuid
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
        # Create new user for Google login — auto-verified since Google verified the email
        dummy_hash = hash_password(session_password)
        user = User(
            email=email,
            password_hash=dummy_hash,
            is_verified=True,  # Google-authenticated users are auto-verified
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.is_verified:
        # Auto-verify existing user if they authenticate with verified Google account
        user.is_verified = True
        user.verification_token = None
        await db.commit()
        await db.refresh(user)
    is_superadmin = check_is_superadmin(user)
    token = create_access_token(user.id, user.email, session_password, is_superadmin=is_superadmin)
    user_out = UserOut(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
        has_printing_code=bool(user.printing_code_encrypted),
        is_superadmin=is_superadmin,
    )
    return TokenResponse(access_token=token, user=user_out)


@router.post("/register", response_model=MessageResponse)
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
    existing = res.scalar_one_or_none()

    if existing:
        if existing.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists.",
            )
        else:
            # Re-send verification for unverified account — update password & token
            verification_token = uuid.uuid4().hex
            existing.password_hash = hash_password(req.password)
            existing.verification_token = verification_token
            await db.commit()
            send_verification_email(email, verification_token)
            return MessageResponse(message="Verification email sent. Please check your inbox.")

    # Create unverified user with verification token
    verification_token = uuid.uuid4().hex
    user = User(
        email=email,
        password_hash=hash_password(req.password),
        is_verified=False,
        verification_token=verification_token,
    )
    db.add(user)
    await db.commit()

    # Send verification email via Resend
    send_verification_email(email, verification_token)

    return MessageResponse(message="Verification email sent. Please check your inbox.")


@router.get("/verify")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """Verify user's email from the activation link."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is required.",
        )

    stmt = select(User).where(User.verification_token == token)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )

    if user.is_verified:
        return {"message": "Email already verified. You can log in.", "already_verified": True}

    user.is_verified = True
    user.verification_token = None  # Invalidate token after use
    await db.commit()

    return {"message": "Email verified successfully! You can now log in.", "verified": True}


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Resend verification email for unverified accounts."""
    email = req.email.strip().lower()
    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        # Don't reveal whether email exists
        return MessageResponse(message="If this email is registered, a verification link has been sent.")

    if user.is_verified:
        return MessageResponse(message="This account is already verified. Please log in.")

    # Generate new token
    verification_token = uuid.uuid4().hex
    user.verification_token = verification_token
    await db.commit()

    send_verification_email(email, verification_token)
    return MessageResponse(message="Verification email sent. Please check your inbox.")


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

    # Block unverified users from logging in
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the activation link.",
        )

    is_superadmin = check_is_superadmin(user)
    token = create_access_token(user.id, user.email, req.password, is_superadmin=is_superadmin)
    user_out = UserOut(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
        has_printing_code=bool(user.printing_code_encrypted),
        is_superadmin=is_superadmin,
    )
    return TokenResponse(access_token=token, user=user_out)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    return UserOut(
        id=current_user.user.id,
        email=current_user.user.email,
        created_at=current_user.user.created_at,
        has_printing_code=bool(current_user.user.printing_code_encrypted),
        is_superadmin=current_user.is_superadmin,
    )


# -------------------------------------------------------------
# QR Code / Link Device Authentication
# -------------------------------------------------------------

def _format_device_summary(user_agent: str) -> str:
    """Extract a user-friendly device name from User-Agent string."""
    if not user_agent:
        return "Unknown Device"
    ua = user_agent.lower()
    os_name = "Unknown OS"
    if "mac" in ua:
        os_name = "Mac"
    elif "win" in ua:
        os_name = "Windows"
    elif "iphone" in ua:
        os_name = "iPhone"
    elif "ipad" in ua:
        os_name = "iPad"
    elif "android" in ua:
        os_name = "Android"
    elif "linux" in ua:
        os_name = "Linux"

    browser = "Browser"
    if "edg" in ua:
        browser = "Edge"
    elif "chrome" in ua:
        browser = "Chrome"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "firefox" in ua:
        browser = "Firefox"

    return f"{browser} on {os_name}"


@router.post("/qr/initiate", response_model=QRInitiateResponse)
async def initiate_qr_login(
    request: Request,
    req: QRInitiateRequest = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by an unauthenticated device to generate a QR session token.
    Token is valid for 3 minutes.
    """
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=3)

    user_agent = request.headers.get("user-agent", "")
    client_ip = request.client.host if request.client else None
    device_info = (req and req.device_info) or _format_device_summary(user_agent)

    qr_session = QRLoginSession(
        token=token,
        status="pending",
        device_info=device_info,
        ip_address=client_ip,
        created_at=now,
        expires_at=expires_at,
    )
    db.add(qr_session)
    await db.commit()

    return QRInitiateResponse(
        token=token,
        expires_at=expires_at,
        expires_in_seconds=180,
        device_info=device_info,
    )


@router.get("/qr/status/{token}", response_model=QRStatusResponse)
async def check_qr_status(token: str, db: AsyncSession = Depends(get_db)):
    """
    Polled by the unauthenticated device.
    When status becomes 'approved', returns single-use access token and user info,
    then immediately marks the session 'consumed' for replay protection.
    """
    stmt = select(QRLoginSession).where(QRLoginSession.token == token)
    res = await db.execute(stmt)
    qr_session = res.scalar_one_or_none()

    if not qr_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR session not found or has expired.",
        )

    now = datetime.now(timezone.utc)
    if qr_session.expires_at < now and qr_session.status == "pending":
        qr_session.status = "expired"
        await db.commit()
        return QRStatusResponse(status="expired", device_info=qr_session.device_info)

    if qr_session.status == "approved" and qr_session.access_token and qr_session.user_id:
        # Fetch user
        stmt_u = select(User).where(User.id == qr_session.user_id)
        res_u = await db.execute(stmt_u)
        user = res_u.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User associated with QR session not found.",
            )

        is_superadmin = check_is_superadmin(user)
        user_out = UserOut(
            id=user.id,
            email=user.email,
            created_at=user.created_at,
            has_printing_code=bool(user.printing_code_encrypted),
            is_superadmin=is_superadmin,
        )
        token_to_return = qr_session.access_token

        # Single-use consumption
        qr_session.status = "consumed"
        qr_session.access_token = None
        await db.commit()

        return QRStatusResponse(
            status="approved",
            access_token=token_to_return,
            user=user_out,
            device_info=qr_session.device_info,
        )

    return QRStatusResponse(
        status=qr_session.status,
        device_info=qr_session.device_info,
    )


@router.get("/qr/info/{token}", response_model=QRInfoResponse)
async def get_qr_info(token: str, db: AsyncSession = Depends(get_db)):
    """
    Called by the scanning device (Device B) to display what device is requesting login.
    """
    stmt = select(QRLoginSession).where(QRLoginSession.token == token)
    res = await db.execute(stmt)
    qr_session = res.scalar_one_or_none()

    if not qr_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR session not found or invalid.",
        )

    now = datetime.now(timezone.utc)
    current_status = qr_session.status
    if qr_session.expires_at < now and current_status == "pending":
        current_status = "expired"
        qr_session.status = "expired"
        await db.commit()

    return QRInfoResponse(
        token=qr_session.token,
        status=current_status,
        device_info=qr_session.device_info,
        created_at=qr_session.created_at,
        expires_at=qr_session.expires_at,
    )


@router.post("/qr/authorize")
async def authorize_qr_login(
    req: QRAuthorizeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Called by the logged-in device to approve or reject the QR login request.
    """
    stmt = select(QRLoginSession).where(QRLoginSession.token == req.token)
    res = await db.execute(stmt)
    qr_session = res.scalar_one_or_none()

    if not qr_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR login session not found.",
        )

    now = datetime.now(timezone.utc)
    if qr_session.expires_at < now or qr_session.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This login request is {qr_session.status} or has expired.",
        )

    if req.action == "reject":
        qr_session.status = "rejected"
        await db.commit()
        return {"status": "rejected", "message": "Login request rejected."}

    # Generate new access token for current user
    new_token = create_access_token(
        current_user.id,
        current_user.email,
        current_user.session_password,
        is_superadmin=current_user.is_superadmin,
    )

    qr_session.status = "approved"
    qr_session.user_id = current_user.id
    qr_session.access_token = new_token
    await db.commit()

    return {"status": "approved", "message": "Device successfully authorized!"}

