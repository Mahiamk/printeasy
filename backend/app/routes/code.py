from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import SavePrintingCodeRequest, PrintingCodeResponse
from ..auth import get_current_user, AuthenticatedUser
from ..crypto import encrypt_printing_code, decrypt_printing_code

router = APIRouter(prefix="/api/code", tags=["code"])


@router.post("", response_model=PrintingCodeResponse)
async def save_printing_code(
    req: SavePrintingCodeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code_text = req.printing_code.strip()
    if not code_text:
        raise HTTPException(status_code=400, detail="Printing code cannot be empty.")
    if len(code_text) > 50:
        raise HTTPException(status_code=400, detail="Printing code is too long (max 50 characters).")

    encrypted_data = encrypt_printing_code(code_text, current_user.session_password)

    current_user.user.printing_code_encrypted = encrypted_data["ciphertext"]
    current_user.user.printing_code_salt = encrypted_data["salt"]
    current_user.user.printing_code_iv = encrypted_data["iv"]

    await db.commit()
    return PrintingCodeResponse(code=code_text)


@router.get("", response_model=PrintingCodeResponse)
async def get_printing_code(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    user = current_user.user
    if not user.printing_code_encrypted or not user.printing_code_salt or not user.printing_code_iv:
        return PrintingCodeResponse(code="")

    try:
        decrypted = decrypt_printing_code(
            ciphertext_b64=user.printing_code_encrypted,
            salt_b64=user.printing_code_salt,
            iv_b64=user.printing_code_iv,
            password=current_user.session_password,
        )
        return PrintingCodeResponse(code=decrypted)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to decrypt printing code. You may need to re-save it.",
        )
