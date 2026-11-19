"""Phase 6 backend test suite: Doctor Portal workflows, RBAC, and care scope isolation.

Uses strictly fictional synthetic personas and minimal generated test files.
Validates:
- Unauthenticated, PATIENT, and ADMIN access controls + CSRF enforcement
- Doctor profile get/update, anti-self-verification, and private license hygiene
- Admin patient-doctor assignment validation, duplicate prevention, revocation, reassignment
- Assigned vs unassigned vs invalid patient access & pagination/search/filtering
- Report listing, detail, download authorization, review creation, review history
  preservation, immutable original file integrity, and note privacy
- Risk assessment retrieval, AI vs clinical review separation, empty state, and review
- Appointment pending retrieval, confirmation, rejection reason, reschedule (without
  auto-confirm), completion, invalid status transitions, ±30m conflict detection,
  unauthorized access, and live visibility on patient endpoints
- Referral creation, unauthorized patient rejection, department & status transition
  validation, and audit history
- Follow-up creation, appointment/referral linking validation, updates, overdue status,
  and unauthorized rejection
- Notification delivery to intended recipients, privacy-safe copy, deduplication, and
  cross-user isolation
- Live Doctor Dashboard Overview aggregations and full Patient Portal preservation
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
from app.models.follow_up import FollowUp, FollowUpStatus
from app.models.risk_assessment import (
    RiskAssessment,
    RiskAssessmentSource,
    RiskAssessmentStatus,
    RiskCategory,
)
from app.models.user import User, UserRole

TEST_SECRET = "phase6-test-only-jwt-signing-secret-with-more-than-48-characters-12345"
CSRF_HEADER = "X-CSRF-Token"
CSRF_COOKIE = "cb_csrf_token"
STRONG_PWD = "CareBridge#Test2026!"

DOC_A_EMAIL = "dr.synthetic.a@example.org"
DOC_B_EMAIL = "dr.synthetic.b@example.org"
PAT_ASSIGNED_EMAIL = "patient.assigned@example.org"
PAT_UNASSIGNED_EMAIL = "patient.unassigned@example.org"
ADMIN_EMAIL = "admin.synthetic@example.org"


def build_valid_pdf(title: str = "Synthetic Screening Report") -> bytes:
    """Construct a minimal binary-valid PDF document for upload tests."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"
        + f"3 0 obj<< /Type /Page /Parent 2 0 R /Title ({title}) /MediaBox [0 0 300 144] >>endobj\n".encode(
            "ascii"
        )
        + b"xref\n0 4\n0000000000 65535 f \ntrailer<< /Root 1 0 R /Size 4 >>\nstartxref\n180\n%%EOF\n"
    )


def build_valid_png() -> bytes:
    """Construct a minimal binary-valid 1x1 PNG image for upload tests."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"\x00\x17\x69\xaa"))
        + chunk(b"IEND", b"")
    )


@pytest.fixture
def doctor_test_settings(tmp_path: Path) -> Settings:
    upload_dir = tmp_path / "private_uploads"
    return Settings(
        _env_file=None,
        ENVIRONMENT="test",
        SECRET_KEY=TEST_SECRET,
        JWT_ALGORITHM="HS256",
        ACCESS_TOKEN_EXPIRE_MINUTES=30,
        REFRESH_TOKEN_EXPIRE_DAYS=7,
        SESSION_REFRESH_EXPIRE_HOURS=12,
        RATE_LIMIT_ENABLED=False,
        UPLOAD_STORAGE_DIR=str(upload_dir),
        MAX_REPORT_UPLOAD_MB=10,
    )


@pytest.fixture
def db_factory(tmp_path: Path) -> Generator[sessionmaker[Session], None, None]:
    db_path = tmp_path / "doctor_portal_test.db"
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
    doctor_test_settings: Settings,
) -> Generator[Callable[[], TestClient], None, None]:
    auth_rate_limiter.reset()
    app = create_app()

    def _override_db() -> Generator[Session, None, None]:
        session = db_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_settings] = lambda: doctor_test_settings

    active_clients: list[TestClient] = []

    def _spawn() -> TestClient:
        cli = TestClient(app)
        cli.__enter__()
        active_clients.append(cli)
        return cli

    try:
        yield _spawn
    finally:
        for cli in active_clients:
            cli.__exit__(None, None, None)
        app.dependency_overrides.clear()
        auth_rate_limiter.reset()


def _csrf(cli: TestClient) -> dict[str, str]:
    token = cli.cookies.get(CSRF_COOKIE)
    assert token, "Expected cb_csrf_token cookie on authenticated client"
    return {CSRF_HEADER: token}


def _seed_accounts_and_assignment(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> dict[str, object]:
    """Create Admin, Doctor A, Doctor B, Assigned Patient, and Unassigned Patient."""
    with db_factory() as db:
        admin = User(
            full_name="Synthetic Admin",
            email=ADMIN_EMAIL,
            hashed_password=hash_password(STRONG_PWD),
            role=UserRole.ADMIN.value,
            is_active=True,
            is_verified=True,
        )
        doc_a = User(
            full_name="Raghav Kulkarni",
            email=DOC_A_EMAIL,
            hashed_password=hash_password(STRONG_PWD),
            role=UserRole.DOCTOR.value,
            is_active=True,
            is_verified=True,
        )
        doc_b = User(
            full_name="Dr. Meera Iyer",
            email=DOC_B_EMAIL,
            hashed_password=hash_password(STRONG_PWD),
            role=UserRole.DOCTOR.value,
            is_active=True,
            is_verified=False,  # Pending verification
        )
        pat_assigned = User(
            full_name="Ananya Mehta",
            email=PAT_ASSIGNED_EMAIL,
            hashed_password=hash_password(STRONG_PWD),
            role=UserRole.PATIENT.value,
            is_active=True,
            is_verified=True,
        )
        pat_unassigned = User(
            full_name="Vikram Sethi",
            email=PAT_UNASSIGNED_EMAIL,
            hashed_password=hash_password(STRONG_PWD),
            role=UserRole.PATIENT.value,
            is_active=True,
            is_verified=True,
        )
        db.add_all([admin, doc_a, doc_b, pat_assigned, pat_unassigned])
        db.commit()

    admin_cli = make_client()
    doc_a_cli = make_client()
    doc_b_cli = make_client()
    pat_assigned_cli = make_client()
    pat_unassigned_cli = make_client()

    for cli, email in (
        (admin_cli, ADMIN_EMAIL),
        (doc_a_cli, DOC_A_EMAIL),
        (doc_b_cli, DOC_B_EMAIL),
        (pat_assigned_cli, PAT_ASSIGNED_EMAIL),
        (pat_unassigned_cli, PAT_UNASSIGNED_EMAIL),
    ):
        res = cli.post("/api/auth/login", json={"email": email, "password": STRONG_PWD})
        assert res.status_code == 200, res.text

    # Assign pat_assigned -> doc_a through authorized ADMIN endpoint
    assign_res = admin_cli.post(
        "/api/admin/assignments",
        headers=_csrf(admin_cli),
        json={
            "patient_id": pat_assigned.id,
            "doctor_id": doc_a.id,
            "notes": "Community preventive care cohort",
        },
    )
    assert assign_res.status_code == 201, assign_res.text

    return {
        "admin": admin,
        "doc_a": doc_a,
        "doc_b": doc_b,
        "pat_assigned": pat_assigned,
        "pat_unassigned": pat_unassigned,
        "admin_cli": admin_cli,
        "doc_a_cli": doc_a_cli,
        "doc_b_cli": doc_b_cli,
        "pat_assigned_cli": pat_assigned_cli,
        "pat_unassigned_cli": pat_unassigned_cli,
        "assignment": assign_res.json(),
    }


# ---------------------------------------------------------------------------
# 1. Authentication, RBAC & CSRF Enforcement
# ---------------------------------------------------------------------------


def test_doctor_endpoints_enforce_authentication_rbac_and_csrf(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    ctx = _seed_accounts_and_assignment(db_factory, make_client)
    anon_cli = make_client()
    pat_cli: TestClient = ctx["pat_assigned_cli"]  # type: ignore[assignment]
    admin_cli: TestClient = ctx["admin_cli"]  # type: ignore[assignment]
    doc_a_cli: TestClient = ctx["doc_a_cli"]  # type: ignore[assignment]
    pat_assigned: User = ctx["pat_assigned"]  # type: ignore[assignment]
    doc_b: User = ctx["doc_b"]  # type: ignore[assignment]

    read_endpoints = (
        "/api/doctor/overview",
        "/api/doctor/profile",
        "/api/doctor/patients",
        f"/api/doctor/patients/{pat_assigned.id}",
        "/api/doctor/reports",
        "/api/doctor/reports/nonexistent/download",
        "/api/doctor/risk-assessments",
        "/api/doctor/appointments",
        "/api/doctor/referrals",
        "/api/doctor/follow-ups",
        "/api/doctor/notifications",
    )

    # Unauthenticated -> 401
    for path in read_endpoints:
        res = anon_cli.get(path)
        assert res.status_code == 401, f"Expected 401 on {path}, got {res.status_code}"
        assert res.headers.get("cache-control") == "no-store"

    # PATIENT -> 403 on every doctor endpoint and admin assignment endpoint
    for path in read_endpoints:
        assert pat_cli.get(path).status_code == 403, path
    assert (
        pat_cli.put(
            "/api/doctor/profile",
            headers=_csrf(pat_cli),
            json={"specialization": "Internal Medicine"},
        ).status_code
        == 403
    )
    assert (
        pat_cli.post(
            "/api/admin/assignments",
            headers=_csrf(pat_cli),
            json={"patient_id": pat_assigned.id, "doctor_id": doc_b.id},
        ).status_code
        == 403
    )

    # ADMIN -> 403 on doctor-only workspace endpoints, 200 on admin assignment governance
    for path in read_endpoints:
        assert admin_cli.get(path).status_code == 403, path
    admin_assignments = admin_cli.get("/api/admin/assignments")
    assert admin_assignments.status_code == 200
    assert admin_assignments.json()["active_count"] == 1

    # DOCTOR -> 403 on admin assignment endpoints (cannot self-assign!) and patient endpoints
    assert doc_a_cli.get("/api/admin/assignments").status_code == 403
    assert (
        doc_a_cli.post(
            "/api/admin/assignments",
            headers=_csrf(doc_a_cli),
            json={"patient_id": pat_assigned.id, "doctor_id": doc_b.id},
        ).status_code
        == 403
    )
    assert doc_a_cli.get("/api/patient/profile").status_code == 403

    # Missing CSRF token on mutating cookie request -> 403
    no_csrf = doc_a_cli.put(
        "/api/doctor/profile",
        json={"specialization": "Internal Medicine"},
    )
    assert no_csrf.status_code == 403
    assert no_csrf.json()["error"]["code"] == "csrf_validation_failed"


# ---------------------------------------------------------------------------
# 2. Doctor Profile, Self-Verification Prevention & Private License Hygiene
# ---------------------------------------------------------------------------


def test_doctor_profile_update_blocks_self_verification_and_hides_license(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    ctx = _seed_accounts_and_assignment(db_factory, make_client)
    doc_a_cli: TestClient = ctx["doc_a_cli"]  # type: ignore[assignment]
    doc_b_cli: TestClient = ctx["doc_b_cli"]  # type: ignore[assignment]
    admin_cli: TestClient = ctx["admin_cli"]  # type: ignore[assignment]
    pat_cli: TestClient = ctx["pat_assigned_cli"]  # type: ignore[assignment]
    doc_b: User = ctx["doc_b"]  # type: ignore[assignment]
    pat_assigned: User = ctx["pat_assigned"]  # type: ignore[assignment]

    # Doctor B starts unverified -> PENDING verification_status, and "Dr." is not doubled
    initial_b = doc_b_cli.get("/api/doctor/profile")
    assert initial_b.status_code == 200
    assert initial_b.json()["verification_status"] == "PENDING"
    assert initial_b.json()["display_name"] == "Dr. Meera Iyer"

    # Doctor B cannot self-verify or tamper with role/user_id
    for tampered_field, val in (
        ("verification_status", "VERIFIED"),
        ("is_verified", True),
        ("role", "ADMIN"),
        ("user_id", "other-user-id"),
    ):
        tampered = doc_b_cli.put(
            "/api/doctor/profile",
            headers=_csrf(doc_b_cli),
            json={"specialization": "Cardiology", tampered_field: val},
        )
        assert tampered.status_code == 422

    # Valid profile update preserves PENDING verification_status until admin approves
    secret_license = "MCI-SYN-884920"
    updated_b = doc_b_cli.put(
        "/api/doctor/profile",
        headers=_csrf(doc_b_cli),
        json={
            "specialization": "Cardiology",
            "qualification": "MD, DM (Cardiology)",
            "license_number": secret_license,
            "department": "Cardiology",
            "hospital_or_clinic": "Synthetic Community Medical Center",
            "experience_years": 9,
        },
    )
    assert updated_b.status_code == 200
    body_b = updated_b.json()
    assert body_b["verification_status"] == "PENDING"
    assert body_b["license_number"] == secret_license
    assert body_b["completion_percentage"] == 100

    # Admin verifies Doctor B -> DoctorProfile.verification_status transitions to VERIFIED
    verify_res = admin_cli.patch(
        f"/api/admin/users/{doc_b.id}",
        headers=_csrf(admin_cli),
        json={"is_verified": True},
    )
    assert verify_res.status_code == 200
    assert doc_b_cli.get("/api/doctor/profile").json()["verification_status"] == "VERIFIED"

    # Doctor A updates profile with a private license, creates a referral for assigned patient;
    # patient-facing responses MUST NEVER expose Doctor A's license_number or email
    doc_a_license = "NMC-PRIV-774100"
    assert (
        doc_a_cli.put(
            "/api/doctor/profile",
            headers=_csrf(doc_a_cli),
            json={
                "specialization": "Internal Medicine",
                "license_number": doc_a_license,
                "experience_years": 12,
            },
        ).status_code
        == 200
    )
    assert (
        doc_a_cli.post(
            "/api/doctor/referrals",
            headers=_csrf(doc_a_cli),
            json={
                "patient_id": pat_assigned.id,
                "referred_department": "Cardiology",
                "reason": "Routine preventive cardiology follow-up evaluation.",
            },
        ).status_code
        == 201
    )
    patient_referrals_text = pat_cli.get("/api/patient/referrals").text
    assert doc_a_license not in patient_referrals_text
    assert DOC_A_EMAIL not in patient_referrals_text
    admin_users_text = admin_cli.get("/api/admin/users").text
    assert doc_a_license not in admin_users_text
    assert secret_license not in admin_users_text


# ---------------------------------------------------------------------------
# 3. Patient Assignment Isolation, Duplicate Blocking, Revocation & Reassignment
# ---------------------------------------------------------------------------


def test_patient_assignment_scope_pagination_revocation_and_reassignment(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    ctx = _seed_accounts_and_assignment(db_factory, make_client)
    admin_cli: TestClient = ctx["admin_cli"]  # type: ignore[assignment]
    doc_a_cli: TestClient = ctx["doc_a_cli"]  # type: ignore[assignment]
    doc_b_cli: TestClient = ctx["doc_b_cli"]  # type: ignore[assignment]
    pat_assigned_cli: TestClient = ctx["pat_assigned_cli"]  # type: ignore[assignment]
    doc_a: User = ctx["doc_a"]  # type: ignore[assignment]
    doc_b: User = ctx["doc_b"]  # type: ignore[assignment]
    pat_assigned: User = ctx["pat_assigned"]  # type: ignore[assignment]
    pat_unassigned: User = ctx["pat_unassigned"]  # type: ignore[assignment]
    assignment_id = ctx["assignment"]["id"]  # type: ignore[index]

    # Update assigned patient's city for search testing
    assert (
        pat_assigned_cli.put(
            "/api/patient/profile",
            headers=_csrf(pat_assigned_cli),
            json={
                "date_of_birth": "1991-06-14",
                "phone_number": "+91 98111 22334",
                "gender": "FEMALE",
                "city": "Pune",
                "state": "Maharashtra",
                "preferred_language": "en",
                "emergency_contact_name": "Rohan Mehta",
                "emergency_contact_phone": "+91 98111 99887",
            },
        ).status_code
        == 200
    )

    # Doctor A sees ONLY assigned patient; unassigned & invalid patient IDs -> 404
    roster = doc_a_cli.get("/api/doctor/patients?page=1&page_size=5")
    assert roster.status_code == 200
    assert roster.json()["total"] == 1
    assert roster.json()["items"][0]["patient_id"] == pat_assigned.id
    assert roster.json()["items"][0]["city"] == "Pune"

    # Search filter matches Pune, misses unrelated search
    assert doc_a_cli.get("/api/doctor/patients?search=Pune").json()["total"] == 1
    assert doc_a_cli.get("/api/doctor/patients?search=Vikram").json()["total"] == 0

    # Patient detail works for assigned patient, returns 404 for unassigned & random IDs
    detail = doc_a_cli.get(f"/api/doctor/patients/{pat_assigned.id}")
    assert detail.status_code == 200
    assert detail.json()["profile"]["full_name"] == "Ananya Mehta"
    assert doc_a_cli.get(f"/api/doctor/patients/{pat_unassigned.id}").status_code == 404
    assert doc_a_cli.get("/api/doctor/patients/00000000-0000-0000-0000-000000000000").status_code == 404

    # Doctor B has zero assigned patients and cannot open pat_assigned
    assert doc_b_cli.get("/api/doctor/patients").json()["total"] == 0
    assert doc_b_cli.get(f"/api/doctor/patients/{pat_assigned.id}").status_code == 404

    # Duplicate active assignment rejected (409), wrong-role accounts rejected (400)
    dup = admin_cli.post(
        "/api/admin/assignments",
        headers=_csrf(admin_cli),
        json={"patient_id": pat_assigned.id, "doctor_id": doc_a.id},
    )
    assert dup.status_code == 409
    bad_role = admin_cli.post(
        "/api/admin/assignments",
        headers=_csrf(admin_cli),
        json={"patient_id": doc_b.id, "doctor_id": doc_a.id},
    )
    assert bad_role.status_code == 400
    bad_doctor = admin_cli.post(
        "/api/admin/assignments",
        headers=_csrf(admin_cli),
        json={"patient_id": pat_unassigned.id, "doctor_id": pat_assigned.id},
    )
    assert bad_doctor.status_code == 400

    # Reassign pat_assigned from Doctor A -> Doctor B: Doctor A immediately loses access,
    # Doctor B gains access
    reassign = admin_cli.patch(
        f"/api/admin/assignments/{assignment_id}",
        headers=_csrf(admin_cli),
        json={"status": "REASSIGNED", "new_doctor_id": doc_b.id},
    )
    assert reassign.status_code == 200
    new_assignment_id = reassign.json()["id"]
    assert doc_a_cli.get(f"/api/doctor/patients/{pat_assigned.id}").status_code == 404
    assert doc_b_cli.get(f"/api/doctor/patients/{pat_assigned.id}").status_code == 200

    # Revoke Doctor B's assignment -> Doctor B also loses access immediately
    revoked = admin_cli.patch(
        f"/api/admin/assignments/{new_assignment_id}",
        headers=_csrf(admin_cli),
        json={"status": "REVOKED"},
    )
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "REVOKED"
    assert doc_b_cli.get(f"/api/doctor/patients/{pat_assigned.id}").status_code == 404


# ---------------------------------------------------------------------------
# 4. Medical Report Review, History Preservation, File Integrity & Access Control
# ---------------------------------------------------------------------------


def test_medical_report_review_history_download_and_note_privacy(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    ctx = _seed_accounts_and_assignment(db_factory, make_client)
    doc_a_cli: TestClient = ctx["doc_a_cli"]  # type: ignore[assignment]
    doc_b_cli: TestClient = ctx["doc_b_cli"]  # type: ignore[assignment]
    pat_assigned_cli: TestClient = ctx["pat_assigned_cli"]  # type: ignore[assignment]
    pat_unassigned_cli: TestClient = ctx["pat_unassigned_cli"]  # type: ignore[assignment]

    pdf_bytes = build_valid_pdf("Lipid Panel")
    up_assigned = pat_assigned_cli.post(
        "/api/patient/reports",
        headers=_csrf(pat_assigned_cli),
        files={"file": ("lipid_panel_synthetic.pdf", pdf_bytes, "application/pdf")},
    )
    assert up_assigned.status_code == 201
    assigned_report_id = up_assigned.json()["id"]

    up_unassigned = pat_unassigned_cli.post(
        "/api/patient/reports",
        headers=_csrf(pat_unassigned_cli),
        files={"file": ("private_other.png", build_valid_png(), "image/png")},
    )
    assert up_unassigned.status_code == 201
    unassigned_report_id = up_unassigned.json()["id"]

    # Doctor A lists ONLY assigned patient's report; never exposes stored_filename
    list_res = doc_a_cli.get("/api/doctor/reports")
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1
    assert list_res.json()["pending_count"] == 1
    assert list_res.json()["items"][0]["id"] == assigned_report_id
    assert "stored_filename" not in list_res.text

    # Unassigned patient's report is 404 across detail, download, and review
    assert doc_a_cli.get(f"/api/doctor/reports/{unassigned_report_id}").status_code == 404
    assert doc_a_cli.get(f"/api/doctor/reports/{unassigned_report_id}/download").status_code == 404
    assert (
        doc_a_cli.post(
            f"/api/doctor/reports/{unassigned_report_id}/review",
            headers=_csrf(doc_a_cli),
            json={"review_status": "REVIEWED", "review_note": "Unauthorized attempt"},
        ).status_code
        == 404
    )
    # Doctor B cannot access or download assigned patient's report
    assert doc_b_cli.get(f"/api/doctor/reports/{assigned_report_id}").status_code == 404
    assert doc_b_cli.get(f"/api/doctor/reports/{assigned_report_id}/download").status_code == 404

    # NEEDS_FOLLOW_UP requires a concise note (422 when omitted)
    assert (
        doc_a_cli.post(
            f"/api/doctor/reports/{assigned_report_id}/review",
            headers=_csrf(doc_a_cli),
            json={"review_status": "NEEDS_FOLLOW_UP"},
        ).status_code
        == 422
    )

    # First review: IN_REVIEW
    rev1 = doc_a_cli.post(
        f"/api/doctor/reports/{assigned_report_id}/review",
        headers=_csrf(doc_a_cli),
        json={
            "review_status": "IN_REVIEW",
            "review_note": "Initial review started; comparing prior screening figures.",
        },
    )
    assert rev1.status_code == 201
    assert rev1.json()["review_status"] == "IN_REVIEW"
    assert len(rev1.json()["reviews"]) == 1

    # Second review: NEEDS_FOLLOW_UP (preserves first review in history!)
    confidential_note = "INTERNAL-CLINICAL-NOTE-9921: schedule repeat fasting panel."
    rev2 = doc_a_cli.post(
        f"/api/doctor/reports/{assigned_report_id}/review",
        headers=_csrf(doc_a_cli),
        json={
            "review_status": "NEEDS_FOLLOW_UP",
            "review_note": confidential_note,
        },
    )
    assert rev2.status_code == 201
    assert rev2.json()["review_status"] == "NEEDS_FOLLOW_UP"
    assert len(rev2.json()["reviews"]) == 2

    # Third review: REVIEWED (all 3 history rows preserved!)
    rev3 = doc_a_cli.post(
        f"/api/doctor/reports/{assigned_report_id}/review",
        headers=_csrf(doc_a_cli),
        json={
            "review_status": "REVIEWED",
            "review_note": "Follow-up arranged and report review finalized.",
        },
    )
    assert rev3.status_code == 201
    assert rev3.json()["review_status"] == "REVIEWED"
    statuses = [entry["review_status"] for entry in rev3.json()["reviews"]]
    assert statuses == ["REVIEWED", "NEEDS_FOLLOW_UP", "IN_REVIEW"]

    # Authorized download returns byte-for-byte unmodified PDF with safe headers
    dl = doc_a_cli.get(f"/api/doctor/reports/{assigned_report_id}/download")
    assert dl.status_code == 200
    assert dl.content == pdf_bytes
    assert dl.headers["x-content-type-options"] == "nosniff"
    assert "no-store" in dl.headers["cache-control"]
    assert "attachment" in dl.headers["content-disposition"]

    # Patient sees updated status, and confidential review_note is NOT leaked in patient report or notification
    pat_report = pat_assigned_cli.get(f"/api/patient/reports/{assigned_report_id}")
    assert pat_report.status_code == 200
    assert pat_report.json()["review_status"] == "REVIEWED"
    assert confidential_note not in pat_report.text
    pat_notifs = pat_assigned_cli.get("/api/patient/notifications")
    assert confidential_note not in pat_notifs.text


# ---------------------------------------------------------------------------
# 5. Risk Assessment & Professional Clinical Review
# ---------------------------------------------------------------------------


def test_risk_assessment_empty_state_ai_separation_and_clinical_review(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    ctx = _seed_accounts_and_assignment(db_factory, make_client)
    doc_a_cli: TestClient = ctx["doc_a_cli"]  # type: ignore[assignment]
    pat_assigned: User = ctx["pat_assigned"]  # type: ignore[assignment]
    pat_unassigned: User = ctx["pat_unassigned"]  # type: ignore[assignment]

    # Clean empty state — never fabricates risk scores or diagnoses
    empty = doc_a_cli.get("/api/doctor/risk-assessments")
    assert empty.status_code == 200
    assert empty.json()["total"] == 0
    assert empty.json()["items"] == []
    assert "never a substitute" in empty.json()["disclaimer"].lower()

    # Seed one authorized assessment for assigned patient and one for unassigned patient
    with db_factory() as db:
        assigned_ra = RiskAssessment(
            patient_id=pat_assigned.id,
            status=RiskAssessmentStatus.PENDING.value,
            risk_category=RiskCategory.MODERATE.value,
            source=RiskAssessmentSource.AI_ASSISTED.value,
            explanation="Synthetic screening triage summary awaiting physician validation.",
            recommended_action="Await clinician review.",
        )
        unassigned_ra = RiskAssessment(
            patient_id=pat_unassigned.id,
            status=RiskAssessmentStatus.PENDING.value,
            risk_category=RiskCategory.HIGH.value,
            source=RiskAssessmentSource.SCREENING_INTAKE.value,
        )
        db.add_all([assigned_ra, unassigned_ra])
        db.commit()
        assigned_ra_id = assigned_ra.id
        unassigned_ra_id = unassigned_ra.id

    listed = doc_a_cli.get("/api/doctor/risk-assessments")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    item = listed.json()["items"][0]
    assert item["id"] == assigned_ra_id
    assert item["source"] == "AI_ASSISTED"
    assert item["is_ai_assisted"] is True
    assert item["clinical_reviews"] == []

    # Reviewing unassigned patient's risk assessment -> 404
    assert (
        doc_a_cli.post(
            f"/api/doctor/risk-assessments/{unassigned_ra_id}/review",
            headers=_csrf(doc_a_cli),
            json={
                "review_status": "REVIEWED",
                "review_note": "Unauthorized review attempt",
            },
        ).status_code
        == 404
    )

    # Flag for additional review, then record completed clinical review
    flagged = doc_a_cli.post(
        f"/api/doctor/risk-assessments/{assigned_ra_id}/review",
        headers=_csrf(doc_a_cli),
        json={
            "review_status": "FLAGGED_FOR_REVIEW",
            "review_note": "Flagged for follow-up outpatient blood pressure confirmation.",
            "recommended_action": "Schedule in-person screening review within 14 days.",
        },
    )
    assert flagged.status_code == 201
    assert flagged.json()["status"] == "PENDING"
    assert flagged.json()["is_ai_assisted"] is True  # Source preserved distinctly
    assert flagged.json()["risk_category"] == "MODERATE"  # Never arbitrarily changed
    assert len(flagged.json()["clinical_reviews"]) == 1
    assert flagged.json()["clinical_reviews"][0]["review_status"] == "FLAGGED_FOR_REVIEW"

    finalized = doc_a_cli.post(
        f"/api/doctor/risk-assessments/{assigned_ra_id}/review",
        headers=_csrf(doc_a_cli),
        json={
            "review_status": "REVIEWED",
            "review_note": "Reviewed alongside outpatient notes; care plan communicated.",
            "recommended_action": "Attend scheduled preventive consultation.",
        },
    )
    assert finalized.status_code == 201
    assert finalized.json()["status"] == "REVIEWED"
    assert finalized.json()["reviewed_by_doctor_name"] == "Dr. Raghav Kulkarni"
    assert len(finalized.json()["clinical_reviews"]) == 2


# ---------------------------------------------------------------------------
# 6. Appointment Management, Conflict Validation & Status Transitions
# ---------------------------------------------------------------------------


def test_appointment_confirmation_conflicts_transitions_reschedule_and_isolation(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    ctx = _seed_accounts_and_assignment(db_factory, make_client)
    doc_a_cli: TestClient = ctx["doc_a_cli"]  # type: ignore[assignment]
    pat_assigned_cli: TestClient = ctx["pat_assigned_cli"]  # type: ignore[assignment]
    pat_unassigned_cli: TestClient = ctx["pat_unassigned_cli"]  # type: ignore[assignment]

    base_slot = (datetime.now(timezone.utc) + timedelta(days=3)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    overlapping_slot = base_slot + timedelta(minutes=15)
    clear_slot = base_slot + timedelta(hours=2)

    # Assigned patient creates two pending appointment requests; unassigned creates one
    req1 = pat_assigned_cli.post(
        "/api/patient/appointments/request",
        headers=_csrf(pat_assigned_cli),
        json={
            "scheduled_at": base_slot.isoformat(),
            "appointment_type": "SCREENING_REVIEW",
            "location_or_mode": "In-Person Clinic",
            "notes": "Synthetic screening review visit",
        },
    )
    assert req1.status_code == 201
    appt1_id = req1.json()["id"]
    assert req1.json()["status"] == "PENDING"  # Never auto-confirmed

    req2 = pat_assigned_cli.post(
        "/api/patient/appointments/request",
        headers=_csrf(pat_assigned_cli),
        json={
            "scheduled_at": overlapping_slot.isoformat(),
            "appointment_type": "GENERAL_CONSULTATION",
            "location_or_mode": "Teleconsultation",
        },
    )
    assert req2.status_code == 201
    appt2_id = req2.json()["id"]

    req_unassigned = pat_unassigned_cli.post(
        "/api/patient/appointments/request",
        headers=_csrf(pat_unassigned_cli),
        json={
            "scheduled_at": clear_slot.isoformat(),
            "appointment_type": "PREVENTIVE_CHECKUP",
            "location_or_mode": "In-Person Clinic",
        },
    )
    assert req_unassigned.status_code == 201
    unassigned_appt_id = req_unassigned.json()["id"]

    # Retrieve pending requests -> contains appt1 & appt2 only, never unassigned
    pending = doc_a_cli.get("/api/doctor/appointments?scope=PENDING")
    assert pending.status_code == 200
    assert pending.json()["total"] == 2
    assert doc_a_cli.get(f"/api/doctor/appointments/{unassigned_appt_id}").status_code == 404
    assert (
        doc_a_cli.patch(
            f"/api/doctor/appointments/{unassigned_appt_id}/status",
            headers=_csrf(doc_a_cli),
            json={"status": "CONFIRMED"},
        ).status_code
        == 404
    )

    # Invalid direct PENDING -> COMPLETED transition rejected (400)
    assert (
        doc_a_cli.patch(
            f"/api/doctor/appointments/{appt1_id}/status",
            headers=_csrf(doc_a_cli),
            json={"status": "COMPLETED"},
        ).status_code
        == 400
    )

    # Confirm appt1 -> 200 CONFIRMED
    confirm1 = doc_a_cli.patch(
        f"/api/doctor/appointments/{appt1_id}/status",
        headers=_csrf(doc_a_cli),
        json={"status": "CONFIRMED", "reason": "Confirmed for clinic room 2."},
    )
    assert confirm1.status_code == 200
    assert confirm1.json()["status"] == "CONFIRMED"
    assert confirm1.json()["assigned_doctor_name"] == "Dr. Raghav Kulkarni"

    # Confirming overlapping appt2 (+15 min) -> 409 appointment_conflict!
    conflict = doc_a_cli.patch(
        f"/api/doctor/appointments/{appt2_id}/status",
        headers=_csrf(doc_a_cli),
        json={"status": "CONFIRMED"},
    )
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "appointment_conflict"

    # Rejecting PENDING appt2 without a reason -> 400; naive reschedule timestamp -> 422
    assert (
        doc_a_cli.patch(
            f"/api/doctor/appointments/{appt2_id}/status",
            headers=_csrf(doc_a_cli),
            json={"status": "CANCELLED"},
        ).status_code
        == 400
    )
    assert (
        doc_a_cli.patch(
            f"/api/doctor/appointments/{appt2_id}/reschedule",
            headers=_csrf(doc_a_cli),
            json={"scheduled_at": "2027-03-01T10:00:00"},
        ).status_code
        == 422
    )

    # Reschedule appt2 to clear_slot -> stays PENDING (not auto-confirmed!), then reject with reason
    resched = doc_a_cli.patch(
        f"/api/doctor/appointments/{appt2_id}/reschedule",
        headers=_csrf(doc_a_cli),
        json={
            "scheduled_at": clear_slot.isoformat(),
            "location_or_mode": "Teleconsultation",
            "reason": "Moved to avoid morning clinic overlap.",
        },
    )
    assert resched.status_code == 200
    assert resched.json()["status"] == "PENDING"

    rejected = doc_a_cli.patch(
        f"/api/doctor/appointments/{appt2_id}/status",
        headers=_csrf(doc_a_cli),
        json={
            "status": "CANCELLED",
            "reason": "Consolidated into confirmed morning consultation.",
        },
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "CANCELLED"

    # Mark appt1 COMPLETED; verify terminal state rejects further edits or rescheduling
    completed = doc_a_cli.patch(
        f"/api/doctor/appointments/{appt1_id}/status",
        headers=_csrf(doc_a_cli),
        json={"status": "COMPLETED"},
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"
    assert (
        doc_a_cli.patch(
            f"/api/doctor/appointments/{appt1_id}/status",
            headers=_csrf(doc_a_cli),
            json={"status": "CANCELLED", "reason": "Late change"},
        ).status_code
        == 400
    )
    assert (
        doc_a_cli.patch(
            f"/api/doctor/appointments/{appt1_id}/reschedule",
            headers=_csrf(doc_a_cli),
            json={"scheduled_at": (clear_slot + timedelta(days=1)).isoformat()},
        ).status_code
        == 400
    )

    # Patient immediately sees legitimate status updates & status_note on /api/patient/appointments
    pat_appt1 = pat_assigned_cli.get(f"/api/patient/appointments/{appt1_id}").json()
    pat_appt2 = pat_assigned_cli.get(f"/api/patient/appointments/{appt2_id}").json()
    assert pat_appt1["status"] == "COMPLETED"
    assert pat_appt2["status"] == "CANCELLED"
    assert "Consolidated" in (pat_appt2["status_note"] or "")


# ---------------------------------------------------------------------------
# 7. Referrals & Follow-ups + Notifications + Dashboard Overview Integration
# ---------------------------------------------------------------------------


def test_referrals_follow_ups_notifications_and_overview_workflows(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    ctx = _seed_accounts_and_assignment(db_factory, make_client)
    doc_a_cli: TestClient = ctx["doc_a_cli"]  # type: ignore[assignment]
    doc_b_cli: TestClient = ctx["doc_b_cli"]  # type: ignore[assignment]
    pat_assigned_cli: TestClient = ctx["pat_assigned_cli"]  # type: ignore[assignment]
    pat_unassigned_cli: TestClient = ctx["pat_unassigned_cli"]  # type: ignore[assignment]
    pat_assigned: User = ctx["pat_assigned"]  # type: ignore[assignment]
    pat_unassigned: User = ctx["pat_unassigned"]  # type: ignore[assignment]

    # Unauthorized patient referral -> 404; unsupported department -> 422
    assert (
        doc_a_cli.post(
            "/api/doctor/referrals",
            headers=_csrf(doc_a_cli),
            json={
                "patient_id": pat_unassigned.id,
                "referred_department": "Cardiology",
                "reason": "Should be denied because patient is not assigned.",
            },
        ).status_code
        == 404
    )
    assert (
        doc_a_cli.post(
            "/api/doctor/referrals",
            headers=_csrf(doc_a_cli),
            json={
                "patient_id": pat_assigned.id,
                "referred_department": "Unknown Fake Department",
                "reason": "Invalid department validation check.",
            },
        ).status_code
        == 422
    )

    # Authorized referral creation -> PENDING with initial history entry
    created_ref = doc_a_cli.post(
        "/api/doctor/referrals",
        headers=_csrf(doc_a_cli),
        json={
            "patient_id": pat_assigned.id,
            "referred_department": "Endocrinology",
            "reason": "Outpatient metabolic screening follow-up coordination.",
            "next_action": "Request outpatient Endocrinology appointment slot.",
        },
    )
    assert created_ref.status_code == 201
    ref_id = created_ref.json()["id"]
    assert created_ref.json()["status"] == "PENDING"
    assert len(created_ref.json()["history"]) == 1

    # Block fabricated jump PENDING -> COMPLETED (400)
    assert (
        doc_a_cli.patch(
            f"/api/doctor/referrals/{ref_id}/status",
            headers=_csrf(doc_a_cli),
            json={"status": "COMPLETED"},
        ).status_code
        == 400
    )

    # Doctor B cannot update Doctor A's patient's referral -> 404
    assert (
        doc_b_cli.patch(
            f"/api/doctor/referrals/{ref_id}/status",
            headers=_csrf(doc_b_cli),
            json={"status": "ACCEPTED"},
        ).status_code
        == 404
    )

    # Valid transition PENDING -> ACCEPTED -> SCHEDULED preserves history
    acc_ref = doc_a_cli.patch(
        f"/api/doctor/referrals/{ref_id}/status",
        headers=_csrf(doc_a_cli),
        json={
            "status": "ACCEPTED",
            "next_action": "Await clinic slot confirmation.",
            "note": "Accepted for outpatient scheduling review.",
        },
    )
    assert acc_ref.status_code == 200
    assert acc_ref.json()["status"] == "ACCEPTED"
    assert len(acc_ref.json()["history"]) == 2

    # Follow-up creation linked to referral; reject unassigned patient & past date
    future_due = datetime.now(timezone.utc) + timedelta(days=10)
    past_due = datetime.now(timezone.utc) - timedelta(days=2)

    assert (
        doc_a_cli.post(
            "/api/doctor/follow-ups",
            headers=_csrf(doc_a_cli),
            json={
                "patient_id": pat_unassigned.id,
                "follow_up_type": "Unauthorized check",
                "scheduled_at": future_due.isoformat(),
            },
        ).status_code
        == 404
    )
    assert (
        doc_a_cli.post(
            "/api/doctor/follow-ups",
            headers=_csrf(doc_a_cli),
            json={
                "patient_id": pat_assigned.id,
                "follow_up_type": "Past date check",
                "scheduled_at": past_due.isoformat(),
            },
        ).status_code
        == 422
    )

    created_fu = doc_a_cli.post(
        "/api/doctor/follow-ups",
        headers=_csrf(doc_a_cli),
        json={
            "patient_id": pat_assigned.id,
            "follow_up_type": "Post-referral screening check-in",
            "scheduled_at": future_due.isoformat(),
            "related_referral_id": ref_id,
            "notes": "Bring recent screening printout.",
        },
    )
    assert created_fu.status_code == 201
    fu_id = created_fu.json()["id"]
    assert created_fu.json()["status"] == "PENDING"
    assert created_fu.json()["related_referral_id"] == ref_id

    # Seed an overdue follow-up to verify OVERDUE filter and dashboard attention counter
    with db_factory() as db:
        overdue_fu = FollowUp(
            patient_id=pat_assigned.id,
            scheduled_at=datetime.now(timezone.utc) - timedelta(days=3),
            follow_up_type="Overdue blood pressure recheck",
            status=FollowUpStatus.PENDING.value,
        )
        db.add(overdue_fu)
        db.commit()
        overdue_id = overdue_fu.id

    overdue_list = doc_a_cli.get("/api/doctor/follow-ups?scope=OVERDUE")
    assert overdue_list.status_code == 200
    assert overdue_list.json()["total"] == 1
    assert overdue_list.json()["items"][0]["id"] == overdue_id
    assert overdue_list.json()["items"][0]["is_overdue"] is True

    # Verify Doctor Dashboard Overview aggregates real authorized database counts
    overview = doc_a_cli.get("/api/doctor/overview")
    assert overview.status_code == 200
    ov = overview.json()
    assert ov["display_name"] == "Dr. Raghav Kulkarni"
    assert ov["statistics"]["total_assigned_patients"] == 1
    assert ov["statistics"]["patients_requiring_attention"] == 1
    assert ov["statistics"]["pending_referrals"] == 1
    assert ov["statistics"]["pending_follow_ups"] == 2
    assert ov["statistics"]["overdue_follow_ups"] == 1
    assert len(ov["follow_ups_requiring_attention"]) == 2

    # Doctor B blocked from modifying follow-up -> 404
    assert (
        doc_b_cli.patch(
            f"/api/doctor/follow-ups/{fu_id}",
            headers=_csrf(doc_b_cli),
            json={"status": "COMPLETED"},
        ).status_code
        == 404
    )

    # Doctor A updates follow-up notes & completes overdue item; completed item blocks further edits
    updated_fu = doc_a_cli.patch(
        f"/api/doctor/follow-ups/{fu_id}",
        headers=_csrf(doc_a_cli),
        json={"notes": "Updated follow-up preparation guidance."},
    )
    assert updated_fu.status_code == 200
    assert updated_fu.json()["notes"] == "Updated follow-up preparation guidance."

    completed_overdue = doc_a_cli.patch(
        f"/api/doctor/follow-ups/{overdue_id}",
        headers=_csrf(doc_a_cli),
        json={"status": "COMPLETED"},
    )
    assert completed_overdue.status_code == 200
    assert completed_overdue.json()["status"] == "COMPLETED"
    assert (
        doc_a_cli.patch(
            f"/api/doctor/follow-ups/{overdue_id}",
            headers=_csrf(doc_a_cli),
            json={"status": "CANCELLED"},
        ).status_code
        == 400
    )

    # Notifications: verify right recipients + cross-user isolation + mark read/all read
    doc_a_notifs = doc_a_cli.get("/api/doctor/notifications").json()
    pat_assigned_notifs = pat_assigned_cli.get("/api/patient/notifications").json()
    pat_unassigned_notifs = pat_unassigned_cli.get("/api/patient/notifications").json()

    assert doc_a_notifs["total"] >= 1
    assert any("assigned" in n["title"].lower() for n in doc_a_notifs["items"])
    assert pat_assigned_notifs["total"] >= 4  # assigned + referral created + referral updated + follow-ups
    assert pat_unassigned_notifs["total"] == 0  # Zero cross-user leakage!

    # Cross-user notification mark-read blocked (404)
    patient_notif_id = pat_assigned_notifs["items"][0]["id"]
    doctor_notif_id = doc_a_notifs["items"][0]["id"]
    assert (
        doc_a_cli.patch(
            f"/api/doctor/notifications/{patient_notif_id}/read",
            headers=_csrf(doc_a_cli),
        ).status_code
        == 404
    )
    assert (
        pat_assigned_cli.patch(
            f"/api/patient/notifications/{doctor_notif_id}/read",
            headers=_csrf(pat_assigned_cli),
        ).status_code
        == 404
    )

    # Doctor marks own notification read & read-all cleanly
    read_one = doc_a_cli.patch(
        f"/api/doctor/notifications/{doctor_notif_id}/read",
        headers=_csrf(doc_a_cli),
    )
    assert read_one.status_code == 200
    assert read_one.json()["notification"]["is_read"] is True

    read_all = doc_a_cli.patch(
        "/api/doctor/notifications/read-all",
        headers=_csrf(doc_a_cli),
    )
    assert read_all.status_code == 200
    assert read_all.json()["unread_count"] == 0

    # Patient triggers new report + appointment -> Doctor A receives fresh notifications, Doctor B does not
    assert (
        pat_assigned_cli.post(
            "/api/patient/reports",
            headers=_csrf(pat_assigned_cli),
            files={"file": ("checkup.png", build_valid_png(), "image/png")},
        ).status_code
        == 201
    )
    assert (
        pat_assigned_cli.post(
            "/api/patient/appointments/request",
            headers=_csrf(pat_assigned_cli),
            json={
                "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=6)).isoformat(),
                "appointment_type": "FOLLOW_UP_VISIT",
                "location_or_mode": "Teleconsultation",
            },
        ).status_code
        == 201
    )
    assert doc_a_cli.get("/api/doctor/notifications").json()["unread_count"] == 2
    assert doc_b_cli.get("/api/doctor/notifications").json()["total"] == 0


# ---------------------------------------------------------------------------
# 8. Pagination, Cross-Patient Link Guards, Missed Follow-up Reopen & Logout
# ---------------------------------------------------------------------------


def test_pagination_cross_patient_link_guard_and_logout_invalidation(
    db_factory: sessionmaker[Session],
    make_client: Callable[[], TestClient],
) -> None:
    ctx = _seed_accounts_and_assignment(db_factory, make_client)
    admin_cli: TestClient = ctx["admin_cli"]  # type: ignore[assignment]
    doc_a_cli: TestClient = ctx["doc_a_cli"]  # type: ignore[assignment]
    doc_a: User = ctx["doc_a"]  # type: ignore[assignment]
    pat_assigned: User = ctx["pat_assigned"]  # type: ignore[assignment]
    pat_second: User = ctx["pat_unassigned"]  # type: ignore[assignment]
    pat_assigned_cli: TestClient = ctx["pat_assigned_cli"]  # type: ignore[assignment]

    # Admin assigns second patient to Doctor A so pagination & cross-patient link checks run
    assert (
        admin_cli.post(
            "/api/admin/assignments",
            headers=_csrf(admin_cli),
            json={"patient_id": pat_second.id, "doctor_id": doc_a.id},
        ).status_code
        == 201
    )

    # Pagination: 2 assigned patients split across page_size=1 -> 2 pages
    page1 = doc_a_cli.get("/api/doctor/patients?page=1&page_size=1").json()
    page2 = doc_a_cli.get("/api/doctor/patients?page=2&page_size=1").json()
    assert page1["total"] == 2
    assert page1["total_pages"] == 2
    assert len(page1["items"]) == 1 and len(page2["items"]) == 1
    assert page1["items"][0]["patient_id"] != page2["items"][0]["patient_id"]

    # Create referral on pat_assigned; linking that referral to pat_second's follow-up -> 400
    ref_p1 = doc_a_cli.post(
        "/api/doctor/referrals",
        headers=_csrf(doc_a_cli),
        json={
            "patient_id": pat_assigned.id,
            "referred_department": "Internal Medicine",
            "reason": "Routine internal medicine screening consultation.",
        },
    )
    assert ref_p1.status_code == 201
    ref_p1_id = ref_p1.json()["id"]

    cross_link = doc_a_cli.post(
        "/api/doctor/follow-ups",
        headers=_csrf(doc_a_cli),
        json={
            "patient_id": pat_second.id,
            "follow_up_type": "Cross-link test",
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat(),
            "related_referral_id": ref_p1_id,
        },
    )
    assert cross_link.status_code == 400
    assert cross_link.json()["error"]["code"] == "invalid_related_referral"

    # Follow-up MISSED -> reopening to PENDING requires future scheduled_at
    fu = doc_a_cli.post(
        "/api/doctor/follow-ups",
        headers=_csrf(doc_a_cli),
        json={
            "patient_id": pat_second.id,
            "follow_up_type": "Preventive lifestyle follow-up",
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        },
    )
    assert fu.status_code == 201
    fu_id = fu.json()["id"]

    missed = doc_a_cli.patch(
        f"/api/doctor/follow-ups/{fu_id}",
        headers=_csrf(doc_a_cli),
        json={"status": "MISSED"},
    )
    assert missed.status_code == 200
    assert (
        doc_a_cli.patch(
            f"/api/doctor/follow-ups/{fu_id}",
            headers=_csrf(doc_a_cli),
            json={"status": "PENDING"},
        ).status_code
        == 400
    )
    reopened = doc_a_cli.patch(
        f"/api/doctor/follow-ups/{fu_id}",
        headers=_csrf(doc_a_cli),
        json={
            "status": "PENDING",
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=12)).isoformat(),
        },
    )
    assert reopened.status_code == 200
    assert reopened.json()["status"] == "PENDING"

    # Patient uploads report; doctor logs out -> doctor access and report download immediately 401
    rep = pat_assigned_cli.post(
        "/api/patient/reports",
        headers=_csrf(pat_assigned_cli),
        files={"file": ("panel.pdf", build_valid_pdf(), "application/pdf")},
    )
    assert rep.status_code == 201
    rep_id = rep.json()["id"]

    assert doc_a_cli.post("/api/auth/logout", headers=_csrf(doc_a_cli)).status_code == 200
    assert doc_a_cli.get("/api/doctor/overview").status_code == 401
    assert doc_a_cli.get(f"/api/doctor/reports/{rep_id}/download").status_code == 401

