# TCC Equation Nomenclature Verification

## Scope

- Separated acronyms from mathematical symbols in `final-paper/TEX/main.tex`.
- Added a dedicated equation-symbol nomenclature with description, unit, and location.
- Included theoretical, methodological, validation, and numerical-example equations.

## Commands

```bash
python3 scripts/check_tcc_nomenclature.py
(cd final-paper/TEX && latexmk -pdf -interaction=nonstopmode main.tex)
rg -n "undefined references|Reference .* undefined|There were undefined references|LaTeX Warning: Label" final-paper/TEX/main.log
pdftotext final-paper/TEX/main.pdf - | rg -n "\\?\\?"
python3 - <<'PY'
from pathlib import Path
import re
text = Path("final-paper/TEX/main.tex").read_text(encoding="utf-8")
siglas = re.search(r"\\begin\{siglas\}(.*?)\\end\{siglas\}", text, re.S).group(1)
math_entries = re.findall(r"\\item\[\$", siglas)
if math_entries:
    print("Math entries still inside siglas:", len(math_entries))
    raise SystemExit(1)
if "\\chapter*{Lista de simbolos}" not in text:
    print("Missing Lista de simbolos chapter")
    raise SystemExit(1)
print("OK: siglas and symbol list are separated.")
PY
```

## Results

- Nomenclature checker: OK: 77 nomenclature entries registered.
- PDF build tail: run from `final-paper/TEX`; returned up-to-date successfully without a full rebuild.

```text
Rc files read:
  /etc/LatexMk
Latexmk: This is Latexmk, John Collins, 31 Jan. 2024. Version 4.83.
Latexmk: Nothing to do for 'main.tex'.
Latexmk: All targets (main.pdf) are up-to-date
```

- Undefined-reference scan:

```text
no output
```

- PDF unresolved-reference scan:

```text
no output
```

- Source separation check: OK: siglas and symbol list are separated.

## Manual Judgement

- `$P$` was split into pressure and wetted perimeter entries.
- `$V$` was split into velocity and volume entries.
- `$f$` was split into Darcy friction factor and recycle fraction entries.
- `$\varepsilon$` was split into volumetric variation factor and absolute roughness entries.
- Validation-only symbols were included because the approved spec requires full equation coverage.
