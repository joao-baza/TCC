# P&ID Editor UX Overhaul — Design Spec

**Date:** 2026-08-10
**Scope:** `frontend/src/features/pid/`
**Goal:** Improve P&ID editor usability by redesigning the toolbar, styling scrollbars, adding icon/text-size customization, fixing bugs, and migrating to the shared DCOU design system.

---

## 1. Architecture & Component Structure

### New Files

| File | Purpose |
|------|---------|
| `features/pid/editor/pid-settings-dialog.tsx` | Modal for preferences: icon size, text size, restore defaults |
| `features/pid/editor/use-pid-settings.ts` | Hook reading/writing prefs from `localStorage` key `pid:settings` |
| `features/pid/editor/pid-theme-provider.tsx` | Wrapper that applies `className="dark"` to the P&ID scope, inheriting the existing DCOU dark theme CSS variables |
| `features/pid/catalog/catalog-zoom-slider.tsx` | Inline slider inside the catalog panel for thumbnail size (24–72px) |

### Modified Files

| File | Change |
|------|--------|
| `editor/editor-toolbar.tsx` | Replace raw `<button>` with `Button` + `Tooltip`, add Lucide icons, consolidate into grouped icon-only toolbar with dropdowns |
| `editor/pid-editor-page.tsx` | Wrap in `PidThemeProvider`, add settings button in header |
| `catalog/catalog-panel.tsx` | Use `ScrollArea`, embed `catalog-zoom-slider`, icon-based toggle buttons |
| `editor/properties-inspector.tsx` | Use `ScrollArea` for panel contents |
| `editor/status-bar.tsx` | Replace hardcoded validation counts with dynamic values from `EditorStore` |
| `editor/editor-store.ts` | Expose `validationCounts: { errors: number; warnings: number }` |
| `domain/geometry.ts` | `canvasCenter()` computes from viewport instead of hardcoded `(400, 300)` |
| `domain/model.ts` | Export real standard label mapping |
| `app/globals.css` | Replace hardcoded `pid-*` color values with Tailwind utilities and CSS variable tokens (~150 lines removed) |

### Design Decision: Always-Dark Scope

The P&ID editor forces dark mode via `PidThemeProvider` applying `className="dark"`. This inherits the `.dark` CSS variables already defined in `globals.css`. Canvas background (`#f8fafc`) stays light for visual contrast.

---

## 2. Toolbar Redesign

### From text-only to icon-only with tooltips

Replace `Tool` (raw `<button>` with `title` attribute) with:

```tsx
<Tooltip>
  <TooltipTrigger render={
    <Button variant="ghost" size="icon-sm" aria-label={label}>
      <Icon />
    </Button>
  } />
  <TooltipContent>{label} · {shortcut}</TooltipContent>
</Tooltip>
```

### Icon mapping (Lucide)

| Label | Icon |
|-------|------|
| Desfazer | `Undo2` |
| Refazer | `Redo2` |
| Excluir seleção | `Trash2` |
| Duplicar | `CopyPlus` |
| Copiar | `Copy` |
| Colar | `ClipboardPaste` |
| Girar 90° | `RotateCw` |
| Girar -90° | `RotateCcw` |
| Alinhar | `AlignJustify` (dropdown trigger) |
| Agrupar | `Group` |
| Adicionar anotação | `StickyNote` |
| Ajustar diagrama à tela | `Maximize2` |
| Aumentar zoom | `ZoomIn` |
| Diminuir zoom | `ZoomOut` |
| Exportar SVG | `FileImage` (SVG badge ou `Image`) |
| Exportar PNG | `ImageDown` |

### Group structure

```
[EDIÇÃO]
Undo | Redo | ... | Delete | Copy+ | Clipboard | Paste | RotateCw | RotateCcw
           | separator (border-l border-border) |
Align ▼ (dropdown) | Group | StickyNote

[LINHA]
┌─────────────────────┐
│ GitBranch Line ▼    │  ← unified dropdown replacing 3 separate buttons
└─────────────────────┘

[NAVEGAÇÃO]
  Maximize2 | ZoomIn | ZoomOut

[EXPORTAR]
Background ▼ | SVG | PNG
```

### Consolidation

- **3 "Linha de *" buttons** → single `<select>` dropdown with type indicator icon. Active type shown as `aria-pressed` on the dropdown trigger.
- **Alinhar** already a `<select>`, gains icon trigger.
- Copy/Cut/Paste remain (icon-only, accessible via keyboard shortcuts).

### States

- Disabled: inherited from `Button` (`opacity-50`, `pointer-events-none`)
- Pressed (line type): `border-primary bg-muted` via `aria-pressed="true"`
- Active (Alinhar/Line dropdown): native `<select>` styling

### Toolbar overflow

Remove `overflow-x: auto`. Toolbar wraps to second row on medium screens via CSS grid (existing behavior at `max-width: 980px`). Icon-only buttons fit more items before wrapping.

---

## 3. Panel Improvements

### ScrollArea migration

Both `.pid-catalog-panel` and `.pid-inspector-panel` replace `overflow: auto` with the shared `ScrollArea` component.

```tsx
<ScrollArea className="min-h-0 flex-1">
  {/* panel content */}
</ScrollArea>
```

### Scrollbar behavior

- Vertical: `w-2.5`, horizontal: `h-2.5`
- Thumb: `rounded-full bg-border` (uses theme token)
- Auto-hide: visible during scroll, fades out after ~1.5s idle. CSS-only via `animation` on the scrollbar track, respecting `prefers-reduced-motion: reduce` (instant hide, no animation).

### Scroll shadow indicators

`ScrollArea` wrapped in a sentinel pattern:
- Top sentinel triggers shadow at the top when content is scrolled down
- Bottom sentinel triggers shadow at the bottom when more content exists below
- Implemented with `IntersectionObserver` in a small wrapper hook

### Panel toggle buttons

Replace text-only buttons with `Button variant="ghost" size="icon-sm"` + `Tooltip`:

| Panel | Open state | Closed state |
|-------|------------|--------------|
| Catalog | `PanelLeftOpen` + "Fechar catálogo" | `PanelLeftClose` (or `LibraryBig`) + "Abrir catálogo" |
| Inspector | `PanelRightClose` + "Fechar inspetor" | `PanelRightOpen` + "Abrir inspetor" |

### Catalog zoom slider

Positioned below the search bar, inside the catalog panel. Horizontal slider with `ZoomOut` and `ZoomIn` icons at the ends. Value persisted to `pid:settings` via `usePidSettings`. Range: 24–72px (default: 40px). Thumbnails use `style={{ height: thumbSize, width: "auto" }}`.

---

## 4. Settings & Preferences

### `usePidSettings` hook

```typescript
interface PidSettings {
  iconSize: "sm" | "md" | "lg";     // SVG class: size-3 (12px) | size-4 (16px) | size-5 (20px)
  textSize: "sm" | "md" | "lg";     // UI text: 0.75rem | 0.875rem | 1rem
  catalogThumbSize: number;          // catalog: 24–72, default 40
}

const defaults: PidSettings = { iconSize: "md", textSize: "md", catalogThumbSize: 40 };
```

- Reads from `localStorage` key `pid:settings` on mount
- Writes on every update
- Parses with fallback to defaults on invalid data
- Exposes: `settings`, `updateSetting(key, value)`, `resetSettings()`

### `pid-settings-dialog.tsx`

Uses `@base-ui/react/dialog` (same as `share-dialog.tsx`). Modal content:

- **Icon size:** three radio-style segmented buttons (Small / Medium / Large)
- **Text size:** three radio-style segmented buttons (Small / Medium / Large)
- **Catalog thumbnails:** range slider (24–72px) with live value display
- **Restore defaults** button (secondary/outline variant)

Changes apply live — no save button. Live preview in the modal shows a sample toolbar button and catalog thumbnail at the selected sizes.

### Settings entry point

`Settings` (`Settings2` icon) button in the header, right-aligned with Share and Document Actions.

---

## 5. Theme Migration

### Strategy

Replace all hardcoded dark colors in `globals.css` (lines 159–473) with Tailwind utility classes using DCOU design tokens.

### Mapping

| Current hardcoded | DCOU token | `.dark` value |
|-------------------|------------|---------------|
| `#07131a` | `var(--background)` → `bg-background` | `#08131a` |
| `#0d1b23` | `var(--sidebar)` → `bg-sidebar` | `#0d1b23` |
| `#122a35` (buttons) | `var(--muted)` → `bg-muted` | `#122a35` |
| `#163847` (button hover) | `var(--accent)` → `hover:bg-accent` | `#163847` |
| `#164558` (pressed) | `var(--primary)/30` → `bg-primary/30` | — |
| `rgb(183 226 238 / 18%)` (borders) | `var(--border)` → `border-border` | same |
| `rgb(183 226 238 / 22%)` (input border) | `var(--input)` → `border-input` | same |
| `#57b9d6` (focus, accent) | `var(--primary)` → `ring-primary` | `#57b9d6` |
| `#e8f4f8` (text) | `var(--foreground)` → `text-foreground` | `#f4fbfd` |
| `#d6e8ee` (panel text) | `var(--foreground)` → `text-foreground` | same |
| `#b8ccd4` (muted text) | `var(--muted-foreground)` → `text-muted-foreground` | `#b8ccd4` |
| `#91adba` (secondary text) | `var(--muted-foreground)` → `text-muted-foreground` | `#b8ccd4` |

### What stays in CSS

Layout-only rules remain with minor adjustments:
- Grid definitions (`grid-template-columns`, grid areas)
- `overflow: hidden` on canvas container
- `transition: grid-template-columns 220ms ease` for panel collapse
- Annotation positioning (`position: absolute`, `transform-origin`)
- Reduced-motion media query (duration override, not color)
- `height: 100% !important` on canvas surface

### What gets removed

All color, background, border-color, and box-shadow declarations in `.pid-*` classes (~150 lines).

### What gets added (JSX)

Tailwind utility classes replacing removed CSS. Example transformation:

```css
/* REMOVED from globals.css */
.pid-studio-panel {
  min-width: 0;
  overflow: auto;
  padding: .65rem;
  border-inline-end: 1px solid rgb(183 226 238 / 18%);
  background: #0d1b23;
}
```

```tsx
/* ADDED to component JSX */
<aside className="bg-sidebar border-r border-border min-w-0 p-3">
```

### Focus rings

Replace custom `outline: 3px solid #57b9d6; outline-offset: 2px` with the shared pattern:
`focus-visible:ring-3 focus-visible:ring-ring/50` (inherited from `@layer base *`)

---

## 6. Bug Fixes

1. **Status bar validation counts hardcoded** — `status-bar.tsx` prints literal `"Avisos 0 · Erros 0"`. Fix: expose real counts from `EditorStore.validationCounts`.

2. **Standard label always "Livre"** — `standardLabel()` returns `"Livre"` for all inputs. Fix: map `PidStandard` enum values to readable labels in `domain/model.ts`.

3. **`canvasCenter()` hardcoded to `(400, 300)`** — `geometry.ts` assumes fixed center. Fix: compute from ReactFlow viewport dimensions or container DOM bounds.

4. **Focus not returned to canvas after toolbar action** — clicking Undo/Redo leaves focus on the button. Fix: after action execution, call `.focus()` on the canvas container (`tabIndex={-1}`).

5. **MiniMap no dynamic `aria-label`** — ReactFlow `MiniMap` has static label. Fix: include visible node count in the label.

---

## 7. Testing

### Unit tests (Vitest + React Testing Library)

| File | Covers |
|------|--------|
| `pid-toolbar.test.tsx` | Icons render with correct labels, tooltips appear on hover, dropdowns emit correct values, disabled/pressed states, group separators present |
| `pid-settings.test.ts` | `usePidSettings` reads/writes localStorage, falls back to defaults on corrupt data, `resetSettings` restores defaults |
| `pid-settings-dialog.test.tsx` | Modal opens/closes, sliders update live preview, restore button resets to defaults |
| `pid-scroll-area.test.tsx` | Panels render inside `ScrollArea`, scroll shadow appears when content overflows, shadow hidden at bounds |
| `pid-panel-toggle.test.tsx` | Icons reflect open/closed state, tooltip label matches state, collapse animation triggers |
| `pid-status-bar.test.tsx` | Validation counts are dynamic (not hardcoded), save state indicators correct |
| `pid-theme-provider.test.tsx` | Wrapper applies `.dark` class, CSS custom properties accessible on child elements |
| `pid-canvas-center.test.ts` | `canvasCenter()` returns `(viewportWidth/2, viewportHeight/2)` |

### E2E tests (Playwright — add to `pid-editor.spec.ts`)

| Scenario | Verification |
|----------|-------------|
| Settings modal opens on gear click | Dialog visible with all controls |
| Icon size changes toolbar buttons | Buttons visually resize |
| Catalog zoom changes thumbnails | Thumbnail height changes |
| Scrollbar auto-hide | Scrollbar appears during scroll, disappears after idle |
| Line type dropdown | Selecting "utility" sets `aria-pressed` and changes connection class |
| Settings persist across reload | After F5, icon size and catalog zoom restored |
| Keyboard shortcuts | `Ctrl+Z` undoes, `Delete` removes selection |
| Status bar shows real validation errors | Inserting invalid node → error count > 0 |
| Panel collapse/expand | Toggle catalog → panel hidden, toggle again → visible |

---

## 8. Out of Scope

- Light/dark theme toggle for the entire DCOU app (no toggle exists today; this spec forces `.dark` for P&ID only)
- Mobile editing support (readonly mode below 768px remains unchanged)
- Real-time collaboration (local collaboration stub remains)
- Adding icons to the DCOU sidebar navigation
- Refactoring feature pages to use `react-hook-form` + `zod`
- P&ID catalog content changes

---

## 9. Acceptance Criteria

1. All toolbar buttons display Lucide icons; no text-only buttons remain
2. Hovering/focusing a toolbar button shows a styled tooltip with label and shortcut
3. Line type selection is a single dropdown, not three separate buttons
4. Catalog and inspector panels use `ScrollArea` with auto-hide scrollbars
5. Scrollbars are styled to match the dark theme (not OS-native light bars)
6. Settings modal opens from a gear icon in the header
7. Icon size, text size, and catalog thumbnail size are adjustable and persist across sessions
8. Status bar shows actual validation error and warning counts
9. The P&ID editor uses DCOU design tokens (CSS variables), not hardcoded color values
10. All existing P&ID tests continue to pass
11. New tests cover toolbar, settings, scroll area, and bug fixes
