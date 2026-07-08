# Moody Chart Colored Legend Design

**Date:** 2026-07-08

**Goal**

Make the legend pills in the "Ponto operacional - Diagrama de Moody" chart visually semantic and align the chart colors with that legend, following the clearer legend behavior already used in the reactor charts.

**Context**

The current Moody chart already distinguishes key elements in the SVG, but the legend pills remain neutral white chips. That weakens the mapping between legend and plot, especially compared to the more explicit legend treatment used in the CSTR/PFR visualizations.

This change is intentionally narrow. It updates only the Moody chart visual language and does not change calculations, scales, geometry, data contracts, or layout structure.

## User-Approved Direction

The approved direction is the stronger legend treatment:

- Use more explicit, saturated semantic colors in the pills.
- Adjust the chart elements that correspond to those pills so the legend maps directly to the plot.
- Keep axes, grid, and frame neutral so the highlighted semantics remain readable.

## Semantic Color Mapping

### Curva laminar

- Use a strong teal treatment.
- Apply it to the laminar curve and its in-chart label/annotation.
- The pill should use a light teal background, teal border, and teal text.

### Familia de rugosidades

- Use a saturated cool blue treatment.
- Apply it to the turbulent roughness-family curves and their right-side guide labels.
- The currently selected roughness curve may remain emphasized within the same blue family, but should not break semantic consistency.
- The pill should use a light blue background, blue border, and blue text.

### Faixa de transicao

- Replace the neutral gray transition band with an amber semantic treatment.
- Apply amber to the band fill, dashed bounds, and the "transicao" label.
- The pill should use a light amber background, amber border, and amber text.

### Ponto operacional

- Keep the operational point as the highest-contrast accent, using red.
- Apply red to the point marker, projection lines, and operational label.
- If needed for contrast, reinforce the marker ring while preserving the red semantic cue.
- The pill should use a light red background, red border, and red text.

## Chart Element Scope

The color alignment applies to:

- Laminar curve and laminar annotation
- Turbulent roughness-family curves
- Roughness labels and guide lines on the right side
- Transition band fill
- Transition band dashed vertical limits
- Transition label
- Operational point marker
- Operational point projection lines
- Operational point label

The following remain neutral:

- Plot background
- Grid lines
- Axes
- Axis labels
- Outer container and frame

## Implementation Boundary

Primary file:

- `frontend/src/components/viz/moody-chart.tsx`

Expected implementation shape:

- Introduce a small semantic color map near the top of the component/module instead of scattering raw hex values throughout the render tree.
- Replace the neutral legend chip styling with semantic pill styling.
- Reuse the same semantic tokens in the SVG where each legend item maps to a visible chart element.

No backend changes are required.

## Accessibility and Readability Requirements

- Preserve strong text contrast for all visible labels.
- Preserve clear visual separation between highlighted elements and neutral chart infrastructure.
- Do not reduce readability of the roughness labels on the right edge.
- Keep the transition band translucent enough that curves remain readable through it.

## Testing and Validation

Required validation:

- Existing component test coverage for `frontend/src/test/moody-chart.test.tsx` should continue to pass.
- Add a lightweight assertion that confirms the colored legend is intentionally rendered, without over-coupling tests to exact hex values unless the implementation naturally exposes stable semantic hooks.
- Perform a visual verification of the rendered chart to confirm legend-to-plot correspondence.

## Out of Scope

- Changing Reynolds or friction-factor calculations
- Changing chart domains, scales, ticks, or geometry
- Redesigning the card/container layout
- Introducing a new shared legend component
- Broad chart theming changes outside the Moody chart

## Risks

- Over-saturating the roughness-family lines could make the plot visually noisy.
- Low-contrast label choices could reduce readability on the light background.
- Overly strict test assertions on presentation details could create brittle frontend tests.

## Acceptance Criteria

- Each of the four pills is visibly color-coded according to its chart meaning.
- The corresponding chart elements use the same semantic color family as the matching pill.
- The transition region no longer reads as a neutral gray area.
- The plot remains readable, with neutral infrastructure and colored semantics clearly separated.
- The operational point remains the strongest focal highlight.
