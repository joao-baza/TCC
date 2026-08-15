import asyncio
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError

from pid.models import PidDiagram, PidDocumentSnapshot
from pid.repositories.snapshots import (
    SnapshotDiagramNotFound,
    SnapshotRepository,
)


async def test_append_increments_revision_and_retains_current_plus_previous_valid(
    persisted_diagram_id,
    session_factory,
) -> None:
    repository = SnapshotRepository(session_factory)
    first = await repository.append(
        persisted_diagram_id,
        yjs_state=b"one",
        document_projection={"nodes": []},
        schema_version=1,
        is_valid=True,
    )
    second = await repository.append(
        persisted_diagram_id,
        yjs_state=b"two",
        document_projection={"nodes": [{"id": "broken"}]},
        schema_version=1,
        is_valid=False,
    )
    third = await repository.append(
        persisted_diagram_id,
        yjs_state=b"three",
        document_projection={"nodes": []},
        schema_version=1,
        is_valid=True,
    )

    assert (first, second, third) == (1, 2, 3)
    assert await repository.list_revisions(persisted_diagram_id) == [1, 3]


async def test_invalid_snapshot_retention_uses_last_valid_when_available(
    persisted_diagram_id,
    session_factory,
) -> None:
    repository = SnapshotRepository(session_factory)

    assert await repository.append(
        persisted_diagram_id,
        yjs_state=b"invalid-one",
        document_projection={"nodes": []},
        schema_version=1,
        is_valid=False,
    ) == 1
    assert await repository.list_revisions(persisted_diagram_id) == [1]

    assert await repository.append(
        persisted_diagram_id,
        yjs_state=b"invalid-two",
        document_projection={"nodes": []},
        schema_version=1,
        is_valid=False,
    ) == 2
    assert await repository.list_revisions(persisted_diagram_id) == [2]

    assert await repository.append(
        persisted_diagram_id,
        yjs_state=b"valid",
        document_projection={"nodes": []},
        schema_version=1,
        is_valid=True,
    ) == 3
    assert await repository.append(
        persisted_diagram_id,
        yjs_state=b"invalid-three",
        document_projection={"nodes": []},
        schema_version=1,
        is_valid=False,
    ) == 4
    assert await repository.list_revisions(persisted_diagram_id) == [3, 4]


async def test_concurrent_appends_receive_distinct_ordered_revisions(
    persisted_diagram_id,
    session_factory,
) -> None:
    repository = SnapshotRepository(session_factory)

    revisions = await asyncio.gather(
        repository.append(
            persisted_diagram_id,
            yjs_state=b"one",
            document_projection={"nodes": []},
            schema_version=1,
            is_valid=True,
        ),
        repository.append(
            persisted_diagram_id,
            yjs_state=b"two",
            document_projection={"nodes": []},
            schema_version=1,
            is_valid=True,
        ),
    )

    assert sorted(revisions) == [1, 2]
    assert await repository.list_revisions(persisted_diagram_id) == [1, 2]


async def test_append_rolls_back_flush_and_retention_when_delete_fails(
    persisted_diagram_id,
    session_factory,
) -> None:
    repository = SnapshotRepository(session_factory)
    await repository.append(
        persisted_diagram_id,
        yjs_state=b"valid",
        document_projection={"nodes": []},
        schema_version=1,
        is_valid=True,
    )
    await repository.append(
        persisted_diagram_id,
        yjs_state=b"invalid",
        document_projection={"nodes": [{"id": "broken"}]},
        schema_version=1,
        is_valid=False,
    )
    trigger_name = "pid_test_reject_snapshot_delete"
    function_name = "pid_test_reject_snapshot_delete_fn"

    try:
        async with session_factory() as session, session.begin():
            await session.execute(
                text(
                    f"DROP TRIGGER IF EXISTS {trigger_name} "
                    "ON pid_document_snapshots"
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
                        RAISE EXCEPTION 'injected snapshot delete failure';
                    END;
                    $$
                    """
                )
            )
            await session.execute(
                text(
                    f"""
                    CREATE TRIGGER {trigger_name}
                    BEFORE DELETE ON pid_document_snapshots
                    FOR EACH ROW
                    EXECUTE FUNCTION {function_name}()
                    """
                )
            )

        with pytest.raises(DBAPIError):
            await repository.append(
                persisted_diagram_id,
                yjs_state=b"rolled-back",
                document_projection={"nodes": []},
                schema_version=1,
                is_valid=True,
            )
    finally:
        async with session_factory() as session, session.begin():
            await session.execute(
                text(
                    f"DROP TRIGGER IF EXISTS {trigger_name} "
                    "ON pid_document_snapshots"
                )
            )
            await session.execute(
                text(f"DROP FUNCTION IF EXISTS {function_name}()")
            )

    async with session_factory() as session:
        snapshots = list(
            await session.scalars(
                select(PidDocumentSnapshot)
                .where(PidDocumentSnapshot.diagram_id == persisted_diagram_id)
                .order_by(PidDocumentSnapshot.revision.asc())
            )
        )
    assert [(snapshot.revision, snapshot.yjs_state) for snapshot in snapshots] == [
        (1, b"valid"),
        (2, b"invalid"),
    ]


async def test_append_uses_maximum_sparse_revision(
    persisted_diagram_id,
    session_factory,
) -> None:
    async with session_factory() as session, session.begin():
        session.add(
            PidDocumentSnapshot(
                diagram_id=persisted_diagram_id,
                revision=10,
                yjs_state=b"ten",
                document_projection={"nodes": []},
                schema_version=1,
                is_valid=True,
            )
        )

    revision = await SnapshotRepository(session_factory).append(
        persisted_diagram_id,
        yjs_state=b"eleven",
        document_projection={"nodes": []},
        schema_version=1,
        is_valid=True,
    )

    assert revision == 11
    assert await SnapshotRepository(session_factory).list_revisions(
        persisted_diagram_id
    ) == [10, 11]


async def test_append_rejects_nonexistent_diagram(session_factory) -> None:
    repository = SnapshotRepository(session_factory)

    with pytest.raises(SnapshotDiagramNotFound):
        await repository.append(
            uuid4(),
            yjs_state=b"missing",
            document_projection={"nodes": []},
            schema_version=1,
            is_valid=True,
        )


async def test_append_rejects_soft_deleted_diagram(
    persisted_diagram_id,
    session_factory,
) -> None:
    async with session_factory() as session, session.begin():
        await session.execute(
            update(PidDiagram)
            .where(PidDiagram.id == persisted_diagram_id)
            .values(deleted_at=datetime.now(timezone.utc))
        )

    repository = SnapshotRepository(session_factory)
    with pytest.raises(SnapshotDiagramNotFound):
        await repository.append(
            persisted_diagram_id,
            yjs_state=b"deleted",
            document_projection={"nodes": []},
            schema_version=1,
            is_valid=True,
        )


@pytest.mark.parametrize("schema_version", [0, -1])
async def test_append_rejects_nonpositive_schema_before_opening_session(
    session_factory,
    schema_version: int,
) -> None:
    session_opened = False

    def observed_session_factory():
        nonlocal session_opened
        session_opened = True
        return session_factory()

    repository = SnapshotRepository(observed_session_factory)

    with pytest.raises(ValueError, match="schema_version"):
        await repository.append(
            uuid4(),
            yjs_state=b"invalid-schema",
            document_projection={"nodes": []},
            schema_version=schema_version,
            is_valid=True,
        )

    assert session_opened is False


async def _ensure_diagram(session_factory, diagram_id):
    from pid.models import PidDiagram, PidStandard
    from sqlalchemy import select

    async with session_factory() as session:
        async with session.begin():
            exists = await session.scalar(select(PidDiagram).where(PidDiagram.id == diagram_id))
            if exists is None:
                session.add(
                    PidDiagram(
                        id=diagram_id,
                        title="test",
                        standard=PidStandard.FREE,
                        catalog_version="test-v1",
                        schema_version=1,
                    )
                )


@pytest.mark.asyncio
async def test_load_latest_valid_returns_most_recent_valid_snapshot(session_factory):
    repo = SnapshotRepository(session_factory)
    diagram_id = uuid4()
    await _ensure_diagram(session_factory, diagram_id)

    await repo.append(diagram_id, yjs_state=b"first", document_projection={"v": 1}, schema_version=1, is_valid=True)
    await repo.append(diagram_id, yjs_state=b"second-invalid", document_projection={"v": 2}, schema_version=1, is_valid=False)
    await repo.append(diagram_id, yjs_state=b"third", document_projection={"v": 3}, schema_version=1, is_valid=True)

    result = await repo.load_latest_valid(diagram_id)
    assert result is not None
    doc, rev = result
    assert doc == {"v": 3}
    assert rev == 3


@pytest.mark.asyncio
async def test_load_latest_valid_returns_none_for_no_valid_snapshots(session_factory):
    repo = SnapshotRepository(session_factory)
    diagram_id = uuid4()
    await _ensure_diagram(session_factory, diagram_id)

    await repo.append(diagram_id, yjs_state=b"bad", document_projection={"v": 1}, schema_version=1, is_valid=False)
    result = await repo.load_latest_valid(diagram_id)
    assert result is None


@pytest.mark.asyncio
async def test_load_latest_valid_returns_none_for_unknown_diagram(session_factory):
    repo = SnapshotRepository(session_factory)
    result = await repo.load_latest_valid(uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_get_latest_revision(session_factory):
    repo = SnapshotRepository(session_factory)
    diagram_id = uuid4()
    await _ensure_diagram(session_factory, diagram_id)

    assert await repo.get_latest_revision(diagram_id) is None
    rev1 = await repo.append(diagram_id, yjs_state=b"a", document_projection={"v": 1}, schema_version=1, is_valid=True)
    assert await repo.get_latest_revision(diagram_id) == rev1
    rev2 = await repo.append(diagram_id, yjs_state=b"b", document_projection={"v": 2}, schema_version=1, is_valid=False)
    assert await repo.get_latest_revision(diagram_id) == rev2


async def test_list_revisions_returns_ascending_order(
    persisted_diagram_id,
    session_factory,
) -> None:
    async with session_factory() as session, session.begin():
        session.add_all(
            [
                PidDocumentSnapshot(
                    diagram_id=persisted_diagram_id,
                    revision=revision,
                    yjs_state=str(revision).encode(),
                    document_projection={"revision": revision},
                    schema_version=1,
                    is_valid=True,
                )
                for revision in (3, 1, 2)
            ]
        )

    revisions = await SnapshotRepository(session_factory).list_revisions(
        persisted_diagram_id
    )

    assert revisions == [1, 2, 3]

    async with session_factory() as session:
        persisted = list(
            await session.scalars(
                select(PidDocumentSnapshot.revision).where(
                    PidDocumentSnapshot.diagram_id == persisted_diagram_id
                )
            )
        )
    assert sorted(persisted) == revisions
