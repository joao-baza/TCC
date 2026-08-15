from __future__ import annotations

import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEPLOY_SCRIPT = ROOT / "deploy" / "deploy.sh"


def _write_executable(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")
    path.chmod(0o755)


def _project_copy(tmp_path: Path) -> tuple[Path, Path]:
    project = tmp_path / "project"
    deploy = project / "deploy"
    deploy.mkdir(parents=True)
    script = deploy / "deploy.sh"
    script.write_bytes(DEPLOY_SCRIPT.read_bytes())
    script.chmod(0o755)
    (deploy / "docker-compose.disabled.yaml").write_text(
        "services: {}\n", encoding="utf-8"
    )
    return project, script


def _run_until_swarm_check(tmp_path: Path, pid_enabled: str) -> tuple[subprocess.CompletedProcess[str], list[str]]:
    project, script = _project_copy(tmp_path)
    (project / ".env").write_text(
        f"PID_ENABLED='{pid_enabled}'\n", encoding="utf-8"
    )
    binary_dir = tmp_path / "bin"
    binary_dir.mkdir()
    docker_log = tmp_path / "docker.log"
    _write_executable(
        binary_dir / "docker",
        """#!/bin/sh
printf '%s\n' "$*" >> "$DOCKER_LOG"
if [ "$1 $2" = "info --format" ]; then
  printf 'inactive\n'
fi
""",
    )
    environment = os.environ.copy()
    for name in (
        "POSTGRES_DB",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_NODE_HOSTNAME",
        "DATABASE_URL",
        "REDIS_PASSWORD",
        "REDIS_URL",
        "PID_TOKEN_PEPPER",
        "PID_ALLOWED_ORIGINS",
        "PID_WS_PUBLIC_URL",
    ):
        environment.pop(name, None)
    environment.update(
        DOCKER_LOG=str(docker_log),
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
    calls = docker_log.read_text(encoding="utf-8").splitlines() if docker_log.exists() else []
    return result, calls


def test_disabled_deploy_does_not_require_pid_infrastructure_variables(tmp_path) -> None:
    result, calls = _run_until_swarm_check(tmp_path, " false ")

    assert result.returncode != 0
    assert "Variáveis obrigatórias" not in result.stderr
    assert "Docker Swarm não está ativo" in result.stderr
    assert calls == ["info --format {{.Swarm.LocalNodeState}}"]


def test_unknown_pid_flag_is_rejected_before_missing_variable_validation(tmp_path) -> None:
    result, calls = _run_until_swarm_check(tmp_path, "sometimes")

    assert result.returncode != 0
    assert "PID_ENABLED" in result.stderr
    assert "Variáveis obrigatórias" not in result.stderr
    assert calls == []


def test_enabled_deploy_still_requires_pid_infrastructure_variables(tmp_path) -> None:
    result, calls = _run_until_swarm_check(tmp_path, "true")

    assert result.returncode != 0
    assert "Variáveis obrigatórias" in result.stderr
    assert "DATABASE_URL" in result.stderr
    assert "PID_TOKEN_PEPPER" in result.stderr
    assert calls == []


def test_omitted_pid_flag_preserves_full_compose_deploy(tmp_path) -> None:
    project = tmp_path / "project"
    deploy = project / "deploy"
    deploy.mkdir(parents=True)
    script = deploy / "deploy.sh"
    script.write_bytes(DEPLOY_SCRIPT.read_bytes())
    script.chmod(0o755)
    (deploy / "docker-compose.yaml").write_text("services: {}\n", encoding="utf-8")
    (project / ".env").write_text(
        "\n".join(
            (
                "POSTGRES_DB=dcou",
                "POSTGRES_USER=dcou",
                "POSTGRES_PASSWORD=postgres-secret",
                "POSTGRES_NODE_HOSTNAME=postgres-node-01",
                "DATABASE_URL=postgresql+psycopg://dcou:postgres-secret@tcc-postgres:5432/dcou",
                "REDIS_PASSWORD=redis-secret",
                "REDIS_URL=redis://:redis-secret@tcc-redis:6379/0",
                f"PID_TOKEN_PEPPER={'p' * 32}",
                "PID_ALLOWED_ORIGINS=https://editor.example.test",
                "PID_WS_PUBLIC_URL=wss://editor.example.test/pid/ws",
                "",
            )
        ),
        encoding="utf-8",
    )
    binary_dir = tmp_path / "bin"
    binary_dir.mkdir()
    docker_log = tmp_path / "docker.log"
    _write_executable(
        binary_dir / "docker",
        """#!/bin/sh
printf '%s\n' "$*" >> "$DOCKER_LOG"
if [ "$1 $2" = "info --format" ]; then
  printf 'inactive\n'
fi
""",
    )
    environment = os.environ.copy()
    environment.update(
        DOCKER_LOG=str(docker_log),
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
    assert "docker-compose.disabled.yaml" not in result.stderr
    assert "Docker Swarm não está ativo" in result.stderr
    assert docker_log.read_text(encoding="utf-8").splitlines() == [
        "info --format {{.Swarm.LocalNodeState}}"
    ]


def test_disabled_compose_omits_pid_infrastructure_and_forces_safe_modes() -> None:
    compose = (ROOT / "deploy/docker-compose.disabled.yaml").read_text(encoding="utf-8")

    assert "tcc-postgres:" not in compose
    assert "tcc-redis:" not in compose
    assert "PID_ENABLED: \"false\"" in compose
    assert "VITE_PID_ADAPTER: disabled" in compose
    assert "DATABASE_URL" not in compose
    assert "REDIS_URL" not in compose
