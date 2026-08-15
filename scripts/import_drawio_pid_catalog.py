#!/usr/bin/env python3
"""Generate the frontend Draw.io P&ID catalog from a pinned checkout."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pid.catalog.drawio_import import import_drawio_catalog  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_root", type=Path, help="Path to the pinned jgraph/drawio checkout")
    args = parser.parse_args()
    symbols = import_drawio_catalog(args.source_root.resolve(), ROOT / "frontend")
    print(f"Generated {len(symbols)} Draw.io P&ID symbols.")


if __name__ == "__main__":
    main()
