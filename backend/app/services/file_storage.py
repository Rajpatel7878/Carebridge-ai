"""Secure, private file storage service for patient medical reports.

Security invariants:
- Never trusts client-provided ``Content-Type`` headers or raw filenames.
- Enforces configurable byte size cap via chunked reads (prevents memory exhaustion).
- Blocks executables, scripts, archives, HTML/SVG, null bytes, and double extensions.
- Validates binary magic signatures for PDF, PNG, and JPG/JPEG and ensures the
  sanitized extension matches the verified binary format.
- Writes atomically inside a private ``0700`` directory using UUID storage keys
  and ``0600`` permissions; verifies resolved paths remain strictly inside root.
- Never exposes internal storage paths or ``stored_filename`` to API callers.
"""

from __future__ import annotations

from dataclasses import dataclass
import logging
import os
from pathlib import Path
import re
import unicodedata
from urllib.parse import quote
import uuid

from fastapi import UploadFile

from app.core.config import Settings
from app.core.exceptions import (
    AppException,
    BadRequestException,
    NotFoundException,
    PayloadTooLargeException,
)
from app.models.medical_report import ReportFileType

logger = logging.getLogger(__name__)

_READ_CHUNK_BYTES = 64 * 1024  # 64 KiB streaming read chunks
_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
_JPEG_SOI = b"\xff\xd8\xff"
_JPEG_EOI = b"\xff\xd9"
_PDF_MAGIC = b"%PDF-"

_ALLOWED_EXTENSIONS: dict[str, tuple[ReportFileType, str]] = {
    ".pdf": (ReportFileType.PDF, "pdf"),
    ".png": (ReportFileType.PNG, "png"),
    ".jpg": (ReportFileType.JPG, "jpg"),
    ".jpeg": (ReportFileType.JPG, "jpg"),
}

_BLOCKED_EXTENSIONS: frozenset[str] = frozenset(
    {
        ".exe",
        ".dll",
        ".so",
        ".dylib",
        ".msi",
        ".bat",
        ".cmd",
        ".com",
        ".scr",
        ".ps1",
        ".vbs",
        ".sh",
        ".bash",
        ".zsh",
        ".py",
        ".pyc",
        ".rb",
        ".pl",
        ".php",
        ".phtml",
        ".jsp",
        ".asp",
        ".aspx",
        ".js",
        ".mjs",
        ".cjs",
        ".ts",
        ".html",
        ".htm",
        ".xhtml",
        ".svg",
        ".xml",
        ".jar",
        ".war",
        ".apk",
        ".ipa",
        ".app",
        ".deb",
        ".rpm",
        ".elf",
        ".bin",
        ".run",
        ".zip",
        ".rar",
        ".7z",
        ".tar",
        ".gz",
        ".docm",
        ".xlsm",
        ".pptm",
        ".lnk",
        ".hta",
    }
)

_MEDIA_TYPES: dict[str, str] = {
    ReportFileType.PDF.value: "application/pdf",
    ReportFileType.PNG.value: "image/png",
    ReportFileType.JPG.value: "image/jpeg",
}

_SAFE_FILENAME_CHARS_RE = re.compile(r"[^A-Za-z0-9._() \-]+")
_MULTI_SPACE_RE = re.compile(r"\s+")
_STORED_KEY_RE = re.compile(r"^[0-9a-f]{32}\.(pdf|png|jpg)$")


@dataclass(frozen=True)
class StoredReportFile:
    """Validated metadata returned after storing a private medical report."""

    original_filename: str
    stored_filename: str
    file_type: ReportFileType
    file_size: int


def get_report_media_type(file_type: str) -> str:
    """Return the canonical safe MIME type for a verified report format."""
    return _MEDIA_TYPES.get(file_type, "application/octet-stream")


def build_safe_content_disposition(original_filename: str) -> str:
    """Build an injection-proof RFC 6266 / RFC 5987 attachment header value."""
    ascii_fallback = (
        original_filename.encode("ascii", errors="ignore").decode("ascii").strip()
    )
    ascii_fallback = re.sub(r'["\\;\r\n]+', "_", ascii_fallback)
    if not ascii_fallback or ascii_fallback.startswith("."):
        ascii_fallback = "medical-report"
    encoded_utf8 = quote(original_filename, safe="")
    return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded_utf8}"


def _validate_and_sanitize_filename(raw_filename: str | None) -> tuple[str, str]:
    """Validate extension safety and produce a clean display filename.

    Returns ``(sanitized_filename, lowercase_extension)``.
    """
    if not raw_filename or "\x00" in raw_filename:
        raise BadRequestException(
            "Please select a valid PDF, PNG, or JPG medical report file.",
            code="invalid_filename",
        )

    # Strip any client-supplied directory components (Unix or Windows style).
    leaf = raw_filename.replace("\\", "/").split("/")[-1].strip()
    leaf = unicodedata.normalize("NFKC", leaf)
    leaf = "".join(ch for ch in leaf if ch.isprintable())

    if not leaf or leaf in {".", ".."}:
        raise BadRequestException(
            "Please select a valid PDF, PNG, or JPG medical report file.",
            code="invalid_filename",
        )

    suffixes = [s.lower() for s in Path(leaf).suffixes]
    if not suffixes:
        raise BadRequestException(
            "Unsupported file format. Only PDF, PNG, and JPG files are allowed.",
            code="invalid_file_type",
        )

    # Block executable or script extensions anywhere in a multi-extension name
    # (for example: report.exe.pdf or report.pdf.exe).
    for suffix in suffixes:
        if suffix in _BLOCKED_EXTENSIONS:
            raise BadRequestException(
                "Executable or script files are not permitted. Upload a PDF, PNG, or JPG report.",
                code="blocked_file_type",
            )

    final_ext = suffixes[-1]
    if final_ext not in _ALLOWED_EXTENSIONS:
        raise BadRequestException(
            "Unsupported file format. Only PDF, PNG, and JPG files are allowed.",
            code="invalid_file_type",
        )

    stem = leaf[: -len(final_ext)]
    stem = _SAFE_FILENAME_CHARS_RE.sub("_", stem)
    stem = _MULTI_SPACE_RE.sub(" ", stem).strip(" ._")
    if not stem:
        stem = "medical_report"
    stem = stem[:180]

    sanitized = f"{stem}{final_ext}"
    return sanitized, final_ext


def _detect_magic_file_type(content: bytes) -> ReportFileType | None:
    """Inspect binary file signatures to determine the true document format."""
    # Explicitly reject common executable / script headers first.
    if content.startswith((b"MZ", b"\x7fELF", b"#!", b"\xca\xfe\xba\xbe")):
        return None

    # PDF: begins with %PDF-1.x or %PDF-2.x and contains an %%EOF trailer.
    if content.startswith(_PDF_MAGIC) and len(content) >= 16:
        version_header = content[5:8]
        if (
            len(version_header) == 3
            and version_header[0:1] in (b"1", b"2")
            and version_header[1:2] == b"."
            and version_header[2:3].isdigit()
        ):
            tail = content[-2048:] if len(content) > 2048 else content
            if b"%%EOF" in tail:
                return ReportFileType.PDF
        return None

    # PNG: 8-byte signature + IHDR chunk header + IEND chunk trailer.
    if (
        len(content) >= 33
        and content.startswith(_PNG_SIGNATURE)
        and content[12:16] == b"IHDR"
        and b"IEND" in content[-32:]
    ):
        return ReportFileType.PNG

    # JPEG: SOI marker (FF D8 FF) + valid marker byte + EOI trailer (FF D9).
    if len(content) >= 12 and content.startswith(_JPEG_SOI):
        trimmed_tail = content.rstrip(b"\x00\r\n\t ")
        if trimmed_tail.endswith(_JPEG_EOI):
            return ReportFileType.JPG

    return None


def _ensure_private_storage_dir(settings: Settings) -> Path:
    """Ensure the private upload directory exists with restrictive permissions."""
    root = settings.resolved_upload_dir
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        os.chmod(root, 0o700)
    except OSError:
        # Non-POSIX filesystems may ignore chmod; directory still remains private.
        pass
    return root


def _resolve_safe_storage_path(root: Path, stored_filename: str) -> Path:
    """Resolve ``stored_filename`` strictly within ``root`` (anti-path-traversal)."""
    if not _STORED_KEY_RE.fullmatch(stored_filename):
        raise BadRequestException(
            "Invalid report storage identifier.",
            code="invalid_storage_key",
        )
    resolved_root = root.resolve()
    candidate = (resolved_root / stored_filename).resolve()
    if not candidate.is_relative_to(resolved_root):
        raise BadRequestException(
            "Invalid report storage identifier.",
            code="invalid_storage_key",
        )
    return candidate


async def read_and_store_report_file(
    upload: UploadFile,
    *,
    settings: Settings,
) -> StoredReportFile:
    """Validate an uploaded report stream and persist it atomically to private disk."""
    sanitized_name, ext = _validate_and_sanitize_filename(upload.filename)
    expected_type, canonical_ext = _ALLOWED_EXTENSIONS[ext]
    max_bytes = settings.max_report_upload_bytes

    buffer = bytearray()
    try:
        while True:
            chunk = await upload.read(_READ_CHUNK_BYTES)
            if not chunk:
                break
            buffer.extend(chunk)
            if len(buffer) > max_bytes:
                raise PayloadTooLargeException(
                    f"Report file exceeds the maximum allowed size of "
                    f"{settings.MAX_REPORT_UPLOAD_MB} MB.",
                    code="file_too_large",
                )
    finally:
        await upload.close()

    file_size = len(buffer)
    if file_size == 0:
        raise BadRequestException(
            "The selected file is empty. Please upload a valid PDF, PNG, or JPG report.",
            code="empty_file",
        )

    payload = bytes(buffer)
    detected_type = _detect_magic_file_type(payload)
    if detected_type is None or detected_type != expected_type:
        raise BadRequestException(
            "File content does not match a valid PDF, PNG, or JPG document. "
            "Please upload an unmodified medical report file.",
            code="invalid_file_content",
        )

    root = _ensure_private_storage_dir(settings)
    stored_filename = f"{uuid.uuid4().hex}.{canonical_ext}"
    target_path = _resolve_safe_storage_path(root, stored_filename)
    temp_path = root / f".tmp-{uuid.uuid4().hex}"

    try:
        fd = os.open(temp_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as handle:
            handle.write(payload)
            handle.flush()
        os.replace(temp_path, target_path)
    except OSError as exc:
        logger.error("Failed to store uploaded report in private storage.")
        try:
            if temp_path.exists():
                temp_path.unlink()
        except OSError:
            pass
        raise AppException(
            "We could not save your report right now. Please try uploading again.",
            status_code=500,
            code="report_storage_failed",
        ) from exc

    return StoredReportFile(
        original_filename=sanitized_name,
        stored_filename=stored_filename,
        file_type=detected_type,
        file_size=file_size,
    )


def delete_stored_report_quietly(
    stored_filename: str,
    *,
    settings: Settings,
) -> None:
    """Remove an orphaned report file if database persistence fails."""
    try:
        root = settings.resolved_upload_dir
        target = _resolve_safe_storage_path(root, stored_filename)
        if target.is_file():
            target.unlink()
    except Exception:
        logger.warning("Could not remove orphaned upload file during cleanup.")


def resolve_existing_report_path(
    stored_filename: str,
    *,
    settings: Settings,
) -> Path:
    """Return the verified on-disk path for an authorized report download."""
    root = settings.resolved_upload_dir
    if not root.exists():
        raise NotFoundException(
            "The requested report file is currently unavailable.",
            code="report_file_unavailable",
        )
    target = _resolve_safe_storage_path(root, stored_filename)
    if not target.is_file() or target.is_symlink():
        raise NotFoundException(
            "The requested report file is currently unavailable.",
            code="report_file_unavailable",
        )
    return target
