# Worked Example Auto-Submit Across Calculation Pages Design

**Date:** 2026-07-08

## Goal

Make worked examples behave like full calculation bootstraps across the pages where examples feed derived results.

When the user clicks `Carregar exemplo`, the page should not only populate fields. It should also execute the calculations and visualizations that the example enables, even if the user never opens the relevant tab manually.

This applies to pages that already combine example loading with derived outputs, not to pages that only use examples as static form presets.

## Included Pages

The auto-submit policy applies to the example-driven calculation pages:

- Flow
- Sizing
- Pump
- Reactor
- Balance
- Components

Examples that only prefill data without meaningful derived outputs remain out of scope.

## Current State

Today, the example buttons are inconsistent:

- some pages only map backend example data into local state
- some pages already auto-refresh part of the UI through effects
- some derived sections still require explicit `submit` clicks after the example is loaded

That inconsistency makes the worked example feel incomplete in some modules and overly manual in others.

## Approved Direction

The approved behavior is:

- loading the example should trigger all derivable calculations for that page
- the user should see populated tables, charts, and SVGs without needing to submit each tab manually
- results must be available even if the user has not visited the corresponding tab
- manual submit buttons must keep working exactly as they do now

If a derived step fails, successful unrelated steps should remain visible.

## Common Rules

Every included page should follow the same lifecycle:

1. Fetch the example payload
2. Apply the example to local state
3. Trigger the page's derived calculation workflow
4. Update all dependent results in hidden or visible tabs

Shared behavior across all pages:

- use the same validation and request paths as the manual submit flow
- preserve session guards so stale responses cannot overwrite newer state
- keep failure handling isolated to the step that failed
- do not require the user to switch tabs to complete the example workflow

## Page Workflows

### Flow

The example should automatically:

- calculate Reynolds
- fetch the Reynolds regime ruler
- calculate friction factor from the computed Reynolds value
- fetch the Moody chart
- calculate hydraulic diameter
- refresh the hydraulic preview and result table

Ordering:

1. Apply the example
2. Calculate Reynolds
3. Use Reynolds in friction factor
4. Calculate hydraulic diameter

### Sizing

The example should automatically:

- calculate the hydraulic diameter from flow rate and velocity
- generate the velocity profile chart
- calculate the real diameter from the computed diameter and selected schedule

Ordering:

1. Apply the example
2. Calculate the computed diameter
3. Use the computed diameter to resolve the real diameter

### Pump

The example should automatically:

- calculate headloss
- fetch the headloss chart
- fetch the efficiency map
- calculate NPSH available
- fetch the NPSH gauge
- calculate manometric head

Ordering:

1. Apply the example
2. Resolve headloss inputs and calculate headloss
3. Use the example data to calculate NPSH available
4. Use the example data to calculate manometric head

### Reactor

The example should automatically:

- calculate CSTR results
- calculate PFR results
- fetch the PFR spatial profile
- fetch the PFR profile chart
- fetch the PFR recycle chart
- generate the Levenspiel chart once both reactor results are available
- refresh the Arrhenius chart from the plot inputs

Ordering:

1. Apply the example
2. Calculate CSTR
3. Calculate PFR
4. Fetch PFR derivatives
5. Generate the Levenspiel chart
6. Refresh the Arrhenius chart

### Balance

The example should automatically:

- calculate the mass balance
- calculate yields
- generate the balance chart when the data are available

Ordering:

1. Apply the example
2. Calculate the main balance result
3. Calculate yields
4. Generate the chart

### Components

The example should automatically populate and trigger the derived sections that are already modeled as calculations or charts:

- critical properties
- pure-fluid property calculations
- mixture property calculations
- ternary diagram
- binary VLE
- McCabe-Thiele
- property surface
- saturation envelope
- phase envelope
- vapor-pressure chart

The page should keep using the existing visual conventions, but the example should no longer stop at state hydration.

## Implementation Shape

The recommended implementation pattern is page-local orchestration built from reusable calculation helpers.

Each included page should expose a small internal workflow with the same structure:

- an example loader that only fetches and applies example data
- one or more calculation helpers that contain the current submit logic
- one orchestrator that calls those helpers in the right order after the example is applied

This keeps the existing manual buttons intact while letting the example loader reuse the same computation path.

I do not want a new backend contract for this change unless a specific page cannot reuse its current endpoints cleanly.

## State and Session Handling

The refactor must preserve the current stale-response protections.

Required behavior:

- if the user edits fields while the example workflow is running, stale requests must be ignored
- if a downstream step depends on an upstream result, it must not run until that result exists
- if one derived request fails, successful results from other independent steps should remain available

The existing session-counter pattern is acceptable as long as it remains correct after the refactor.

## Error Handling

Expected failure modes:

- example payload request fails
- a derived calculation request fails
- a chart request fails after the numeric result succeeds
- an upstream step fails and blocks its dependent downstream steps

Required behavior:

- preserve successful results from independent steps
- surface the same user-facing error messaging that manual submits currently use
- do not clear unrelated tabs just because one auto-step failed
- keep the page usable after a partial failure

Recommended dependency rule:

- if a required upstream value is missing, skip the dependent downstream step rather than calling it with empty or placeholder data

## Testing and Validation

The test suite should move from “example only prefill” to “example auto-runs derived work” for each included page.

Minimum regression coverage:

- Flow example loads and triggers the Reynolds/friction/hydraulic chain
- Sizing example loads and triggers the calculated-diameter/real-diameter chain
- Pump example loads and triggers headloss, NPSH, and head calculations
- Reactor example loads and triggers CSTR, PFR, and the dependent charts
- Balance example loads and triggers mass balance, yields, and chart generation
- Components example loads and triggers the example-backed derived sections

The current manual submit tests should remain valid after the refactor.

## Out of Scope

- changing example payloads themselves
- changing backend calculation formulas
- adding a global app-wide auto-submit feature for pages that do not have derived calculations
- pages that only load example state without any calculation or chart output
- visual redesign of the result cards or charts

## Risks

- the more modules participate, the easier it is to introduce duplicated orchestration code
- some pages have many independent derived sections, so sequencing must stay explicit
- a careless refactor could accidentally change validation messages or reset behavior
- hidden-tab auto-runs could become fragile if session guards are not preserved

## Acceptance Criteria

- clicking `Carregar exemplo` on each included page populates the example and runs the page's derived workflow
- the relevant results appear without manual tab-by-tab submission
- hidden tabs receive their results as part of the same example action
- the manual submit flows still work independently of the example loader
- partial failures do not erase unrelated successful results
