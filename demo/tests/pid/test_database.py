import os
from pathlib import Path
import subprocess
import sys

from demo.tests.pid.conftest import _alembic_config
from pid.database import resolve_database_url


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_database_url_prefers_explicit_override(monkeypatch) -> None:
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://environment/database",
    )

    assert (
        resolve_database_url(
            "postgresql+psycopg://config/database",
            explicit_override="postgresql+psycopg://override/database",
        )
        == "postgresql+psycopg://override/database"
    )


def test_database_url_prefers_environment(monkeypatch) -> None:
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://environment/database",
    )

    assert (
        resolve_database_url("postgresql+psycopg://config/database")
        == "postgresql+psycopg://environment/database"
    )


def test_database_url_falls_back_to_config(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    assert (
        resolve_database_url("postgresql+psycopg://config/database")
        == "postgresql+psycopg://config/database"
    )


def test_test_database_url_is_an_explicit_alembic_override() -> None:
    database_url = "postgresql+psycopg://test/database"

    config = _alembic_config(database_url)

    assert config.attributes["database_url_override"] == database_url


def test_alembic_config_preserves_percent_encoded_database_url() -> None:
    database_url = "postgresql+psycopg://dcou:p%40ssword@localhost/dcou"

    config = _alembic_config(database_url)

    assert config.attributes["database_url_override"] == database_url


def test_alembic_offline_is_independent_from_working_directory(
    tmp_path: Path,
) -> None:
    environment = os.environ.copy()
    environment.pop("DATABASE_URL", None)

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "alembic",
            "-c",
            str(PROJECT_ROOT / "alembic.ini"),
            "upgrade",
            "head",
            "--sql",
        ],
        cwd=tmp_path,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE pid_diagrams" in result.stdout
