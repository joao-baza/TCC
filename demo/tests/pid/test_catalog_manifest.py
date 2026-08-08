import json
from pathlib import Path
import re
import subprocess
import sys

import pytest

from pid.catalog.validator import (
    CatalogValidationError,
    ValidatedManifest,
    validate_manifest,
)


ROOT = Path(__file__).resolve().parents[3]
CATALOG_ROOT = ROOT / "pid" / "catalog"


def valid_symbol() -> dict:
    return {
        "key": "iso:reactor:batch",
        "standard": "iso",
        "catalogVersion": "0.1.0",
        "name": "Reator batelada",
        "aliases": ["batch reactor"],
        "category": "reactors",
        "svgPath": "assets/reactor-batch.svg",
        "viewBox": "0 0 124 200",
        "defaultSize": {"width": 124, "height": 200},
        "rotationPolicy": "quarter-turn",
        "portTemplates": [],
        "propertySchema": {},
        "allowedConnections": ["process"],
        "sourceKind": "wikimedia",
        "sourcePageUrl": (
            "https://commons.wikimedia.org/wiki/File:ReactorBatch.svg"
        ),
        "sourceDownloadUrl": (
            "https://upload.wikimedia.org/reactor-batch.svg"
        ),
        "sourceRevision": "1254967890",
        "sourceAuthor": "Daniele Pugliesi",
        "sourceReference": "Chemical engineering symbols",
        "licenseName": "CC0-1.0",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "licenseReference": "Wikimedia file page",
        "attributionText": "",
        "originalFormat": "svg",
        "originalChecksum": "a" * 64,
        "derivationRecord": [],
    }


def valid_manifest(*symbols: dict) -> dict:
    return {
        "standard": "iso",
        "version": "0.1.0",
        "status": "draft",
        "symbols": list(symbols) if symbols else [valid_symbol()],
    }


def write_manifest(path: Path, manifest: dict, **json_options: object) -> Path:
    path.write_text(
        json.dumps(manifest, ensure_ascii=False, **json_options),
        encoding="utf-8",
    )
    return path


def test_valid_manifest_has_canonical_sha256(tmp_path: Path) -> None:
    compact = write_manifest(
        tmp_path / "compact.json",
        valid_manifest(),
        separators=(",", ":"),
    )
    formatted = write_manifest(
        tmp_path / "formatted.json",
        {
            "symbols": [valid_symbol()],
            "status": "draft",
            "version": "0.1.0",
            "standard": "iso",
        },
        indent=4,
        sort_keys=True,
    )

    first = validate_manifest(compact)
    second = validate_manifest(formatted)

    assert isinstance(first, ValidatedManifest)
    assert first.data == valid_manifest()
    assert first.manifest_hash == second.manifest_hash
    assert len(first.manifest_hash) == 64


def test_manifest_rejects_missing_license(tmp_path: Path) -> None:
    symbol = valid_symbol()
    del symbol["licenseName"]
    path = write_manifest(tmp_path / "manifest.json", valid_manifest(symbol))

    with pytest.raises(CatalogValidationError, match="licenseName"):
        validate_manifest(path)


@pytest.mark.parametrize(
    "svg_path",
    (
        "../secret.svg",
        "assets/../../secret.svg",
        "/etc/passwd",
        r"..\secret.svg",
        r"C:\Windows\secret.svg",
        r"\\server\share\secret.svg",
    ),
)
def test_manifest_rejects_path_traversal_and_absolute_paths(
    tmp_path: Path,
    svg_path: str,
) -> None:
    symbol = valid_symbol()
    symbol["svgPath"] = svg_path
    path = write_manifest(tmp_path / "manifest.json", valid_manifest(symbol))

    with pytest.raises(CatalogValidationError, match="svgPath"):
        validate_manifest(path)


def test_manifest_rejects_duplicate_symbol_keys(tmp_path: Path) -> None:
    duplicate = valid_symbol()
    duplicate["name"] = "Outro nome"
    path = write_manifest(
        tmp_path / "manifest.json",
        valid_manifest(valid_symbol(), duplicate),
    )

    with pytest.raises(CatalogValidationError, match="duplicate symbol key"):
        validate_manifest(path)


@pytest.mark.parametrize(
    ("field", "value", "expected_path"),
    (
        ("standard", "isa", "symbols[0].standard"),
        ("catalogVersion", "9.9.9", "symbols[0].catalogVersion"),
    ),
)
def test_symbol_header_values_must_match(
    tmp_path: Path,
    field: str,
    value: str,
    expected_path: str,
) -> None:
    symbol = valid_symbol()
    symbol[field] = value
    path = write_manifest(tmp_path / "manifest.json", valid_manifest(symbol))

    with pytest.raises(CatalogValidationError, match=re.escape(expected_path)):
        validate_manifest(path)


@pytest.mark.parametrize(
    ("field", "value"),
    (
        ("originalChecksum", "ABC"),
        ("originalFormat", "jpg"),
        ("sourcePageUrl", "http://example.com/source"),
        ("sourceDownloadUrl", "ftp://example.com/source.svg"),
        ("licenseUrl", "http://example.com/license"),
    ),
)
def test_manifest_rejects_invalid_source_metadata(
    tmp_path: Path,
    field: str,
    value: str,
) -> None:
    symbol = valid_symbol()
    symbol[field] = value
    path = write_manifest(tmp_path / "manifest.json", valid_manifest(symbol))

    with pytest.raises(CatalogValidationError, match=field):
        validate_manifest(path)


def test_validation_errors_are_deterministically_sorted_by_path(
    tmp_path: Path,
) -> None:
    first_symbol = valid_symbol()
    first_symbol["sourcePageUrl"] = "http://example.com/source"
    second_symbol = valid_symbol()
    second_symbol["key"] = "iso:reactor:second"
    second_symbol["originalChecksum"] = "bad"
    path = write_manifest(
        tmp_path / "manifest.json",
        valid_manifest(first_symbol, second_symbol),
    )

    messages: list[str] = []
    for _ in range(2):
        with pytest.raises(CatalogValidationError) as error:
            validate_manifest(path)
        messages.append(str(error.value))

    assert messages[0] == messages[1]
    assert messages[0].index("symbols[0].sourcePageUrl") < messages[0].index(
        "symbols[1].originalChecksum"
    )


def test_root_validation_errors_sort_before_nested_paths(tmp_path: Path) -> None:
    manifest = valid_manifest()
    manifest["unexpected"] = True
    manifest["symbols"][0]["originalChecksum"] = "bad"
    path = write_manifest(tmp_path / "manifest.json", manifest)

    with pytest.raises(CatalogValidationError) as error:
        validate_manifest(path)

    message = str(error.value)
    assert message.index("$:") < message.index("symbols[0].originalChecksum")


@pytest.mark.parametrize(
    ("contents", "expected"),
    (
        ("{not json", "invalid JSON"),
        ("[]", "manifest root"),
    ),
)
def test_invalid_document_has_clear_public_error(
    tmp_path: Path,
    contents: str,
    expected: str,
) -> None:
    path = tmp_path / "manifest.json"
    path.write_text(contents, encoding="utf-8")

    with pytest.raises(CatalogValidationError, match=expected):
        validate_manifest(path)


def test_missing_manifest_has_clear_public_error(tmp_path: Path) -> None:
    with pytest.raises(CatalogValidationError, match="could not read manifest"):
        validate_manifest(tmp_path / "missing.json")


def test_cli_prints_valid_manifest_and_hash(tmp_path: Path) -> None:
    path = write_manifest(tmp_path / "manifest.json", valid_manifest())

    result = subprocess.run(
        [sys.executable, "-m", "pid.catalog.validator", str(path)],
        cwd=ROOT,
        capture_output=True,
        check=False,
        text=True,
    )

    assert result.returncode == 0
    assert result.stdout == f"VALID {path} {validate_manifest(path).manifest_hash}\n"
    assert result.stderr == ""


def test_cli_stops_at_first_invalid_manifest_without_traceback(
    tmp_path: Path,
) -> None:
    invalid = tmp_path / "invalid.json"
    invalid.write_text("not-json", encoding="utf-8")
    valid = write_manifest(tmp_path / "valid.json", valid_manifest())

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pid.catalog.validator",
            str(invalid),
            str(valid),
        ],
        cwd=ROOT,
        capture_output=True,
        check=False,
        text=True,
    )

    assert result.returncode != 0
    assert result.stdout == ""
    assert str(invalid) in result.stderr
    assert "invalid JSON" in result.stderr
    assert "Traceback" not in result.stderr


def test_foundation_manifests_are_valid() -> None:
    expected = {
        "isa": {
            "standard": "isa",
            "version": "0.1.0-foundation",
            "status": "draft",
            "symbols": [],
        },
        "iso": {
            "standard": "iso",
            "version": "0.1.0-foundation",
            "status": "draft",
            "symbols": [],
        },
    }

    for standard, manifest in expected.items():
        path = CATALOG_ROOT / "manifests" / standard / "foundation.json"
        assert validate_manifest(path).data == manifest


def test_sources_are_pinned_to_the_approved_inventory() -> None:
    sources = json.loads(
        (CATALOG_ROOT / "sources.json").read_text(encoding="utf-8")
    )

    assert sources == {
        "drawio": {
            "repository": "https://github.com/jgraph/drawio",
            "commit": "a1f615b7f5a5237da71de2ce2f057b5fa70b0aeb",
            "paths": [
                "src/main/webapp/stencils/pid",
                "src/main/webapp/shapes/pid2",
            ],
            "authorizationReference": "project-private-authorization",
        },
        "wikimedia": [
            {
                "category": "P&ID symbols",
                "url": (
                    "https://commons.wikimedia.org/wiki/Category:P%26ID_symbols"
                ),
                "revision": "1007862109",
                "observedRootFiles": 82,
                "observedSubcategories": 26,
            },
            {
                "category": "Chemical engineering symbols",
                "url": (
                    "https://commons.wikimedia.org/wiki/Category:"
                    "Chemical_engineering_symbols"
                ),
                "revision": "1254967890",
                "observedRootFiles": 12,
                "observedSubcategories": 1,
            },
        ],
    }


def test_third_party_notice_does_not_claim_asset_redistribution() -> None:
    notice = (ROOT / "THIRD_PARTY_NOTICES.md").read_text(encoding="utf-8")

    assert "does not redistribute third-party assets" in notice
    assert "pid/catalog/sources.json" in notice
    assert "private authorization" in notice
    assert "public license" in notice
