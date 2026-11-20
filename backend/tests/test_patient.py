"""Phase 5 backend test suite: Patient Portal endpoints, RBAC, ownership, and file security.

Uses strictly synthetic, fictional patient/clinician personas and generated
minimal test files (never real personal or medical data).
"""

from __future__ import annotations

from collections.abc import Callable, Generator
from datetime import datetime, timedelta, timezone
from pathlib import Path
import struct
import zlib

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.core.rate_limit import auth_rate_limiter
from app.core.security import hash_password
from app.database.base import Base
from app.database.session import build_engine, get_db
from app.main import create_app
from app.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.models.follow_up import FollowUp, FollowUpStatus
from app.models.notification import Notification, NotificationType
from app.models.referral import Referral, ReferralStatus
from app.models.risk_assessment import (
    RiskAssessment,
    RiskAssessmentStatus,
    RiskCategory,
)
from app.models.user import User, UserRole

TEST_SECRET = "phase5-test-only-jwt-signing-secret-with-more-than-48-characters-99999"
CSRF_HEADER = "X-CSRF-Token"
CSRF_COOKIE = "cb_csrf_token"

PATIENT_A_EMAIL = "synthetic.patient.a@example.org"
PATIENT_B_EMAIL = "synthetic.patient.b@example.org"
DOCTOR_EMAIL = "synthetic.doctor@example.org"
ADMIN_EMAIL = "synthetic.admin@example.org"
STRONG_PWD = "CareBridge#Test2026!"


# ---------------------------------------------------------------------------
# Isolated test fixtures (fresh SQLite DB + isolated private uploads dir)
# ---------------------------------------------------------------------------


@pytest.fixture
def patient_test_settings(tmp_path: Path) -> Settings:
    """Isolated settings with a private per-test upload directory."""
    upload_dir = tmp_path / "private_report_uploads"
    return Settings(
        _env_file=None,
        ENVIRONMENT="test",
        SECRET_KEY=TEST_SECRET,
        JWT_ALGORITHM="HS256",
        ACCESS_TOKEN_EXPIRE_MINUTES=15,
        REFRESH_TOKEN_EXPIRE_DAYS=7,
        SESSION_REFRESH_EXPIRE_HOURS=12,
        RATE_LIMIT_ENABLED=False,
        UPLOAD_STORAGE_DIR=str(upload_dir),
        MAX_REPORT_UPLOAD_MB=10,
    )


@pytest.fixture
def db_factory(tmp_path: Path) -> Generator[sessionmaker[Session], None, None]:
    """Create a fresh SQLite test database containing all ORM tables per test."""
    db_path = tmp_path / "patient_portal_test.db"
    test_engine = build_engine(f"sqlite:///{db_path.as_posix()}")
    Base.metadata.create_all(bind=test_engine)
    factory = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=Session,
    )
    try:
        yield factory
    finally:
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()


@pytest.fixture
def make_client(
    db_factory: sessionmaker[Session],
    patient_test_settings: Settings,
) -> Generator[Callable[[], TestClient], None, None]:
    """Produce independent cookie-jar TestClients backed by the shared test DB."""
    auth_rate_limiter.reset()
    settings_box: dict[str, Settings] = {"current": patient_test_settings}
    app = create_app()

    def _override_db() -> Generator[Session, None, None]:
        session = db_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_settings] = lambda: settings_box["current"]
    app.state._settings_box = settings_box

    clients: list[TestClient] = []

    def _spawn() -> TestClient:
        c = TestClient(app)
        c.__enter__()
        clients.append(c)
        return c

    try:
        yield _spawn
    finally:
        for c in clients:
            c.__exit__(None, None, None)
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Synthetic binary builders (zero real clinical documents or external assets)
# ---------------------------------------------------------------------------


def make_valid_pdf_bytes(label: str = "CareBridge AI Synthetic Report") -> bytes:
    """Build a minimal standards-compliant PDF 1.4 byte payload."""
    body = (
        "%PDF-1.4\n"
        "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"
        "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"
        "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] "
        "/Contents 4 0 R >>endobj\n"
        f"4 0 obj<< /Length {len(label) + 28} >>stream\n"
        f"BT /F1 12 Tf 24 96 Td ({label}) Tj ET\n"
        "endstream\nendobj\n"
        "xref\n0 5\n0000000000 65535 f \n"
        "trailer<< /Root 1 0 R /Size 5 >>\nstartxref\n220\n%%EOF\n"
    )
    return body.encode("ascii")


def make_valid_png_bytes() -> bytes:
    """Build a valid 1x1 RGB PNG image with verified IHDR/IDAT/IEND chunks."""

    def _chunk(chunk_type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return (
            struct.pack(">I", len(data))
            + chunk_type
            + data
            + struct.pack(">I", crc)
        )

    ihdr = _chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    idat = _chunk(b"IDAT", zlib.compress(b"\x00\x1d\x63\xd8"))
    iend = _chunk(b"IEND", b"")
    return b"\x89PNG\r\n\x1a\n" + ihdr + idat + iend


def make_valid_jpg_bytes() -> bytes:
    """Build a minimal valid JFIF JPEG payload with SOI and EOI markers."""
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00\x43\x00" + (b"\x08" * 64) + b"\xff\xd9"
    )


def _seed_user(
    db_factory: sessionmaker[Session],
    *,
    full_name: str,
    email: str,
    role: UserRole,
    password: str = STRONG_PWD,
) -> str:
    with db_factory() as db:
        user = User(
            full_name=full_name,
            email=email.lower(),
            hashed_password=hash_password(password),
            role=role.value,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id


def _csrf(client: TestClient) -> dict[str, str]:
    token = client.cookies.get(CSRF_COOKIE)
    assert token, "Expected CSRF cookie on authenticated session"
    return {CSRF_HEADER: token}


def _login(
    make_client: Callable[[], TestClient],
    email: str,
    password: str = STRONG_PWD,
) -> TestClient:
    session_client = make_client()
    res = session_client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, res.text
    return session_client


# ---------------------------------------------------------------------------
# 1 & 2. Authentication, RBAC (DOCTOR/ADMIN rejected), and CSRF enforcement
# ---------------------------------------------------------------------------


def test_unauthenticated_access_to_all_patient_endpoints_denied(
    make_client: Callable[[], TestClient],
) -> None:
    """1. Every patient portal endpoint rejects unauthenticated callers with 401."""
    anon = make_client()
    get_paths = [
        "/api/patient/overview",
        "/api/patient/profile",
        "/api/patient/reports",
        "/api/patient/reports/nonexistent-id",
        "/api/patient/reports/nonexistent-id/download",
        "/api/patient/risk-assessments",
        "/api/patient/appointments",
        "/api/patient/appointments/nonexistent-id",
        "/api/patient/referrals",
        "/api/patient/referrals/nonexistent-id",
        "/api/patient/follow-ups",
        "/api/patient/follow-ups/nonexistent-id",
        "/api/patient/notifications",
    ]
    for path in get_paths:
        res = anon.get(path)
        assert res.status_code == 401, f"Expected 401 for GET {path}, got {res.status_code}"
        assert res.headers.get("cache-control") == "no-store"

    assert anon.put("/api/patient/profile", json={"preferred_language": "en"}).status_code == 401
    assert (
        anon.post(
            "/api/patient/reports",
            files={"file": ("report.pdf", make_valid_pdf_bytes(), "application/pdf")},
        ).status_code
        == 401
    )
    assert (
        anon.post(
            "/api/patient/appointments/request",
            json={
                "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
                "appointment_type": "GENERAL_CONSULTATION",
            },
        ).status_code
        == 401
    )
    assert anon.patch("/api/patient/appointments/abc/cancel").status_code == 401
    assert anon.patch("/api/patient/follow-ups/abc/complete").status_code == 401
    assert anon.patch("/api/patient/notifications/abc/read").status_code == 401
    assert anon.patch("/api/patient/notifications/read-all").status_code == 401


def test_non_patient_roles_denied_patient_endpoints(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    """2. DOCTOR and ADMIN users receive 403 Forbidden across all /api/patient/* endpoints."""
    _seed_user(
        db_factory,
        full_name="Dr. Synthetic Clinician",
        email=DOCTOR_EMAIL,
        role=UserRole.DOCTOR,
    )
    _seed_user(
        db_factory,
        full_name="Synthetic Admin",
        email=ADMIN_EMAIL,
        role=UserRole.ADMIN,
    )

    for email in (DOCTOR_EMAIL, ADMIN_EMAIL):
        actor = _login(make_client, email)
        headers = _csrf(actor)
        for path in (
            "/api/patient/overview",
            "/api/patient/profile",
            "/api/patient/reports",
            "/api/patient/risk-assessments",
            "/api/patient/appointments",
            "/api/patient/referrals",
            "/api/patient/follow-ups",
            "/api/patient/notifications",
        ):
            res = actor.get(path)
            assert res.status_code == 403, f"{email} on {path} returned {res.status_code}"
            assert res.json()["error"]["code"] == "insufficient_role"

        assert (
            actor.put(
                "/api/patient/profile",
                json={"preferred_language": "en"},
                headers=headers,
            ).status_code
            == 403
        )
        assert (
            actor.post(
                "/api/patient/reports",
                files={"file": ("test.pdf", make_valid_pdf_bytes(), "application/pdf")},
                headers=headers,
            ).status_code
            == 403
        )
        assert (
            actor.post(
                "/api/patient/appointments/request",
                json={
                    "scheduled_at": (
                        datetime.now(timezone.utc) + timedelta(days=2)
                    ).isoformat(),
                    "appointment_type": "GENERAL_CONSULTATION",
                },
                headers=headers,
            ).status_code
            == 403
        )


def test_patient_mutating_endpoints_require_csrf_token(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    """Cookie-authenticated unsafe patient requests without X-CSRF-Token return 403."""
    _seed_user(
        db_factory,
        full_name="Patient Alpha",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    patient = _login(make_client, PATIENT_A_EMAIL)

    assert (
        patient.put("/api/patient/profile", json={"preferred_language": "hi"}).status_code
        == 403
    )
    assert (
        patient.post(
            "/api/patient/reports",
            files={"file": ("lab.pdf", make_valid_pdf_bytes(), "application/pdf")},
        ).status_code
        == 403
    )
    assert patient.patch("/api/patient/notifications/read-all").status_code == 403


# ---------------------------------------------------------------------------
# 3, 4, 5. Patient Profile retrieval, update, validation & cross-patient isolation
# ---------------------------------------------------------------------------


def test_patient_profile_retrieve_update_isolation_and_privilege_safety(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    """3-5. Patient views/updates own profile; optional fields never forced; tampering rejected."""
    patient_a_id = _seed_user(
        db_factory,
        full_name="Asha Synthetic",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    _seed_user(
        db_factory,
        full_name="Rohan Synthetic",
        email=PATIENT_B_EMAIL,
        role=UserRole.PATIENT,
    )

    patient_a = _login(make_client, PATIENT_A_EMAIL)
    patient_b = _login(make_client, PATIENT_B_EMAIL)

    # Fresh profile auto-initializes cleanly without requiring optional medical/demographic fields
    initial = patient_a.get("/api/patient/profile")
    assert initial.status_code == 200
    body = initial.json()
    assert body["user_id"] == patient_a_id
    assert body["full_name"] == "Asha Synthetic"
    assert body["email"] == PATIENT_A_EMAIL
    assert body["role"] == "PATIENT"
    assert body["preferred_language"] == "en"
    assert body["date_of_birth"] is None
    assert body["phone_number"] is None
    assert body["completion_percentage"] == 30

    # Full valid update succeeds and preserves strictly 1:1 profile ID
    updated = patient_a.put(
        "/api/patient/profile",
        headers=_csrf(patient_a),
        json={
            "date_of_birth": "1991-06-14",
            "phone_number": "+91 98765 00101",
            "gender": "FEMALE",
            "city": "Pune",
            "state": "Maharashtra",
            "preferred_language": "hi",
            "emergency_contact_name": "Kiran Synthetic",
            "emergency_contact_phone": "+91 98765 00102",
        },
    )
    assert updated.status_code == 200
    u_data = updated.json()
    assert u_data["id"] == body["id"]
    assert u_data["date_of_birth"] == "1991-06-14"
    assert u_data["phone_number"] == "+91 98765 00101"
    assert u_data["gender"] == "FEMALE"
    assert u_data["city"] == "Pune"
    assert u_data["state"] == "Maharashtra"
    assert u_data["preferred_language"] == "hi"
    assert u_data["completion_percentage"] == 100

    # Reload confirms persistence
    reloaded = patient_a.get("/api/patient/profile").json()
    assert reloaded["preferred_language"] == "hi"
    assert reloaded["emergency_contact_name"] == "Kiran Synthetic"

    # Patient B cannot see Patient A's profile and has an independent profile record
    b_profile = patient_b.get("/api/patient/profile").json()
    assert b_profile["id"] != body["id"]
    assert b_profile["email"] == PATIENT_B_EMAIL
    assert b_profile["city"] is None
    assert b_profile["preferred_language"] == "en"

    # Privilege escalation / cross-patient user_id injection rejected (422 extra="forbid")
    for forbidden_payload in (
        {"preferred_language": "en", "role": "ADMIN"},
        {"preferred_language": "en", "user_id": b_profile["user_id"]},
        {"preferred_language": "en", "patient_id": b_profile["user_id"]},
        {"preferred_language": "en", "is_verified": True},
    ):
        res = patient_a.put(
            "/api/patient/profile",
            headers=_csrf(patient_a),
            json=forbidden_payload,
        )
        assert res.status_code == 422

    # Invalid DOB (future) and malformed phone rejected
    future_dob = (datetime.now(timezone.utc).date() + timedelta(days=5)).isoformat()
    assert (
        patient_a.put(
            "/api/patient/profile",
            headers=_csrf(patient_a),
            json={"preferred_language": "en", "date_of_birth": future_dob},
        ).status_code
        == 422
    )
    assert (
        patient_a.put(
            "/api/patient/profile",
            headers=_csrf(patient_a),
            json={"preferred_language": "en", "phone_number": "invalid-phone!"},
        ).status_code
        == 422
    )


# ---------------------------------------------------------------------------
# 6, 7, 8. Medical Report Secure Upload, Format/Size Validation & Safe Storage
# ---------------------------------------------------------------------------


def test_medical_report_upload_pdf_png_jpg_list_detail_and_download(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
    patient_test_settings: Settings,
) -> None:
    """6 & 8. Valid PDF, PNG, JPG reports upload privately, hide storage paths, and download safely."""
    _seed_user(
        db_factory,
        full_name="Patient Alpha",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    patient = _login(make_client, PATIENT_A_EMAIL)
    headers = _csrf(patient)

    pdf_bytes = make_valid_pdf_bytes("Synthetic Fasting Glucose Panel")
    png_bytes = make_valid_png_bytes()
    jpg_bytes = make_valid_jpg_bytes()

    uploads = [
        ("../../Synthetic Lab Report (2026).pdf", pdf_bytes, "application/pdf", "PDF"),
        ("retinal_screening.png", png_bytes, "image/png", "PNG"),
        ("clinic_slip.jpeg", jpg_bytes, "image/jpeg", "JPG"),
    ]
    created_ids: list[str] = []

    for raw_name, content, mime, expected_type in uploads:
        res = patient.post(
            "/api/patient/reports",
            files={"file": (raw_name, content, mime)},
            headers=headers,
        )
        assert res.status_code == 201, res.text
        payload = res.json()
        assert payload["file_type"] == expected_type
        assert payload["file_size"] == len(content)
        assert payload["upload_status"] == "UPLOADED"
        assert payload["review_status"] == "PENDING_REVIEW"
        assert ".." not in payload["original_filename"]
        assert "/" not in payload["original_filename"]
        # Never expose stored_filename or filesystem storage path
        assert "stored_filename" not in payload
        assert str(patient_test_settings.resolved_upload_dir) not in str(payload)
        created_ids.append(payload["id"])

    # Verify private storage files have opaque UUID hex names and 0600 permissions
    stored_files = list(patient_test_settings.resolved_upload_dir.iterdir())
    assert len(stored_files) == 3
    for path in stored_files:
        assert "Synthetic" not in path.name
        assert "retinal" not in path.name
        assert (path.stat().st_mode & 0o777) == 0o600

    # List + filter
    listing = patient.get("/api/patient/reports")
    assert listing.status_code == 200
    assert listing.json()["total"] == 3
    assert listing.json()["max_upload_mb"] == 10
    assert patient.get("/api/patient/reports?file_type=PDF").json()["total"] == 1
    assert patient.get("/api/patient/reports?search=retinal").json()["total"] == 1

    # Detail retrieval
    detail = patient.get(f"/api/patient/reports/{created_ids[0]}")
    assert detail.status_code == 200
    assert detail.json()["original_filename"] == "Synthetic Lab Report (2026).pdf"
    assert "stored_filename" not in detail.json()

    # Authorized private download with hardened security headers
    dl = patient.get(f"/api/patient/reports/{created_ids[0]}/download")
    assert dl.status_code == 200
    assert dl.content == pdf_bytes
    assert dl.headers["content-type"] == "application/pdf"
    assert dl.headers["x-content-type-options"] == "nosniff"
    assert "no-store" in dl.headers["cache-control"]
    assert "attachment;" in dl.headers["content-disposition"]


def test_invalid_executable_spoofed_and_oversized_uploads_rejected(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
    patient_test_settings: Settings,
) -> None:
    """7 & 8. Executables, double extensions, spoofed MIME/magic bytes, empty, and >limit uploads fail."""
    _seed_user(
        db_factory,
        full_name="Patient Alpha",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    patient = _login(make_client, PATIENT_A_EMAIL)
    headers = _csrf(patient)

    bad_uploads = [
        ("payload.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/octet-stream"),
        ("disguised.pdf", b"MZ\x90\x00\x03\x00executable-as-pdf", "application/pdf"),
        ("elf_binary.jpg", b"\x7fELF\x02\x01\x01\x00fake", "image/jpeg"),
        ("double_ext.exe.pdf", make_valid_pdf_bytes(), "application/pdf"),
        ("script.png", b"#!/bin/sh\necho unsafe\n", "image/png"),
        ("xss.svg", b"<svg onload='alert(1)'></svg>", "image/svg+xml"),
        ("notes.txt", b"plain text file", "text/plain"),
        ("png_named_as_pdf.pdf", make_valid_png_bytes(), "application/pdf"),
        ("empty.pdf", b"", "application/pdf"),
    ]
    for filename, payload, mime in bad_uploads:
        res = patient.post(
            "/api/patient/reports",
            files={"file": (filename, payload, mime)},
            headers=headers,
        )
        assert res.status_code == 400, f"Expected 400 for {filename}, got {res.status_code}"

    # Configure a 1 MB limit and verify an oversized (>1 MB) file returns 413 Payload Too Large
    capped_settings = patient_test_settings.model_copy(
        update={"MAX_REPORT_UPLOAD_MB": 1}
    )
    patient.app.state._settings_box["current"] = capped_settings  # type: ignore[attr-defined]

    oversized_pdf = b"%PDF-1.4\n" + (b"X" * (1024 * 1024 + 4096)) + b"\n%%EOF\n"
    too_large = patient.post(
        "/api/patient/reports",
        files={"file": ("oversized_scan.pdf", oversized_pdf, "application/pdf")},
        headers=headers,
    )
    assert too_large.status_code == 413
    assert too_large.json()["error"]["code"] == "file_too_large"

    # Confirm zero DB records or residual disk artifacts remain
    assert patient.get("/api/patient/reports").json()["total"] == 0
    upload_dir = patient_test_settings.resolved_upload_dir
    if upload_dir.exists():
        assert list(upload_dir.iterdir()) == []


# ---------------------------------------------------------------------------
# 5, 9, 11, 12, 13, 14. Strict Cross-Patient Isolation Across Every Resource
# ---------------------------------------------------------------------------


def test_cross_patient_ownership_isolation_across_all_resources(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    """9, 11, 12, 13, 14. Patient B cannot access, download, or mutate any of Patient A's data."""
    patient_a_id = _seed_user(
        db_factory,
        full_name="Patient Alpha",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    _seed_user(
        db_factory,
        full_name="Patient Beta",
        email=PATIENT_B_EMAIL,
        role=UserRole.PATIENT,
    )
    doctor_id = _seed_user(
        db_factory,
        full_name="Dr. Meera Synthetic",
        email=DOCTOR_EMAIL,
        role=UserRole.DOCTOR,
    )

    patient_a = _login(make_client, PATIENT_A_EMAIL)
    patient_b = _login(make_client, PATIENT_B_EMAIL)
    headers_a = _csrf(patient_a)
    headers_b = _csrf(patient_b)

    # Patient A uploads a report and requests an appointment
    rep_res = patient_a.post(
        "/api/patient/reports",
        files={
            "file": (
                "alpha_private_lab.pdf",
                make_valid_pdf_bytes("Private Alpha Panel"),
                "application/pdf",
            )
        },
        headers=headers_a,
    )
    assert rep_res.status_code == 201
    report_id = rep_res.json()["id"]

    appt_res = patient_a.post(
        "/api/patient/appointments/request",
        headers=headers_a,
        json={
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat(),
            "appointment_type": "SCREENING_REVIEW",
            "location_or_mode": "Teleconsultation",
            "notes": "Discuss synthetic lab panel",
        },
    )
    assert appt_res.status_code == 201
    appt_id = appt_res.json()["id"]

    # Seed authorized referral, follow-up, risk assessment, and notification for Patient A
    with db_factory() as db:
        referral = Referral(
            patient_id=patient_a_id,
            referring_doctor_id=doctor_id,
            referred_department="Endocrinology",
            reason="Post-screening coordination consultation",
            next_action="Await scheduling confirmation from clinic desk.",
            status=ReferralStatus.ACCEPTED.value,
        )
        follow_up = FollowUp(
            patient_id=patient_a_id,
            related_appointment_id=appt_id,
            scheduled_at=datetime.now(timezone.utc) + timedelta(days=7),
            follow_up_type="Morning Blood Pressure Log",
            status=FollowUpStatus.PENDING.value,
            notes="Record readings for 5 days prior to review.",
        )
        risk = RiskAssessment(
            patient_id=patient_a_id,
            related_report_id=report_id,
            reviewed_by_doctor_id=doctor_id,
            status=RiskAssessmentStatus.REVIEWED.value,
            risk_category=RiskCategory.MODERATE.value,
            explanation="Authorized clinician care-coordination summary.",
            recommended_action="Attend scheduled follow-up consultation.",
        )
        notification = Notification(
            user_id=patient_a_id,
            title="Referral update",
            message="Endocrinology accepted your referral for scheduling.",
            notification_type=NotificationType.REFERRAL.value,
            is_read=False,
        )
        db.add_all([referral, follow_up, risk, notification])
        db.commit()
        referral_id = referral.id
        follow_up_id = follow_up.id
        notification_id = notification.id

    # Patient A accesses own referral, follow-up, and risk assessment cleanly; doctor email never exposed
    a_ref = patient_a.get(f"/api/patient/referrals/{referral_id}")
    assert a_ref.status_code == 200
    assert a_ref.json()["referred_department"] == "Endocrinology"
    assert a_ref.json()["referring_doctor_name"] == "Dr. Meera Synthetic"
    assert DOCTOR_EMAIL not in a_ref.text

    a_fu = patient_a.get(f"/api/patient/follow-ups/{follow_up_id}")
    assert a_fu.status_code == 200
    assert a_fu.json()["follow_up_type"] == "Morning Blood Pressure Log"

    a_risk = patient_a.get("/api/patient/risk-assessments")
    assert a_risk.status_code == 200
    assert a_risk.json()["total"] == 1
    assert a_risk.json()["items"][0]["risk_category"] == "MODERATE"
    assert DOCTOR_EMAIL not in a_risk.text

    # Patient B's list endpoints return strictly zero of Patient A's records
    assert patient_b.get("/api/patient/reports").json()["total"] == 0
    assert patient_b.get("/api/patient/risk-assessments").json()["total"] == 0
    assert patient_b.get("/api/patient/appointments").json()["total"] == 0
    assert patient_b.get("/api/patient/referrals").json()["total"] == 0
    assert patient_b.get("/api/patient/follow-ups").json()["total"] == 0
    assert patient_b.get("/api/patient/notifications").json()["total"] == 0

    # Patient B's direct ID access, download, and mutation probes all fail with 404
    assert patient_b.get(f"/api/patient/reports/{report_id}").status_code == 404
    assert patient_b.get(f"/api/patient/reports/{report_id}/download").status_code == 404
    assert patient_b.get(f"/api/patient/appointments/{appt_id}").status_code == 404
    assert (
        patient_b.patch(
            f"/api/patient/appointments/{appt_id}/cancel", headers=headers_b
        ).status_code
        == 404
    )
    assert patient_b.get(f"/api/patient/referrals/{referral_id}").status_code == 404
    assert patient_b.get(f"/api/patient/follow-ups/{follow_up_id}").status_code == 404
    assert (
        patient_b.patch(
            f"/api/patient/follow-ups/{follow_up_id}/complete", headers=headers_b
        ).status_code
        == 404
    )
    assert (
        patient_b.patch(
            f"/api/patient/notifications/{notification_id}/read", headers=headers_b
        ).status_code
        == 404
    )

    # Confirm Patient A's notification and follow-up were NOT modified by Patient B's attempts
    assert (
        patient_a.get(f"/api/patient/follow-ups/{follow_up_id}").json()["status"]
        == "PENDING"
    )
    assert patient_a.get("/api/patient/notifications").json()["unread_count"] == 3


# ---------------------------------------------------------------------------
# 10, 11, 12, 13, 14. Appointment Request, Referral Read-Only, Follow-up Status
# Transitions, Notifications Read Workflow, Honest Risk & Overview
# ---------------------------------------------------------------------------


def test_appointment_request_validation_and_status_transitions(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    """10-11. Appointment request creates PENDING without doctor self-assignment; validates dates/status."""
    patient_id = _seed_user(
        db_factory,
        full_name="Patient Alpha",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    doctor_id = _seed_user(
        db_factory,
        full_name="Dr. Synthetic",
        email=DOCTOR_EMAIL,
        role=UserRole.DOCTOR,
    )
    patient = _login(make_client, PATIENT_A_EMAIL)
    headers = _csrf(patient)

    future_slot = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    created = patient.post(
        "/api/patient/appointments/request",
        headers=headers,
        json={
            "scheduled_at": future_slot,
            "appointment_type": "PREVENTIVE_CHECKUP",
            "location_or_mode": "In-Person Clinic",
            "notes": "Annual preventive screening checkup",
        },
    )
    assert created.status_code == 201
    appt = created.json()
    assert appt["status"] == "PENDING"
    assert appt["assigned_doctor_name"] is None
    assert appt["is_upcoming"] is True

    # Block self-assignment to a doctor, status spoofing, past dates, naive timestamps, bad modes
    invalid_requests = [
        {
            "scheduled_at": future_slot,
            "appointment_type": "GENERAL_CONSULTATION",
            "doctor_id": doctor_id,
        },
        {
            "scheduled_at": future_slot,
            "appointment_type": "GENERAL_CONSULTATION",
            "status": "CONFIRMED",
        },
        {
            "scheduled_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
            "appointment_type": "GENERAL_CONSULTATION",
        },
        {
            "scheduled_at": "2027-02-01T10:30:00",  # missing timezone
            "appointment_type": "GENERAL_CONSULTATION",
        },
        {
            "scheduled_at": future_slot,
            "appointment_type": "GENERAL_CONSULTATION",
            "location_or_mode": "Arbitrary Unverified Location",
        },
    ]
    for bad in invalid_requests:
        assert (
            patient.post(
                "/api/patient/appointments/request",
                headers=headers,
                json=bad,
            ).status_code
            == 422
        )

    # Cancel own PENDING appointment -> CANCELLED; duplicate cancel rejected with 400
    cancelled = patient.patch(
        f"/api/patient/appointments/{appt['id']}/cancel", headers=headers
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"
    assert (
        patient.patch(
            f"/api/patient/appointments/{appt['id']}/cancel", headers=headers
        ).status_code
        == 400
    )

    # Completed appointment stays in past history and cannot be cancelled
    with db_factory() as db:
        completed_appt = Appointment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            scheduled_at=datetime.now(timezone.utc) - timedelta(days=14),
            appointment_type=AppointmentType.FOLLOW_UP_VISIT.value,
            status=AppointmentStatus.COMPLETED.value,
            location_or_mode="In-Person Clinic",
        )
        db.add(completed_appt)
        db.commit()
        completed_id = completed_appt.id

    listing = patient.get("/api/patient/appointments").json()
    assert listing["total"] == 2
    assert listing["upcoming_count"] == 0
    assert listing["past_count"] == 2
    assert (
        patient.patch(
            f"/api/patient/appointments/{completed_id}/cancel", headers=headers
        ).status_code
        == 400
    )


def test_referrals_are_read_only_and_never_fabricated(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    """12. Referral endpoints return only real owned records and disallow patient creation."""
    _seed_user(
        db_factory,
        full_name="Patient Alpha",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    patient = _login(make_client, PATIENT_A_EMAIL)

    empty = patient.get("/api/patient/referrals")
    assert empty.status_code == 200
    assert empty.json() == {"items": [], "total": 0, "active_count": 0}

    assert (
        patient.post(
            "/api/patient/referrals",
            headers=_csrf(patient),
            json={"referred_department": "Cardiology"},
        ).status_code
        == 405
    )


def test_follow_up_listing_and_validated_completion_workflow(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    """13. Follow-ups compute overdue/upcoming/completed counts and enforce valid transitions."""
    patient_id = _seed_user(
        db_factory,
        full_name="Patient Alpha",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    patient = _login(make_client, PATIENT_A_EMAIL)
    headers = _csrf(patient)

    now = datetime.now(timezone.utc)
    with db_factory() as db:
        overdue = FollowUp(
            patient_id=patient_id,
            scheduled_at=now - timedelta(days=2),
            follow_up_type="Home Blood Pressure Log",
            status=FollowUpStatus.PENDING.value,
            notes="Record morning reading.",
        )
        upcoming = FollowUp(
            patient_id=patient_id,
            scheduled_at=now + timedelta(days=6),
            follow_up_type="Repeat Fasting Lipid Panel",
            status=FollowUpStatus.PENDING.value,
        )
        cancelled = FollowUp(
            patient_id=patient_id,
            scheduled_at=now + timedelta(days=10),
            follow_up_type="Superseded Check-in",
            status=FollowUpStatus.CANCELLED.value,
        )
        db.add_all([overdue, upcoming, cancelled])
        db.commit()
        overdue_id = overdue.id
        cancelled_id = cancelled.id

    initial = patient.get("/api/patient/follow-ups").json()
    assert initial["total"] == 3
    assert initial["overdue_count"] == 1
    assert initial["upcoming_count"] == 1
    assert initial["completed_count"] == 0

    done = patient.patch(
        f"/api/patient/follow-ups/{overdue_id}/complete", headers=headers
    )
    assert done.status_code == 200
    assert done.json()["status"] == "COMPLETED"
    assert done.json()["is_overdue"] is False

    # Re-completing COMPLETED or completing CANCELLED fails cleanly with 400
    assert (
        patient.patch(
            f"/api/patient/follow-ups/{overdue_id}/complete", headers=headers
        ).status_code
        == 400
    )
    assert (
        patient.patch(
            f"/api/patient/follow-ups/{cancelled_id}/complete", headers=headers
        ).status_code
        == 400
    )


def test_notifications_read_workflow_and_live_dashboard_overview(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    """14 + Overview + Risk. Notifications mark-read works cleanly; overview & risk stay truthful."""
    _seed_user(
        db_factory,
        full_name="Priya Synthetic",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    patient = _login(make_client, PATIENT_A_EMAIL)
    headers = _csrf(patient)

    # Fresh overview has zero fabricated reports, referrals, appointments, or follow-ups
    ov = patient.get("/api/patient/overview").json()
    assert ov["patient_name"] == "Priya Synthetic"
    assert ov["metrics"]["total_reports"] == 0
    assert ov["metrics"]["upcoming_appointments"] == 0
    assert ov["metrics"]["pending_referrals"] == 0
    assert ov["metrics"]["attention_follow_ups"] == 0
    assert ov["recent_activity"] == []
    assert [s["label"] for s in ov["journey"]] == [
        "Screening",
        "Report Submitted",
        "Review",
        "Referral",
        "Appointment",
        "Follow-up",
    ]

    # Risk endpoint returns empty array + exact disclaimer
    risk = patient.get("/api/patient/risk-assessments").json()
    assert risk["items"] == []
    assert risk["total"] == 0
    assert (
        risk["disclaimer"]
        == "Risk information is intended to support healthcare coordination and does not "
        "replace professional medical advice or diagnosis."
    )

    # Perform real report upload + appointment request -> generates 2 real notifications
    assert (
        patient.post(
            "/api/patient/reports",
            files={"file": ("panel.pdf", make_valid_pdf_bytes(), "application/pdf")},
            headers=headers,
        ).status_code
        == 201
    )
    assert (
        patient.post(
            "/api/patient/appointments/request",
            headers=headers,
            json={
                "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
                "appointment_type": "SCREENING_REVIEW",
                "location_or_mode": "In-Person Clinic",
            },
        ).status_code
        == 201
    )

    updated_ov = patient.get("/api/patient/overview").json()
    assert updated_ov["metrics"]["total_reports"] == 1
    assert updated_ov["metrics"]["upcoming_appointments"] == 1
    assert updated_ov["metrics"]["unread_notifications"] == 2
    assert len(updated_ov["recent_activity"]) == 2

    # Mark one notification read, verify unread filter, then mark all read
    notifs = patient.get("/api/patient/notifications").json()
    assert notifs["total"] == 2
    assert notifs["unread_count"] == 2

    first_id = notifs["items"][0]["id"]
    mark_one = patient.patch(
        f"/api/patient/notifications/{first_id}/read", headers=headers
    )
    assert mark_one.status_code == 200
    assert mark_one.json()["notification"]["is_read"] is True
    assert mark_one.json()["unread_count"] == 1

    assert (
        patient.get("/api/patient/notifications?unread_only=true").json()["total"]
        == 1
    )

    mark_all = patient.patch("/api/patient/notifications/read-all", headers=headers)
    assert mark_all.status_code == 200
    assert mark_all.json() == {"marked_count": 1, "unread_count": 0}
    assert patient.get("/api/patient/notifications").json()["unread_count"] == 0


def test_failed_db_commit_rolls_back_stored_file_and_missing_file_returns_safe_404(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
    patient_test_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """8. Upload failure leaves zero orphaned files; missing disk file never leaks paths."""
    _seed_user(
        db_factory,
        full_name="Patient Alpha",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    patient = _login(make_client, PATIENT_A_EMAIL)
    headers = _csrf(patient)

    # First upload a valid report, then delete backing file and verify safe 404 (zero path leak)
    ok = patient.post(
        "/api/patient/reports",
        files={"file": ("valid.pdf", make_valid_pdf_bytes(), "application/pdf")},
        headers=headers,
    )
    assert ok.status_code == 201
    report_id = ok.json()["id"]

    files_on_disk = list(patient_test_settings.resolved_upload_dir.iterdir())
    assert len(files_on_disk) == 1
    files_on_disk[0].unlink()

    missing_dl = patient.get(f"/api/patient/reports/{report_id}/download")
    assert missing_dl.status_code == 404
    assert missing_dl.json()["error"]["code"] == "report_file_unavailable"
    assert str(patient_test_settings.resolved_upload_dir) not in missing_dl.text

    # Simulate database commit failure during upload -> newly written file is cleaned up
    real_commit = Session.commit

    def _boom_commit(self: Session) -> None:
        raise RuntimeError("simulated db failure")

    monkeypatch.setattr(Session, "commit", _boom_commit)
    with pytest.raises(RuntimeError):
        patient.post(
            "/api/patient/reports",
            files={"file": ("orphan_check.png", make_valid_png_bytes(), "image/png")},
            headers=headers,
        )
    monkeypatch.setattr(Session, "commit", real_commit)

    assert list(patient_test_settings.resolved_upload_dir.iterdir()) == []


def test_logout_invalidates_patient_portal_access_immediately(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    """Logged-out sessions are immediately rejected across /api/patient/*."""
    _seed_user(
        db_factory,
        full_name="Patient Alpha",
        email=PATIENT_A_EMAIL,
        role=UserRole.PATIENT,
    )
    patient = _login(make_client, PATIENT_A_EMAIL)
    assert patient.get("/api/patient/profile").status_code == 200

    logout = patient.post("/api/auth/logout", headers=_csrf(patient))
    assert logout.status_code == 200

    assert patient.get("/api/patient/profile").status_code == 401
    assert patient.get("/api/patient/overview").status_code == 401
    assert patient.get("/api/patient/reports").status_code == 401



def test_admin_aggregate_analytics_and_safe_export(make_client, db_factory):
    """Only administrators can see aggregate counts; export contains no identities."""
    _seed_user(db_factory, full_name='Synthetic Admin', email=ADMIN_EMAIL, role=UserRole.ADMIN)
    _seed_user(db_factory, full_name='Synthetic Patient', email=PATIENT_A_EMAIL, role=UserRole.PATIENT)
    anon = make_client()
    assert anon.get('/api/admin/analytics').status_code == 401
    patient = _login(make_client, PATIENT_A_EMAIL)
    assert patient.get('/api/admin/analytics').status_code == 403
    assert patient.get('/api/admin/analytics/export').status_code == 403
    admin = _login(make_client, ADMIN_EMAIL)
    result = admin.get('/api/admin/analytics?days=7')
    assert result.status_code == 200, result.text
    assert result.json()['totals']['patients'] == 1
    assert sum(day['registrations'] for day in result.json()['timeline']) == 1
    assert admin.get('/api/admin/analytics?days=42').status_code == 422
    exported = admin.get('/api/admin/analytics/export?days=7')
    assert exported.status_code == 200
    assert 'text/csv' in exported.headers['content-type']
    assert 'patients,1' in exported.text
    assert PATIENT_A_EMAIL not in exported.text
    assert 'Synthetic Patient' not in exported.text
