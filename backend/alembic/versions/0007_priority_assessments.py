"""Add operational workflow priority history.

Revision ID: 0007_priority_assessments
Revises: 0006_report_analyses
"""
from alembic import op
import sqlalchemy as sa

revision = '0007_priority_assessments'
down_revision = '0006_report_analyses'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('priority_assessments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('patient_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doctor_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('category', sa.String(24), nullable=False),
        sa.Column('input_hash', sa.String(64), nullable=False),
        sa.Column('reasons_json', sa.Text(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('recommended_action', sa.Text(), nullable=False),
        sa.Column('assessment_version', sa.String(20), nullable=False),
        sa.Column('review_status', sa.String(20), nullable=False),
        sa.Column('override_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_priority_patient_created', 'priority_assessments', ['patient_id', 'created_at'])


def downgrade():
    op.drop_index('ix_priority_patient_created', table_name='priority_assessments')
    op.drop_table('priority_assessments')
