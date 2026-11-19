"""Authentication, session-rotation, RBAC user management, and admin provisioning logic."""

from dataclasses import dataclass
from datetime import UTC, datetime
import logging
import uuid

from jwt import InvalidTokenError
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_csrf_token,
    hash_password,
    hash_token,
    validate_password_strength,
    verify_dummy_password,
    verify_password,
)
from app.models.doctor_profile import DoctorProfile, DoctorVerificationStatus
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole
from app.schemas.auth import (
    AdminCreateUserRequest,
    AdminUpdateUserRequest,
    RegisterRequest,
    normalize_email_address,
    normalize_full_name,
)

logger = logging.getLogger("carebridge.auth")

INVALID_CREDENTIALS_MESSAGE = "Invalid email or password."
INACTIVE_ACCOUNT_MESSAGE = "This account is inactive. Please contact an administrator."
DUPLICATE_EMAIL_MESSAGE = (
    "An account with this email address cannot be created. "
    "If you already have an account, please sign in."
)


@dataclass(frozen=True)
class IssuedSession:
    """Bundle of freshly issued session credentials for a single authenticated user."""

    user: User
    access_token: str
    access_expires_in: int
    refresh_token: str
    refresh_cookie_max_age: int | None
    csrf_token: str
    is_persistent: bool


def _as_utc(value: datetime) -> datetime:
    """Ensure datetimes read from SQLite or PostgreSQL are UTC-aware."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def register_public_user(db: Session, payload: RegisterRequest) -> tuple[User, bool]:
    """Register a public user safely.

    - Explicitly forbids self-registration as ADMIN.
    - Assigns PATIENT role to all public sign-ups.
    - When DOCTOR is requested, records ``requested_role='DOCTOR'`` for administrator
      review without granting doctor privileges.
    """
    if payload.role == UserRole.ADMIN.value:
        raise ForbiddenException(
            "Administrator accounts cannot be created through public registration.",
            code="admin_registration_forbidden",
        )

    existing = db.scalar(select(User.id).where(User.email == payload.email))
    if existing is not None:
        raise ConflictException(DUPLICATE_EMAIL_MESSAGE, code="email_unavailable")

    wants_doctor = payload.role == UserRole.DOCTOR.value
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.PATIENT.value,
        is_active=True,
        is_verified=False,
        requested_role=UserRole.DOCTOR.value if wants_doctor else None,
        token_version=0,
    )

    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictException(
            DUPLICATE_EMAIL_MESSAGE, code="email_unavailable"
        ) from exc

    db.refresh(user)
    logger.info(
        "Registered new user id=%s role=%s pending_role=%s",
        user.id,
        user.role,
        user.requested_role,
    )
    return user, wants_doctor


def authenticate_user(db: Session, *, email: str, password: str) -> User:
    """Authenticate a user by email and password without leaking email existence."""
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        verify_dummy_password(password)
        raise UnauthorizedException(
            INVALID_CREDENTIALS_MESSAGE, code="invalid_credentials"
        )

    is_valid, needs_rehash = verify_password(password, user.hashed_password)
    if not is_valid:
        raise UnauthorizedException(
            INVALID_CREDENTIALS_MESSAGE, code="invalid_credentials"
        )

    if not user.is_active:
        raise ForbiddenException(INACTIVE_ACCOUNT_MESSAGE, code="account_inactive")

    if needs_rehash:
        user.hashed_password = hash_password(password)
        db.commit()
        db.refresh(user)

    return user


def issue_session_tokens(
    db: Session,
    user: User,
    *,
    is_persistent: bool,
    settings: Settings,
) -> IssuedSession:
    """Mint a short-lived access JWT and a server-tracked rotating refresh token."""
    token_id = str(uuid.uuid4())
    family_id = str(uuid.uuid4())

    access_token, access_expires_in = create_access_token(
        user_id=user.id,
        role=user.role,
        token_version=user.token_version,
        settings=settings,
    )
    refresh_token, expires_at, refresh_max_age = create_refresh_token(
        user_id=user.id,
        token_id=token_id,
        family_id=family_id,
        is_persistent=is_persistent,
        settings=settings,
    )
    csrf_token = generate_csrf_token()

    db_token = RefreshToken(
        id=token_id,
        user_id=user.id,
        family_id=family_id,
        token_hash=hash_token(refresh_token),
        is_persistent=is_persistent,
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()

    return IssuedSession(
        user=user,
        access_token=access_token,
        access_expires_in=access_expires_in,
        refresh_token=refresh_token,
        refresh_cookie_max_age=refresh_max_age,
        csrf_token=csrf_token,
        is_persistent=is_persistent,
    )


def _revoke_token_family(db: Session, family_id: str, now: datetime) -> None:
    """Revoke every unrevoked refresh token in the specified token family."""
    db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.family_id == family_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )


def revoke_all_user_sessions(db: Session, user: User) -> None:
    """Revoke all active refresh tokens and increment token_version for a user."""
    now = datetime.now(UTC)
    db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    user.token_version += 1


def rotate_refresh_session(
    db: Session,
    raw_refresh_token: str,
    *,
    settings: Settings,
) -> IssuedSession:
    """Validate and atomically rotate a refresh token, enforcing reuse detection."""
    try:
        payload = decode_token(
            raw_refresh_token,
            expected_type="refresh",
            settings=settings,
        )
    except InvalidTokenError as exc:
        raise UnauthorizedException(
            "Session expired or invalid. Please sign in again.",
            code="invalid_refresh_token",
        ) from exc

    token_digest = hash_token(raw_refresh_token)
    stored = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_digest)
    )
    now = datetime.now(UTC)

    if stored is None or stored.id != payload.get("jti"):
        raise UnauthorizedException(
            "Session expired or invalid. Please sign in again.",
            code="invalid_refresh_token",
        )

    # Reuse of an already-rotated/revoked refresh token indicates potential token theft:
    # revoke the entire token family immediately and invalidate active access tokens.
    if stored.revoked_at is not None:
        logger.warning(
            "Detected refresh-token reuse for user_id=%s family_id=%s; revoking family.",
            stored.user_id,
            stored.family_id,
        )
        _revoke_token_family(db, stored.family_id, now)
        compromised_user = db.get(User, stored.user_id)
        if compromised_user is not None:
            compromised_user.token_version += 1
        db.commit()
        raise UnauthorizedException(
            "Session was revoked. Please sign in again.",
            code="refresh_token_revoked",
        )

    if _as_utc(stored.expires_at) <= now:
        stored.revoked_at = now
        db.commit()
        raise UnauthorizedException(
            "Session expired. Please sign in again.",
            code="refresh_token_expired",
        )

    user = db.get(User, stored.user_id)
    if user is None:
        _revoke_token_family(db, stored.family_id, now)
        db.commit()
        raise UnauthorizedException(
            "Session is no longer valid. Please sign in again.",
            code="invalid_refresh_token",
        )

    if not user.is_active:
        _revoke_token_family(db, stored.family_id, now)
        db.commit()
        raise ForbiddenException(INACTIVE_ACCOUNT_MESSAGE, code="account_inactive")

    new_token_id = str(uuid.uuid4())
    new_refresh_token, new_expires_at, refresh_max_age = create_refresh_token(
        user_id=user.id,
        token_id=new_token_id,
        family_id=stored.family_id,
        is_persistent=stored.is_persistent,
        settings=settings,
    )
    new_access_token, access_expires_in = create_access_token(
        user_id=user.id,
        role=user.role,
        token_version=user.token_version,
        settings=settings,
    )
    new_csrf_token = generate_csrf_token()

    stored.revoked_at = now
    stored.replaced_by_id = new_token_id
    db.add(
        RefreshToken(
            id=new_token_id,
            user_id=user.id,
            family_id=stored.family_id,
            token_hash=hash_token(new_refresh_token),
            is_persistent=stored.is_persistent,
            expires_at=new_expires_at,
        )
    )
    db.commit()

    return IssuedSession(
        user=user,
        access_token=new_access_token,
        access_expires_in=access_expires_in,
        refresh_token=new_refresh_token,
        refresh_cookie_max_age=refresh_max_age,
        csrf_token=new_csrf_token,
        is_persistent=stored.is_persistent,
    )


def revoke_session_on_logout(
    db: Session,
    *,
    raw_access_token: str | None,
    raw_refresh_token: str | None,
    settings: Settings,
) -> bool:
    """Revoke refresh-token lineage and bump token_version to invalidate access checks.

    Returns ``True`` if an active server-side session was invalidated.
    """
    now = datetime.now(UTC)
    revoked_any = False
    target_user_id: str | None = None

    if raw_refresh_token:
        stored = db.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_token(raw_refresh_token)
            )
        )
        if stored is not None:
            _revoke_token_family(db, stored.family_id, now)
            target_user_id = stored.user_id
            revoked_any = True
        else:
            try:
                refresh_claims = decode_token(
                    raw_refresh_token,
                    expected_type="refresh",
                    settings=settings,
                )
                target_user_id = str(refresh_claims["sub"])
            except InvalidTokenError:
                pass

    if raw_access_token and target_user_id is None:
        try:
            access_claims = decode_token(
                raw_access_token,
                expected_type="access",
                settings=settings,
            )
            target_user_id = str(access_claims["sub"])
        except InvalidTokenError:
            pass

    if target_user_id is not None:
        user = db.get(User, target_user_id)
        if user is not None:
            user.token_version += 1
            revoked_any = True

    if revoked_any:
        db.commit()

    return revoked_any


def list_users_for_admin(
    db: Session,
    *,
    role: UserRole | None = None,
    is_active: bool | None = None,
    pending_doctor_only: bool = False,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[User], int]:
    """Query registered users with safe administrative filters."""
    conditions = []
    if role is not None:
        conditions.append(User.role == role.value)
    if is_active is not None:
        conditions.append(User.is_active.is_(is_active))
    if pending_doctor_only:
        conditions.append(User.requested_role == UserRole.DOCTOR.value)
    if search and search.strip():
        pattern = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(User.full_name).like(pattern),
                func.lower(User.email).like(pattern),
            )
        )

    count_stmt = select(func.count()).select_from(User)
    items_stmt = select(User).order_by(User.created_at.desc(), User.email.asc())
    if conditions:
        count_stmt = count_stmt.where(*conditions)
        items_stmt = items_stmt.where(*conditions)

    total = int(db.scalar(count_stmt) or 0)
    items = list(db.scalars(items_stmt.offset(offset).limit(limit)).all())
    return items, total


def get_user_by_id(db: Session, user_id: str) -> User:
    """Return a user by ID or raise ``NotFoundException``."""
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundException("User account not found.")
    return user


def create_user_by_admin(
    db: Session,
    *,
    admin: User,
    payload: AdminCreateUserRequest,
) -> User:
    """Create a verified user account (e.g., DOCTOR) via administrator provisioning."""
    existing = db.scalar(select(User.id).where(User.email == payload.email))
    if existing is not None:
        raise ConflictException(
            "A user account with this email address already exists.",
            code="email_already_exists",
        )

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role.value,
        is_active=payload.is_active,
        is_verified=payload.is_verified,
        requested_role=None,
        token_version=0,
    )
    db.add(user)
    try:
        db.flush()
        if user.role == UserRole.DOCTOR.value:
            db.add(
                DoctorProfile(
                    user_id=user.id,
                    verification_status=(
                        DoctorVerificationStatus.VERIFIED.value
                        if user.is_verified
                        else DoctorVerificationStatus.PENDING.value
                    ),
                )
            )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictException(
            "A user account with this email address already exists.",
            code="email_already_exists",
        ) from exc

    db.refresh(user)
    logger.info(
        "Admin id=%s provisioned user id=%s with role=%s",
        admin.id,
        user.id,
        user.role,
    )
    return user


def update_user_by_admin(
    db: Session,
    *,
    admin: User,
    user_id: str,
    payload: AdminUpdateUserRequest,
) -> User:
    """Update a user's role, verification flag, or active status safely."""
    target = get_user_by_id(db, user_id)

    if target.id == admin.id:
        if payload.is_active is False:
            raise BadRequestException(
                "You cannot deactivate your own administrator account.",
                code="self_deactivation_forbidden",
            )
        if payload.role is not None and payload.role != UserRole.ADMIN:
            raise BadRequestException(
                "You cannot remove the ADMIN role from your own account.",
                code="self_demotion_forbidden",
            )

    invalidate_sessions = False

    if payload.role is not None and payload.role.value != target.role:
        target.role = payload.role.value
        invalidate_sessions = True
        if payload.role in {UserRole.DOCTOR, UserRole.ADMIN}:
            target.requested_role = None
            if payload.is_verified is None:
                target.is_verified = True

    if payload.is_active is not None and payload.is_active != target.is_active:
        target.is_active = payload.is_active
        if not payload.is_active:
            invalidate_sessions = True

    if payload.is_verified is not None:
        target.is_verified = payload.is_verified

    if payload.clear_requested_role:
        target.requested_role = None

    if target.role == UserRole.DOCTOR.value:
        doctor_profile = db.scalar(
            select(DoctorProfile).where(DoctorProfile.user_id == target.id)
        )
        new_verification = (
            DoctorVerificationStatus.VERIFIED.value
            if target.is_verified
            else DoctorVerificationStatus.PENDING.value
        )
        if doctor_profile is None:
            db.add(
                DoctorProfile(
                    user_id=target.id,
                    verification_status=new_verification,
                )
            )
        else:
            doctor_profile.verification_status = new_verification
            doctor_profile.updated_at = datetime.now(UTC)

    if invalidate_sessions:
        revoke_all_user_sessions(db, target)

    db.commit()
    db.refresh(target)
    logger.info(
        "Admin id=%s updated user id=%s role=%s is_active=%s is_verified=%s",
        admin.id,
        target.id,
        target.role,
        target.is_active,
        target.is_verified,
    )
    return target


def provision_admin_account(
    db: Session,
    *,
    full_name: str,
    email: str,
    password: str,
    allow_additional: bool = False,
) -> User:
    """Securely provision an initial administrator account for CLI bootstrap.

    Validates all inputs, hashes the password with Argon2id, and prevents accidental
    duplicate administrator creation.
    """
    clean_name = normalize_full_name(full_name)
    clean_email = normalize_email_address(email)
    validate_password_strength(password)

    existing_by_email = db.scalar(select(User).where(User.email == clean_email))
    if existing_by_email is not None:
        raise ConflictException(
            "An account with this email address already exists.",
            code="admin_email_exists",
        )

    if not allow_additional:
        existing_admin_id = db.scalar(
            select(User.id).where(User.role == UserRole.ADMIN.value).limit(1)
        )
        if existing_admin_id is not None:
            raise ConflictException(
                "An administrator account already exists. Pass --allow-additional "
                "only when intentionally provisioning another administrator.",
                code="admin_already_exists",
            )

    admin_user = User(
        full_name=clean_name,
        email=clean_email,
        hashed_password=hash_password(password),
        role=UserRole.ADMIN.value,
        is_active=True,
        is_verified=True,
        requested_role=None,
        token_version=0,
    )
    db.add(admin_user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictException(
            "An account with this email address already exists.",
            code="admin_email_exists",
        ) from exc

    db.refresh(admin_user)
    logger.info("Provisioned administrator account id=%s", admin_user.id)
    return admin_user
