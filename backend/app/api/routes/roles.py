"""Role-protected workspace and administrative user-management endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps.auth import AdminUser, DoctorUser, PatientUser
from app.database.session import get_db
from app.core.exceptions import AppException
from app.services.audit import record_audit
from app.models.patient_doctor_assignment import AssignmentStatus
from app.models.user import UserRole
from app.schemas.auth import (
    AdminCreateUserRequest,
    AdminUpdateUserRequest,
    AdminUserListResponse,
    RoleWorkspaceResponse,
    UserPublic,
)
from app.schemas.doctor import (
    AssignmentCreateRequest,
    AssignmentListResponse,
    AssignmentResponse,
    AssignmentUpdateRequest,
)
from app.services.auth_service import (
    create_user_by_admin,
    get_user_by_id,
    list_users_for_admin,
    update_user_by_admin,
)
from app.services.doctor import (
    create_assignment_by_admin,
    list_assignments_for_admin,
    update_assignment_by_admin,
)

router = APIRouter(tags=["Role Access & Administration"])


def _record_failed_admin_action(db: Session, admin, action: str, resource_type: str, resource_id: str, exc: AppException) -> None:
    """Persist a rejected business operation after discarding any partial mutation.

    Only stable error codes are recorded, never request bodies or exception messages.
    Validation/authentication failures before route dispatch are not covered here.
    """
    db.rollback()
    record_audit(db, actor=admin, action=action, resource_type=resource_type,
                 resource_id=resource_id[:36], outcome="FAILURE", metadata={"code": exc.code})
    db.commit()


@router.get(
    "/patient/me",
    response_model=RoleWorkspaceResponse,
    status_code=status.HTTP_200_OK,
    summary="Authorized patient profile and workspace scope",
)
def read_patient_workspace(patient_user: PatientUser) -> RoleWorkspaceResponse:
    """Enforce PATIENT-only backend access and return the patient's own profile."""
    return RoleWorkspaceResponse(
        user=UserPublic.model_validate(patient_user),
        workspace=UserRole.PATIENT,
        permissions=[
            "patient:workspace:read",
            "patient:profile:read",
        ],
    )


@router.get(
    "/doctor/me",
    response_model=RoleWorkspaceResponse,
    status_code=status.HTTP_200_OK,
    summary="Authorized doctor profile and workspace scope",
)
def read_doctor_workspace(doctor_user: DoctorUser) -> RoleWorkspaceResponse:
    """Enforce DOCTOR-only backend access and return the clinician's own profile."""
    return RoleWorkspaceResponse(
        user=UserPublic.model_validate(doctor_user),
        workspace=UserRole.DOCTOR,
        permissions=[
            "doctor:workspace:read",
            "doctor:profile:read",
        ],
    )


@router.get(
    "/admin/users",
    response_model=AdminUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List registered user accounts (ADMIN only)",
)
def admin_list_users(
    _admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    role: UserRole | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    pending_doctor_only: bool = Query(default=False),
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AdminUserListResponse:
    """Return filtered user accounts for administrator oversight (safe fields only)."""
    items, total = list_users_for_admin(
        db,
        role=role,
        is_active=is_active,
        pending_doctor_only=pending_doctor_only,
        search=search,
        limit=limit,
        offset=offset,
    )
    return AdminUserListResponse(
        items=[UserPublic.model_validate(user) for user in items],
        total=total,
    )


@router.post(
    "/admin/users",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Provision a verified user account (ADMIN only)",
)
def admin_create_user(
    payload: AdminCreateUserRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> UserPublic:
    """Provision an approved user account (e.g., DOCTOR) under administrator control."""
    try:
        created = create_user_by_admin(db, admin=admin, payload=payload)
    except AppException as exc:
        _record_failed_admin_action(db, admin, "user.create_failed", "user", "", exc)
        raise
    return UserPublic.model_validate(created)


@router.get(
    "/admin/users/{user_id}",
    response_model=UserPublic,
    status_code=status.HTTP_200_OK,
    summary="Retrieve a user account by ID (ADMIN only)",
)
def admin_get_user(
    user_id: str,
    _admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> UserPublic:
    """Return safe account details for a specific user."""
    user = get_user_by_id(db, user_id)
    return UserPublic.model_validate(user)


@router.patch(
    "/admin/users/{user_id}",
    response_model=UserPublic,
    status_code=status.HTTP_200_OK,
    summary="Update a user's role, verification, or active status (ADMIN only)",
)
def admin_update_user(
    user_id: str,
    payload: AdminUpdateUserRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> UserPublic:
    """Approve doctor requests, change user roles, or activate/deactivate accounts."""
    try:
        updated = update_user_by_admin(db, admin=admin, user_id=user_id, payload=payload)
    except AppException as exc:
        _record_failed_admin_action(db, admin, "user.update_failed", "user", user_id, exc)
        raise
    return UserPublic.model_validate(updated)


@router.get(
    "/admin/assignments",
    response_model=AssignmentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List patient-doctor care assignments (ADMIN only)",
)
def admin_list_assignments(
    _admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    doctor_id: str | None = Query(default=None, max_length=36),
    patient_id: str | None = Query(default=None, max_length=36),
    status_filter: AssignmentStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AssignmentListResponse:
    """Return authorized patient-doctor care assignments for governance."""
    return list_assignments_for_admin(
        db,
        doctor_id=doctor_id,
        patient_id=patient_id,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/admin/assignments",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a patient-doctor care assignment (ADMIN only)",
)
def admin_create_assignment(
    payload: AssignmentCreateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> AssignmentResponse:
    """Assign an active PATIENT to an active DOCTOR under admin authorization."""
    try:
        return create_assignment_by_admin(db, admin=admin, payload=payload)
    except AppException as exc:
        _record_failed_admin_action(db, admin, "assignment.create_failed", "patient", payload.patient_id, exc)
        raise


@router.patch(
    "/admin/assignments/{assignment_id}",
    response_model=AssignmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke or reassign a patient-doctor care assignment (ADMIN only)",
)
def admin_update_assignment(
    assignment_id: str,
    payload: AssignmentUpdateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> AssignmentResponse:
    """Revoke an active assignment or reassign the patient to another DOCTOR."""
    try:
        return update_assignment_by_admin(
            db,
            admin=admin,
            assignment_id=assignment_id,
            payload=payload,
        )
    except AppException as exc:
        _record_failed_admin_action(db, admin, "assignment.update_failed", "assignment", assignment_id, exc)
        raise
