# P&ID Image-Only Canvas Node Design

## Context

The P&ID editor currently renders every equipment symbol inside a white card with a border, padding, rounded corners, and a shadow. This card obscures the visual language of a process diagram. The catalog already presents each source asset as the primary visual, and the canvas should preserve that appearance after insertion.

## Goal

Render the equipment SVG as the visible canvas object while preserving the existing interaction geometry, connection ports, persistence format, and export behavior.

## Approved Visual Behavior

- The SVG fills the equipment's available artwork area and preserves its aspect ratio.
- The normal state has no visible background, border, shadow, rounded card, or padding.
- The label remains hidden in the normal state.
- The label appears when the node is selected or receives keyboard focus.
- A thin selection outline appears only while the node is selected or focused.
- Connection handles retain their current positions, sizes, and interaction targets.
- A missing or invalid SVG displays a compact fallback inside the same interaction geometry.

The user selected the label-on-selection treatment, option B in the visual comparison.

## Architecture

The change remains inside `EquipmentNode`. The node keeps its current outer interaction rectangle and `PidCanvasInteractionGeometry`; only the visible artwork presentation changes. This boundary preserves drag, selection, resize, rotation, keyboard access, port placement, document persistence, and canonical export.

The component continues to fetch and sanitize local SVG assets through `loadSanitizedPidSvgAsset`. It renders the sanitized data URL with an `img` element. No SVG markup enters the DOM directly.

## Component Structure

`EquipmentNode` keeps three layers:

1. An invisible interaction layer covering `canonicalRect`.
2. An artwork layer containing the proportional SVG and the conditional label.
3. The existing port handles, positioned independently from the artwork.

The interaction layer supplies the node's hit area without painting a card. Selection and focus styles belong to this layer. The artwork layer does not add its own background or border.

## State and Data Flow

The existing `selected` property controls the selection outline and label. Keyboard focus uses `:focus-within` or an equivalent component state so the same information remains available without a pointer. Asset loading and failure state continue to use `sanitizedAssetUrl` and `imageFailed`.

The change adds no fields to `PidNode`, `CatalogSymbol`, commands, projections, or stored documents. Existing diagrams therefore render with the new presentation without migration.

## Accessibility

- The node keeps its current accessible equipment name and selection semantics.
- Keyboard focus exposes the label and a visible focus outline.
- Connection handles keep their accessible names and 44-pixel interaction targets.
- The decorative SVG keeps an empty `alt`; the node's accessible name supplies its identity.
- The fallback includes readable text when the asset cannot be shown.

## Error Handling

Asset fetch, sanitization, and image decoding failures show the existing fallback message. The fallback may use a subtle dashed boundary because it represents an error state, not an equipment symbol. A failed asset must not remove ports or shrink the interaction area.

## Testing

Component tests will prove that:

- the equipment body has no persistent card treatment;
- a valid asset remains the primary visible content;
- the label is hidden normally and visible when selected;
- the selection treatment appears only when selected;
- the fallback remains available after an asset failure;
- connection handles and their positions remain unchanged.

The complete P&ID frontend suite and production build must pass. Browser validation will insert a Draw.io symbol, confirm the image-only normal state, select it, confirm the conditional label and outline, and verify the connection handles.

## Non-Goals

- Changing node dimensions or persisted geometry.
- Tracing each SVG's painted contour for hit testing.
- Inlining sanitized SVG markup into the React tree.
- Changing catalog previews, port definitions, routing, export, or backend contracts.
- Hiding or moving connection handles.

## Acceptance Criteria

1. An inserted equipment displays its SVG without a visible card.
2. The equipment label stays hidden until selection or keyboard focus.
3. Selection reveals a thin outline and the equipment label.
4. Ports remain usable at their existing coordinates.
5. Existing diagrams require no migration.
6. Asset failures retain a clear fallback and all connection handles.
7. Automated tests and the production build pass.
