import re

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from pid.models import PidCatalogVersion, PidStandard


_MANIFEST_HASH_PATTERN = re.compile(r"[a-f0-9]{64}")


class CatalogHashConflict(RuntimeError):
    def __init__(
        self,
        standard: PidStandard,
        version: str,
    ) -> None:
        super().__init__(
            f"catalog {standard.value}:{version} is active with another hash"
        )
        self.standard = standard
        self.version = version


class CatalogRepository:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
    ) -> None:
        self._session_factory = session_factory

    async def activate(
        self,
        standard: PidStandard,
        version: str,
        manifest_hash: str,
    ) -> None:
        normalized_version = version.strip()
        if not normalized_version:
            raise ValueError("version must not be blank")
        if _MANIFEST_HASH_PATTERN.fullmatch(manifest_hash) is None:
            raise ValueError(
                "manifest_hash must be a 64-character lowercase hex digest"
            )

        async with self._session_factory() as session:
            async with session.begin():
                await session.execute(
                    insert(PidCatalogVersion)
                    .values(
                        standard=standard,
                        version=normalized_version,
                        manifest_hash=manifest_hash,
                    )
                    .on_conflict_do_nothing(
                        index_elements=[
                            PidCatalogVersion.standard,
                            PidCatalogVersion.version,
                        ]
                    )
                )
                active = await session.scalar(
                    select(PidCatalogVersion)
                    .where(
                        PidCatalogVersion.standard == standard,
                        PidCatalogVersion.version == normalized_version,
                    )
                    .with_for_update()
                )
                if active is None:
                    raise RuntimeError("catalog activation did not persist a row")
                if active.manifest_hash != manifest_hash:
                    raise CatalogHashConflict(standard, normalized_version)

    async def get(
        self,
        standard: PidStandard,
        version: str,
    ) -> PidCatalogVersion | None:
        async with self._session_factory() as session:
            return await session.scalar(
                select(PidCatalogVersion).where(
                    PidCatalogVersion.standard == standard,
                    PidCatalogVersion.version == version.strip(),
                )
            )
