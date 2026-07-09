#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")" || exit 1

if command -v latexmk >/dev/null 2>&1; then
  latexmk -pdf -interaction=nonstopmode main.tex
else
  pdflatex main.tex
  pdflatex main.tex
fi
