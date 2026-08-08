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
async def engine(migrated_database_url: str):
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
