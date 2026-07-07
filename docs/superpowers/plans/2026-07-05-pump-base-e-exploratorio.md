# Pump Base + Exploratory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar o módulo `Perda de Carga e Bombas` à paridade didática base com o legado e conectá-lo ao framework exploratório já pronto, incluindo gauge de NPSH, curva `h_f × Q`, decomposição de head, presets/exemplo e suporte a atrito por material e múltiplos fittings.

**Architecture:** Reaproveitar a fundação já consolidada (`apiClient`, `notify`, `validation`, `units`, `NumberField`, `PropertyTable`, `HowItWorks`, `ExploratoryPanel`) e reestruturar o `PumpPage` em torno de blocos de formulário menores, resultados em tabelas compartilhadas e componentes visuais dedicados em `src/components/viz/`. O wiring exploratório usa `pumpExploratory` já portado em `src/features/exploratory/templates.ts`, enquanto a lógica de múltiplos fittings e cálculo de fator de atrito por material reaproveita os endpoints já existentes do backend.

**Tech Stack:** React 19, Vite, TypeScript, recharts, vitest, Testing Library, Tailwind v4, sonner.

---

## File Structure

**Criar:**
- `frontend/src/components/viz/npsh-gauge.tsx` — gauge SVG da margem de NPSH.
- `frontend/src/components/viz/headloss-curve.tsx` — curva `h_f × Q` com ponto operacional.
- `frontend/src/components/viz/head-breakdown-chart.tsx` — decomposição dos termos da altura manométrica.
- `frontend/src/features/pump/didactics.tsx` — acordeões teóricos do módulo.
- `frontend/src/features/pump/presets.ts` — preset "Carregar exemplo".
- `frontend/src/test/npsh-gauge.test.tsx`
- `frontend/src/test/headloss-curve.test.tsx`
- `frontend/src/test/head-breakdown-chart.test.tsx`

**Modificar:**
- `frontend/src/features/pump/pump-page.tsx` — integrar primitivos compartilhados, material-based friction, múltiplos fittings, visuais e painel exploratório.
- `frontend/src/test/pump-page.test.tsx` — cobrir exemplo, visuais, material-based friction, múltiplos fittings e exploratório.

---

## Task 1: Gauge de margem de NPSH

**Files:**
- Create: `frontend/src/components/viz/npsh-gauge.tsx`
- Test: `frontend/src/test/npsh-gauge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";

import { NpshGauge } from "@/components/viz/npsh-gauge";

describe("NpshGauge", () => {
  it("shows the safe margin message when NPSHd exceeds NPSHr by at least 0.5 m", () => {
    render(<NpshGauge available={6.8} required={3} />);

    expect(screen.getByText(/Margem segura/i)).toBeInTheDocument();
    expect(screen.getByText(/NPSHd = 6.8/i)).toBeInTheDocument();
    expect(screen.getByText(/NPSHr = 3/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/npsh-gauge.test.tsx`
Expected: FAIL because `@/components/viz/npsh-gauge` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
type NpshGaugeProps = {
  available: number;
  required?: number;
};

export function NpshGauge({ available, required }: NpshGaugeProps) {
  const safe = required !== undefined ? available >= required + 0.5 : null;
  const label =
    safe === null
      ? "Informe NPSHr para checar margem"
      : safe
        ? "Margem segura"
        : "Risco de cavitação";

  return (
    <section className="mt-3 rounded-xl border border-slate-200 p-3">
      <h3 className="text-sm font-medium text-slate-800">Margem de NPSH</h3>
      <p className="mt-2 text-xs text-muted-foreground">NPSHd = {available}</p>
      {required !== undefined ? (
        <p className="text-xs text-muted-foreground">NPSHr = {required}</p>
      ) : null}
      <span className="mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium">
        {label}
      </span>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/npsh-gauge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/viz/npsh-gauge.tsx src/test/npsh-gauge.test.tsx
git commit -m "feat(frontend): add pump npsh gauge"
```

---

## Task 2: Curva de perda de carga `h_f × Q`

**Files:**
- Create: `frontend/src/components/viz/headloss-curve.tsx`
- Test: `frontend/src/test/headloss-curve.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";

import { HeadlossCurve } from "@/components/viz/headloss-curve";

describe("HeadlossCurve", () => {
  it("renders the operational point metadata", () => {
    const points = [
      { flowRate: 0.005, headloss: 2.1 },
      { flowRate: 0.01, headloss: 4.25 },
    ];

    render(
      <HeadlossCurve
        method="Darcy-Weisbach"
        operationalPoint={{ flowRate: 0.01, headloss: 4.25 }}
        points={points}
      />,
    );

    expect(screen.getByText(/Perda de Carga × Vazão/i)).toBeInTheDocument();
    expect(screen.getByText(/Q = 0.01/i)).toBeInTheDocument();
    expect(screen.getByText(/h_f = 4.25/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/headloss-curve.test.tsx`
Expected: FAIL because `@/components/viz/headloss-curve` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, XAxis, YAxis } from "recharts";

type CurvePoint = { flowRate: number; headloss: number };

export function HeadlossCurve({
  method,
  points,
  operationalPoint,
}: {
  method: string;
  points: CurvePoint[];
  operationalPoint: CurvePoint;
}) {
  return (
    <section className="mt-3 rounded-xl border border-slate-200 p-3">
      <h3 className="text-sm font-medium text-slate-800">Perda de Carga × Vazão</h3>
      <p className="mt-1 text-xs text-muted-foreground">{method}</p>
      <p className="text-xs text-muted-foreground">Q = {operationalPoint.flowRate}</p>
      <p className="text-xs text-muted-foreground">h_f = {operationalPoint.headloss}</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="flowRate" />
            <YAxis dataKey="headloss" />
            <Line type="monotone" dataKey="headloss" stroke="#2563EB" dot={false} />
            <Scatter data={[operationalPoint]} fill="#DC2626" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/headloss-curve.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/viz/headloss-curve.tsx src/test/headloss-curve.test.tsx
git commit -m "feat(frontend): add pump headloss curve"
```

---

## Task 3: Decomposição da altura manométrica

**Files:**
- Create: `frontend/src/components/viz/head-breakdown-chart.tsx`
- Test: `frontend/src/test/head-breakdown-chart.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";

import { HeadBreakdownChart } from "@/components/viz/head-breakdown-chart";

describe("HeadBreakdownChart", () => {
  it("lists the head terms and final result", () => {
    render(
      <HeadBreakdownChart
        totalHead={18.2}
        terms={[
          { label: "ΔP/(ρg)", value: 8.03 },
          { label: "Δz", value: 12 },
          { label: "ΔV²/(2g)", value: 0.08 },
          { label: "-h_f", value: -4.25 },
        ]}
      />,
    );

    expect(screen.getByText(/Decomposição/i)).toBeInTheDocument();
    expect(screen.getByText(/18.2/i)).toBeInTheDocument();
    expect(screen.getByText(/ΔP\/\(ρg\)/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/head-breakdown-chart.test.tsx`
Expected: FAIL because `@/components/viz/head-breakdown-chart` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
type HeadTerm = { label: string; value: number };

export function HeadBreakdownChart({
  totalHead,
  terms,
}: {
  totalHead: number;
  terms: HeadTerm[];
}) {
  return (
    <section className="mt-3 rounded-xl border border-slate-200 p-3">
      <h3 className="text-sm font-medium text-slate-800">Decomposição</h3>
      <p className="mt-1 text-xs text-muted-foreground">H = {totalHead}</p>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {terms.map((term) => (
          <li key={term.label}>
            {term.label}: {term.value}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/head-breakdown-chart.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/viz/head-breakdown-chart.tsx src/test/head-breakdown-chart.test.tsx
git commit -m "feat(frontend): add pump head breakdown chart"
```

---

## Task 4: Conteúdo didático e preset do módulo Pump

**Files:**
- Create: `frontend/src/features/pump/didactics.tsx`
- Create: `frontend/src/features/pump/presets.ts`
- Test: `frontend/src/test/pump-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/test/pump-page.test.tsx`:

```tsx
it("loads the pump worked example", async () => {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ["/pump"] })} />);
  await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i });

  fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

  expect(screen.getByLabelText(/Comprimento da linha/i)).toHaveValue(100);
  expect(screen.getByLabelText(/^Diâmetro$/i)).toHaveValue(100);
  expect(screen.getByLabelText(/Vazão/i)).toHaveValue(0.01);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/pump-page.test.tsx`
Expected: FAIL because the example button and preset do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const pumpWorkedExample = {
  pipeLength: "100",
  diameter: "100",
  flowRate: "0.01",
  frictionFactor: "0.02",
  velocity: "1.27",
  atmosphericPressure: "1.033",
  vaporPressure: "0.023",
  density: "998",
  suctionLoss: "2",
  inletVelocity: "1.27",
  gaugeElevation: "3",
  pressure1: "0",
  pressure2: "200000",
  elevation1: "0",
  elevation2: "5",
  velocity1: "1.27",
  velocity2: "1.27",
  totalLoss: "2",
  npshRequired: "3",
} as const;
```

```tsx
import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { MathBlock } from "@/components/math-block";
import { VariablesTable } from "@/components/variables-table";

export function HeadlossHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Perda de Carga">
      <MathBlock expression={"h_f = f \\dfrac{L}{D} \\dfrac{V^2}{2g}"} />
      <VariablesTable
        rows={[
          { symbol: "h_f", description: "Perda de carga", unit: "m" },
          { symbol: "L", description: "Comprimento da linha", unit: "m" },
          { symbol: "D", description: "Diâmetro interno", unit: "m" },
        ]}
      />
      <TheoryRef>Ref.: White, Mecânica dos Fluidos, 8a ed.</TheoryRef>
    </HowItWorks>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/pump-page.test.tsx`
Expected: the new example test passes after `PumpPage` is wired in Task 5.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/pump/didactics.tsx src/features/pump/presets.ts
git commit -m "feat(frontend): add pump didactics and worked example preset"
```

---

## Task 5: Refatorar `PumpPage` para primitivos compartilhados e visuais

**Files:**
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Test: `frontend/src/test/pump-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/test/pump-page.test.tsx`:

```tsx
it("shows the pump visuals after calculations", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/pump"] });
  render(<RouterProvider router={router} />);

  await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i });

  fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), { target: { value: "25" } });
  fireEvent.change(screen.getByLabelText(/^Diâmetro$/i), { target: { value: "50" } });
  fireEvent.change(screen.getByLabelText(/Vazão/i), { target: { value: "0.005" } });
  fireEvent.change(screen.getByLabelText(/Fator de atrito/i), { target: { value: "0.02" } });
  fireEvent.click(screen.getByRole("button", { name: /Calcular perda de carga/i }));

  expect(await screen.findByText(/Perda de Carga × Vazão/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/pump-page.test.tsx`
Expected: FAIL because the visual components are not rendered yet.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/features/pump/pump-page.tsx`:

```tsx
import { NumberField } from "@/components/number-field";
import { PropertyTable } from "@/components/property-table";
import { HeadlossCurve } from "@/components/viz/headloss-curve";
import { HeadBreakdownChart } from "@/components/viz/head-breakdown-chart";
import { NpshGauge } from "@/components/viz/npsh-gauge";
import {
  HeadHowItWorks,
  HeadlossHowItWorks,
  NpshHowItWorks,
} from "@/features/pump/didactics";
import { pumpWorkedExample } from "@/features/pump/presets";
```

Render after successful calculations:

```tsx
{headlossResult ? (
  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <PropertyTable rows={[{ label: "Perda de carga", value: headlossResult.value, units: headlossResult.units }]} />
    <HeadlossCurve method={headlossForm.method} operationalPoint={{ flowRate: Number(headlossForm.flowRate || 0), headloss: headlossResult.value }} points={curvePoints} />
  </div>
) : null}

{npshResult ? (
  <NpshGauge available={npshResult.value} required={Number(npshRequired) || undefined} />
) : null}

{headResult ? (
  <HeadBreakdownChart totalHead={headResult.value} terms={headTerms} />
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/pump-page.test.tsx`
Expected: PASS for the updated page tests.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/pump/pump-page.tsx src/test/pump-page.test.tsx
git commit -m "feat(frontend): bring pump module to base parity"
```

---

## Task 6: Atrito por material, múltiplos fittings e caminho Hazen-Williams

**Files:**
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Test: `frontend/src/test/pump-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/test/pump-page.test.tsx`:

```tsx
it("calculates head loss using material roughness and multiple fittings", async () => {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ["/pump"] })} />);
  await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i });

  fireEvent.change(screen.getByLabelText(/Método de perda de carga/i), {
    target: { value: "Darcy-Weisbach" },
  });
  fireEvent.click(screen.getByLabelText(/Usar material/i));
  fireEvent.change(screen.getByLabelText(/Material da tubulação/i), {
    target: { value: "Aço comercial" },
  });

  expect(await screen.findByLabelText(/Número de Reynolds/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/pump-page.test.tsx`
Expected: FAIL because the material-based friction path and multiple fittings UI do not exist.

- [ ] **Step 3: Write minimal implementation**

Add:
- radio choice between manual friction factor and material-based friction for Darcy-Weisbach;
- radio choice between manual coefficient and material-based coefficient for Hazen-Williams;
- material select loaded from `/piping/compositions`;
- Reynolds + friction-factor method fields for Darcy material path;
- repeating fittings rows backed by array state;
- API call to `/flow/friction-factor` before `/pump/headloss` when Darcy material path is active.

Minimal fitting row shape:

```ts
type FittingRow = { id: string; fitting: string; quantity: string };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/pump-page.test.tsx`
Expected: PASS for the new material-based path and fittings flow.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/pump/pump-page.tsx src/test/pump-page.test.tsx
git commit -m "feat(frontend): support material-based pump headloss inputs"
```

---

## Task 7: Wire the exploratory panel into `PumpPage`

**Files:**
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Modify: `frontend/src/test/pump-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/test/pump-page.test.tsx`:

```tsx
it("shows the exploratory panel and applies the standard pump template", async () => {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ["/pump"] })} />);
  await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i });

  fireEvent.change(screen.getByLabelText(/Modo Exploratório/i), {
    target: { value: "standard-pump" },
  });

  expect(screen.getByLabelText(/Comprimento da linha/i)).toHaveValue(100);
  expect(screen.getByLabelText(/^Diâmetro$/i)).toHaveValue(100);
  expect(screen.getByText(/Roteiro de exploração/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/pump-page.test.tsx`
Expected: FAIL because the exploratory panel is not mounted.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/features/pump/pump-page.tsx`:

```tsx
import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import { pumpExploratory } from "@/features/exploratory/templates";
```

Wire callbacks:

```tsx
function applyExploratoryFields(fields: Record<string, string>) {
  setHeadlossForm((current) => ({
    ...current,
    pipeLength: fields["pipe-length"] ?? current.pipeLength,
    diameter: fields["headloss-diameter"] ?? current.diameter,
    flowRate: fields["headloss-flow-rate"] ?? current.flowRate,
    frictionFactor: fields["headloss-friction-factor"] ?? current.frictionFactor,
    velocity: fields["headloss-velocity"] ?? current.velocity,
  }));
  setNpshForm((current) => ({
    ...current,
    atmosphericPressure: fields["atmospheric-pressure"] ?? current.atmosphericPressure,
    vaporPressure: fields["vapor-pressure"] ?? current.vaporPressure,
    density: fields["specific-mass"] ?? current.density,
    frictionFactor: fields["npsh-friction-factor"] ?? current.frictionFactor,
    pumpInletVelocity: fields["pump-inlet-velocity"] ?? current.pumpInletVelocity,
    gaugeElevation: fields["gauge-elevation"] ?? current.gaugeElevation,
  }));
}

function describeScenario() {
  return `L=${headlossForm.pipeLength || "—"} m, Q=${headlossForm.flowRate || "—"} m3/s`;
}
```

Render:

```tsx
<ExploratoryPanel
  config={pumpExploratory}
  state={{
    applyFields: applyExploratoryFields,
    changeField: changeExploratoryField,
    describeScenario,
  }}
>
  {(scenarios) => headlossResult ? <HeadlossCurve ... /> : null}
</ExploratoryPanel>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/pump-page.test.tsx`
Expected: PASS for the exploratory integration case.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/pump/pump-page.tsx src/test/pump-page.test.tsx
git commit -m "feat(frontend): wire exploratory panel into pump"
```

---

## Task 8: Final verification

**Files:**
- Verify only

- [ ] **Step 1: Run module tests**

Run: `cd frontend && npx vitest run src/test/npsh-gauge.test.tsx src/test/headloss-curve.test.tsx src/test/head-breakdown-chart.test.tsx src/test/pump-page.test.tsx`
Expected: PASS.

- [ ] **Step 2: Run full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS with no regressions outside `Pump`.

- [ ] **Step 3: Run production build**

Run: `cd frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit verification-only state if needed**

```bash
cd frontend && git status --short
```

Expected: only intentional changes from this plan remain.
