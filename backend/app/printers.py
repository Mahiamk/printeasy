import asyncio
import socket
from typing import Optional
from pydantic import BaseModel


class CampusPrinter(BaseModel):
    id: str
    name: str
    model: str
    location: str
    host: str
    port: int = 9100
    protocol: str = "raw"  # "raw" (JetDirect Port 9100) or "ipp" (Port 631)
    supports_color: bool = True
    is_default: bool = False
    is_online: Optional[bool] = None


# Preconfigured Campus Printers from Physical Lab Station Setup
CAMPUS_PRINTERS = [
    CampusPrinter(
        id="toshiba-library-3525ac",
        name="TOSHIBA e-STUDIO3525AC",
        model="TOSHIBA e-STUDIO 3525AC MFP",
        location="Library Main Hall • Station A",
        host="172.16.48.54",
        port=9100,
        protocol="raw",
        supports_color=True,
        is_default=True,
    ),
    CampusPrinter(
        id="toshiba-lab-universal2",
        name="TOSHIBA Universal Printer 2",
        model="TOSHIBA Universal Print System",
        location="Computer Lab • Station B",
        host="172.16.48.54",
        port=9100,
        protocol="raw",
        supports_color=True,
        is_default=False,
    ),
]


def build_pjl_payload(
    file_bytes: bytes,
    job_name: str = "PrintEasy_Doc",
    user_name: str = "Student",
    department_code: str = "",
    color_mode: str = "bw",
    copies: int = 1,
) -> bytes:
    """
    Wraps raw document bytes in PJL (Printer Job Language) header for Toshiba e-STUDIO controllers.
    Embeds the user's Department Code so the printer verifies accounting and automatically outputs paper.
    """
    pjl_header = [
        b"\x1b%-12345X@PJL\r\n",
        f'@PJL JOB NAME = "{job_name}"\r\n'.encode("utf-8"),
        f'@PJL SET USERNAME = "{user_name}"\r\n'.encode("utf-8"),
    ]

    if department_code:
        clean_code = department_code.strip()
        pjl_header.append(f'@PJL SET DEPARTMENTCODE = "{clean_code}"\r\n'.encode("utf-8"))
        pjl_header.append(f'@PJL SET ACCOUNT = "{clean_code}"\r\n'.encode("utf-8"))
        pjl_header.append(f'@PJL SET PIN = "{clean_code}"\r\n'.encode("utf-8"))
        pjl_header.append(b"@PJL SET HOLD = OFF\r\n")

    if color_mode.lower() == "color":
        pjl_header.append(b"@PJL SET RENDERMODE = COLOR\r\n")
    else:
        pjl_header.append(b"@PJL SET RENDERMODE = GRAYSCALE\r\n")

    if copies > 1:
        pjl_header.append(f"@PJL SET COPIES = {copies}\r\n".encode("utf-8"))

    pjl_header.append(b"@PJL ENTER LANGUAGE = PDF\r\n")
    pjl_footer = b"\r\n\x1b%-12345X@PJL EOJ\r\n\x1b%-12345X"

    return b"".join(pjl_header) + file_bytes + pjl_footer


async def check_printer_online(host: str, port: int = 9100, timeout: float = 1.5) -> bool:
    """Fast non-blocking TCP socket ping to verify printer network reachability."""
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout,
        )
        writer.close()
        await writer.wait_closed()
        return True
    except Exception:
        return False


async def get_printers_with_status() -> list[CampusPrinter]:
    """Returns list of campus printers with live reachability status."""
    printers = []
    for p in CAMPUS_PRINTERS:
        online = await check_printer_online(p.host, p.port)
        printer_copy = p.model_copy(update={"is_online": online})
        printers.append(printer_copy)
    return printers


async def stream_job_to_printer(
    host: str,
    port: int,
    file_bytes: bytes,
    job_name: str = "PrintEasy_Doc",
    user_name: str = "Student",
    department_code: str = "",
    color_mode: str = "bw",
    copies: int = 1,
    timeout: float = 15.0,
) -> tuple[bool, str]:
    """
    Streams document with user PJL Department Code wrapper directly to the printer's RAW 9100 port.
    Toshiba e-STUDIO MFPs authenticate the department code and immediately output paper.
    """
    try:
        # Wrap payload with PJL header containing user's department code
        payload = build_pjl_payload(
            file_bytes=file_bytes,
            job_name=job_name,
            user_name=user_name,
            department_code=department_code,
            color_mode=color_mode,
            copies=copies,
        )

        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=5.0,
        )
        writer.write(payload)
        await asyncio.wait_for(writer.drain(), timeout=timeout)
        writer.close()
        await writer.wait_closed()
        return True, f"Successfully spooled {len(payload)} bytes to {host}:{port} with Department Code"
    except asyncio.TimeoutError:
        return False, f"Connection to printer {host}:{port} timed out (printer offline or closed)."
    except Exception as e:
        return False, f"Network spool error connecting to {host}:{port}: {str(e)}"
