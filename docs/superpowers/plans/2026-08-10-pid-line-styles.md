# P&ID Line Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 11 distinct visual line styles to P&ID edges with documentation and a shared rendering module.

**Architecture:** New `LineStyle` type on `PidEdge`, shared rendering logic in `line-rendering.ts`, canvas rendering in `process-edge.tsx`, SVG export in `render-svg.ts`, inspector dropdown in `properties-inspector.tsx`, documentation in `line-style.ts`.

**Tech Stack:** TypeScript, React, React Flow, SVG

---

### File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `domain/model.ts` | Modify | Add `LineStyle` type, `lineStyle` to `PidEdge` |
| `domain/schema.ts` | Modify | Add `lineStyle` to `pidEdgeSchema` |
| `domain/command-reducers.ts` | Modify | Set `lineStyle` default on edge creation |
| `canvas/process-edge.tsx` | Modify | Render edges with `lineStyle` using shared module |
| `export/render-svg.ts` | Modify | Export edges with `lineStyle` using shared module |
| `canvas/line-rendering.ts` | **Create** | Shared: SVG path attributes per `LineStyle`, sine wave generator |
| `domain/line-style.ts` | **Create** | `LineStyle` type, documentation dictionaries, default mapping |
| `editor/properties-inspector.tsx` | Modify | `LineStyle` dropdown + `ConnectionClass` dropdown for edges |
| `test/pid/pid-canvas.test.tsx` | Modify | Update test assertions for line styles |

---

### Task 1: Add `LineStyle` type and documentation dictionaries

**Files:**
- Create: `frontend/src/features/pid/domain/line-style.ts`

- [ ] **Step 1: Write the `line-style.ts` module**

```typescript
import type { ConnectionClass } from "./model";

export type LineStyle =
  | "solid-thick"
  | "solid-thin"
  | "pneumatic"
  | "dashed"
  | "hydraulic"
  | "capillary"
  | "guided-wave"
  | "unguided-wave"
  | "digital"
  | "mechanical"
  | "undefined";

export const LINE_STYLES: readonly LineStyle[] = [
  "solid-thick",
  "solid-thin",
  "pneumatic",
  "dashed",
  "hydraulic",
  "capillary",
  "guided-wave",
  "unguided-wave",
  "digital",
  "mechanical",
  "undefined",
] as const;

export const LINE_STYLE_INFO: Record<LineStyle, { label: string; description: string }> = {
  "solid-thick":     { label: "Contínua grossa",     description: "Tubulação principal de processo" },
  "solid-thin":      { label: "Contínua fina",       description: "Conexão ao processo, tomada de instrumento ou linha de impulso" },
  "pneumatic":       { label: "Sinal pneumático",    description: "Transmissão por ar comprimido (3-15 psi)" },
  "dashed":          { label: "Sinal elétrico",      description: "Sinal elétrico/eletrônico (4-20 mA, binário)" },
  "hydraulic":       { label: "Sinal hidráulico",    description: "Transmissão por fluido hidráulico pressurizado" },
  "capillary":       { label: "Tubo capilar",        description: "Sistema preenchido ou selo remoto com capilar" },
  "guided-wave":     { label: "Guiado (fibra/cabo)", description: "Sinal eletromagnético/sônico guiado (fibra óptica, cabo especial)" },
  "unguided-wave":   { label: "Não guiado (rádio)",  description: "Sinal sem fio, rádio ou comunicação não guiada" },
  "digital":         { label: "Digital/barramento",  description: "Comunicação digital, barramento ou link de dados entre sistemas" },
  "mechanical":      { label: "Ligação mecânica",    description: "Acoplamento mecânico entre dispositivos" },
  "undefined":       { label: "Sinal indefinido",    description: "Meio de transmissão não definido ou irrelevante" },
};

export const CONNECTION_CLASS_INFO: Record<ConnectionClass, { label: string; description: string }> = {
  "process":  { label: "Processo",  description: "Linha de fluido do processo produtivo principal" },
  "utility":  { label: "Utilidade", description: "Linha de serviço auxiliar (vapor, água, ar, etc.)" },
  "signal":   { label: "Sinal",     description: "Conexão de instrumentação, controle ou transmissão de dados" },
};

export const DEFAULT_LINE_STYLE: Record<ConnectionClass, LineStyle> = {
  "process": "solid-thick",
  "utility": "solid-thin",
  "signal": "dashed",
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/pid/domain/line-style.ts
git commit -m "feat: add LineStyle type and documentation dictionaries"
```

---

### Task 2: Add `lineStyle` to `PidEdge` model and schema

**Files:**
- Modify: `frontend/src/features/pid/domain/model.ts:3,49`
- Modify: `frontend/src/features/pid/domain/schema.ts:92-101`
- Modify: `frontend/src/features/pid/domain/command-reducers.ts:265-274`

- [ ] **Step 1: Add `LineStyle` type to model.ts and `lineStyle` to `PidEdge`**

In `model.ts`, add import:

```typescript
import type { LineStyle } from "./line-style";
```

Add `lineStyle` to `PidEdge` interface (after `connectionClass`):

```typescript
export interface PidEdge {
  id: string;
  sourcePortId: string;
  targetPortId: string;
  connectionClass: ConnectionClass;
  lineStyle: LineStyle;
  route: Point[];
  tag: string;
  label: string;
  properties: PidProperties;
}
```

- [ ] **Step 2: Add `lineStyle` to `pidEdgeSchema` in schema.ts**

In `schema.ts`, add import:

```typescript
import { LINE_STYLES } from "./line-style";
```

Update `pidEdgeSchema`:

```typescript
export const pidEdgeSchema: z.ZodType<PidEdge> = z.object({
  id: uuidSchema,
  sourcePortId: uuidSchema,
  targetPortId: uuidSchema,
  connectionClass: z.enum(["process", "utility", "signal"]),
  lineStyle: z.enum(LINE_STYLES),
  route: z.array(pidPointSchema),
  tag: z.string(),
  label: z.string(),
  properties: pidPropertiesSchema,
}).strict();
```

- [ ] **Step 3: Set `lineStyle` default in `command-reducers.ts`**

In `command-reducers.ts`, add import:

```typescript
import { DEFAULT_LINE_STYLE } from "./line-style";
```

Update `connectDocumentPorts` (line 265):

```typescript
const edge: PidEdge = {
  id,
  sourcePortId,
  targetPortId,
  connectionClass: source.connectionClass,
  lineStyle: DEFAULT_LINE_STYLE[source.connectionClass],
  route: [],
  tag: "",
  label: "",
  properties: {},
};
```

Also update `duplicateElements` for edges (search for where edges are duplicated). Read the file to find the edge duplication section and add `lineStyle` preservation.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors (may have errors in process-edge.tsx and render-svg.ts that will be fixed in later tasks — those are expected).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/pid/domain/model.ts frontend/src/features/pid/domain/schema.ts frontend/src/features/pid/domain/command-reducers.ts
git commit -m "feat: add lineStyle field to PidEdge model and schema"
```

---

### Task 3: Shared line rendering module

**Files:**
- Create: `frontend/src/features/pid/canvas/line-rendering.ts`

- [ ] **Step 1: Write `line-rendering.ts`**

```typescript
import type { LineStyle } from "../domain/line-style";
import type { Point } from "../domain/model";

export interface LineStyleAttributes {
  strokeWidth: number;
  strokeDasharray?: string;
  stroke: string;
}

export function lineStyleAttributes(lineStyle: LineStyle): LineStyleAttributes {
  switch (lineStyle) {
    case "solid-thick":
      return { strokeWidth: 3, stroke: "#475569" };
    case "solid-thin":
      return { strokeWidth: 1.5, stroke: "#475569" };
    case "pneumatic":
      return { strokeWidth: 1.5, strokeDasharray: "12 4", stroke: "#64748b" };
    case "dashed":
      return { strokeWidth: 1.5, strokeDasharray: "8 4", stroke: "#64748b" };
    case "hydraulic":
      return { strokeWidth: 1.5, strokeDasharray: "20 4 4 4", stroke: "#64748b" };
    case "capillary":
      return { strokeWidth: 1, strokeDasharray: "2 4", stroke: "#64748b" };
    case "guided-wave":
      return { strokeWidth: 1.5, stroke: "#64748b" };
    case "unguided-wave":
      return { strokeWidth: 1.5, stroke: "#64748b" };
    case "digital":
      return { strokeWidth: 1.5, strokeDasharray: "2 8", stroke: "#64748b" };
    case "mechanical":
      return { strokeWidth: 1.5, strokeDasharray: "4 4", stroke: "#64748b" };
    case "undefined":
      return { strokeWidth: 1.5, strokeDasharray: "16 6", stroke: "#64748b" };
  }
}

export function lineStyleClass(lineStyle: LineStyle): string {
  return `pid-edge pid-edge--${lineStyle}`;
}

export function isSinusoidal(lineStyle: LineStyle): boolean {
  return lineStyle === "guided-wave" || lineStyle === "unguided-wave";
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/pid/canvas/line-rendering.ts
git commit -m "feat: add shared line rendering module"
```

---

### Task 4: Render line styles on canvas (`process-edge.tsx`)

**Files:**
- Modify: `frontend/src/features/pid/canvas/process-edge.tsx`

- [ ] **Step 1: Rewrite `ProcessEdgeComponent` to use line styles**

```typescript
import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

import type { PidEdge, Point } from "../domain/model";
import { lineStyleAttributes, isSinusoidal } from "./line-rendering";

export type ProcessEdgeData = Record<string, unknown> & {
  readonly processEdge: PidEdge;
  readonly route: readonly Point[];
  readonly editable: boolean;
};

export type ProcessFlowEdge = Edge<ProcessEdgeData, "process">;

function ProcessEdgeComponent(props: EdgeProps<ProcessFlowEdge>) {
  if (!props.data) return null;
  const { processEdge, route } = props.data;
  const routePoints = orthogonalPoints(
    { x: props.sourceX, y: props.sourceY },
    route,
    { x: props.targetX, y: props.targetY },
    props.sourcePosition,
    props.targetPosition,
  );
  const path = isSinusoidal(processEdge.lineStyle)
    ? sinusoidalPath(routePoints, processEdge.lineStyle === "unguided-wave")
    : pointsPath(routePoints);
  const midpoint = pathMidpoint(routePoints);
  const label = [processEdge.tag, processEdge.label].filter(Boolean).join(" ");
  const attrs = lineStyleAttributes(processEdge.lineStyle);

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        interactionWidth={24}
        style={{
          strokeWidth: attrs.strokeWidth,
          strokeDasharray: attrs.strokeDasharray,
        }}
        className={props.selected ? "stroke-blue-600" : ""}
        data-testid={`process-edge-${props.id}`}
      />
      {label ? (
        <EdgeLabelRenderer>
          <span
            className="pointer-events-none absolute rounded bg-white/90 px-1 text-[10px] font-medium text-slate-700"
            style={{ transform: `translate(-50%, -50%) translate(${midpoint.x}px, ${midpoint.y}px)` }}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function sinusoidalPath(points: readonly Point[], gapped: boolean): string {
  const amplitude = 4;
  const period = 20;
  const segments: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) continue;
    const steps = Math.max(1, Math.round(dist / 4));
    const ux = dx / dist;
    const uy = dy / dist;
    const nx = -uy;
    const ny = ux;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      const phase = (dist * t) / period * 2 * Math.PI;
      const offset = amplitude * Math.sin(phase);
      if (gapped && Math.abs(Math.sin(phase)) < 0.3) continue;
      const sx = x + nx * offset;
      const sy = y + ny * offset;
      segments.push(`${segments.length === 0 ? "M" : "L"} ${sx} ${sy}`);
    }
  }
  return segments.join(" ");
}

export function orthogonalPath(
  source: Point,
  route: readonly Point[],
  target: Point,
  sourcePosition: Position = Position.Right,
  targetPosition: Position = Position.Left,
): string {
  return pointsPath(orthogonalPoints(source, route, target, sourcePosition, targetPosition));
}

export function orthogonalPoints(
  source: Point,
  route: readonly Point[],
  target: Point,
  sourcePosition: Position = Position.Right,
  targetPosition: Position = Position.Left,
): Point[] {
  if (source.x === target.x && source.y === target.y
    && route.every((point) => point.x === source.x && point.y === source.y)) return [{ ...source }];
  const points: Point[] = [{ ...source }];
  const sourceTangent = tangentPoint(source, sourcePosition);
  const targetTangent = tangentPoint(target, targetPosition);
  appendPoint(points, sourceTangent);
  for (const waypoint of [...route, targetTangent]) {
    const current = points.at(-1)!;
    if (current.x === waypoint.x && current.y === waypoint.y) continue;
    if (current.x !== waypoint.x && current.y !== waypoint.y) {
      appendPoint(points, { x: waypoint.x, y: current.y });
    }
    appendPoint(points, waypoint);
  }
  appendPoint(points, target);
  return points;
}

function tangentPoint(point: Point, position: Position): Point {
  if (position === Position.Left) return { x: point.x - 24, y: point.y };
  if (position === Position.Right) return { x: point.x + 24, y: point.y };
  if (position === Position.Top) return { x: point.x, y: point.y - 24 };
  return { x: point.x, y: point.y + 24 };
}

function appendPoint(points: Point[], point: Point) {
  const previous = points.at(-1);
  if (!previous || previous.x !== point.x || previous.y !== point.y) points.push({ ...point });
}

export function pointsPath(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function pathMidpoint(points: readonly Point[]): Point {
  const segments = points.slice(1).map((point, index) => ({
    from: points[index],
    to: point,
    length: Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y),
  }));
  const halfway = segments.reduce((total, segment) => total + segment.length, 0) / 2;
  let walked = 0;
  for (const segment of segments) {
    if (walked + segment.length >= halfway) {
      const ratio = segment.length === 0 ? 0 : (halfway - walked) / segment.length;
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
        y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
      };
    }
    walked += segment.length;
  }
  return points[0] ?? { x: 0, y: 0 };
}

export const ProcessEdge = memo(ProcessEdgeComponent);
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/pid/canvas/process-edge.tsx frontend/src/features/pid/canvas/line-rendering.ts
git commit -m "feat: render line styles on canvas edges"
```

---

### Task 5: Render line styles in SVG export

**Files:**
- Modify: `frontend/src/features/pid/export/render-svg.ts:111-130`

- [ ] **Step 1: Update `renderEdge` to use `lineStyle`**

Replace lines 111-130 with:

```typescript
function renderEdge(portPositions: ReadonlyMap<string, PositionedPort>, edge: PidEdge, edgeIndex: number) {
  const source = portPositions.get(edge.sourcePortId);
  const target = portPositions.get(edge.targetPortId);
  if (!source || !target) return null;
  const points = orthogonalPoints(source, edge.route, target);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${number(point.x)} ${number(point.y)}`).join(" ");
  const arrow = closedArrowPoints(points);
  const attrs = lineStyleAttributes(edge.lineStyle);
  const arrowMarkup = arrow.length === 3
    ? `<polygon id="pid-arrow-${edgeIndex}" data-arrow-for="${attribute(edge.id)}" points="${arrow.map((point) => `${number(point.x)},${number(point.y)}`).join(" ")}" fill="${attrs.stroke}" stroke="${attrs.stroke}" stroke-width="1" stroke-linejoin="round"/>`
    : "";
  const dashAttr = attrs.strokeDasharray ? ` stroke-dasharray="${attrs.strokeDasharray}"` : "";
  const label = [edge.tag, edge.label].filter(Boolean).join(" ");
  const midpoint = pathMidpoint(points);
  const labelY = midpoint.y - 5;
  return {
    markup: `<g data-element-id="${attribute(edge.id)}"><path d="${attribute(path)}" fill="none" stroke="${attrs.stroke}" stroke-width="${attrs.strokeWidth}"${dashAttr}/>${arrowMarkup}${label ? `<text x="${number(midpoint.x)}" y="${number(labelY)}" text-anchor="middle" fill="#334155" stroke="none" font-size="11">${text(label)}</text>` : ""}</g>`,
    bounds: unionBounds([pointsBounds(points, 1), pointsBounds(arrow, 1)]),
    labelBounds: label ? centeredTextBounds(label, midpoint.x, labelY, 11) : undefined,
  };
}
```

Also add the import at the top of `render-svg.ts`:

```typescript
import { lineStyleAttributes } from "../canvas/line-rendering";
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/pid/export/render-svg.ts
git commit -m "feat: render line styles in SVG export"
```

---

### Task 6: Add line style and connection class dropdowns to inspector

**Files:**
- Modify: `frontend/src/features/pid/editor/properties-inspector.tsx:214-219`

- [ ] **Step 1: Add `LineStyle` dropdown and `ConnectionClass` dropdown for edges**

Replace lines 214-219 (the edge section) with:

```typescript
    {selected?.kind === "edge" && <FieldGroup key={selected.value.id} title="Conexão" id={selected.value.id}>
      <TextField label="Tag" field="tag" value={selected.value.tag} {...common} />
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <SelectField label="Classe de conexão" field="connectionClass" value={selected.value.connectionClass}
        title={CONNECTION_CLASS_INFO[selected.value.connectionClass].description}
        options={[
          ["process", CONNECTION_CLASS_INFO.process.label],
          ["utility", CONNECTION_CLASS_INFO.utility.label],
          ["signal", CONNECTION_CLASS_INFO.signal.label],
        ]} {...common}
        onChange={(value) => {
          const cls = value as ConnectionClass;
          common.onChange("connectionClass", cls);
          common.onChange("lineStyle", DEFAULT_LINE_STYLE[cls]);
        }}
      />
      <SelectField label="Estilo de linha" field="lineStyle" value={selected.value.lineStyle}
        title={LINE_STYLE_INFO[selected.value.lineStyle].description}
        options={LINE_STYLES.map((style) => [style, LINE_STYLE_INFO[style].label])} {...common} />
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
```

Add imports at the top of the file:

```typescript
import type { ConnectionClass } from "../domain/model";
import { LINE_STYLES, LINE_STYLE_INFO, CONNECTION_CLASS_INFO, DEFAULT_LINE_STYLE } from "../domain/line-style";
```

Extend `SelectField` to accept an optional `title` prop for tooltip on the `<select>` element:

```typescript
function SelectField({ label, field, value, options, title, editable, errors, drafts, beginDraft, changeDraft, finalizeDraft }: SharedFieldProps & {
  label: string; field: string; value: string; options: readonly (readonly [string, string])[]; title?: string;
}) {
  // ... same body, add title={title} to the <select> element
```

Update the `<select>` JSX to include `title={title}` if provided:

```typescript
<select
  id={id}
  aria-label={label}
  title={title}
  ...
>
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Run related tests**

Run: `npx vitest run src/test/pid/ 2>&1 | tail -20`
Expected: All pid tests pass. Some may fail due to `lineStyle` being required in edges created by test fixtures — update tests as needed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/pid/editor/properties-inspector.tsx
git commit -m "feat: add line style and connection class dropdowns to edge inspector"
```

---

### Task 7: Update tests and final validation

- [ ] **Step 1: Run the full test suite to identify failures**

Run: `npx vitest run 2>&1 | grep -E "FAIL|PASS|Tests" | tail -30`
Expected: Identify test files broken by the new `lineStyle` field requirement.

- [ ] **Step 2: Fix test fixtures to include `lineStyle`**

Search for all `.ts` and `.tsx` files that create `PidEdge` objects (in test fixtures or helpers):

Run: `grep -rn "connectionClass:" --include="*.ts" --include="*.tsx" frontend/src/test/ frontend/src/features/`

For each fixture that creates a `PidEdge`, add `lineStyle: "solid-thick"` (or appropriate default). Example fix in `pid-canvas.test.tsx`:

```typescript
// Before:
{ id: "e1", sourcePortId: "p1", targetPortId: "p2", connectionClass: "process", route: [], tag: "", label: "", properties: {} }

// After:
{ id: "e1", sourcePortId: "p1", targetPortId: "p2", connectionClass: "process", lineStyle: "solid-thick", route: [], tag: "", label: "", properties: {} }
```

- [ ] **Step 3: Re-run the full test suite**

Run: `npx vitest run 2>&1 | tail -10`
Expected: Only pre-existing failures remain (balance-page, components-page, pump-page, etc.) — no new failures.

- [ ] **Step 4: Run typecheck final**

Run: `npx tsc --noEmit 2>&1`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/test/
git commit -m "test: update test fixtures with lineStyle field"
```
