from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pid.models import PidDiagram


class DiagramRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, diagram: PidDiagram) -> None:
        self._session.add(diagram)

    async def get_active(
        self,
        diagram_id: UUID,
        *,
        for_update: bool = False,
    ) -> PidDiagram | None:
        statement = select(PidDiagram).where(
            PidDiagram.id == diagram_id,
            PidDiagram.deleted_at.is_(None),
        )
        if for_update:
            statement = statement.with_for_update()
        return await self._session.scalar(statement)

    async def get_any(
        self,
        diagram_id: UUID,
        *,
        for_update: bool = False,
    ) -> PidDiagram | None:
        statement = select(PidDiagram).where(PidDiagram.id == diagram_id)
        if for_update:
            statement = statement.with_for_update()
        return await self._session.scalar(statement)

    async def mark_deleted(self, diagram_id: UUID, when: datetime) -> bool:
        diagram = await self.get_active(diagram_id, for_update=True)
        if diagram is None:
            return False
        diagram.deleted_at = when
        diagram.updated_at = when
        return True

    async def restore(self, diagram_id: UUID, cutoff: datetime) -> bool:
        diagram = await self.get_any(diagram_id, for_update=True)
        if (
            diagram is None
            or diagram.deleted_at is None
            or diagram.deleted_at < cutoff
        ):
            return False
        diagram.deleted_at = None
        diagram.updated_at = datetime.now(timezone.utc)
        return True
