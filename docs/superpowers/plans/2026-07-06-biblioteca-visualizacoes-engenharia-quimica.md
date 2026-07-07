# Biblioteca de visualizações de engenharia química Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the numeric SVG charts in the frontend with automatic grids, automatic tick ranges, and safer text placement so labels never fight with curves, axes, or markers.

**Architecture:** Add one shared SVG chart utility layer in `frontend/src/components/viz/` for numeric domains, ticks, grid lines, and safe label placement. Retrofit the existing thermodynamics, hydraulic, heat-transfer, and reactor charts to consume those helpers without changing the domain models or creating new process modules. Keep Sankey and recycle-flow diagrams out of this pass because they do not use numeric axes.

**Tech Stack:** React 19, TypeScript, SVG, Vitest, existing frontend component patterns.

---

### Task 1: Build the shared numeric chart utilities

**Files:**
- Create: `frontend/src/components/viz/chart-axis-utils.ts`
- Create: `frontend/src/components/viz/chart-grid.tsx`
- Create: `frontend/src/test/chart-axis-utils.test.ts`

- [ ] **Step 1: Write the failing utility tests**

```ts
import { buildAxisTicks, expandNumericDomain, placeSafeLabel } from "@/components/viz/chart-axis-utils";

describe("chart-axis-utils", () => {
  it("expands flat numeric domains and returns readable tick ranges", () => {
    const domain = expandNumericDomain([12, 12, 12]);
    const ticks = buildAxisTicks(domain.min, domain.max, 5);

    expect(domain.min).toBeLessThan(domain.max);
    expect(ticks[0]).toBe(domain.min);
    expect(ticks[ticks.length - 1]).toBe(domain.max);
    expect(ticks.length).toBeGreaterThanOrEqual(4);
  });

  it("moves labels away from occupied plot boxes", () => {
    const avoid = [{ x: 108, y: 24, width: 96, height: 32 }];
    const label = placeSafeLabel({
      anchor: { x: 132, y: 42 },
      size: { width: 44, height: 16 },
      plot: { left: 72, top: 28, right: 28, bottom: 44 },
      avoid,
    });

    expect(label.x).toBeGreaterThan(avoid[0].x + avoid[0].width);
    expect(label.anchor).toBe("start");
  });
});
```

- [ ] **Step 2: Run the focused utility test and confirm the helpers do not exist yet**

Run: `cd frontend && npx vitest run src/test/chart-axis-utils.test.ts`
Expected: FAIL because `chart-axis-utils.ts` and `chart-grid.tsx` do not exist yet.

- [ ] **Step 3: Implement the numeric helper layer**

Create small, pure helpers that every numeric chart can share:

```ts
type Box = { x: number; y: number; width: number; height: number };

export function expandNumericDomain(values: number[], paddingRatio = 0.08) {
  const finiteValues = values.filter(Number.isFinite);

  if (finiteValues.length === 0) {
    return { min: 0, max: 1 };
  }

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  const span = max - min;

  if (span === 0) {
    const delta = Math.max(Math.abs(min) * paddingRatio, 1);
    return { min: min - delta, max: max + delta };
  }

  const padding = span * paddingRatio;
  return { min: min - padding, max: max + padding };
}

export function buildAxisTicks(min: number, max: number, targetCount = 5) {
  if (targetCount <= 1 || min === max) {
    return [min];
  }

  const step = (max - min) / (targetCount - 1);
  return Array.from({ length: targetCount }, (_, index) =>
    index === targetCount - 1 ? max : min + step * index,
  );
}

export function formatAxisTick(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function placeSafeLabel(args: {
  anchor: { x: number; y: number };
  size: { width: number; height: number };
  plot: { left: number; top: number; right: number; bottom: number };
  avoid: Box[];
}) {
  const midpoint = (args.plot.left + args.plot.right) / 2;
  const collides = args.avoid.some((box) => {
    const labelBox = {
      x: args.anchor.x - args.size.width / 2,
      y: args.anchor.y - args.size.height / 2,
      width: args.size.width,
      height: args.size.height,
    };

    return !(
      labelBox.x + labelBox.width < box.x ||
      labelBox.x > box.x + box.width ||
      labelBox.y + labelBox.height < box.y ||
      labelBox.y > box.y + box.height
    );
  });

  if (!collides) {
    return { x: args.anchor.x, y: args.anchor.y, anchor: "middle" as const };
  }

  if (args.anchor.x >= midpoint) {
    return { x: args.plot.right + 10, y: args.anchor.y, anchor: "start" as const };
  }

  return { x: args.plot.left - 10, y: args.anchor.y, anchor: "end" as const };
}
```

Create a tiny grid component that renders background grid lines and tick labels from those helpers:

```tsx
<NumericChartGrid
  xDomain={xDomain}
  yDomain={yDomain}
  xLabel="Fração molar"
  yLabel="Temperatura (K)"
  width={width}
  height={height}
  padding={padding}
/>
```

Use `data-axis-tick` and `data-chart-label` attributes on text nodes so tests can verify grid and label placement without pixel diffs.

- [ ] **Step 4: Re-run the utility test until green**

Run: `cd frontend && npx vitest run src/test/chart-axis-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the shared helper slice**

```bash
git add frontend/src/components/viz/chart-axis-utils.ts frontend/src/components/viz/chart-grid.tsx frontend/src/test/chart-axis-utils.test.ts
git commit -m "feat(viz): add shared numeric chart helpers" -m "- Provide automatic domains, ticks, and grid lines for numeric SVG charts\n- Add safe label placement so annotations can move out of crowded regions\n- Tag ticks and labels for predictable testing"
```

### Task 2: Retrofit thermodynamics and property charts

**Files:**
- Modify: `frontend/src/components/viz/arrhenius-plot.tsx`
- Modify: `frontend/src/components/viz/binary-vle-chart.tsx`
- Modify: `frontend/src/components/viz/mccabe-thiele-chart.tsx`
- Modify: `frontend/src/components/viz/vapor-pressure-curve.tsx`
- Modify: `frontend/src/components/viz/phase-envelope-chart.tsx`
- Modify: `frontend/src/components/viz/property-surface-heatmap.tsx`
- Modify: `frontend/src/components/viz/ternary-diagram.tsx`
- Create: `frontend/src/test/mccabe-thiele-chart.test.tsx`
- Create: `frontend/src/test/binary-vle-chart.test.tsx`
- Create: `frontend/src/test/vapor-pressure-curve.test.tsx`
- Modify: `frontend/src/test/arrhenius-plot.test.tsx`
- Modify: `frontend/src/test/phase-envelope-chart.test.tsx`
- Modify: `frontend/src/test/components-page.test.tsx`

- [ ] **Step 1: Write the failing chart-safety tests**

```tsx
import { render, screen } from "@testing-library/react";

import { ArrheniusPlot } from "@/components/viz/arrhenius-plot";
import { McCabeThieleChart } from "@/components/viz/mccabe-thiele-chart";

it("keeps Arrhenius axis text and ticks readable", () => {
  const { container } = render(
    <ArrheniusPlot
      activationEnergy={55000}
      referenceTemperature={298.15}
      referenceRateConstant={0.5}
    />,
  );

  expect(screen.getByText(/ln\(k\)/i)).toBeInTheDocument();
  expect(screen.getByText(/1000 \/ T/i)).toBeInTheDocument();
  expect(container.querySelectorAll("[data-axis-tick]").length).toBeGreaterThan(4);
});

it("moves McCabe-Thiele labels out of the stepping path", () => {
  const { container } = render(
    <McCabeThieleChart
      fluid1="Ethanol"
      fluid2="Water"
      equilibriumPoints={[
        { liquid_fraction: 0, vapor_fraction: 0, temperature: 351 },
        { liquid_fraction: 0.5, vapor_fraction: 0.72, temperature: 360 },
        { liquid_fraction: 1, vapor_fraction: 1, temperature: 373 },
      ]}
      distillateComposition={0.92}
      bottomsComposition={0.08}
      feedComposition={0.45}
      refluxRatio={1.5}
      qValue={1.0}
    />,
  );

  expect(screen.getByText(/Xb/i)).toBeInTheDocument();
  expect(screen.getByText(/Xf/i)).toBeInTheDocument();
  expect(container.querySelectorAll("[data-chart-label='callout']").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the focused thermodynamics tests and confirm the current charts still fail the new contract**

Run: `cd frontend && npx vitest run src/test/chart-axis-utils.test.ts src/test/arrhenius-plot.test.tsx src/test/mccabe-thiele-chart.test.tsx src/test/binary-vle-chart.test.tsx src/test/vapor-pressure-curve.test.tsx src/test/phase-envelope-chart.test.tsx src/test/components-page.test.tsx`
Expected: FAIL because the charts still use ad hoc axis labels and do not expose the new grid/tick contract.

- [ ] **Step 3: Retrofit the thermodynamics charts to use the shared helpers**

Update each chart so that:

- the plot area has a faint background grid;
- both axes show automatic tick values at readable intervals;
- axis titles are descriptive, not single-letter placeholders;
- internal labels such as `ln(k)`, `1000 / T`, `Xb`, and `Xf` are moved into safe callouts when the plotted area is crowded;
- `data-axis-tick` and `data-chart-label` mark the text that matters for testing.

Use the helper output like this:

```tsx
<NumericChartGrid
  xDomain={xDomain}
  yDomain={yDomain}
  xLabel="Fração molar x"
  yLabel="Fração molar y"
  width={width}
  height={height}
  padding={padding}
/>
```

For `McCabeThieleChart`, keep `Xb` and `Xf` outside the main stepping path, preferably in a right-side callout block or a margin label strip so they never sit under the staircase.

- [ ] **Step 4: Re-run the focused thermodynamics tests until green**

Run: `cd frontend && npx vitest run src/test/chart-axis-utils.test.ts src/test/arrhenius-plot.test.tsx src/test/mccabe-thiele-chart.test.tsx src/test/binary-vle-chart.test.tsx src/test/vapor-pressure-curve.test.tsx src/test/phase-envelope-chart.test.tsx src/test/components-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit the thermodynamics slice**

```bash
git add frontend/src/components/viz/arrhenius-plot.tsx frontend/src/components/viz/binary-vle-chart.tsx frontend/src/components/viz/mccabe-thiele-chart.tsx frontend/src/components/viz/vapor-pressure-curve.tsx frontend/src/components/viz/phase-envelope-chart.tsx frontend/src/components/viz/property-surface-heatmap.tsx frontend/src/components/viz/ternary-diagram.tsx frontend/src/test/mccabe-thiele-chart.test.tsx frontend/src/test/binary-vle-chart.test.tsx frontend/src/test/vapor-pressure-curve.test.tsx frontend/src/test/arrhenius-plot.test.tsx frontend/src/test/phase-envelope-chart.test.tsx frontend/src/test/components-page.test.tsx
git commit -m "feat(viz): standardize thermodynamic chart axes" -m "- Add automatic grid and tick rendering to the thermodynamics and property charts\n- Move dense labels out of crowded plot regions when needed\n- Preserve the didactic diagrams while improving readability"
```

### Task 3: Retrofit hydraulics, heat-transfer, and reactor profile charts

**Files:**
- Modify: `frontend/src/components/viz/pump-system-curve.tsx`
- Modify: `frontend/src/components/viz/headloss-curve.tsx`
- Modify: `frontend/src/components/viz/pressure-profile-chart.tsx`
- Modify: `frontend/src/components/viz/energy-grade-line-chart.tsx`
- Modify: `frontend/src/components/viz/pump-efficiency-map.tsx`
- Modify: `frontend/src/components/viz/pfr-profile-chart.tsx`
- Modify: `frontend/src/components/viz/heat-exchanger-thermal-charts.tsx`
- Modify: `frontend/src/components/viz/npsh-gauge.tsx`
- Create: `frontend/src/test/pfr-profile-chart.test.tsx`
- Create: `frontend/src/test/heat-exchanger-thermal-charts.test.tsx`
- Create: `frontend/src/test/pump-efficiency-map.test.tsx`
- Modify: `frontend/src/test/headloss-curve.test.tsx`
- Modify: `frontend/src/test/pump-system-curve.test.tsx`
- Modify: `frontend/src/test/pressure-profile-chart.test.tsx`
- Modify: `frontend/src/test/pump-page.test.tsx`
- Modify: `frontend/src/test/reactor-page.test.tsx`
- Modify: `frontend/src/test/exercises-page.test.tsx`

- [ ] **Step 1: Write the failing hydraulic and reactor-profile tests**

```tsx
import { render, screen } from "@testing-library/react";

import { PumpSystemCurve } from "@/components/viz/pump-system-curve";
import { PfrProfileChart } from "@/components/viz/pfr-profile-chart";

it("renders automatic ticks and a readable operating-point callout on the pump curve", () => {
  const { container } = render(
    <PumpSystemCurve
      operatingPoint={{ flowRate: 12, head: 18.4 }}
      systemPoints={[
        { flowRate: 0, head: 8 },
        { flowRate: 6, head: 12 },
        { flowRate: 12, head: 18.4 },
        { flowRate: 15, head: 23 },
      ]}
    />,
  );

  expect(screen.getByText(/Curva da bomba vs curva do sistema/i)).toBeInTheDocument();
  expect(container.querySelectorAll("[data-axis-tick]").length).toBeGreaterThan(4);
});

it("keeps PFR labels off the main profile line when space is tight", () => {
  const { container } = render(
    <PfrProfileChart
      length={10}
      points={[
        { position: 0, concentration: 2, temperature: 350 },
        { position: 5, concentration: 1.2, temperature: 370 },
        { position: 10, concentration: 0.6, temperature: 390 },
      ]}
    />,
  );

  expect(container.querySelectorAll("[data-chart-label='callout']").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the focused hydraulics test set and confirm the current charts still fail the new contract**

Run: `cd frontend && npx vitest run src/test/chart-axis-utils.test.ts src/test/headloss-curve.test.tsx src/test/pump-system-curve.test.tsx src/test/pressure-profile-chart.test.tsx src/test/pump-efficiency-map.test.tsx src/test/pfr-profile-chart.test.tsx src/test/heat-exchanger-thermal-charts.test.tsx src/test/pump-page.test.tsx src/test/reactor-page.test.tsx src/test/exercises-page.test.tsx`
Expected: FAIL because the charts still rely on one-off SVG layouts and do not yet share the new axis/grid behavior.

- [ ] **Step 3: Retrofit the operational charts with the shared grid and safe labels**

Update the numeric charts so they all use the same helper layer for:

- domain expansion;
- tick generation;
- background grid lines;
- descriptive axis labels;
- safe label placement for operating-point callouts and segment names.

For the hydraulic charts, keep operating points, BEP markers, and NPSH warnings legible by moving labels into the header or a side legend when the plot area is full.

For the heat-transfer and reactor-profile charts, keep the temperature and concentration annotations outside the main curves if they would overlap the line segments.

- [ ] **Step 4: Re-run the focused hydraulics and reactor tests until green**

Run: `cd frontend && npx vitest run src/test/chart-axis-utils.test.ts src/test/headloss-curve.test.tsx src/test/pump-system-curve.test.tsx src/test/pressure-profile-chart.test.tsx src/test/pump-efficiency-map.test.tsx src/test/pfr-profile-chart.test.tsx src/test/heat-exchanger-thermal-charts.test.tsx src/test/pump-page.test.tsx src/test/reactor-page.test.tsx src/test/exercises-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit the operational-chart slice**

```bash
git add frontend/src/components/viz/pump-system-curve.tsx frontend/src/components/viz/headloss-curve.tsx frontend/src/components/viz/pressure-profile-chart.tsx frontend/src/components/viz/energy-grade-line-chart.tsx frontend/src/components/viz/pump-efficiency-map.tsx frontend/src/components/viz/pfr-profile-chart.tsx frontend/src/components/viz/heat-exchanger-thermal-charts.tsx frontend/src/components/viz/npsh-gauge.tsx frontend/src/test/pfr-profile-chart.test.tsx frontend/src/test/heat-exchanger-thermal-charts.test.tsx frontend/src/test/pump-efficiency-map.test.tsx frontend/src/test/headloss-curve.test.tsx frontend/src/test/pump-system-curve.test.tsx frontend/src/test/pressure-profile-chart.test.tsx frontend/src/test/pump-page.test.tsx frontend/src/test/reactor-page.test.tsx frontend/src/test/exercises-page.test.tsx
git commit -m "feat(viz): improve operational chart readability" -m "- Apply the shared grid and tick helpers to hydraulic, heat-transfer, and reactor profile charts\n- Keep labels readable by moving dense annotations out of crowded plot areas\n- Preserve the existing domain visuals while making the scales explicit"
```

### Task 4: Verify the full frontend and close the rollout

**Files:**
- Modify: `frontend/src/test/components-page.test.tsx`
- Modify: `frontend/src/test/pump-page.test.tsx`
- Modify: `frontend/src/test/reactor-page.test.tsx`
- Modify: `frontend/src/test/exercises-page.test.tsx`

- [ ] **Step 1: Update the integration tests to check for the new chart contract**

```tsx
import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { routes } from "@/app/router";

const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
const { container } = render(<RouterProvider router={router} />);

expect(container.querySelectorAll("[data-axis-tick]").length).toBeGreaterThan(10);
expect(container.querySelectorAll("[data-chart-label='callout']").length).toBeGreaterThan(0);
```

- [ ] **Step 2: Run the full frontend test slice and confirm the chart contract stays green**

Run: `cd frontend && npx vitest run src/test/chart-axis-utils.test.ts src/test/arrhenius-plot.test.tsx src/test/binary-vle-chart.test.tsx src/test/mccabe-thiele-chart.test.tsx src/test/vapor-pressure-curve.test.tsx src/test/phase-envelope-chart.test.tsx src/test/headloss-curve.test.tsx src/test/pump-system-curve.test.tsx src/test/pressure-profile-chart.test.tsx src/test/pump-efficiency-map.test.tsx src/test/pfr-profile-chart.test.tsx src/test/heat-exchanger-thermal-charts.test.tsx src/test/components-page.test.tsx src/test/pump-page.test.tsx src/test/reactor-page.test.tsx src/test/exercises-page.test.tsx`
Expected: PASS.

- [ ] **Step 3: Run the frontend build and keep the SVG changes production-safe**

Run: `cd frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit the verification slice**

```bash
git add frontend/src/test/components-page.test.tsx frontend/src/test/pump-page.test.tsx frontend/src/test/reactor-page.test.tsx frontend/src/test/exercises-page.test.tsx
git commit -m "test(viz): lock chart readability contract" -m "- Extend the integration tests to cover automatic ticks and safe label placement\n- Verify the chart library still renders cleanly across the main engineering pages\n- Keep the visual safety contract enforced at the page level"
```
