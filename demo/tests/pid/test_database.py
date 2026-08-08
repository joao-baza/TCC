from pid.database import resolve_database_url


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
