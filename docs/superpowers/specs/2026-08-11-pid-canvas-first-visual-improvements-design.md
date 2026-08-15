# P&ID Canvas-First Visual Improvements — Design Spec

**Date:** 2026-08-11  
**Status:** Conversational design approved; implementation pending  
**Scope:** `/pid/<pid>` editor experience in `frontend/src/features/pid/`

## 1. Context and goal

The current editor already provides a functional canvas, symbol catalog, property inspector, validation panel, autosave, collaboration status, export, and responsive read-only behavior. Its main visual limitation is spatial: the catalog and inspector permanently reserve approximately `19rem + 18rem`, while the canvas is the primary work surface.

This spec extends the existing `2026-08-10-pid-ux-overhaul-design.md`. That earlier design remains authoritative for the icon-based toolbar, settings, scrollbar treatment, always-dark editor scope, and current accessibility baseline. This spec changes the workspace composition and the visual priority of the canvas.

The goal is a canvas-first editor that supports two audiences:

1. authors who need fast, low-friction P&ID editing; and
2. reviewers who open a shared diagram and need a clear, trustworthy read-only view.

The selected direction is a **canvas-first workspace with contextual docks**, combined with a technical editor chrome and didactic feedback.

## 2. Goals and non-goals

### Goals

- Increase the usable canvas area on desktop without hiding catalog and inspector access.
- Make the editor's primary state, selected element, save state, and validation state scannable in under a few seconds.
- Keep editing efficient for experienced users while making panel affordances discoverable for learners.
- Preserve the existing P&ID document model, autosave, collaboration, validation, export, and share-link contracts.
- Keep the current `>=768px` editing boundary and improve the read-only experience below it.
- Establish semantic visual tokens and interaction states that work with the current dark editor chrome and light canvas.

### Non-goals

- Adding calculation integration, new catalog content, or new P&ID semantics.
- Replacing React Flow or changing canonical document persistence.
- Adding mobile editing below 768px.
- Adding a global DCOU theme switcher.
- Replacing the already-approved settings, toolbar icon, or scrollbar work from the prior UX overhaul spec.

## 3. Workspace composition

### 3.1 Header

The header becomes a compact, three-part command surface:

- **Identity:** back link, diagram title, and a visible mode chip (`Editando` or `Somente leitura`). Long titles wrap only within a controlled area or use ellipsis with an accessible full label.
- **Primary command strip:** grouped editing, connection, annotation, view, and export controls. Existing icon-only controls remain, but separators and small group labels make the sequence easier to scan.
- **Session actions:** save/sync state, share, settings, export, and destructive document actions. Destructive actions remain spatially separated from routine commands.

The save/sync state currently shown primarily in the footer moves beside the diagram identity. The footer no longer repeats the same status.

### 3.2 Contextual docks

The editor keeps two contextual docks:

- **Catalog dock:** opened from a persistent left rail button or the `C` shortcut. It contains search, source/category filters, symbol rows, and the existing thumbnail-size control.
- **Inspector dock:** opened from a persistent right rail button or the `I` shortcut. It contains selection summary, properties, and validation.

At desktop widths, a dock occupies space only while open. When closed, its rail remains at least 44px wide and exposes an icon, accessible name, and active-state indicator. The canvas remains the central visual anchor in both states.

The first visit to an existing diagram defaults to the canvas-first state. Once a user opens or closes a dock, that preference is remembered for the editor session. A newly created diagram may open the catalog once to support discovery, then follow the remembered state.

Between 768px and 1279px, only one dock may be expanded at a time; opening one closes the other without losing its scroll position or draft state. At 1280px and above, both docks may coexist when explicitly opened.

### 3.3 Canvas

The canvas fills all remaining space and remains visually light:

- background: `#f7fbfc` or the equivalent semantic canvas token;
- grid: low-contrast cool gray, visible enough for alignment but subordinate to symbols and lines;
- selected element: ciano outline/focus ring with no layout shift;
- transient feedback: anchored to the canvas edge and never permanently covers the drawing;
- zoom and fit controls: grouped in one predictable corner with 44px targets.

The canvas must retain its current React Flow projection and viewport persistence. This is a layout and presentation change, not a data-flow change.

## 4. Visual system

### 4.1 Surfaces and color roles

The P&ID editor keeps its scoped dark chrome from `PidThemeProvider`:

| Role | Direction |
|---|---|
| Editor background | deep navy, based on `#08131a` |
| Panel surface | blue-petroleum, based on `#0d1b23` / `#10202a` |
| Muted control surface | based on `#122a35` |
| Primary/focus | current ciano `#57b9d6` |
| Canvas | cool near-white `#f7fbfc` |
| Synchronized | accessible green with text/icon |
| Unsaved/warning | accessible amber with text/icon |
| Error/destructive | accessible red with text/icon |

Raw colors should be centralized in semantic tokens. The canvas may use a separate token family from the chrome so that the technical drawing retains contrast without making the whole application light.

### 4.2 Typography and density

- Use the existing local Geist family for interface labels and body copy.
- Use JetBrains Mono for tags, coordinates, zoom, IDs, and other technical values where alignment benefits from a monospaced face.
- Keep normal text at 14–16px, with 16px as the minimum on small-screen read-only surfaces.
- Use 4/8px spacing increments, 44px minimum interactive targets, and 8px minimum gaps between adjacent controls.
- Keep panel body copy at a readable line height; compactness comes from grouping and disclosure, not from tiny text.

### 4.3 State hierarchy

- Primary action: ciano emphasis in the current context only.
- Hover: subtle surface change, never the only way to discover an action.
- Pressed/selected: ciano border or state layer plus `aria-pressed`/`aria-selected`.
- Disabled: reduced emphasis and semantic disabled state; no misleading hover treatment.
- Read-only: a visible mode chip and explanatory copy, while zoom, export, share, and navigation remain usable.
- Validation: icon/text/count plus color; errors expose a recovery action or a focus target.

Motion uses 150–220ms for dock transitions and micro-interactions, transform/opacity where possible, and no movement when `prefers-reduced-motion` is enabled.

## 5. Component behavior

### Catalog

- Preserve the existing virtualized symbol tree and keyboard navigation.
- Make the dock opener discoverable in the rail and toolbar; show a small active indicator when a search/filter is applied.
- Keep the search field and source/category controls at the top of the open dock.
- Preserve thumbnail-size preferences from the prior UX overhaul.

### Inspector and validation

- Start with a compact selected-element summary: type, tag/name, and read-only/editable state.
- Present `Propriedades` as the primary section.
- Collapse `Validação` when there are no errors or warnings; expand it when a blocking issue appears.
- Keep the existing “focus affected element” action and ensure it moves visual focus to the canvas without stealing focus from unrelated form fields.
- Preserve draft conflict behavior and show field errors adjacent to the field that needs correction.

### Toolbar and footer

- Retain the grouped icon toolbar and Lucide icon family from the previous spec.
- Surface the current connection class without making the selection control dominate the toolbar.
- Move save/sync state to the header beside the title.
- Reduce the footer to zoom, viewport position, selection/element count, and compact validation counts.

### Feedback surfaces

- Use an anchored canvas alert for autosave conflicts and operation failures, with a clear recovery action such as retry, reload, or remain in the editor.
- Use short, non-blocking toasts only for confirmations.
- Keep screen-reader announcements in the existing polite live region and use `role="alert"` for blocking errors.

## 6. Responsive and accessibility contract

The design must be checked at 375px, 414px, 768px, 1024px, 1280px, and 1440px widths, including landscape where practical.

- Below 768px, the editor remains read-only as today; the message explains why editing is unavailable and offers usable navigation/export/share actions.
- At 768–1279px, the canvas and one dock share the screen; a second dock cannot create nested horizontal overflow.
- At 1280px+, open docks may coexist, but the canvas must retain a meaningful minimum width.
- Focus order follows identity → primary commands → session actions → rail controls → canvas → open dock content → footer.
- Rail, dock, sheet, and toolbar buttons have visible focus rings and accessible labels.
- Closing a dock returns focus to its opener. Opening a dock moves focus to its heading or first meaningful control.
- No state relies on color alone; connection classes retain line style/pattern and a visible legend.
- Reduced motion, text-size preferences, keyboard navigation, and screen-reader announcements remain supported.

## 7. Component boundaries and data flow

The presentation layer should be adjusted around existing boundaries:

| Area | Existing boundary | Visual responsibility |
|---|---|---|
| Page shell | `pid-editor-page.tsx` | dock state, responsive composition, header/footer placement |
| Commands | `editor-toolbar.tsx` | grouped actions, labels, pressed/disabled states |
| Symbol discovery | `catalog-panel.tsx` | search/filter hierarchy and dock content |
| Element editing | `properties-inspector.tsx` | summary, field grouping, draft/error hierarchy |
| Validation | `validation-panel.tsx` | count, disclosure, focus-to-element action |
| Drawing | `pid-canvas.tsx` and React Flow projection | canvas surface, selection, viewport controls |
| Status | `status-bar.tsx` plus autosave state | compact secondary metrics |
| Theme | `pid-theme-provider.tsx` and semantic CSS tokens | dark chrome/light canvas contrast |

The canonical `PidDocument`, autosave, collaboration updates, validation rules, export pipeline, and share-token flow remain unchanged. Dock state and user preferences are presentation state only; they may be local/session state but must not enter the canonical document payload.

## 8. Error handling and edge states

- Loading: keep the current loading screen, but provide a structured status line and a clear return action.
- Invalid access token: preserve the current explanatory error and avoid presenting an empty editor shell.
- Autosave conflict: show the conflict near the header/canvas with reload/recovery action; preserve drafts according to existing behavior.
- Blocking validation: disable export as today, but make the reason visible through a validation count and direct focus action.
- Empty diagram: catalog opener and a short canvas hint explain the first insertion action without permanently occupying the canvas.
- Deleted diagram: preserve the current blocking state and return path; keep the visual treatment consistent with the red destructive semantic.

## 9. Verification plan

### Focused component checks

- Dock rail and open/close state preserve keyboard focus and do not create horizontal overflow.
- Opening one dock at 768–1279px closes the other and preserves its state on reopen.
- Header shows save/sync state once; footer shows only secondary metrics.
- Inspector disclosure reflects validation counts and still focuses the affected canvas element.
- Read-only mode retains zoom/export/share and communicates the editing boundary.
- Selection, connection class, error, warning, saved, and unsaved states remain distinguishable without color alone.

### Visual and interaction checks

- Run the existing focused P&ID test suite and add narrow regressions for dock state, responsive composition, status relocation, and validation disclosure.
- Build the frontend and run the existing route/editor smoke checks.
- Manually inspect 375px, 768px, 1024px, 1280px, and 1440px viewports.
- Repeat keyboard navigation and reduced-motion checks.
- Confirm the working tree diff contains only intended visual/editor changes before implementation handoff.

## 10. Acceptance criteria

1. The default desktop editor presents the canvas as the dominant surface; catalog and inspector do not permanently consume their full widths when closed.
2. Both docks have persistent, labeled, keyboard-accessible openers and remember their presentation state.
3. The header contains the diagram title, mode, and save/sync state without duplicating that state in the footer.
4. The inspector prioritizes selected-element properties and discloses validation based on actual counts.
5. The editor preserves the current dark chrome/light canvas identity, semantic state tokens, Lucide icon language, and accessible focus behavior.
6. The current document, autosave, collaboration, validation, export, and share-link behavior remains intact.
7. The layout passes the specified viewport checks without horizontal overflow or content hidden behind fixed controls.

