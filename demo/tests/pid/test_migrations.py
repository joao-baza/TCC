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
