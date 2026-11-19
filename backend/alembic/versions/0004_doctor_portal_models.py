"""Create Phase 6 doctor portal tables and non-destructive workflow columns.

Revision ID: 0004_doctor_portal_models
Revises: 0003_patient_portal_models
Create Date: 2026-11-18 22:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004_doctor_portal_models"
down_revision: str | Sequence[str] | None = "0003_patient_portal_models"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create doctor profile, assignment, review, and referral history tables."""
    # 1. doctor_profiles (strictly 1:1 with DOCTOR users)
    op.create_table(
        "doctor_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("specialization", sa.String(length=120), nullable=True),
        sa.Column("qualification", sa.String(length=160), nullable=True),
        sa.Column("license_number", sa.String(length=80), nullable=True),
        sa.Column("department", sa.String(length=120), nullable=True),
        sa.Column("hospital_or_clinic", sa.String(length=160), nullable=True),
        sa.Column("experience_years", sa.Integer(), nullable=True),
        sa.Column(
            "verification_status",
            sa.String(length=24),
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
            "verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
            name=op.f("ck_doctor_profiles_valid_verification_status"),
        ),
        sa.CheckConstraint(
            "experience_years IS NULL OR (experience_years >= 0 AND experience_years <= 70)",
            name=op.f("ck_doctor_profiles_valid_experience_years"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_doctor_profiles_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_doctor_profiles")),
        sa.UniqueConstraint("user_id", name=op.f("uq_doctor_profiles_user_id")),
    )
    op.create_index(
        "ix_doctor_profiles_user_id",
        "doctor_profiles",
        ["user_id"],
        unique=True,
    )
    op.create_index(
        "ix_doctor_profiles_verification_status",
        "doctor_profiles",
        ["verification_status"],
        unique=False,
    )

    # 2. patient_doctor_assignments (authorized care scope linkage)
    op.create_table(
        "patient_doctor_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=36), nullable=False),
        sa.Column("assigned_by", sa.String(length=36), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'ACTIVE'"),
            nullable=False,
        ),
        sa.Column("notes", sa.String(length=300), nullable=True),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
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
            "status IN ('ACTIVE', 'REVOKED', 'REASSIGNED')",
            name=op.f("ck_patient_doctor_assignments_valid_assignment_status"),
        ),
        sa.CheckConstraint(
            "patient_id != doctor_id",
            name=op.f("ck_patient_doctor_assignments_distinct_patient_doctor"),
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["users.id"],
            name=op.f("fk_patient_doctor_assignments_patient_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["doctor_id"],
            ["users.id"],
            name=op.f("fk_patient_doctor_assignments_doctor_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_by"],
            ["users.id"],
            name=op.f("fk_patient_doctor_assignments_assigned_by_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_patient_doctor_assignments")),
    )
    op.create_index(
        "ix_patient_doctor_assignments_patient_id",
        "patient_doctor_assignments",
        ["patient_id"],
        unique=False,
    )
    op.create_index(
        "ix_patient_doctor_assignments_doctor_id",
        "patient_doctor_assignments",
        ["doctor_id"],
        unique=False,
    )
    op.create_index(
        "ix_patient_doctor_assignments_assigned_by",
        "patient_doctor_assignments",
        ["assigned_by"],
        unique=False,
    )
    op.create_index(
        "ix_patient_doctor_assignments_doctor_status",
        "patient_doctor_assignments",
        ["doctor_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_patient_doctor_assignments_patient_status",
        "patient_doctor_assignments",
        ["patient_id", "status"],
        unique=False,
    )
    op.create_index(
        "uq_active_patient_doctor_assignment",
        "patient_doctor_assignments",
        ["patient_id", "doctor_id"],
        unique=True,
        sqlite_where=sa.text("status = 'ACTIVE'"),
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )

    # 3. report_reviews (immutable clinical report review history)
    op.create_table(
        "report_reviews",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("report_id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=36), nullable=True),
        sa.Column("review_status", sa.String(length=24), nullable=False),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column(
            "reviewed_at",
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
            "review_status IN ('PENDING', 'IN_REVIEW', 'REVIEWED', 'NEEDS_FOLLOW_UP')",
            name=op.f("ck_report_reviews_valid_report_review_status"),
        ),
        sa.ForeignKeyConstraint(
            ["report_id"],
            ["medical_reports.id"],
            name=op.f("fk_report_reviews_report_id_medical_reports"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["doctor_id"],
            ["users.id"],
            name=op.f("fk_report_reviews_doctor_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_report_reviews")),
    )
    op.create_index(
        "ix_report_reviews_report_id",
        "report_reviews",
        ["report_id"],
        unique=False,
    )
    op.create_index(
        "ix_report_reviews_doctor_id",
        "report_reviews",
        ["doctor_id"],
        unique=False,
    )
    op.create_index(
        "ix_report_reviews_report_reviewed_at",
        "report_reviews",
        ["report_id", "reviewed_at"],
        unique=False,
    )

    # 4. clinical_reviews (doctor reviews of authorized risk assessments)
    op.create_table(
        "clinical_reviews",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=36), nullable=True),
        sa.Column("related_assessment_id", sa.String(length=36), nullable=True),
        sa.Column("review_status", sa.String(length=32), nullable=False),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("recommended_action", sa.String(length=500), nullable=True),
        sa.Column(
            "reviewed_at",
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
        sa.CheckConstraint(
            "review_status IN "
            "('REVIEWED', 'FLAGGED_FOR_REVIEW', 'FOLLOW_UP_REQUIRED', 'ARCHIVED')",
            name=op.f("ck_clinical_reviews_valid_clinical_review_status"),
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["users.id"],
            name=op.f("fk_clinical_reviews_patient_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["doctor_id"],
            ["users.id"],
            name=op.f("fk_clinical_reviews_doctor_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["related_assessment_id"],
            ["risk_assessments.id"],
            name=op.f("fk_clinical_reviews_related_assessment_id_risk_assessments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_clinical_reviews")),
    )
    op.create_index(
        "ix_clinical_reviews_patient_id",
        "clinical_reviews",
        ["patient_id"],
        unique=False,
    )
    op.create_index(
        "ix_clinical_reviews_doctor_id",
        "clinical_reviews",
        ["doctor_id"],
        unique=False,
    )
    op.create_index(
        "ix_clinical_reviews_related_assessment_id",
        "clinical_reviews",
        ["related_assessment_id"],
        unique=False,
    )

    # 5. referral_history (auditable referral status transitions)
    op.create_table(
        "referral_history",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("referral_id", sa.String(length=36), nullable=False),
        sa.Column("changed_by_doctor_id", sa.String(length=36), nullable=True),
        sa.Column("previous_status", sa.String(length=20), nullable=True),
        sa.Column("new_status", sa.String(length=20), nullable=False),
        sa.Column("note", sa.String(length=400), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "previous_status IS NULL OR previous_status IN "
            "('PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')",
            name=op.f("ck_referral_history_valid_previous_status"),
        ),
        sa.CheckConstraint(
            "new_status IN ('PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')",
            name=op.f("ck_referral_history_valid_new_status"),
        ),
        sa.ForeignKeyConstraint(
            ["referral_id"],
            ["referrals.id"],
            name=op.f("fk_referral_history_referral_id_referrals"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["changed_by_doctor_id"],
            ["users.id"],
            name=op.f("fk_referral_history_changed_by_doctor_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_referral_history")),
    )
    op.create_index(
        "ix_referral_history_referral_id",
        "referral_history",
        ["referral_id"],
        unique=False,
    )
    op.create_index(
        "ix_referral_history_changed_by_doctor_id",
        "referral_history",
        ["changed_by_doctor_id"],
        unique=False,
    )

    # 6. Non-destructive extensions to existing Phase 5 tables
    with op.batch_alter_table("medical_reports") as batch_op:
        batch_op.drop_constraint(
            op.f("ck_medical_reports_valid_review_status"),
            type_="check",
        )
        batch_op.create_check_constraint(
            op.f("ck_medical_reports_valid_review_status"),
            "review_status IN ('PENDING_REVIEW', 'IN_REVIEW', 'REVIEWED', 'NEEDS_FOLLOW_UP')",
        )

    with op.batch_alter_table("risk_assessments") as batch_op:
        batch_op.add_column(
            sa.Column("source", sa.String(length=40), nullable=True)
        )
        batch_op.create_check_constraint(
            op.f("ck_risk_assessments_valid_risk_source"),
            "source IS NULL OR source IN ('SCREENING_INTAKE', 'CLINICAL_REVIEW', 'AI_ASSISTED')",
        )

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.add_column(
            sa.Column("status_note", sa.String(length=400), nullable=True)
        )

    with op.batch_alter_table("follow_ups") as batch_op:
        batch_op.add_column(
            sa.Column("created_by_doctor_id", sa.String(length=36), nullable=True)
        )
        batch_op.create_foreign_key(
            op.f("fk_follow_ups_created_by_doctor_id_users"),
            "users",
            ["created_by_doctor_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_follow_ups_created_by_doctor_id",
            ["created_by_doctor_id"],
            unique=False,
        )


def downgrade() -> None:
    """Revert Phase 6 doctor portal tables and columns cleanly."""
    with op.batch_alter_table("follow_ups") as batch_op:
        batch_op.drop_index("ix_follow_ups_created_by_doctor_id")
        batch_op.drop_constraint(
            op.f("fk_follow_ups_created_by_doctor_id_users"),
            type_="foreignkey",
        )
        batch_op.drop_column("created_by_doctor_id")

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.drop_column("status_note")

    with op.batch_alter_table("risk_assessments") as batch_op:
        batch_op.drop_constraint(
            op.f("ck_risk_assessments_valid_risk_source"),
            type_="check",
        )
        batch_op.drop_column("source")

    op.execute(
        sa.text(
            "UPDATE medical_reports SET review_status = 'IN_REVIEW' "
            "WHERE review_status = 'NEEDS_FOLLOW_UP'"
        )
    )
    with op.batch_alter_table("medical_reports") as batch_op:
        batch_op.drop_constraint(
            op.f("ck_medical_reports_valid_review_status"),
            type_="check",
        )
        batch_op.create_check_constraint(
            op.f("ck_medical_reports_valid_review_status"),
            "review_status IN ('PENDING_REVIEW', 'IN_REVIEW', 'REVIEWED')",
        )

    op.drop_index("ix_referral_history_changed_by_doctor_id", table_name="referral_history")
    op.drop_index("ix_referral_history_referral_id", table_name="referral_history")
    op.drop_table("referral_history")

    op.drop_index(
        "ix_clinical_reviews_related_assessment_id",
        table_name="clinical_reviews",
    )
    op.drop_index("ix_clinical_reviews_doctor_id", table_name="clinical_reviews")
    op.drop_index("ix_clinical_reviews_patient_id", table_name="clinical_reviews")
    op.drop_table("clinical_reviews")

    op.drop_index("ix_report_reviews_report_reviewed_at", table_name="report_reviews")
    op.drop_index("ix_report_reviews_doctor_id", table_name="report_reviews")
    op.drop_index("ix_report_reviews_report_id", table_name="report_reviews")
    op.drop_table("report_reviews")

    op.drop_index(
        "uq_active_patient_doctor_assignment",
        table_name="patient_doctor_assignments",
    )
    op.drop_index(
        "ix_patient_doctor_assignments_patient_status",
        table_name="patient_doctor_assignments",
    )
    op.drop_index(
        "ix_patient_doctor_assignments_doctor_status",
        table_name="patient_doctor_assignments",
    )
    op.drop_index(
        "ix_patient_doctor_assignments_assigned_by",
        table_name="patient_doctor_assignments",
    )
    op.drop_index(
        "ix_patient_doctor_assignments_doctor_id",
        table_name="patient_doctor_assignments",
    )
    op.drop_index(
        "ix_patient_doctor_assignments_patient_id",
        table_name="patient_doctor_assignments",
    )
    op.drop_table("patient_doctor_assignments")

    op.drop_index(
        "ix_doctor_profiles_verification_status",
        table_name="doctor_profiles",
    )
    op.drop_index("ix_doctor_profiles_user_id", table_name="doctor_profiles")
    op.drop_table("doctor_profiles")
