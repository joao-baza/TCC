import pytest

from pid.models import PidStandard
from pid.repositories.catalogs import CatalogHashConflict, CatalogRepository


async def test_activate_catalog_version_is_idempotent(session_factory) -> None:
    repository = CatalogRepository(session_factory)
    await repository.activate(PidStandard.ISO, "0.1.0", "a" * 64)
    await repository.activate(PidStandard.ISO, "0.1.0", "a" * 64)

    active = await repository.get(PidStandard.ISO, "0.1.0")

    assert active is not None
    assert active.manifest_hash == "a" * 64


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
