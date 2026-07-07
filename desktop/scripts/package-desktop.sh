#!/usr/bin/env bash
set -euo pipefail

desktop_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$desktop_dir/.." && pwd)"

cd "$repo_root/frontend"
npm run build

cd "$desktop_dir"
python -m pip install -r requirements-build.txt
python scripts/build-backend.py
npx electron-builder --config electron-builder.yml

