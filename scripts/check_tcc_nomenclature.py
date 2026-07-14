#!/usr/bin/env python3
"""Check TCC equation-symbol nomenclature coverage."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INVENTORY = ROOT / "docs/superpowers/audits/2026-07-14-tcc-equation-symbols.json"
DEFAULT_MAIN_TEX = ROOT / "final-paper/TEX/main.tex"


def load_inventory(path: Path) -> list[dict[str, object]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]
    ids = [entry["id"] for entry in entries]
    duplicates = sorted({entry_id for entry_id in ids if ids.count(entry_id) > 1})
    if duplicates:
        raise SystemExit(f"Duplicate symbol ids in inventory: {', '.join(duplicates)}")
    return entries


def is_escaped_percent(line: str, index: int) -> bool:
    slash_count = 0
    cursor = index - 1
    while cursor >= 0 and line[cursor] == "\\":
        slash_count += 1
        cursor -= 1
    return slash_count % 2 == 1


def strip_latex_comments(text: str) -> str:
    cleaned_lines = []
    for line in text.splitlines():
        for index, char in enumerate(line):
            if char == "%" and not is_escaped_percent(line, index):
                line = line[:index]
                break
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def load_registered_ids(path: Path) -> set[str]:
    text = strip_latex_comments(path.read_text(encoding="utf-8"))
    return set(re.findall(r"\\simbolotcc\{([^{}]+)\}", text))


def latex_field(value: object) -> str:
    return str(value).replace("\\\\", "\\")


def emit_latex(entries: list[dict[str, object]]) -> None:
    for entry in entries:
        locations = "; ".join(latex_field(item) for item in entry["locations"])
        print(
            "\\simbolotcc"
            f"{{{latex_field(entry['id'])}}}"
            f"{{{latex_field(entry['symbol'])}}}"
            f"{{{latex_field(entry['description'])}}}"
            f"{{{latex_field(entry['unit'])}}}"
            f"{{{locations}}}"
        )


def check_coverage(entries: list[dict[str, object]], registered_ids: set[str]) -> int:
    expected_ids = {str(entry["id"]) for entry in entries}
    missing = sorted(expected_ids - registered_ids)
    extra = sorted(registered_ids - expected_ids)

    if not missing and not extra:
        print(f"OK: {len(expected_ids)} nomenclature entries registered.")
        return 0

    if missing:
        print("Missing nomenclature ids:")
        for entry_id in missing:
            print(f"  - {entry_id}")

    if extra:
        print("Extra nomenclature ids not present in inventory:")
        for entry_id in extra:
            print(f"  - {entry_id}")

    return 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, default=DEFAULT_INVENTORY)
    parser.add_argument("--main-tex", type=Path, default=DEFAULT_MAIN_TEX)
    parser.add_argument("--emit-latex", action="store_true")
    args = parser.parse_args()

    entries = load_inventory(args.inventory)
    if args.emit_latex:
        emit_latex(entries)
        return 0

    registered_ids = load_registered_ids(args.main_tex)
    return check_coverage(entries, registered_ids)


if __name__ == "__main__":
    sys.exit(main())
