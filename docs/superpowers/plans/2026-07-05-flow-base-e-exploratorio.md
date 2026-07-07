# Flow Base + Exploratory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar o módulo `Escoamento Interno` à paridade didática base com o legado e conectá-lo ao framework exploratório já implementado, incluindo régua de regime, diagrama de Moody com ponto operacional, preset de exemplo e painel exploratório funcional.

**Architecture:** Reaproveitar a fundação já pronta (`apiClient`, `notify`, `validation`, `units`, `NumberField`, `PropertyTable`, `HowItWorks`, `ExploratoryPanel`) e reestruturar o `FlowPage` em torno de funções de cálculo reutilizáveis, componentes visuais pequenos e conteúdo didático separado. O gráfico de Moody e a régua de regime ficam em componentes dedicados em `src/components/viz/`, enquanto o wiring exploratório usa `flowExploratory` já portado em `src/features/exploratory/templates.ts`.

**Tech Stack:** React 19, Vite, TypeScript, recharts, vitest, Testing Library, Tailwind v4, sonner.

---

## File Structure

**Criar:**
- `frontend/src/components/viz/regime-ruler.tsx` — régua logarítmica de Reynolds com chip de regime.
- `frontend/src/components/viz/moody-chart.tsx` — gráfico do Diagrama de Moody com ponto operacional e overlay opcional de cenários.
- `frontend/src/features/flow/didactics.tsx` — blocos "Como funciona" do módulo de escoamento.
- `frontend/src/features/flow/presets.ts` — preset "Carregar exemplo".
- `frontend/src/test/regime-ruler.test.tsx`
- `frontend/src/test/moody-chart.test.tsx`

**Modificar:**
- `frontend/src/features/flow/flow-page.tsx` — trocar inputs crus por primitivos compartilhados, adicionar conteúdo didático, visuais e wiring exploratório.
- `frontend/src/test/flow-page.test.tsx` — cobrir preset, painel exploratório, régua e Moody.

---

## Task 1: Régua de regime por Reynolds

**Files:**
- Create: `frontend/src/components/viz/regime-ruler.tsx`
- Test: `frontend/src/test/regime-ruler.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";

import { RegimeRuler } from "@/components/viz/regime-ruler";

describe("RegimeRuler", () => {
  it("classifies laminar, transition, and turbulent regimes from Reynolds", () => {
    const { rerender } = render(<RegimeRuler reynolds={1000} />);
    expect(screen.getByText(/Laminar/i)).toBeInTheDocument();

    rerender(<RegimeRuler reynolds={3000} />);
    expect(screen.getByText(/Transição/i)).toBeInTheDocument();

    rerender(<RegimeRuler reynolds={50000} />);
    expect(screen.getByText(/Turbulento/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/regime-ruler.test.tsx`
Expected: FAIL because `@/components/viz/regime-ruler` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { chartColors } from "@/lib/chart";

function classifyRegime(reynolds: number) {
  if (reynolds < 2300) return { label: "Laminar", color: chartColors.accent };
  if (reynolds < 4000) return { label: "Transição", color: chartColors.warning };
  return { label: "Turbulento", color: chartColors.success };
}

export function RegimeRuler({ reynolds }: { reynolds: number }) {
  const regime = classifyRegime(reynolds);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">Regime do escoamento</span>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ background: regime.color }}
        >
          {regime.label}
        </span>
      </div>
      <div className="mt-3 h-3 rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-green-600" />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Re &lt; 2300</span>
        <span>2300–4000</span>
        <span>&gt; 4000</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/regime-ruler.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/viz/regime-ruler.tsx src/test/regime-ruler.test.tsx
git commit -m "feat(frontend): add flow regime ruler"
```

---

## Task 2: Diagrama de Moody com ponto operacional

**Files:**
- Create: `frontend/src/components/viz/moody-chart.tsx`
- Test: `frontend/src/test/moody-chart.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";

import { MoodyChart } from "@/components/viz/moody-chart";

describe("MoodyChart", () => {
  it("renders the operational point label with Reynolds and friction factor", () => {
    render(<MoodyChart reynolds={50000} frictionFactor={0.0215} roughness={0.045} />);
    expect(screen.getByText(/Ponto operacional/i)).toBeInTheDocument();
    expect(screen.getByText(/Re = 50000/i)).toBeInTheDocument();
    expect(screen.getByText(/f = 0.0215/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/moody-chart.test.tsx`
Expected: FAIL because `@/components/viz/moody-chart` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

import { ChartPanel } from "@/components/chart-panel";
import { chartColors } from "@/lib/chart";

export function MoodyChart({
  reynolds,
  frictionFactor,
  roughness,
}: {
  reynolds: number;
  frictionFactor: number;
  roughness: number;
}) {
  const point = [{ reynolds, frictionFactor, roughness }];

  return (
    <ChartPanel title="Diagrama de Moody">
      <div className="mb-3 text-sm text-slate-700">
        <p>Ponto operacional</p>
        <p>Re = {reynolds}</p>
        <p>f = {frictionFactor}</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
          <XAxis type="number" dataKey="reynolds" name="Re" />
          <YAxis type="number" dataKey="frictionFactor" name="f" />
          <Tooltip />
          <Scatter data={point} fill={chartColors.accent} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/moody-chart.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/viz/moody-chart.tsx src/test/moody-chart.test.tsx
git commit -m "feat(frontend): add flow moody chart"
```

---

## Task 3: Conteúdo didático e preset do módulo Flow

**Files:**
- Create: `frontend/src/features/flow/didactics.tsx`
- Create: `frontend/src/features/flow/presets.ts`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/test/flow-page.test.tsx`:

```tsx
it("loads the flow worked example", async () => {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ["/flow"] })} />);
  await screen.findByRole("heading", { name: /Escoamento Interno/i });

  fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

  expect(screen.getByLabelText(/Diâmetro característico/i)).toHaveValue(100);
  expect(screen.getByLabelText(/Velocidade média/i)).toHaveValue(1.5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/flow-page.test.tsx`
Expected: FAIL because the example button and preset do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const flowExample = {
  characteristicDiameter: "100",
  velocity: "1.5",
  density: "998",
  dynamicViscosity: "0.001",
} as const;
```

```tsx
import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { MathBlock } from "@/components/math-block";
import { VariablesTable } from "@/components/variables-table";

export function ReynoldsHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Número de Reynolds">
      <MathBlock expression={"Re = \\dfrac{\\rho v D}{\\mu}"} />
      <VariablesTable
        rows={[
          { symbol: "Re", description: "Número de Reynolds" },
          { symbol: "D", description: "Diâmetro característico", unit: "m" },
          { symbol: "v", description: "Velocidade média", unit: "m/s" },
        ]}
      />
      <TheoryRef>Ref.: White, Mecânica dos Fluidos, 8a ed.</TheoryRef>
    </HowItWorks>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/flow-page.test.tsx`
Expected: the new example test passes after `FlowPage` is wired in Task 4.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/flow/didactics.tsx src/features/flow/presets.ts
git commit -m "feat(frontend): add flow didactics and worked example preset"
```

---

## Task 4: Refatorar `FlowPage` para primitivos compartilhados

**Files:**
- Modify: `frontend/src/features/flow/flow-page.tsx`
- Test: `frontend/src/test/flow-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/test/flow-page.test.tsx`:

```tsx
it("shows the regime ruler and moody chart after Reynolds and friction calculations", async () => {
  // reuse existing mock implementation
  const router = createMemoryRouter(routes, { initialEntries: ["/flow"] });
  render(<RouterProvider router={router} />);

  await screen.findByRole("heading", { name: /Escoamento Interno/i });
  fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), { target: { value: "50" } });
  fireEvent.change(screen.getByLabelText(/Velocidade média/i), { target: { value: "1.5" } });
  fireEvent.change(screen.getByLabelText(/Densidade/i), { target: { value: "998" } });
  fireEvent.change(screen.getByLabelText(/Viscosidade dinâmica/i), { target: { value: "0.001" } });
  fireEvent.click(screen.getByRole("button", { name: /Calcular Reynolds/i }));

  expect(await screen.findByText(/Turbulento/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/flow-page.test.tsx`
Expected: FAIL because the visual components are not rendered yet.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/features/flow/flow-page.tsx`:

```tsx
import { NumberField } from "@/components/number-field";
import { PropertyTable } from "@/components/property-table";
import { RegimeRuler } from "@/components/viz/regime-ruler";
import { MoodyChart } from "@/components/viz/moody-chart";
import { ReynoldsHowItWorks } from "@/features/flow/didactics";
import { flowExample } from "@/features/flow/presets";
import { formatQuantity } from "@/lib/units";
import { notify } from "@/lib/notify";
```

Replace the Reynolds form inputs with `NumberField`, add a `Carregar exemplo` button using `flowExample`, and render:

```tsx
{reynoldsResult ? (
  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <PropertyTable rows={[{ label: "Número de Reynolds", value: reynoldsResult.value, units: reynoldsResult.units }]} />
    <RegimeRuler reynolds={reynoldsResult.value} />
  </div>
) : null}

{frictionResult && reynoldsResult ? (
  <MoodyChart
    reynolds={reynoldsResult.value}
    frictionFactor={frictionResult.value}
    roughness={Number(frictionForm.customRoughness || 0.045)}
  />
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/flow-page.test.tsx`
Expected: PASS for the updated page tests.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/flow/flow-page.tsx src/test/flow-page.test.tsx
git commit -m "feat(frontend): bring flow module to base parity"
```

---

## Task 5: Wire the exploratory panel into `FlowPage`

**Files:**
- Modify: `frontend/src/features/flow/flow-page.tsx`
- Modify: `frontend/src/test/flow-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/test/flow-page.test.tsx`:

```tsx
it("shows the exploratory panel and applies the water PVC template", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/flow"] });
  render(<RouterProvider router={router} />);

  await screen.findByRole("heading", { name: /Escoamento Interno/i });
  fireEvent.change(await screen.findByLabelText(/Modo Exploratório/i), {
    target: { value: "water-pvc-dn100" },
  });

  expect(screen.getByLabelText(/Diâmetro característico/i)).toHaveValue(100);
  expect(screen.getByLabelText(/Velocidade média/i)).toHaveValue(1.5);
  expect(screen.getByText("Roteiro de exploração")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/flow-page.test.tsx`
Expected: FAIL because the exploratory panel is not mounted.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/features/flow/flow-page.tsx`:

```tsx
import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import { flowExploratory } from "@/features/exploratory/templates";
```

Add callbacks:

```tsx
function applyExploratoryFields(fields: Record<string, string>) {
  setReynoldsForm((current) => ({
    ...current,
    characteristicDiameter: fields["characteristic-diameter"] ?? current.characteristicDiameter,
    velocity: fields["reynolds-velocity"] ?? current.velocity,
    density: fields.density ?? current.density,
    dynamicViscosity: fields["dynamic-viscosity"] ?? current.dynamicViscosity,
  }));
}

function changeExploratoryField(field: string, value: string) {
  setReynoldsForm((current) => {
    if (field === "characteristic-diameter") return { ...current, characteristicDiameter: value };
    if (field === "reynolds-velocity") return { ...current, velocity: value };
    return current;
  });
}

function describeScenario() {
  return `D=${reynoldsForm.characteristicDiameter || "—"} mm, v=${reynoldsForm.velocity || "—"} m/s`;
}
```

Render:

```tsx
<ExploratoryPanel
  config={flowExploratory}
  state={{
    applyFields: applyExploratoryFields,
    changeField: changeExploratoryField,
    describeScenario,
  }}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/flow-page.test.tsx`
Expected: PASS for the exploratory integration case.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/flow/flow-page.tsx src/test/flow-page.test.tsx
git commit -m "feat(frontend): wire exploratory panel into flow"
```

---

## Task 6: Final verification

**Files:**
- Verify only

- [ ] **Step 1: Run module tests**

Run: `cd frontend && npx vitest run src/test/regime-ruler.test.tsx src/test/moody-chart.test.tsx src/test/flow-page.test.tsx`
Expected: PASS.

- [ ] **Step 2: Run full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS with no regressions outside `Flow`.

- [ ] **Step 3: Run production build**

Run: `cd frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit verification-only state if needed**

```bash
cd frontend && git status --short
```

Expected: only intentional changes from this plan remain.
