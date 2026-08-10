from pathlib import Path

from pid.catalog.drawio_import import import_drawio_catalog


def test_xml_import_preserves_pid2_assets(tmp_path: Path) -> None:
    source_root = tmp_path / "drawio"
    stencil_root = source_root / "src/main/webapp/stencils/pid"
    stencil_root.mkdir(parents=True)
    (stencil_root / "pumps.xml").write_text(
        '<shapes><shape name="Pump" w="100" h="100" /></shapes>',
        encoding="utf-8",
    )

    frontend_root = tmp_path / "frontend"
    asset_root = frontend_root / "public/pid/symbols"
    asset_root.mkdir(parents=True)
    pid2_asset = asset_root / "drawio-pid2-valves-gate.svg"
    pid2_asset.write_text("pid2", encoding="utf-8")
    stale_xml_asset = asset_root / "drawio-pumps-stale.svg"
    stale_xml_asset.write_text("stale", encoding="utf-8")

    import_drawio_catalog(source_root, frontend_root)

    assert pid2_asset.read_text(encoding="utf-8") == "pid2"
    assert not stale_xml_asset.exists()


def test_xml_import_marks_iso_named_categories_as_free(tmp_path: Path) -> None:
    source_root = tmp_path / "drawio"
    stencil_root = source_root / "src/main/webapp/stencils/pid"
    stencil_root.mkdir(parents=True)
    (stencil_root / "pumps_iso.xml").write_text(
        '<shapes><shape name="ISO Pump" w="100" h="100" /></shapes>',
        encoding="utf-8",
    )

    symbols = import_drawio_catalog(source_root, tmp_path / "frontend")

    assert symbols[0]["standards"] == ["free"]
