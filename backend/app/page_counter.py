import io
import re
import zipfile
import xml.etree.ElementTree as ET
from pypdf import PdfReader


def detect_file_page_count(file_bytes: bytes, filename: str) -> int:
    """
    Automatically detects the number of printable pages in an uploaded file.
    Supports PDF, DOCX, images, and text formats.
    """
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""

    # 1. PDF Files
    if ext == ".pdf" or file_bytes.startswith(b"%PDF"):
        try:
            stream = io.BytesIO(file_bytes)
            reader = PdfReader(stream)
            count = len(reader.pages)
            if count > 0:
                return count
        except Exception as e:
            # Fallback regex search for /Type /Page count in raw PDF stream
            try:
                matches = re.findall(rb"/Type\s*/Page\b", file_bytes)
                if matches:
                    return len(matches)
            except Exception:
                pass
        return 1

    # 2. DOCX (Word) Files
    if ext in (".docx", ".doc"):
        try:
            stream = io.BytesIO(file_bytes)
            with zipfile.ZipFile(stream) as z:
                # Check app.xml for precomputed page metadata
                if "docProps/app.xml" in z.namelist():
                    app_xml = z.read("docProps/app.xml")
                    root = ET.fromstring(app_xml)
                    for elem in root.iter():
                        if elem.tag.endswith("Pages") and elem.text and elem.text.isdigit():
                            pages = int(elem.text)
                            if pages > 0:
                                return pages

                # Fallback: estimate from paragraph breaks / page breaks in document.xml
                if "word/document.xml" in z.namelist():
                    doc_xml = z.read("word/document.xml")
                    # Count explicit page breaks: <w:br w:type="page"/> or <w:lastRenderedPageBreak/>
                    page_breaks = len(re.findall(rb'<w:(?:lastRenderedPageBreak|br\s+w:type="page")', doc_xml))
                    if page_breaks > 0:
                        return page_breaks + 1
        except Exception:
            pass
        return 1

    # 3. Images (Single page by definition)
    IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"}
    if ext in IMAGE_EXTS:
        return 1

    # Default fallback
    return 1
