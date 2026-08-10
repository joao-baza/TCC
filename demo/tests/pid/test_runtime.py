from __future__ import annotations

from dataclasses import dataclass
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

import app as app_module
import pid.runtime as runtime_module
from pid.config import PidSettings
from pid.runtime import PidRuntime


PID_ENVIRONMENT = (
    "PID_ENABLED",
    "DATABASE_URL",
    "REDIS_URL",
    "PID_TOKEN_PEPPER",
    "PID_ALLOWED_ORIGINS",
    "PID_WS_PUBLIC_URL",
)


@pytest.fixture(autouse=True)
def isolated_pid_environment(monkeypatch):
    for name in PID_ENVIRONMENT:
        monkeypatch.delenv(name, raising=False)


def _enable_pid(monkeypatch, *, origins: str = "https://editor.example.test"):
    monkeypatch.setenv("PID_ENABLED", "true")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://pid:secret@database.example.test:5432/pid",
    )
    monkeypatch.setenv("REDIS_URL", "redis://redis.example.test:6379/0")
    monkeypatch.setenv("PID_TOKEN_PEPPER", "p" * 32)
    monkeypatch.setenv("PID_ALLOWED_ORIGINS", origins)
    monkeypatch.setenv("PID_WS_PUBLIC_URL", "wss://editor.example.test/ws")


@dataclass
class InstrumentedRuntime:
    ready_error: Exception | None = None
    checks: int = 0
    closes: int = 0

    async def check_ready(self) -> None:
        self.checks += 1
        if self.ready_error is not None:
            raise self.ready_error

    async def close(self) -> None:
        self.closes += 1


def test_disabled_pid_does_not_construct_dependencies(monkeypatch):
    monkeypatch.setattr(
        runtime_module,
        "create_pid_engine",
        lambda _url: pytest.fail("disabled PID constructed a database engine"),
    )
    monkeypatch.setattr(
        runtime_module.Redis,
        "from_url",
        lambda _url: pytest.fail("disabled PID constructed a Redis client"),
    )

    created = app_module.create_app()

    with TestClient(created) as client:
        assert client.get("/health").json() == {"status": "ok"}
        response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "pid": "disabled"}
    assert not hasattr(created.state, "pid_runtime")


def test_enabled_pid_checks_dependencies_and_closes_runtime(monkeypatch):
    _enable_pid(monkeypatch)
    runtime = InstrumentedRuntime()
    monkeypatch.setattr(
        app_module.PidRuntime,
        "from_settings",
        lambda _settings: runtime,
    )

    created = app_module.create_app()
    with TestClient(created) as client:
        assert created.state.pid_runtime is runtime
        response = client.get("/ready")
        assert runtime.closes == 0

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "pid": "ready"}
    assert runtime.checks == 1
    assert runtime.closes == 1


def test_readiness_failure_is_sanitized_and_health_stays_available(monkeypatch):
    _enable_pid(monkeypatch)
    runtime = InstrumentedRuntime(
        ready_error=RuntimeError(
            "could not connect to postgresql://pid:secret@database.example.test"
        )
    )
    monkeypatch.setattr(
        app_module.PidRuntime,
        "from_settings",
        lambda _settings: runtime,
    )

    with TestClient(app_module.create_app()) as client:
        ready_response = client.get("/ready")
        health_response = client.get("/health")

    assert ready_response.status_code == 503
    assert ready_response.json() == {"detail": "PID dependencies unavailable"}
    assert "secret" not in ready_response.text
    assert health_response.status_code == 200
    assert health_response.json() == {"status": "ok"}


def test_each_app_reads_and_owns_its_runtime(monkeypatch):
    _enable_pid(monkeypatch, origins="https://first.example.test")
    runtimes: list[InstrumentedRuntime] = []

    def build_runtime(_settings):
        runtime = InstrumentedRuntime()
        runtimes.append(runtime)
        return runtime

    monkeypatch.setattr(app_module.PidRuntime, "from_settings", build_runtime)
    first = app_module.create_app()
    monkeypatch.setenv("PID_ALLOWED_ORIGINS", "https://second.example.test")
    second = app_module.create_app()

    with TestClient(first), TestClient(second):
        assert first.state.pid_runtime is not second.state.pid_runtime

    assert len(runtimes) == 2
    assert [runtime.closes for runtime in runtimes] == [1, 1]


def test_invalid_enabled_settings_fail_without_exposing_values(monkeypatch):
    monkeypatch.setenv("PID_ENABLED", "true")
    monkeypatch.setenv("DATABASE_URL", "postgresql://pid:top-secret@example.test/pid")

    with pytest.raises(ValueError) as error:
        app_module.create_app()

    assert "Missing PID settings" in str(error.value)
    assert "top-secret" not in str(error.value)


def test_runtime_construction_uses_shared_factories_without_network(monkeypatch):
    engine = object()
    session_factory = object()
    redis = object()
    calls: list[tuple[str, object]] = []
    settings = PidSettings(
        enabled=True,
        database_url="postgresql+psycopg://pid:secret@database.example.test/pid",
        redis_url="redis://redis.example.test/0",
        token_pepper="p" * 32,
        allowed_origins=("https://editor.example.test",),
        ws_public_url="wss://editor.example.test/ws",
    )
    monkeypatch.setattr(
        runtime_module,
        "create_pid_engine",
        lambda url: calls.append(("engine", url)) or engine,
    )
    monkeypatch.setattr(
        runtime_module,
        "create_session_factory",
        lambda value: calls.append(("sessions", value)) or session_factory,
    )
    monkeypatch.setattr(
        runtime_module.Redis,
        "from_url",
        lambda url: calls.append(("redis", url)) or redis,
    )

    runtime = PidRuntime.from_settings(settings)

    assert runtime.engine is engine
    assert runtime.session_factory is session_factory
    assert runtime.redis is redis
    assert calls == [
        ("engine", settings.database_url),
        ("sessions", engine),
        ("redis", settings.redis_url),
    ]


class ConnectionContext:
    def __init__(self, connection):
        self.connection = connection

    async def __aenter__(self):
        return self.connection

    async def __aexit__(self, *_args):
        return None


class InstrumentedConnection:
    def __init__(self):
        self.statements: list[str] = []

    async def execute(self, statement):
        self.statements.append(str(statement))


class InstrumentedEngine:
    def __init__(self, *, dispose_error: Exception | None = None):
        self.connection = InstrumentedConnection()
        self.dispose_error = dispose_error
        self.dispose_calls = 0

    def connect(self):
        return ConnectionContext(self.connection)

    async def dispose(self):
        self.dispose_calls += 1
        if self.dispose_error is not None:
            raise self.dispose_error


class InstrumentedRedis:
    def __init__(self, *, close_error: Exception | None = None):
        self.close_error = close_error
        self.pings = 0
        self.close_calls = 0

    async def ping(self):
        self.pings += 1
        return True

    async def aclose(self):
        self.close_calls += 1
        if self.close_error is not None:
            raise self.close_error


def _runtime(engine: InstrumentedEngine, redis: InstrumentedRedis) -> PidRuntime:
    return PidRuntime(
        engine=cast(AsyncEngine, engine),
        session_factory=cast(async_sessionmaker[AsyncSession], object()),
        redis=cast(Any, redis),
    )


@pytest.mark.asyncio
async def test_runtime_readiness_executes_database_and_redis_probes():
    engine = InstrumentedEngine()
    redis = InstrumentedRedis()

    await _runtime(engine, redis).check_ready()

    assert engine.connection.statements == ["SELECT 1"]
    assert redis.pings == 1


@pytest.mark.asyncio
async def test_runtime_close_disposes_engine_when_redis_close_fails():
    engine = InstrumentedEngine()
    redis = InstrumentedRedis(close_error=RuntimeError("redis close failed"))

    with pytest.raises(RuntimeError, match="redis close failed"):
        await _runtime(engine, redis).close()

    assert redis.close_calls == 1
    assert engine.dispose_calls == 1


@pytest.mark.asyncio
async def test_runtime_close_propagates_engine_failure_after_closing_redis():
    engine = InstrumentedEngine(
        dispose_error=RuntimeError("database dispose failed")
    )
    redis = InstrumentedRedis()

    with pytest.raises(RuntimeError, match="database dispose failed"):
        await _runtime(engine, redis).close()

    assert redis.close_calls == 1
    assert engine.dispose_calls == 1


@pytest.mark.asyncio
async def test_runtime_close_preserves_first_failure_when_both_cleanups_fail():
    engine = InstrumentedEngine(
        dispose_error=RuntimeError("database dispose failed")
    )
    redis = InstrumentedRedis(close_error=RuntimeError("redis close failed"))

    with pytest.raises(RuntimeError, match="redis close failed"):
        await _runtime(engine, redis).close()

    assert redis.close_calls == 1
    assert engine.dispose_calls == 1
