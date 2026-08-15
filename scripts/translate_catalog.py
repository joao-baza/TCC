#!/usr/bin/env python3
"""Apply pt-BR name translations to P&ID catalog JSON files."""

import json
import sys
import warnings
from pathlib import Path

TRANSLATIONS_PATH = Path(__file__).resolve().parent / "catalog_translations.json"
CATALOG_FILES = [
    "frontend/src/features/pid/catalog/generated/drawio-catalog.json",
    "frontend/src/features/pid/catalog/generated/drawio-pid2-catalog.json",
]

ENGLISH_PATTERNS = [" and ", " or ", " with "]


def main():
    repo_root = Path(__file__).resolve().parent.parent
    translations = load_translations()

    for rel_path in CATALOG_FILES:
        catalog_path = repo_root / rel_path
        print(f"Processing {rel_path}...")

        data = read_json(catalog_path)
        original_count = len(data)
        updated = apply_translations(data, translations)
        write_json(catalog_path, data)

        validate_output(catalog_path, original_count)
        print(f"  {updated} names translated (out of {original_count} symbols)")

    print("Done.")


def load_translations():
    if not TRANSLATIONS_PATH.exists():
        sys.exit(f"Error: Translation file not found at {TRANSLATIONS_PATH}")
    with open(TRANSLATIONS_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def read_json(path):
    if not path.exists():
        sys.exit(f"Error: Catalog file not found at {path}")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def apply_translations(items, translations):
    updated = 0
    for item in items:
        key = item["name"]
        if key in translations:
            item["name"] = translations[key]
            updated += 1
        else:
            warnings.warn(f"Missing translation for name: {key!r}")
    return updated


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def validate_output(path, expected_count):
    data = read_json(path)

    if len(data) != expected_count:
        sys.exit(
            f"Error: Symbol count mismatch in {path}: "
            f"expected {expected_count}, got {len(data)}"
        )

    for item in data:
        name = item["name"]
        for pattern in ENGLISH_PATTERNS:
            if pattern in name:
                warnings.warn(
                    f"Name may still be in English ({pattern!r} found): {name!r}"
                )
                break


if __name__ == "__main__":
    main()
