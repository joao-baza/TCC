import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    func,
)
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class PidStandard(str, enum.Enum):
    ISA = "isa"
    ISO = "iso"


class AccessScope(str, enum.Enum):
    VIEW = "view"
    EDIT = "edit"


PID_STANDARD_ENUM = postgresql.ENUM(
    PidStandard,
    name="pid_standard",
    values_callable=lambda enum_type: [member.value for member in enum_type],
)
PID_ACCESS_SCOPE_ENUM = postgresql.ENUM(
    AccessScope,
    name="pid_access_scope",
    values_callable=lambda enum_type: [member.value for member in enum_type],
)


class PidDiagram(Base):
    __tablename__ = "pid_diagrams"
    __table_args__ = (
        CheckConstraint(
            "schema_version > 0",
            name="ck_pid_diagrams_schema_version_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    standard: Mapped[PidStandard] = mapped_column(PID_STANDARD_ENUM, nullable=False)
    catalog_version: Mapped[str] = mapped_column(Text, nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )


class PidAccessToken(Base):
    __tablename__ = "pid_access_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    diagram_id: Mapped[uuid.UUID] = mapped_column(
        postgresql.UUID(as_uuid=True),
        ForeignKey("pid_diagrams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scope: Mapped[AccessScope] = mapped_column(
        PID_ACCESS_SCOPE_ENUM,
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class PidDocumentSnapshot(Base):
    __tablename__ = "pid_document_snapshots"
    __table_args__ = (
        CheckConstraint(
            "revision > 0",
            name="ck_pid_document_snapshots_revision_positive",
        ),
        CheckConstraint(
            "schema_version > 0",
            name="ck_pid_document_snapshots_schema_version_positive",
        ),
    )

    diagram_id: Mapped[uuid.UUID] = mapped_column(
        postgresql.UUID(as_uuid=True),
        ForeignKey("pid_diagrams.id", ondelete="CASCADE"),
        primary_key=True,
    )
    revision: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    yjs_state: Mapped[bytes] = mapped_column(postgresql.BYTEA, nullable=False)
    document_projection: Mapped[dict[str, Any]] = mapped_column(
        postgresql.JSONB,
        nullable=False,
    )
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class PidCatalogVersion(Base):
    __tablename__ = "pid_catalog_versions"

    standard: Mapped[PidStandard] = mapped_column(
        PID_STANDARD_ENUM,
        primary_key=True,
    )
    version: Mapped[str] = mapped_column(Text, primary_key=True)
    manifest_hash: Mapped[str] = mapped_column(Text, nullable=False)
    activated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
