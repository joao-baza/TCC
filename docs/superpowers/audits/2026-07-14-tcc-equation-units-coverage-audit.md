# TCC Equation Units Coverage Audit

## Baseline

- Worktree before edits: `## docs/tcc-board-corrections`.
- Equation count before edits: 60.
- Scope: all `equation` blocks in `4.2-engenharia-part1.tex`, `4.2-engenharia-part2.tex`, and `4.4-validacao.tex`.

## Unit Policy

- If a local table lists units for a group of equations, the table is the single source of symbol-unit mapping in that passage.
- Nearby prose may introduce or interpret the table, but must not duplicate the same unit list.
- Dimensionless quantities must be explicitly marked as dimensionless.
- Validation calculations must state the unit basis for inputs and results in the immediate context.

## Matrix

| ID | File | Line | Label | Type | Coverage rule | Evidence | Edit status | Final status |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| U01 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 19 | `eq:diametro_calc` | theoretical | State `Q` in `m^3/s`, `V` in `m/s`, equation result `D` in `m`, system output in `mm`. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U02 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 60 | `eq:razao_reagente` | adimensional/base dependent | State `N_{i0}` as molar flow, `\nu_i` dimensionless, ratio as molar-flow per stoichiometric unit and used only comparatively. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U03 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 82 | `eq:rate_law` | theoretical | State concentration units, rate units, and that `k` depends on the global reaction order. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U04 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 103 | `eq:conc_stoich` | theoretical | State `C_i`, `C_{i0}`, and `C_{A0}` as concentration units; `X`, `\psi`, and stoichiometric coefficients as dimensionless. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U05 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 128 | `eq:epsilon_def` | adimensional | State `\varepsilon`, `y_{A0}`, and stoichiometric coefficients as dimensionless. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U06 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 141 | `eq:dilution_factor` | adimensional | State `\psi`, `\varepsilon`, and `X` as dimensionless; `P/P_0` coherent pressure ratio; `T/T_0` absolute-temperature ratio in K. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U07 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 167 | `eq:molar_flow_in` | definition | State `N_{i0}` in molar-flow units, `Q_i` in volumetric-flow units, and `C_{i0}` in molar-concentration units. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U08 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 172 | `eq:total_flow` | definition | State `Q_T` and all `Q_i` in the same volumetric-flow unit. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U09 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 177 | `eq:initial_conc` | definition | State `C_{i0}` in molar concentration and `N_{i0}/Q_T` in coherent molar-flow over volumetric-flow units. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U10 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 188 | `eq:cstr_design` | theoretical | State `V` in volume, `F_{A0}` in molar flow, `X` dimensionless, and `-r_A` in molar rate per reactor volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U11 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 201 | `eq:residence_time` | definition | State `\tau` in time, `V` in volume, and `Q_T` in volumetric flow. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U12 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 240 | `eq:cstr_obj_function` | adimensional/numerical | State the residual is minimized as a numerical difference in conversion; `X` is dimensionless. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U13 | `final-paper/TEX/chapters/4.2-engenharia-part1.tex` | 264 | `eq:volume_calc` | definition | State `V` in volume, `Q_T` in volumetric flow, and `\tau` in time. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U14 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 7 | `eq:pfr_design` | theoretical | State `V` in volume, `F_{A0}` in molar flow, `X` and `R` dimensionless, and `-r_A` in molar rate per reactor volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U15 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 53 | `eq:mass_balance_word` | balance | State every term must use the same mass or molar basis. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U16 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 60 | `eq:steady_state_mass_balance` | balance | State inlet and outlet terms must share the same flow unit and accumulation is zero at steady state. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U17 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 67 | `eq:component_mass_balance_rxn` | balance | State all component-flow terms share the same molar or mass basis and the reaction term uses that basis per time. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U18 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 79 | `eq:recycle_flow` | definition | State `f` dimensionless and `F_R`, `F_G` in the same flow unit. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U19 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 84 | `eq:gross_product_flow` | definition | State `F_G`, `F_P`, `F_R` in the same flow unit. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U20 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 114 | `eq:laminar_friction` | adimensional | State `f` and `Re` are dimensionless. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U21 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 128 | `eq:reynolds_din` | adimensional | State `Re` dimensionless; `D` in length, `\rho` in mass per volume, `V` in length per time, `\mu` in dynamic-viscosity units. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U22 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 134 | `eq:reynolds_cin` | adimensional | State `Re` dimensionless; `D` in length, `V` in length per time, `\nu` in length squared per time. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U23 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 166 | `eq:colebrook` | adimensional | State `f`, `Re`, and `\varepsilon/D` are dimensionless and `\varepsilon` and `D` must share length units. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U24 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 175 | `eq:swamee` | adimensional | State `f`, `Re`, and `\varepsilon/D` are dimensionless and `\varepsilon` and `D` must share length units. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U25 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 182 | `eq:haaland` | adimensional | State `f`, `Re`, and `\varepsilon/D` are dimensionless and `\varepsilon` and `D` must share length units. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U26 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 215 | `eq:darcy` | correlation | State `h_f`, `L`, `L_{eq}`, and `D` in length units, `V` in length per time, `g` in length per time squared, and `f` dimensionless. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U27 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 224 | `eq:hazen` | correlation | State the empirical unit convention used in the text and code; if code and text differ, register the mismatch before editing. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U28 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 256 | `eq:bernoulli` | theoretical | State every term is converted to head in meters, with pressure, elevation, velocity, and loss terms identified. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U29 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 283 | `eq:npsh` | theoretical | State NPSH in meters of liquid column, pressure terms coherent, density in mass per volume, velocity in length per time, and losses/elevation in meters. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U30 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 309 | `eq:diametro_hidraulico` | definition | State `D_h` in length, `A` in area, and `P_m` in wetted-perimeter length. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U31 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 316 | `eq:dh_circular` | definition | State `D_h` and `D` in the same length unit. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U32 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 321 | `eq:dh_rect` | definition | State `a`, `b`, and `D_h` in the same length unit. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U33 | `final-paper/TEX/chapters/4.2-engenharia-part2.tex` | 326 | `eq:dh_annular` | definition | State `D_o`, `D_i`, and `D_h` in the same length unit. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U34 | `final-paper/TEX/chapters/4.4-validacao.tex` | 103 | `eq:val_len_total` | validation numeric | State pipe length, equivalent length, diameter, and total length units used in the example. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U35 | `final-paper/TEX/chapters/4.4-validacao.tex` | 112 | `eq:val_hf_calc_a` | validation numeric | State the substituted variables are in SI coherent units and the result is in meters. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U36 | `final-paper/TEX/chapters/4.4-validacao.tex` | 126 | `eq:val_hf_calc_b` | validation numeric | State the substituted variables are in SI coherent units and the result is in meters. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U37 | `final-paper/TEX/chapters/4.4-validacao.tex` | 286 | none | validation numeric | State all flow rates in the balance example use the same flow unit. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U38 | `final-paper/TEX/chapters/4.4-validacao.tex` | 291 | none | validation numeric | State all flow rates in the balance example use the same flow unit. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U39 | `final-paper/TEX/chapters/4.4-validacao.tex` | 294 | none | validation numeric | State all flow rates in the balance example use the same flow unit. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U40 | `final-paper/TEX/chapters/4.4-validacao.tex` | 337 | none | validation numeric | State molar flows in `mol/s`. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U41 | `final-paper/TEX/chapters/4.4-validacao.tex` | 340 | none | validation numeric | State molar flows in `mol/s`. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U42 | `final-paper/TEX/chapters/4.4-validacao.tex` | 344 | none | adimensional | State conversion is dimensionless or a fraction. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U43 | `final-paper/TEX/chapters/4.4-validacao.tex` | 361 | none | validation numeric | State mass flows in `kg/h`. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U44 | `final-paper/TEX/chapters/4.4-validacao.tex` | 364 | none | validation numeric | State mass flows in `kg/h`. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U45 | `final-paper/TEX/chapters/4.4-validacao.tex` | 487 | `eq:val_rate_law` | validation numeric | State `k` units, `C_A` units, and `-r_A` units for the validation case. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U46 | `final-paper/TEX/chapters/4.4-validacao.tex` | 493 | `eq:val_cstr_vol_deriv` | validation numeric | State `F_{A0}` in molar flow, `X` dimensionless, rate in molar rate per volume, result `V` in volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U47 | `final-paper/TEX/chapters/4.4-validacao.tex` | 500 | `eq:val_cstr_vol_calc_1` | validation numeric | State substituted values produce `m^3`. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U48 | `final-paper/TEX/chapters/4.4-validacao.tex` | 504 | `eq:val_cstr_vol_calc_2` | validation numeric | State final result in `m^3`. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U49 | `final-paper/TEX/chapters/4.4-validacao.tex` | 531 | `eq:val_pfr_deriv_1` | validation numeric | State integrand has volume units after combining molar flow and reaction-rate units. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U50 | `final-paper/TEX/chapters/4.4-validacao.tex` | 537 | `eq:val_pfr_deriv_2` | validation numeric | State `X` dimensionless and resulting integral in volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U51 | `final-paper/TEX/chapters/4.4-validacao.tex` | 544 | `eq:val_pfr_calc_1` | validation numeric | State substituted values yield volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U52 | `final-paper/TEX/chapters/4.4-validacao.tex` | 548 | `eq:val_pfr_calc_2` | validation numeric | State substituted values yield volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U53 | `final-paper/TEX/chapters/4.4-validacao.tex` | 553 | `eq:val_pfr_calc_3` | validation numeric | State final result in `m^3`. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U54 | `final-paper/TEX/chapters/4.4-validacao.tex` | 577 | `eq:val_recycle_xin` | adimensional | State `X_{in}` and `R` are dimensionless. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U55 | `final-paper/TEX/chapters/4.4-validacao.tex` | 583 | `eq:val_recycle_vol_eq` | validation numeric | State `V` in volume, molar flow in molar-flow units, and rate in molar rate per volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U56 | `final-paper/TEX/chapters/4.4-validacao.tex` | 589 | `eq:val_recycle_vol_int` | validation numeric | State the integral variable is dimensionless conversion and result is volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U57 | `final-paper/TEX/chapters/4.4-validacao.tex` | 598 | `eq:val_recycle_xin_calc` | adimensional | State calculated inlet conversion is dimensionless. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U58 | `final-paper/TEX/chapters/4.4-validacao.tex` | 604 | `eq:val_recycle_vol_calc_1` | validation numeric | State substituted values yield volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U59 | `final-paper/TEX/chapters/4.4-validacao.tex` | 608 | `eq:val_recycle_vol_calc_2` | validation numeric | State substituted values yield volume. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |
| U60 | `final-paper/TEX/chapters/4.4-validacao.tex` | 613 | `eq:val_recycle_vol_calc_3` | validation numeric | State final result in `m^3`. | LaTeX source pending; code/reference check required only for equations whose mathematical meaning changes | Open | Open |

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
