import os
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from pid.models import AccessScope
from pid.repositories.snapshots import SnapshotRepository, SnapshotDiagramNotFound
from pid.services.diagram_service import DiagramService

router = APIRouter(prefix="/api/pid", tags=["pid"])


class CreateDiagramRequest(BaseModel):
    title: str = Field(..., min_length=1)
    catalog_version: str = "local-v1"


class CreateDiagramResponse(BaseModel):
    diagram_id: UUID
    view_token: str
    edit_token: str
    document: dict
    revision: int


class OpenDiagramRequest(BaseModel):
    token: str


class OpenDiagramResponse(BaseModel):
    scope: str
    document: dict
    revision: int


class SaveDocumentRequest(BaseModel):
    token: str
    document: dict
    expected_revision: int


class SaveDocumentResponse(BaseModel):
    revision: int


class RegenerateTokenRequest(BaseModel):
    edit_token: str
    scope: str
    expected_revision: int


class RegenerateTokenResponse(BaseModel):
    token: str
    revision: int


class TokenActionRequest(BaseModel):
    edit_token: str
    expected_revision: int


class RevisionResponse(BaseModel):
    revision: int


def _resolve_token_pepper() -> str:
    pepper = os.getenv("PID_TOKEN_PEPPER", "")
    if not pepper or len(pepper) < 32:
        raise RuntimeError("PID_TOKEN_PEPPER must be at least 32 characters")
    return pepper


def _service(request: Request) -> DiagramService:
    runtime = request.app.state.pid_runtime
    if runtime is None:
        raise HTTPException(status_code=503, detail="PID not configured")
    return DiagramService(runtime.session_factory, _resolve_token_pepper())


def _snapshots(request: Request) -> SnapshotRepository:
    runtime = request.app.state.pid_runtime
    if runtime is None:
        raise HTTPException(status_code=503, detail="PID not configured")
    return SnapshotRepository(runtime.session_factory)


def _empty_document(diagram_id: UUID, title: str, catalog_version: str) -> dict:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    return {
        "schemaVersion": 1,
        "id": str(diagram_id),
        "metadata": {
            "title": title,
            "standard": "free",
            "catalogVersion": catalog_version,
            "createdAt": now,
            "updatedAt": now,
            "utilityCategories": [],
        },
        "nodes": {},
        "ports": {},
        "edges": {},
        "annotations": {},
        "groups": {},
    }


@router.post("/diagrams", response_model=CreateDiagramResponse, status_code=201)
async def create_diagram(body: CreateDiagramRequest, request: Request):
    service = _service(request)
    created = await service.create(body.title, body.catalog_version)
    document = _empty_document(created.diagram_id, body.title, body.catalog_version)

    snapshots = _snapshots(request)
    revision = await snapshots.append(
        created.diagram_id,
        yjs_state=b"",
        document_projection=document,
        schema_version=1,
        is_valid=True,
    )

    return CreateDiagramResponse(
        diagram_id=created.diagram_id,
        view_token=created.view_token,
        edit_token=created.edit_token,
        document=document,
        revision=revision,
    )


@router.post("/diagrams/{diagram_id}/open", response_model=OpenDiagramResponse)
async def open_diagram(diagram_id: UUID, body: OpenDiagramRequest, request: Request):
    service = _service(request)
    result = await service.open_document(diagram_id, body.token)
    if result is None:
        raise HTTPException(status_code=404, detail="Diagram not found or access denied")
    return OpenDiagramResponse(
        scope=result.scope.value,
        document=result.document,
        revision=result.revision,
    )


@router.put("/diagrams/{diagram_id}/document", response_model=SaveDocumentResponse)
async def save_document(diagram_id: UUID, body: SaveDocumentRequest, request: Request):
    service = _service(request)
    revision = await service.save_document(
        diagram_id, body.token, body.document, body.expected_revision,
    )
    if revision is None:
        raise HTTPException(status_code=409, detail="Conflict or access denied")
    return SaveDocumentResponse(revision=revision)


@router.post("/diagrams/{diagram_id}/tokens", response_model=RegenerateTokenResponse)
async def regenerate_token(diagram_id: UUID, body: RegenerateTokenRequest, request: Request):
    try:
        scope = AccessScope(body.scope)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scope")

    service = _service(request)
    token = await service.regenerate_token(diagram_id, scope, body.edit_token)
    if token is None:
        raise HTTPException(status_code=403, detail="Access denied")

    snapshots = _snapshots(request)
    revision = await snapshots.get_latest_revision(diagram_id)
    return RegenerateTokenResponse(token=token, revision=revision or 0)


@router.delete("/diagrams/{diagram_id}", response_model=RevisionResponse)
async def soft_delete_diagram(diagram_id: UUID, body: TokenActionRequest, request: Request):
    service = _service(request)
    ok = await service.soft_delete(diagram_id, body.edit_token)
    if not ok:
        raise HTTPException(status_code=404, detail="Diagram not found or access denied")

    snapshots = _snapshots(request)
    revision = await snapshots.get_latest_revision(diagram_id)
    return RevisionResponse(revision=revision or 0)


@router.post("/diagrams/{diagram_id}/restore", response_model=RevisionResponse)
async def restore_diagram(diagram_id: UUID, body: TokenActionRequest, request: Request):
    service = _service(request)
    ok = await service.restore(diagram_id, body.edit_token)
    if not ok:
        raise HTTPException(status_code=404, detail="Diagram not found or restore expired")

    snapshots = _snapshots(request)
    revision = await snapshots.get_latest_revision(diagram_id)
    return RevisionResponse(revision=revision or 0)
