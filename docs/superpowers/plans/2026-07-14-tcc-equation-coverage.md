# TCC Equation Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a complete audit proving whether every domain equation implemented in code and used for Engenharia Quimica results is present, explained, and traceable in the TCC.

**Architecture:** Build a code-first coverage matrix, then reconcile it against the LaTeX equations and bibliography. This plan does not edit the TCC equations; it creates the evidence and edit backlog required before equation changes.

**Tech Stack:** Python/FastAPI source, LaTeX/ABNTeX2, BibTeX, Markdown audit files, `rg`, `sed`, `git`, optional `pdftotext` for final confirmation.

---

## File Structure

- Create: `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`
  - Responsibility: master matrix of domain equations, TCC coverage, references, exclusions, and required future edits.
- Read: `docs/superpowers/specs/2026-07-14-tcc-equation-coverage-design.md`
  - Responsibility: approved scope and acceptance criteria.
- Read: `models/hydraulic.py`
  - Responsibility: hydraulic equations and correlations implemented in the domain layer.
- Read: `models/reactor.py`
  - Responsibility: reaction engineering equations, objective functions, dilution factor, CSTR/PFR design.
- Read: `models/mass_balance.py`
  - Responsibility: symbolic mass-balance equations, reactions, splits, recycle and composition normalization.
- Read: `models/components.py`
  - Responsibility: CoolProp-backed property calls and units.
- Read: `routers/flow.py`, `routers/pump.py`, `routers/sizing.py`, `routers/reactor.py`, `routers/mass_balance.py`, `routers/components_router.py`
  - Responsibility: public endpoints, input transformations, domain calls, and backend-only calculations such as VLE/McCabe-Thiele.
- Read: `final-paper/TEX/main.tex`, `final-paper/TEX/chapters/*.tex`, `final-paper/TEX/bibliografia.bib`
  - Responsibility: existing equations, nomenclature, citations, and explanatory coverage.

## Task 1: Create Baseline Audit

**Files:**
- Create: `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`
- Read: `docs/superpowers/specs/2026-07-14-tcc-equation-coverage-design.md`

- [ ] **Step 1: Confirm worktree state**

Run:

```bash
git status --short --branch
```

Expected: command exits 0. Record the branch name and any existing changes in the audit baseline. Do not revert unrelated changes.

- [ ] **Step 2: Create the audit skeleton**

Create `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md` with this content:

```markdown
# TCC Equation Coverage Audit

## Baseline

- Branch and worktree state: paste the exact output from `git status --short --branch` before any audit edits.
- Scope source: `docs/superpowers/specs/2026-07-14-tcc-equation-coverage-design.md`.
- Inclusion rule: only domain equations that affect Engenharia Quimica results.
- Exclusion rule: frontend/rendering math for coordinates, colors, scales and layout is out of scope.

## Coverage Matrix

| ID | Domain | Code Source | Implemented Formula Or Model | Public Route | TCC Location | Reference | Coverage Status | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HYD-01 | Hydraulic sizing | `models/hydraulic.py:get_calculated_diameter` | `D = sqrt(4Q/(pi V))` | `routers/sizing.py:/sizing/calculated-diameter` | Open | Open | Open | Review against TCC |
| HYD-02 | Hydraulic sizing | `models/hydraulic.py:get_real_diameter` | next available nominal diameter above calculated diameter | `routers/sizing.py:/sizing/real-diameter` | Open | Open | Open | Review against TCC |
| HYD-03 | Flow | `models/hydraulic.py:reynolds` | `Re = D V rho / mu` and `Re = D V / nu` | `routers/flow.py:/flow/reynolds` | Open | Open | Open | Review against TCC |
| HYD-04 | Flow | `models/hydraulic.py:laminar_friction_factor` | `f = 64/Re` | `routers/flow.py:/flow/friction-factor` | Open | Open | Open | Review against TCC |
| HYD-05 | Flow | `models/hydraulic.py:friction_factor` | Colebrook-White implicit equation | `routers/flow.py:/flow/friction-factor` | Open | Open | Open | Review against TCC |
| HYD-06 | Flow | `models/hydraulic.py:friction_factor` | Swamee-Jain explicit correlation | `routers/flow.py:/flow/friction-factor` | Open | Open | Open | Review against TCC |
| HYD-07 | Flow | `models/hydraulic.py:friction_factor` | Haaland explicit correlation | `routers/flow.py:/flow/friction-factor` | Open | Open | Open | Review against TCC |
| HYD-08 | Pump and piping | `models/hydraulic.py:head_loss` | Darcy-Weisbach with equivalent length | `routers/pump.py:/pump/head-loss` | Open | Open | Open | Review against TCC |
| HYD-09 | Pump and piping | `models/hydraulic.py:head_loss` | Hazen-Williams SI correlation | `routers/pump.py:/pump/head-loss` | Open | Open | Open | Review against TCC |
| HYD-10 | Pump | `models/hydraulic.py:head` | Bernoulli head with pressure, elevation, velocity and loss terms | `routers/pump.py:/pump/head` | Open | Open | Open | Review against TCC |
| HYD-11 | Pump | `models/hydraulic.py:npsh_available` | available NPSH from pressure, elevation, velocity, loss and vapor pressure terms | `routers/pump.py:/pump/npsh-available` | Open | Open | Open | Review against TCC |
| HYD-12 | Flow | `models/hydraulic.py:hydraulic_diameter` | `D_h = 4A/P` and implemented shape-specific formulas | `routers/flow.py:/flow/hydraulic-diameter` | Open | Open | Open | Review against TCC |
| HYD-13 | Pump visualization model | `models/hydraulic.py:build_system_headloss_curve` | headloss scaling with exponent 2 or 1.852 | `routers/pump.py:/pump/headloss-curve/chart` | Open | Open | Open | Decide if domain model or chart support |
| HYD-14 | Pump visualization model | `models/hydraulic.py:build_pump_curve_points` | parabolic pump curve through operating point | `routers/pump.py:/pump/pump-curve/chart` | Open | Open | Open | Decide if domain model or chart support |
| REA-01 | Reactor | `models/reactor.py:determine_limiting_reagent` | limiting reagent ratio using initial amount and stoichiometric coefficient | `routers/reactor.py:/reactor/limiting-reagent` | Open | Open | Open | Review against TCC |
| REA-02 | Reactor | `models/reactor.py:_initialize_reactor` | `F_i0 = Q_i C_i0`, `Q_T = sum Q_i`, `C_i0 = F_i0/Q_T`, `y_A0 = F_A0/sum F_i0` | `routers/reactor.py:/reactor/cstr`, `/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-03 | Reactor | `models/reactor.py:_calculate_dilution_factor` | volumetric variation factor from stoichiometric coefficients and gas-phase feed fraction | `routers/reactor.py:/reactor/cstr`, `/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-04 | Reactor | `models/reactor.py:_initialize_reactor` | pressure-temperature expansion factor `P0*T/(P*T0)` | `routers/reactor.py:/reactor/cstr`, `/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-05 | Reactor | `models/reactor.py:_calculate_concentration_and_rate` | outlet concentration for limiting reactant | `routers/reactor.py:/reactor/cstr`, `/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-06 | Reactor | `models/reactor.py:_calculate_concentration_and_rate` | outlet concentration for non-limiting reactants, products and inerts | `routers/reactor.py:/reactor/cstr`, `/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-07 | Reactor | `models/reactor.py:_calculate_concentration_and_rate` | rate law `r = k prod(C_i^n_i)` with unit-adjusted `k` | `routers/reactor.py:/reactor/cstr`, `/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-08 | Reactor CSTR | `models/reactor.py:_conversion_and_kinetics_in_cstr` | `V = F_A0 X / rate_lim` | `routers/reactor.py:/reactor/cstr` | Open | Open | Open | Review against TCC |
| REA-09 | Reactor CSTR | `models/reactor.py:_volume_and_kinetics_in_cstr` | objective `rate_lim V / F_A0 - X` solved by Brent | `routers/reactor.py:/reactor/cstr` | Open | Open | Open | Review against TCC |
| REA-10 | Reactor CSTR | `models/reactor.py:_residence_time_and_kinetics_in_cstr` | `V = Q_T tau` plus CSTR objective | `routers/reactor.py:/reactor/cstr` | Open | Open | Open | Review against TCC |
| REA-11 | Reactor PFR | `models/reactor.py:_pfr_volume_integral` | integral of `1/rate_lim` over conversion | `routers/reactor.py:/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-12 | Reactor PFR recycle | `models/reactor.py:_conversion_and_kinetics_in_pfr` | `V = (R+1) F_A0 integral_{R/(R+1)X}^{X} dX/rate_lim` | `routers/reactor.py:/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-13 | Reactor PFR recycle | `models/reactor.py:_solve_pfr_local_conversion` | local conversion from partial PFR volume with recycle inlet conversion | `routers/reactor.py:/reactor/pfr/spatial-profile` | Open | Open | Open | Review against TCC |
| REA-14 | Reactor visualization model | `routers/reactor.py:/arrhenius/chart` | Arrhenius relation `k = A exp(-Ea/RT)` | `routers/reactor.py:/reactor/arrhenius/chart` | Open | Open | Open | Decide if chart-only or domain coverage |
| MB-01 | Mass balance | `models/mass_balance.py:build_equations` | overall steady-state balance, inputs equal external outputs | `routers/mass_balance.py` | Open | Open | Open | Review against TCC |
| MB-02 | Mass balance | `models/mass_balance.py:build_equations` | component balance with generation from stoichiometry and extent | `routers/mass_balance.py` | Open | Open | Open | Review against TCC |
| MB-03 | Mass balance | `models/mass_balance.py:build_equations` | composition normalization `sum z_i = 1` for each stream | `routers/mass_balance.py` | Open | Open | Open | Review against TCC |
| MB-04 | Mass balance | `models/mass_balance.py:build_equations` | conversion-to-extent relation for key component | `routers/mass_balance.py` | Open | Open | Open | Review against TCC |
| MB-05 | Mass balance | `models/mass_balance.py:build_equations` | split/recycle flow and equal-composition constraints | `routers/mass_balance.py` | Open | Open | Open | Review against TCC |
| PROP-01 | Properties | `models/components.py:get_property`, `get_all_properties` | CoolProp pure-fluid property calls and units | `routers/components_router.py:/components/property` | Open | CoolProp | Open | Classify as external library documented |
| PROP-02 | Properties | `models/components.py:get_mixture_properties` | CoolProp mixture string and property calls | `routers/components_router.py:/components/mixture-properties` | Open | CoolProp | Open | Classify as external library documented |
| PROP-03 | Properties | `models/components.py:get_critical_properties` | CoolProp critical and triple-point properties | `routers/components_router.py:/components/critical-properties` | Open | CoolProp | Open | Classify as external library documented |
| EQ-01 | Equilibrium | `routers/components_router.py:get_binary_vle` | backend binary VLE calculations | `routers/components_router.py:/components/binary-vle` | Open | Open | Open | Review code and TCC coverage |
| EQ-02 | Equilibrium | `routers/components_router.py:get_mccabe_thiele_chart` | McCabe-Thiele construction calculations | `routers/components_router.py:/components/mccabe-thiele/chart` | Open | Open | Open | Review code and TCC coverage |

## Existing TCC Equations

| TCC ID | File | Label | Formula Summary | Related Code IDs | Citation Nearby |
| --- | --- | --- | --- | --- | --- |

## Exclusions

| Source | Reason |
| --- | --- |

## Required Future TCC Edits

| Edit ID | Code IDs | Target File | Required Change | Reason | Verification |
| --- | --- | --- | --- | --- | --- |

## Items Requiring No TCC Edit

| ID | Reason |
| --- | --- |

## Final Completeness Check

- Final completeness summary is added after all `Open` statuses are resolved.
```

- [ ] **Step 3: Verify the audit file exists**

Run:

```bash
test -f docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md && sed -n '1,80p' docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
```

Expected: exits 0 and prints the audit title plus the first coverage rows.

- [ ] **Step 4: Commit the baseline audit**

Run:

```bash
git add -f docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
git commit -m "docs: start TCC equation coverage audit" -m "- Add code-first matrix for domain equations" -m "- Separate equation coverage from direct TCC edits"
```

Expected: commit succeeds and includes only the new audit file.

## Task 2: Inventory Domain Code Formulas

**Files:**
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`
- Read: `models/hydraulic.py`
- Read: `models/reactor.py`
- Read: `models/mass_balance.py`
- Read: `models/components.py`

- [ ] **Step 1: Inspect hydraulic formulas**

Run:

```bash
rg -n "def |return |np\\.sqrt|\\*\\*|log10|root_scalar|HAZEN|STANDARD_GRAVITY|head_loss|reynolds|friction_factor|get_calculated_diameter|get_real_diameter|npsh_available|hydraulic_diameter|build_system_headloss_curve|build_pump_curve" models/hydraulic.py
```

Expected: exits 0 and lists all hydraulic functions represented by `HYD-*` rows.

- [ ] **Step 2: Update hydraulic rows**

For each `HYD-*` row in the audit, replace `Implemented Formula Or Model`, `Code Source`, and `Decision` with code-specific evidence:

```markdown
| HYD-08 | Pump and piping | `models/hydraulic.py:head_loss` | Darcy-Weisbach: `h_f = f (L + L_eq) V^2 / (2 D g)` where `L_eq` is sum of fitting equivalent lengths times diameter | `routers/pump.py:/pump/head-loss` | Open | Open | Open | Code formula verified; compare to TCC and citation |
```

Expected: each hydraulic row has a formula or explicit model description grounded in `models/hydraulic.py`.

- [ ] **Step 3: Inspect reactor formulas**

Run:

```bash
rg -n "def |return |epsilon|dilution_factor|expansion_factor|rate_lim|root_scalar|quad|F_A0|C_lim0|recycling_ratio|residence_time|Arrhenius|activation_energy|reference_rate_constant" models/reactor.py routers/reactor.py
```

Expected: exits 0 and lists all reactor functions represented by `REA-*` rows.

- [ ] **Step 4: Update reactor rows**

For each `REA-*` row in the audit, replace open formula descriptions with code-specific evidence. Use the exact denominator `rate_lim = abs(stoichiometric_coefficients[limiting]) * r` where the code uses consumption rate of the limiting reagent.

Expected: each reactor row states whether the code uses direct algebra, `root_scalar`, or `quad`.

- [ ] **Step 5: Inspect mass-balance formulas**

Run:

```bash
sed -n '181,218p' models/mass_balance.py
```

Expected: exits 0 and prints the equations generated in `build_equations`.

- [ ] **Step 6: Update mass-balance rows**

For `MB-01` through `MB-05`, record the exact symbolic equations:

```markdown
| MB-03 | Mass balance | `models/mass_balance.py:build_equations` | For each stream, `sum(z_i) = 1` | `routers/mass_balance.py` | Open | Open | Open | Code formula verified; compare to TCC and validation |
```

Expected: every mass-balance row maps to a concrete `sp.Eq(...)` block.

- [ ] **Step 7: Inspect property model boundaries**

Run:

```bash
rg -n "PropsSI|units_map|get_property|get_all_properties|get_mixture_properties|get_critical_properties|property_key_map|mixture_string" models/components.py routers/components_router.py
```

Expected: exits 0 and shows that properties rely on CoolProp calls rather than locally implemented thermodynamic equations.

- [ ] **Step 8: Update property rows**

Set `PROP-01`, `PROP-02`, and `PROP-03` to `Biblioteca externa documentada, sem formula propria` when the TCC documents CoolProp sufficiently, or `Coberta, mas explicacao insuficiente` if the TCC only lists outputs without explaining dependency, inputs and units.

Expected: property rows are not treated as missing derivations unless the code implements a local formula.

- [ ] **Step 9: Commit domain inventory**

Run:

```bash
git add -f docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
git commit -m "docs: inventory domain equations from code" -m "- Map hydraulic, reactor, mass-balance and property formulas" -m "- Distinguish local formulas from CoolProp-backed properties"
```

Expected: commit succeeds with audit updates only.

## Task 3: Inventory Routes and Exclude Visual Math

**Files:**
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`
- Read: `routers/flow.py`
- Read: `routers/pump.py`
- Read: `routers/sizing.py`
- Read: `routers/reactor.py`
- Read: `routers/mass_balance.py`
- Read: `routers/components_router.py`

- [ ] **Step 1: List public endpoints**

Run:

```bash
rg -n "@router\\.(get|post)|def " routers/flow.py routers/pump.py routers/sizing.py routers/reactor.py routers/mass_balance.py routers/components_router.py
```

Expected: exits 0 and lists every route that can expose a domain result or chart.

- [ ] **Step 2: Map endpoints to matrix rows**

For each matrix row, replace `Public Route` `Open` values with the specific router path where the result is exposed. If a formula is only used internally by another endpoint, write `Internal helper for <route>`.

Expected: no row keeps `Public Route` as `Open`.

- [ ] **Step 3: Identify visual-only calculations**

Run:

```bash
rg -n "_format_|_clamp|_round|_preview|_build_.*preview|_interpolate_color|domain|axis|marker|legend|tick|chart_id|series_id|coordinates|x=|y=" routers frontend/src -g '*.py' -g '*.tsx' -g '*.ts'
```

Expected: exits 0. Use this output to identify calculations that control visualization only.

- [ ] **Step 4: Populate exclusions section**

Append entries under `## Exclusions` in the audit in this format:

```markdown
- `routers/flow.py:_build_circular_preview`: excluded as visual geometry for SVG preview, not a returned Engenharia Quimica calculation.
- `models/charting.py`: excluded as chart axis/domain math, not domain calculation.
```

Expected: visual-only helpers are explicitly excluded instead of silently ignored.

- [ ] **Step 5: Review chart-backed domain rows**

For `HYD-13`, `HYD-14`, `REA-14`, `EQ-01`, and `EQ-02`, decide whether each returns a technical result or only draws a visual. Record one of these decisions:

```markdown
Coverage Status: Implemented no codigo, ausente no TCC
Decision: Include because endpoint returns a domain construction used for Engenharia Quimica interpretation.
```

or:

```markdown
Coverage Status: Fora de escopo: matematica visual
Decision: Exclude because calculation only controls chart rendering, not the engineering result.
```

Expected: no chart-backed row remains undecided.

- [ ] **Step 6: Commit route and exclusion mapping**

Run:

```bash
git add -f docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
git commit -m "docs: map equation routes and visual exclusions" -m "- Connect domain formulas to public endpoints" -m "- Record chart and rendering math exclusions"
```

Expected: commit succeeds with audit updates only.

## Task 4: Inventory Existing TCC Equations

**Files:**
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`
- Read: `final-paper/TEX/main.tex`
- Read: `final-paper/TEX/chapters/*.tex`
- Read: `final-paper/TEX/bibliografia.bib`

- [ ] **Step 1: List displayed equations**

Run:

```bash
rg -n -F '\\begin{equation}' final-paper/TEX/main.tex final-paper/TEX/chapters/*.tex
```

Expected: exits 0 and lists every displayed equation block start.

- [ ] **Step 2: List equation labels**

Run:

```bash
rg -n "label\\{eq:" final-paper/TEX/main.tex final-paper/TEX/chapters/*.tex
```

Expected: exits 0 and lists every labeled equation.

- [ ] **Step 3: Extract engineering methodology equation context**

Run:

```bash
sed -n '1,285p' final-paper/TEX/chapters/4.2-engenharia-part1.tex
sed -n '1,390p' final-paper/TEX/chapters/4.2-engenharia-part2.tex
```

Expected: exits 0 and prints the methodology sections covering sizing, reactors, PFR, balance, hydraulics, pumps and properties.

- [ ] **Step 4: Extract validation equation context**

Run:

```bash
sed -n '90,635p' final-paper/TEX/chapters/4.4-validacao.tex
```

Expected: exits 0 and prints the validation calculations for hydraulics, mass balance and reactors.

- [ ] **Step 5: Populate existing-equations section**

Under `## Existing TCC Equations`, add rows in this format:

```markdown
| TCC ID | File | Label | Formula Summary | Related Code IDs | Citation Nearby |
| --- | --- | --- | --- | --- | --- |
| TCC-4.2-001 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex:19` | `eq:diametro_calc` | `D = sqrt(4Q/(pi V))` | `HYD-01` | `white2018` |
```

Expected: every displayed equation in methodology and validation has a TCC ID, even if it has no `\label{eq:*}`.

- [ ] **Step 6: Check references used near equations**

Run:

```bash
rg -n "cite\\{|white2018|perry2007|fogler2009|levenspiel2000|felder2005|colebrook1939|CoolProp|coolprop" final-paper/TEX/chapters/4.2-engenharia-part1.tex final-paper/TEX/chapters/4.2-engenharia-part2.tex final-paper/TEX/chapters/4.4-validacao.tex final-paper/TEX/bibliografia.bib
```

Expected: exits 0 and shows citations and bibliography entries used around the equations.

- [ ] **Step 7: Commit TCC equation inventory**

Run:

```bash
git add -f docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
git commit -m "docs: inventory TCC equations for coverage audit" -m "- List methodology and validation equations" -m "- Connect equation labels to candidate code rows"
```

Expected: commit succeeds with audit updates only.

## Task 5: Reconcile Code Against TCC Coverage

**Files:**
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`

- [ ] **Step 1: Match each code row to TCC equations**

For every row in `## Coverage Matrix`, set `TCC Location` to one of:

```markdown
`final-paper/TEX/chapters/4.2-engenharia-part1.tex:19`, `eq:diametro_calc`
```

```markdown
Validation only: `final-paper/TEX/chapters/4.4-validacao.tex:201`
```

```markdown
Absent from TCC
```

Expected: no `TCC Location` cell remains `Open`.

- [ ] **Step 2: Match each row to a reference decision**

For every row in `## Coverage Matrix`, set `Reference` to one of:

```markdown
`white2018`
```

```markdown
`fogler2009`; `levenspiel2000`
```

```markdown
CoolProp external documentation cited in TCC
```

```markdown
Missing citation
```

Expected: no `Reference` cell remains `Open`.

- [ ] **Step 3: Assign coverage status**

For every row in `## Coverage Matrix`, set `Coverage Status` to exactly one of:

```markdown
Coberta e explicada
Coberta, mas explicacao insuficiente
Implementada no codigo, ausente no TCC
No TCC, mas sem contraparte atual no codigo
Biblioteca externa documentada, sem formula propria
Fora de escopo: matematica visual
```

Expected: no `Coverage Status` cell remains `Open`.

- [ ] **Step 4: Reconcile equations present only in the TCC**

For every `TCC ID` in `## Existing TCC Equations`, confirm it maps to at least one code ID, a validation-only numerical derivation, or a theoretical reference. Add rows to a new subsection:

```markdown
## TCC Equations Without Direct Code Counterpart

| TCC ID | Reason | Decision |
| --- | --- | --- |
| TCC-4.4-012 | Manual validation derivation for comparison against endpoint output | Keep as validation evidence |
```

Expected: every TCC equation that does not map to code has a reason.

- [ ] **Step 5: Commit reconciliation**

Run:

```bash
git add -f docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
git commit -m "docs: reconcile code formulas with TCC equations" -m "- Classify coverage for every domain formula" -m "- Record equations without direct code counterparts"
```

Expected: commit succeeds with audit updates only.

## Task 6: Produce Future Edit Backlog

**Files:**
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`

- [ ] **Step 1: Add required-edit rows**

Under `## Required Future TCC Edits`, add a table:

```markdown
| Edit ID | Code IDs | Target File | Required Change | Reason | Verification |
| --- | --- | --- | --- | --- | --- |
```

Expected: table exists before adding rows.

- [ ] **Step 2: Convert each missing or insufficient row into an edit**

For every row marked `Coberta, mas explicacao insuficiente`, `Implementada no codigo, ausente no TCC`, or `Missing citation`, add one edit row. Use this format:

```markdown
| EDIT-001 | `HYD-09` | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | Add the SI Hazen-Williams form used by the code or state why the existing coefficient differs from the implementation. | Code uses `10.67 (L + L_eq) Q^1.852/(C^1.852 D^4.8704)`, while TCC must match implementation and units. | Re-run equation scan and compile final paper after implementation. |
```

Expected: each non-covered or insufficient formula has a concrete future edit.

- [ ] **Step 3: Add no-edit rows**

Under `## Items Requiring No TCC Edit`, add rows for covered items and exclusions:

```markdown
| ID | Reason |
| --- | --- |
| PROP-01 | CoolProp is used as an external property package; the TCC needs dependency and units, not internal EOS derivations. |
```

Expected: covered and excluded rows have explicit justification.

- [ ] **Step 4: Commit edit backlog**

Run:

```bash
git add -f docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
git commit -m "docs: list future TCC equation edits" -m "- Convert coverage gaps into edit backlog" -m "- Record formulas that require no TCC edit"
```

Expected: commit succeeds with audit updates only.

## Task 7: Validate Audit Completeness

**Files:**
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`

- [ ] **Step 1: Check for unresolved cells**

Run:

```bash
rg -n "\\bOpen\\b|Review against TCC|Final completeness summary is added" docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
```

Expected: exits 1 with no matches. If matches appear, resolve each matched line with a final decision.

- [ ] **Step 2: Check all expected domains are represented**

Run:

```bash
rg -n "HYD-|REA-|MB-|PROP-|EQ-" docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
```

Expected: exits 0 and shows rows for hydraulics, reactors, mass balance, properties and equilibrium.

- [ ] **Step 3: Check all source files were considered**

Run:

```bash
rg -n "models/hydraulic.py|models/reactor.py|models/mass_balance.py|models/components.py|routers/flow.py|routers/pump.py|routers/sizing.py|routers/reactor.py|routers/mass_balance.py|routers/components_router.py|final-paper/TEX" docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
```

Expected: exits 0 and shows every domain source and TCC source family in the audit.

- [ ] **Step 4: Add final completeness summary**

Under `## Final Completeness Check`, add:

```markdown
- No unresolved `Open` cells remain.
- Every included domain formula has a coverage status.
- Every excluded formula is visual-only or library-internal and has a reason.
- Every future edit has a target file and verification note.
- No TCC source was edited during this audit.
```

Expected: final section states the audit is ready for a later implementation plan that edits the TCC.

- [ ] **Step 5: Commit final audit**

Run:

```bash
git add -f docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md
git commit -m "docs: close TCC equation coverage audit" -m "- Verify every domain formula has a coverage decision" -m "- Prepare future TCC edit backlog"
```

Expected: commit succeeds with audit updates only.

## Task 8: Handoff To TCC Editing Plan

**Files:**
- Read: `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`
- Create later: a separate implementation plan for TCC edits if the user approves editing.

- [ ] **Step 1: Summarize audit result to the user**

Report:

```markdown
Equation coverage audit is complete.

Report the actual counts from the final audit for these categories:

- Covered and explained
- Covered but insufficient
- Implemented in code and absent from TCC
- TCC equations without direct code counterpart
- External-library items
- Visual exclusions

No TCC equations were edited in this audit.
```

Expected: user can decide whether to start a new TCC-editing implementation plan.

- [ ] **Step 2: Ask for approval before editing TCC**

Ask:

```markdown
Do you want me to create the next implementation plan to edit the TCC from the audit backlog?
```

Expected: do not edit `final-paper/TEX/` until the user explicitly approves the next editing plan.
