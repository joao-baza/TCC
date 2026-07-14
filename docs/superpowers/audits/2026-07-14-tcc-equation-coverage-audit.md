# TCC Equation Coverage Audit

## Baseline

- `git status --short --branch`: `## docs/tcc-board-corrections`
- Task 1 audit creation commit: `f7a0b33c8957ff14b6f1ab84f8523f08e882cd1b`
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
| HYD-08 | Pump and piping | `models/hydraulic.py:head_loss` | Darcy-Weisbach with equivalent length | `routers/pump.py:/pump/headloss` | Open | Open | Open | Review against TCC |
| HYD-09 | Pump and piping | `models/hydraulic.py:head_loss` | Hazen-Williams SI correlation | `routers/pump.py:/pump/headloss` | Open | Open | Open | Review against TCC |
| HYD-10 | Pump | `models/hydraulic.py:head` | Bernoulli head with pressure, elevation, velocity and loss terms | `routers/pump.py:/pump/head` | Open | Open | Open | Review against TCC |
| HYD-11 | Pump | `models/hydraulic.py:npsh_available` | available NPSH from pressure, elevation, velocity, loss and vapor pressure terms | `routers/pump.py:/pump/npsh-available` | Open | Open | Open | Review against TCC |
| HYD-12 | Flow | `models/hydraulic.py:hydraulic_diameter` | `D_h = 4A/P` and implemented shape-specific formulas | `routers/flow.py:/flow/hydraulic-diameter` | Open | Open | Open | Review against TCC |
| HYD-13 | Pump visualization model | `models/hydraulic.py:build_system_headloss_curve` | headloss scaling with exponent 2 or 1.852 | `routers/pump.py:/pump/headloss/chart` | Open | Open | Open | Decide if domain model or chart support |
| HYD-14 | Pump visualization model | `models/hydraulic.py:build_pump_curve_points` | parabolic pump curve through operating point | `routers/pump.py:/pump/headloss/chart` | Open | Open | Open | Decide if domain model or chart support |
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
| REA-13 | Reactor PFR recycle | `models/reactor.py:_volume_and_kinetics_in_pfr` | solve `V_calc - V = 0` with `V_calc = (R+1) F_A0 integral_{R/(R+1)X}^{X} dX/rate_lim` | `routers/reactor.py:/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-14 | Reactor PFR recycle | `models/reactor.py:_residence_time_and_kinetics_in_pfr` | `V = Q_T tau` plus the same PFR recycle conversion objective | `routers/reactor.py:/reactor/pfr` | Open | Open | Open | Review against TCC |
| REA-15 | Reactor PFR recycle | `models/reactor.py:_solve_pfr_local_conversion` | local conversion from partial PFR volume with recycle inlet conversion | `routers/reactor.py:/reactor/pfr/spatial-profile` | Open | Open | Open | Review against TCC |
| REA-16 | Reactor visualization model | `routers/reactor.py:build_arrhenius_chart` | Arrhenius relation `k = A exp(-Ea/RT)` | `routers/reactor.py:/reactor/arrhenius/chart` | Open | Open | Open | Decide if chart-only or domain coverage |
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
