import re
from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from pid.models import AccessScope, PidAccessToken, PidDiagram


_SHA256_HEX_PATTERN = re.compile(r"[0-9a-f]{64}")


def _validate_token_hash(token_hash: str) -> None:
    if _SHA256_HEX_PATTERN.fullmatch(token_hash) is None:
        raise ValueError("token_hash must be a 64-character lowercase hex digest")


class TokenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, token: PidAccessToken) -> None:
        _validate_token_hash(token.token_hash)
        self._session.add(token)

    async def resolve(
        self,
        diagram_id: UUID,
        token_hash: str,
        *,
        include_deleted: bool = False,
        for_update: bool = False,
    ) -> PidAccessToken | None:
        _validate_token_hash(token_hash)
        statement = select(PidAccessToken).where(
            PidAccessToken.diagram_id == diagram_id,
            PidAccessToken.token_hash == token_hash,
            PidAccessToken.revoked_at.is_(None),
        )
        if not include_deleted:
            statement = statement.join(
                PidDiagram,
                PidDiagram.id == PidAccessToken.diagram_id,
            ).where(PidDiagram.deleted_at.is_(None))
        if for_update:
            statement = statement.with_for_update()
        return await self._session.scalar(statement)

    async def revoke_scope(
        self,
        diagram_id: UUID,
        scope: AccessScope,
        when: datetime,
    ) -> None:
        await self._session.execute(
            update(PidAccessToken)
            .where(
                PidAccessToken.diagram_id == diagram_id,
                PidAccessToken.scope == scope,
                PidAccessToken.revoked_at.is_(None),
            )
            .values(revoked_at=when)
        )
