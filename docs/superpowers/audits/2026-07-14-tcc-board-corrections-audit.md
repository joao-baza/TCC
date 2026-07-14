# TCC Board Corrections Audit

## Baseline

- Worktree before edits: `git status --short --untracked-files=all` produced no output; worktree was clean before audit creation.
- Slides compile before edits: `./slides/compile.sh` exited 0. `latexmk` reported `Nothing to do for 'main.tex'.` and `All targets (main.pdf) are up-to-date`; `slides/main.pdf` was generated/up to date.
- Final paper compile before edits: `./final-paper/compile.sh` exited 0. `latexmk` reported `Nothing to do for 'main.tex'.` and `All targets (main.pdf) are up-to-date`; script reported `PDF gerado em: /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/final-paper/TEX/main.pdf`.

## Correction Matrix

| ID | Area | Board source | Files | Evidence needed | Status | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Slides | audio.txt:520-529 | slides/sections/*.tex | Search for monografia/Monografia and defense terms | Open | Unreviewed at matrix creation |
| S2 | Slides | audio.txt:403-420 | slides/sections/02-solution.tex; slides/sections/03-demo.tex; slides/sections/04-architecture.tex | Search coverage lists for methods classified as properties | Open | Unreviewed at matrix creation |
| W1 | Writing | audio.txt:273-284 | final-paper/TEX/chapters/4.1-desenvolvimento.tex; final-paper/TEX/chapters/4.3-api.tex | Current architecture paragraphs and API/backend explanation | Open | Unreviewed at matrix creation |
| W2 | Writing | audio.txt:520-529 | final-paper/TEX/**/*.tex | Search for monografia/Monografia | Open | Unreviewed at matrix creation |
| W3 | Writing | audio.txt:531-546 | final-paper/TEX/chapters/2-justificativa.tex; final-paper/TEX/chapters/4.1-desenvolvimento.tex | Current justification and open-source/code-auditability wording | Open | Unreviewed at matrix creation |
| W4 | Writing | audio.txt:552-559 | final-paper/TEX/**/*.tex | Search density/massa especifica context by occurrence | Open | Unreviewed at matrix creation |
| W5 | Writing | audio.txt:576-616 | final-paper/TEX/chapters/4.1-desenvolvimento.tex | Figure 1 and pilha/stack wording | Open | Unreviewed at matrix creation |
| W6 | Writing | audio.txt:621-627 | final-paper/TEX/**/*.tex | Search linha/corrente/tubo/tubulacao in context | Open | Unreviewed at matrix creation |
| W7 | Writing | audio.txt:765-779 | final-paper/TEX/**/*.tex | Search motor computacional/head and equivalent English terms | Open | Unreviewed at matrix creation |
| N1 | Nomenclature | audio.txt:644-663 | final-paper/TEX/main.tex; final-paper/TEX/chapters/4.2-engenharia-part1.tex | Symbols used in equations and list of siglas | Open | Unreviewed at matrix creation |
| E1 | Equation | audio.txt:628-638 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/hydraulic.py; routers/sizing.py | Diameter equation units and backend conversion | Open | Unreviewed at matrix creation |
| E2 | Equation | audio.txt:307-321 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/reactor.py; routers/reactor.py | Limiting reagent formula and code behavior | Open | Unreviewed at matrix creation |
| E3 | Equation | audio.txt:323-339 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/reactor.py; routers/reactor.py | Concentration equation, dilution factor, and reference | Open | Unreviewed at matrix creation |
| E4 | Equation | audio.txt:665-701 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/reactor.py | Volumetric variation and dilution-factor symbol consistency | Open | Unreviewed at matrix creation |
| E5 | Equation | audio.txt:702-714 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/reactor.py | Equation 4.11 against 4.13 and code | Open | Unreviewed at matrix creation |
| E6 | Equation | audio.txt:340-368 | final-paper/TEX/chapters/4.2-engenharia-part2.tex; models/reactor.py | Recycle ratio definition and code basis | Open | Unreviewed at matrix creation |
| E7 | Equation | audio.txt:388-392 | final-paper/TEX/chapters/4.2-engenharia-part2.tex; models/hydraulic.py; routers/pump.py | Bernoulli/head equation and sign convention | Open | Unreviewed at matrix creation |
| F1 | Figure | audio.txt:576-597 | final-paper/TEX/chapters/4.1-desenvolvimento.tex; final-paper/TEX/media/ | Figure 1 current file and current app screenshot if needed | Open | Unreviewed at matrix creation |
| F2 | Figure | audio.txt:393-402 | final-paper/TEX/**/*.tex; final-paper/TEX/media/ | Missing-image markers and PDF pages from 102 onward | Open | Unreviewed at matrix creation |

## Technical Evidence

### Equation E1

- LaTeX: Not reviewed yet; fill during Task 6.
- Code: Not reviewed yet; fill during Task 6.
- Reference: Not reviewed yet; fill during Task 6.
- Decision: Not reviewed yet; fill during Task 6.

### Equation E2

- LaTeX: Not reviewed yet; fill during Task 6.
- Code: Not reviewed yet; fill during Task 6.
- Reference: Not reviewed yet; fill during Task 6.
- Decision: Not reviewed yet; fill during Task 6.

### Equation E3

- LaTeX: Not reviewed yet; fill during Task 6.
- Code: Not reviewed yet; fill during Task 6.
- Reference: Not reviewed yet; fill during Task 6.
- Decision: Not reviewed yet; fill during Task 6.

### Equation E4

- LaTeX: Not reviewed yet; fill during Task 6.
- Code: Not reviewed yet; fill during Task 6.
- Reference: Not reviewed yet; fill during Task 6.
- Decision: Not reviewed yet; fill during Task 6.

### Equation E5

- LaTeX: Not reviewed yet; fill during Task 6.
- Code: Not reviewed yet; fill during Task 6.
- Reference: Not reviewed yet; fill during Task 6.
- Decision: Not reviewed yet; fill during Task 6.

### Equation E6

- LaTeX: Not reviewed yet; fill during Task 6.
- Code: Not reviewed yet; fill during Task 6.
- Reference: Not reviewed yet; fill during Task 6.
- Decision: Not reviewed yet; fill during Task 6.

### Equation E7

- LaTeX: Not reviewed yet; fill during Task 6.
- Code: Not reviewed yet; fill during Task 6.
- Reference: Not reviewed yet; fill during Task 6.
- Decision: Not reviewed yet; fill during Task 6.

## Final Verification

- Slides compile after edits: Not run yet; fill during Task 9.
- Final paper compile after edits: Not run yet; fill during Task 9.
- PDF text scan: Not run yet; fill during Task 9.
- Figure check: Not run yet; fill during Task 9.
- Remaining justified terms: Not reviewed yet; fill during Task 9.
