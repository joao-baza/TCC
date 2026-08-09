from pathlib import Path
import json

from pid.models import PidStandard
from pid.repositories.diagrams import DiagramRepository
from pid.services.diagram_service import DiagramService


ROOT = Path(__file__).resolve().parents[3]


def test_pid_standard_exposes_free_value() -> None:
    assert PidStandard("free") is PidStandard.FREE


def test_migrations_cover_fresh_and_existing_databases() -> None:
    initial = (ROOT / "migrations/versions/20260808_0001_pid_foundation.py").read_text(
        encoding="utf-8"
    )
    upgrade = (ROOT / "migrations/versions/20260809_0002_add_free_pid_standard.py").read_text(
        encoding="utf-8"
    )

    assert '"free",' in initial
    assert 'down_revision: str | None = "20260808_0001"' in upgrade
    assert "ALTER TYPE pid_standard ADD VALUE IF NOT EXISTS 'free'" in upgrade


def test_catalog_validation_accepts_free_standard() -> None:
    schema = json.loads(
        (ROOT / "pid/catalog/manifest.schema.json").read_text(encoding="utf-8")
    )

    assert schema["properties"]["standard"]["enum"] == ["isa", "iso", "free"]
    assert schema["$defs"]["symbol"]["properties"]["standard"]["enum"] == [
        "isa",
        "iso",
        "free",
    ]


async def test_diagram_service_persists_free_standard(session_factory) -> None:
    service = DiagramService(session_factory, token_pepper="p" * 32)

    created = await service.create(
        title="Fluxograma livre",
        standard=PidStandard.FREE,
        catalog_version="local-v1",
    )

    async with session_factory() as session:
        diagram = await DiagramRepository(session).get_active(created.diagram_id)

    assert diagram is not None
    assert diagram.standard is PidStandard.FREE
