from datetime import datetime, timedelta, timezone
from typing import cast
from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.exc import DBAPIError

from pid.models import AccessScope, PidAccessToken, PidDiagram
from pid.repositories.diagrams import DiagramRepository
from pid.repositories.tokens import TokenRepository
from pid.security import hash_secret
from pid.services.diagram_service import DiagramNotFoundError, DiagramService


async def test_create_diagram_returns_uuid_and_two_plain_tokens(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Linha de reação",
        catalog_version="0.1.0-foundation",
    )

    assert isinstance(created.diagram_id, UUID)
    assert created.view_token != created.edit_token
    assert (
        await service.authorize(created.diagram_id, created.view_token)
        is AccessScope.VIEW
    )
    assert (
        await service.authorize(created.diagram_id, created.edit_token)
        is AccessScope.EDIT
    )
    assert await service.authorize(created.diagram_id, "invalid") is None


async def test_create_persists_only_sha256_hmac_hashes(session_factory) -> None:
    pepper = "p" * 32
    service = DiagramService(session_factory, token_pepper=pepper)
    created = await service.create(
        title="Linha de reação",
        catalog_version="0.1.0-foundation",
    )

    async with session_factory() as session:
        token_hashes = list(
            await session.scalars(
                select(PidAccessToken.token_hash).where(
                    PidAccessToken.diagram_id == created.diagram_id
                )
            )
        )

    assert len(token_hashes) == 2
    assert created.view_token not in token_hashes
    assert created.edit_token not in token_hashes
    assert set(token_hashes) == {
        hash_secret(created.view_token, pepper),
        hash_secret(created.edit_token, pepper),
    }
    assert all(
        len(token_hash) == 64
        and all(character in "0123456789abcdef" for character in token_hash)
        for token_hash in token_hashes
    )


async def test_create_rolls_back_parent_when_token_insert_fails(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    trigger_name = "pid_test_reject_access_token_insert"
    function_name = "pid_test_reject_access_token_insert_fn"
    attempted_title = "Must roll back after token trigger failure"
    async with session_factory() as session:
        before_diagrams = await session.scalar(
            select(func.count()).select_from(PidDiagram)
        )
        before_tokens = await session.scalar(
            select(func.count()).select_from(PidAccessToken)
        )

    try:
        async with session_factory() as session, session.begin():
            await session.execute(
                text(
                    f"DROP TRIGGER IF EXISTS {trigger_name} "
                    "ON pid_access_tokens"
                )
            )
            await session.execute(
                text(f"DROP FUNCTION IF EXISTS {function_name}()")
            )
            await session.execute(
                text(
                    f"""
                    CREATE FUNCTION {function_name}()
                    RETURNS trigger
                    LANGUAGE plpgsql
                    AS $$
                    BEGIN
                        RAISE EXCEPTION 'injected access token insert failure';
                    END;
                    $$
                    """
                )
            )
            await session.execute(
                text(
                    f"""
                    CREATE TRIGGER {trigger_name}
                    BEFORE INSERT ON pid_access_tokens
                    FOR EACH ROW
                    EXECUTE FUNCTION {function_name}()
                    """
                )
            )

        with pytest.raises(DBAPIError):
            await service.create(
                title=attempted_title,
                catalog_version="0.1.0-foundation",
            )
    finally:
        async with session_factory() as session, session.begin():
            await session.execute(
                text(
                    f"DROP TRIGGER IF EXISTS {trigger_name} "
                    "ON pid_access_tokens"
                )
            )
            await session.execute(
                text(f"DROP FUNCTION IF EXISTS {function_name}()")
            )

    async with session_factory() as session:
        after_diagrams = await session.scalar(
            select(func.count()).select_from(PidDiagram)
        )
        after_tokens = await session.scalar(
            select(func.count()).select_from(PidAccessToken)
        )
        rolled_back_diagram = await session.scalar(
            select(PidDiagram).where(PidDiagram.title == attempted_title)
        )
    assert after_diagrams == before_diagrams
    assert after_tokens == before_tokens
    assert rolled_back_diagram is None


async def test_create_rejects_blank_title_before_opening_session(
    session_factory,
) -> None:
    session_opened = False

    def observed_session_factory():
        nonlocal session_opened
        session_opened = True
        return session_factory()

    service = DiagramService(observed_session_factory, token_pepper="p" * 32)

    with pytest.raises(ValueError, match="title"):
        await service.create(
            title=" \t\n ",
            catalog_version="0.1.0-foundation",
        )

    assert session_opened is False


async def test_regenerate_view_token_revokes_previous_token(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Teste",
        catalog_version="0.1.0-foundation",
    )

    replacement = await service.regenerate_token(
        created.diagram_id,
        AccessScope.VIEW,
    )

    assert await service.authorize(created.diagram_id, created.view_token) is None
    assert (
        await service.authorize(created.diagram_id, replacement)
        is AccessScope.VIEW
    )
    assert (
        await service.authorize(created.diagram_id, created.edit_token)
        is AccessScope.EDIT
    )


async def test_regenerate_missing_scope_creates_one_active_token(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Teste",
        catalog_version="0.1.0-foundation",
    )
    async with session_factory() as session, session.begin():
        await session.execute(
            delete(PidAccessToken).where(
                PidAccessToken.diagram_id == created.diagram_id,
                PidAccessToken.scope == AccessScope.VIEW,
            )
        )

    replacement = await service.regenerate_token(
        created.diagram_id,
        AccessScope.VIEW,
    )

    async with session_factory() as session:
        active_count = await session.scalar(
            select(func.count())
            .select_from(PidAccessToken)
            .where(
                PidAccessToken.diagram_id == created.diagram_id,
                PidAccessToken.scope == AccessScope.VIEW,
                PidAccessToken.revoked_at.is_(None),
            )
        )
    assert active_count == 1
    assert (
        await service.authorize(created.diagram_id, replacement)
        is AccessScope.VIEW
    )


async def test_regenerate_nonexistent_diagram_leaves_no_orphan_token(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    diagram_id = uuid4()

    with pytest.raises(DiagramNotFoundError):
        await service.regenerate_token(diagram_id, AccessScope.VIEW)

    async with session_factory() as session:
        token_count = await session.scalar(
            select(func.count())
            .select_from(PidAccessToken)
            .where(PidAccessToken.diagram_id == diagram_id)
        )
    assert token_count == 0


async def test_regenerate_rejects_invalid_scope_without_changing_tokens(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Teste",
        catalog_version="0.1.0-foundation",
    )

    with pytest.raises(ValueError, match="scope"):
        await service.regenerate_token(
            created.diagram_id,
            cast(AccessScope, "invalid"),
        )

    async with session_factory() as session:
        token_count = await session.scalar(
            select(func.count())
            .select_from(PidAccessToken)
            .where(PidAccessToken.diagram_id == created.diagram_id)
        )
    assert token_count == 2


async def test_soft_delete_and_restore_require_active_edit_token(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Teste",
        catalog_version="0.1.0-foundation",
    )

    assert await service.soft_delete(created.diagram_id, created.edit_token)
    assert await service.restore(created.diagram_id, created.view_token) is False
    assert await service.restore(created.diagram_id, created.edit_token)


async def test_restore_refuses_diagram_deleted_more_than_thirty_days_ago(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Teste",
        catalog_version="0.1.0-foundation",
    )
    deleted_at = datetime.now(timezone.utc) - timedelta(days=31)
    async with session_factory() as session, session.begin():
        await session.execute(
            update(PidDiagram)
            .where(PidDiagram.id == created.diagram_id)
            .values(deleted_at=deleted_at)
        )

    assert await service.restore(created.diagram_id, created.edit_token) is False

    async with session_factory() as session:
        persisted_deleted_at = await session.scalar(
            select(PidDiagram.deleted_at).where(
                PidDiagram.id == created.diagram_id
            )
        )
    assert persisted_deleted_at == deleted_at


async def test_restore_accepts_exact_thirty_day_cutoff(session_factory) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Boundary",
        catalog_version="0.1.0-foundation",
    )
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    async with session_factory() as session, session.begin():
        await session.execute(
            update(PidDiagram)
            .where(PidDiagram.id == created.diagram_id)
            .values(deleted_at=cutoff, updated_at=cutoff - timedelta(days=1))
        )
    async with session_factory() as session, session.begin():
        restored = await DiagramRepository(session).restore(
            created.diagram_id,
            cutoff,
        )

    async with session_factory() as session:
        diagram = await session.get(PidDiagram, created.diagram_id)
    assert restored is True
    assert diagram is not None
    assert diagram.deleted_at is None
    assert diagram.updated_at > cutoff


async def test_revoked_edit_token_cannot_delete_diagram(session_factory) -> None:
    pepper = "p" * 32
    service = DiagramService(session_factory, token_pepper=pepper)
    created = await service.create(
        title="Teste",
        catalog_version="0.1.0-foundation",
    )
    async with session_factory() as session, session.begin():
        repository = TokenRepository(session)
        await repository.revoke_scope(
            created.diagram_id,
            AccessScope.EDIT,
            datetime.now(timezone.utc),
        )

    assert await service.soft_delete(created.diagram_id, created.edit_token) is False


async def test_soft_delete_and_restore_return_false_for_missing_diagram(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    diagram_id = uuid4()

    assert await service.soft_delete(diagram_id, "invalid") is False
    assert await service.restore(diagram_id, "invalid") is False
