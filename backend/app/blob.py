import os
import uuid
import httpx
from pathlib import Path
from fastapi import UploadFile, HTTPException

import tempfile

BLOB_TOKEN = os.getenv("BLOB_READ_WRITE_TOKEN", "")

# Serverless (Vercel/Lambda) has a read-only filesystem; use /tmp for local uploads fallback
if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
    LOCAL_UPLOADS_DIR = Path(tempfile.gettempdir()) / "printeasy_uploads"
else:
    LOCAL_UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"

try:
    LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    LOCAL_UPLOADS_DIR = Path(tempfile.gettempdir()) / "printeasy_uploads"
    LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

BLOB_API_URL = "https://blob.vercel-storage.com"


async def upload_blob_file(file: UploadFile, original_filename: str) -> str:
    """
    Uploads file to Vercel Blob storage via REST API if token is configured,
    otherwise saves to local uploads directory and returns file access URL.
    """
    content = await file.read()
    sanitized_name = os.path.basename(original_filename)
    unique_name = f"{uuid.uuid4().hex[:8]}-{sanitized_name}"

    if BLOB_TOKEN and not BLOB_TOKEN.startswith("vercel_blob_rw_xxx"):
        headers = {
            "Authorization": f"Bearer {BLOB_TOKEN}",
            "x-api-version": "7",
            "x-content-type": file.content_type or "application/octet-stream",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.put(
                f"{BLOB_API_URL}/{unique_name}",
                content=content,
                headers=headers,
            )
            if res.status_code in (200, 201):
                data = res.json()
                return data.get("url", "")
            else:
                # Log error and fallback to local
                print(f"[Blob] Upload failed with status {res.status_code}: {res.text}")

    # Local fallback
    local_path = LOCAL_UPLOADS_DIR / unique_name
    with open(local_path, "wb") as f:
        f.write(content)
    
    return f"/api/files/download/{unique_name}"


async def delete_blob_file(blob_url: str) -> bool:
    """
    Deletes file from Vercel Blob or local storage.
    """
    if not blob_url:
        return True

    if BLOB_TOKEN and "blob.vercel-storage.com" in blob_url:
        headers = {
            "Authorization": f"Bearer {BLOB_TOKEN}",
            "x-api-version": "7",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                res = await client.post(
                    f"{BLOB_API_URL}/delete",
                    json={"urls": [blob_url]},
                    headers=headers,
                )
                return res.status_code in (200, 204)
            except Exception as e:
                print(f"[Blob] Delete failed: {e}")
                return False

    # Check local fallback
    if "/api/files/download/" in blob_url:
        filename = blob_url.split("/api/files/download/")[-1]
        local_path = LOCAL_UPLOADS_DIR / filename
        if local_path.exists():
            try:
                local_path.unlink()
                return True
            except Exception:
                return False

    return True


async def get_blob_file_bytes(blob_url: str) -> bytes:
    """
    Retrieves raw document bytes from Vercel Blob or local storage.
    """
    if not blob_url:
        raise ValueError("Blob URL is empty")

    if "blob.vercel-storage.com" in blob_url or blob_url.startswith("http://") or blob_url.startswith("https://"):
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(blob_url)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail="Could not download file stream from storage")
            return res.content

    # Check local fallback
    if "/api/files/download/" in blob_url:
        filename = blob_url.split("/api/files/download/")[-1]
        local_path = LOCAL_UPLOADS_DIR / filename
        if not local_path.exists():
            raise HTTPException(status_code=404, detail="Local file stream not found on disk")
        with open(local_path, "rb") as f:
            return f.read()

    raise HTTPException(status_code=404, detail="Invalid blob URL or document not found")

