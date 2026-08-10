from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from pid.models import AccessScope, PidAccessToken, PidDiagram, PidStandard
from pid.repositories.diagrams import DiagramRepository
from pid.repositories.tokens import TokenRepository
from pid.security import generate_secret, hash_secret


@dataclass(frozen=True)
class CreatedDiagram:
    diagram_id: UUID
    view_token: str
    edit_token: str


class DiagramNotFoundError(LookupError):
    def __init__(self, diagram_id: UUID) -> None:
        super().__init__(f"diagram {diagram_id} not found")
        self.diagram_id = diagram_id


class DiagramService:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        token_pepper: str,
    ) -> None:
        self._session_factory = session_factory
        self._token_pepper = token_pepper

    async def create(
        self,
        title: str,
        catalog_version: str,
    ) -> CreatedDiagram:
        normalized_title = title.strip()
        if not normalized_title:
            raise ValueError("title must not be blank")

        diagram_id = uuid4()
        view_token = generate_secret()
        edit_token = generate_secret()
        while edit_token == view_token:
            edit_token = generate_secret()

        async with self._session_factory() as session:
            async with session.begin():
                diagrams = DiagramRepository(session)
                tokens = TokenRepository(session)
                diagrams.add(
                    PidDiagram(
                        id=diagram_id,
                        title=normalized_title,
                        standard=PidStandard.FREE,
                        catalog_version=catalog_version,
                        schema_version=1,
                    )
                )
                await session.flush()
                tokens.add(
                    PidAccessToken(
                        diagram_id=diagram_id,
                        scope=AccessScope.VIEW,
                        token_hash=hash_secret(view_token, self._token_pepper),
                    )
                )
                tokens.add(
                    PidAccessToken(
                        diagram_id=diagram_id,
                        scope=AccessScope.EDIT,
                        token_hash=hash_secret(edit_token, self._token_pepper),
                    )
                )

        return CreatedDiagram(
            diagram_id=diagram_id,
            view_token=view_token,
            edit_token=edit_token,
        )

    async def authorize(
        self,
        diagram_id: UUID,
        plain_token: str,
    ) -> AccessScope | None:
        token_hash = hash_secret(plain_token, self._token_pepper)
        async with self._session_factory() as session:
            token = await TokenRepository(session).resolve(
                diagram_id,
                token_hash,
            )
        return token.scope if token is not None else None

    async def regenerate_token(
        self,
        diagram_id: UUID,
        scope: AccessScope,
    ) -> str:
        if not isinstance(scope, AccessScope):
            raise ValueError("scope must be an AccessScope")

        plain_token = generate_secret()
        now = datetime.now(timezone.utc)
        async with self._session_factory() as session:
            async with session.begin():
                diagrams = DiagramRepository(session)
                tokens = TokenRepository(session)
                if await diagrams.get_active(diagram_id, for_update=True) is None:
                    raise DiagramNotFoundError(diagram_id)
                await tokens.revoke_scope(diagram_id, scope, now)
                tokens.add(
                    PidAccessToken(
                        diagram_id=diagram_id,
                        scope=scope,
                        token_hash=hash_secret(plain_token, self._token_pepper),
                    )
                )

        return plain_token

    async def soft_delete(self, diagram_id: UUID, plain_token: str) -> bool:
        token_hash = hash_secret(plain_token, self._token_pepper)
        async with self._session_factory() as session:
            async with session.begin():
                diagrams = DiagramRepository(session)
                tokens = TokenRepository(session)
                if await diagrams.get_active(diagram_id, for_update=True) is None:
                    return False
                token = await tokens.resolve(
                    diagram_id,
                    token_hash,
                    for_update=True,
                )
                if token is None or token.scope is not AccessScope.EDIT:
                    return False
                return await diagrams.mark_deleted(
                    diagram_id,
                    datetime.now(timezone.utc),
                )

    async def restore(self, diagram_id: UUID, plain_token: str) -> bool:
        token_hash = hash_secret(plain_token, self._token_pepper)
        async with self._session_factory() as session:
            async with session.begin():
                diagrams = DiagramRepository(session)
                tokens = TokenRepository(session)
                if await diagrams.get_any(diagram_id, for_update=True) is None:
                    return False
                token = await tokens.resolve(
                    diagram_id,
                    token_hash,
                    include_deleted=True,
                    for_update=True,
                )
                if token is None or token.scope is not AccessScope.EDIT:
                    return False
                now = datetime.now(timezone.utc)
                return await diagrams.restore(
                    diagram_id,
                    now - timedelta(days=30),
                )
