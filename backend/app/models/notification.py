"""In-app user notification ORM model (no external SMS/email/push in Phase 5)."""

from datetime import datetime
from enum import StrEnum
import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    false,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class NotificationType(StrEnum):
    """Supported in-app notification categories."""

    REPORT = "REPORT"
    APPOINTMENT = "APPOINTMENT"
    REFERRAL = "REFERRAL"
    FOLLOW_UP = "FOLLOW_UP"
    PROFILE = "PROFILE"
    SYSTEM = "SYSTEM"


class Notification(Base):
    """Stores an in-app notification strictly scoped to ``user_id``."""

    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "notification_type IN "
            "('REPORT', 'APPOINTMENT', 'REFERRAL', 'FOLLOW_UP', 'PROFILE', 'SYSTEM')",
            name="valid_notification_type",
        ),
        CheckConstraint(
            "length(trim(title)) >= 1",
            name="non_empty_title",
        ),
        CheckConstraint(
            "length(trim(message)) >= 1",
            name="non_empty_message",
        ),
        Index("ix_notifications_user_id", "user_id"),
        Index(
            "ix_notifications_user_read_created",
            "user_id",
            "is_read",
            "created_at",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    notification_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=NotificationType.SYSTEM.value,
        server_default=text("'SYSTEM'"),
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
