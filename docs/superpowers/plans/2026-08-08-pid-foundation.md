# Fundação do Editor P&ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a fundação persistente e operacional do editor P&ID: configuração por `.env`, PostgreSQL com migrations e repositórios, tickets efêmeros no Redis, versionamento verificável do catálogo e serviços Docker Swarm, sem criar ainda o canvas ou o gateway colaborativo.

**Architecture:** Um novo pacote Python `pid` isolará domínio, persistência e catálogo do código de cálculos existente. SQLAlchemy assíncrono e Alembic controlarão o PostgreSQL; `redis.asyncio` armazenará tickets de uso único. A API continuará inicializando sem esses serviços quando `PID_ENABLED=false`, preservando testes e o aplicativo desktop, enquanto a implantação web habilitará a fundação e usará `/ready` para verificar PostgreSQL e Redis.

**Tech Stack:** Python 3.10+, FastAPI, SQLAlchemy 2, Psycopg 3, Alembic, Redis 7, python-dotenv, jsonschema, Pytest, pytest-asyncio, Docker Compose/Swarm.

---

## Limite desta entrega

Esta entrega cria infraestrutura e contratos testáveis. Ela não adiciona React Flow, rotas de criação de fluxogramas, Yjs, Hocuspocus, WebSocket, SVGs finais ou ingestão integral dos catálogos ISA/ISO. O manifesto inicial fica em estado `draft`; a ativação de um catálogo completo pertence à Entrega 4.

## Mapa de arquivos

| Responsabilidade | Arquivos |
| --- | --- |
| Configuração | `pid/config.py`, `.env.example` |
| Banco e modelos | `pid/database.py`, `pid/models.py`, `alembic.ini`, `migrations/**` |
| Segurança | `pid/security.py`, `pid/services/diagram_service.py` |
| Persistência | `pid/repositories/diagrams.py`, `pid/repositories/tokens.py`, `pid/repositories/snapshots.py`, `pid/repositories/catalogs.py` |
| Tickets Redis | `pid/tickets.py` |
| Catálogo | `pid/catalog/manifest.schema.json`, `pid/catalog/validator.py`, `pid/catalog/sources.json`, `pid/catalog/manifests/**`, `THIRD_PARTY_NOTICES.md` |
| Inicialização da API | `pid/runtime.py`, `app.py` |
| Implantação | `deploy/docker-compose.yaml`, `deploy/docker-compose.test.yaml`, `deploy/start-api.sh`, `deploy/deploy.sh`, `deploy/Dockerfile.api` |
| Testes | `demo/tests/pid/**`, `demo/tests/test_pid_deploy.py` |
| CI e documentação | `.github/workflows/ci.yml`, `README.md` |

### Task 1: Configuração tipada e dependências

**Files:**
- Create: `pid/__init__.py`
- Create: `pid/config.py`
- Create: `.env.example`
- Modify: `requirements.txt`
- Test: `demo/tests/pid/test_config.py`

- [ ] **Step 1: Escrever os testes que definem o contrato de configuração**

```python
# demo/tests/pid/test_config.py
import pytest

from pid.config import PidSettings


PID_ENV_KEYS = (
    "PID_ENABLED",
    "DATABASE_URL",
    "REDIS_URL",
    "PID_TOKEN_PEPPER",
    "PID_ALLOWED_ORIGINS",
    "PID_WS_PUBLIC_URL",
)


def clear_pid_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in PID_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


def test_pid_is_disabled_without_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    clear_pid_env(monkeypatch)
    settings = PidSettings.from_env(load_file=False)
    assert settings.enabled is False
    assert settings.database_url is None
    assert settings.redis_url is None


def test_enabled_pid_requires_all_runtime_values(monkeypatch: pytest.MonkeyPatch) -> None:
    clear_pid_env(monkeypatch)
    monkeypatch.setenv("PID_ENABLED", "true")
    with pytest.raises(ValueError, match="DATABASE_URL"):
        PidSettings.from_env(load_file=False)


def test_enabled_pid_parses_exact_origin_allowlist(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_pid_env(monkeypatch)
    monkeypatch.setenv("PID_ENABLED", "true")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://dcou:secret@localhost:5432/dcou",
    )
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("PID_TOKEN_PEPPER", "0123456789abcdef0123456789abcdef")
    monkeypatch.setenv(
        "PID_ALLOWED_ORIGINS",
        "https://tcc.joao.baza.dev.br,http://localhost:5173",
    )
    monkeypatch.setenv("PID_WS_PUBLIC_URL", "wss://tcc.joao.baza.dev.br/pid/ws")

    settings = PidSettings.from_env(load_file=False)

    assert settings.enabled is True
    assert settings.allowed_origins == (
        "https://tcc.joao.baza.dev.br",
        "http://localhost:5173",
    )
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `pytest demo/tests/pid/test_config.py -q`

Expected: FAIL com `ModuleNotFoundError: No module named 'pid'`.

- [ ] **Step 3: Adicionar dependências e implementar `PidSettings`**

Adicionar a `requirements.txt`:

```text
SQLAlchemy>=2.0,<3
alembic>=1.13,<2
psycopg[binary]>=3.2,<4
redis>=5,<6
python-dotenv>=1,<2
jsonschema>=4.23,<5
pytest-asyncio>=0.24,<1
```

Criar `pid/__init__.py` vazio e implementar:

```python
# pid/config.py
from dataclasses import dataclass
import os

from dotenv import load_dotenv


TRUE_VALUES = {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class PidSettings:
    enabled: bool
    database_url: str | None
    redis_url: str | None
    token_pepper: str | None
    allowed_origins: tuple[str, ...]
    ws_public_url: str | None

    @classmethod
    def from_env(cls, *, load_file: bool = True) -> "PidSettings":
        if load_file:
            load_dotenv(override=False)

        enabled = os.getenv("PID_ENABLED", "false").strip().lower() in TRUE_VALUES
        settings = cls(
            enabled=enabled,
            database_url=_optional("DATABASE_URL"),
            redis_url=_optional("REDIS_URL"),
            token_pepper=_optional("PID_TOKEN_PEPPER"),
            allowed_origins=tuple(
                origin.strip()
                for origin in os.getenv("PID_ALLOWED_ORIGINS", "").split(",")
                if origin.strip()
            ),
            ws_public_url=_optional("PID_WS_PUBLIC_URL"),
        )
        settings.validate()
        return settings

    def validate(self) -> None:
        if not self.enabled:
            return
        required = {
            "DATABASE_URL": self.database_url,
            "REDIS_URL": self.redis_url,
            "PID_TOKEN_PEPPER": self.token_pepper,
            "PID_ALLOWED_ORIGINS": self.allowed_origins,
            "PID_WS_PUBLIC_URL": self.ws_public_url,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise ValueError("Missing PID settings: " + ", ".join(missing))
        if len(self.token_pepper or "") < 32:
            raise ValueError("PID_TOKEN_PEPPER must have at least 32 characters")


def _optional(name: str) -> str | None:
    value = os.getenv(name, "").strip()
    return value or None
```

Criar `.env.example` com valores não secretos:

```dotenv
PID_ENABLED=true
POSTGRES_DB=dcou
POSTGRES_USER=dcou
POSTGRES_PASSWORD=change-this-local-password
DATABASE_URL=postgresql+psycopg://dcou:change-this-local-password@tcc-postgres:5432/dcou
REDIS_URL=redis://tcc-redis:6379/0
PID_TOKEN_PEPPER=change-this-32-character-minimum-value
PID_ALLOWED_ORIGINS=https://tcc.joao.baza.dev.br,http://localhost:5173
PID_WS_PUBLIC_URL=wss://tcc.joao.baza.dev.br/pid/ws
```

- [ ] **Step 4: Executar o teste de configuração**

Run: `pytest demo/tests/pid/test_config.py -q`

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add requirements.txt .env.example pid/__init__.py pid/config.py demo/tests/pid/test_config.py
git commit -m "feat(pid): add typed runtime configuration"
```

### Task 2: Schema PostgreSQL e migration inicial

**Files:**
- Create: `pid/database.py`
- Create: `pid/models.py`
- Create: `alembic.ini`
- Create: `migrations/env.py`
- Create: `migrations/script.py.mako`
- Create: `migrations/versions/20260808_0001_pid_foundation.py`
- Create: `deploy/docker-compose.test.yaml`
- Create: `demo/tests/pid/conftest.py`
- Test: `demo/tests/pid/test_migrations.py`
- Modify: `pytest.ini`

- [ ] **Step 1: Criar o ambiente PostgreSQL/Redis exclusivo para testes**

```yaml
# deploy/docker-compose.test.yaml
services:
  pid-postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dcou_test
      POSTGRES_USER: dcou
      POSTGRES_PASSWORD: dcou_test
    ports:
      - "55432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dcou -d dcou_test"]
      interval: 2s
      timeout: 2s
      retries: 20

  pid-redis-test:
    image: redis:7.4-alpine
    command: ["redis-server", "--save", "", "--appendonly", "no"]
    ports:
      - "56379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 2s
      retries: 20
```

- [ ] **Step 2: Escrever o teste da migration**

```python
# demo/tests/pid/test_migrations.py
from sqlalchemy import inspect


async def test_initial_migration_creates_pid_tables(engine) -> None:
    async with engine.connect() as connection:
        table_names = await connection.run_sync(
            lambda sync_connection: set(inspect(sync_connection).get_table_names())
        )

    assert {
        "alembic_version",
        "pid_diagrams",
        "pid_access_tokens",
        "pid_document_snapshots",
        "pid_catalog_versions",
    }.issubset(table_names)
```

Implementar as fixtures sem obrigar PostgreSQL nos testes unitários:

```python
# demo/tests/pid/conftest.py
import os

from alembic import command
from alembic.config import Config
import pytest
import pytest_asyncio
from sqlalchemy import text

from pid.database import create_pid_engine, create_session_factory


@pytest.fixture(scope="session")
def migrated_database_url() -> str:
    database_url = os.getenv("PID_TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("PID_TEST_DATABASE_URL is required for PostgreSQL tests")
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", database_url)
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    return database_url


@pytest_asyncio.fixture(scope="session")
async def engine(migrated_database_url):
    value = create_pid_engine(migrated_database_url)
    yield value
    await value.dispose()


@pytest_asyncio.fixture
async def session_factory(engine):
    async with engine.begin() as connection:
        await connection.execute(
            text(
                "TRUNCATE pid_document_snapshots, pid_access_tokens, "
                "pid_catalog_versions, pid_diagrams CASCADE"
            )
        )
    return create_session_factory(engine)
```

O `migrations/env.py` deve usar a URL de `alembic.ini`, substituída pela fixture, e executar migrations assíncronas com `async_engine_from_config`.

Usar exatamente `postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test` no comando local.

Acrescentar `asyncio_mode = auto` a `pytest.ini` para que fixtures e testes assíncronos não precisem repetir marcadores.

- [ ] **Step 3: Subir os serviços de teste e confirmar a falha**

Run:

```bash
docker compose -f deploy/docker-compose.test.yaml up -d --wait
PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test pytest demo/tests/pid/test_migrations.py -q
```

Expected: FAIL porque `pid.database`, os modelos e a configuração Alembic ainda não existem.

- [ ] **Step 4: Implementar banco, modelos e migration**

`pid/database.py` deve expor:

```python
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def create_pid_engine(database_url: str) -> AsyncEngine:
    return create_async_engine(database_url, pool_pre_ping=True)


def create_session_factory(
    engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)
```

`pid/models.py` deve declarar `Base`, `PidStandard`, `AccessScope`, `PidDiagram`, `PidAccessToken`, `PidDocumentSnapshot` e `PidCatalogVersion` com os campos da seção 10 da especificação. Regras obrigatórias:

- `PidStandard.ISA = "isa"`, `PidStandard.ISO = "iso"`, `AccessScope.VIEW = "view"` e `AccessScope.EDIT = "edit"`;
- UUIDs Python com `uuid.uuid4`;
- timestamps UTC com `server_default=func.now()`;
- `ondelete="CASCADE"` para tokens e snapshots;
- chave composta `(diagram_id, revision)` para snapshots;
- chave composta `(standard, version)` para catálogo;
- `JSONB` para `document_projection` e `BYTEA` para `yjs_state`;
- unicidade de `token_hash`;
- checks `revision > 0` e `schema_version > 0`;
- índices para `pid_diagrams.deleted_at`, `pid_diagrams.updated_at` e `pid_access_tokens.diagram_id`.

A migration `20260808_0001_pid_foundation.py` deve criar os enums PostgreSQL `pid_standard` e `pid_access_scope`, as quatro tabelas, constraints e índices acima; `downgrade()` deve removê-los em ordem inversa.

- [ ] **Step 5: Executar migration e inspeção**

Run:

```bash
PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test pytest demo/tests/pid/test_migrations.py -q
```

Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add pid/database.py pid/models.py alembic.ini migrations deploy/docker-compose.test.yaml demo/tests/pid/conftest.py demo/tests/pid/test_migrations.py pytest.ini
git commit -m "feat(pid): add PostgreSQL schema and migrations"
```

### Task 3: Geração e hashing de credenciais

**Files:**
- Create: `pid/security.py`
- Test: `demo/tests/pid/test_security.py`

- [ ] **Step 1: Escrever os testes de segurança**

```python
# demo/tests/pid/test_security.py
from pid.security import generate_secret, hash_secret, secret_matches


def test_generated_secrets_are_unique_and_url_safe() -> None:
    first = generate_secret()
    second = generate_secret()
    assert first != second
    assert len(first) >= 43
    assert all(character.isalnum() or character in "-_" for character in first)


def test_hash_uses_pepper_and_never_contains_plain_secret() -> None:
    secret = "view-token"
    first = hash_secret(secret, "a" * 32)
    second = hash_secret(secret, "b" * 32)
    assert first != second
    assert secret not in first
    assert secret_matches(secret, "a" * 32, first)
    assert not secret_matches("wrong-token", "a" * 32, first)
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `pytest demo/tests/pid/test_security.py -q`

Expected: FAIL com `ModuleNotFoundError: No module named 'pid.security'`.

- [ ] **Step 3: Implementar geração e HMAC**

```python
# pid/security.py
import hashlib
import hmac
import secrets


def generate_secret() -> str:
    return secrets.token_urlsafe(32)


def hash_secret(secret: str, pepper: str) -> str:
    return hmac.new(
        pepper.encode("utf-8"),
        secret.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def secret_matches(secret: str, pepper: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_secret(secret, pepper), expected_hash)
```

- [ ] **Step 4: Executar os testes**

Run: `pytest demo/tests/pid/test_security.py -q`

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add pid/security.py demo/tests/pid/test_security.py
git commit -m "feat(pid): add capability token primitives"
```

### Task 4: Repositórios de fluxogramas e tokens

**Files:**
- Create: `pid/repositories/__init__.py`
- Create: `pid/repositories/diagrams.py`
- Create: `pid/repositories/tokens.py`
- Create: `pid/services/__init__.py`
- Create: `pid/services/diagram_service.py`
- Test: `demo/tests/pid/test_diagram_repository.py`

- [ ] **Step 1: Escrever o teste de criação atômica**

```python
# demo/tests/pid/test_diagram_repository.py
from uuid import UUID

from pid.models import AccessScope, PidStandard
from pid.services.diagram_service import DiagramService


async def test_create_diagram_returns_uuid_and_two_plain_tokens(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)

    created = await service.create(
        title="Linha de reação",
        standard=PidStandard.ISO,
        catalog_version="0.1.0-foundation",
    )

    assert isinstance(created.diagram_id, UUID)
    assert created.view_token != created.edit_token
    assert await service.authorize(created.diagram_id, created.view_token) is AccessScope.VIEW
    assert await service.authorize(created.diagram_id, created.edit_token) is AccessScope.EDIT
    assert await service.authorize(created.diagram_id, "invalid") is None
```

- [ ] **Step 2: Executar e confirmar a falha**

Run:

```bash
PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test pytest demo/tests/pid/test_diagram_repository.py -q
```

Expected: FAIL porque os repositórios e `DiagramService` ainda não existem.

- [ ] **Step 3: Implementar contratos e transação**

`DiagramService.create()` deve:

1. gerar o UUID do fluxograma;
2. gerar tokens independentes de leitura e edição;
3. persistir somente hashes HMAC;
4. inserir fluxograma e tokens em uma única transação;
5. retornar os tokens puros apenas no resultado `CreatedDiagram`.

Implementar o serviço com a transação explícita abaixo; os repositórios recebem a sessão aberta e não executam `commit` por conta própria:

```python
from dataclasses import dataclass
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
        *,
        title: str,
        standard: PidStandard,
        catalog_version: str,
    ) -> CreatedDiagram:
        diagram_id = uuid4()
        view_token = generate_secret()
        edit_token = generate_secret()
        async with self._session_factory() as session:
            async with session.begin():
                diagrams = DiagramRepository(session)
                tokens = TokenRepository(session)
                await diagrams.add(
                    PidDiagram(
                        id=diagram_id,
                        title=title,
                        standard=standard,
                        catalog_version=catalog_version,
                        schema_version=1,
                    )
                )
                await tokens.add(
                    PidAccessToken(
                        id=uuid4(),
                        diagram_id=diagram_id,
                        scope=AccessScope.VIEW,
                        token_hash=hash_secret(view_token, self._token_pepper),
                    )
                )
                await tokens.add(
                    PidAccessToken(
                        id=uuid4(),
                        diagram_id=diagram_id,
                        scope=AccessScope.EDIT,
                        token_hash=hash_secret(edit_token, self._token_pepper),
                    )
                )
        return CreatedDiagram(diagram_id, view_token, edit_token)

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
                include_deleted=False,
            )
        return token.scope if token is not None else None
```

`DiagramRepository.add()` e `TokenRepository.add()` devem chamar `session.add()`. `TokenRepository.resolve()` deve consultar `diagram_id + token_hash`, exigir `revoked_at IS NULL` e, quando `include_deleted=False`, fazer join com `PidDiagram` exigindo `deleted_at IS NULL`. `DiagramRepository.get_active()` deve aplicar a mesma condição de documento ativo.

- [ ] **Step 4: Adicionar revogação, regeneração e soft delete por testes**

Acrescentar ao mesmo arquivo:

```python
async def test_regenerate_view_token_revokes_previous_token(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Teste",
        standard=PidStandard.ISA,
        catalog_version="0.1.0-foundation",
    )

    replacement = await service.regenerate_token(
        created.diagram_id,
        AccessScope.VIEW,
    )

    assert await service.authorize(created.diagram_id, created.view_token) is None
    assert await service.authorize(created.diagram_id, replacement) is AccessScope.VIEW


async def test_soft_delete_and_restore_require_active_edit_token(
    session_factory,
) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Teste",
        standard=PidStandard.ISO,
        catalog_version="0.1.0-foundation",
    )

    assert await service.soft_delete(created.diagram_id, created.edit_token)
    assert await service.restore(created.diagram_id, created.view_token) is False
    assert await service.restore(created.diagram_id, created.edit_token)
```

Implementar `regenerate_token`, `soft_delete` e `restore` com transações e comparação por hash. A restauração deve recusar documentos cujo `deleted_at` seja anterior a 30 dias.

- [ ] **Step 5: Executar os testes de persistência**

Run:

```bash
PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test pytest demo/tests/pid/test_diagram_repository.py -q
```

Expected: `3 passed`.

- [ ] **Step 6: Commit**

```bash
git add pid/repositories pid/services demo/tests/pid/test_diagram_repository.py
git commit -m "feat(pid): persist diagrams and capability tokens"
```

### Task 5: Snapshots e versões de catálogo

**Files:**
- Create: `pid/repositories/snapshots.py`
- Create: `pid/repositories/catalogs.py`
- Modify: `demo/tests/pid/conftest.py`
- Test: `demo/tests/pid/test_snapshot_repository.py`
- Test: `demo/tests/pid/test_catalog_repository.py`

- [ ] **Step 1: Escrever o teste de revisão e retenção**

Adicionar primeiro a fixture compartilhada:

```python
# demo/tests/pid/conftest.py
import pytest_asyncio

from pid.models import PidStandard
from pid.services.diagram_service import DiagramService


@pytest_asyncio.fixture
async def persisted_diagram_id(session_factory):
    service = DiagramService(session_factory, token_pepper="p" * 32)
    created = await service.create(
        title="Snapshot fixture",
        standard=PidStandard.ISO,
        catalog_version="0.1.0-foundation",
    )
    return created.diagram_id
```

```python
# demo/tests/pid/test_snapshot_repository.py
from pid.repositories.snapshots import SnapshotRepository


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
```

- [ ] **Step 2: Executar e confirmar a falha**

Run:

```bash
PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test pytest demo/tests/pid/test_snapshot_repository.py -q
```

Expected: FAIL com import de `SnapshotRepository`.

- [ ] **Step 3: Implementar append serializado**

`SnapshotRepository.append()` deve bloquear a linha de `pid_diagrams` com `SELECT FOR UPDATE`, calcular `max(revision) + 1`, inserir o snapshot e remover todas as revisões exceto:

- a revisão recém-inserida;
- a maior revisão válida estritamente anterior à recém-inserida.

O método deve confirmar tudo em uma transação. `list_revisions()` existe apenas para leitura e teste.

- [ ] **Step 4: Escrever e implementar o repositório de catálogo**

```python
# demo/tests/pid/test_catalog_repository.py
from pid.models import PidStandard
from pid.repositories.catalogs import CatalogRepository


async def test_activate_catalog_version_is_idempotent(session_factory) -> None:
    repository = CatalogRepository(session_factory)

    await repository.activate(PidStandard.ISO, "0.1.0", "a" * 64)
    await repository.activate(PidStandard.ISO, "0.1.0", "a" * 64)

    active = await repository.get(PidStandard.ISO, "0.1.0")
    assert active is not None
    assert active.manifest_hash == "a" * 64
```

`CatalogRepository.activate()` deve usar upsert PostgreSQL. Se a mesma chave receber hash diferente, deve levantar `CatalogHashConflict`, nunca sobrescrever silenciosamente.

- [ ] **Step 5: Executar os testes**

Run:

```bash
PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test pytest demo/tests/pid/test_snapshot_repository.py demo/tests/pid/test_catalog_repository.py -q
```

Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add pid/repositories/snapshots.py pid/repositories/catalogs.py demo/tests/pid/test_snapshot_repository.py demo/tests/pid/test_catalog_repository.py demo/tests/pid/conftest.py
git commit -m "feat(pid): persist snapshots and catalog versions"
```

### Task 6: Tickets Redis de uso único

**Files:**
- Create: `pid/tickets.py`
- Test: `demo/tests/pid/test_tickets.py`

- [ ] **Step 1: Escrever o teste de emissão, consumo e TTL**

```python
# demo/tests/pid/test_tickets.py
from uuid import uuid4

import pytest
from redis.asyncio import Redis

from pid.models import AccessScope
from pid.tickets import TicketPayload, TicketStore


@pytest.fixture
async def redis_client() -> Redis:
    client = Redis.from_url("redis://127.0.0.1:56379/0", decode_responses=True)
    await client.flushdb()
    yield client
    await client.aclose()


async def test_ticket_can_be_consumed_exactly_once(redis_client: Redis) -> None:
    store = TicketStore(redis_client, ttl_seconds=60)
    payload = TicketPayload(
        diagram_id=uuid4(),
        token_id=uuid4(),
        scope=AccessScope.EDIT,
    )

    ticket = await store.issue(payload)

    assert await store.consume(ticket) == payload
    assert await store.consume(ticket) is None
    assert await redis_client.keys("pid:ticket:*") == []


async def test_plain_ticket_is_not_used_as_redis_key(redis_client: Redis) -> None:
    store = TicketStore(redis_client, ttl_seconds=60)
    ticket = await store.issue(
        TicketPayload(uuid4(), uuid4(), AccessScope.VIEW)
    )
    keys = await redis_client.keys("pid:ticket:*")
    assert len(keys) == 1
    assert ticket not in keys[0]
```

- [ ] **Step 2: Executar e confirmar a falha**

Run:

```bash
PID_TEST_REDIS_URL=redis://127.0.0.1:56379/0 pytest demo/tests/pid/test_tickets.py -q
```

Expected: FAIL com import de `pid.tickets`.

- [ ] **Step 3: Implementar o store**

```python
# pid/tickets.py
from dataclasses import asdict, dataclass
import hashlib
import json
from uuid import UUID

from redis.asyncio import Redis

from pid.models import AccessScope
from pid.security import generate_secret


@dataclass(frozen=True)
class TicketPayload:
    diagram_id: UUID
    token_id: UUID
    scope: AccessScope


class TicketStore:
    def __init__(self, redis: Redis, ttl_seconds: int = 60) -> None:
        self._redis = redis
        self._ttl_seconds = ttl_seconds

    async def issue(self, payload: TicketPayload) -> str:
        ticket = generate_secret()
        stored = {
            **asdict(payload),
            "diagram_id": str(payload.diagram_id),
            "token_id": str(payload.token_id),
            "scope": payload.scope.value,
        }
        created = await self._redis.set(
            self._key(ticket),
            json.dumps(stored, separators=(",", ":")),
            ex=self._ttl_seconds,
            nx=True,
        )
        if not created:
            raise RuntimeError("Ticket collision")
        return ticket

    async def consume(self, ticket: str) -> TicketPayload | None:
        raw = await self._redis.getdel(self._key(ticket))
        if raw is None:
            return None
        stored = json.loads(raw)
        return TicketPayload(
            diagram_id=UUID(stored["diagram_id"]),
            token_id=UUID(stored["token_id"]),
            scope=AccessScope(stored["scope"]),
        )

    @staticmethod
    def _key(ticket: str) -> str:
        digest = hashlib.sha256(ticket.encode("utf-8")).hexdigest()
        return f"pid:ticket:{digest}"
```

- [ ] **Step 4: Executar os testes**

Run:

```bash
PID_TEST_REDIS_URL=redis://127.0.0.1:56379/0 pytest demo/tests/pid/test_tickets.py -q
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add pid/tickets.py demo/tests/pid/test_tickets.py
git commit -m "feat(pid): add single-use Redis tickets"
```

### Task 7: Manifesto, proveniência e inventário de fontes

**Files:**
- Create: `pid/catalog/__init__.py`
- Create: `pid/catalog/manifest.schema.json`
- Create: `pid/catalog/validator.py`
- Create: `pid/catalog/sources.json`
- Create: `pid/catalog/manifests/isa/foundation.json`
- Create: `pid/catalog/manifests/iso/foundation.json`
- Create: `THIRD_PARTY_NOTICES.md`
- Test: `demo/tests/pid/test_catalog_manifest.py`

- [ ] **Step 1: Escrever testes dos gates**

```python
# demo/tests/pid/test_catalog_manifest.py
import json

import pytest

from pid.catalog.validator import CatalogValidationError, validate_manifest


def valid_symbol() -> dict:
    return {
        "key": "iso:reactor:batch",
        "standard": "iso",
        "catalogVersion": "0.1.0",
        "name": "Reator batelada",
        "aliases": ["batch reactor"],
        "category": "reactors",
        "svgPath": "assets/reactor-batch.svg",
        "viewBox": "0 0 124 200",
        "defaultSize": {"width": 124, "height": 200},
        "rotationPolicy": "quarter-turn",
        "portTemplates": [],
        "propertySchema": {},
        "allowedConnections": ["process"],
        "sourceKind": "wikimedia",
        "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:ReactorBatch.svg",
        "sourceDownloadUrl": "https://upload.wikimedia.org/reactor-batch.svg",
        "sourceRevision": "1254967890",
        "sourceAuthor": "Daniele Pugliesi",
        "sourceReference": "Chemical engineering symbols",
        "licenseName": "CC0-1.0",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "licenseReference": "Wikimedia file page",
        "attributionText": "",
        "originalFormat": "svg",
        "originalChecksum": "a" * 64,
        "derivationRecord": [],
    }


def test_valid_manifest_has_stable_sha256(tmp_path) -> None:
    path = tmp_path / "manifest.json"
    path.write_text(
        json.dumps(
            {
                "standard": "iso",
                "version": "0.1.0",
                "status": "draft",
                "symbols": [valid_symbol()],
            }
        ),
        encoding="utf-8",
    )
    first = validate_manifest(path)
    second = validate_manifest(path)
    assert first.manifest_hash == second.manifest_hash


def test_manifest_rejects_missing_license(tmp_path) -> None:
    symbol = valid_symbol()
    del symbol["licenseName"]
    path = tmp_path / "manifest.json"
    path.write_text(
        json.dumps(
            {
                "standard": "iso",
                "version": "0.1.0",
                "status": "draft",
                "symbols": [symbol],
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(CatalogValidationError, match="licenseName"):
        validate_manifest(path)


def test_manifest_rejects_path_traversal(tmp_path) -> None:
    symbol = valid_symbol()
    symbol["svgPath"] = "../secret.svg"
    path = tmp_path / "manifest.json"
    path.write_text(
        json.dumps(
            {
                "standard": "iso",
                "version": "0.1.0",
                "status": "draft",
                "symbols": [symbol],
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(CatalogValidationError, match="svgPath"):
        validate_manifest(path)
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `pytest demo/tests/pid/test_catalog_manifest.py -q`

Expected: FAIL com import de `pid.catalog.validator`.

- [ ] **Step 3: Criar JSON Schema e validador**

`manifest.schema.json` deve exigir todos os campos da seção 11.4 da especificação, restringir `standard` a `isa|iso`, `sourceKind` a `normative|drawio|wikimedia|project`, `originalFormat` a `svg|png`, checksum a `^[a-f0-9]{64}$` e URLs de origem a `https://`.

`validate_manifest(path: Path) -> ValidatedManifest` deve:

1. validar com `Draft202012Validator`;
2. rejeitar chaves de símbolo duplicadas;
3. exigir que `symbol.standard` e `symbol.catalogVersion` coincidam com o cabeçalho;
4. rejeitar caminhos absolutos ou contendo `..`;
5. calcular SHA-256 do JSON canônico com `sort_keys=True` e separadores compactos;
6. ordenar erros por caminho e levantar `CatalogValidationError` com mensagem determinística.

O módulo deve também expor `main()`: receber um ou mais caminhos em `sys.argv[1:]`, validar cada arquivo, imprimir `VALID <caminho> <hash>` e terminar com código diferente de zero no primeiro manifesto inválido.

- [ ] **Step 4: Registrar fontes fixadas e manifestos draft**

`pid/catalog/sources.json` deve registrar:

```json
{
  "drawio": {
    "repository": "https://github.com/jgraph/drawio",
    "commit": "a1f615b7f5a5237da71de2ce2f057b5fa70b0aeb",
    "paths": [
      "src/main/webapp/stencils/pid",
      "src/main/webapp/shapes/pid2"
    ],
    "authorizationReference": "project-private-authorization"
  },
  "wikimedia": [
    {
      "category": "P&ID symbols",
      "url": "https://commons.wikimedia.org/wiki/Category:P%26ID_symbols",
      "revision": "1007862109",
      "observedRootFiles": 82,
      "observedSubcategories": 26
    },
    {
      "category": "Chemical engineering symbols",
      "url": "https://commons.wikimedia.org/wiki/Category:Chemical_engineering_symbols",
      "revision": "1254967890",
      "observedRootFiles": 12,
      "observedSubcategories": 1
    }
  ]
}
```

Os dois manifestos `foundation.json` devem conter `standard`, `version: "0.1.0-foundation"`, `status: "draft"` e `symbols: []`. `THIRD_PARTY_NOTICES.md` deve declarar que a fundação ainda não redistribui assets e apontar para `pid/catalog/sources.json`.

- [ ] **Step 5: Executar testes e validar os manifestos reais**

Run:

```bash
pytest demo/tests/pid/test_catalog_manifest.py -q
python -m pid.catalog.validator pid/catalog/manifests/isa/foundation.json pid/catalog/manifests/iso/foundation.json
```

Expected: `3 passed` e duas linhas `VALID` com seus hashes.

- [ ] **Step 6: Commit**

```bash
git add pid/catalog THIRD_PARTY_NOTICES.md demo/tests/pid/test_catalog_manifest.py
git commit -m "feat(pid): validate catalog provenance"
```

### Task 8: Runtime opcional e readiness da API

**Files:**
- Create: `pid/runtime.py`
- Modify: `app.py`
- Test: `demo/tests/pid/test_runtime.py`
- Modify: `demo/tests/test_desktop_bootstrap.py`

- [ ] **Step 1: Escrever testes de compatibilidade e readiness**

```python
# demo/tests/pid/test_runtime.py
from fastapi.testclient import TestClient

from app import create_app


def test_ready_reports_disabled_without_pid_environment(monkeypatch) -> None:
    monkeypatch.setenv("PID_ENABLED", "false")
    with TestClient(create_app()) as client:
        response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "pid": "disabled"}


def test_health_remains_a_dependency_free_liveness_probe(monkeypatch) -> None:
    monkeypatch.setenv("PID_ENABLED", "false")
    with TestClient(create_app()) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `pytest demo/tests/pid/test_runtime.py demo/tests/test_desktop_bootstrap.py -q`

Expected: FAIL porque `create_app` e `/ready` ainda não existem.

- [ ] **Step 3: Implementar runtime e factory da aplicação**

`pid/runtime.py` deve criar `PidRuntime` com:

- `AsyncEngine`;
- `async_sessionmaker`;
- cliente `Redis`;
- `check_ready()` que executa `SELECT 1` e `PING`;
- `close()` que fecha Redis e engine.

Em `app.py`, extrair a configuração atual para `create_app() -> FastAPI`, preservar todos os routers e handlers existentes e manter `app = create_app()`. O lifespan deve:

1. ler `PidSettings`;
2. não abrir conexões quando desabilitado;
3. criar e armazenar `app.state.pid_runtime` quando habilitado;
4. fechar os clientes no shutdown.

`GET /health` continua independente. `GET /ready` retorna:

- HTTP 200 com `{"status": "ok", "pid": "disabled"}` quando desabilitado;
- HTTP 200 com `{"status": "ok", "pid": "ready"}` quando os probes passam;
- HTTP 503 com `{"detail": "PID dependencies unavailable"}` quando qualquer probe falha.

A allowlist CORS deve manter as três origens atuais e acrescentar as origens exatas de `PID_ALLOWED_ORIGINS`, sem aceitar `*`.

- [ ] **Step 4: Executar testes focados e regressão backend**

Run:

```bash
pytest demo/tests/pid/test_runtime.py demo/tests/test_app_cors.py demo/tests/test_desktop_bootstrap.py -q
pytest -q
```

Expected: testes focados PASS; suíte backend PASS sem exigir PostgreSQL/Redis quando `PID_ENABLED=false`.

- [ ] **Step 5: Commit**

```bash
git add pid/runtime.py app.py demo/tests/pid/test_runtime.py demo/tests/test_desktop_bootstrap.py
git commit -m "feat(pid): add optional backend runtime"
```

### Task 9: PostgreSQL e Redis no Docker Swarm

**Files:**
- Create: `deploy/start-api.sh`
- Modify: `deploy/Dockerfile.api`
- Modify: `deploy/docker-compose.yaml`
- Modify: `deploy/deploy.sh`
- Test: `demo/tests/test_pid_deploy.py`

- [ ] **Step 1: Escrever testes estruturais do deploy**

```python
# demo/tests/test_pid_deploy.py
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_swarm_stack_contains_persistent_postgres_and_ephemeral_redis() -> None:
    compose = read("deploy/docker-compose.yaml")
    assert "tcc-postgres:" in compose
    assert "postgres:16-alpine" in compose
    assert "tcc_postgres_data:/var/lib/postgresql/data" in compose
    assert "tcc-redis:" in compose
    assert "redis:7.4-alpine" in compose
    assert "--appendonly" in compose
    assert '"no"' in compose


def test_api_receives_pid_environment_and_uses_readiness() -> None:
    compose = read("deploy/docker-compose.yaml")
    for name in (
        "PID_ENABLED",
        "DATABASE_URL",
        "REDIS_URL",
        "PID_TOKEN_PEPPER",
        "PID_ALLOWED_ORIGINS",
        "PID_WS_PUBLIC_URL",
    ):
        assert name in compose
    assert "/ready" in compose


def test_deploy_loads_dotenv_without_committing_secrets() -> None:
    deploy = read("deploy/deploy.sh")
    assert 'ENV_FILE="${ENV_FILE:-.env}"' in deploy
    assert 'source "$ENV_FILE"' in deploy
    assert "POSTGRES_PASSWORD" in deploy
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `pytest demo/tests/test_pid_deploy.py -q`

Expected: três testes FAIL porque os serviços e o carregamento de `.env` ainda não existem.

- [ ] **Step 3: Adicionar serviços e volumes**

Em `deploy/docker-compose.yaml`:

- adicionar `tcc-postgres` com `postgres:16-alpine`, volume `tcc_postgres_data`, healthcheck `pg_isready`, rede `SJNet` e credenciais interpoladas;
- adicionar `tcc-redis` com `redis:7.4-alpine`, persistência desabilitada, healthcheck `redis-cli ping` e rede `SJNet`;
- passar as seis variáveis PID para `tcc-api`;
- adicionar healthcheck da API contra `http://127.0.0.1:5000/ready` usando `python -c`, sem instalar curl;
- declarar o volume nomeado `tcc_postgres_data`;
- definir restart policies `on-failure` para API, PostgreSQL e Redis.

- [ ] **Step 4: Carregar e validar `.env` no deploy**

No início de `deploy/deploy.sh`, depois de resolver `PROJECT_ROOT`:

```bash
ENV_FILE="${ENV_FILE:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo $ENV_FILE não encontrado. Copie .env.example e configure-o." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required_env=(
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  DATABASE_URL
  REDIS_URL
  PID_TOKEN_PEPPER
  PID_ALLOWED_ORIGINS
  PID_WS_PUBLIC_URL
)
for variable_name in "${required_env[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Variável obrigatória ausente em $ENV_FILE: $variable_name" >&2
    exit 1
  fi
done
```

O arquivo `.env` continua ignorado pelo Git. O operador pode mantê-lo no host ou enviá-lo ao host pelo seu canal de implantação privado; ele nunca será incorporado à imagem Docker.

- [ ] **Step 5: Executar migrations antes do Uvicorn**

`deploy/start-api.sh`:

```sh
#!/usr/bin/env sh
set -eu

if [ "${PID_ENABLED:-false}" = "true" ]; then
  alembic upgrade head
fi

exec uvicorn app:app --host 0.0.0.0 --port 5000
```

Alterar o `CMD` de `deploy/Dockerfile.api` para `["sh", "deploy/start-api.sh"]`. Como o Swarm reinicia a API em falha, tentativas antes de o PostgreSQL aceitar conexões serão repetidas sem liberar uma instância não migrada.

- [ ] **Step 6: Validar configuração renderizada**

Run:

```bash
pytest demo/tests/test_pid_deploy.py demo/tests/test_frontend_deploy_pipeline.py -q
docker compose --env-file .env.example -f deploy/docker-compose.yaml config --quiet
```

Expected: testes PASS e configuração Docker válida, sem criar ou sobrescrever o `.env` real.

- [ ] **Step 7: Commit**

```bash
git add deploy/start-api.sh deploy/Dockerfile.api deploy/docker-compose.yaml deploy/deploy.sh demo/tests/test_pid_deploy.py
git commit -m "feat(pid): deploy PostgreSQL and Redis services"
```

### Task 10: CI, documentação e verificação integrada

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Test: `demo/tests/pid/**`

- [ ] **Step 1: Configurar serviços do job backend no CI**

No job `backend-test` de `.github/workflows/ci.yml`, adicionar:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_DB: dcou_test
      POSTGRES_USER: dcou
      POSTGRES_PASSWORD: dcou_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U dcou -d dcou_test"
      --health-interval 2s
      --health-timeout 2s
      --health-retries 20
  redis:
    image: redis:7.4-alpine
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 2s
      --health-timeout 2s
      --health-retries 20
env:
  PID_TEST_DATABASE_URL: postgresql+psycopg://dcou:dcou_test@127.0.0.1:5432/dcou_test
  PID_TEST_REDIS_URL: redis://127.0.0.1:6379/0
```

Atualizar `demo/tests/pid/test_tickets.py` para ler `PID_TEST_REDIS_URL` e pular apenas quando a variável não estiver definida, em vez de fixar a porta local.

- [ ] **Step 2: Documentar operação local**

Adicionar ao `README.md`:

- comando `cp .env.example .env`;
- geração de `PID_TOKEN_PEPPER` com `python -c "import secrets; print(secrets.token_urlsafe(48))"`;
- subida de PostgreSQL/Redis de teste;
- execução de `alembic upgrade head`;
- diferença entre `/health` e `/ready`;
- aviso de que PostgreSQL é durável, Redis é efêmero e não há backup externo no MVP;
- comando para validar manifestos draft.

- [ ] **Step 3: Executar a suíte completa da entrega**

Run:

```bash
docker compose -f deploy/docker-compose.test.yaml up -d --wait
PID_TEST_DATABASE_URL=postgresql+psycopg://dcou:dcou_test@127.0.0.1:55432/dcou_test PID_TEST_REDIS_URL=redis://127.0.0.1:56379/0 pytest -q
python -m pid.catalog.validator pid/catalog/manifests/isa/foundation.json pid/catalog/manifests/iso/foundation.json
docker compose --env-file .env.example -f deploy/docker-compose.yaml config --quiet
git diff --check
```

Expected: suíte Pytest PASS, dois manifestos `VALID`, Compose válido e `git diff --check` sem saída.

- [ ] **Step 4: Verificar que nenhum segredo entrou no diff**

Run:

```bash
git diff -- . ':!docs/superpowers'
git status --short
```

Expected: somente os arquivos previstos neste plano; nenhum valor real de senha, token, ticket, pepper ou URL privada.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml README.md demo/tests/pid/test_tickets.py
git commit -m "ci(pid): verify persistent foundation"
```

## Critérios de conclusão da Entrega 1

- migrations criam e removem as quatro tabelas P&ID;
- criação de fluxograma retorna UUID e dois tokens, persistindo somente hashes;
- revogação, regeneração, soft delete e restauração obedecem aos escopos;
- snapshots preservam a revisão atual e a válida anterior;
- tickets Redis expiram e são consumidos uma única vez;
- manifestos draft têm hash estável e gates de licença/proveniência;
- a API atual e o desktop continuam iniciando com P&ID desabilitado;
- a implantação web lê `.env`, inicializa PostgreSQL/Redis e usa readiness;
- a suíte backend passa com PostgreSQL e Redis reais no CI;
- nenhum SVG, PNG ou stencil externo é redistribuído nesta entrega.
