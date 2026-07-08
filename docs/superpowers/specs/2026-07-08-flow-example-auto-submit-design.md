# Flow Example Auto-Submit Design

**Date:** 2026-07-08

## Goal

Make `Carregar exemplo` in the Flow module behave like a full end-to-end demo trigger.

When the user loads the worked example on `/flow/reynolds`, the page should:

- populate the Reynolds, friction-factor, and hydraulic-diameter forms
- immediately execute the Reynolds calculation
- use the Reynolds result as input for the friction-factor calculation
- execute the hydraulic-diameter calculation and its preview flow
- update all derived tables, charts, and SVGs even if the user has not opened the corresponding tab yet

The intent is to turn the example button into a complete page bootstrap, not just a form filler.

## Current State

Today, the example button only copies backend example values into local form state.

Derived outputs still depend on explicit user submits:

- Reynolds result and regime ruler only appear after `Calcular Reynolds`
- friction factor and Moody chart only appear after `Calcular fator de atrito`
- hydraulic diameter result only appears after `Calcular diâmetro hidráulico`
- the hydraulic preview already updates automatically from form state, but the final calculation still needs submit

So the existing behavior is partially automatic, but not fully chained.

## User-Approved Direction

The approved behavior is the stronger one:

- `Carregar exemplo` must trigger the complete calculation chain automatically
- results must appear in the inactive tabs as soon as they are computed
- no manual tab-by-tab submission is required for the example flow

If one step fails, the others should still try to run unless a dependency is missing.

## Proposed Interaction

### 1. Load example

`Carregar exemplo` should still request the backend example payload and map it into local form state.

### 2. Run Reynolds immediately

After the Reynolds form is populated, the page should calculate Reynolds automatically using the same validation and backend request as the manual submit path.

The resulting Reynolds number should then:

- populate the Reynolds result table
- populate the regime ruler
- be stored for downstream use in the friction-factor flow

### 3. Run friction factor immediately after Reynolds

Once Reynolds succeeds, the friction-factor calculation should run automatically using:

- the computed Reynolds value
- the example's roughness source
- the example's diameter source
- the example's method

That flow should also keep the Moody chart request in place so the operational chart is rendered automatically.

### 4. Run hydraulic diameter immediately

The hydraulic-diameter calculation should run automatically after the example is loaded, using the example's shape and parameters.

The existing live preview remains automatic, and the final result table should also be populated without a manual click.

## Execution Model

The cleanest shape is to refactor each submit handler into a reusable calculation helper and then let the example loader call those helpers in sequence.

Recommended internal structure:

- `calculateReynolds()` for validation, `/flow/reynolds`, and `/flow/reynolds/regime-visualization`
- `calculateFrictionFactor(reynolds: number)` for validation, `/flow/friction-factor`, and `/flow/moody/chart`
- `calculateHydraulicDiameter()` for validation and `/flow/hydraulic-diameter`
- `loadExampleAndRun()` to orchestrate the sequence after the example payload is applied

This keeps the manual button submits and the automatic example flow on the same calculation path.

## Ordering Rules

The calculation order matters:

1. Load and apply the example values
2. Calculate Reynolds
3. Feed the Reynolds result into friction factor
4. Calculate hydraulic diameter

The Reynolds step is the only hard dependency for friction factor.

The hydraulic-diameter step is independent and can run in parallel with the other calculations if the implementation makes that easier, but the user-facing behavior must still end with all three results populated.

## State and Session Handling

The existing session guards should remain in place so delayed responses from stale requests cannot overwrite newer state.

The orchestration should preserve these principles:

- example load failures should not partially commit derived results
- a later manual edit should still invalidate earlier automatic results
- if the user changes input after auto-submit starts, stale responses must be ignored

The simplest implementation path is to reuse the current `sessionRef` pattern and increment sessions whenever a dependent input changes.

## Error Handling

Expected failure modes:

- example payload request fails
- Reynolds request fails
- Reynolds succeeds but regime ruler request fails
- friction-factor request fails
- Moody chart request fails
- hydraulic-diameter request fails

Required behavior:

- a failure in one branch should not erase successful results from unrelated branches
- backend and chart errors should still surface through the existing notification system
- the page should keep whatever derived data already succeeded

Recommended fallback behavior:

- if Reynolds fails, friction factor should not run because it depends on Reynolds
- if friction factor fails, hydraulic diameter can still remain available
- if hydraulic diameter fails, Reynolds and friction factor should remain visible

## Implementation Boundary

Primary file:

- `frontend/src/features/flow/flow-page.tsx`

Supporting file:

- `frontend/src/features/flow/example.ts` only if the example payload mapping needs a small adjustment for the new orchestration path

Expected changes:

- factor the submit logic into reusable calculation helpers
- call those helpers from the example loader after state is populated
- ensure the helpers can be invoked both from manual submit and from the automatic example path

No backend contract changes are required for this feature.

## Testing and Validation

Required test updates:

- the Flow page example test should assert that loading the example now triggers the Reynolds, friction-factor, and hydraulic-diameter requests automatically
- the test should verify the Reynolds result is available without manual submit
- the test should verify the friction-factor chart and result are rendered automatically
- the test should verify the hydraulic-diameter result and preview are present after loading the example

Additional regression checks:

- manual submit paths must still work exactly as before
- stale-response protection must remain intact after the refactor
- failure cases should still report the same notifications

## Out of Scope

- changing the backend calculation endpoints
- redesigning the Flow UI layout
- auto-submitting the page on every typed input change
- cross-module orchestration outside `/flow`
- changing the worked-example data values themselves

## Risks

- chaining async calculations too aggressively could make stale-response handling harder to reason about
- auto-triggering the friction-factor flow before Reynolds is committed could cause a brief empty-state flash if sequencing is not explicit
- refactoring submit logic without care could accidentally change validation behavior or error messages

## Acceptance Criteria

- clicking `Carregar exemplo` fills the example forms and automatically calculates Reynolds
- the computed Reynolds number automatically feeds the friction-factor flow
- the friction-factor result and Moody chart appear without manual submit
- the hydraulic-diameter result and preview appear without manual submit
- the user can open any tab afterward and see the already-computed results
- manual calculation buttons continue to work as before
