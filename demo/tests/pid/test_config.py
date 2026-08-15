from pathlib import Path

import dotenv
import pytest
import pid.config
from pid.config import PidSettings


PID_ENV_KEYS = (
    "PID_ENABLED", "DATABASE_URL", "REDIS_URL", "PID_TOKEN_PEPPER",
    "PID_ALLOWED_ORIGINS", "PID_WS_PUBLIC_URL",
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


@pytest.mark.parametrize(
    "enabled",
    ["1", "true", "TRUE", " yes ", "\tOn\t"],
)
def test_pid_enabled_accepts_only_explicit_truthy_values(
    monkeypatch: pytest.MonkeyPatch,
    enabled: str,
) -> None:
    clear_pid_env(monkeypatch)
    monkeypatch.setenv("PID_ENABLED", enabled)
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://dcou:secret@localhost/dcou")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("PID_TOKEN_PEPPER", "p" * 32)
    monkeypatch.setenv("PID_ALLOWED_ORIGINS", "https://editor.example.test")
    monkeypatch.setenv("PID_WS_PUBLIC_URL", "wss://editor.example.test/pid/ws")

    assert PidSettings.from_env(load_file=False).enabled is True


@pytest.mark.parametrize(
    "enabled",
    ["", " ", "0", "false", "FALSE", " no ", "\tOff\t"],
)
def test_pid_enabled_accepts_empty_and_explicit_falsy_values(
    monkeypatch: pytest.MonkeyPatch,
    enabled: str,
) -> None:
    clear_pid_env(monkeypatch)
    monkeypatch.setenv("PID_ENABLED", enabled)

    assert PidSettings.from_env(load_file=False).enabled is False


@pytest.mark.parametrize("enabled", ["treu", "tr ue", "enabled", "2"])
def test_pid_enabled_rejects_unknown_values_without_echoing_them(
    monkeypatch: pytest.MonkeyPatch,
    enabled: str,
) -> None:
    clear_pid_env(monkeypatch)
    monkeypatch.setenv("PID_ENABLED", enabled)

    with pytest.raises(ValueError) as exc_info:
        PidSettings.from_env(load_file=False)

    assert "PID_ENABLED" in str(exc_info.value)
    assert enabled not in str(exc_info.value)


def test_enabled_pid_requires_all_runtime_values(monkeypatch: pytest.MonkeyPatch) -> None:
    clear_pid_env(monkeypatch)
    monkeypatch.setenv("PID_ENABLED", "true")
    with pytest.raises(ValueError) as exc_info:
        PidSettings.from_env(load_file=False)
    assert str(exc_info.value) == (
        "Missing PID settings: DATABASE_URL, REDIS_URL, PID_TOKEN_PEPPER, "
        "PID_ALLOWED_ORIGINS, PID_WS_PUBLIC_URL"
    )


def test_enabled_pid_parses_exact_origin_allowlist(monkeypatch: pytest.MonkeyPatch) -> None:
    clear_pid_env(monkeypatch)
    monkeypatch.setenv("PID_ENABLED", "true")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://dcou:secret@localhost:5432/dcou")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("PID_TOKEN_PEPPER", "0123456789abcdef0123456789abcdef")
    monkeypatch.setenv("PID_ALLOWED_ORIGINS", "https://tcc.joao.baza.dev.br,http://localhost:5173")
    monkeypatch.setenv("PID_WS_PUBLIC_URL", "wss://tcc.joao.baza.dev.br/pid/ws")
    settings = PidSettings.from_env(load_file=False)
    assert settings.enabled is True
    assert settings.allowed_origins == ("https://tcc.joao.baza.dev.br", "http://localhost:5173")


@pytest.mark.parametrize(
    ("token_pepper", "expected_error"),
    [("a" * 31, True), ("a" * 32, False)],
)
def test_enabled_pid_validates_token_pepper_minimum_length(
    monkeypatch: pytest.MonkeyPatch,
    token_pepper: str,
    expected_error: bool,
) -> None:
    clear_pid_env(monkeypatch)
    monkeypatch.setenv("PID_ENABLED", "true")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://dcou:secret@localhost:5432/dcou")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("PID_TOKEN_PEPPER", token_pepper)
    monkeypatch.setenv("PID_ALLOWED_ORIGINS", "https://tcc.joao.baza.dev.br")
    monkeypatch.setenv("PID_WS_PUBLIC_URL", "wss://tcc.joao.baza.dev.br/pid/ws")

    if expected_error:
        with pytest.raises(ValueError, match="PID_TOKEN_PEPPER"):
            PidSettings.from_env(load_file=False)
    else:
        assert PidSettings.from_env(load_file=False).token_pepper == token_pepper


def test_load_dotenv_preserves_existing_process_values(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    clear_pid_env(monkeypatch)
    (tmp_path / ".env").write_text(
        "PID_ENABLED=false\n"
        "DATABASE_URL=postgresql+psycopg://dcou:secret@localhost:5432/dcou\n"
        "REDIS_URL=redis://localhost:6379/0\n"
        "PID_TOKEN_PEPPER=0123456789abcdef0123456789abcdef\n"
        "PID_ALLOWED_ORIGINS=https://tcc.joao.baza.dev.br\n"
        "PID_WS_PUBLIC_URL=wss://tcc.joao.baza.dev.br/pid/ws\n",
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("PID_ENABLED", "true")
    real_load_dotenv = dotenv.load_dotenv

    def load_test_dotenv(*, override: bool) -> bool:
        assert override is False
        return real_load_dotenv(dotenv_path=tmp_path / ".env", override=override)

    monkeypatch.setattr(pid.config, "load_dotenv", load_test_dotenv)

    settings = PidSettings.from_env()
    assert settings.enabled is True
    assert settings.database_url == "postgresql+psycopg://dcou:secret@localhost:5432/dcou"
