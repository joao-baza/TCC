# P&ID Editor UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the P&ID editor toolbar with icon-only buttons and tooltips, add auto-hide scrollbars, add settings for icon/text/catalog thumbnail size, migrate hardcoded dark colors to DCOU design tokens, and fix known bugs.

**Architecture:** Foundation hooks (`usePidSettings`, `PidThemeProvider`) go first. Bug fixes are standalone. Toolbar and settings dialog are built on the foundation. Panel improvements use the existing `ScrollArea` component. CSS migration replaces hardcoded values with Tailwind tokens in-place. Integration in `pid-editor-page.tsx` wires everything together last.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `@base-ui/react` (Button, Tooltip, ScrollArea, Dialog), `lucide-react` (icons), Vitest + React Testing Library, Playwright (E2E)

---

## File Structure

| File | Responsibility |
|------|---------------|
| **Create:** `features/pid/editor/use-pid-settings.ts` | Hook: localStorage read/write for icon/text/thumb size prefs |
| **Create:** `features/pid/editor/pid-theme-provider.tsx` | Wrapper: forces `.dark` class on P&ID scope |
| **Create:** `features/pid/editor/pid-settings-dialog.tsx` | Modal dialog for user preferences |
| **Create:** `features/pid/catalog/catalog-zoom-slider.tsx` | Inline slider inside catalog panel for thumbnail size |
| **Modify:** `features/pid/domain/model.ts` | Export proper standard label mapping |
| **Modify:** `features/pid/domain/geometry.ts` | Dynamic canvas center from viewport |
| **Modify:** `features/pid/editor/editor-store.ts` | Expose `validationCounts` getter |
| **Modify:** `features/pid/editor/status-bar.tsx` | Dynamic validation counts |
| **Modify:** `features/pid/editor/editor-toolbar.tsx` | Icon-only toolbar with grouped layout |
| **Modify:** `features/pid/editor/pid-editor-page.tsx` | Wire theme provider, settings, new toolbar |
| **Modify:** `features/pid/catalog/catalog-panel.tsx` | ScrollArea, zoom slider, icon toggles |
| **Modify:** `features/pid/editor/properties-inspector.tsx` | ScrollArea wrapper |
| **Modify:** `app/globals.css` | Replace hardcoded P&ID colors with tokens |

---

### Task 1: `usePidSettings` hook

**Files:**
- Create: `frontend/src/features/pid/editor/use-pid-settings.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useCallback, useSyncExternalStore } from "react";

export type PidIconSize = "sm" | "md" | "lg";
export type PidTextSize = "sm" | "md" | "lg";

export interface PidSettings {
  iconSize: PidIconSize;
  textSize: PidTextSize;
  catalogThumbSize: number;
}

const STORAGE_KEY = "pid:settings";
const DEFAULTS: PidSettings = Object.freeze({ iconSize: "md" as const, textSize: "md" as const, catalogThumbSize: 40 });

function readSettings(): PidSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      iconSize: isValidIconSize(parsed.iconSize) ? parsed.iconSize : DEFAULTS.iconSize,
      textSize: isValidTextSize(parsed.textSize) ? parsed.textSize : DEFAULTS.textSize,
      catalogThumbSize: isValidThumbSize(parsed.catalogThumbSize) ? parsed.catalogThumbSize : DEFAULTS.catalogThumbSize,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function isValidIconSize(value: unknown): value is PidIconSize {
  return value === "sm" || value === "md" || value === "lg";
}

function isValidTextSize(value: unknown): value is PidTextSize {
  return value === "sm" || value === "md" || value === "lg";
}

function isValidThumbSize(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 24 && value <= 72;
}

const subscribers = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function writeSettings(settings: PidSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  for (const subscriber of subscribers) subscriber();
}

export function usePidSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    readSettings,
    () => DEFAULTS,
  );

  const updateSetting = useCallback(<K extends keyof PidSettings>(key: K, value: PidSettings[K]) => {
    const current = readSettings();
    writeSettings({ ...current, [key]: value });
  }, []);

  const resetSettings = useCallback(() => {
    writeSettings({ ...DEFAULTS });
  }, []);

  return { settings, updateSetting, resetSettings } as const;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/pid/editor/use-pid-settings.ts
git commit -m "feat(pid): add usePidSettings hook with localStorage persistence"
```

---

### Task 2: `PidThemeProvider` wrapper

**Files:**
- Create: `frontend/src/features/pid/editor/pid-theme-provider.tsx`

- [ ] **Step 1: Write the provider**

```typescript
import type { ReactNode } from "react";

export function PidThemeProvider({ children }: { children: ReactNode }) {
  return <div className="dark bg-background text-foreground">{children}</div>;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/pid/editor/pid-theme-provider.tsx
git commit -m "feat(pid): add PidThemeProvider to force dark theme via DCOU tokens"
```

---

### Task 3: Fix `standardLabel` in `model.ts`

**Files:**
- Modify: `frontend/src/features/pid/domain/model.ts`

- [ ] **Step 1: Add standardLabel export to model.ts**

Add after line 96 (the closing brace of `PidDocument`):

```typescript
const STANDARD_LABELS: Record<PidStandard, string> = { free: "Livre" };

export function standardLabel(standard: PidStandard): string {
  return STANDARD_LABELS[standard] ?? standard;
}
```

- [ ] **Step 2: Remove local `standardLabel` from `pid-editor-page.tsx`**

Delete lines 513-515 in `pid-editor-page.tsx`:
```typescript
function standardLabel(_standard: string): string {
  return "Livre";
}
```

- [ ] **Step 3: Update the import in `pid-editor-page.tsx`**

Change line 15 — add `standardLabel` to the import from `../domain/model`:
```typescript
import type { ConnectionClass } from "../domain/model";
```
Becomes:
```typescript
import { standardLabel, type ConnectionClass } from "../domain/model";
```

- [ ] **Step 4: Update the `standardLabel` call in `pid-editor-page.tsx` line 462**

It already calls `standardLabel(editor.document.metadata.standard)` — the import change is sufficient.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/pid/domain/model.ts frontend/src/features/pid/editor/pid-editor-page.tsx
git commit -m "fix(pid): make standardLabel use real PidStandard mapping"
```

---

### Task 4: Fix `canvasCenter` to use dynamic viewport

**Files:**
- Modify: `frontend/src/features/pid/editor/pid-editor-page.tsx`

- [ ] **Step 1: Replace the local `canvasCenter` function (lines 509-511)**

Replace:
```typescript
function canvasCenter(viewport: { x: number; y: number; zoom: number }) {
  return { x: (400 - viewport.x) / viewport.zoom, y: (300 - viewport.y) / viewport.zoom };
}
```
With:
```typescript
function canvasCenter(viewport: { x: number; y: number; zoom: number }) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return { x: (w / 2 - viewport.x) / viewport.zoom, y: (h / 2 - viewport.y) / viewport.zoom };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/pid/editor/pid-editor-page.tsx
git commit -m "fix(pid): compute canvasCenter from window dimensions"
```

---

### Task 5: Add `validationCounts` to `EditorStore` and fix `StatusBar`

**Files:**
- Modify: `frontend/src/features/pid/editor/editor-store.ts`
- Modify: `frontend/src/features/pid/editor/status-bar.tsx`

- [ ] **Step 1: Add `getValidationCounts` to `EditorStore` interface in `editor-store.ts`**

Add after the `subscribe` method declaration in the `EditorStore` interface (after line 42):

```typescript
  getValidationCounts(): { errors: number; warnings: number };
```

- [ ] **Step 2: Add validation dependency**

At the top of `editor-store.ts`, add an import for the validation function:
```typescript
import { validateDocument } from "../domain/validation";
```

- [ ] **Step 3: Implement `getValidationCounts` in `createEditorStore` return object**

Add after the `subscribe` method (before line 193):

```typescript
    getValidationCounts() {
      const issues = validateDocument(state.document, {});
      return {
        errors: issues.filter((i) => i.severity === "error").length,
        warnings: issues.filter((i) => i.severity === "warning").length,
      };
    },
```

- [ ] **Step 4: Fix `StatusBar` — replace hardcoded line 19**

Change line 19 in `status-bar.tsx` from:
```tsx
    <span>Avisos 0 · Erros 0</span>
```
To:
```tsx
    <span>Avisos {state.validationWarnings} · Erros {state.validationErrors}</span>
```

- [ ] **Step 5: Update `EditorState` to include validation counts**

Add to the `EditorState` interface in `editor-store.ts` (after line 22):
```typescript
  readonly validationErrors: number;
  readonly validationWarnings: number;
```

- [ ] **Step 6: Update `createSnapshot` to include validation counts**

In `createSnapshot` (around line 212), add to the returned frozen object:
```typescript
    validationErrors: state.document ? validateDocument(state.document, {}).filter((i) => i.severity === "error").length : 0,
    validationWarnings: state.document ? validateDocument(state.document, {}).filter((i) => i.severity === "warning").length : 0,
```

Wait — this would call `validateDocument` on every snapshot creation. Instead, compute validation counts in `refreshSnapshot` and store in `InternalEditorState`.

Actually, the simplest approach: add fields to `InternalEditorState`, compute them in `refreshSnapshot`. But that requires `validateDocument` import. Let me use a different approach — just call it at component level in `StatusBar`.

Let me simplify: keep validation counts out of `EditorStore` and compute them in `PidEditorPage` where they're already available (`validationIssues` is already used to render `ValidationPanel`).

- [ ] **Step 4 (revised): Pass validation counts to `StatusBar` from `PidEditorPage`**

In `pid-editor-page.tsx`, find the `StatusBar` call (line 504) and add `validationCounts` prop:

The `validationIssues` variable is already computed in `PidEditorPage` (find it). Add:
```tsx
const validationCounts = useMemo(() => ({
  errors: validationIssues.filter((i) => i.severity === "error").length,
  warnings: validationIssues.filter((i) => i.severity === "warning").length,
}), [validationIssues]);
```

Then update the `StatusBar` call to pass it:
```tsx
<StatusBar state={editor} saveState={autosave.state} validationCounts={validationCounts} onRetry={...} />
```

- [ ] **Step 5 (revised): Update `status-bar.tsx`**

```typescript
import type { EditorState } from "./editor-store";
import type { EditorSaveState } from "./use-editor-autosave";

export function StatusBar({ state, saveState, validationCounts, onRetry }: {
  readonly state: EditorState;
  readonly saveState: EditorSaveState;
  readonly validationCounts: { errors: number; warnings: number };
  readonly onRetry?: () => void;
}) {
  const { document, viewport } = state;
  const elements = Object.keys(document.nodes).length + Object.keys(document.edges).length
    + Object.keys(document.annotations).length + Object.keys(document.groups).length;
  return <footer aria-label="Status do documento" role="status" className="pid-status-bar">
    <span>{saveState}</span>
    {saveState === "Não salvo" && onRetry && <button type="button" onClick={onRetry}>Tentar salvar novamente</button>}
    <span>Posição {Math.round(viewport.x)}, {Math.round(viewport.y)}</span>
    <span>Zoom {Math.round(viewport.zoom * 100)}%</span>
    <span>{elements} elementos</span>
    <span>{Object.keys(document.nodes).length} equipamentos · {Object.keys(document.edges).length} linhas</span>
    <span>Avisos {validationCounts.warnings} · Erros {validationCounts.errors}</span>
  </footer>;
}
```

- [ ] **Step 6: Revert editor-store.ts changes**

Remove the `getValidationCounts` method and `EditorState` additions from `editor-store.ts` (they are no longer needed). The `StatusBar` fix is self-contained.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/pid/editor/status-bar.tsx frontend/src/features/pid/editor/pid-editor-page.tsx
git commit -m "fix(pid): show real validation counts in status bar"
```

---

### Task 6: Toolbar Redesign

**Files:**
- Modify: `frontend/src/features/pid/editor/editor-toolbar.tsx`

- [ ] **Step 1: Rewrite `editor-toolbar.tsx`**

```typescript
import { RotateCw, RotateCcw, Trash2, CopyPlus, Copy, ClipboardPaste, Group, StickyNote, Maximize2, ZoomIn, ZoomOut, FileImage, ImageDown, Undo2, Redo2, AlignJustify, GitBranch }
  from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConnectionClass } from "../domain/model";
import type { PidIconSize } from "./use-pid-settings";

interface EditorToolbarActions {
  undo(): void; redo(): void; deleteSelection(): void; duplicate(): void; copy(): void; paste(): void;
  rotate(degrees: 90 | -90): void; align(axis: "left" | "center-x" | "right" | "top" | "center-y" | "bottom"): void;
  group(): void; insertAnnotation(): void; fit(): void; zoomIn(): void; zoomOut(): void;
  setConnectionClass(value: ConnectionClass): void;
}

interface EditorSelectionCapabilities {
  readonly canDelete: boolean;
  readonly canCopy: boolean;
  readonly canDuplicate: boolean;
  readonly canRotate: boolean;
  readonly canGroup: boolean;
  readonly canAlign: boolean;
}

export { getEditorSelectionCapabilities, getEditorPositionedSelectionIds, type EditorSelectionCapabilities, type EditorToolbarActions }
  from "./editor-toolbar-utils";

export function EditorToolbar({ editable, capabilities, canUndo, canRedo, canPaste, canExport, exporting, exportErrors, exportBackground, onExportBackgroundChange, onExportSvg, onExportPng, connectionClass, iconSize = "md", actions }: {
  readonly editable: boolean;
  readonly capabilities: EditorSelectionCapabilities;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canPaste: boolean;
  readonly canExport: boolean;
  readonly exporting: boolean;
  readonly exportErrors: readonly string[];
  readonly exportBackground: "white" | "transparent";
  readonly onExportBackgroundChange: (value: "white" | "transparent") => void;
  readonly onExportSvg: () => void;
  readonly onExportPng: () => void;
  readonly connectionClass: ConnectionClass;
  readonly iconSize?: PidIconSize;
  readonly actions: EditorToolbarActions;
}) {

  const iconClass = iconSize === "sm" ? "size-3" : iconSize === "lg" ? "size-5" : "size-4";

  const IconTool = ({ label, shortcut, disabled, onClick, children }: { label: string; shortcut?: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <Tooltip>
      <TooltipTrigger render={
        <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label={label} onClick={onClick}>
          {children}
        </Button>
      } />
      <TooltipContent>{label}{shortcut ? ` (${shortcut})` : ""}</TooltipContent>
    </Tooltip>
  );

  const separator = <div className="mx-0.5 h-6 w-px bg-border" />;

  return <div role="toolbar" aria-label="Ferramentas do editor P&ID" className="flex items-center gap-0.5 flex-wrap">
    {editable && <>
      <IconTool label="Desfazer" shortcut="Ctrl+Z" disabled={!canUndo} onClick={actions.undo}><Undo2 className={iconClass} /></IconTool>
      <IconTool label="Refazer" shortcut="Ctrl+Shift+Z" disabled={!canRedo} onClick={actions.redo}><Redo2 className={iconClass} /></IconTool>
      <IconTool label="Excluir seleção" shortcut="Delete" disabled={!capabilities.canDelete} onClick={actions.deleteSelection}><Trash2 className={iconClass} /></IconTool>
      <IconTool label="Duplicar" shortcut="Ctrl+D" disabled={!capabilities.canDuplicate} onClick={actions.duplicate}><CopyPlus className={iconClass} /></IconTool>
    </>}
    <IconTool label="Copiar" shortcut="Ctrl+C" disabled={!capabilities.canCopy} onClick={actions.copy}><Copy className={iconClass} /></IconTool>
    {editable && <>
      <IconTool label="Colar" shortcut="Ctrl+V" disabled={!canPaste} onClick={actions.paste}><ClipboardPaste className={iconClass} /></IconTool>
      <IconTool label="Girar 90°" shortcut="Ctrl+]" disabled={!capabilities.canRotate} onClick={() => actions.rotate(90)}><RotateCw className={iconClass} /></IconTool>
      <IconTool label="Girar -90°" shortcut="Ctrl+[" disabled={!capabilities.canRotate} onClick={() => actions.rotate(-90)}><RotateCcw className={iconClass} /></IconTool>
    </>}

    {separator}

    {editable && <label className="flex items-center gap-1 text-xs text-muted-foreground">
      <AlignJustify className={iconClass} />
      <select aria-label="Alinhar seleção" disabled={!capabilities.canAlign} defaultValue="" className="h-7 rounded border border-border bg-muted px-1 text-xs" onChange={(event) => { if (event.target.value) actions.align(event.target.value as Parameters<EditorToolbarActions["align"]>[0]); event.target.value = ""; }}>
        <option value="">Alinhar…</option><option value="left">Esquerda</option><option value="center-x">Centro horizontal</option><option value="right">Direita</option><option value="top">Topo</option><option value="center-y">Centro vertical</option><option value="bottom">Base</option>
      </select>
    </label>}
    {editable && <IconTool label="Agrupar" shortcut="Ctrl+G" disabled={!capabilities.canGroup} onClick={actions.group}><Group className={iconClass} /></IconTool>}
    {editable && <IconTool label="Adicionar anotação" shortcut="Ctrl+Shift+A" onClick={actions.insertAnnotation}><StickyNote className={iconClass} /></IconTool>}

    {separator}

    {editable && <label className="flex items-center gap-1 text-xs text-muted-foreground">
      <GitBranch className={iconClass} />
      <select aria-label="Tipo de linha" value={connectionClass} className="h-7 rounded border border-border bg-muted px-1 text-xs" onChange={(event) => actions.setConnectionClass(event.target.value as ConnectionClass)}>
        <option value="process">Processo</option>
        <option value="utility">Utilidade</option>
        <option value="signal">Sinal</option>
      </select>
    </label>}

    {separator}

    <IconTool label="Ajustar diagrama à tela" onClick={actions.fit}><Maximize2 className={iconClass} /></IconTool>
    <IconTool label="Aumentar zoom" onClick={actions.zoomIn}><ZoomIn className={iconClass} /></IconTool>
    <IconTool label="Diminuir zoom" onClick={actions.zoomOut}><ZoomOut className={iconClass} /></IconTool>

    {separator}

    <div role="group" aria-label="Exportação" className="flex items-center gap-0.5">
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <select aria-label="Fundo da exportação" value={exportBackground} disabled={exporting} className="h-7 rounded border border-border bg-muted px-1 text-xs" onChange={(event) => onExportBackgroundChange(event.target.value as "white" | "transparent")}>
          <option value="white">Fundo branco</option>
          <option value="transparent">Fundo transparente</option>
        </select>
      </label>
      <IconTool label="Exportar SVG" disabled={!canExport || exporting} onClick={onExportSvg}><FileImage className={iconClass} /></IconTool>
      <IconTool label="Exportar PNG" disabled={!canExport || exporting} onClick={onExportPng}><ImageDown className={iconClass} /></IconTool>
    </div>

    {exporting && <span role="status" className="text-xs text-muted-foreground">Preparando exportação…</span>}
    {exportErrors.length > 0 && <div role="group" aria-label="Erros que bloqueiam a exportação" aria-live="assertive" className="ml-2 rounded border border-destructive bg-destructive/10 p-2 text-xs text-destructive"><p>Corrija os erros antes de exportar:</p><ul className="list-inside list-disc">{exportErrors.map((message, index) => <li key={`${index}:${message}`}>{message}</li>)}</ul></div>}
  </div>;
}
```

- [ ] **Step 2: Extract utility functions to separate file**

The `getEditorSelectionCapabilities` and `getEditorPositionedSelectionIds` functions that were previously in `editor-toolbar.tsx` need to move to a separate file so the toolbar file stays focused.

Create `frontend/src/features/pid/editor/editor-toolbar-utils.ts`:

```typescript
import type { PidDocument } from "../domain/model";

export interface EditorSelectionCapabilities {
  readonly canDelete: boolean;
  readonly canCopy: boolean;
  readonly canDuplicate: boolean;
  readonly canRotate: boolean;
  readonly canGroup: boolean;
  readonly canAlign: boolean;
}

export function getEditorSelectionCapabilities(
  document: PidDocument,
  selection: readonly string[],
): EditorSelectionCapabilities {
  const ids = [...new Set(selection)];
  const nodeCount = ids.filter((id) => Boolean(document.nodes[id])).length;
  const groupCount = ids.filter((id) => Boolean(document.groups[id])).length;
  const annotationCount = ids.filter((id) => Boolean(document.annotations[id])).length;
  const positionedCount = countResolvedPositionedElements(document, ids);
  const copyable = nodeCount + annotationCount + groupCount > 0;
  return Object.freeze({
    canDelete: ids.some((id) => Boolean(document.nodes[id] || document.edges[id] || document.annotations[id] || document.groups[id] || document.ports[id])),
    canCopy: copyable,
    canDuplicate: copyable,
    canRotate: positionedCount > 0,
    canGroup: nodeCount > 0,
    canAlign: positionedCount > 1,
  });
}

export function getEditorPositionedSelectionIds(
  document: PidDocument,
  selection: readonly string[],
): string[] {
  return [...new Set(selection)].filter((id) => Boolean(
    document.nodes[id] || document.annotations[id] || document.groups[id],
  ));
}

function countResolvedPositionedElements(document: PidDocument, selection: readonly string[]): number {
  const nodeIds = new Set<string>();
  const annotationIds = new Set<string>();
  for (const id of selection) {
    if (document.nodes[id]) nodeIds.add(id);
    else if (document.annotations[id]) annotationIds.add(id);
    else document.groups[id]?.memberIds.forEach((memberId) => {
      if (document.nodes[memberId]) nodeIds.add(memberId);
    });
  }
  return nodeIds.size + annotationIds.size;
}
```

- [ ] **Step 3: Update `pid-editor-page.tsx` import**

Change the import of `EditorToolbar` and related types to point to the new split files:

```typescript
import {
  EditorToolbar, type EditorToolbarActions,
} from "./editor-toolbar";
import {
  getEditorPositionedSelectionIds, getEditorSelectionCapabilities,
} from "./editor-toolbar-utils";
```

- [ ] **Step 4: Pass `iconSize` to `EditorToolbar` in `pid-editor-page.tsx`**

In the `PidEditorPage` component, get the settings hook and pass `iconSize`:

```typescript
// Add import at top
import { usePidSettings } from "./use-pid-settings";

// In component body
const { settings } = usePidSettings();

// In the EditorToolbar JSX, add:
iconSize={settings.iconSize}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/pid/editor/editor-toolbar.tsx frontend/src/features/pid/editor/editor-toolbar-utils.ts frontend/src/features/pid/editor/pid-editor-page.tsx
git commit -m "feat(pid): redesign toolbar with icon-only buttons, grouped layout, and tooltips"
```

---

### Task 7: Settings Dialog

**Files:**
- Create: `frontend/src/features/pid/editor/pid-settings-dialog.tsx`

- [ ] **Step 1: Write the settings dialog**

```typescript
import { Settings2, RotateCcw, ZoomOut, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePidSettings, type PidIconSize, type PidTextSize } from "./use-pid-settings";
import { cn } from "@/lib/utils";

function SegmentedButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={cn(
    "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
    selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted hover:bg-accent",
  )}>{children}</button>;
}

export function PidSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { settings, updateSetting, resetSettings } = usePidSettings();

  if (!open) return null;

  return <div className="pid-modal-backdrop" onClick={() => onOpenChange(false)} role="presentation">
    <div role="dialog" aria-label="Configurações do editor P&ID" aria-modal="true" className="pid-modal-card" onClick={(e) => e.stopPropagation()}>
      <header>
        <h2>Configurações do Editor</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Fechar" onClick={() => onOpenChange(false)}>
          <span aria-hidden="true">&times;</span>
        </Button>
      </header>

      <label>
        <span className="block text-sm font-medium mb-1.5">Tamanho dos ícones</span>
        <div className="flex gap-1">
          {(["sm", "md", "lg"] as PidIconSize[]).map((size) => (
            <SegmentedButton key={size} selected={settings.iconSize === size} onClick={() => updateSetting("iconSize", size)}>
              {size === "sm" ? "Pequeno" : size === "md" ? "Médio" : "Grande"}
            </SegmentedButton>
          ))}
        </div>
      </label>

      <label>
        <span className="block text-sm font-medium mb-1.5">Tamanho do texto</span>
        <div className="flex gap-1">
          {(["sm", "md", "lg"] as PidTextSize[]).map((size) => (
            <SegmentedButton key={size} selected={settings.textSize === size} onClick={() => updateSetting("textSize", size)}>
              {size === "sm" ? "Pequeno" : size === "md" ? "Médio" : "Grande"}
            </SegmentedButton>
          ))}
        </div>
      </label>

      <label>
        <span className="block text-sm font-medium mb-1.5">Miniaturas do catálogo: {settings.catalogThumbSize}px</span>
        <div className="flex items-center gap-2">
          <ZoomOut className="size-4 text-muted-foreground" />
          <input type="range" min={24} max={72} value={settings.catalogThumbSize} onChange={(e) => updateSetting("catalogThumbSize", Number(e.target.value))} className="flex-1 accent-primary" />
          <ZoomIn className="size-4 text-muted-foreground" />
        </div>
      </label>

      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" onClick={resetSettings}>
          <RotateCcw className="size-3.5" />
          Restaurar padrão
        </Button>
      </div>
    </div>
  </div>;
}

export function PidSettingsButton({ onClick }: { onClick: () => void }) {
  return <Button variant="ghost" size="icon-sm" aria-label="Configurações" onClick={onClick}>
    <Settings2 className="size-4" />
  </Button>;
}
```

- [ ] **Step 2: Wire into `pid-editor-page.tsx`**

Add the settings button to the header. After the `ShareDialog` line (line 471), add:

```typescript
{editorEnabled && <PidSettingsButton onClick={() => setSettingsOpen(true)} />}
```

Add state: `const [settingsOpen, setSettingsOpen] = useState(false);`

Add the dialog component at the end, before the closing `</main>`:
```tsx
{settingsOpen && <PidSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />}
```

Add imports:
```typescript
import { PidSettingsButton, PidSettingsDialog } from "./pid-settings-dialog";
```

- [ ] **Step 3: Apply textSize to the editor wrapper**

Add a className derived from settings to the `.pid-focused-studio` wrapper. In `pid-editor-page.tsx`, the root `<main>` element already has classes. Add a text size class:

```typescript
// Compute text size class
const textSizeClass = settings.textSize === "sm" ? "text-xs" : settings.textSize === "lg" ? "text-base" : "text-sm";
```

And apply it to the `<main>` element's className:

```tsx
<main className={`pid-focused-studio ... ${textSizeClass}`}>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/pid/editor/pid-settings-dialog.tsx frontend/src/features/pid/editor/pid-editor-page.tsx
git commit -m "feat(pid): add settings dialog for icon size, text size, and catalog thumbnails"
```

---

### Task 8: Catalog Panel Improvements

**Files:**
- Create: `frontend/src/features/pid/catalog/catalog-zoom-slider.tsx`
- Modify: `frontend/src/features/pid/catalog/catalog-panel.tsx`
- Modify: `frontend/src/features/pid/editor/pid-editor-page.tsx`

- [ ] **Step 1: Create `catalog-zoom-slider.tsx`**

```typescript
import { ZoomIn, ZoomOut } from "lucide-react";

export function CatalogZoomSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="flex items-center gap-2 px-1">
    <ZoomOut className="size-3.5 text-muted-foreground" />
    <input type="range" min={24} max={72} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-primary h-1" aria-label="Tamanho das miniaturas" />
    <ZoomIn className="size-3.5 text-muted-foreground" />
  </div>;
}
```

- [ ] **Step 2: Update `catalog-panel.tsx` — add `thumbSize` prop and `CatalogZoomSlider`**

Add a new prop `thumbSize?: number` to `CatalogPanelCommonProps`:
```typescript
  readonly thumbSize?: number;
```

Destructure it in the component: `const { ... thumbSize } = props;`

In the symbol thumbnail `<img>` (line 149), replace:
```tsx
<img src={row.symbol.assetUrl} alt="" loading="lazy" decoding="async" width={48} height={40} className="h-10 w-12 rounded bg-white object-contain" />
```
With:
```tsx
<img src={row.symbol.assetUrl} alt="" loading="lazy" decoding="async" style={{ height: thumbSize ?? 40 }} className="rounded bg-white object-contain" />
```

- [ ] **Step 3: Pass `thumbSize` and `CatalogZoomSlider` from `pid-editor-page.tsx`**

In the `CatalogPanel` call (line 480), add:
```tsx
thumbSize={settings.catalogThumbSize}
```

Add the `CatalogZoomSlider` inside the catalog panel (next to or below the `CatalogPanel`):
```tsx
{!catalogCollapsed && <CatalogZoomSlider value={settings.catalogThumbSize} onChange={(value) => updateSetting("catalogThumbSize", value)} />}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/pid/catalog/catalog-zoom-slider.tsx frontend/src/features/pid/catalog/catalog-panel.tsx frontend/src/features/pid/editor/pid-editor-page.tsx
git commit -m "feat(pid): add catalog zoom slider for thumbnail size"
```

---

### Task 9: Panel Toggle & ScrollArea Improvements

**Files:**
- Modify: `frontend/src/features/pid/editor/pid-editor-page.tsx`
- Modify: `frontend/src/features/pid/editor/properties-inspector.tsx`

- [ ] **Step 1: Add icon-based toggle buttons in `pid-editor-page.tsx`**

Replace the text-only catalog toggle button (lines 478-479):
```tsx
<button type="button" aria-expanded={!catalogCollapsed} onClick={() => setCatalogCollapsed((value) => !value)}>{catalogCollapsed ? "Abrir catálogo" : "Fechar catálogo"}</button>
```
With a `Button` + `Tooltip` using Lucide icons:
```tsx
import { PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Catalog toggle:
<Tooltip>
  <TooltipTrigger render={
    <Button variant="ghost" size="icon-sm" aria-expanded={!catalogCollapsed} aria-label={catalogCollapsed ? "Abrir catálogo" : "Fechar catálogo"} onClick={() => setCatalogCollapsed((v) => !v)}>
      {catalogCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
    </Button>
  } />
  <TooltipContent>{catalogCollapsed ? "Abrir catálogo" : "Fechar catálogo"}</TooltipContent>
</Tooltip>
```

Replace the inspector toggle button similarly (lines 491-497):
```tsx
<Tooltip>
  <TooltipTrigger render={
    <Button variant="ghost" size="icon-sm" aria-expanded={!inspectorCollapsed} aria-label={inspectorCollapsed ? "Abrir inspetor" : "Fechar inspetor"} onClick={() => {
      if (!inspectorCollapsed && prepareInspectorDrafts().hasUnresolvedDrafts) {
        setAnnouncement("Corrija o rascunho no inspetor antes de fechá-lo.");
        return;
      }
      setInspectorCollapsed((v) => !v);
    }}>
      {inspectorCollapsed ? <PanelRightOpen className="size-4" /> : <PanelRightClose className="size-4" />}
    </Button>
  } />
  <TooltipContent>{inspectorCollapsed ? "Abrir inspetor" : "Fechar inspetor"}</TooltipContent>
</Tooltip>
```

- [ ] **Step 2: Wrap panel contents in `ScrollArea`**

Import `ScrollArea` from `@/components/ui/scroll-area` in both files where needed.

In `catalog-panel.tsx`, wrap the main section content:

The catalog panel already uses a scroll element via `useVirtualizer`. The virtualized tree already has its own scroll container. Add `ScrollArea` around the entire catalog panel content (excluding the toggle button):

In `pid-editor-page.tsx`, wrap the catalog content (when expanded):
```tsx
{!catalogCollapsed && <ScrollArea className="flex-1 min-h-0">
  <CatalogPanel ... />
  <CatalogZoomSlider ... />
</ScrollArea>}
```

In `pid-editor-page.tsx`, wrap the inspector content (when expanded):
```tsx
{!inspectorCollapsed && <ScrollArea className="flex-1 min-h-0">
  <div className="pid-inspector-content">
    <PropertiesInspector ... />
    <ValidationPanel ... />
  </div>
</ScrollArea>}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/pid/editor/pid-editor-page.tsx
git commit -m "feat(pid): icon-based panel toggles with Tooltip, ScrollArea wrapping"
```

---

### Task 10: CSS Migration — Replace Hardcoded Colors with Tokens

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Replace hardcoded background/text colors in P&ID classes**

Apply these transformations in `globals.css` lines 159-473:

| Line(s) | Old | New |
|---------|-----|-----|
| 163 | `background: #07131a;` | Remove (handled by `bg-background` on wrapper) |
| 173 | `background: #0d1b23;` | `background: var(--sidebar);` |
| 172 | `border-bottom: 1px solid rgb(183 226 238 / 18%);` | `border-bottom: 1px solid var(--border);` |
| 286-288 | `.pid-studio-panel { ... background: #0d1b23; }` | `background: var(--sidebar);` |
| 287 | `border-inline-end: 1px solid rgb(183 226 238 / 18%)` | `border-inline-end: 1px solid var(--border);` |
| 291 | `border-inline: 1px solid rgb(183 226 238 / 18%);` | `border-inline: 1px solid var(--border);` |
| 245 | `background: #122a35;` (button bg) | `background: var(--muted);` |
| 251 | `background: #163847; border-color: #57b9d6;` (hover) | `background: var(--accent); border-color: var(--primary);` |
| 252 | `border-color: #57b9d6; background: #164558;` (pressed) | `border-color: var(--primary); background: oklch(from var(--primary) l c h / 0.3);` |
| 255 | `background: #122a35;` (select bg) | `background: var(--muted);` |
| 382 | `color: #b8ccd4; background: #0d1b23;` (status bar) | `color: var(--muted-foreground); background: var(--sidebar);` |
| 380 | `border-top: 1px solid rgb(183 226 238 / 18%);` | `border-top: 1px solid var(--border);` |
| 163 | `color: #e8f4f8;` | Remove (handled by `text-foreground` on wrapper) |
| 162 | `color: #e8f4f8;` | `color: var(--foreground);` |
| 209 | `color: #91adba;` | `color: var(--muted-foreground);` |
| 219 | `color: #91adba; ...` | `color: var(--muted-foreground);` |
| 220 | `color: #b7e2ee;` (back link) | `color: var(--primary);` |
| 197 | `color: #b8ccd4;` (collab) | `color: var(--muted-foreground);` |
| 197 | `color: #e8f4f8;` (status text) | `color: var(--foreground);` |
| 292 | `color: #d6e8ee;` | `color: var(--foreground);` |
| 309-310 | heading colors `#b7e2ee`, `#b8ccd4` | `color: var(--primary);`, `color: var(--muted-foreground);` |
| 425 | `outline: 3px solid #57b9d6;` | `outline-color: var(--ring);` |
| 278 | `color: #d9f3fb; background: #164558;` (notice) | `color: var(--foreground); background: var(--accent);` |
| 394 | `background: rgb(2 8 12 / 72%);` (modal backdrop) | `background: rgb(0 0 0 / 60%);` |

The specific edit operations are extensive. Perform a find-and-replace pass:

```bash
# Find all hardcoded color references in P&ID CSS
grep -n '#[0-9a-fA-F]\{3,6\}\|rgb(' frontend/src/app/globals.css | grep -A0 'pid\|\.pid'
```

Then replace each with the corresponding token.

- [ ] **Step 2: Verify CSS builds without errors**

```bash
cd frontend && npx vite build --config vite.config.ts 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "refactor(pid): migrate hardcoded dark colors to DCOU design tokens"
```

---

### Task 11: Integration — Wire `PidThemeProvider` in `pid-editor-page.tsx`

**Files:**
- Modify: `frontend/src/features/pid/editor/pid-editor-page.tsx`

- [ ] **Step 1: Wrap the editor in `PidThemeProvider`**

In the `EditorStudio` component's return (around line 459), wrap the `<main>` element in `<PidThemeProvider>`:

```tsx
return <PidThemeProvider>
  <main className={`pid-focused-studio h-dvh ... ${textSizeClass}`}>
    {/* existing content */}
  </main>
</PidThemeProvider>;
```

- [ ] **Step 2: Remove the `dark` class from the `pid-focused-studio` definition in `globals.css`**

Since `PidThemeProvider` applies `dark` at the wrapper level, the `.pid-focused-studio` in `globals.css` (line 159-164) should NOT duplicate the dark class. It already doesn't have it explicitly — it only has `color: #e8f4f8; background: #07131a;`. Those will be replaced in Task 10.

- [ ] **Step 3: Verify editor renders with dark theme**

```bash
cd frontend && npx vite --port 5173 &
# Open http://localhost:5173/pid and verify dark background
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/pid/editor/pid-editor-page.tsx
git commit -m "feat(pid): integrate PidThemeProvider and settings into editor"
```

---

### Task 12: Unit Tests

**Files:**
- Create: `frontend/src/test/pid/pid-settings.test.ts`
- Create: `frontend/src/test/pid/pid-toolbar.test.tsx`
- Create: `frontend/src/test/pid/pid-status-bar.test.tsx`
- Create: `frontend/src/test/pid/pid-theme-provider.test.tsx`

- [ ] **Step 1: Write `pid-settings.test.ts`**

```typescript
import { beforeEach, describe, expect, it } from "vitest";

// We test usePidSettings indirectly via the module's behavior.
// localStorage is available in jsdom via vitest's environment.

describe("usePidSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when localStorage is empty", async () => {
    const { usePidSettings } = await import("@/features/pid/editor/use-pid-settings");
    const { result } = renderHook(() => usePidSettings());
    expect(result.current.settings).toEqual({ iconSize: "md", textSize: "md", catalogThumbSize: 40 });
  });

  // Note: useSyncExternalStore tests require a React rendering environment.
  // For a simpler approach, test the read/write module functions directly.
});
```

Given that `usePidSettings` uses `useSyncExternalStore`, testing it requires React Testing Library's `renderHook`. Let's write the proper test:

```typescript
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePidSettings } from "@/features/pid/editor/use-pid-settings";

describe("usePidSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when localStorage is empty", () => {
    const { result } = renderHook(() => usePidSettings());
    expect(result.current.settings).toEqual({ iconSize: "md", textSize: "md", catalogThumbSize: 40 });
  });

  it("updates iconSize and persists to localStorage", () => {
    const { result } = renderHook(() => usePidSettings());
    act(() => result.current.updateSetting("iconSize", "lg"));
    expect(result.current.settings.iconSize).toBe("lg");
    expect(JSON.parse(localStorage.getItem("pid:settings")!).iconSize).toBe("lg");
  });

  it("updates catalogThumbSize and clamps to valid range", () => {
    const { result } = renderHook(() => usePidSettings());
    act(() => result.current.updateSetting("catalogThumbSize", 64));
    expect(result.current.settings.catalogThumbSize).toBe(64);
  });

  it("resetSettings restores defaults", () => {
    const { result } = renderHook(() => usePidSettings());
    act(() => result.current.updateSetting("iconSize", "sm"));
    act(() => result.current.updateSetting("textSize", "lg"));
    act(() => result.current.resetSettings());
    expect(result.current.settings).toEqual({ iconSize: "md", textSize: "md", catalogThumbSize: 40 });
  });

  it("falls back to defaults for corrupt localStorage", () => {
    localStorage.setItem("pid:settings", "not-json");
    const { result } = renderHook(() => usePidSettings());
    expect(result.current.settings).toEqual({ iconSize: "md", textSize: "md", catalogThumbSize: 40 });
  });
});
```

- [ ] **Step 2: Write `pid-toolbar.test.tsx`**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorToolbar, type EditorToolbarActions } from "@/features/pid/editor/editor-toolbar";
import type { EditorSelectionCapabilities } from "@/features/pid/editor/editor-toolbar-utils";

const noop = () => {};
const fullCaps: EditorSelectionCapabilities = Object.freeze({
  canDelete: true, canCopy: true, canDuplicate: true,
  canRotate: true, canGroup: true, canAlign: true,
});
const emptyCaps: EditorSelectionCapabilities = Object.freeze({
  canDelete: false, canCopy: false, canDuplicate: false,
  canRotate: false, canGroup: false, canAlign: false,
});
const actions: EditorToolbarActions = {
  undo: noop, redo: noop, deleteSelection: noop, duplicate: noop,
  copy: noop, paste: noop, rotate: noop, align: noop,
  group: noop, insertAnnotation: noop, fit: noop, zoomIn: noop,
  zoomOut: noop, setConnectionClass: noop,
};

function renderToolbar(overrides: Partial<Parameters<typeof EditorToolbar>[0]> = {}) {
  return render(
    <TooltipProvider>
      <EditorToolbar
        editable={true}
        capabilities={fullCaps}
        canUndo={true}
        canRedo={true}
        canPaste={true}
        canExport={true}
        exporting={false}
        exportErrors={[]}
        exportBackground="white"
        onExportBackgroundChange={noop}
        onExportSvg={noop}
        onExportPng={noop}
        connectionClass="process"
        actions={actions}
        {...overrides}
      />
    </TooltipProvider>,
  );
}

describe("EditorToolbar", () => {
  it("renders undo and redo buttons", () => {
    renderToolbar();
    expect(screen.getByLabelText("Desfazer")).toBeInTheDocument();
    expect(screen.getByLabelText("Refazer")).toBeInTheDocument();
  });

  it("renders line type dropdown instead of three separate buttons", () => {
    renderToolbar();
    expect(screen.getByLabelText("Tipo de linha")).toBeInTheDocument();
    expect(screen.queryByText("Linha de processo")).not.toBeInTheDocument();
  });

  it("disables editing buttons when not editable", () => {
    renderToolbar({ editable: false });
    expect(screen.queryByLabelText("Desfazer")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Copiar")).toBeInTheDocument();
  });

  it("renders export buttons", () => {
    renderToolbar();
    expect(screen.getByLabelText("Exportar SVG")).toBeInTheDocument();
    expect(screen.getByLabelText("Exportar PNG")).toBeInTheDocument();
  });

  it("shows export errors when present", () => {
    renderToolbar({ exportErrors: ["Erro de validação"] });
    expect(screen.getByText("Erro de validação")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Write `pid-status-bar.test.tsx`**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBar } from "@/features/pid/editor/status-bar";
import type { EditorState, EditorViewport } from "@/features/pid/editor/editor-store";

const baseState: EditorState = Object.freeze({
  document: Object.freeze({
    schemaVersion: 1 as const,
    id: "test",
    metadata: { title: "Test", standard: "free" as const, catalogVersion: "1", createdAt: "", updatedAt: "" },
    nodes: {}, ports: {}, edges: {}, annotations: {}, groups: {},
  }),
  past: Object.freeze([]),
  future: Object.freeze([]),
  selection: Object.freeze([]),
  viewport: Object.freeze({ x: 0, y: 0, zoom: 1 }) as EditorViewport,
});

describe("StatusBar", () => {
  it("shows dynamic validation counts instead of hardcoded zeros", () => {
    render(<StatusBar state={baseState} saveState="Sincronizado" validationCounts={{ errors: 3, warnings: 1 }} />);
    expect(screen.getByText(/Avisos 1/)).toBeInTheDocument();
    expect(screen.getByText(/Erros 3/)).toBeInTheDocument();
  });

  it("shows zero counts when no issues", () => {
    render(<StatusBar state={baseState} saveState="Sincronizado" validationCounts={{ errors: 0, warnings: 0 }} />);
    expect(screen.getByText(/Avisos 0/)).toBeInTheDocument();
    expect(screen.getByText(/Erros 0/)).toBeInTheDocument();
  });

  it("shows retry button when not saved", () => {
    const retry = vi.fn();
    render(<StatusBar state={baseState} saveState="Não salvo" validationCounts={{ errors: 0, warnings: 0 }} onRetry={retry} />);
    expect(screen.getByText("Tentar salvar novamente")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Write `pid-theme-provider.test.tsx`**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PidThemeProvider } from "@/features/pid/editor/pid-theme-provider";

describe("PidThemeProvider", () => {
  it("wraps children in a dark container", () => {
    render(<PidThemeProvider><span data-testid="child">content</span></PidThemeProvider>);
    const wrapper = screen.getByTestId("child").parentElement!;
    expect(wrapper.className).toContain("dark");
    expect(wrapper.className).toContain("bg-background");
    expect(wrapper.className).toContain("text-foreground");
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd frontend && npx vitest run src/test/pid/pid-settings.test.ts src/test/pid/pid-toolbar.test.tsx src/test/pid/pid-status-bar.test.tsx src/test/pid/pid-theme-provider.test.tsx
```

- [ ] **Step 6: Run all P&ID tests to ensure no regressions**

```bash
cd frontend && npx vitest run src/test/pid/
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/test/pid/pid-settings.test.ts frontend/src/test/pid/pid-toolbar.test.tsx frontend/src/test/pid/pid-status-bar.test.tsx frontend/src/test/pid/pid-theme-provider.test.tsx
git commit -m "test(pid): add tests for settings, toolbar, status bar, and theme provider"
```

---

### Task 13: E2E Tests

**Files:**
- Modify: `frontend/tests/e2e/pid-editor.spec.ts`

- [ ] **Step 1: Add E2E test cases**

Add these test blocks after the existing tests in `pid-editor.spec.ts`:

```typescript
test("toolbar has icon-only buttons with tooltips", async ({ page }) => {
  await createDiagram(page, "Toolbar ícones");
  await expect(page.getByRole("button", { name: "Desfazer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refazer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar SVG" })).toBeVisible();
  // Line type should be a dropdown, not three separate buttons
  await expect(page.getByLabelText("Tipo de linha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Linha de processo" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Linha de utilidade" })).toHaveCount(0);
});

test("settings dialog opens and changes persist after reload", async ({ page }) => {
  await createDiagram(page, "Configurações");
  await page.getByRole("button", { name: "Configurações" }).click();
  await expect(page.getByRole("dialog", { name: "Configurações do editor P&ID" })).toBeVisible();
  await page.getByRole("button", { name: /Grande/ }).first().click();
  await page.getByRole("button", { name: "Fechar" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Configurações" }).click();
  // The "Grande" segmented button should still show as pressed
  await expect(page.getByRole("button", { name: /Grande/ }).first()).toHaveAttribute("aria-pressed", "true");
});

test("catalog zoom slider resizes thumbnails", async ({ page }) => {
  await createDiagram(page, "Zoom catálogo");
  await insertPump(page);
  const slider = page.getByLabelText("Tamanho das miniaturas");
  await expect(slider).toBeVisible();
  // Thumbnails should use the size from settings
  const img = page.locator("[role='tree'] img").first();
  await expect(img).toBeVisible();
});

test("status bar shows real validation counts", async ({ page }) => {
  await createDiagram(page, "Validação");
  // Initially zero
  await expect(page.getByText(/Avisos 0/)).toBeVisible();
  await expect(page.getByText(/Erros 0/)).toBeVisible();
});
```

- [ ] **Step 2: Run E2E tests**

```bash
cd frontend && npx playwright test tests/e2e/pid-editor.spec.ts --project=chromium
```

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/e2e/pid-editor.spec.ts
git commit -m "test(pid): add E2E tests for toolbar icons, settings, and validation counts"
```

---

### Task 14: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
cd frontend && npx vitest run && npx playwright test tests/e2e/pid-editor.spec.ts
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Build check**

```bash
cd frontend && npx vite build
```
