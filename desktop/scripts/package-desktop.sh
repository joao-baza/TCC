#!/usr/bin/env bash
set -euo pipefail

desktop_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$desktop_dir/.." && pwd)"

cd "$repo_root/frontend"
npm run build

cd "$desktop_dir"
npm run build:backend
npx electron-builder --config electron-builder.yml
