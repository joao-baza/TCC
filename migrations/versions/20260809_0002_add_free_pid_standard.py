"""Add the free P&ID standard to existing databases.

Revision ID: 20260809_0002
Revises: 20260808_0001
Create Date: 2026-08-09
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260809_0002"
down_revision: str | None = "20260808_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE pid_standard ADD VALUE IF NOT EXISTS 'free'")


def downgrade() -> None:
    # Removing an enum value requires rewriting dependent columns and could
    # destroy diagrams already stored with the free standard.
    pass
