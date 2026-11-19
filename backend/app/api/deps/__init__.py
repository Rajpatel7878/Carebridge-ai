"""FastAPI dependency package."""

from app.api.deps.auth import (
    AdminUser,
    CurrentUser,
    DoctorUser,
    PatientUser,
    enforce_cookie_csrf,
    extract_bearer_token,
    get_current_active_user,
    get_current_user,
    require_admin,
    require_doctor,
    require_patient,
    require_roles,
)

__all__ = [
    "AdminUser",
    "CurrentUser",
    "DoctorUser",
    "PatientUser",
    "enforce_cookie_csrf",
    "extract_bearer_token",
    "get_current_active_user",
    "get_current_user",
    "require_admin",
    "require_doctor",
    "require_patient",
    "require_roles",
]
