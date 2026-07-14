# TCC Board Corrections Audit

## Baseline

- Worktree before edits: `git status --short --untracked-files=all` produced no output; worktree was clean before audit creation.
- Slides compile before edits: `./slides/compile.sh` exited 0. `latexmk` reported `Nothing to do for 'main.tex'.` and `All targets (main.pdf) are up-to-date`; `slides/main.pdf` was generated/up to date.
- Final paper compile before edits: `./final-paper/compile.sh` exited 0. `latexmk` reported `Nothing to do for 'main.tex'.` and `All targets (main.pdf) are up-to-date`; script reported `PDF gerado em: /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/final-paper/TEX/main.pdf`.
- Board source note: `audio.txt` refers to `/home/jpbgr/Downloads/transcricoes/audio.txt`.

## Correction Matrix

| ID | Area | Board source | Files | Evidence needed | Status | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Slides | audio.txt:520-529 | slides/sections/*.tex | Search for monografia/Monografia and defense terms | Verified | Task 3 scan found no `monografia`/`monograph` hits in slide sources; no slide source edit required |
| S2 | Slides | audio.txt:403-420 | slides/sections/02-solution.tex; slides/sections/03-demo.tex; slides/sections/04-architecture.tex | Search coverage lists for methods classified as properties | Corrected | `slides/sections/02-solution.tex` now separates `Propriedades e equilíbrios` from `Métodos e visualizações`; McCabe-Thiele remains only in method/visualization context |
| W1 | Writing | audio.txt:273-284 | final-paper/TEX/chapters/4.1-desenvolvimento.tex; final-paper/TEX/chapters/4.3-api.tex | Current architecture paragraphs and API/backend explanation | Open | Unreviewed at matrix creation |
| W2 | Writing | audio.txt:520-529 | final-paper/TEX/**/*.tex | Search for monografia/Monografia | Inventoried | No source hits for monografia/monograph/defesa de monografia in final paper |
| W3 | Writing | audio.txt:531-546 | final-paper/TEX/chapters/2-justificativa.tex; final-paper/TEX/chapters/4.1-desenvolvimento.tex | Current justification and open-source/code-auditability wording | Open | Unreviewed at matrix creation |
| W4 | Writing | audio.txt:552-559 | final-paper/TEX/**/*.tex | Search density/massa especifica context by occurrence | Inventoried | Density terms mapped; most are technical keep, formal consistency can prefer massa específica in prose |
| W5 | Writing | audio.txt:576-616 | final-paper/TEX/chapters/4.1-desenvolvimento.tex | Figure 1 and pilha/stack wording | Inventoried | Figure 1 is current Piping screenshot; `Piping`, `pilha principal`, and `shell de aplicação` are change candidates |
| W6 | Writing | audio.txt:621-627 | final-paper/TEX/**/*.tex | Search linha/corrente/tubo/tubulacao in context | Inventoried | Terms are mostly technical keep; `linha de fluxo` and mixed Piping/tubulação wording merit review |
| W7 | Writing | audio.txt:765-779 | final-paper/TEX/**/*.tex | Search motor computacional/head and equivalent English terms | Inventoried | `head` captions/section and `motor computacional` are change candidates; NPSH acronym kept |
| N1 | Nomenclature | audio.txt:644-663 | final-paper/TEX/main.tex; final-paper/TEX/chapters/4.2-engenharia-part1.tex | Symbols used in equations and list of siglas | Open | Unreviewed at matrix creation |
| E1 | Equation | audio.txt:628-638 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/hydraulic.py; routers/sizing.py | Diameter equation units and backend conversion | Open | Unreviewed at matrix creation |
| E2 | Equation | audio.txt:307-321 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/reactor.py; routers/reactor.py | Limiting reagent formula and code behavior | Open | Unreviewed at matrix creation |
| E3 | Equation | audio.txt:323-339 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/reactor.py; routers/reactor.py | Concentration equation, dilution factor, and reference | Open | Unreviewed at matrix creation |
| E4 | Equation | audio.txt:665-701 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/reactor.py | Volumetric variation and dilution-factor symbol consistency | Open | Unreviewed at matrix creation |
| E5 | Equation | audio.txt:702-714 | final-paper/TEX/chapters/4.2-engenharia-part1.tex; models/reactor.py | Equation 4.11 against 4.13 and code | Open | Unreviewed at matrix creation |
| E6 | Equation | audio.txt:340-368 | final-paper/TEX/chapters/4.2-engenharia-part2.tex; models/reactor.py | Recycle ratio definition and code basis | Open | Unreviewed at matrix creation |
| E7 | Equation | audio.txt:388-392 | final-paper/TEX/chapters/4.2-engenharia-part2.tex; models/hydraulic.py; routers/pump.py | Bernoulli/head equation and sign convention | Open | Unreviewed at matrix creation |
| F1 | Figure | audio.txt:576-597 | final-paper/TEX/chapters/4.1-desenvolvimento.tex; final-paper/TEX/media/ | Figure 1 current file and current app screenshot if needed | Inventoried | Figure 1 source is `media/cap4_piping_interface.png`; PDF list labels it as Piping interface on page 28 |
| F2 | Figure | audio.txt:393-402 | final-paper/TEX/**/*.tex; final-paper/TEX/media/ | Missing-image markers and PDF pages from 102 onward | Inventoried | Missing-image placeholders found around PDF pages 102 and 106-107 |

## Inventory Findings

### S1/W2 - Defense terminology

Command:

```bash
rg -n -i "monografia|monograph|defesa de monografia" slides final-paper/TEX
```

Result: no matches. No `S1` or `W2` source hit needs correction in the current slides or final paper.

Task 3 recheck:

```bash
rg -n -i "monografia|monograph" slides/sections/*.tex slides/main.tex
```

Result: no matches. S1 required no source edit after the slide scan.

### S2 - Slide classification

Command:

```bash
rg -n "McCabe|Thiele|Propriedades|propriedades|método|metodo|diagrama|curva|Cobertura implementada" slides/sections/*.tex
```

Relevant hits:

- `slides/sections/02-solution.tex:28`: `\begin{frame}{Cobertura implementada}`
- `slides/sections/02-solution.tex:35`: `\begin{block}{Propriedades}`
- `slides/sections/02-solution.tex:36`: `Componentes, fluido puro, misturas, equilíbrio binário, McCabe-Thiele, envelope de fase, pressão de vapor e superfície T-P.`
- `slides/sections/03-demo.tex:20`: `\begin{frame}[t]{Propriedades deixam de ser só tabela}`
- `slides/sections/03-demo.tex:28`: `... equilíbrio líquido-vapor visualizado no diagrama T-x-y.`
- `slides/sections/03-demo.tex:32`: `A curva conecta composição, temperatura e região de separação, servindo de base para McCabe-Thiele e estágios teóricos.`
- `slides/sections/04-architecture.tex:108`: `Moody, curva de bomba, NPSH, altura manométrica, T-x-y, McCabe-Thiele, envelope de fase, Arrhenius, PFR e balanço.`
- `slides/sections/04-architecture.tex:166`: `Diagramas T-x-y e McCabe-Thiele tornam visível a construção de estágios teóricos.`

Decision before Task 3: `change` for `slides/sections/02-solution.tex:35-36` if the next task edits slides, because McCabe-Thiele is a method/diagram grouped under `Propriedades`. The architecture/demo hits classify McCabe-Thiele as diagram/visualization and can be kept. No other clear method/diagram is incorrectly grouped by this scan.

Task 3 correction:

- `slides/sections/02-solution.tex:35-36` changed the block title from `Propriedades` to `Propriedades e equilíbrios` and removed McCabe-Thiele from the property list.
- `slides/sections/02-solution.tex:45-46` added `Métodos e visualizações` with `Diagramas T-x-y, McCabe-Thiele, Moody, Levenspiel e curvas de sistema...`.

Task 3 verification commands:

```bash
nl -ba slides/sections/02-solution.tex | sed -n '1,120p'
rg -n "Propriedades|Métodos|metodos|diagramas|Diagramas|curvas|Curvas|McCabe|Moody|Levenspiel|Arrhenius|NPSH|BEP" slides/sections/*.tex
./slides/compile.sh
pdftotext slides/main.pdf /tmp/tcc-slides.txt
rg -n -i "monografia|monograph" /tmp/tcc-slides.txt
rg -n -i "McCabe|Propriedades|Métodos|metodos" /tmp/tcc-slides.txt
```

Result: source scan shows McCabe-Thiele in `Métodos e visualizações`, demo/architecture visualization contexts, and references; no comparable method-as-property issue was found. `./slides/compile.sh` exited 0 and regenerated `slides/main.pdf`. PDF text scan had no `monografia`/`monograph` matches; McCabe-Thiele appears under the PDF text sequence `Métodos e visualizações` / `Diagramas T-x-y, McCabe-Thiele, Moody...`.

### W4/W5/W6/W7 - Ambiguous and mixed-language terms

Command:

```bash
rg -n -i "densidade|head|stack|pilha|motor computacional|curva de reação|chemical engineering calculator|piping|frontend|backend|endpoint|deploy|desktop|software|framework|linha|corrente|tubo|tubulação" final-paper/TEX/main.tex final-paper/TEX/chapters/*.tex
```

Findings:

| Row | Classification | Hits | Note |
| --- | --- | --- | --- |
| W4 | keep | `final-paper/TEX/main.tex:263`; `final-paper/TEX/chapters/4.2-engenharia-part1.tex:9`; `final-paper/TEX/chapters/4.4-validacao.tex:44` | `Massa específica` is already used in the nomenclature and hydraulic context. |
| W4 | keep | `final-paper/TEX/chapters/4.1-desenvolvimento.tex:30`; `final-paper/TEX/chapters/4.2-engenharia-part2.tex:107,111,119,139,350,366`; `final-paper/TEX/chapters/4.4-validacao.tex:77,88,486`; `final-paper/TEX/chapters/6-guia-de-uso.tex:83` | `densidade` appears as a normal property term. Later prose can optionally standardize formal sections toward `massa específica`, but this is not an inventory blocker. |
| W5 | change | `final-paper/TEX/chapters/4.1-desenvolvimento.tex:46,50,51` | Figure 1 currently describes the module as `Piping`; board correction likely wants Portuguese naming aligned with `tubulação/tubulações`. |
| W5 | change | `final-paper/TEX/chapters/4.1-desenvolvimento.tex:78` | `pilha principal` is a translation of stack in a software-architecture sentence; use a clearer Portuguese phrase such as `conjunto tecnológico principal`. |
| W5 | change | `final-paper/TEX/chapters/4.1-desenvolvimento.tex:42` | `shell de aplicação` is mixed-language wording; consider `estrutura/base da aplicação`. |
| W6 | keep | `final-paper/TEX/chapters/4.4-validacao.tex:274,278,279,351,353,574`; `final-paper/TEX/chapters/6-guia-de-uso.tex:123,127,129,135,139` | `corrente` is correct process terminology in mass-balance context. |
| W6 | keep | `final-paper/TEX/chapters/4.2-engenharia-part1.tex:11,13,42`; `final-paper/TEX/chapters/4.2-engenharia-part2.tex:27,38,40,213,325`; `final-paper/TEX/chapters/4.4-validacao.tex:108,195,250,411,415,458,459,463`; `final-paper/TEX/chapters/6-guia-de-uso.tex:27` | `tubo`/`tubulação` are technically appropriate. |
| W6 | needs technical check | `final-paper/TEX/chapters/4.2-engenharia-part2.tex:121,254,288`; `final-paper/TEX/chapters/6-guia-de-uso.tex:65,95` | `linha de fluxo`, `linha de escoamento`, `linha de sucção` and `linhas operacionais` are plausible, but should be checked against the board's intended terminology before editing. |
| W7 | change | `final-paper/TEX/chapters/4.2-engenharia-part2.tex:267,274`; `final-paper/TEX/chapters/4.4-validacao.tex:219` | `head` appears in captions and a subsection title; likely replace or qualify with `altura manométrica/carga`. |
| W7 | keep | `final-paper/TEX/main.tex:242-244`; `final-paper/TEX/chapters/4.4-validacao.tex:207` | `NPSH` and `Net Positive Suction Head` are standard acronym expansions. |
| W7 | change | `final-paper/TEX/chapters/4.3-api.tex:11`; `final-paper/TEX/chapters/4.5-recursos-didaticos.tex:95` | `motor computacional` can be replaced by a more precise `núcleo de cálculo`/`rotinas de cálculo`, if later writing edits target this wording. |
| W7 | keep | PDF-only bibliography hit for `Chemical Engineering`: `/tmp/tcc-final-paper.txt:3428` | This is the reference title `Introduction to Chemical Engineering Thermodynamics`, not body prose. |

### F1/F2 - Figure references and missing-image markers

Command:

```bash
rg -n "\\\\imgouplaceholder|Figura 1|includegraphics|cap7_|cap4_" final-paper/TEX/main.tex final-paper/TEX/chapters/*.tex
```

Relevant hits:

- `final-paper/TEX/chapters/4.1-desenvolvimento.tex:46`: text introduces Figure `\ref{fig:piping_interface}` as the user interface for the `Piping` module.
- `final-paper/TEX/chapters/4.1-desenvolvimento.tex:50`: caption is `Interface gráfica do módulo de cálculos de tubulação (\textit{Piping})`.
- `final-paper/TEX/chapters/4.1-desenvolvimento.tex:51`: Figure 1 source is `media/cap4_piping_interface.png`.
- `final-paper/TEX/chapters/4.5-recursos-didaticos.tex:12`: `\imgouplaceholder{media/glossario.png}`.
- `final-paper/TEX/chapters/4.5-recursos-didaticos.tex:24`: `\imgouplaceholder{media/explicacao_teorica.png}`.
- `final-paper/TEX/chapters/4.5-recursos-didaticos.tex:78`: `\imgouplaceholder{media/cap4_diagrama_moody.png}`.
- `final-paper/TEX/chapters/4.5-recursos-didaticos.tex:86`: `\imgouplaceholder{media/levenspiel.png}`.
- `final-paper/TEX/chapters/4.5-recursos-didaticos.tex:104`: `\imgouplaceholder{media/trilhas.png}`.
- `final-paper/TEX/chapters/6-guia-de-uso.tex:21-147`: `cap7_` screenshots are present for the user-guide sequence, including McCabe-Thiele at `final-paper/TEX/chapters/6-guia-de-uso.tex:97`.

PDF cross-check:

- `pdftotext -layout -f 1 -l 25 final-paper/TEX/main.pdf - | rg -n "Interface gráfica|Piping|Figura 1|Figura"` shows list entry `Figura 1 – Interface gráfica do módulo de cálculos de tubulação (Piping)` on PDF page 28.
- `pdftotext -layout -f 100 -l 106 final-paper/TEX/main.pdf - | rg -n "Figura pendente|McCabe|Levenspiel|Moody|trilhas|glossario|explicacao|explicação|Diagrama"` shows `Figura pendente` for `media/glossario.png` and `media/explicacao_teorica.png` around page 102.
- Full PDF scan shows additional placeholders: `/tmp/tcc-final-paper.txt:2549` (`media/glossario.png`), `2577` (`media/explicacao_teorica.png`), `2755` (`media/levenspiel.png`), and `2795` (`media/trilhas.png`). The source scan also shows `media/cap4_diagrama_moody.png` at `final-paper/TEX/chapters/4.5-recursos-didaticos.tex:78`.

Decision: `F1` is inventoried for later replacement/renaming of the current Figure 1 screenshot/caption. `F2` is inventoried as missing-image placeholders around the board's page 102 concern and later pages in the same didactic-resources chapter.

### PDF scan

Commands:

```bash
pdftotext -layout final-paper/TEX/main.pdf /tmp/tcc-final-paper.txt
rg -n "Figura pendente|Chemical Engineering|head|motor computacional|monografia|densidade|McCabe|Bernoulli|reator de conversão" /tmp/tcc-final-paper.txt
```

Findings:

- `monografia`: no PDF hits.
- `head`: PDF list/captions expose `head` at `/tmp/tcc-final-paper.txt:153,154,1539,1548`.
- `motor computacional`: exposed at `/tmp/tcc-final-paper.txt:2774`.
- `Figura pendente`: exposed at `/tmp/tcc-final-paper.txt:2549,2577,2755,2795`.
- `McCabe`: exposed in the table of figures, table of contents, body, and guide pages, including `/tmp/tcc-final-paper.txt:205,389,2692,2694,3129,3135`.
- `densidade`: exposed in body text, including `/tmp/tcc-final-paper.txt:563,1330,1355,1374,1646,1681,1906,1909,2399,3088`.
- `Bernoulli`: exposed at `/tmp/tcc-final-paper.txt:1520,2067`.
- `Chemical Engineering`: exposed only in bibliography/reference context at `/tmp/tcc-final-paper.txt:3428`.
- `reator de conversão`: no PDF hits.

Conclusion: the generated PDF exposes the same inventory issues as the source scan: English `head`, `motor computacional`, McCabe-Thiele classification/wording contexts, density wording, and missing-image placeholders. The defense-term scan remains clean in both source and PDF.

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

- Slides compile after edits: Task 3 ran `./slides/compile.sh`; command exited 0 and wrote `slides/main.pdf`.
- Final paper compile after edits: Not run in Task 3; slide-only scope did not edit final-paper sources.
- PDF text scan: Task 3 ran `pdftotext slides/main.pdf /tmp/tcc-slides.txt`, confirmed no `monografia`/`monograph` hits, and confirmed McCabe-Thiele appears in method/visualization context.
- Figure check: Not run yet; fill during Task 9.
- Remaining justified terms: Not reviewed yet; fill during Task 9.
