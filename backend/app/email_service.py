import os
import resend
from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY") or os.getenv("RESEND_API") or ""
FROM_EMAIL = os.getenv("FROM_EMAIL", "PrintEasy <onboarding@resend.dev>")

resend.api_key = RESEND_API_KEY


def get_frontend_url() -> str:
    """
    Dynamically resolves the correct production or local frontend URL.
    Prefers production domain on Vercel over hardcoded localhost.
    """
    # 1. Check custom FRONTEND_URL if set and valid (not localhost when running in production)
    custom_url = (os.getenv("FRONTEND_URL") or "").strip().rstrip("/")
    if custom_url and not (os.getenv("VERCEL") and "localhost" in custom_url):
        return custom_url if custom_url.startswith("http") else f"https://{custom_url}"

    # 2. Vercel Production Custom Domain / Canonical Project URL
    vercel_prod = (os.getenv("VERCEL_PROJECT_PRODUCTION_URL") or "").strip().rstrip("/")
    if vercel_prod:
        return f"https://{vercel_prod}"

    # 3. Vercel Deployment URL (e.g. printeasy-xxx.vercel.app)
    vercel_url = (os.getenv("VERCEL_URL") or "").strip().rstrip("/")
    if vercel_url:
        return f"https://{vercel_url}"

    # 4. Fallback for local development
    return custom_url or "http://localhost:5173"


def send_verification_email(to_email: str, token: str) -> bool:
    """Send email verification link to newly registered user."""
    base_url = get_frontend_url()
    verify_url = f"{base_url}/verify?token={token}"

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #6b8f71; padding: 14px; border-radius: 12px; margin-bottom: 16px;">
          <svg width="28" height="28" viewBox="0 0 256 256" fill="white"><path d="M214.86,208H200V40a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8V208H41.14a8,8,0,0,0,0,16H214.86a8,8,0,0,0,0-16ZM72,48H184V208H168V168a8,8,0,0,0-8-8H96a8,8,0,0,0-8,8v40H72ZM152,208H104V176h48ZM96,80h24a8,8,0,0,1,0,16H96a8,8,0,0,1,0-16Zm40,0h24a8,8,0,0,1,0,16H136a8,8,0,0,1,0-16ZM96,120h24a8,8,0,0,1,0,16H96a8,8,0,0,1,0-16Zm40,0h24a8,8,0,0,1,0,16H136a8,8,0,0,1,0-16Z"/></svg>
        </div>
        <h1 style="color: #1a1a2e; font-size: 22px; font-weight: 700; margin: 0;">Verify Your Email</h1>
        <p style="color: #6c6c8a; font-size: 14px; margin-top: 8px;">Welcome to PrintEasy! Confirm your email to get started.</p>
      </div>

      <a href="{verify_url}" style="display: block; background: #6b8f71; color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 24px 0;">
        Activate My Account
      </a>

      <p style="color: #9494a8; font-size: 12px; text-align: center; margin-top: 24px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="{verify_url}" style="color: #6b8f71; word-break: break-all;">{verify_url}</a>
      </p>

      <p style="color: #b0b0c0; font-size: 11px; text-align: center; margin-top: 32px; border-top: 1px solid #e8e8f0; padding-top: 16px;">
        This link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Verify your PrintEasy account",
            "html": html,
        })
        return True
    except Exception as e:
        print(f"[Resend Email Error] {e}")
        return False


def send_resend_verification(to_email: str, token: str) -> bool:
    """Resend verification email (same content, different function name for clarity)."""
    return send_verification_email(to_email, token)
