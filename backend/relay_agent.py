#!/usr/bin/env python3
"""
PrintEasy — Campus Printer Relay Agent (Scenario B Option 2)
------------------------------------------------------------
Run this lightweight service on any computer connected to the campus network (e.g. Lab PC / Laptop).
It listens for print jobs submitted by students anywhere (mobile/home), injects their Department Code,
and streams the print job directly to the physical TOSHIBA e-STUDIO 3525AC printer at 172.16.48.54:9100.

The Toshiba printer verifies the Department Code and automatically outputs the physical paper!

Usage:
  python relay_agent.py --server http://localhost:8000 --token printeasy-campus-relay-key-2026
"""

import sys
import time
import socket
import argparse
import logging
import requests
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("PrintEasyRelay")


def check_printer_socket(host: str, port: int = 9100, timeout: float = 2.0) -> bool:
    """Test TCP connection to Toshiba printer on the local campus network."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def build_pjl_payload(
    file_bytes: bytes,
    job_name: str = "PrintEasy_Doc",
    user_name: str = "Student",
    department_code: str = "",
    color_mode: str = "bw",
    copies: int = 1,
) -> bytes:
    """
    Wraps document bytes with Toshiba PJL Department Code and auto-print headers.
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


def spool_to_toshiba(
    host: str,
    port: int,
    file_bytes: bytes,
    job_name: str,
    department_code: str,
    color_mode: str = "bw",
    copies: int = 1,
    timeout: float = 15.0,
) -> tuple[bool, str]:
    """Sends document with Department Code directly to Toshiba printer RAW port 9100."""
    try:
        payload = build_pjl_payload(
            file_bytes=file_bytes,
            job_name=job_name,
            department_code=department_code,
            color_mode=color_mode,
            copies=copies,
        )

        with socket.create_connection((host, port), timeout=5.0) as sock:
            sock.sendall(payload)

        return True, f"Successfully spooled {len(payload)} bytes with Department Code '{department_code}'"
    except Exception as e:
        return False, str(e)


class RelayAgent:
    def __init__(self, server_url: str, token: str, printer_ip: str, printer_port: int, agent_name: str):
        self.server_url = server_url.rstrip("/")
        self.token = token
        self.printer_ip = printer_ip
        self.printer_port = printer_port
        self.agent_name = agent_name
        self.headers = {"x-relay-token": self.token}

    def send_heartbeat(self) -> bool:
        """Ping cloud server to declare relay active."""
        is_online = check_printer_socket(self.printer_ip, self.printer_port)
        try:
            res = requests.post(
                f"{self.server_url}/api/relay/heartbeat",
                json={
                    "agent_name": self.agent_name,
                    "printer_host": self.printer_ip,
                    "printer_online": is_online,
                },
                headers=self.headers,
                timeout=5.0,
            )
            return res.status_code == 200
        except Exception as e:
            logger.debug(f"Heartbeat failed: {e}")
            return False

    def fetch_pending_jobs(self) -> list:
        """Fetch print jobs queued by students."""
        try:
            res = requests.get(
                f"{self.server_url}/api/relay/pending",
                headers=self.headers,
                timeout=8.0,
            )
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            logger.error(f"Error checking pending queue: {e}")
        return []

    def download_doc_bytes(self, blob_url: str) -> Optional[bytes]:
        """Download document bytes from storage."""
        try:
            full_url = blob_url if blob_url.startswith("http") else f"{self.server_url}{blob_url}"
            res = requests.get(full_url, timeout=30.0)
            if res.status_code == 200:
                return res.content
        except Exception as e:
            logger.error(f"Failed to download doc from {blob_url}: {e}")
        return None

    def complete_job(self, job_id: str, success: bool, error_msg: str = "", spooled_bytes: int = 0):
        """Notify server of print completion."""
        try:
            requests.post(
                f"{self.server_url}/api/relay/jobs/{job_id}/complete",
                json={"success": success, "error_message": error_msg, "spooled_bytes": spooled_bytes},
                headers=self.headers,
                timeout=5.0,
            )
        except Exception as e:
            logger.error(f"Failed to notify completion for job {job_id}: {e}")

    def run_loop(self):
        logger.info("=" * 65)
        logger.info(f"PrintEasy Campus Relay Agent Online")
        logger.info(f"Server URL     : {self.server_url}")
        logger.info(f"Target Printer : TOSHIBA e-STUDIO3525AC ({self.printer_ip}:{self.printer_port})")
        logger.info("=" * 65)

        last_heartbeat_time = 0
        while True:
            now = time.time()
            if now - last_heartbeat_time >= 15:
                self.send_heartbeat()
                last_heartbeat_time = now

            jobs = self.fetch_pending_jobs()
            for job in jobs:
                job_id = job.get("job_id")
                file_name = job.get("file_name", "Document")
                dept_code = job.get("department_code", "")
                color_mode = job.get("color_mode", "bw")
                copies = job.get("copies", 1)
                blob_url = job.get("blob_url")

                logger.info(f"⚡ Processing print job: '{file_name}' | Dept Code: '{dept_code}' | Copies: {copies}")

                doc_bytes = self.download_doc_bytes(blob_url)
                if not doc_bytes:
                    logger.error(f"Could not download document for job {job_id}")
                    self.complete_job(job_id, False, "Document download failed")
                    continue

                success, log_msg = spool_to_toshiba(
                    host=self.printer_ip,
                    port=self.printer_port,
                    file_bytes=doc_bytes,
                    job_name=file_name,
                    department_code=dept_code,
                    color_mode=color_mode,
                    copies=copies,
                )

                if success:
                    logger.info(f"✅ Printed '{file_name}' to Toshiba printer successfully! {log_msg}")
                    self.complete_job(job_id, True, spooled_bytes=len(doc_bytes))
                else:
                    logger.error(f"❌ Failed to print '{file_name}': {log_msg}")
                    self.complete_job(job_id, False, log_msg)

            time.sleep(3)


def main():
    parser = argparse.ArgumentParser(description="PrintEasy Campus Printer Relay Agent")
    parser.add_argument("--server", default="http://127.0.0.1:8000", help="PrintEasy Backend URL")
    parser.add_argument("--token", default="printeasy-campus-relay-key-2026", help="Campus Relay Secret Key")
    parser.add_argument("--printer-ip", default="172.16.48.54", help="Toshiba Printer IP (default: 172.16.48.54)")
    parser.add_argument("--printer-port", type=int, default=9100, help="Printer RAW port (default: 9100)")
    parser.add_argument("--name", default="Library Station Relay", help="Relay agent identifier")
    args = parser.parse_args()

    agent = RelayAgent(
        server_url=args.server,
        token=args.token,
        printer_ip=args.printer_ip,
        printer_port=args.printer_port,
        agent_name=args.name,
    )

    try:
        agent.run_loop()
    except KeyboardInterrupt:
        logger.info("Relay Agent stopped by user.")


if __name__ == "__main__":
    main()
