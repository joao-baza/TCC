from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from pid.models import PidDiagram, PidDocumentSnapshot


class SnapshotDiagramNotFound(LookupError):
    def __init__(self, diagram_id: UUID) -> None:
        super().__init__(f"diagram {diagram_id} not found")
        self.diagram_id = diagram_id


class SnapshotRepository:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
    ) -> None:
        self._session_factory = session_factory

    async def append(
        self,
        diagram_id: UUID,
        *,
        yjs_state: bytes,
        document_projection: dict,
        schema_version: int,
        is_valid: bool,
    ) -> int:
        if schema_version <= 0:
            raise ValueError("schema_version must be positive")

        async with self._session_factory() as session:
            async with session.begin():
                diagram = await session.scalar(
                    select(PidDiagram)
                    .where(
                        PidDiagram.id == diagram_id,
                        PidDiagram.deleted_at.is_(None),
                    )
                    .with_for_update()
                )
                if diagram is None:
                    raise SnapshotDiagramNotFound(diagram_id)

                revision = await session.scalar(
                    select(
                        func.coalesce(
                            func.max(PidDocumentSnapshot.revision),
                            0,
                        )
                        + 1
                    ).where(PidDocumentSnapshot.diagram_id == diagram_id)
                )
                assert revision is not None
                revision = int(revision)

                session.add(
                    PidDocumentSnapshot(
                        diagram_id=diagram_id,
                        revision=revision,
                        yjs_state=yjs_state,
                        document_projection=document_projection,
                        schema_version=schema_version,
                        is_valid=is_valid,
                    )
                )
                await session.flush()

                previous_valid_revision = await session.scalar(
                    select(func.max(PidDocumentSnapshot.revision)).where(
                        PidDocumentSnapshot.diagram_id == diagram_id,
                        PidDocumentSnapshot.revision < revision,
                        PidDocumentSnapshot.is_valid.is_(True),
                    )
                )
                retained_revisions = [revision]
                if previous_valid_revision is not None:
                    retained_revisions.append(int(previous_valid_revision))

                await session.execute(
                    delete(PidDocumentSnapshot)
                    .where(
                        PidDocumentSnapshot.diagram_id == diagram_id,
                        PidDocumentSnapshot.revision.not_in(retained_revisions),
                    )
                    .execution_options(synchronize_session=False)
                )

        return revision

    async def list_revisions(self, diagram_id: UUID) -> list[int]:
        async with self._session_factory() as session:
            revisions = await session.scalars(
                select(PidDocumentSnapshot.revision)
                .where(PidDocumentSnapshot.diagram_id == diagram_id)
                .order_by(PidDocumentSnapshot.revision.asc())
            )
            return [int(revision) for revision in revisions]
