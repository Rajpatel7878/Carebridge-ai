"""Initial database migration baseline (Phase 1 foundation).

Application domain tables are intentionally deferred to Phase 8.

Revision ID: 0001_initial_foundation
Revises: None
Create Date: 2026-11-18 00:00:00
"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "0001_initial_foundation"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Initialize Alembic version tracking baseline."""
    pass


def downgrade() -> None:
    """Revert baseline migration."""
    pass
