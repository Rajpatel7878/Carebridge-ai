"""Persist report analysis attempts without altering reports.

Revision ID: 0006_report_analyses
Revises: 0005_audit_logs
"""
from alembic import op
import sqlalchemy as sa

revision = '0006_report_analyses'
down_revision = '0005_audit_logs'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('report_analyses',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('report_id', sa.String(36), sa.ForeignKey('medical_reports.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(20), nullable=False),
        sa.Column('processing_mode', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('external_consent', sa.Boolean(), nullable=False),
        sa.Column('result_json', sa.Text(), nullable=False),
        sa.Column('failure_reason', sa.String(250), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_report_analyses_report_created', 'report_analyses', ['report_id', 'created_at'])


def downgrade():
    op.drop_index('ix_report_analyses_report_created', table_name='report_analyses')
    op.drop_table('report_analyses')
