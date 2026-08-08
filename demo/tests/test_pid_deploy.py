from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

import pytest


ROOT = Path(__file__).resolve().parents[2]
COMPOSE_FILE = ROOT / "deploy" / "docker-compose.yaml"
ENV_EXAMPLE = ROOT / ".env.example"
START_SCRIPT = ROOT / "deploy" / "start-api.sh"
DEPLOY_SCRIPT = ROOT / "deploy" / "deploy.sh"

PID_ENVIRONMENT = {
    "PID_ENABLED",
    "DATABASE_URL",
    "REDIS_URL",
    "PID_TOKEN_PEPPER",
    "PID_ALLOWED_ORIGINS",
    "PID_WS_PUBLIC_URL",
}

REQUIRED_DEPLOY_ENVIRONMENT = (
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "DATABASE_URL",
    "REDIS_PASSWORD",
    "REDIS_URL",
    "PID_TOKEN_PEPPER",
    "PID_ALLOWED_ORIGINS",
    "PID_WS_PUBLIC_URL",
)


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def read_example_environment() -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in ENV_EXAMPLE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        key, value = line.split("=", 1)
        values[key] = value
    return values


@pytest.fixture(scope="module")
def compose_config() -> dict[str, object]:
    if shutil.which("docker") is None:
        pytest.skip("Docker Compose CLI is required to inspect the deployment model")

    environment = os.environ.copy()
    for name in read_example_environment():
        environment.pop(name, None)

    result = subprocess.run(
        [
            "docker",
            "compose",
            "--env-file",
            str(ENV_EXAMPLE),
            "-f",
            str(COMPOSE_FILE),
            "config",
            "--format",
            "json",
        ],
        cwd=ROOT,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0 and "unknown command" in result.stderr.lower():
        pytest.skip("Docker Compose plugin is not available")
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def test_compose_defines_private_postgres_with_persistent_storage(compose_config):
    postgres = compose_config["services"]["tcc-postgres"]

    assert postgres["image"] == "postgres:16-alpine"
    assert "ports" not in postgres
    assert postgres["environment"] == {
        "POSTGRES_DB": "dcou",
        "POSTGRES_PASSWORD": "change-this-local-password",
        "POSTGRES_USER": "dcou",
    }
    assert postgres["volumes"] == [
        {
            "type": "volume",
            "source": "tcc_postgres_data",
            "target": "/var/lib/postgresql/data",
            "volume": {},
        }
    ]
    assert postgres["healthcheck"]["test"][0] == "CMD-SHELL"
    assert "pg_isready" in postgres["healthcheck"]["test"][1]
    assert postgres["deploy"]["restart_policy"]["condition"] == "on-failure"
    assert "SJNet" in postgres["networks"]
    assert "tcc_postgres_data" in compose_config["volumes"]


def test_compose_defines_hardened_ephemeral_redis(compose_config):
    redis = compose_config["services"]["tcc-redis"]
    command = redis["command"]

    assert redis["image"] == "redis:7.4-alpine"
    assert "ports" not in redis
    assert "volumes" not in redis
    assert "--appendonly" in command
    assert command[command.index("--appendonly") + 1] == "no"
    assert "--save" in command
    assert command[command.index("--save") + 1] == ""
    assert "--requirepass" in command
    assert command[command.index("--requirepass") + 1] == "change-this-local-redis-password"
    assert command[command.index("--maxmemory") + 1] == "128mb"
    assert command[command.index("--maxmemory-policy") + 1] == "volatile-ttl"
    assert redis["deploy"]["restart_policy"]["condition"] == "on-failure"
    assert "SJNet" in redis["networks"]

    healthcheck = redis["healthcheck"]["test"]
    assert healthcheck[0] == "CMD-SHELL"
    assert "redis-cli" in healthcheck[1]
    assert "--no-auth-warning" in healthcheck[1]
    assert "REDIS_PASSWORD" in healthcheck[1]
    assert "ping" in healthcheck[1]


def test_compose_passes_pid_configuration_and_checks_api_readiness(compose_config):
    api = compose_config["services"]["tcc-api"]
    environment = api["environment"]

    assert PID_ENVIRONMENT <= environment.keys()
    assert environment["PID_ENABLED"] == "true"
    assert environment["DATABASE_URL"].startswith("postgresql+psycopg://")
    assert environment["REDIS_URL"].startswith("redis://:")
    assert "depends_on" not in api
    assert api["deploy"]["restart_policy"]["condition"] == "on-failure"
    assert api["healthcheck"]["test"][0] == "CMD"
    assert api["healthcheck"]["test"][1:3] == ["python", "-c"]
    assert "http://127.0.0.1:5000/ready" in api["healthcheck"]["test"][3]


def test_start_script_exists_and_dockerfile_uses_it():
    assert START_SCRIPT.is_file()
    assert 'CMD ["sh", "deploy/start-api.sh"]' in read("deploy/Dockerfile.api")


def _write_executable(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")
    path.chmod(0o755)


@pytest.mark.parametrize(
    "enabled",
    ["1", "true", "TRUE", "Yes", "ON", " 1 ", " TRUE ", "\tYes\t", " ON  "],
)
def test_start_script_migrates_before_uvicorn_when_pid_is_enabled(tmp_path, enabled):
    binary_dir = tmp_path / "bin"
    binary_dir.mkdir()
    call_log = tmp_path / "calls.log"
    _write_executable(
        binary_dir / "alembic",
        '#!/bin/sh\nprintf \'alembic:%s\\n\' "$*" >> "$CALL_LOG"\n',
    )
    _write_executable(
        binary_dir / "uvicorn",
        '#!/bin/sh\nprintf \'uvicorn:%s\\n\' "$*" >> "$CALL_LOG"\n',
    )
    environment = os.environ.copy()
    environment.update(
        PID_ENABLED=enabled,
        CALL_LOG=str(call_log),
        PATH=f"{binary_dir}:{environment['PATH']}",
    )

    result = subprocess.run(
        ["sh", str(START_SCRIPT)],
        cwd=tmp_path,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert call_log.read_text(encoding="utf-8").splitlines() == [
        "alembic:upgrade head",
        "uvicorn:app:app --host 0.0.0.0 --port 5000",
    ]


@pytest.mark.parametrize("enabled", ["", "0", "false", "no", "off", "tr ue"])
def test_start_script_skips_migration_when_pid_is_disabled(tmp_path, enabled):
    binary_dir = tmp_path / "bin"
    binary_dir.mkdir()
    call_log = tmp_path / "calls.log"
    _write_executable(
        binary_dir / "alembic",
        '#!/bin/sh\nprintf \'alembic:%s\\n\' "$*" >> "$CALL_LOG"\n',
    )
    _write_executable(
        binary_dir / "uvicorn",
        '#!/bin/sh\nprintf \'uvicorn:%s\\n\' "$*" >> "$CALL_LOG"\n',
    )
    environment = os.environ.copy()
    environment.update(
        PID_ENABLED=enabled,
        CALL_LOG=str(call_log),
        PATH=f"{binary_dir}:{environment['PATH']}",
    )

    result = subprocess.run(
        ["sh", str(START_SCRIPT)],
        cwd=tmp_path,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert call_log.read_text(encoding="utf-8").splitlines() == [
        "uvicorn:app:app --host 0.0.0.0 --port 5000"
    ]


def _copy_deploy_script(tmp_path: Path) -> tuple[Path, Path]:
    project = tmp_path / "project"
    deploy_dir = project / "deploy"
    deploy_dir.mkdir(parents=True)
    script = deploy_dir / "deploy.sh"
    script.write_bytes(DEPLOY_SCRIPT.read_bytes())
    script.chmod(0o755)
    return project, script


def _complete_deploy_environment() -> dict[str, str]:
    return {
        "POSTGRES_DB": "dcou",
        "POSTGRES_USER": "dcou",
        "POSTGRES_PASSWORD": "postgres-secret",
        "DATABASE_URL": "postgresql+psycopg://dcou:postgres-secret@tcc-postgres:5432/dcou",
        "REDIS_PASSWORD": "redis-secret",
        "REDIS_URL": "redis://:redis-secret@tcc-redis:6379/0",
        "PID_TOKEN_PEPPER": "p" * 32,
        "PID_ALLOWED_ORIGINS": "https://editor.example.test",
        "PID_WS_PUBLIC_URL": "wss://editor.example.test/pid/ws",
    }


@pytest.mark.parametrize("missing_name", REQUIRED_DEPLOY_ENVIRONMENT)
def test_deploy_loads_relative_env_and_validates_before_docker(tmp_path, missing_name):
    project, script = _copy_deploy_script(tmp_path)
    config_dir = project / "config"
    config_dir.mkdir()
    values = _complete_deploy_environment()
    values.pop(missing_name)
    (config_dir / "runtime.env").write_text(
        "".join(f"{name}={value}\n" for name, value in values.items()),
        encoding="utf-8",
    )

    binary_dir = tmp_path / "bin"
    binary_dir.mkdir()
    docker_marker = tmp_path / "docker-called"
    _write_executable(
        binary_dir / "docker",
        '#!/bin/sh\n: > "$DOCKER_MARKER"\nexit 99\n',
    )
    environment = os.environ.copy()
    for name in REQUIRED_DEPLOY_ENVIRONMENT:
        environment.pop(name, None)
    environment.update(
        ENV_FILE="config/runtime.env",
        DOCKER_MARKER=str(docker_marker),
        PATH=f"{binary_dir}:{environment['PATH']}",
    )

    result = subprocess.run(
        ["bash", str(script)],
        cwd=tmp_path,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode != 0
    assert missing_name in result.stderr
    assert "postgres-secret" not in result.stderr
    assert "redis-secret" not in result.stderr
    assert not docker_marker.exists()


def test_deploy_rejects_unknown_pid_enabled_before_docker(tmp_path):
    project, script = _copy_deploy_script(tmp_path)
    values = _complete_deploy_environment()
    values["PID_ENABLED"] = "sometimes"
    (project / ".env").write_text(
        "".join(f"{name}={value}\n" for name, value in values.items()),
        encoding="utf-8",
    )
    binary_dir = tmp_path / "bin"
    binary_dir.mkdir()
    docker_marker = tmp_path / "docker-called"
    _write_executable(
        binary_dir / "docker",
        '#!/bin/sh\n: > "$DOCKER_MARKER"\nexit 99\n',
    )
    environment = os.environ.copy()
    environment.update(
        DOCKER_MARKER=str(docker_marker),
        PATH=f"{binary_dir}:{environment['PATH']}",
    )

    result = subprocess.run(
        ["bash", str(script)],
        cwd=tmp_path,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode != 0
    assert "PID_ENABLED" in result.stderr
    assert "sometimes" not in result.stderr
    assert not docker_marker.exists()


def test_example_environment_uses_matching_url_safe_credentials():
    values = read_example_environment()
    database_url = urlsplit(values["DATABASE_URL"])
    redis_url = urlsplit(values["REDIS_URL"])

    assert database_url.username == values["POSTGRES_USER"]
    assert database_url.password == values["POSTGRES_PASSWORD"]
    assert database_url.hostname == "tcc-postgres"
    assert redis_url.password == values["REDIS_PASSWORD"]
    assert redis_url.hostname == "tcc-redis"
    assert values["REDIS_MAXMEMORY"] == "128mb"


def test_docker_build_context_excludes_runtime_env_files():
    dockerignore = read(".dockerignore").splitlines()

    assert ".env" in dockerignore
    assert ".env.*" in dockerignore
    assert "!.env.example" in dockerignore
    assert ".env" in read(".gitignore").splitlines()
