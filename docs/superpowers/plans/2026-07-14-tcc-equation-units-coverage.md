# TCC Equation Units Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unit or adimensional-context coverage for all 60 `equation` blocks in the final TCC paper.

**Architecture:** Use a dedicated audit matrix as the source of truth, then edit the three equation-bearing chapter files in focused passes. Prefer local unit tables when several adjacent equations share the same symbols, and remove duplicate prose when a table centralizes units.

**Tech Stack:** LaTeX/ABNTeX2, shell, `rg`, `python3`, `latexmk` through `final-paper/compile.sh`, `pdftotext`.

---

## File Structure

- Create: `docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md`
  - Responsibility: matrix of all 60 equations, type, unit coverage decision, evidence source, final status.
- Modify: `final-paper/TEX/chapters/4.2-engenharia-part1.tex`
  - Responsibility: units for diameter sizing and reactor equations.
- Modify: `final-paper/TEX/chapters/4.2-engenharia-part2.tex`
  - Responsibility: units for PFR recycle, balances, hydraulic correlations, pump head, NPSH, and hydraulic diameter.
- Modify: `final-paper/TEX/chapters/4.4-validacao.tex`
  - Responsibility: units and bases for validation calculations and numerical intermediate steps.
- Modify when required: `final-paper/TEX/main.tex`
  - Responsibility: nomenclature entries only if the text introduces symbols not already listed.

## Equation Inventory

The implementation must keep this inventory at 60 rows and mirror it into the audit file.

| ID | File | Line | Label | Type | Coverage rule |
| --- | --- | ---: | --- | --- | --- |
| U01 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 19 | `eq:diametro_calc` | theoretical | State `Q` in `m^3/s`, `V` in `m/s`, equation result `D` in `m`, system output in `mm`. |
| U02 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 60 | `eq:razao_reagente` | adimensional/base dependent | State `N_{i0}` as molar flow, `\nu_i` dimensionless, ratio as molar-flow per stoichiometric unit and used only comparatively. |
| U03 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 82 | `eq:rate_law` | theoretical | State concentration units, rate units, and that `k` depends on the global reaction order. |
| U04 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 103 | `eq:conc_stoich` | theoretical | State `C_i`, `C_{i0}`, and `C_{A0}` as concentration units; `X`, `\psi`, and stoichiometric coefficients as dimensionless. |
| U05 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 128 | `eq:epsilon_def` | adimensional | State `\varepsilon`, `y_{A0}`, and stoichiometric coefficients as dimensionless. |
| U06 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 141 | `eq:dilution_factor` | adimensional | State `\psi`, `\varepsilon`, and `X` as dimensionless; `P/P_0` coherent pressure ratio; `T/T_0` absolute-temperature ratio in K. |
| U07 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 167 | `eq:molar_flow_in` | definition | State `N_{i0}` in molar-flow units, `Q_i` in volumetric-flow units, and `C_{i0}` in molar-concentration units. |
| U08 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 172 | `eq:total_flow` | definition | State `Q_T` and all `Q_i` in the same volumetric-flow unit. |
| U09 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 177 | `eq:initial_conc` | definition | State `C_{i0}` in molar concentration and `N_{i0}/Q_T` in coherent molar-flow over volumetric-flow units. |
| U10 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 188 | `eq:cstr_design` | theoretical | State `V` in volume, `F_{A0}` in molar flow, `X` dimensionless, and `-r_A` in molar rate per reactor volume. |
| U11 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 201 | `eq:residence_time` | definition | State `\tau` in time, `V` in volume, and `Q_T` in volumetric flow. |
| U12 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 240 | `eq:cstr_obj_function` | adimensional/numerical | State the residual is minimized as a numerical difference in conversion; `X` is dimensionless. |
| U13 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 264 | `eq:volume_calc` | definition | State `V` in volume, `Q_T` in volumetric flow, and `\tau` in time. |
| U14 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 7 | `eq:pfr_design` | theoretical | State `V` in volume, `F_{A0}` in molar flow, `X` and `R` dimensionless, and `-r_A` in molar rate per reactor volume. |
| U15 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 53 | `eq:mass_balance_word` | balance | State every term must use the same mass or molar basis. |
| U16 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 60 | `eq:steady_state_mass_balance` | balance | State inlet and outlet terms must share the same flow unit and accumulation is zero at steady state. |
| U17 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 67 | `eq:component_mass_balance_rxn` | balance | State all component-flow terms share the same molar or mass basis and the reaction term uses that basis per time. |
| U18 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 79 | `eq:recycle_flow` | definition | State `f` dimensionless and `F_R`, `F_G` in the same flow unit. |
| U19 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 84 | `eq:gross_product_flow` | definition | State `F_G`, `F_P`, `F_R` in the same flow unit. |
| U20 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 114 | `eq:laminar_friction` | adimensional | State `f` and `Re` are dimensionless. |
| U21 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 128 | `eq:reynolds_din` | adimensional | State `Re` dimensionless; `D` in length, `\rho` in mass per volume, `V` in length per time, `\mu` in dynamic-viscosity units. |
| U22 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 134 | `eq:reynolds_cin` | adimensional | State `Re` dimensionless; `D` in length, `V` in length per time, `\nu` in length squared per time. |
| U23 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 166 | `eq:colebrook` | adimensional | State `f`, `Re`, and `\varepsilon/D` are dimensionless and `\varepsilon` and `D` must share length units. |
| U24 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 175 | `eq:swamee` | adimensional | State `f`, `Re`, and `\varepsilon/D` are dimensionless and `\varepsilon` and `D` must share length units. |
| U25 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 182 | `eq:haaland` | adimensional | State `f`, `Re`, and `\varepsilon/D` are dimensionless and `\varepsilon` and `D` must share length units. |
| U26 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 215 | `eq:darcy` | correlation | State `h_f`, `L`, `L_{eq}`, and `D` in length units, `V` in length per time, `g` in length per time squared, and `f` dimensionless. |
| U27 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 224 | `eq:hazen` | correlation | State the empirical unit convention used in the text and code; if code and text differ, register the mismatch before editing. |
| U28 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 256 | `eq:bernoulli` | theoretical | State every term is converted to head in meters, with pressure, elevation, velocity, and loss terms identified. |
| U29 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 283 | `eq:npsh` | theoretical | State NPSH in meters of liquid column, pressure terms coherent, density in mass per volume, velocity in length per time, and losses/elevation in meters. |
| U30 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 309 | `eq:diametro_hidraulico` | definition | State `D_h` in length, `A` in area, and `P_m` in wetted-perimeter length. |
| U31 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 316 | `eq:dh_circular` | definition | State `D_h` and `D` in the same length unit. |
| U32 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 321 | `eq:dh_rect` | definition | State `a`, `b`, and `D_h` in the same length unit. |
| U33 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 326 | `eq:dh_annular` | definition | State `D_o`, `D_i`, and `D_h` in the same length unit. |
| U34 | `final-paper/TEX/chapters/4.4-validacao.tex` | 103 | `eq:val_len_total` | validation numeric | State pipe length, equivalent length, diameter, and total length units used in the example. |
| U35 | `final-paper/TEX/chapters/4.4-validacao.tex` | 112 | `eq:val_hf_calc_a` | validation numeric | State the substituted variables are in SI coherent units and the result is in meters. |
| U36 | `final-paper/TEX/chapters/4.4-validacao.tex` | 126 | `eq:val_hf_calc_b` | validation numeric | State the substituted variables are in SI coherent units and the result is in meters. |
| U37 | `final-paper/TEX/chapters/4.4-validacao.tex` | 286 | none | validation numeric | State all flow rates in the balance example use the same flow unit. |
| U38 | `final-paper/TEX/chapters/4.4-validacao.tex` | 291 | none | validation numeric | State all flow rates in the balance example use the same flow unit. |
| U39 | `final-paper/TEX/chapters/4.4-validacao.tex` | 294 | none | validation numeric | State all flow rates in the balance example use the same flow unit. |
| U40 | `final-paper/TEX/chapters/4.4-validacao.tex` | 337 | none | validation numeric | State molar flows in `mol/s`. |
| U41 | `final-paper/TEX/chapters/4.4-validacao.tex` | 340 | none | validation numeric | State molar flows in `mol/s`. |
| U42 | `final-paper/TEX/chapters/4.4-validacao.tex` | 344 | none | adimensional | State conversion is dimensionless or a fraction. |
| U43 | `final-paper/TEX/chapters/4.4-validacao.tex` | 361 | none | validation numeric | State mass flows in `kg/h`. |
| U44 | `final-paper/TEX/chapters/4.4-validacao.tex` | 364 | none | validation numeric | State mass flows in `kg/h`. |
| U45 | `final-paper/TEX/chapters/4.4-validacao.tex` | 487 | `eq:val_rate_law` | validation numeric | State `k` units, `C_A` units, and `-r_A` units for the validation case. |
| U46 | `final-paper/TEX/chapters/4.4-validacao.tex` | 493 | `eq:val_cstr_vol_deriv` | validation numeric | State `F_{A0}` in molar flow, `X` dimensionless, rate in molar rate per volume, result `V` in volume. |
| U47 | `final-paper/TEX/chapters/4.4-validacao.tex` | 500 | `eq:val_cstr_vol_calc_1` | validation numeric | State substituted values produce `m^3`. |
| U48 | `final-paper/TEX/chapters/4.4-validacao.tex` | 504 | `eq:val_cstr_vol_calc_2` | validation numeric | State final result in `m^3`. |
| U49 | `final-paper/TEX/chapters/4.4-validacao.tex` | 531 | `eq:val_pfr_deriv_1` | validation numeric | State integrand has volume units after combining molar flow and reaction-rate units. |
| U50 | `final-paper/TEX/chapters/4.4-validacao.tex` | 537 | `eq:val_pfr_deriv_2` | validation numeric | State `X` dimensionless and resulting integral in volume. |
| U51 | `final-paper/TEX/chapters/4.4-validacao.tex` | 544 | `eq:val_pfr_calc_1` | validation numeric | State substituted values yield volume. |
| U52 | `final-paper/TEX/chapters/4.4-validacao.tex` | 548 | `eq:val_pfr_calc_2` | validation numeric | State substituted values yield volume. |
| U53 | `final-paper/TEX/chapters/4.4-validacao.tex` | 553 | `eq:val_pfr_calc_3` | validation numeric | State final result in `m^3`. |
| U54 | `final-paper/TEX/chapters/4.4-validacao.tex` | 577 | `eq:val_recycle_xin` | adimensional | State `X_{in}` and `R` are dimensionless. |
| U55 | `final-paper/TEX/chapters/4.4-validacao.tex` | 583 | `eq:val_recycle_vol_eq` | validation numeric | State `V` in volume, molar flow in molar-flow units, and rate in molar rate per volume. |
| U56 | `final-paper/TEX/chapters/4.4-validacao.tex` | 589 | `eq:val_recycle_vol_int` | validation numeric | State the integral variable is dimensionless conversion and result is volume. |
| U57 | `final-paper/TEX/chapters/4.4-validacao.tex` | 598 | `eq:val_recycle_xin_calc` | adimensional | State calculated inlet conversion is dimensionless. |
| U58 | `final-paper/TEX/chapters/4.4-validacao.tex` | 604 | `eq:val_recycle_vol_calc_1` | validation numeric | State substituted values yield volume. |
| U59 | `final-paper/TEX/chapters/4.4-validacao.tex` | 608 | `eq:val_recycle_vol_calc_2` | validation numeric | State substituted values yield volume. |
| U60 | `final-paper/TEX/chapters/4.4-validacao.tex` | 613 | `eq:val_recycle_vol_calc_3` | validation numeric | State final result in `m^3`. |

## Task 1: Create the Unit Coverage Audit

**Files:**
- Create: `docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md`
- Read: `docs/superpowers/specs/2026-07-14-tcc-equation-units-coverage-design.md`
- Read: `final-paper/TEX/chapters/4.2-engenharia-part1.tex`
- Read: `final-paper/TEX/chapters/4.2-engenharia-part2.tex`
- Read: `final-paper/TEX/chapters/4.4-validacao.tex`

- [ ] **Step 1: Confirm clean baseline**

Run:

```bash
git status --short --branch
```

Expected: branch is `docs/tcc-board-corrections`; record any existing changes before editing and do not revert user changes.

- [ ] **Step 2: Confirm equation count**

Run:

```bash
rg -n -F "\\begin{equation}" final-paper/TEX/chapters/4.2-engenharia-part1.tex final-paper/TEX/chapters/4.2-engenharia-part2.tex final-paper/TEX/chapters/4.4-validacao.tex | wc -l
```

Expected output:

```text
60
```

- [ ] **Step 3: Create the audit file**

Create `docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md` with:

```markdown
# TCC Equation Units Coverage Audit

## Baseline

- Worktree before edits: recorded from `git status --short --branch`.
- Equation count before edits: 60.
- Scope: all `equation` blocks in `4.2-engenharia-part1.tex`, `4.2-engenharia-part2.tex`, and `4.4-validacao.tex`.

## Unit Policy

- If a local table lists units for a group of equations, the table is the single source of symbol-unit mapping in that passage.
- Nearby prose may introduce or interpret the table, but must not duplicate the same unit list.
- Dimensionless quantities must be explicitly marked as dimensionless.
- Validation calculations must state the unit basis for inputs and results in the immediate context.

## Matrix

Copy the 60-row table from the implementation plan's "Equation Inventory" section and add these columns at the end: `Evidence`, `Edit status`, `Final status`.

## Evidence Notes

### 4.2 Engenharia Part 1

- Evidence status: Open.

### 4.2 Engenharia Part 2

- Evidence status: Open.

### 4.4 Validacao

- Evidence status: Open.

## Final Verification

- Equation count after edits: Open.
- PDF compile: Open.
- PDF text scan: Open.
- Remaining partial rows: Open.
```

- [ ] **Step 4: Set matrix row statuses after copying**

For each matrix row, set:

```text
Evidence = "LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes"
Edit status = "Open"
Final status = "Open"
```

Expected: the audit file has 60 matrix rows and no blank cells.

- [ ] **Step 5: Commit audit setup**

Run:

```bash
git add -f docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md
git commit -m "docs: add TCC equation units coverage audit" -m "- Track all 60 equation blocks for unit coverage" -m "- Define table-as-single-source policy for units"
```

Expected: commit succeeds and includes only the audit file.

## Task 2: Add Unit Coverage to `4.2-engenharia-part1.tex`

**Files:**
- Modify: `final-paper/TEX/chapters/4.2-engenharia-part1.tex`
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md`
- Read evidence when needed: `models/reactor.py`, `routers/reactor.py`, `models/hydraulic.py`, `routers/sizing.py`, `final-paper/TEX/bibliografia.bib`

- [ ] **Step 1: Read the target source section**

Run:

```bash
nl -ba final-paper/TEX/chapters/4.2-engenharia-part1.tex | sed -n '1,290p'
```

Expected: all U01-U13 equation blocks are visible.

- [ ] **Step 2: Add or preserve unit coverage for U01**

Edit around `eq:diametro_calc` so the context states:

```text
Q in m^3/s and V in m/s give D in m in the equation; the implemented routine converts the displayed result to mm.
```

Expected: no duplicate unit list is created if this information already exists.

- [ ] **Step 3: Add a local symbol-unit table for U02-U06**

Insert one compact table before or after the reactor stoichiometry group. The table must include:

```text
N_{i0}: molar flow, e.g. mol/s
\nu_i, \nu_A, \nu_P, \nu_R: dimensionless stoichiometric coefficients
C_i, C_{i0}, C_{A0}: molar concentration, e.g. mol/m^3
X: dimensionless conversion
\varepsilon: dimensionless volumetric-variation coefficient
\psi: dimensionless dilution factor
P, P_0: coherent pressure units, used only as a ratio
T, T_0: absolute temperature in K, used only as a ratio
r or -r_A: molar reaction rate per reactor volume, e.g. mol/(m^3 s)
k: kinetic constant with units defined by the global reaction order
```

Then reduce nearby prose so it interprets the equations and does not repeat the same symbol-unit list.

- [ ] **Step 4: Verify U02-U06 against code before changing mathematical prose**

Run:

```bash
rg -n "limiting|dilution|epsilon|stoichiometric|reaction_rate|rate_law|concentration" models/reactor.py routers/reactor.py
```

Expected: use the output only to confirm current text matches implementation. Do not alter formulas in this task unless the existing formula text is already wrong and the audit records evidence.

- [ ] **Step 5: Add a local symbol-unit table for U07-U13**

Near the CSTR calculation sequence, add one compact table or paragraph covering:

```text
N_{i0}, F_{A0}: molar flow, e.g. mol/s
Q_i, Q_T: volumetric flow, e.g. m^3/s
C_{i0}: molar concentration, e.g. mol/m^3
V: reactor volume, e.g. m^3
X: dimensionless conversion
-r_A: molar reaction rate per reactor volume, e.g. mol/(m^3 s)
\tau: residence time, e.g. s
objective residual in eq:cstr_obj_function: numerical difference in dimensionless conversion
```

Do not repeat this list in every paragraph if the table is used.

- [ ] **Step 6: Update audit rows U01-U13**

In the audit matrix, set U01-U13:

```text
Edit status = "Edited"
Final status = "Covered"
```

For any row that remains ambiguous, use:

```text
Final status = "Partial - reason: U03 at final-paper/TEX/chapters/4.2-engenharia-part1.tex:82 requires kinetic-order-specific k units before final wording"
```

Use the same complete-sentence format for any other partial row: include the
U-ID, file path, line, and the concrete source/code/reference reason.

- [ ] **Step 7: Compile after part 1 edits**

Run:

```bash
./final-paper/compile.sh
```

Expected: exit code 0 and `final-paper/TEX/main.pdf` generated.

- [ ] **Step 8: Commit part 1 coverage**

Run:

```bash
git add final-paper/TEX/chapters/4.2-engenharia-part1.tex docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md
git commit -m "docs: add unit coverage to reactor equations" -m "- Cover equations U01 through U13 with units or dimensionless status" -m "- Keep local unit tables as the single source for repeated symbols"
```

Expected: commit succeeds and touches only the part 1 chapter plus the audit.

## Task 3: Add Unit Coverage to `4.2-engenharia-part2.tex`

**Files:**
- Modify: `final-paper/TEX/chapters/4.2-engenharia-part2.tex`
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md`
- Read evidence when needed: `models/reactor.py`, `models/hydraulic.py`, `routers/pump.py`, `routers/piping.py`, `final-paper/TEX/bibliografia.bib`

- [ ] **Step 1: Read the target source section**

Run:

```bash
nl -ba final-paper/TEX/chapters/4.2-engenharia-part2.tex | sed -n '1,360p'
```

Expected: all U14-U33 equation blocks are visible.

- [ ] **Step 2: Cover PFR and balance equations U14-U19**

Add one local unit table or compact prose for:

```text
V: reactor volume, e.g. m^3
F_{A0}, F_R, F_G, F_P: flow rates in the same molar, mass, or volumetric basis selected for the balance
X and R: dimensionless
-r_A: molar reaction rate per reactor volume, e.g. mol/(m^3 s), when the PFR equation is written on a molar basis
accumulation, inlet, outlet, generation, and consumption: same chosen balance basis per time
f: dimensionless recycle or purge fraction
```

If a table is inserted, remove repeated unit prose around U14-U19 and leave interpretive text only.

- [ ] **Step 3: Cover friction and Reynolds equations U20-U25**

Add a local table for the hydraulic dimensionless group:

```text
Re: dimensionless Reynolds number
f: dimensionless Darcy friction factor
D: pipe diameter in length units, e.g. m
\rho: mass density/specific mass in kg/m^3
V: average velocity in m/s
\mu: dynamic viscosity in Pa s
\nu: kinematic viscosity in m^2/s
\varepsilon: absolute roughness in the same length unit as D
\varepsilon/D: dimensionless relative roughness
```

Expected: U20-U25 each have coverage by this table and no duplicate list is repeated in adjacent prose.

- [ ] **Step 4: Cover head-loss, Hazen-Williams, Bernoulli, and NPSH equations U26-U29**

Before editing U27, run:

```bash
rg -n "Hazen|head|head_loss|bernoulli|npsh|10\\.67|4\\.73|Darcy|friction" models routers final-paper/TEX/chapters/4.2-engenharia-part2.tex
```

Then add or adjust text so:

```text
Darcy-Weisbach: h_f, L, L_eq, and D use length units; V is m/s; g is m/s^2; f is dimensionless; result h_f is m.
Hazen-Williams: the text states the empirical unit convention used by the displayed equation and records in the audit if code uses a different SI constant.
Bernoulli pump head: every term is expressed as head in meters; pressure terms use coherent pressure and density units; velocity terms use m/s; z and h_f are in m.
NPSH: result is meters of liquid column; pressure terms are coherent; density is kg/m^3; velocity is m/s; suction elevation and losses are in m.
```

Expected: U26-U29 have unit coverage and any Hazen-Williams code/text mismatch is explicitly recorded in the audit.

- [ ] **Step 5: Cover hydraulic diameter equations U30-U33**

Add one compact sentence or table:

```text
D_h, D, D_o, D_i, a, b, and P_m use the same length unit; A uses the matching squared length unit; every formula returns D_h in that length unit.
```

Expected: U30-U33 are covered without repeating the same sentence four times if a table is used.

- [ ] **Step 6: Update audit rows U14-U33**

Set U14-U33 final status to `Covered` unless the Hazen-Williams check finds unresolved mismatch. For unresolved mismatch, use:

```text
Final status = "Partial - Hazen-Williams displayed coefficient and code coefficient require source decision"
```

- [ ] **Step 7: Compile after part 2 edits**

Run:

```bash
./final-paper/compile.sh
```

Expected: exit code 0 and `final-paper/TEX/main.pdf` generated.

- [ ] **Step 8: Commit part 2 coverage**

Run:

```bash
git add final-paper/TEX/chapters/4.2-engenharia-part2.tex docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md
git commit -m "docs: add unit coverage to hydraulic equations" -m "- Cover equations U14 through U33 with units or dimensionless status" -m "- Record empirical-unit handling for Hazen-Williams"
```

Expected: commit succeeds and touches only the part 2 chapter plus the audit.

## Task 4: Add Unit Coverage to `4.4-validacao.tex`

**Files:**
- Modify: `final-paper/TEX/chapters/4.4-validacao.tex`
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md`

- [ ] **Step 1: Read validation source sections**

Run:

```bash
nl -ba final-paper/TEX/chapters/4.4-validacao.tex | sed -n '80,640p'
```

Expected: all U34-U60 equation blocks are visible.

- [ ] **Step 2: Cover hydraulic validation equations U34-U36**

Add one context sentence or table near the validation setup:

```text
In this validation, lengths and diameters are handled in meters, velocity in m/s, g in m/s^2, and the calculated head loss h_f is reported in meters.
```

Expected: U34-U36 are covered without repeating units in every numerical line.

- [ ] **Step 3: Cover balance validation equations U37-U44**

Add local context for the balance examples:

```text
For U37-U39, all displayed flows use the same flow-rate unit, so each subtraction or sum remains in that unit.
For U40-U42, molar flows are in mol/s and conversion is dimensionless.
For U43-U44, mass flows are in kg/h.
```

Expected: numerical equations keep the existing values and gain clear unit basis in nearby prose.

- [ ] **Step 4: Cover CSTR validation equations U45-U48**

Add context before the CSTR calculation sequence:

```text
For this validation, C_A is in mol/m^3, k has the unit required by the stated reaction order, -r_A is in mol/(m^3 s), F_A0 is in mol/s, X is dimensionless, and V is returned in m^3.
```

Expected: U45-U48 are covered. If the existing values use a different time basis, preserve the values and write the exact basis shown in the source.

- [ ] **Step 5: Cover PFR validation equations U49-U53**

Add context before the PFR integral sequence:

```text
In the PFR validation, X is dimensionless; F_A0/(-r_A) has volume units after combining molar flow with molar reaction rate per reactor volume; the integral therefore returns V in m^3.
```

Expected: U49-U53 are covered and no duplicate unit list is repeated in each intermediate equation.

- [ ] **Step 6: Cover recycle PFR validation equations U54-U60**

Add context before the recycle sequence:

```text
For the recycle validation, R and X_in are dimensionless; the integration variable X is dimensionless; F_A0/(-r_A) carries volume units; final reactor volumes are reported in m^3.
```

Expected: U54-U60 are covered, with U54 and U57 explicitly marked dimensionless.

- [ ] **Step 7: Add labels only if useful for audit clarity**

If unlabeled validation equations U37-U44 remain hard to identify in the audit, add labels following the pattern:

```latex
\label{eq:val_balance_total_feed}
\label{eq:val_balance_product_a}
\label{eq:val_balance_product_b}
\label{eq:val_molar_feed_a}
\label{eq:val_molar_feed_b}
\label{eq:val_conversion_fraction}
\label{eq:val_mass_balance_in}
\label{eq:val_mass_balance_out}
```

Use only the labels that correspond to the actual equations in the source and
keep them unique. If labels are not added, the audit must identify those
equations by U-ID, file, and line.

- [ ] **Step 8: Update audit rows U34-U60**

Set U34-U60:

```text
Edit status = "Edited"
Final status = "Covered"
```

If any validation block intentionally relies on a shared local table, write in `Evidence`:

```text
Covered by local unit context table immediately before the calculation sequence; nearby prose avoids duplicate unit lists.
```

- [ ] **Step 9: Compile after validation edits**

Run:

```bash
./final-paper/compile.sh
```

Expected: exit code 0 and `final-paper/TEX/main.pdf` generated.

- [ ] **Step 10: Commit validation coverage**

Run:

```bash
git add final-paper/TEX/chapters/4.4-validacao.tex docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md
git commit -m "docs: add unit coverage to validation equations" -m "- Cover equations U34 through U60 with validation unit bases" -m "- Keep shared validation unit context centralized"
```

Expected: commit succeeds and touches only the validation chapter plus the audit.

## Task 5: Nomenclature and Duplicate-Unit Pass

**Files:**
- Modify if needed: `final-paper/TEX/main.tex`
- Modify if needed: `final-paper/TEX/chapters/4.2-engenharia-part1.tex`
- Modify if needed: `final-paper/TEX/chapters/4.2-engenharia-part2.tex`
- Modify if needed: `final-paper/TEX/chapters/4.4-validacao.tex`
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md`

- [ ] **Step 1: Scan symbol list**

Run:

```bash
rg -n "\\\\item\\[|\\\\nu|\\\\psi|\\\\varepsilon|D_h|N_\\{|F_\\{|r_A|h_f|NPSH|Re" final-paper/TEX/main.tex final-paper/TEX/chapters/4.2-engenharia-part1.tex final-paper/TEX/chapters/4.2-engenharia-part2.tex final-paper/TEX/chapters/4.4-validacao.tex
```

Expected: identify symbols used in added unit text but absent from `final-paper/TEX/main.tex`.

- [ ] **Step 2: Update nomenclature only for missing important symbols**

If a symbol is used repeatedly in equations and absent from `main.tex`, add it to the existing nomenclature section in the same style as existing entries. Candidate entries are:

```latex
\item[$D_h$] Diâmetro hidráulico
\item[$h_f$] Perda de carga expressa como altura
\item[$r_A$] Taxa de reação do componente A
```

Do not add symbols already present. Do not create a second nomenclature list.

- [ ] **Step 3: Remove duplicate unit prose introduced by local tables**

Run:

```bash
rg -n "em mol/s|em m\\^3/s|em kg/h|adimensional|mesma unidade|unidades coerentes|SI coerente" final-paper/TEX/chapters/4.2-engenharia-part1.tex final-paper/TEX/chapters/4.2-engenharia-part2.tex final-paper/TEX/chapters/4.4-validacao.tex
```

Expected: each repeated unit statement is either the local table/context source or a necessary one-off note. If both table and prose repeat the same list in the same passage, keep the table and shorten the prose.

- [ ] **Step 4: Update audit duplicate-policy notes**

In the audit, add:

```markdown
## Duplicate-Unit Pass

- Local tables were treated as the single source of symbol-unit mapping.
- Repeated nearby prose was shortened where it duplicated a local table.
- Remaining unit mentions are one-off result statements, validation bases, or dimensionless declarations needed for readability.
```

- [ ] **Step 5: Compile after nomenclature pass**

Run:

```bash
./final-paper/compile.sh
```

Expected: exit code 0 and `final-paper/TEX/main.pdf` generated.

- [ ] **Step 6: Commit nomenclature and dedup pass**

Run:

```bash
git add final-paper/TEX/main.tex final-paper/TEX/chapters/4.2-engenharia-part1.tex final-paper/TEX/chapters/4.2-engenharia-part2.tex final-paper/TEX/chapters/4.4-validacao.tex docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md
git commit -m "docs: align nomenclature for equation units" -m "- Add missing repeated symbols to the nomenclature when needed" -m "- Remove duplicate unit prose around local unit tables"
```

Expected: commit succeeds. If `main.tex` did not change, omit it from `git add`.

## Task 6: Final Verification

**Files:**
- Modify: `docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md`
- Read: `final-paper/TEX/main.pdf`
- Read: `final-paper/TEX/chapters/4.2-engenharia-part1.tex`
- Read: `final-paper/TEX/chapters/4.2-engenharia-part2.tex`
- Read: `final-paper/TEX/chapters/4.4-validacao.tex`

- [ ] **Step 1: Recount equation blocks**

Run:

```bash
rg -n -F "\\begin{equation}" final-paper/TEX/chapters/4.2-engenharia-part1.tex final-paper/TEX/chapters/4.2-engenharia-part2.tex final-paper/TEX/chapters/4.4-validacao.tex | wc -l
```

Expected output:

```text
60
```

- [ ] **Step 2: Check audit statuses**

Run:

```bash
rg -n "Open|Partial" docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md
```

Expected: no `Open` remains. `Partial` is allowed only if the final summary lists the exact technical reason.

- [ ] **Step 3: Compile final paper**

Run:

```bash
./final-paper/compile.sh
```

Expected: exit code 0 and `final-paper/TEX/main.pdf` generated.

- [ ] **Step 4: Extract PDF text**

Run:

```bash
pdftotext -layout final-paper/TEX/main.pdf /tmp/tcc-equation-units-final.txt
rg -n "m\\^3/s|m³/s|mol/s|kg/h|adimensional|sem dimensão|dimensional|unidades coerentes|SI coerente|m\\^3|m³|m/s|kg/m\\^3|kg/m³" /tmp/tcc-equation-units-final.txt
```

Expected: the extracted text contains the new unit and dimensionless context near the relevant chapter sections.

- [ ] **Step 5: Update final verification section**

In the audit's `Final Verification` section, write:

```markdown
- Equation count after edits: 60.
- PDF compile: `./final-paper/compile.sh` exited 0.
- PDF text scan: unit and adimensional markers present in extracted PDF text.
- Remaining partial rows: none.
```

If a partial row remains, replace `none` with the exact U-ID and reason.

- [ ] **Step 6: Commit final verification**

Run:

```bash
git add docs/superpowers/audits/2026-07-14-tcc-equation-units-coverage-audit.md
git commit -m "docs: verify TCC equation unit coverage" -m "- Confirm all 60 equation blocks retain unit coverage status" -m "- Record final PDF compile and text-scan checks"
```

Expected: commit succeeds and includes only the audit unless final verification required a source correction.
