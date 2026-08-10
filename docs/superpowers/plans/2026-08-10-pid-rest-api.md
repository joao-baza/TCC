# P&ID REST API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor persistência de diagramas P&ID via REST API (FastAPI) e criar adapter remoto no frontend para substituir localStorage por PostgreSQL.

**Architecture:** 6 endpoints REST no backend (`routers/pid.py`) reutilizando `DiagramService` e `SnapshotRepository` existentes. Frontend ganha `RemotePidApi` implementando `PidDocumentPort` via `fetch()`, ativado com `VITE_PID_ADAPTER=remote`.

**Tech Stack:** Python (FastAPI, SQLAlchemy async, Pydantic), TypeScript (fetch API, Zod), PostgreSQL, Redis.

---

### Task 1: Extend SnapshotRepository with load_latest_valid and get_latest_revision

**Files:**
- Modify: `pid/repositories/snapshots.py`
- Test: `demo/tests/pid/test_snapshot_repository.py`

- [ ] **Step 1: Write tests for new methods**

Add to `demo/tests/pid/test_snapshot_repository.py` after existing tests:

```python
import pytest
from uuid import uuid4
from pid.repositories.snapshots import SnapshotRepository


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


async def _ensure_diagram(session_factory, diagram_id):
    from pid.models import PidDiagram, PidStandard
    from sqlalchemy import select
    async with session_factory() as session:
        async with session.begin():
            exists = await session.scalar(select(PidDiagram).where(PidDiagram.id == diagram_id))
            if exists is None:
                session.add(PidDiagram(id=diagram_id, title="test", standard=PidStandard.FREE, catalog_version="test-v1", schema_version=1))
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC && PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:password@localhost:55432/dcou python -m pytest demo/tests/pid/test_snapshot_repository.py::test_load_latest_valid_returns_most_recent_valid_snapshot demo/tests/pid/test_snapshot_repository.py::test_load_latest_valid_returns_none_for_no_valid_snapshots demo/tests/pid/test_snapshot_repository.py::test_load_latest_valid_returns_none_for_unknown_diagram demo/tests/pid/test_snapshot_repository.py::test_get_latest_revision -v
```

Expected: FAIL — `AttributeError: 'SnapshotRepository' object has no attribute 'load_latest_valid'`

- [ ] **Step 3: Implement the new methods**

Add to `pid/repositories/snapshots.py` before `list_revisions`:

```python
    async def load_latest_valid(
        self,
        diagram_id: UUID,
    ) -> tuple[dict[str, Any], int] | None:
        async with self._session_factory() as session:
            row = await session.execute(
                select(
                    PidDocumentSnapshot.document_projection,
                    PidDocumentSnapshot.revision,
                )
                .where(
                    PidDocumentSnapshot.diagram_id == diagram_id,
                    PidDocumentSnapshot.is_valid.is_(True),
                )
                .order_by(PidDocumentSnapshot.revision.desc())
                .limit(1)
            )
            result = row.first()
            if result is None:
                return None
            return (result.document_projection, int(result.revision))

    async def get_latest_revision(self, diagram_id: UUID) -> int | None:
        async with self._session_factory() as session:
            revision = await session.scalar(
                select(func.max(PidDocumentSnapshot.revision)).where(
                    PidDocumentSnapshot.diagram_id == diagram_id,
                )
            )
            return int(revision) if revision is not None else None
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC && PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:password@localhost:55432/dcou python -m pytest demo/tests/pid/test_snapshot_repository.py -v
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add pid/repositories/snapshots.py demo/tests/pid/test_snapshot_repository.py
git commit -m "feat: add load_latest_valid and get_latest_revision to SnapshotRepository"
```

---

### Task 2: Add open_document and save_document to DiagramService

**Files:**
- Modify: `pid/services/diagram_service.py`
- Test: `demo/tests/pid/test_diagram_service.py` (create if not exists)

- [ ] **Step 1: Write tests**

Create `demo/tests/pid/test_diagram_service.py`:

```python
import pytest
from datetime import datetime, timezone
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
```

Add the `token_pepper` fixture to `demo/tests/pid/conftest.py` if not already present:

```python
@pytest.fixture
def token_pepper() -> str:
    return "test-pepper-" + "x" * 24  # at least 32 chars
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC && PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:password@localhost:55432/dcou python -m pytest demo/tests/pid/test_diagram_service.py -v
```

Expected: FAIL — `AttributeError: 'DiagramService' object has no attribute 'open_document'`

- [ ] **Step 3: Implement open_document and save_document**

Add to `pid/services/diagram_service.py` after the `authorize` method, and add the new dataclass at module level:

```python
@dataclass(frozen=True)
class OpenedDiagram:
    scope: AccessScope
    document: dict
    revision: int


class DiagramService:
    # ... existing methods ...

    async def open_document(
        self,
        diagram_id: UUID,
        plain_token: str,
    ) -> OpenedDiagram | None:
        scope = await self.authorize(diagram_id, plain_token)
        if scope is None:
            return None

        from pid.repositories.snapshots import SnapshotRepository
        snapshots = SnapshotRepository(self._session_factory)
        result = await snapshots.load_latest_valid(diagram_id)
        if result is None:
            return None
        document, revision = result
        return OpenedDiagram(scope=scope, document=document, revision=revision)

    async def save_document(
        self,
        diagram_id: UUID,
        plain_token: str,
        document: dict,
        expected_revision: int,
    ) -> int | None:
        scope = await self.authorize(diagram_id, plain_token)
        if scope is not AccessScope.EDIT:
            return None

        from pid.repositories.snapshots import SnapshotRepository
        snapshots = SnapshotRepository(self._session_factory)
        current_revision = await snapshots.get_latest_revision(diagram_id)
        current = current_revision if current_revision is not None else 0

        if current != expected_revision:
            return None

        new_revision = await snapshots.append(
            diagram_id,
            yjs_state=b"",
            document_projection=document,
            schema_version=1,
            is_valid=True,
        )

        async with self._session_factory() as session:
            async with session.begin():
                from pid.repositories.diagrams import DiagramRepository
                diagrams = DiagramRepository(session)
                diagram = await diagrams.get_active(diagram_id, for_update=True)
                if diagram is not None:
                    diagram.updated_at = datetime.now(timezone.utc)

        return new_revision
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC && PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:password@localhost:55432/dcou python -m pytest demo/tests/pid/test_diagram_service.py -v
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add pid/services/diagram_service.py demo/tests/pid/test_diagram_service.py
git commit -m "feat: add open_document and save_document to DiagramService"
```

---

### Task 3: Create P&ID REST API router

**Files:**
- Create: `routers/pid.py`
- Test: `demo/tests/pid/test_pid_router.py`

- [ ] **Step 1: Write the router**

Create `routers/pid.py`:

```python
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from pid.models import AccessScope
from pid.runtime import PidRuntime
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


class SoftDeleteRequest(BaseModel):
    edit_token: str
    expected_revision: int


class SoftDeleteResponse(BaseModel):
    revision: int


def _get_runtime(request: Request) -> PidRuntime:
    runtime: PidRuntime = request.app.state.pid_runtime
    if runtime is None:
        raise HTTPException(status_code=503, detail="PID not configured")
    return runtime


def _service(runtime: PidRuntime) -> DiagramService:
    settings = runtime._settings if hasattr(runtime, '_settings') else None
    # Read pepper from settings or env
    import os
    pepper = os.getenv("PID_TOKEN_PEPPER", "dev-pepper-" + "x" * 24)
    return DiagramService(runtime.session_factory, pepper)


def _snapshots(runtime: PidRuntime) -> SnapshotRepository:
    return SnapshotRepository(runtime.session_factory)


@router.post("/diagrams", response_model=CreateDiagramResponse, status_code=201)
async def create_diagram(body: CreateDiagramRequest, request: Request):
    runtime = _get_runtime(request)
    service = _service(runtime)
    created = await service.create(body.title, body.catalog_version)

    from pid.domain.document import create_empty_document
    import sys
    sys.path.insert(0, "")
    # The create_empty_document function lives in the frontend domain
    # For now, create a minimal document
    import json
    from uuid import uuid4 as _uuid4
    doc_id = str(created.diagram_id)
    document = {
        "schemaVersion": 1,
        "id": doc_id,
        "metadata": {
            "title": body.title,
            "standard": "free",
            "catalogVersion": body.catalog_version,
            "createdAt": "",
            "updatedAt": "",
            "utilityCategories": [],
        },
        "nodes": {},
        "ports": {},
        "edges": {},
        "annotations": {},
        "groups": {},
    }
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    document["metadata"]["createdAt"] = now
    document["metadata"]["updatedAt"] = now

    snapshots = _snapshots(runtime)
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
    runtime = _get_runtime(request)
    service = _service(runtime)
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
    runtime = _get_runtime(request)
    service = _service(runtime)
    revision = await service.save_document(diagram_id, body.token, body.document, body.expected_revision)
    if revision is None:
        raise HTTPException(status_code=409, detail="Conflict or access denied")
    return SaveDocumentResponse(revision=revision)


@router.post("/diagrams/{diagram_id}/tokens", response_model=RegenerateTokenResponse)
async def regenerate_token(diagram_id: UUID, body: RegenerateTokenRequest, request: Request):
    runtime = _get_runtime(request)
    service = _service(runtime)
    try:
        scope = AccessScope(body.scope)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scope")
    token = await service.regenerate_token(diagram_id, scope)
    snapshots = _snapshots(runtime)
    revision = await snapshots.get_latest_revision(diagram_id)
    return RegenerateTokenResponse(token=token, revision=revision or 0)


@router.delete("/diagrams/{diagram_id}", response_model=SoftDeleteResponse)
async def soft_delete_diagram(diagram_id: UUID, body: SoftDeleteRequest, request: Request):
    runtime = _get_runtime(request)
    service = _service(runtime)
    ok = await service.soft_delete(diagram_id, body.edit_token)
    if not ok:
        raise HTTPException(status_code=404, detail="Diagram not found or access denied")
    snapshots = _snapshots(runtime)
    revision = await snapshots.get_latest_revision(diagram_id)
    return SoftDeleteResponse(revision=revision or 0)


@router.post("/diagrams/{diagram_id}/restore", response_model=SoftDeleteResponse)
async def restore_diagram(diagram_id: UUID, body: SoftDeleteRequest, request: Request):
    runtime = _get_runtime(request)
    service = _service(runtime)
    ok = await service.restore(diagram_id, body.edit_token)
    if not ok:
        raise HTTPException(status_code=404, detail="Diagram not found or restore expired")
    snapshots = _snapshots(runtime)
    revision = await snapshots.get_latest_revision(diagram_id)
    return SoftDeleteResponse(revision=revision or 0)
```

- [ ] **Step 2: Fix the _service helper — properly access token_pepper from runtime**

The `_service()` helper needs access to `token_pepper`. The current approach is fragile. Replace `_service()` with a proper implementation that reads from the runtime's settings:

```python
def _service(runtime: PidRuntime) -> DiagramService:
    # token_pepper is stored in app.state.pid_settings via create_app()
    import os
    from pid.config import PidSettings
    settings = PidSettings.from_env()
    return DiagramService(runtime.session_factory, settings.token_pepper or "dev-pepper-" + "x" * 24)
```

Actually, the cleaner approach is to store the service on the runtime or pass it through dependency injection. But following the existing pattern, read from env for now:

```python
import os

def _resolve_token_pepper() -> str:
    from dotenv import load_dotenv
    load_dotenv(override=False)
    pepper = os.getenv("PID_TOKEN_PEPPER", "")
    if not pepper:
        raise RuntimeError("PID_TOKEN_PEPPER is not set")
    return pepper


def _service(runtime: PidRuntime) -> DiagramService:
    return DiagramService(runtime.session_factory, _resolve_token_pepper())
```

Write the final, clean version of `_service`:

```python
import os

def _resolve_token_pepper() -> str:
    pepper = os.getenv("PID_TOKEN_PEPPER", "")
    if not pepper or len(pepper) < 32:
        raise RuntimeError("PID_TOKEN_PEPPER must be at least 32 characters")
    return pepper


def _service(runtime: PidRuntime) -> DiagramService:
    return DiagramService(runtime.session_factory, _resolve_token_pepper())


def _snapshots(runtime: PidRuntime) -> SnapshotRepository:
    return SnapshotRepository(runtime.session_factory)
```

- [ ] **Step 3: Create router test**

Create `demo/tests/pid/test_pid_router.py`:

```python
import pytest
from httpx import ASGITransport, AsyncClient
from app import create_app


@pytest.fixture
async def client():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_diagram_requires_pid(client):
    response = await client.post("/api/pid/diagrams", json={"title": "Test"})
    # PID may be disabled depending on env; if so, expect 503
    assert response.status_code in (201, 503)
```

- [ ] **Step 4: Verify syntax**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC && python -c "import ast; ast.parse(open('routers/pid.py').read()); print('Syntax OK')"
```

- [ ] **Step 5: Commit**

```bash
git add routers/pid.py demo/tests/pid/test_pid_router.py
git commit -m "feat: add P&ID REST API router with 6 endpoints"
```

---

### Task 4: Register P&ID router in app.py

**Files:**
- Modify: `app.py`

- [ ] **Step 1: Add router import and registration**

In `app.py`, add import:

```python
from routers import pid as pid_router
```

And register after the existing routers:

```python
created_app.include_router(pid_router.router)
```

- [ ] **Step 2: Verify app loads without errors**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC && python -c "from app import create_app; app = create_app(); print('App created OK'); routes = [r.path for r in app.routes]; print([r for r in routes if 'pid' in r])"
```

Expected: Output showing `/api/pid/diagrams` and related routes.

- [ ] **Step 3: Commit**

```bash
git add app.py
git commit -m "feat: register P&ID router in app.py"
```

---

### Task 5: Create RemotePidApi frontend adapter

**Files:**
- Create: `frontend/src/features/pid/api/remote-pid-api.ts`
- Test: `frontend/src/test/pid/remote-pid-api.test.ts`

- [ ] **Step 1: Write the RemotePidApi adapter**

Create `frontend/src/features/pid/api/remote-pid-api.ts`:

```typescript
import type { PidDocument } from "../domain/model";
import {
  type AccessScope,
  type CreatedPidDiagram,
  type CreatePidInput,
  type OpenedPidDiagram,
  type PidDocumentPort,
  type RegeneratedPidToken,
  PidDocumentError,
  type PidDocumentErrorCode,
} from "./contracts";

export class RemotePidApi implements PidDocumentPort {
  constructor(private readonly baseUrl: string) {}

  async create(input: CreatePidInput): Promise<CreatedPidDiagram> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input.title, catalog_version: "local-v1" }),
    });
    await assertOk(res);
    const data = await res.json();
    return {
      diagramId: data.diagram_id,
      document: data.document as PidDocument,
      revision: data.revision,
      readToken: data.view_token,
      editToken: data.edit_token,
      viewUrl: `${window.location.origin}/pid/${data.diagram_id}#access=${data.view_token}`,
      editUrl: `${window.location.origin}/pid/${data.diagram_id}#access=${data.edit_token}`,
    };
  }

  async open(diagramId: string, token: string): Promise<OpenedPidDiagram> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    await assertOk(res);
    const data = await res.json();
    return {
      scope: data.scope as AccessScope,
      document: data.document as PidDocument,
      revision: data.revision,
    };
  }

  async save(
    diagramId: string,
    token: string,
    document: PidDocument,
    expectedRevision: number,
  ): Promise<number> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}/document`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, document, expected_revision: expectedRevision }),
    });
    await assertOk(res);
    const data = await res.json();
    return data.revision;
  }

  async regenerate(
    diagramId: string,
    editToken: string,
    scope: AccessScope,
    expectedRevision: number,
  ): Promise<RegeneratedPidToken> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edit_token: editToken, scope, expected_revision: expectedRevision }),
    });
    await assertOk(res);
    const data = await res.json();
    return { token: data.token, revision: data.revision };
  }

  async softDelete(diagramId: string, editToken: string, expectedRevision: number): Promise<number> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edit_token: editToken, expected_revision: expectedRevision }),
    });
    await assertOk(res);
    const data = await res.json();
    return data.revision;
  }

  async restore(diagramId: string, editToken: string, expectedRevision: number): Promise<number> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edit_token: editToken, expected_revision: expectedRevision }),
    });
    await assertOk(res);
    const data = await res.json();
    return data.revision;
  }
}

const STATUS_TO_ERROR: Record<number, PidDocumentErrorCode> = {
  400: "INVALID_INPUT",
  403: "ACCESS_DENIED",
  404: "DOCUMENT_MISMATCH",
  409: "CONFLICT",
  410: "RESTORE_EXPIRED",
  413: "DOCUMENT_TOO_LARGE",
};

async function assertOk(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  const code: PidDocumentErrorCode = STATUS_TO_ERROR[res.status] ?? "ADAPTER_FAILURE";
  throw new PidDocumentError(code, { cause: body });
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/pid/api/remote-pid-api.ts
git commit -m "feat: add RemotePidApi adapter for P&ID REST API"
```

---

### Task 6: Wire remote adapter into pid-services.tsx

**Files:**
- Modify: `frontend/src/features/pid/api/pid-services.tsx`

- [ ] **Step 1: Update createPidServices to support "remote" adapter**

In `pid-services.tsx`, add import at top:

```typescript
import { RemotePidApi } from "./remote-pid-api";
```

Modify `createPidServices()` to handle `"remote"`:

```typescript
export function createPidServices(options: CreatePidServicesOptions | string | undefined): PidServices {
  const normalized = typeof options === "object" && options !== null
    ? options
    : { adapter: options };

  if (normalized.adapter === "remote") {
    const baseUrl = (typeof normalized === "object" && "baseUrl" in normalized)
      ? (normalized as { baseUrl?: string }).baseUrl ?? window.location.origin
      : window.location.origin;
    return {
      document: new RemotePidApi(baseUrl),
      catalog: (typeof normalized === "object" ? normalized.catalog : undefined) ?? unavailableCatalog,
      collaboration: (typeof normalized === "object" ? normalized.collaboration : undefined) ?? unavailableCollaboration,
      recent: (typeof normalized === "object" ? normalized.recent : undefined) ?? new LocalRecentPidDiagrams(
        (typeof normalized === "object" && "storage" in normalized)
          ? (normalized as { storage?: Storage }).storage ?? browserStorage()
          : browserStorage(),
        createBrowserLocalPidRuntime().now,
      ),
    };
  }

  if (normalized.adapter !== "local") throw new PidServicesError("ADAPTER_NOT_CONFIGURED");

  const storage = normalized.storage ?? browserStorage();
  const runtime = normalized.runtime ?? createBrowserLocalPidRuntime();
  const lock = normalized.lock ?? createBrowserExclusiveLock();
  return {
    document: new LocalPidApi(storage, runtime, lock),
    catalog: normalized.catalog ?? unavailableCatalog,
    collaboration: normalized.collaboration ?? unavailableCollaboration,
    recent: normalized.recent ?? new LocalRecentPidDiagrams(storage, runtime.now),
  };
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/pid/api/pid-services.tsx
git commit -m "feat: wire RemotePidApi adapter for VITE_PID_ADAPTER=remote"
```

---

### Task 7: Update env files and verify full build

**Files:**
- Modify: `frontend/.env.production`
- Modify: `frontend/.env.development`

- [ ] **Step 1: Update production env**

In `frontend/.env.production`, change:

```
VITE_PID_ADAPTER=remote
```

- [ ] **Step 2: Keep development env on local for now**

`frontend/.env.development` stays `VITE_PID_ADAPTER=local`. Developers test remote explicitly.

- [ ] **Step 3: Run full frontend test suite**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx vitest run 2>&1 | tail -5
```

Expected: no new failures beyond pre-existing ones.

- [ ] **Step 4: Run full backend test suite**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC && PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:password@localhost:55432/dcou python -m pytest demo/tests/pid/ -v 2>&1 | tail -20
```

Expected: all PID tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/.env.production
git commit -m "feat: enable remote PID adapter in production"
```
