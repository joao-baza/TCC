from __future__ import annotations

from dataclasses import dataclass

from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from pid.config import PidSettings
from pid.database import create_pid_engine, create_session_factory


@dataclass
class PidRuntime:
    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]
    redis: Redis

    @classmethod
    def from_settings(cls, settings: PidSettings) -> "PidRuntime":
        if settings.database_url is None or settings.redis_url is None:
            raise ValueError("PID runtime requires validated database and Redis settings")

        engine = create_pid_engine(settings.database_url)
        return cls(
            engine=engine,
            session_factory=create_session_factory(engine),
            redis=Redis.from_url(settings.redis_url),
        )

    async def check_ready(self) -> None:
        async with self.engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        await self.redis.ping()

    async def close(self) -> None:
        first_error: BaseException | None = None
        try:
            await self.redis.aclose()
        except BaseException as error:
            first_error = error

        try:
            await self.engine.dispose()
        except BaseException as error:
            if first_error is None:
                first_error = error

        if first_error is not None:
            raise first_error
