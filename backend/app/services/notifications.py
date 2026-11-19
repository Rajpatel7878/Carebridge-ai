"""Shared in-app notification service for patient and doctor portals.

Security & privacy invariants:
- Notifications are strictly scoped to a single recipient ``user_id``.
- Notification messages contain only concise workflow status alerts and never
  embed confidential clinical review notes, license numbers, or storage paths.
- Deduplicates identical unread alerts to avoid noisy duplicate notifications.
- External SMS, email, and push delivery are intentionally out of scope.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.notification import Notification, NotificationType
from app.models.patient_doctor_assignment import (
    AssignmentStatus,
    PatientDoctorAssignment,
)
from app.models.user import User, UserRole
from app.schemas.patient import (
    NotificationListResponse,
    NotificationMarkAllReadResponse,
    NotificationMarkReadResponse,
    NotificationResponse,
)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None or dt.utcoffset() is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def create_in_app_notification(
    db: Session,
    *,
    user_id: str,
    title: str,
    message: str,
    notification_type: NotificationType,
    dedupe_unread: bool = True,
) -> Notification:
    """Queue an in-app notification within the caller's transaction.

    When ``dedupe_unread`` is True and an identical unread notification already
    exists for the recipient, returns the existing record instead of creating
    a duplicate.
    """
    safe_title = title.strip()[:160]
    safe_message = message.strip()[:500]

    if dedupe_unread:
        existing = db.scalar(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.notification_type == notification_type.value,
                Notification.title == safe_title,
                Notification.message == safe_message,
                Notification.is_read.is_(False),
            )
        )
        if existing is not None:
            return existing

    record = Notification(
        user_id=user_id,
        title=safe_title,
        message=safe_message,
        notification_type=notification_type.value,
        is_read=False,
    )
    db.add(record)
    return record


def notify_assigned_doctors_for_patient(
    db: Session,
    *,
    patient_id: str,
    title: str,
    message: str,
    notification_type: NotificationType,
    specific_doctor_id: str | None = None,
) -> list[Notification]:
    """Notify active doctor(s) currently assigned to ``patient_id``.

    If ``specific_doctor_id`` is supplied and still actively assigned to the
    patient, notifies only that doctor; otherwise notifies all active assigned
    doctors for the patient.
    """
    stmt = (
        select(PatientDoctorAssignment.doctor_id)
        .join(User, User.id == PatientDoctorAssignment.doctor_id)
        .where(
            PatientDoctorAssignment.patient_id == patient_id,
            PatientDoctorAssignment.status == AssignmentStatus.ACTIVE.value,
            User.is_active.is_(True),
            User.role == UserRole.DOCTOR.value,
        )
    )
    doctor_ids = list(dict.fromkeys(db.scalars(stmt).all()))
    if specific_doctor_id and specific_doctor_id in doctor_ids:
        doctor_ids = [specific_doctor_id]

    created: list[Notification] = []
    for doctor_id in doctor_ids:
        created.append(
            create_in_app_notification(
                db,
                user_id=doctor_id,
                title=title,
                message=message,
                notification_type=notification_type,
                dedupe_unread=True,
            )
        )
    return created


def count_unread_notifications(db: Session, *, user_id: str) -> int:
    """Count unread notifications owned by ``user_id``."""
    count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    return int(count or 0)


def to_notification_response(record: Notification) -> NotificationResponse:
    """Serialize a notification ORM record to a client-safe response."""
    return NotificationResponse(
        id=record.id,
        title=record.title,
        message=record.message,
        notification_type=NotificationType(record.notification_type),
        is_read=record.is_read,
        created_at=_as_utc(record.created_at),
    )


def list_user_notifications(
    db: Session,
    *,
    user_id: str,
    unread_only: bool = False,
    limit: int | None = None,
    offset: int = 0,
) -> NotificationListResponse:
    """List notifications scoped strictly to ``user_id``."""
    base_conditions = [Notification.user_id == user_id]
    if unread_only:
        base_conditions.append(Notification.is_read.is_(False))

    total = int(
        db.scalar(select(func.count(Notification.id)).where(*base_conditions)) or 0
    )
    stmt = (
        select(Notification)
        .where(*base_conditions)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
    )
    if offset > 0:
        stmt = stmt.offset(offset)
    if limit is not None:
        stmt = stmt.limit(limit)

    records = list(db.scalars(stmt).all())
    unread_count = count_unread_notifications(db, user_id=user_id)
    return NotificationListResponse(
        items=[to_notification_response(item) for item in records],
        total=total,
        unread_count=unread_count,
    )


def mark_user_notification_read(
    db: Session,
    *,
    user_id: str,
    notification_id: str,
) -> NotificationMarkReadResponse:
    """Mark a single owned notification as read (404 if unowned/missing)."""
    record = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    if record is None:
        raise NotFoundException(
            "Notification not found.",
            code="notification_not_found",
        )
    if not record.is_read:
        record.is_read = True
        db.commit()
        db.refresh(record)
    unread_count = count_unread_notifications(db, user_id=user_id)
    return NotificationMarkReadResponse(
        notification=to_notification_response(record),
        unread_count=unread_count,
    )


def mark_all_user_notifications_read(
    db: Session,
    *,
    user_id: str,
) -> NotificationMarkAllReadResponse:
    """Mark all unread notifications belonging to ``user_id`` as read."""
    result = db.execute(
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    db.commit()
    marked_count = int(result.rowcount or 0)
    return NotificationMarkAllReadResponse(
        marked_count=marked_count,
        unread_count=0,
    )
