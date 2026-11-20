"""Add administrative audit records.

Revision ID: 0005_audit_logs
Revises: 0004_doctor_portal_models
"""
from alembic import op
import sqlalchemy as sa

revision = '0005_audit_logs'
down_revision = '0004_doctor_portal_models'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('actor_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('actor_role', sa.String(20), nullable=False),
        sa.Column('action', sa.String(80), nullable=False),
        sa.Column('resource_type', sa.String(40), nullable=False),
        sa.Column('resource_id', sa.String(36), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('outcome', sa.String(20), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=False),
    )
    op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'])
    op.create_index('ix_audit_logs_actor_id', 'audit_logs', ['actor_id'])
    op.create_index('ix_audit_logs_resource', 'audit_logs', ['resource_type', 'resource_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])


def downgrade():
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_resource', table_name='audit_logs')
    op.drop_index('ix_audit_logs_actor_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_timestamp', table_name='audit_logs')
    op.drop_table('audit_logs')
