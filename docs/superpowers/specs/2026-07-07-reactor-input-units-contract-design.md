# Reactor Input Units Contract Design

## Goal

Change the reactor module contract so reactor calculation inputs use `mol/m³` end to end in the frontend, backend, examples, and tests.

This is a contract change, not a display-only adjustment. After this work, the reactor module must no longer interpret incoming `molar_concentration_inlet` values as `mol/L`.

## Problem Statement

The current reactor stack mixes units across layers:

- the frontend labels reactor concentration inputs as `mol/L`
- the backend schema documents reactor concentration inputs as `mol/L`
- the backend model converts the incoming value from `mol/L` to `mol/m³`
- the backend results expose concentration outputs in `mol/m³`
- parts of the frontend profile rendering were forced to convert result values back to `mol/L` just to stay visually consistent

That split contract makes the module easy to misuse and creates non-obvious bugs. The recent PFR profile issue is a direct example: the UI was combining an inlet value interpreted as `mol/L` with outlet values returned in `mol/m³`.

The user wants one clear rule:

- reactor concentration inputs are in `mol/m³`
- reactor concentration outputs remain in `mol/m³`
- examples and tests must be updated to the same basis

## Decision

Adopt `mol/m³` as the only supported concentration unit for the reactor module contract.

This applies to:

- `POST /reactor/cstr`
- `POST /reactor/pfr`
- `POST /reactor/limiting-reagent`
- `POST /reactor/plot-conversion-vs-volume`
- all frontend reactor forms and visualizations
- worked examples loaded by `Carregar exemplo`
- automated tests and any checked-in example payloads in this repo

There will be no temporary compatibility layer for `mol/L`.

## Scope

In scope:

- backend schema descriptions and validation text for reactor inputs
- backend reactor calculations that currently assume `mol/L` input
- frontend form labels and payload assembly for reactor pages
- frontend reactor presets used by `Carregar exemplo`
- frontend concentration profile rendering and schematic labels
- frontend and backend tests that encode the old input unit basis

Out of scope:

- other modules that are not part of the reactor contract
- adding per-field unit selectors
- dual-unit compatibility or API versioning
- changing the units of reactor output concentrations away from `mol/m³`

## Proposed Contract

### Input contract

`molar_concentration_inlet` is interpreted as `mol/m³`.

Example payload:

```json
{
  "input_type": "volume_and_kinetics",
  "components": [
    {
      "state": "liquid",
      "component_name": "A",
      "flow_rate_inlet": 1.2,
      "molar_concentration_inlet": 2000
    },
    {
      "state": "liquid",
      "component_name": "B",
      "flow_rate_inlet": 0,
      "molar_concentration_inlet": 0
    }
  ],
  "stoichiometric_coefficients": [-1, 1],
  "reaction_rate_params": {
    "k": 0.5,
    "reaction_orders": [1, 0]
  },
  "operation_conditions": {
    "initial_temperature": 298.15,
    "initial_pressure": 101325,
    "final_temperature": 298.15,
    "final_pressure": 101325
  },
  "volume": 9.6,
  "recycling_ratio": 0
}
```

### Output contract

Reactor concentration outputs remain in `mol/m³`.

That means the input and output concentration basis will be the same, which removes the current need for frontend-side unit reconciliation.

## Architecture

### Backend

The backend reactor model already calculates internal rates and concentrations in SI-like volumetric units. The structural problem is that `_initialize_reactor()` converts input concentrations from `mol/L` to `mol/m³` before use.

Required change:

- treat `molar_concentration_inlet` as already being `mol/m³`
- remove the implicit `mol/L -> mol/m³` conversion in reactor initialization
- update any helper or limiting-reagent logic that repeats the same assumption

Files affected:

- `models/reactor.py`
- `schemas.py`
- any router or test fixture that documents the old unit basis

### Frontend

The frontend reactor forms should expose the same basis as the backend:

- reactor input fields display `mol/m³`
- presets for `Carregar exemplo` store values already expressed in `mol/m³`
- payload assembly sends those raw values without unit remapping
- PFR concentration profile charts and schematic labels display `mol/m³`

Because both the inlet form state and the outlet result payload will now share the same unit basis, the temporary frontend-side conversion added to profile rendering should be removed.

Files affected:

- `frontend/src/features/reactor/reactor-page.tsx`
- `frontend/src/features/reactor/presets.ts`
- `frontend/src/components/viz/pfr-profile-chart.tsx`
- any reactor-related guided or mocked frontend test fixtures

## Data Migration in the UI

The worked example currently uses concentrations such as `2.0` because it is authored in `mol/L`.

Under the new contract, equivalent example values must be rewritten in `mol/m³`:

- `2.0 mol/L` becomes `2000 mol/m³`
- `0 mol/L` remains `0 mol/m³`

This applies to:

- CSTR example preset
- PFR example preset
- any mocked frontend API responses that expect those example values

## Error Handling

Because this is a contract replacement rather than a compatibility migration:

- the backend does not need to detect or auto-convert likely `mol/L` values
- the frontend does not need to carry hidden conversion rules
- tests must assert the new basis directly

If a client still sends legacy `mol/L` values, the result may be numerically different, and that is acceptable under this change because the contract itself has changed.

## Testing Strategy

### Backend tests

Update reactor tests to reflect the new input basis:

- schema tests must describe `molar_concentration_inlet` as `mol/m³`
- reactor model tests must use values already expressed in `mol/m³`
- route tests must stop implying that `1000` means `1000 mol/L`

The most important regression is that a given concentration value should no longer be multiplied by `1000` internally.

### Frontend tests

Update reactor page tests to assert:

- input labels show `mol/m³`
- `Carregar exemplo` loads `mol/m³` values
- PFR profile chart and schematic display `mol/m³`
- mocked output concentrations are rendered on the same unit basis as the inputs

### Focused regression coverage

At least one test should prove the former bug cannot recur:

- an outlet concentration returned as `400 mol/m³` must be rendered as `400 mol/m³`
- the frontend must not reinterpret it as `0.4 mol/L` or `400 mol/L`

## Risks

### External contract breakage

Any external caller that still assumes reactor inputs are in `mol/L` will send numerically wrong values after this change.

This is intentional and should be treated as a breaking change to the reactor module contract.

### Mixed fixtures

The most likely implementation risk is partial migration:

- forms updated but presets not updated
- backend updated but mocked frontend responses still assume old values
- labels updated but chart rendering still applies old conversion logic

The implementation should therefore update the contract by search surface, not only by the files already touched in the recent PFR bug fix.

## Acceptance Criteria

- Reactor input concentration fields in the frontend show `mol/m³`.
- `Carregar exemplo` in both CSTR and PFR loads concentration values authored in `mol/m³`.
- Backend reactor calculations interpret `molar_concentration_inlet` directly as `mol/m³`.
- Backend reactor outputs continue to expose concentration results in `mol/m³`.
- PFR charts and schematics display concentrations in `mol/m³`.
- No frontend conversion remains whose only purpose was reconciling `mol/L` inputs with `mol/m³` outputs.
- Backend and frontend automated tests are updated to the new contract and pass.

## Implementation Notes

There is already a narrow plan file at `docs/superpowers/plans/2026-07-07-reactor-input-units.md`, but it only covers adding visible unit labels in the frontend. It does not cover the required backend contract change and should not be used as the implementation source for this broader work.
