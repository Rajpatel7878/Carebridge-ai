"""Patient profile ORM model (strictly one-to-one with a PATIENT user)."""

from datetime import date
from enum import StrEnum
import uuid

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.user import User


class GenderOption(StrEnum):
    """Supported optional patient gender descriptors."""

    FEMALE = "FEMALE"
    MALE = "MALE"
    NON_BINARY = "NON_BINARY"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class PreferredLanguage(StrEnum):
    """Supported patient interface and communication language codes."""

    ENGLISH = "en"
    HINDI = "hi"


class PatientProfile(Base, TimestampMixin):
    """Stores minimal, patient-controlled demographic and coordination details."""

    __tablename__ = "patient_profiles"
    __table_args__ = (
        CheckConstraint(
            "gender IS NULL OR gender IN "
            "('FEMALE', 'MALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY')",
            name="valid_gender",
        ),
        CheckConstraint(
            "preferred_language IN ('en', 'hi')",
            name="valid_preferred_language",
        ),
        Index("ix_patient_profiles_user_id", "user_id", unique=True),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True, default=None)
    phone_number: Mapped[str | None] = mapped_column(
        String(30), nullable=True, default=None
    )
    gender: Mapped[str | None] = mapped_column(String(30), nullable=True, default=None)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    preferred_language: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=PreferredLanguage.ENGLISH.value,
        server_default=text("'en'"),
    )
    emergency_contact_name: Mapped[str | None] = mapped_column(
        String(150), nullable=True, default=None
    )
    emergency_contact_phone: Mapped[str | None] = mapped_column(
        String(30), nullable=True, default=None
    )

    user: Mapped[User] = relationship("User", foreign_keys=[user_id], lazy="joined")
