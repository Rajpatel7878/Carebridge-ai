"""Create Phase 5 patient portal tables with strict ownership and constraints.

Revision ID: 0003_patient_portal_models
Revises: 0002_auth_users_and_refresh_tokens
Create Date: 2026-11-18 20:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_patient_portal_models"
down_revision: str | Sequence[str] | None = "0002_auth_users_and_refresh_tokens"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create patient profile, reports, risk, appointments, referrals, follow-ups, and notifications."""
    # 1. patient_profiles (1:1 with users.id)
    op.create_table(
        "patient_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("phone_number", sa.String(length=30), nullable=True),
        sa.Column("gender", sa.String(length=30), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column(
            "preferred_language",
            sa.String(length=16),
            server_default=sa.text("'en'"),
            nullable=False,
        ),
        sa.Column("emergency_contact_name", sa.String(length=150), nullable=True),
        sa.Column("emergency_contact_phone", sa.String(length=30), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "gender IS NULL OR gender IN "
            "('FEMALE', 'MALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY')",
            name=op.f("ck_patient_profiles_valid_gender"),
        ),
        sa.CheckConstraint(
            "preferred_language IN ('en', 'hi')",
            name=op.f("ck_patient_profiles_valid_preferred_language"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_patient_profiles_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_patient_profiles")),
        sa.UniqueConstraint("user_id", name=op.f("uq_patient_profiles_user_id")),
    )
    op.create_index(
        "ix_patient_profiles_user_id", "patient_profiles", ["user_id"], unique=True
    )

    # 2. medical_reports
    op.create_table(
        "medical_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=120), nullable=False),
        sa.Column("file_type", sa.String(length=16), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column(
            "upload_status",
            sa.String(length=24),
            server_default=sa.text("'UPLOADED'"),
            nullable=False,
        ),
        sa.Column(
            "review_status",
            sa.String(length=24),
            server_default=sa.text("'PENDING_REVIEW'"),
            nullable=False,
        ),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "file_type IN ('PDF', 'PNG', 'JPG')",
            name=op.f("ck_medical_reports_valid_file_type"),
        ),
        sa.CheckConstraint(
            "file_size > 0",
            name=op.f("ck_medical_reports_positive_file_size"),
        ),
        sa.CheckConstraint(
            "upload_status IN ('UPLOADED', 'FAILED')",
            name=op.f("ck_medical_reports_valid_upload_status"),
        ),
        sa.CheckConstraint(
            "review_status IN ('PENDING_REVIEW', 'IN_REVIEW', 'REVIEWED')",
            name=op.f("ck_medical_reports_valid_review_status"),
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["users.id"],
            name=op.f("fk_medical_reports_patient_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_medical_reports")),
        sa.UniqueConstraint(
            "stored_filename", name=op.f("uq_medical_reports_stored_filename")
        ),
    )
    op.create_index(
        "ix_medical_reports_patient_id",
        "medical_reports",
        ["patient_id"],
        unique=False,
    )
    op.create_index(
        "ix_medical_reports_patient_uploaded",
        "medical_reports",
        ["patient_id", "uploaded_at"],
        unique=False,
    )

    # 3. risk_assessments (read-only extensible schema; no generation in Phase 5)
    op.create_table(
        "risk_assessments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("related_report_id", sa.String(length=36), nullable=True),
        sa.Column("reviewed_by_doctor_id", sa.String(length=36), nullable=True),
        sa.Column(
            "status",
            sa.String(length=24),
            server_default=sa.text("'REVIEWED'"),
            nullable=False,
        ),
        sa.Column("risk_category", sa.String(length=24), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("recommended_action", sa.Text(), nullable=True),
        sa.Column(
            "assessed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'REVIEWED', 'ARCHIVED')",
            name=op.f("ck_risk_assessments_valid_status"),
        ),
        sa.CheckConstraint(
            "risk_category IS NULL OR risk_category IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')",
            name=op.f("ck_risk_assessments_valid_risk_category"),
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["users.id"],
            name=op.f("fk_risk_assessments_patient_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["related_report_id"],
            ["medical_reports.id"],
            name=op.f("fk_risk_assessments_related_report_id_medical_reports"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by_doctor_id"],
            ["users.id"],
            name=op.f("fk_risk_assessments_reviewed_by_doctor_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_risk_assessments")),
    )
    op.create_index(
        "ix_risk_assessments_patient_id",
        "risk_assessments",
        ["patient_id"],
        unique=False,
    )
    op.create_index(
        "ix_risk_assessments_patient_assessed",
        "risk_assessments",
        ["patient_id", "assessed_at"],
        unique=False,
    )

    # 4. appointments
    op.create_table(
        "appointments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=36), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("appointment_type", sa.String(length=80), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'PENDING'"),
            nullable=False,
        ),
        sa.Column("location_or_mode", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')",
            name=op.f("ck_appointments_valid_status"),
        ),
        sa.CheckConstraint(
            "length(trim(appointment_type)) >= 2",
            name=op.f("ck_appointments_non_empty_appointment_type"),
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["users.id"],
            name=op.f("fk_appointments_patient_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["doctor_id"],
            ["users.id"],
            name=op.f("fk_appointments_doctor_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_appointments")),
    )
    op.create_index(
        "ix_appointments_patient_id", "appointments", ["patient_id"], unique=False
    )
    op.create_index(
        "ix_appointments_doctor_id", "appointments", ["doctor_id"], unique=False
    )
    op.create_index(
        "ix_appointments_patient_scheduled",
        "appointments",
        ["patient_id", "scheduled_at"],
        unique=False,
    )

    # 5. referrals
    op.create_table(
        "referrals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("referring_doctor_id", sa.String(length=36), nullable=True),
        sa.Column("referred_department", sa.String(length=120), nullable=False),
        sa.Column("reason", sa.String(length=400), nullable=True),
        sa.Column("next_action", sa.String(length=300), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'PENDING'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')",
            name=op.f("ck_referrals_valid_status"),
        ),
        sa.CheckConstraint(
            "length(trim(referred_department)) >= 2",
            name=op.f("ck_referrals_non_empty_department"),
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["users.id"],
            name=op.f("fk_referrals_patient_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["referring_doctor_id"],
            ["users.id"],
            name=op.f("fk_referrals_referring_doctor_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_referrals")),
    )
    op.create_index(
        "ix_referrals_patient_id", "referrals", ["patient_id"], unique=False
    )
    op.create_index(
        "ix_referrals_referring_doctor_id",
        "referrals",
        ["referring_doctor_id"],
        unique=False,
    )
    op.create_index(
        "ix_referrals_patient_created",
        "referrals",
        ["patient_id", "created_at"],
        unique=False,
    )

    # 6. follow_ups
    op.create_table(
        "follow_ups",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("related_appointment_id", sa.String(length=36), nullable=True),
        sa.Column("related_referral_id", sa.String(length=36), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("follow_up_type", sa.String(length=100), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'PENDING'"),
            nullable=False,
        ),
        sa.Column("notes", sa.String(length=400), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'COMPLETED', 'MISSED', 'CANCELLED')",
            name=op.f("ck_follow_ups_valid_status"),
        ),
        sa.CheckConstraint(
            "length(trim(follow_up_type)) >= 2",
            name=op.f("ck_follow_ups_non_empty_follow_up_type"),
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["users.id"],
            name=op.f("fk_follow_ups_patient_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["related_appointment_id"],
            ["appointments.id"],
            name=op.f("fk_follow_ups_related_appointment_id_appointments"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["related_referral_id"],
            ["referrals.id"],
            name=op.f("fk_follow_ups_related_referral_id_referrals"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_follow_ups")),
    )
    op.create_index(
        "ix_follow_ups_patient_id", "follow_ups", ["patient_id"], unique=False
    )
    op.create_index(
        "ix_follow_ups_patient_scheduled",
        "follow_ups",
        ["patient_id", "scheduled_at"],
        unique=False,
    )

    # 7. notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column(
            "notification_type",
            sa.String(length=32),
            server_default=sa.text("'SYSTEM'"),
            nullable=False,
        ),
        sa.Column(
            "is_read",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "notification_type IN "
            "('REPORT', 'APPOINTMENT', 'REFERRAL', 'FOLLOW_UP', 'PROFILE', 'SYSTEM')",
            name=op.f("ck_notifications_valid_notification_type"),
        ),
        sa.CheckConstraint(
            "length(trim(title)) >= 1",
            name=op.f("ck_notifications_non_empty_title"),
        ),
        sa.CheckConstraint(
            "length(trim(message)) >= 1",
            name=op.f("ck_notifications_non_empty_message"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_notifications_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notifications")),
    )
    op.create_index(
        "ix_notifications_user_id", "notifications", ["user_id"], unique=False
    )
    op.create_index(
        "ix_notifications_user_read_created",
        "notifications",
        ["user_id", "is_read", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Drop all Phase 5 patient portal tables in reverse foreign-key order."""
    op.drop_index("ix_notifications_user_read_created", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("ix_follow_ups_patient_scheduled", table_name="follow_ups")
    op.drop_index("ix_follow_ups_patient_id", table_name="follow_ups")
    op.drop_table("follow_ups")

    op.drop_index("ix_referrals_patient_created", table_name="referrals")
    op.drop_index("ix_referrals_referring_doctor_id", table_name="referrals")
    op.drop_index("ix_referrals_patient_id", table_name="referrals")
    op.drop_table("referrals")

    op.drop_index("ix_appointments_patient_scheduled", table_name="appointments")
    op.drop_index("ix_appointments_doctor_id", table_name="appointments")
    op.drop_index("ix_appointments_patient_id", table_name="appointments")
    op.drop_table("appointments")

    op.drop_index(
        "ix_risk_assessments_patient_assessed", table_name="risk_assessments"
    )
    op.drop_index("ix_risk_assessments_patient_id", table_name="risk_assessments")
    op.drop_table("risk_assessments")

    op.drop_index("ix_medical_reports_patient_uploaded", table_name="medical_reports")
    op.drop_index("ix_medical_reports_patient_id", table_name="medical_reports")
    op.drop_table("medical_reports")

    op.drop_index("ix_patient_profiles_user_id", table_name="patient_profiles")
    op.drop_table("patient_profiles")
