"""Validation and canonical hashing for versioned P&ID catalog manifests."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
import sys
from typing import Any, Sequence

from jsonschema import Draft202012Validator


SCHEMA_PATH = Path(__file__).with_name("manifest.schema.json")


class CatalogValidationError(ValueError):
    """Raised when a catalog manifest cannot be read or is invalid."""


@dataclass(frozen=True)
class ValidatedManifest:
    """Validated manifest data and its canonical SHA-256 digest."""

    data: dict[str, Any]
    manifest_hash: str


@dataclass(frozen=True)
class _ValidationIssue:
    path: tuple[str | int, ...]
    message: str


def validate_manifest(path: Path) -> ValidatedManifest:
    """Validate *path* and return its parsed data and canonical digest."""

    data = _read_manifest(path)
    validator = Draft202012Validator(_read_schema())
    issues = [
        _ValidationIssue(tuple(error.absolute_path), error.message)
        for error in validator.iter_errors(data)
    ]
    issues.extend(_semantic_issues(data))

    if issues:
        ordered = sorted(issues, key=_issue_sort_key)
        details = "; ".join(
            f"{_format_path(issue.path)}: {issue.message}" for issue in ordered
        )
        raise CatalogValidationError(f"invalid catalog manifest: {details}")

    try:
        canonical = json.dumps(
            data,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        ).encode("utf-8")
    except UnicodeError:
        raise CatalogValidationError(
            "manifest contains invalid Unicode and cannot be encoded as UTF-8"
        ) from None
    except ValueError:
        raise CatalogValidationError(
            "manifest contains a non-finite JSON number"
        ) from None
    return ValidatedManifest(
        data=data,
        manifest_hash=hashlib.sha256(canonical).hexdigest(),
    )


def _read_manifest(path: Path) -> dict[str, Any]:
    try:
        contents = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise CatalogValidationError(
            f"could not read manifest {path}: {error}"
        ) from None

    try:
        data = json.loads(contents, parse_constant=_reject_non_finite_number)
    except json.JSONDecodeError as error:
        raise CatalogValidationError(
            f"invalid JSON in manifest {path} at line {error.lineno}, "
            f"column {error.colno}: {error.msg}"
        ) from None
    except ValueError as error:
        raise CatalogValidationError(
            f"invalid JSON in manifest {path}: {error}"
        ) from None

    if not isinstance(data, dict):
        raise CatalogValidationError("manifest root must be a JSON object")
    if _contains_isolated_surrogate(data):
        raise CatalogValidationError(
            "manifest contains invalid Unicode: isolated surrogate code point"
        )
    return data


def _reject_non_finite_number(token: str) -> None:
    raise ValueError(f"non-finite JSON number {token!r} is not allowed")


def _contains_isolated_surrogate(value: Any) -> bool:
    if isinstance(value, str):
        return any(0xD800 <= ord(character) <= 0xDFFF for character in value)
    if isinstance(value, list):
        return any(_contains_isolated_surrogate(item) for item in value)
    if isinstance(value, dict):
        return any(
            _contains_isolated_surrogate(key)
            or _contains_isolated_surrogate(item)
            for key, item in value.items()
        )
    return False


def _read_schema() -> dict[str, Any]:
    try:
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"catalog schema is unavailable: {error}") from error
    if not isinstance(schema, dict):
        raise RuntimeError("catalog schema root must be a JSON object")
    return schema


def _semantic_issues(data: dict[str, Any]) -> list[_ValidationIssue]:
    issues: list[_ValidationIssue] = []
    standard = data.get("standard")
    version = data.get("version")
    symbols = data.get("symbols")
    if not isinstance(symbols, list):
        return issues

    first_key_index: dict[str, int] = {}
    for index, symbol in enumerate(symbols):
        if not isinstance(symbol, dict):
            continue

        key = symbol.get("key")
        if isinstance(key, str):
            if key in first_key_index:
                issues.append(
                    _ValidationIssue(
                        ("symbols", index, "key"),
                        "duplicate symbol key "
                        f"{key!r}; first declared at symbols"
                        f"[{first_key_index[key]}].key",
                    )
                )
            else:
                first_key_index[key] = index

        symbol_standard = symbol.get("standard")
        if (
            isinstance(standard, str)
            and isinstance(symbol_standard, str)
            and symbol_standard != standard
        ):
            issues.append(
                _ValidationIssue(
                    ("symbols", index, "standard"),
                    f"must match manifest standard {standard!r}",
                )
            )

        catalog_version = symbol.get("catalogVersion")
        if (
            isinstance(version, str)
            and isinstance(catalog_version, str)
            and catalog_version != version
        ):
            issues.append(
                _ValidationIssue(
                    ("symbols", index, "catalogVersion"),
                    f"must match manifest version {version!r}",
                )
            )

        svg_path = symbol.get("svgPath")
        if isinstance(svg_path, str) and _is_unsafe_asset_path(svg_path):
            issues.append(
                _ValidationIssue(
                    ("symbols", index, "svgPath"),
                    "must be a relative path without '..' segments",
                )
            )

        for field in ("sourcePageUrl", "sourceDownloadUrl", "licenseUrl"):
            url = symbol.get(field)
            if isinstance(url, str) and any(
                character.isspace() for character in url
            ):
                issues.append(
                    _ValidationIssue(
                        ("symbols", index, field),
                        "must not contain whitespace",
                    )
                )

    return issues


def _is_unsafe_asset_path(value: str) -> bool:
    windows_path = PureWindowsPath(value)
    normalized = PurePosixPath(value.replace("\\", "/"))
    return (
        normalized.is_absolute()
        or bool(windows_path.anchor)
        or ".." in normalized.parts
    )


def _issue_sort_key(
    issue: _ValidationIssue,
) -> tuple[tuple[tuple[int, object], ...], str]:
    path_key = tuple(
        (0, segment) if isinstance(segment, int) else (1, segment)
        for segment in issue.path
    )
    return path_key, issue.message


def _format_path(path: tuple[str | int, ...]) -> str:
    if not path:
        return "$"
    formatted = ""
    for segment in path:
        if isinstance(segment, int):
            formatted += f"[{segment}]"
        elif formatted:
            formatted += f".{segment}"
        else:
            formatted = segment
    return formatted


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate one or more P&ID catalog manifests."
    )
    parser.add_argument("paths", nargs="+", type=Path, metavar="PATH")
    arguments = parser.parse_args(argv)

    for path in arguments.paths:
        try:
            validated = validate_manifest(path)
        except CatalogValidationError as error:
            print(f"INVALID {path}: {error}", file=sys.stderr)
            return 1
        print(f"VALID {path} {validated.manifest_hash}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
