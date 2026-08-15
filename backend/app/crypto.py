import base64
import os
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Optimized iteration count for fast, non-blocking serverless key derivation (~15ms vs 600ms)
PBKDF2_ITERATIONS_FAST = 10_000
PBKDF2_ITERATIONS_LEGACY = 100_000


def _derive_key(password: str, salt: bytes, iterations: int = PBKDF2_ITERATIONS_FAST) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
        backend=default_backend(),
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_printing_code(plaintext: str, password: str) -> dict[str, str]:
    salt = os.urandom(16)
    iv = os.urandom(12)  # Standard 96-bit nonce for AES-GCM
    key = _derive_key(password, salt, PBKDF2_ITERATIONS_FAST)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)

    return {
        "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
        "salt": base64.b64encode(salt).decode("ascii"),
        "iv": base64.b64encode(iv).decode("ascii"),
    }


def decrypt_printing_code(ciphertext_b64: str, salt_b64: str, iv_b64: str, password: str) -> str:
    salt = base64.b64decode(salt_b64)
    iv = base64.b64decode(iv_b64)
    ciphertext = base64.b64decode(ciphertext_b64)

    # Try fast key derivation first (10k iterations)
    try:
        key = _derive_key(password, salt, PBKDF2_ITERATIONS_FAST)
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(iv, ciphertext, None).decode("utf-8")
    except Exception:
        # Fallback to legacy 100k iterations
        key = _derive_key(password, salt, PBKDF2_ITERATIONS_LEGACY)
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(iv, ciphertext, None).decode("utf-8")
