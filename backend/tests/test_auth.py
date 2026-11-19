"""Comprehensive Phase 3 backend tests for authentication, cookies, CSRF, and RBAC."""

from collections.abc import Callable, Generator
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.cli import create_admin
from app.core.config import Settings, get_settings
from app.core.rate_limit import auth_rate_limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.database.base import Base
from app.database.session import build_engine, get_db
from app.main import create_app
from app.models.user import User, UserRole
from app.services.auth_service import provision_admin_account

TEST_SECRET = "test-only-random-jwt-signing-secret-with-more-than-48-characters-12345"
STRONG_PASS = "CareBridge!2026A"
ALT_STRONG_PASS = "Clinician#2026Z"


@pytest.fixture
def test_settings() -> Settings:
    """Isolated deterministic settings for Phase 3 authentication tests."""
    return Settings(
        _env_file=None,
        ENVIRONMENT="test",
        SECRET_KEY=TEST_SECRET,
        JWT_ALGORITHM="HS256",
        ACCESS_TOKEN_EXPIRE_MINUTES=15,
        REFRESH_TOKEN_EXPIRE_DAYS=7,
        SESSION_REFRESH_EXPIRE_HOURS=12,
        RATE_LIMIT_ENABLED=True,
        LOGIN_RATE_LIMIT_ATTEMPTS=5,
        LOGIN_RATE_LIMIT_IP_ATTEMPTS=15,
        REGISTER_RATE_LIMIT_IP_ATTEMPTS=10,
        RATE_LIMIT_WINDOW_SECONDS=60,
    )


@pytest.fixture
def db_session_factory(tmp_path: Path) -> Generator[sessionmaker[Session], None, None]:
    """Create a fresh SQLite test database with all ORM tables per test."""
    db_path = tmp_path / "auth_test.db"
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
    db_session_factory: sessionmaker[Session],
    test_settings: Settings,
) -> Generator[Callable[[], TestClient], None, None]:
    """Factory producing isolated cookie-jar TestClients sharing the same test database."""
    auth_rate_limiter.reset()
    app = create_app()

    def _override_db() -> Generator[Session, None, None]:
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_settings] = lambda: test_settings

    created_clients: list[TestClient] = []

    def _build() -> TestClient:
        tc = TestClient(app)
        created_clients.append(tc)
        return tc

    try:
        yield _build
    finally:
        for tc in created_clients:
            tc.close()
        auth_rate_limiter.reset()


@pytest.fixture
def auth_client(make_client: Callable[[], TestClient]) -> TestClient:
    """Primary TestClient wired to the isolated auth test database."""
    return make_client()


def _csrf_headers(client: TestClient) -> dict[str, str]:
    token = client.cookies.get("cb_csrf_token", "")
    return {"X-CSRF-Token": token}


def _seed_user(
    factory: sessionmaker[Session],
    *,
    full_name: str,
    email: str,
    password: str = STRONG_PASS,
    role: UserRole = UserRole.PATIENT,
    is_active: bool = True,
    is_verified: bool = True,
) -> User:
    with factory() as db:
        user = User(
            full_name=full_name,
            email=email.lower(),
            hashed_password=hash_password(password),
            role=role.value,
            is_active=is_active,
            is_verified=is_verified,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


# ---------------------------------------------------------------------------
# Password hashing & production configuration security tests
# ---------------------------------------------------------------------------


def test_password_hashing_uses_argon2id_and_salts() -> None:
    first_hash = hash_password(STRONG_PASS)
    second_hash = hash_password(STRONG_PASS)

    assert first_hash != STRONG_PASS
    assert first_hash.startswith("$argon2id$")
    assert first_hash != second_hash  # Unique cryptographic salt per hash

    valid, _ = verify_password(STRONG_PASS, first_hash)
    invalid, _ = verify_password("WrongPassword!99", first_hash)
    assert valid is True
    assert invalid is False


def test_production_settings_enforce_strong_secret_and_secure_cookies() -> None:
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(_env_file=None, ENVIRONMENT="production", SECRET_KEY="")

    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(_env_file=None, ENVIRONMENT="production", SECRET_KEY="too-short")

    with pytest.raises(ValueError, match="placeholder"):
        Settings(_env_file=None, ENVIRONMENT="development", SECRET_KEY="changeme")

    with pytest.raises(ValueError, match="JWT_ALGORITHM"):
        Settings(
            _env_file=None,
            ENVIRONMENT="development",
            SECRET_KEY=TEST_SECRET,
            JWT_ALGORITHM="none",
        )

    prod = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        SECRET_KEY=TEST_SECRET,
    )
    assert prod.is_production is True
    assert prod.resolved_cookie_secure is True


# ---------------------------------------------------------------------------
# Registration tests
# ---------------------------------------------------------------------------


def test_successful_patient_registration(
    auth_client: TestClient,
    db_session_factory: sessionmaker[Session],
) -> None:
    response = auth_client.post(
        "/api/auth/register",
        json={
            "full_name": "  Aarav   Verma  ",
            "email": "Aarav.Verma@Example.org",
            "password": STRONG_PASS,
            "confirm_password": STRONG_PASS,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["requires_role_approval"] is False
    user = body["user"]
    assert user["full_name"] == "Aarav Verma"
    assert user["email"] == "aarav.verma@example.org"
    assert user["role"] == "PATIENT"
    assert user["is_active"] is True
    assert user["is_verified"] is False
    assert user["requested_role"] is None
    assert "hashed_password" not in user
    assert "password" not in user
    assert "token_version" not in user

    # Verify stored password in DB is strictly Argon2id hashed, never plaintext.
    with db_session_factory() as db:
        db_user = db.scalar(
            select(User).where(User.email == "aarav.verma@example.org")
        )
        assert db_user is not None
        assert db_user.hashed_password != STRONG_PASS
        assert db_user.hashed_password.startswith("$argon2id$")


def test_duplicate_email_registration_is_rejected_case_insensitively(
    auth_client: TestClient,
) -> None:
    payload = {
        "full_name": "Priya Nair",
        "email": "priya.nair@example.org",
        "password": STRONG_PASS,
        "confirm_password": STRONG_PASS,
        "role": "PATIENT",
    }
    first = auth_client.post("/api/auth/register", json=payload)
    assert first.status_code == 201

    duplicate = auth_client.post(
        "/api/auth/register",
        json={**payload, "email": "PRIYA.NAIR@EXAMPLE.ORG"},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "email_unavailable"


@pytest.mark.parametrize(
    "bad_email",
    ["", "   ", "not-an-email", "missing-domain@", "@nodomain.org", "user@bad_domain"],
)
def test_invalid_email_registration_is_rejected(
    auth_client: TestClient,
    bad_email: str,
) -> None:
    response = auth_client.post(
        "/api/auth/register",
        json={
            "full_name": "Rohan Das",
            "email": bad_email,
            "password": STRONG_PASS,
            "confirm_password": STRONG_PASS,
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


@pytest.mark.parametrize(
    "weak_password",
    [
        "Sh0rt!",  # fewer than 8 chars
        "alllowercase1!",  # missing uppercase
        "ALLUPPERCASE1!",  # missing lowercase
        "NoDigitsHere!!",  # missing digit
        "NoSpecialChar99",  # missing special character
    ],
)
def test_weak_password_registration_is_rejected_without_echoing_password(
    auth_client: TestClient,
    weak_password: str,
) -> None:
    response = auth_client.post(
        "/api/auth/register",
        json={
            "full_name": "Kavita Rao",
            "email": "kavita.rao@example.org",
            "password": weak_password,
            "confirm_password": weak_password,
        },
    )
    assert response.status_code == 422
    body_text = response.text
    assert weak_password not in body_text


def test_password_confirmation_mismatch_is_rejected(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/auth/register",
        json={
            "full_name": "Kavita Rao",
            "email": "kavita.mismatch@example.org",
            "password": STRONG_PASS,
            "confirm_password": ALT_STRONG_PASS,
        },
    )
    assert response.status_code == 422
    assert "match" in response.json()["error"]["message"].lower()
    assert STRONG_PASS not in response.text
    assert ALT_STRONG_PASS not in response.text


@pytest.mark.parametrize("admin_role_input", ["ADMIN", "admin", "  Admin  "])
def test_public_admin_registration_is_strictly_forbidden(
    auth_client: TestClient,
    db_session_factory: sessionmaker[Session],
    admin_role_input: str,
) -> None:
    response = auth_client.post(
        "/api/auth/register",
        json={
            "full_name": "Untrusted Caller",
            "email": "escalate@example.org",
            "password": STRONG_PASS,
            "confirm_password": STRONG_PASS,
            "role": admin_role_input,
        },
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "admin_registration_forbidden"

    with db_session_factory() as db:
        assert (
            db.scalar(select(User).where(User.email == "escalate@example.org")) is None
        )


def test_mass_assignment_fields_rejected_on_registration(
    auth_client: TestClient,
) -> None:
    response = auth_client.post(
        "/api/auth/register",
        json={
            "full_name": "Untrusted Caller",
            "email": "mass@example.org",
            "password": STRONG_PASS,
            "confirm_password": STRONG_PASS,
            "is_verified": True,
        },
    )
    assert response.status_code == 422


def test_public_doctor_registration_requires_admin_approval_and_gets_patient_only(
    auth_client: TestClient,
) -> None:
    reg = auth_client.post(
        "/api/auth/register",
        json={
            "full_name": "Dr. Pending Applicant",
            "email": "pending.doc@example.org",
            "password": STRONG_PASS,
            "confirm_password": STRONG_PASS,
            "role": "DOCTOR",
        },
    )
    assert reg.status_code == 201
    data = reg.json()
    assert data["requires_role_approval"] is True
    assert data["user"]["role"] == "PATIENT"
    assert data["user"]["requested_role"] == "DOCTOR"

    login = auth_client.post(
        "/api/auth/login",
        json={"email": "pending.doc@example.org", "password": STRONG_PASS},
    )
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "PATIENT"

    # Must NOT have access to doctor endpoints prior to admin approval.
    doc_resp = auth_client.get("/api/doctor/me")
    assert doc_resp.status_code == 403
    assert doc_resp.json()["error"]["code"] == "insufficient_role"


# ---------------------------------------------------------------------------
# Login, session cookies, refresh rotation, CSRF, logout, and rate-limit tests
# ---------------------------------------------------------------------------


def test_successful_login_sets_httponly_cookies_and_retrieves_profile(
    auth_client: TestClient,
    db_session_factory: sessionmaker[Session],
) -> None:
    _seed_user(
        db_session_factory,
        full_name="Meera Joshi",
        email="meera.joshi@example.org",
        role=UserRole.PATIENT,
    )

    login = auth_client.post(
        "/api/auth/login",
        json={
            "email": "MEERA.JOSHI@EXAMPLE.ORG",
            "password": STRONG_PASS,
            "remember_session": True,
        },
    )
    assert login.status_code == 200
    body = login.json()
    assert body["session_type"] == "persistent"
    assert body["access_token_expires_in"] == 900
    assert body["user"]["email"] == "meera.joshi@example.org"
    assert body["user"]["role"] == "PATIENT"
    assert "hashed_password" not in str(body)

    set_cookie_headers = login.headers.get_list("set-cookie")
    access_header = next(h for h in set_cookie_headers if h.startswith("cb_access_token="))
    refresh_header = next(
        h for h in set_cookie_headers if h.startswith("cb_refresh_token=")
    )
    csrf_header = next(h for h in set_cookie_headers if h.startswith("cb_csrf_token="))

    assert "httponly" in access_header.lower()
    assert "samesite=lax" in access_header.lower()
    assert "httponly" in refresh_header.lower()
    assert "path=/api/auth" in refresh_header.lower()
    assert "max-age=" in refresh_header.lower()  # persistent remember_session=True
    assert "httponly" not in csrf_header.lower()  # readable for X-CSRF-Token echo

    # Authenticated profile retrieval via cookie
    me = auth_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "meera.joshi@example.org"
    assert me.json()["full_name"] == "Meera Joshi"
    assert me.json()["role"] == "PATIENT"
    assert "hashed_password" not in me.json()


def test_invalid_password_and_unknown_email_return_identical_safe_error(
    auth_client: TestClient,
    db_session_factory: sessionmaker[Session],
) -> None:
    _seed_user(
        db_session_factory,
        full_name="Vikram Sethi",
        email="vikram.sethi@example.org",
    )

    wrong_pw = auth_client.post(
        "/api/auth/login",
        json={"email": "vikram.sethi@example.org", "password": "WrongPassword!9"},
    )
    unknown_email = auth_client.post(
        "/api/auth/login",
        json={"email": "nobody.here@example.org", "password": "WrongPassword!9"},
    )

    assert wrong_pw.status_code == 401
    assert unknown_email.status_code == 401
    assert wrong_pw.json() == unknown_email.json()
    assert wrong_pw.json()["error"]["message"] == "Invalid email or password."


def test_inactive_account_login_and_access_are_rejected(
    auth_client: TestClient,
    db_session_factory: sessionmaker[Session],
    test_settings: Settings,
) -> None:
    inactive_user = _seed_user(
        db_session_factory,
        full_name="Suspended Account",
        email="inactive@example.org",
        is_active=False,
    )

    # Wrong password on inactive user still returns generic 401 (no status leak).
    wrong_pw = auth_client.post(
        "/api/auth/login",
        json={"email": "inactive@example.org", "password": "WrongPassword!9"},
    )
    assert wrong_pw.status_code == 401

    # Correct password on inactive user is rejected with 403 account_inactive.
    login = auth_client.post(
        "/api/auth/login",
        json={"email": "inactive@example.org", "password": STRONG_PASS},
    )
    assert login.status_code == 403
    assert login.json()["error"]["code"] == "account_inactive"

    # Even a signed access token for an inactive user is rejected.
    token, _ = create_access_token(
        user_id=inactive_user.id,
        role=inactive_user.role,
        token_version=inactive_user.token_version,
        settings=test_settings,
    )
    me = auth_client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me.status_code == 403
    assert me.json()["error"]["code"] == "account_inactive"


def test_unauthenticated_requests_are_rejected(auth_client: TestClient) -> None:
    assert auth_client.get("/api/auth/me").status_code == 401
    assert auth_client.get("/api/patient/me").status_code == 401
    assert auth_client.get("/api/doctor/me").status_code == 401
    assert auth_client.get("/api/admin/users").status_code == 401
    assert auth_client.post("/api/auth/refresh").status_code == 401


def test_login_rate_limiting_blocks_brute_force(auth_client: TestClient) -> None:
    for _ in range(5):
        resp = auth_client.post(
            "/api/auth/login",
            json={"email": "target@example.org", "password": "BadPassword!1"},
        )
        assert resp.status_code == 401

    throttled = auth_client.post(
        "/api/auth/login",
        json={"email": "target@example.org", "password": "BadPassword!1"},
    )
    assert throttled.status_code == 429
    assert throttled.json()["error"]["code"] == "rate_limit_exceeded"
    assert int(throttled.headers["Retry-After"]) >= 1


def test_refresh_token_rotation_csrf_and_replay_detection(
    auth_client: TestClient,
    db_session_factory: sessionmaker[Session],
) -> None:
    _seed_user(
        db_session_factory,
        full_name="Devika Sharma",
        email="devika@example.org",
    )

    login = auth_client.post(
        "/api/auth/login",
        json={"email": "devika@example.org", "password": STRONG_PASS},
    )
    assert login.status_code == 200
    original_refresh = auth_client.cookies.get("cb_refresh_token")
    original_csrf = auth_client.cookies.get("cb_csrf_token")
    assert original_refresh and original_csrf

    # Refresh WITHOUT X-CSRF-Token must fail with 403.
    missing_csrf = auth_client.post("/api/auth/refresh")
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "csrf_validation_failed"

    # Valid refresh rotates refresh token and issues new access + CSRF cookies.
    refreshed = auth_client.post(
        "/api/auth/refresh",
        headers={"X-CSRF-Token": original_csrf},
    )
    assert refreshed.status_code == 200
    rotated_refresh = auth_client.cookies.get("cb_refresh_token")
    rotated_csrf = auth_client.cookies.get("cb_csrf_token")
    assert rotated_refresh and rotated_refresh != original_refresh
    assert rotated_csrf and rotated_csrf != original_csrf
    assert auth_client.get("/api/auth/me").status_code == 200

    # Replaying the already-rotated refresh token must fail AND revoke the family!
    auth_client.cookies.set("cb_refresh_token", original_refresh, path="/api/auth")
    replay = auth_client.post(
        "/api/auth/refresh",
        headers={"X-CSRF-Token": rotated_csrf},
    )
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "refresh_token_revoked"
    assert replay.headers.get("cache-control") == "no-store"
    assert replay.headers.get("x-content-type-options") == "nosniff"
    # Failed refresh also clears stale session cookies from the response
    assert auth_client.cookies.get("cb_access_token") is None
    assert auth_client.cookies.get("cb_csrf_token") is None

    # The legitimately rotated token in that same family (e.g. held on another tab)
    # is now also revoked by family replay protection.
    auth_client.cookies.set("cb_refresh_token", rotated_refresh, path="/api/auth")
    auth_client.cookies.set("cb_csrf_token", rotated_csrf, path="/")
    post_compromise = auth_client.post(
        "/api/auth/refresh",
        headers={"X-CSRF-Token": rotated_csrf},
    )
    assert post_compromise.status_code == 401
    assert post_compromise.json()["error"]["code"] == "refresh_token_revoked"
    assert auth_client.get("/api/auth/me").status_code == 401


def test_logout_revokes_refresh_token_and_invalidates_access_token(
    auth_client: TestClient,
    db_session_factory: sessionmaker[Session],
) -> None:
    _seed_user(
        db_session_factory,
        full_name="Karan Malhotra",
        email="karan@example.org",
    )

    auth_client.post(
        "/api/auth/login",
        json={"email": "karan@example.org", "password": STRONG_PASS},
    )
    saved_access = auth_client.cookies.get("cb_access_token")
    saved_refresh = auth_client.cookies.get("cb_refresh_token")
    saved_csrf = auth_client.cookies.get("cb_csrf_token")
    assert saved_access and saved_refresh and saved_csrf

    # Logout without CSRF fails when using cookies.
    assert auth_client.post("/api/auth/logout").status_code == 403

    # Logout with valid CSRF revokes session and clears cookies.
    logout = auth_client.post(
        "/api/auth/logout",
        headers={"X-CSRF-Token": saved_csrf},
    )
    assert logout.status_code == 200
    assert auth_client.get("/api/auth/me").status_code == 401

    # Even if an attacker captured the pre-logout access or refresh token, both fail.
    bearer_check = auth_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {saved_access}"},
    )
    assert bearer_check.status_code == 401

    auth_client.cookies.set("cb_refresh_token", saved_refresh, path="/api/auth")
    auth_client.cookies.set("cb_csrf_token", saved_csrf, path="/")
    refresh_check = auth_client.post(
        "/api/auth/refresh",
        headers={"X-CSRF-Token": saved_csrf},
    )
    assert refresh_check.status_code == 401


# ---------------------------------------------------------------------------
# Role-based access control (PATIENT, DOCTOR, ADMIN) & admin provisioning tests
# ---------------------------------------------------------------------------


def test_patient_doctor_and_admin_role_restrictions(
    make_client: Callable[[], TestClient],
    db_session_factory: sessionmaker[Session],
) -> None:
    patient = _seed_user(
        db_session_factory,
        full_name="Patient One",
        email="patient1@example.org",
        role=UserRole.PATIENT,
    )
    _seed_user(
        db_session_factory,
        full_name="Dr. Clinician",
        email="doctor1@example.org",
        role=UserRole.DOCTOR,
    )
    admin = _seed_user(
        db_session_factory,
        full_name="Admin Lead",
        email="admin1@example.org",
        role=UserRole.ADMIN,
    )

    patient_client = make_client()
    doctor_client = make_client()
    admin_client = make_client()

    assert (
        patient_client.post(
            "/api/auth/login",
            json={"email": "patient1@example.org", "password": STRONG_PASS},
        ).status_code
        == 200
    )
    assert (
        doctor_client.post(
            "/api/auth/login",
            json={"email": "doctor1@example.org", "password": STRONG_PASS},
        ).status_code
        == 200
    )
    assert (
        admin_client.post(
            "/api/auth/login",
            json={"email": "admin1@example.org", "password": STRONG_PASS},
        ).status_code
        == 200
    )

    # PATIENT permissions
    assert patient_client.get("/api/patient/me").status_code == 200
    assert patient_client.get("/api/doctor/me").status_code == 403
    assert patient_client.get("/api/admin/users").status_code == 403
    assert (
        patient_client.patch(
            f"/api/admin/users/{patient.id}",
            json={"role": "ADMIN"},
            headers=_csrf_headers(patient_client),
        ).status_code
        == 403
    )

    # DOCTOR permissions
    assert doctor_client.get("/api/doctor/me").status_code == 200
    assert doctor_client.get("/api/patient/me").status_code == 403
    assert doctor_client.get("/api/admin/users").status_code == 403
    assert (
        doctor_client.post(
            "/api/admin/users",
            json={
                "full_name": "Unauthorized Doctor",
                "email": "unauth.doc@example.org",
                "password": ALT_STRONG_PASS,
                "role": "DOCTOR",
            },
            headers=_csrf_headers(doctor_client),
        ).status_code
        == 403
    )

    # ADMIN permissions + CSRF enforcement + self-lockout protection
    users_resp = admin_client.get("/api/admin/users")
    assert users_resp.status_code == 200
    assert users_resp.json()["total"] == 3
    assert admin_client.get("/api/patient/me").status_code == 403
    assert admin_client.get("/api/doctor/me").status_code == 403

    # Admin write without CSRF is blocked
    assert (
        admin_client.patch(
            f"/api/admin/users/{patient.id}",
            json={"is_verified": True},
        ).status_code
        == 403
    )

    # Admin cannot deactivate or demote self
    assert (
        admin_client.patch(
            f"/api/admin/users/{admin.id}",
            json={"is_active": False},
            headers=_csrf_headers(admin_client),
        ).status_code
        == 400
    )
    assert (
        admin_client.patch(
            f"/api/admin/users/{admin.id}",
            json={"role": "PATIENT"},
            headers=_csrf_headers(admin_client),
        ).status_code
        == 400
    )

    # Admin can approve/promote a user to DOCTOR and provision a new DOCTOR
    promote = admin_client.patch(
        f"/api/admin/users/{patient.id}",
        json={"role": "DOCTOR"},
        headers=_csrf_headers(admin_client),
    )
    assert promote.status_code == 200
    assert promote.json()["role"] == "DOCTOR"
    assert promote.json()["is_verified"] is True

    # Old patient session is immediately invalidated upon role change
    assert patient_client.get("/api/auth/me").status_code == 401

    # Re-authenticating grants DOCTOR access
    assert (
        patient_client.post(
            "/api/auth/login",
            json={"email": "patient1@example.org", "password": STRONG_PASS},
        ).status_code
        == 200
    )
    assert patient_client.get("/api/doctor/me").status_code == 200

    # Admin provisions a verified clinician directly
    created_doc = admin_client.post(
        "/api/admin/users",
        json={
            "full_name": "Dr. Provisioned Specialist",
            "email": "specialist@example.org",
            "password": ALT_STRONG_PASS,
            "role": "DOCTOR",
        },
        headers=_csrf_headers(admin_client),
    )
    assert created_doc.status_code == 201
    assert created_doc.json()["role"] == "DOCTOR"
    assert "hashed_password" not in created_doc.json()


def test_admin_cli_provisioning_hashes_password_prevents_duplicates_and_hides_secret(
    db_session_factory: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    test_engine = db_session_factory.kw["bind"]
    monkeypatch.setenv("ADMIN_FULL_NAME", "Neha Kapoor")
    monkeypatch.setenv("ADMIN_EMAIL", "neha.admin@example.org")
    monkeypatch.setenv("ADMIN_PASSWORD", STRONG_PASS)

    with (
        patch.object(create_admin, "engine", test_engine),
        patch.object(create_admin, "SessionLocal", db_session_factory),
    ):
        exit_code = create_admin.main([])
        captured = capsys.readouterr()
        assert exit_code == 0
        assert "neha.admin@example.org" in captured.out
        assert STRONG_PASS not in captured.out
        assert STRONG_PASS not in captured.err

        # Accidental duplicate invocation is safely rejected (same email OR existing admin)
        monkeypatch.setenv("ADMIN_EMAIL", "second.admin@example.org")
        duplicate_code = create_admin.main([])
        dup_out = capsys.readouterr()
        assert duplicate_code == 1
        assert "already exists" in dup_out.err.lower()
        assert STRONG_PASS not in dup_out.err

        # Explicit --allow-additional permits creating a second distinct administrator
        explicit_code = create_admin.main(["--allow-additional"])
        assert explicit_code == 0

    with db_session_factory() as db:
        first_admin = db.scalar(
            select(User).where(User.email == "neha.admin@example.org")
        )
        assert first_admin is not None
        assert first_admin.role == UserRole.ADMIN.value
        assert first_admin.is_active is True
        assert first_admin.is_verified is True
        assert first_admin.hashed_password.startswith("$argon2id$")

        with pytest.raises(Exception):
            provision_admin_account(
                db,
                full_name="Duplicate Email",
                email="neha.admin@example.org",
                password=STRONG_PASS,
                allow_additional=True,
            )
