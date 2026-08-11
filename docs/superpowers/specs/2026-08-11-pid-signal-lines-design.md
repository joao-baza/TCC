# P&ID Signal Line Fidelity Design

## Context

The P&ID editor already separates connection class from visual line style. The current line style set is not faithful enough to a real P&ID legend because several signal types are represented by simple SVG dash arrays or by names that do not match the reference legend.

The target is the signal legend shown by the user, titled "Sinais utilizados nos fluxogramas de processo". The editor must use that legend as the canonical source for signal styles.

## Goals

- Replace the existing signal line style set with the 12 styles from the reference legend.
- Render each style with visual patterns faithful to the reference, not only dashed strokes.
- Add a toolbar-accessible legend that can be closed or minimized.
- Let the legend act as a technical reference by default.
- When an edge is selected, let the user click a legend item to apply that style to the selected edge.
- Keep the default style for new `signal` connections as `Sinal eletrico`.
- Reset current development data instead of preserving compatibility with old documents.

## Non-Goals

- No backward-compatible migration for old line style values.
- No multi-standard ISA/ISO/ABNT switching in this change.
- No changes to non-P&ID modules.
- No broader data model refactor beyond the line style contract and required consumers.

## Canonical Signal Styles

The editor will support exactly these styles:

1. Suprimento ou impulso
2. Sinal pneumatico
3. Sinal hidraulico
4. Sinal eletromagnetico ou sonico guiado
5. Ligacao por software
6. Sinal binario pneumatico
7. Sinal nao-definido
8. Sinal eletrico
9. Tubo capilar
10. Sinal eletromagnetico ou sonico nao-guiado
11. Ligacao mecanica
12. Sinal binario eletrico

The user-facing labels in the UI should use Portuguese accents where the existing file encoding and UI text already support them. Internal enum values may remain ASCII slugs.

## Rendering Design

Canvas and SVG export will share a single pattern renderer for line styles. The renderer will receive the orthogonal route points and return SVG markup for:

- a base path, when the reference style includes a continuous or dashed center line;
- repeated glyphs positioned along each horizontal or vertical segment;
- style-specific combinations, such as dashed electric signal plus pneumatic/binary glyph overlays.

The renderer must preserve the actual edge route. Glyphs are decorative marks over the path and must not change source or target geometry.

Expected visual mappings:

- `Suprimento ou impulso`: plain thin line.
- `Sinal pneumatico`: line with repeated paired diagonal marks.
- `Sinal hidraulico`: line with repeated perpendicular/L-like hydraulic marks.
- `Sinal eletromagnetico ou sonico guiado`: line with repeated open circles.
- `Ligacao por software`: line with repeated small linked circles.
- `Sinal binario pneumatico`: pneumatic-style repeated crosses/diagonal pairs.
- `Sinal nao-definido`: line with repeated single diagonal marks.
- `Sinal eletrico`: dashed line with repeated pneumatic-like diagonal marks as shown in the reference.
- `Tubo capilar`: line with repeated X marks.
- `Sinal eletromagnetico ou sonico nao-guiado`: repeated sinusoidal/arc marks matching the reference's non-guided wave pattern.
- `Ligacao mecanica`: line with repeated concentric circle marks.
- `Sinal binario eletrico`: dashed/electric base plus repeated binary pneumatic marks.

Glyph placement will use fixed spacing along visible line length and work for both horizontal and vertical orthogonal segments. Very short segments may omit glyphs instead of crowding them.

## Legend Design

The editor toolbar will include a signal legend button. Activating it opens a popover or modal with a two-column table matching the reference legend structure.

Behavior:

- The legend can be closed or minimized.
- With no selected edge, legend rows are reference-only.
- With a selected edge, clicking a row applies that line style to the selected edge.
- The legend remains open after applying a style so the user can continue comparing patterns.
- The existing inspector line style field may remain, but it must use the same canonical 12-style list.

## Data Reset

Because compatibility with old line styles is not required, the implementation may reset the current development database and local persisted P&ID documents. This reset must be explicit in the implementation notes and should be done before end-to-end verification so stale documents do not mask schema problems.

The user's provided sudo credential is not part of this design document and must not be stored in project files.

## Testing And Verification

Verification will include:

- Unit tests for the 12-style `LineStyle` contract and `signal` default style.
- Schema tests rejecting removed legacy styles.
- Renderer tests proving each style emits the expected path/glyph structure.
- Canvas tests for rendering a selected edge with a canonical style.
- Toolbar/legend interaction tests for opening the legend and applying a style to a selected edge.
- SVG export tests proving exported output uses the same pattern renderer.
- A local smoke check in the P&ID editor after resetting development data.

## Implementation Boundary

The change is limited to the P&ID editor domain, canvas, export, toolbar/legend UI, inspector options, schema/tests, and reset instructions or scripts needed for development data. It should not alter calculation modules, catalog symbol parsing, or unrelated TCC pages.
