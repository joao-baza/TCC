"""Create the PID foundation schema.

Revision ID: 20260808_0001
Revises:
Create Date: 2026-08-08
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260808_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


pid_standard = postgresql.ENUM(
    "isa",
    "iso",
    name="pid_standard",
    create_type=False,
)
pid_access_scope = postgresql.ENUM(
    "view",
    "edit",
    name="pid_access_scope",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    pid_standard.create(bind, checkfirst=False)
    pid_access_scope.create(bind, checkfirst=False)

    op.create_table(
        "pid_diagrams",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("standard", pid_standard, nullable=False),
        sa.Column("catalog_version", sa.Text(), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "schema_version > 0",
            name="ck_pid_diagrams_schema_version_positive",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pid_diagrams_updated_at",
        "pid_diagrams",
        ["updated_at"],
        unique=False,
    )
    op.create_index(
        "ix_pid_diagrams_deleted_at",
        "pid_diagrams",
        ["deleted_at"],
        unique=False,
    )

    op.create_table(
        "pid_access_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("diagram_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scope", pid_access_scope, nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["diagram_id"],
            ["pid_diagrams.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_pid_access_tokens_diagram_id",
        "pid_access_tokens",
        ["diagram_id"],
        unique=False,
    )

    op.create_table(
        "pid_document_snapshots",
        sa.Column("diagram_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision", sa.BigInteger(), nullable=False),
        sa.Column("yjs_state", postgresql.BYTEA(), nullable=False),
        sa.Column("document_projection", postgresql.JSONB(), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("is_valid", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "revision > 0",
            name="ck_pid_document_snapshots_revision_positive",
        ),
        sa.CheckConstraint(
            "schema_version > 0",
            name="ck_pid_document_snapshots_schema_version_positive",
        ),
        sa.ForeignKeyConstraint(
            ["diagram_id"],
            ["pid_diagrams.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("diagram_id", "revision"),
    )

    op.create_table(
        "pid_catalog_versions",
        sa.Column("standard", pid_standard, nullable=False),
        sa.Column("version", sa.Text(), nullable=False),
        sa.Column("manifest_hash", sa.Text(), nullable=False),
        sa.Column(
            "activated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("standard", "version"),
    )


def downgrade() -> None:
    op.drop_table("pid_catalog_versions")
    op.drop_table("pid_document_snapshots")
    op.drop_index(
        "ix_pid_access_tokens_diagram_id",
        table_name="pid_access_tokens",
    )
    op.drop_table("pid_access_tokens")
    op.drop_index("ix_pid_diagrams_deleted_at", table_name="pid_diagrams")
    op.drop_index("ix_pid_diagrams_updated_at", table_name="pid_diagrams")
    op.drop_table("pid_diagrams")

    bind = op.get_bind()
    pid_access_scope.drop(bind, checkfirst=False)
    pid_standard.drop(bind, checkfirst=False)
