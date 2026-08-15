"""Restrict P&ID persistence to the free standard.

Revision ID: 20260809_0003
Revises: 20260809_0002
Create Date: 2026-08-09
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260809_0003"
down_revision: str | None = "20260809_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Access tokens and snapshots are removed by the diagram foreign-key cascades.
    op.execute("DELETE FROM pid_diagrams WHERE standard::text <> 'free'")
    op.execute("DELETE FROM pid_catalog_versions WHERE standard::text <> 'free'")

    op.execute("ALTER TYPE pid_standard RENAME TO pid_standard_legacy")
    op.execute("CREATE TYPE pid_standard AS ENUM ('free')")
    op.execute(
        "ALTER TABLE pid_diagrams ALTER COLUMN standard TYPE pid_standard "
        "USING standard::text::pid_standard"
    )
    op.execute(
        "ALTER TABLE pid_catalog_versions ALTER COLUMN standard TYPE pid_standard "
        "USING standard::text::pid_standard"
    )
    op.execute("DROP TYPE pid_standard_legacy")


def downgrade() -> None:
    op.execute("ALTER TYPE pid_standard RENAME TO pid_standard_free_only")
    op.execute("CREATE TYPE pid_standard AS ENUM ('isa', 'iso', 'free')")
    op.execute(
        "ALTER TABLE pid_diagrams ALTER COLUMN standard TYPE pid_standard "
        "USING standard::text::pid_standard"
    )
    op.execute(
        "ALTER TABLE pid_catalog_versions ALTER COLUMN standard TYPE pid_standard "
        "USING standard::text::pid_standard"
    )
    op.execute("DROP TYPE pid_standard_free_only")
