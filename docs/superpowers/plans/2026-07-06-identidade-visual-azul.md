# Blue Visual Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved white-first blue identity across the entire React frontend, including shared primitives, feature pages, and charts.

**Architecture:** Make `frontend/src/app/globals.css` the source of truth for semantic color tokens, then remove hardcoded slate and blue surfaces from shared components and pages so they inherit the theme. Rework the chart palette separately but with the same semantic colors, then lock the result with unit and end-to-end checks on desktop and mobile.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn-style primitives, SVG and Recharts charts, Vitest, Playwright.

---

### Task 1: Rebuild the global theme tokens and shell surfaces

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/components/app-shell.tsx`
- Modify: `frontend/src/components/app-sidebar.tsx`
- Modify: `frontend/src/components/ui/button.tsx`
- Modify: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/test/theme-shell.test.tsx`
- Modify: `frontend/src/test/app-shell.test.tsx`

- [ ] **Step 1: Write the failing theme-contract tests**

```tsx
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";
import { buttonVariants } from "@/components/ui/button";

it("uses the blue theme tokens in the shell and primary actions", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("navigation", { name: /Navegação principal/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Início/i })).toHaveClass("bg-primary");
  expect(screen.getByLabelText(/Abrir navegação/i)).toHaveClass("bg-background");
  expect(buttonVariants({ variant: "default" })).toContain("bg-primary");
  expect(buttonVariants({ variant: "secondary" })).toContain("bg-secondary");
});
```

- [ ] **Step 2: Run the focused test and confirm the current shell still fails the new contract**

Run: `cd frontend && npx vitest run src/test/app-shell.test.tsx src/test/theme-shell.test.tsx`
Expected: FAIL because the shell still uses `bg-slate-50`, `bg-white`, and a non-token sidebar surface.

- [ ] **Step 3: Implement the token source of truth and align shell primitives**

Use this shape as the target:

```css
:root {
  --background: #ffffff;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #0088B7;
  --primary-foreground: #ffffff;
  --secondary: #006D92;
  --secondary-foreground: #ffffff;
  --muted: #eff7fa;
  --muted-foreground: #52616b;
  --accent: #dff1f7;
  --accent-foreground: #0f172a;
  --border: #cfe4ec;
  --input: #cfe4ec;
  --ring: #0088B7;
  --sidebar: #ffffff;
  --sidebar-primary: #0088B7;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #eff7fa;
  --sidebar-accent-foreground: #0f172a;
  --chart-1: #0088B7;
  --chart-2: #006D92;
  --chart-3: #57B9D6;
  --chart-4: #B7E2EE;
  --chart-5: #6B7280;
}
```

Update the shell classes to inherit those tokens:

```tsx
<div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[18rem_1fr]">
  <AppSidebar className="hidden md:block" />
  <div className="min-w-0">
    <header className="border-b bg-background px-4 py-3 md:hidden">...</header>
    <Outlet />
  </div>
</div>
```

Use the same token-driven approach in the sidebar, cards, and buttons:

```tsx
isActive
  ? "bg-primary text-primary-foreground shadow-sm"
  : "text-foreground hover:bg-accent hover:text-accent-foreground"
```

If the app keeps its `.dark` theme block, mirror the same semantic palette there so dark mode stays in the same blue family instead of dropping back to the old slate defaults.

- [ ] **Step 4: Re-run the focused test until green**

Run: `cd frontend && npx vitest run src/test/app-shell.test.tsx src/test/theme-shell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit the theme foundation slice**

```bash
git add frontend/src/app/globals.css frontend/src/components/app-shell.tsx frontend/src/components/app-sidebar.tsx frontend/src/components/ui/button.tsx frontend/src/components/ui/card.tsx frontend/src/test/app-shell.test.tsx frontend/src/test/theme-shell.test.tsx
git commit -m "feat(theme): establish blue shell tokens" -m "- Replace slate surfaces with the approved blue brand tokens\n- Align sidebar, cards, and primary actions with the new identity\n- Lock the shell contract with focused tests"
```

### Task 2: Re-theme shared input and content surfaces

**Files:**
- Modify: `frontend/src/components/math-block.tsx`
- Modify: `frontend/src/components/variables-table.tsx`
- Modify: `frontend/src/components/property-table.tsx`
- Modify: `frontend/src/components/number-field.tsx`
- Modify: `frontend/src/components/ui/combobox.tsx`
- Modify: `frontend/src/components/ui/accordion.tsx`
- Modify: `frontend/src/components/ui/slider.tsx`
- Modify: `frontend/src/components/ui/sheet.tsx`
- Modify: `frontend/src/components/ui/sonner.tsx`
- Modify: `frontend/src/components/ui/tooltip.tsx`
- Modify: `frontend/src/components/chart-panel.tsx`
- Create: `frontend/src/test/theme-surfaces.test.tsx`
- Modify: `frontend/src/test/number-field.test.tsx`
- Modify: `frontend/src/test/combobox.test.tsx`
- Modify: `frontend/src/test/property-table.test.tsx`

- [ ] **Step 1: Write the failing surface tests**

```tsx
import { render, screen } from "@testing-library/react";

import { NumberField } from "@/components/number-field";
import { Combobox } from "@/components/ui/combobox";

it("uses token-based neutral surfaces for inputs and popovers", () => {
  render(<NumberField id="flow-rate" label="Vazão" value="12" onChange={() => undefined} />);

  expect(screen.getByRole("spinbutton", { name: /Vazão/i })).toHaveClass("border-border");
  expect(screen.getByRole("spinbutton", { name: /Vazão/i })).toHaveClass("bg-background");
  expect(screen.getByRole("spinbutton", { name: /Vazão/i })).toHaveClass("focus:border-primary");
});

it("renders combobox popovers with the new neutral palette", () => {
  render(
    <Combobox
      label="Componente"
      options={[{ value: "a", label: "A" }]}
      value="a"
      onValueChange={() => undefined}
    />,
  );

  expect(screen.getByRole("combobox")).toHaveClass("border-border");
});
```

- [ ] **Step 2: Run the focused tests and confirm the current surfaces still use the old slate classes**

Run: `cd frontend && npx vitest run src/test/number-field.test.tsx src/test/combobox.test.tsx src/test/property-table.test.tsx src/test/theme-surfaces.test.tsx`
Expected: FAIL because several shared components still hardcode `slate-*` borders, fills, and hover states.

- [ ] **Step 3: Replace hardcoded surface colors with semantic tokens**

Use the same pattern everywhere these components expose visual chrome:

```tsx
className={cn(
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition",
  "focus:border-primary focus:ring-2 focus:ring-primary/20",
  error ? "border-destructive" : null,
)}
```

Apply that pattern to the reusable surfaces so the rest of the app can inherit the theme without duplicating color logic:

```tsx
<div className="rounded-xl border border-border bg-background p-4 shadow-sm" />
<div className="rounded-xl border border-border bg-muted/40 p-3" />
<div className="rounded-2xl border border-border bg-background shadow-sm" />
```

- [ ] **Step 4: Re-run the focused tests until green**

Run: `cd frontend && npx vitest run src/test/number-field.test.tsx src/test/combobox.test.tsx src/test/property-table.test.tsx src/test/theme-surfaces.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit the shared-surface slice**

```bash
git add frontend/src/components/math-block.tsx frontend/src/components/variables-table.tsx frontend/src/components/property-table.tsx frontend/src/components/number-field.tsx frontend/src/components/ui/combobox.tsx frontend/src/components/ui/accordion.tsx frontend/src/components/ui/slider.tsx frontend/src/components/ui/sheet.tsx frontend/src/components/ui/sonner.tsx frontend/src/components/ui/tooltip.tsx frontend/src/components/chart-panel.tsx frontend/src/test/number-field.test.tsx frontend/src/test/combobox.test.tsx frontend/src/test/property-table.test.tsx frontend/src/test/theme-surfaces.test.tsx
git commit -m "style(theme): normalize shared surfaces" -m "- Remove slate-based chrome from shared inputs and display blocks\n- Make popovers, sliders, sheets, and toasts inherit the token palette\n- Keep the reusable data surfaces visually consistent with the shell"
```

### Task 3: Re-theme home, glossary, and exploratory surfaces

**Files:**
- Modify: `frontend/src/features/home/home-page.tsx`
- Modify: `frontend/src/features/glossary/glossary-page.tsx`
- Modify: `frontend/src/features/exploratory/exploratory-panel.tsx`
- Modify: `frontend/src/features/exploratory/scenario-comparison.tsx`
- Modify: `frontend/src/features/exploratory/template-selector.tsx`
- Modify: `frontend/src/features/exploratory/param-slider.tsx`
- Modify: `frontend/src/features/exploratory/guided-steps.tsx`
- Modify: `frontend/src/test/home-page.test.tsx`
- Modify: `frontend/src/test/glossary-page.test.tsx`
- Modify: `frontend/src/test/exploratory-panel.test.tsx`
- Modify: `frontend/src/test/guided-steps.test.tsx`
- Modify: `frontend/src/test/scenario-comparison.test.tsx`
- Modify: `frontend/src/test/template-selector.test.tsx`
- Modify: `frontend/src/test/param-slider.test.tsx`

- [ ] **Step 1: Write the failing page-level theme assertions**

```tsx
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

it("renders the home cards with the new brand-neutral surface classes", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  render(<RouterProvider router={router} />);

  const trail = await screen.findByRole("link", { name: /Transporte de Fluidos/i });
  expect(trail).toHaveClass("border-border");
  expect(trail).toHaveClass("hover:bg-accent");
});

it("renders the glossary search with token-based focus states", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/glossary"] });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("searchbox", { name: /Pesquisar no glossário/i })).toHaveClass("border-border");
});
```

- [ ] **Step 2: Run the focused tests and confirm the current pages still use the old neutral stack**

Run: `cd frontend && npx vitest run src/test/home-page.test.tsx src/test/glossary-page.test.tsx src/test/exploratory-panel.test.tsx src/test/guided-steps.test.tsx src/test/scenario-comparison.test.tsx src/test/template-selector.test.tsx src/test/param-slider.test.tsx`
Expected: FAIL because the current pages still use `slate-*` containers and old hover/focus tokens.

- [ ] **Step 3: Replace page chrome with the approved blue system**

Use this pattern for the home cards and glossary panel:

```tsx
className="rounded-xl border border-border bg-background p-4 transition-colors hover:bg-accent hover:text-accent-foreground"
```

Use this pattern for exploratory blocks and controls:

```tsx
className="rounded-[1.25rem] border border-border bg-gradient-to-b from-white to-muted/40 p-5 shadow-sm"
```

For the glossary search and any embedded text inputs, keep the same token-based input contract from Task 2 so focus and borders feel identical across the app.

- [ ] **Step 4: Re-run the focused tests until green**

Run: `cd frontend && npx vitest run src/test/home-page.test.tsx src/test/glossary-page.test.tsx src/test/exploratory-panel.test.tsx src/test/guided-steps.test.tsx src/test/scenario-comparison.test.tsx src/test/template-selector.test.tsx src/test/param-slider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit the homepage and exploratory slice**

```bash
git add frontend/src/features/home/home-page.tsx frontend/src/features/glossary/glossary-page.tsx frontend/src/features/exploratory/exploratory-panel.tsx frontend/src/features/exploratory/scenario-comparison.tsx frontend/src/features/exploratory/template-selector.tsx frontend/src/features/exploratory/param-slider.tsx frontend/src/features/exploratory/guided-steps.tsx frontend/src/test/home-page.test.tsx frontend/src/test/glossary-page.test.tsx frontend/src/test/exploratory-panel.test.tsx frontend/src/test/guided-steps.test.tsx frontend/src/test/scenario-comparison.test.tsx frontend/src/test/template-selector.test.tsx frontend/src/test/param-slider.test.tsx
git commit -m "style(theme): refresh entry and exploratory views" -m "- Bring home, glossary, and exploratory surfaces onto the blue identity\n- Normalize focus, hover, and card treatments across the first-user paths\n- Preserve the current content and navigation behavior"
```

### Task 4: Re-theme the calculation modules

**Files:**
- Modify: `frontend/src/features/piping/piping-page.tsx`
- Modify: `frontend/src/features/flow/flow-page.tsx`
- Modify: `frontend/src/features/sizing/sizing-page.tsx`
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Modify: `frontend/src/features/reactor/reactor-page.tsx`
- Modify: `frontend/src/features/components/components-page.tsx`
- Modify: `frontend/src/features/balance/balance-page.tsx`
- Modify: `frontend/src/features/exercises/exercises-page.tsx`
- Modify: `frontend/src/test/piping-page.test.tsx`
- Modify: `frontend/src/test/flow-page.test.tsx`
- Modify: `frontend/src/test/sizing-page.test.tsx`
- Modify: `frontend/src/test/pump-page.test.tsx`
- Modify: `frontend/src/test/reactor-page.test.tsx`
- Modify: `frontend/src/test/components-page.test.tsx`
- Modify: `frontend/src/test/balance-page.test.tsx`
- Modify: `frontend/src/test/exercises-page.test.tsx`

- [ ] **Step 1: Write failing assertions that catch the old module chrome**

```tsx
import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

it("renders module pages without slate-based panels", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/flow"] });
  const { container } = render(<RouterProvider router={router} />);

  expect(container.querySelector(".bg-slate-50")).toBeNull();
  expect(container.querySelector(".border-slate-200")).toBeNull();
});
```

- [ ] **Step 2: Run the focused page tests and confirm the current modules still fail the new theme contract**

Run: `cd frontend && npx vitest run src/test/piping-page.test.tsx src/test/flow-page.test.tsx src/test/sizing-page.test.tsx src/test/pump-page.test.tsx src/test/reactor-page.test.tsx src/test/components-page.test.tsx src/test/balance-page.test.tsx src/test/exercises-page.test.tsx`
Expected: FAIL because the module pages still hardcode `slate-*` input borders, result blocks, and section panels.

- [ ] **Step 3: Replace each module's local chrome with semantic tokens**

Use the same local class contract in every page module:

```tsx
const inputClassName =
  "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const resultSectionClassName = "mt-6 rounded-xl border border-border bg-muted/40 p-4";
```

Use that pattern to update the large calculation pages so the user sees one consistent visual language for forms, results, helper notes, and empty states.

- [ ] **Step 4: Re-run the focused tests until green**

Run: `cd frontend && npx vitest run src/test/piping-page.test.tsx src/test/flow-page.test.tsx src/test/sizing-page.test.tsx src/test/pump-page.test.tsx src/test/reactor-page.test.tsx src/test/components-page.test.tsx src/test/balance-page.test.tsx src/test/exercises-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit the calculation-module sweep**

```bash
git add frontend/src/features/piping/piping-page.tsx frontend/src/features/flow/flow-page.tsx frontend/src/features/sizing/sizing-page.tsx frontend/src/features/pump/pump-page.tsx frontend/src/features/reactor/reactor-page.tsx frontend/src/features/components/components-page.tsx frontend/src/features/balance/balance-page.tsx frontend/src/features/exercises/exercises-page.tsx frontend/src/test/piping-page.test.tsx frontend/src/test/flow-page.test.tsx frontend/src/test/sizing-page.test.tsx frontend/src/test/pump-page.test.tsx frontend/src/test/reactor-page.test.tsx frontend/src/test/components-page.test.tsx frontend/src/test/balance-page.test.tsx frontend/src/test/exercises-page.test.tsx
git commit -m "style(theme): align calculation modules" -m "- Remove remaining slate-based forms and result panels from the core modules\n- Reuse the same token-based input and section classes throughout the calculators\n- Keep the calculations and copy unchanged"
```

### Task 5: Rebuild the chart palette and scenario colors

**Files:**
- Modify: `frontend/src/lib/chart.ts`
- Modify: `frontend/src/features/exploratory/types.ts`
- Modify: `frontend/src/components/viz/headloss-curve.tsx`
- Modify: `frontend/src/components/viz/moody-chart.tsx`
- Modify: `frontend/src/components/viz/velocity-profile.tsx`
- Modify: `frontend/src/components/viz/regime-ruler.tsx`
- Modify: `frontend/src/components/viz/head-breakdown-chart.tsx`
- Modify: `frontend/src/components/viz/npsh-gauge.tsx`
- Modify: `frontend/src/components/viz/stream-graph.tsx`
- Modify: `frontend/src/components/viz/levenspiel-chart.tsx`
- Create: `frontend/src/test/chart-theme.test.ts`
- Modify: `frontend/src/test/headloss-curve.test.tsx`
- Modify: `frontend/src/test/moody-chart.test.tsx`
- Modify: `frontend/src/test/velocity-profile.test.ts`
- Modify: `frontend/src/test/regime-ruler.test.tsx`
- Modify: `frontend/src/test/head-breakdown-chart.test.tsx`
- Modify: `frontend/src/test/npsh-gauge.test.tsx`
- Modify: `frontend/src/test/stream-graph.test.tsx`
- Modify: `frontend/src/test/scenario-comparison.test.tsx`
- Modify: `frontend/src/test/use-exploratory.test.ts`

- [ ] **Step 1: Write the failing palette tests**

```ts
import { chartColors } from "@/lib/chart";
import { SCENARIO_COLORS } from "@/features/exploratory/types";

it("keeps the brand blue palette in the chart helpers", () => {
  expect(chartColors.primary).toBe("#0088B7");
  expect(chartColors.secondary).toBe("#006D92");
  expect(SCENARIO_COLORS).toEqual(["#0088B7", "#006D92", "#57B9D6"]);
});
```

Add one chart assertion that reads an SVG stroke directly:

```tsx
const path = container.querySelector("path");
expect(path).toHaveAttribute("stroke", "#0088B7");
```

- [ ] **Step 2: Run the focused chart tests and confirm the current palette still fails**

Run: `cd frontend && npx vitest run src/test/chart-theme.test.ts src/test/headloss-curve.test.tsx src/test/moody-chart.test.tsx src/test/velocity-profile.test.ts src/test/regime-ruler.test.tsx src/test/head-breakdown-chart.test.tsx src/test/npsh-gauge.test.tsx src/test/stream-graph.test.tsx src/test/scenario-comparison.test.tsx src/test/use-exploratory.test.ts`
Expected: FAIL because the current code still mixes `#2563EB`, `#D97706`, `#16A34A`, `#DC2626`, and old neutral grays.

- [ ] **Step 3: Convert chart helpers and chart components to the brand palette**

Use the theme as the source of truth instead of arbitrary hex values:

```ts
export const chartColors = {
  primary: "#0088B7",
  secondary: "#006D92",
  tertiary: "#57B9D6",
  grid: "#D7E7EF",
  axis: "#64748B",
  success: "#2A8FAA",
  warning: "#7DB7C9",
  destructive: "#D1495B",
} as const;
```

Update the scenario palette so exploratory comparisons inherit the same blue family:

```ts
export const SCENARIO_COLORS = ["#0088B7", "#006D92", "#57B9D6"] as const;
```

Then replace the hardcoded chart strokes, fills, grid lines, and legend chips in the SVG and Recharts components with those semantic colors.

- [ ] **Step 4: Re-run the focused chart tests until green**

Run: `cd frontend && npx vitest run src/test/chart-theme.test.ts src/test/headloss-curve.test.tsx src/test/moody-chart.test.tsx src/test/velocity-profile.test.ts src/test/regime-ruler.test.tsx src/test/head-breakdown-chart.test.tsx src/test/npsh-gauge.test.tsx src/test/stream-graph.test.tsx src/test/scenario-comparison.test.tsx src/test/use-exploratory.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the chart palette slice**

```bash
git add frontend/src/lib/chart.ts frontend/src/features/exploratory/types.ts frontend/src/components/viz/headloss-curve.tsx frontend/src/components/viz/moody-chart.tsx frontend/src/components/viz/velocity-profile.tsx frontend/src/components/viz/regime-ruler.tsx frontend/src/components/viz/head-breakdown-chart.tsx frontend/src/components/viz/npsh-gauge.tsx frontend/src/components/viz/stream-graph.tsx frontend/src/components/viz/levenspiel-chart.tsx frontend/src/test/chart-theme.test.ts frontend/src/test/headloss-curve.test.tsx frontend/src/test/moody-chart.test.tsx frontend/src/test/velocity-profile.test.ts frontend/src/test/regime-ruler.test.tsx frontend/src/test/head-breakdown-chart.test.tsx frontend/src/test/npsh-gauge.test.tsx frontend/src/test/stream-graph.test.tsx frontend/src/test/scenario-comparison.test.tsx frontend/src/test/use-exploratory.test.ts
git commit -m "style(theme): rebuild chart palette" -m "- Replace arbitrary chart and scenario colors with the blue brand family\n- Keep chart axes, grids, and markers aligned with the same semantic palette\n- Lock the palette contract with direct SVG and helper tests"
```

### Task 6: Verify the full frontend and close the rollout

**Files:**
- Modify: `frontend/tests/e2e/home.spec.ts`
- Modify: `frontend/tests/e2e/navigation.spec.ts`

- [ ] **Step 1: Add end-to-end assertions for the new identity**

```ts
import { expect, test } from "@playwright/test";

test("home page cards use the blue identity", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('a[href="/piping"]').first()).toHaveClass(/border-border/);
  await expect(page.locator('a[href="/piping"]').first()).toHaveClass(/hover:bg-accent/);
});

test("mobile navigation exposes the primary brand state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Abrir navegação/i })).toHaveClass(/bg-background/);
  await page.getByRole("button", { name: /Abrir navegação/i }).click();
  await expect(page.getByRole("navigation", { name: /Navegação principal/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Glossário$/i })).toBeVisible();
});

test("desktop navigation shows the active route in primary blue", async ({ page }) => {
  await page.goto("/glossary");

  await expect(page.getByRole("link", { name: /^Glossário$/i }).first()).toHaveClass(/bg-primary/);
});
```

- [ ] **Step 2: Run the full validation stack**

Run:

```bash
cd frontend
npm test
npm run build
npm run test:e2e
```

Expected: all unit tests pass, the production build succeeds, and the end-to-end suite confirms the new theme on desktop and mobile.

- [ ] **Step 3: Commit the verification polish**

```bash
git add frontend/tests/e2e/home.spec.ts frontend/tests/e2e/navigation.spec.ts
git commit -m "test(theme): cover the blue identity in e2e" -m "- Assert the new brand classes on home and navigation flows\n- Keep the visual rollout verified on both desktop and mobile viewports"
```
