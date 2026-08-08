import asyncio
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select, update

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
