import asyncio

import pytest
from sqlalchemy import select

from pid.models import PidCatalogVersion, PidStandard
from pid.repositories.catalogs import CatalogHashConflict, CatalogRepository


async def test_activate_catalog_version_is_idempotent(session_factory) -> None:
    repository = CatalogRepository(session_factory)
    await repository.activate(PidStandard.ISO, "0.1.0", "a" * 64)
    await repository.activate(PidStandard.ISO, "0.1.0", "a" * 64)

    active = await repository.get(PidStandard.ISO, "0.1.0")

    assert active is not None
    assert active.manifest_hash == "a" * 64


async def test_concurrent_activation_with_same_hash_is_idempotent(
    session_factory,
) -> None:
    repository = CatalogRepository(session_factory)
    start = asyncio.Event()
    ready = 0

    async def activate() -> None:
        nonlocal ready
        ready += 1
        if ready == 2:
            start.set()
        await start.wait()
        await repository.activate(PidStandard.ISO, "0.1.0", "a" * 64)

    await asyncio.gather(activate(), activate())

    async with session_factory() as session:
        active_versions = list(
            await session.scalars(
                select(PidCatalogVersion).where(
                    PidCatalogVersion.standard == PidStandard.ISO,
                    PidCatalogVersion.version == "0.1.0",
                )
            )
        )
    assert len(active_versions) == 1
    assert active_versions[0].manifest_hash == "a" * 64


async def test_concurrent_activation_with_different_hashes_keeps_winner(
    session_factory,
) -> None:
    repository = CatalogRepository(session_factory)
    start = asyncio.Event()
    ready = 0

    async def activate(manifest_hash: str) -> str:
        nonlocal ready
        ready += 1
        if ready == 2:
            start.set()
        await start.wait()
        await repository.activate(
            PidStandard.ISO,
            "0.1.0",
            manifest_hash,
        )
        return manifest_hash

    results = await asyncio.gather(
        activate("a" * 64),
        activate("b" * 64),
        return_exceptions=True,
    )

    winners = [result for result in results if isinstance(result, str)]
    conflicts = [
        result for result in results if isinstance(result, CatalogHashConflict)
    ]
    assert len(winners) == 1
    assert len(conflicts) == 1
    assert isinstance(conflicts[0], CatalogHashConflict)

    active = await repository.get(PidStandard.ISO, "0.1.0")
    assert active is not None
    assert active.manifest_hash == winners[0]


async def test_activate_conflicting_hash_preserves_original(session_factory) -> None:
    repository = CatalogRepository(session_factory)
    await repository.activate(PidStandard.ISO, "0.1.0", "a" * 64)

    with pytest.raises(CatalogHashConflict):
        await repository.activate(PidStandard.ISO, "0.1.0", "b" * 64)

    active = await repository.get(PidStandard.ISO, "0.1.0")
    assert active is not None
    assert active.manifest_hash == "a" * 64


async def test_same_version_can_coexist_across_standards(session_factory) -> None:
    repository = CatalogRepository(session_factory)
    await repository.activate(PidStandard.ISA, "0.1.0", "a" * 64)
    await repository.activate(PidStandard.ISO, "0.1.0", "b" * 64)

    isa = await repository.get(PidStandard.ISA, "0.1.0")
    iso = await repository.get(PidStandard.ISO, "0.1.0")

    assert isa is not None
    assert iso is not None
    assert isa.manifest_hash == "a" * 64
    assert iso.manifest_hash == "b" * 64


async def test_activate_trims_version(session_factory) -> None:
    repository = CatalogRepository(session_factory)

    await repository.activate(PidStandard.ISO, " 0.1.0 ", "a" * 64)

    assert await repository.get(PidStandard.ISO, "0.1.0") is not None


@pytest.mark.parametrize("version", ["", "   ", "\t\n"])
async def test_activate_rejects_blank_version_before_opening_session(
    session_factory,
    version: str,
) -> None:
    session_opened = False

    def observed_session_factory():
        nonlocal session_opened
        session_opened = True
        return session_factory()

    repository = CatalogRepository(observed_session_factory)

    with pytest.raises(ValueError, match="version"):
        await repository.activate(PidStandard.ISO, version, "a" * 64)

    assert session_opened is False


@pytest.mark.parametrize(
    "manifest_hash",
    [
        "a" * 63,
        "a" * 65,
        "A" * 64,
        "g" * 64,
        "not-a-digest",
    ],
)
async def test_activate_rejects_invalid_manifest_hash_before_opening_session(
    session_factory,
    manifest_hash: str,
) -> None:
    session_opened = False

    def observed_session_factory():
        nonlocal session_opened
        session_opened = True
        return session_factory()

    repository = CatalogRepository(observed_session_factory)

    with pytest.raises(ValueError, match="manifest_hash"):
        await repository.activate(PidStandard.ISO, "0.1.0", manifest_hash)

    assert session_opened is False
