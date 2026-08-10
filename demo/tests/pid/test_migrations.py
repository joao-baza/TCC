import asyncio
import uuid

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


PID_TABLES = {
    "pid_diagrams",
    "pid_access_tokens",
    "pid_document_snapshots",
    "pid_catalog_versions",
}
PID_ENUMS = {"pid_standard", "pid_access_scope"}


async def _schema_state(engine) -> dict:
    async with engine.connect() as connection:
        schema = await connection.run_sync(_inspect_schema)
        enum_names = set(
            (
                await connection.execute(
                    text(
                        "SELECT typname FROM pg_type "
                        "WHERE typname IN ('pid_standard', 'pid_access_scope')"
                    )
                )
            ).scalars()
        )
        standard_values = tuple(
            (
                await connection.execute(
                    text(
                        "SELECT enumlabel FROM pg_enum "
                        "JOIN pg_type ON pg_type.oid = pg_enum.enumtypid "
                        "WHERE pg_type.typname = 'pid_standard' "
                        "ORDER BY enumsortorder"
                    )
                )
            ).scalars()
        )
    return {**schema, "enums": enum_names, "pid_standard_values": standard_values}


def _inspect_schema(sync_connection) -> dict:
    inspector = inspect(sync_connection)
    tables = set(inspector.get_table_names())
    return {
        "tables": tables,
        "columns": {
            table: {column["name"] for column in inspector.get_columns(table)}
            for table in PID_TABLES & tables
        },
        "primary_keys": {
            table: inspector.get_pk_constraint(table)["constrained_columns"]
            for table in PID_TABLES & tables
        },
        "foreign_keys": {
            table: inspector.get_foreign_keys(table)
            for table in PID_TABLES & tables
        },
        "checks": {
            table: inspector.get_check_constraints(table)
            for table in PID_TABLES & tables
        },
        "indexes": {
            table: {index["name"] for index in inspector.get_indexes(table)}
            for table in PID_TABLES & tables
        },
        "unique_constraints": {
            table: inspector.get_unique_constraints(table)
            for table in PID_TABLES & tables
        },
    }


def _assert_foundation_schema(schema: dict) -> None:
    assert PID_TABLES.issubset(schema["tables"])
    assert schema["enums"] == PID_ENUMS
    assert schema["pid_standard_values"] == ("free",)
    assert schema["columns"] == {
        "pid_diagrams": {
            "id",
            "title",
            "standard",
            "catalog_version",
            "schema_version",
            "created_at",
            "updated_at",
            "deleted_at",
        },
        "pid_access_tokens": {
            "id",
            "diagram_id",
            "scope",
            "token_hash",
            "created_at",
            "revoked_at",
        },
        "pid_document_snapshots": {
            "diagram_id",
            "revision",
            "yjs_state",
            "document_projection",
            "schema_version",
            "is_valid",
            "created_at",
        },
        "pid_catalog_versions": {
            "standard",
            "version",
            "manifest_hash",
            "activated_at",
        },
    }
    assert schema["primary_keys"] == {
        "pid_diagrams": ["id"],
        "pid_access_tokens": ["id"],
        "pid_document_snapshots": ["diagram_id", "revision"],
        "pid_catalog_versions": ["standard", "version"],
    }

    for table in ("pid_access_tokens", "pid_document_snapshots"):
        assert any(
            foreign_key["referred_table"] == "pid_diagrams"
            and foreign_key["constrained_columns"] == ["diagram_id"]
            and foreign_key["options"].get("ondelete") == "CASCADE"
            for foreign_key in schema["foreign_keys"][table]
        )

    diagram_checks = " ".join(
        check["sqltext"] for check in schema["checks"]["pid_diagrams"]
    )
    snapshot_checks = " ".join(
        check["sqltext"]
        for check in schema["checks"]["pid_document_snapshots"]
    )
    assert "schema_version > 0" in diagram_checks
    assert "revision > 0" in snapshot_checks
    assert "schema_version > 0" in snapshot_checks
    assert schema["indexes"]["pid_diagrams"] >= {
        "ix_pid_diagrams_updated_at",
        "ix_pid_diagrams_deleted_at",
    }
    assert "ix_pid_access_tokens_diagram_id" in schema["indexes"][
        "pid_access_tokens"
    ]
    assert any(
        constraint["column_names"] == ["token_hash"]
        for constraint in schema["unique_constraints"]["pid_access_tokens"]
    )


async def _assert_check_and_cascade(engine) -> None:
    invalid_diagram_id = uuid.uuid4()
    async with engine.connect() as connection:
        transaction = await connection.begin()
        with pytest.raises(IntegrityError) as error:
            await connection.execute(
                text(
                    "INSERT INTO pid_diagrams "
                    "(id, title, standard, catalog_version, schema_version) "
                    "VALUES (:id, 'Invalid', 'free', 'test', 0)"
                ),
                {"id": invalid_diagram_id},
            )
        assert "ck_pid_diagrams_schema_version_positive" in str(error.value.orig)
        await transaction.rollback()

    diagram_id = uuid.uuid4()
    token_id = uuid.uuid4()
    async with engine.begin() as connection:
        await connection.execute(
            text(
                "INSERT INTO pid_diagrams "
                "(id, title, standard, catalog_version, schema_version) "
                "VALUES (:id, 'Cascade', 'free', 'test', 1)"
            ),
            {"id": diagram_id},
        )
        await connection.execute(
            text(
                "INSERT INTO pid_access_tokens "
                "(id, diagram_id, scope, token_hash) "
                "VALUES (:id, :diagram_id, 'view', :token_hash)"
            ),
            {
                "id": token_id,
                "diagram_id": diagram_id,
                "token_hash": f"test-{token_id}",
            },
        )
        await connection.execute(
            text("DELETE FROM pid_diagrams WHERE id = :id"),
            {"id": diagram_id},
        )

    async with engine.connect() as connection:
        remaining_tokens = await connection.scalar(
            text("SELECT count(*) FROM pid_access_tokens WHERE id = :id"),
            {"id": token_id},
        )
    assert remaining_tokens == 0


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


async def test_migration_round_trip_and_schema_contract(
    engine,
    alembic_config: Config,
) -> None:
    try:
        await asyncio.to_thread(command.downgrade, alembic_config, "base")
        downgraded = await _schema_state(engine)
        assert PID_TABLES.isdisjoint(downgraded["tables"])
        assert PID_ENUMS.isdisjoint(downgraded["enums"])

        await asyncio.to_thread(command.upgrade, alembic_config, "head")
        upgraded = await _schema_state(engine)
        _assert_foundation_schema(upgraded)
        await _assert_check_and_cascade(engine)
    finally:
        await asyncio.to_thread(command.upgrade, alembic_config, "head")


async def test_free_only_migration_discards_normative_rows(
    engine,
    alembic_config: Config,
) -> None:
    isa_diagram_id = uuid.uuid4()
    free_diagram_id = uuid.uuid4()
    isa_token_id = uuid.uuid4()
    try:
        await asyncio.to_thread(command.downgrade, alembic_config, "20260809_0002")
        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "INSERT INTO pid_diagrams "
                    "(id, title, standard, catalog_version, schema_version) VALUES "
                    "(:isa_id, 'Legado ISA', 'isa', 'legacy', 1), "
                    "(:free_id, 'Livre', 'free', 'local-v1', 1)"
                ),
                {"isa_id": isa_diagram_id, "free_id": free_diagram_id},
            )
            await connection.execute(
                text(
                    "INSERT INTO pid_access_tokens (id, diagram_id, scope, token_hash) "
                    "VALUES (:id, :diagram_id, 'view', :token_hash)"
                ),
                {
                    "id": isa_token_id,
                    "diagram_id": isa_diagram_id,
                    "token_hash": f"legacy-{isa_token_id}",
                },
            )
            await connection.execute(
                text(
                    "INSERT INTO pid_document_snapshots "
                    "(diagram_id, revision, yjs_state, document_projection, schema_version, is_valid) "
                    "VALUES (:diagram_id, 1, decode('', 'hex'), '{}'::jsonb, 1, true)"
                ),
                {"diagram_id": isa_diagram_id},
            )
            await connection.execute(
                text(
                    "INSERT INTO pid_catalog_versions (standard, version, manifest_hash) VALUES "
                    "('iso', 'legacy', 'legacy-hash'), "
                    "('free', 'local-v1', 'free-hash')"
                )
            )

        await asyncio.to_thread(command.upgrade, alembic_config, "head")

        async with engine.connect() as connection:
            diagrams = set(
                (await connection.execute(text("SELECT id FROM pid_diagrams"))).scalars()
            )
            tokens = await connection.scalar(
                text("SELECT count(*) FROM pid_access_tokens WHERE id = :id"),
                {"id": isa_token_id},
            )
            snapshots = await connection.scalar(
                text(
                    "SELECT count(*) FROM pid_document_snapshots "
                    "WHERE diagram_id = :diagram_id"
                ),
                {"diagram_id": isa_diagram_id},
            )
            catalog_standards = tuple(
                (
                    await connection.execute(
                        text("SELECT standard::text FROM pid_catalog_versions ORDER BY standard::text")
                    )
                ).scalars()
            )

        assert diagrams == {free_diagram_id}
        assert tokens == 0
        assert snapshots == 0
        assert catalog_standards == ("free",)
        assert (await _schema_state(engine))["pid_standard_values"] == ("free",)
    finally:
        await asyncio.to_thread(command.upgrade, alembic_config, "head")
