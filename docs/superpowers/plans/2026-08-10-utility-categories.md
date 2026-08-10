# Utility Line Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to create colored utility categories (name + color) and assign them to P&ID edges with `connectionClass === "utility"`, rendering with the category's color on canvas and SVG export.

**Architecture:** Categories live in `PidDocument.metadata.utilityCategories[]`. Edges reference them via optional `utilityCategoryId`. Two new commands (`utility.addCategory`, `utility.removeCategory`). UI panel in toolbar for CRUD, dropdown in properties inspector for assignment. `process-edge.tsx` renders color via inline `style`.

**Tech Stack:** TypeScript, React, Zod, Tailwind, ReactFlow.

---

### Task 1: Data model — types, schemas, and color palette

**Files:**
- Modify: `frontend/src/features/pid/domain/model.ts`
- Modify: `frontend/src/features/pid/domain/schema.ts`
- Create: `frontend/src/features/pid/domain/utility-category.ts`

- [ ] **Step 1: Create utility category types and palette**

Create `frontend/src/features/pid/domain/utility-category.ts`:

```typescript
export interface UtilityCategory {
  id: string;
  name: string;
  color: string;
}

export const UTILITY_COLOR_PALETTE: Record<string, string> = {
  red: "#ef4444", orange: "#f97316", amber: "#f59e0b", yellow: "#eab308",
  lime: "#84cc16", green: "#22c55e", emerald: "#10b981", teal: "#14b8a6",
  cyan: "#06b6d4", blue: "#3b82f6", indigo: "#6366f1", violet: "#8b5cf6",
  purple: "#a855f7", fuchsia: "#d946ef", pink: "#ec4899", slate: "#64748b",
};
```

- [ ] **Step 2: Add utilityCategoryId to PidEdge and utilityCategories to metadata**

In `model.ts`, add to `PidEdge` interface after `connectionClass`:

```typescript
utilityCategoryId?: string;
```

Add to the metadata type in `PidDocument` (extract the metadata inline type or create a named type):

```typescript
export interface PidDocumentMetadata {
  title: string;
  standard: PidStandard;
  catalogVersion: string;
  createdAt: string;
  updatedAt: string;
  utilityCategories: UtilityCategory[];
}
```

- [ ] **Step 3: Update Zod schemas in schema.ts**

Add import at top of `schema.ts`:
```typescript
import { UTILITY_COLOR_PALETTE, type UtilityCategory } from "./utility-category";
```

Add `utilityCategorySchema`:
```typescript
const utilityCategorySchema: z.ZodType<UtilityCategory> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
}).strict();
```

Add `utilityCategories` to the metadata schema inside `pidDocumentSchema` (find the metadata object in the schema). Add `utilityCategoryId` to `pidEdgeSchema`:
```typescript
utilityCategoryId: z.string().uuid().optional(),
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/pid/domain/utility-category.ts frontend/src/features/pid/domain/model.ts frontend/src/features/pid/domain/schema.ts
git commit -m "feat: add UtilityCategory type, color palette, and extend PidEdge/PidDocument schemas"
```

---

### Task 2: Commands — addCategory, removeCategory, safePatchFields

**Files:**
- Modify: `frontend/src/features/pid/domain/command-reducers.ts`
- Modify: `frontend/src/features/pid/domain/commands.ts`

- [ ] **Step 1: Add command types to command-contract.ts**

Read `frontend/src/features/pid/domain/command-contract.ts` first to find the `PidCommand` union type. Add:

```typescript
export interface AddUtilityCategoryCommand {
  type: "utility.addCategory";
  name: string;
  color: string;
}

export interface RemoveUtilityCategoryCommand {
  type: "utility.removeCategory";
  categoryId: string;
}
```

Add them to the `PidCommand` union.

- [ ] **Step 2: Add command factory functions to commands.ts**

```typescript
export function addUtilityCategory(name: string, color: string): AddUtilityCategoryCommand {
  return { type: "utility.addCategory", name, color };
}

export function removeUtilityCategory(categoryId: string): RemoveUtilityCategoryCommand {
  return { type: "utility.removeCategory", categoryId };
}
```

- [ ] **Step 3: Add reducers in command-reducers.ts**

Add to `safePatchFields.edge`:
```typescript
edge: new Set(["route", "tag", "label", "properties", "utilityCategoryId"]),
```

In the `reduceCommand` switch, add cases. Follow the existing pattern for mutation (immutable copy + return):

```typescript
case "utility.addCategory": {
  const hexColor = UTILITY_COLOR_PALETTE[cmd.color] ?? UTILITY_COLOR_PALETTE.slate;
  const category: UtilityCategory = {
    id: crypto.randomUUID(),
    name: cmd.name,
    color: hexColor,
  };
  return {
    ...document,
    metadata: {
      ...document.metadata,
      utilityCategories: [...document.metadata.utilityCategories, category],
    },
  };
}
case "utility.removeCategory": {
  const newEdges: Record<string, PidEdge> = {};
  for (const [id, edge] of Object.entries(document.edges)) {
    if (edge.utilityCategoryId === cmd.categoryId) {
      newEdges[id] = { ...edge, utilityCategoryId: undefined };
    } else {
      newEdges[id] = edge;
    }
  }
  return {
    ...document,
    metadata: {
      ...document.metadata,
      utilityCategories: document.metadata.utilityCategories.filter(c => c.id !== cmd.categoryId),
    },
    edges: newEdges,
  };
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/pid/domain/command-contract.ts frontend/src/features/pid/domain/commands.ts frontend/src/features/pid/domain/command-reducers.ts
git commit -m "feat: add utility category commands and safePatchFields edge update"
```

---

### Task 3: Invariants for utilityCategoryId

**Files:**
- Modify: `frontend/src/features/pid/domain/invariants.ts`

- [ ] **Step 1: Add utility category validation**

In `invariants.ts`, after the connection class validation (around line 272), add:

```typescript
// utilityCategoryId is only valid for utility edges
if (edge.utilityCategoryId && edge.connectionClass !== "utility") {
  issues.push(invariantIssue(
    "utility.category",
    "warning",
    ["edges", edgeId],
    "Categoria de utilidade definida para aresta que não é de utilidade.",
  ));
}

// Referenced category must exist
if (edge.utilityCategoryId &&
    !document.metadata.utilityCategories.some(c => c.id === edge.utilityCategoryId)) {
  issues.push(invariantIssue(
    "utility.category",
    "warning",
    ["edges", edgeId],
    "Categoria de utilidade referenciada não existe no documento.",
  ));
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/pid/domain/invariants.ts
git commit -m "feat: add utility category validation invariants"
```

---

### Task 4: Rendering — color by category on canvas and SVG export

**Files:**
- Modify: `frontend/src/features/pid/canvas/process-edge.tsx`
- Modify: `frontend/src/features/pid/export/render-svg.ts`

- [ ] **Step 1: Update process-edge.tsx for color rendering**

Read `process-edge.tsx` to understand the current rendering. Add color logic.

In the component, after extracting `processEdge`, compute the category color:

```typescript
const categoryColor = processEdge.connectionClass === "utility" && processEdge.utilityCategoryId
  ? document.metadata.utilityCategories.find(c => c.id === processEdge.utilityCategoryId)?.color
  : undefined;
```

Wait — the edge component receives a `PidEdge` but not the full `PidDocument`. We need to pass `utilityCategories` through the data. Update `ProcessEdgeData` to include:

```typescript
export type ProcessEdgeData = Record<string, unknown> & {
  readonly processEdge: PidEdge;
  readonly route: readonly Point[];
  readonly editable: boolean;
  readonly utilityCategories?: UtilityCategory[];
};
```

Then in the component, compute:
```typescript
const { processEdge, utilityCategories } = props.data;
const categoryColor = processEdge.connectionClass === "utility" && processEdge.utilityCategoryId
  ? utilityCategories?.find(c => c.id === processEdge.utilityCategoryId)?.color
  : undefined;
```

On the BaseEdge, add inline style:
```tsx
<BaseEdge
  id={props.id}
  path={path}
  markerEnd={props.markerEnd}
  interactionWidth={24}
  style={categoryColor ? { stroke: categoryColor, strokeWidth: lineStyleAttrs.strokeWidth } : { strokeWidth: lineStyleAttrs.strokeWidth }}
  className={props.selected ? "stroke-blue-600" : !categoryColor ? "stroke-slate-600" : ""}
  ...
/>
```

Also the SVG path element (if rendered separately). Read the actual code carefully and apply the color to the correct element — BaseEdge or the custom path.

- [ ] **Step 2: Update the data provider to pass utilityCategories**

Find where ProcessEdge data is constructed (likely in `pid-canvas.tsx` or a projection file). Add `utilityCategories` from the document. Search for `ProcessEdgeData` or where edges are passed to ReactFlow.

Read the file, find the edge data construction, and add:
```typescript
utilityCategories: document.metadata.utilityCategories,
```

- [ ] **Step 3: Update render-svg.ts for SVG export**

In `render-svg.ts`, the `renderEdge` function needs access to `utilityCategories`. Find how the document is passed to the render functions and add the lookup:

```typescript
const category = document.metadata.utilityCategories.find(c => c.id === edge.utilityCategoryId);
const strokeColor = category?.color ?? attrs.stroke;
```

Use `strokeColor` instead of `attrs.stroke` in the path element.

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/pid/canvas/process-edge.tsx frontend/src/features/pid/export/render-svg.ts
git commit -m "feat: render utility edges with category color on canvas and SVG"
```

---

### Task 5: UI — UtilityCategoriesPanel in toolbar

**Files:**
- Create: `frontend/src/features/pid/editor/utility-categories-panel.tsx`
- Modify: `frontend/src/features/pid/editor/editor-toolbar.tsx`

- [ ] **Step 1: Create the utility categories panel**

Create `frontend/src/features/pid/editor/utility-categories-panel.tsx`:

```tsx
import { useState } from "react";
import { Palette, Plus, X } from "lucide-react";
import { UTILITY_COLOR_PALETTE } from "../domain/utility-category";
import type { UtilityCategory } from "../domain/utility-category";
import type { PidCommand } from "../domain/command-contract";
import { addUtilityCategory, removeUtilityCategory } from "../domain/commands";

interface Props {
  categories: readonly UtilityCategory[];
  onCommand: (cmd: PidCommand) => void;
  editable: boolean;
}

export function UtilityCategoriesPanel({ categories, onCommand, editable }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");

  const handleAdd = () => {
    if (!name.trim()) return;
    onCommand(addUtilityCategory(name.trim(), selectedColor));
    setName("");
    setAdding(false);
  };

  const edgeCountByCategory = /* optional: count edges using each category */ Object.create(null);

  return (
    <div className="flex flex-col gap-2 p-2 min-w-[200px]">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <Palette className="size-3.5" /> Categorias de Utilidade
      </div>
      {categories.map(cat => (
        <div key={cat.id} className="flex items-center gap-2 text-xs">
          <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
          <span className="flex-1 truncate">{cat.name}</span>
          {editable && (
            <button className="text-slate-400 hover:text-red-500" title="Remover categoria"
              onClick={() => onCommand(removeUtilityCategory(cat.id))}>
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
      {editable && !adding && (
        <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          onClick={() => setAdding(true)}>
          <Plus className="size-3" /> Nova categoria
        </button>
      )}
      {editable && adding && (
        <div className="flex flex-col gap-1.5">
          <input className="h-6 rounded border border-input px-1.5 text-xs"
            placeholder="Nome da categoria" value={name}
            onChange={e => setName(e.target.value)} autoFocus />
          <div className="grid grid-cols-8 gap-1">
            {Object.entries(UTILITY_COLOR_PALETTE).map(([key, hex]) => (
              <button key={key} className={`size-4 rounded-full border-2 ${selectedColor === key ? "border-slate-800" : "border-transparent"}`}
                style={{ backgroundColor: hex }} title={key}
                onClick={() => setSelectedColor(key)} />
            ))}
          </div>
          <div className="flex gap-1">
            <button className="h-6 rounded bg-blue-600 px-2 text-xs text-white"
              onClick={handleAdd}>Adicionar</button>
            <button className="h-6 rounded border px-2 text-xs"
              onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add panel trigger button to editor-toolbar.tsx**

Add a button next to the existing toolbar controls that opens a popover with `UtilityCategoriesPanel`:

```tsx
import { UtilityCategoriesPanel } from "./utility-categories-panel";
```

Add a new button in the toolbar JSX (near the connection class selector). The popover can use a simple state + absolute positioning div, or a simple conditional render.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/pid/editor/utility-categories-panel.tsx frontend/src/features/pid/editor/editor-toolbar.tsx
git commit -m "feat: add UtilityCategoriesPanel with color palette and CRUD"
```

---

### Task 6: UI — Category selector in properties inspector

**Files:**
- Modify: `frontend/src/features/pid/editor/properties-inspector.tsx`

- [ ] **Step 1: Add category dropdown for utility edges**

In `properties-inspector.tsx`, find the edge editing section (around line 216). After the existing edge fields, when `connectionClass === "utility"`, add a dropdown for `utilityCategoryId`:

```tsx
{selected.value.connectionClass === "utility" && (
  <SelectField
    label="Categoria"
    field="utilityCategoryId"
    value={selected.value.utilityCategoryId ?? ""}
    options={[
      ["", "Nenhuma"],
      ...document.metadata.utilityCategories.map(c => [c.id, c.name] as const),
    ]}
    {...common}
  />
)}
```

Import `SelectField` if not already in scope. Read the file to find the exact component name — it might be a different component like a custom dropdown.

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/pid/editor/properties-inspector.tsx
git commit -m "feat: add utility category selector in properties inspector"
```

---

### Task 7: Run tests and verify

- [ ] **Step 1: TypeScript compilation**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 2: Frontend tests**

```bash
cd /home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/frontend && npx vitest run 2>&1 | tail -10
```

Check for any regressions (ignore pre-existing failures).

- [ ] **Step 3: Commit if any remaining changes**

```bash
git status
```
