import pytest
from uuid import uuid4

from pid.models import AccessScope
from pid.repositories.snapshots import SnapshotRepository
from pid.services.diagram_service import DiagramService, DiagramNotFoundError


@pytest.mark.asyncio
async def test_open_document_returns_document_and_revision(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")
    snapshots = SnapshotRepository(session_factory)

    doc = {"schemaVersion": 1, "id": str(created.diagram_id), "metadata": {}, "nodes": {}, "ports": {}, "edges": {}, "annotations": {}, "groups": {}}
    rev = await snapshots.append(created.diagram_id, yjs_state=b"x", document_projection=doc, schema_version=1, is_valid=True)

    result = await service.open_document(created.diagram_id, created.view_token)
    assert result is not None
    assert result.scope == AccessScope.VIEW
    assert result.document == doc
    assert result.revision == rev


@pytest.mark.asyncio
async def test_open_document_denies_invalid_token(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")
    result = await service.open_document(created.diagram_id, "bad-token")
    assert result is None


@pytest.mark.asyncio
async def test_open_document_returns_none_for_deleted_diagram(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")
    snapshots = SnapshotRepository(session_factory)
    doc = {"v": 1}
    await snapshots.append(created.diagram_id, yjs_state=b"x", document_projection=doc, schema_version=1, is_valid=True)

    await service.soft_delete(created.diagram_id, created.edit_token)
    result = await service.open_document(created.diagram_id, created.view_token)
    assert result is None


@pytest.mark.asyncio
async def test_save_document_increments_revision(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")

    doc = {"schemaVersion": 1, "id": str(created.diagram_id), "v": 1}
    rev1 = await service.save_document(created.diagram_id, created.edit_token, doc, expected_revision=0)
    assert rev1 == 1

    doc["v"] = 2
    rev2 = await service.save_document(created.diagram_id, created.edit_token, doc, expected_revision=1)
    assert rev2 == 2

    opened = await service.open_document(created.diagram_id, created.view_token)
    assert opened.document == doc


@pytest.mark.asyncio
async def test_save_document_rejects_view_token(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")
    doc = {"v": 1}
    rev = await service.save_document(created.diagram_id, created.view_token, doc, expected_revision=0)
    assert rev is None


@pytest.mark.asyncio
async def test_save_document_rejects_wrong_revision(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")

    doc = {"v": 1}
    await service.save_document(created.diagram_id, created.edit_token, doc, expected_revision=0)
    rev = await service.save_document(created.diagram_id, created.edit_token, {"v": 2}, expected_revision=0)
    assert rev is None


@pytest.mark.asyncio
async def test_save_document_rejects_deleted_diagram(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")
    doc = {"v": 1}
    await service.save_document(created.diagram_id, created.edit_token, doc, expected_revision=0)

    await service.soft_delete(created.diagram_id, created.edit_token)
    rev = await service.save_document(created.diagram_id, created.edit_token, {"v": 2}, expected_revision=1)
    assert rev is None


@pytest.mark.asyncio
async def test_regenerate_token_with_valid_edit_token(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")

    new_token = await service.regenerate_token(
        created.diagram_id, AccessScope.VIEW, created.edit_token,
    )
    assert new_token is not None
    assert await service.authorize(created.diagram_id, created.view_token) is None
    assert await service.authorize(created.diagram_id, new_token) is AccessScope.VIEW


@pytest.mark.asyncio
async def test_regenerate_token_denies_view_token(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")

    result = await service.regenerate_token(
        created.diagram_id, AccessScope.VIEW, created.view_token,
    )
    assert result is None
    assert await service.authorize(created.diagram_id, created.view_token) is AccessScope.VIEW


@pytest.mark.asyncio
async def test_regenerate_token_denies_wrong_token(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")

    result = await service.regenerate_token(
        created.diagram_id, AccessScope.VIEW, "wrong-token",
    )
    assert result is None
    assert await service.authorize(created.diagram_id, created.view_token) is AccessScope.VIEW


@pytest.mark.asyncio
async def test_regenerate_token_denies_nonexistent_diagram(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)

    result = await service.regenerate_token(
        uuid4(), AccessScope.VIEW, "any-token",
    )
    assert result is None


@pytest.mark.asyncio
async def test_regenerate_token_denies_deleted_diagram(session_factory, token_pepper):
    service = DiagramService(session_factory, token_pepper)
    created = await service.create("Test Doc", "local-v1")
    await service.soft_delete(created.diagram_id, created.edit_token)

    result = await service.regenerate_token(
        created.diagram_id, AccessScope.VIEW, created.edit_token,
    )
    assert result is None
