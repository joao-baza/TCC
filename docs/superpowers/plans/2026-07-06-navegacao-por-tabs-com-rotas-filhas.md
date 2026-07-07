# Navegação por tabs com rotas filhas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** transformar as telas principais do DCOU em navegação por tabs com rotas filhas, preservando estado entre abas, refletindo a aba ativa na URL e mantendo `back`/`forward` funcional.

**Architecture:** a navegação de cada módulo passa a ser controlada por um shell próprio com `Outlet`, tabs como links de rota e estado do formulário mantido no nível do módulo, não no painel isolado. Cada módulo terá um arquivo de configuração de tabs para centralizar ordem, label e rota filha, e o router principal vai redirecionar a rota pai para a tab padrão.  
As telas densas continuam com o mesmo conteúdo técnico, mas só uma seção principal fica visível por vez.

**Tech Stack:** React, `react-router-dom`, TypeScript, Vite, Vitest, Playwright, shadcn/ui, os componentes já existentes em `frontend/src/components/**`.

---

### Task 1: Route Shell and Tab Routing Foundation

**Files:**
- Modify: `frontend/src/app/router.tsx`
- Create: `frontend/src/components/module-tabs-layout.tsx`
- Create: `frontend/src/test/module-tabs-layout.test.tsx`

- [ ] **Step 1: Write the failing router tests**

Create a Vitest file that boots the router with `createMemoryRouter` and asserts:

```tsx
it("redirects /piping to /piping/compositions", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
  render(<RouterProvider router={router} />);

  await waitFor(() => expect(router.state.location.pathname).toBe("/piping/compositions"));
  expect(screen.getByRole("tab", { selected: true })).toHaveTextContent("Composições");
});

it("keeps the active tab in sync with the URL", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/sizing/real-diameter"] });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("tab", { selected: true })).toHaveTextContent("Diâmetro Real");
  expect(screen.getByRole("tabpanel")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest frontend/src/test/module-tabs-layout.test.tsx -v`

Expected: fail because the router still exposes only the parent routes.

- [ ] **Step 3: Implement the shared module shell and nested route shape**

Build `ModuleTabsLayout` around the existing design system and wire the router so every module uses nested routes.

```tsx
// frontend/src/components/module-tabs-layout.tsx
export function ModuleTabsLayout({
  title,
  subtitle,
  tabs,
}: {
  title: string;
  subtitle?: React.ReactNode;
  tabs: Array<{ to: string; label: string }>;
}) {
  return (
    <section className="space-y-6 p-6 md:p-8">
      <Card>
        <CardHeader level={1} title={title} subtitle={subtitle} variant="hero" />
      </Card>

      <div className="w-full border-b">
        <nav aria-label={title} className="flex w-full gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                [
                  "whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </section>
  );
}
```

Router shape to introduce:

```tsx
{
  path: "piping",
  element: <PipingPage />,
  children: [
    { index: true, element: <Navigate to="compositions" replace /> },
    { path: "compositions", element: <PipingCompositionsTab /> },
    { path: "schedules-diameters", element: <PipingSchedulesDiametersTab /> },
    { path: "connections", element: <PipingConnectionsTab /> },
  ],
}
```

Do the same pattern for every module route in `frontend/src/app/router.tsx`.

- [ ] **Step 4: Run the targeted tests**

Run:

```bash
pnpm vitest frontend/src/test/module-tabs-layout.test.tsx frontend/src/test/app-shell.test.tsx -v
pnpm vitest frontend/src/test/home-page.test.tsx -v
```

Expected: pass with the new nested router behavior and no regression in the app shell bootstrap.

- [ ] **Step 5: Commit the routing foundation**

```bash
git add frontend/src/app/router.tsx frontend/src/components/module-tabs-layout.tsx frontend/src/test/module-tabs-layout.test.tsx
git commit -m "feat(frontend): add route-backed tab shell" -m "- Introduce a shared module tabs layout\n- Redirect parent module routes to default child tabs\n- Add router tests for deep links and active tab sync"
```

---

### Task 2: Piping and Sizing Migration

**Files:**
- Modify: `frontend/src/features/piping/piping-page.tsx`
- Create: `frontend/src/features/piping/piping-tabs.ts`
- Create: `frontend/src/features/piping/piping-compositions-tab.tsx`
- Create: `frontend/src/features/piping/piping-schedules-diameters-tab.tsx`
- Create: `frontend/src/features/piping/piping-connections-tab.tsx`
- Modify: `frontend/src/test/piping-page.test.tsx`
- Modify: `frontend/tests/e2e/piping.spec.ts`
- Modify: `frontend/src/features/sizing/sizing-page.tsx`
- Create: `frontend/src/features/sizing/sizing-tabs.ts`
- Create: `frontend/src/features/sizing/sizing-calculated-diameter-tab.tsx`
- Create: `frontend/src/features/sizing/sizing-real-diameter-tab.tsx`
- Create: `frontend/src/features/sizing/sizing-exploratory-tab.tsx`
- Modify: `frontend/src/test/sizing-page.test.tsx`
- Modify: `frontend/tests/e2e/sizing.spec.ts`

- [ ] **Step 1: Write failing page tests for route children and state persistence**

Add Vitest coverage that boots each page at a child route and verifies the shell renders the right tab while preserving form values after navigation.

Examples to cover:

```tsx
it("keeps piping composition selection after switching tabs", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/piping/compositions"] });
  render(<RouterProvider router={router} />);

  await userEvent.selectOptions(screen.getByLabelText("Composição"), "PVC");
  await userEvent.click(screen.getByRole("link", { name: "Schedules e Diâmetros" }));
  await userEvent.click(screen.getByRole("link", { name: "Composições" }));

  expect(screen.getByLabelText("Composição")).toHaveValue("PVC");
});

it("keeps sizing inputs when moving between calculated, real and exploratory tabs", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/sizing/calculated-diameter"] });
  render(<RouterProvider router={router} />);

  await userEvent.type(screen.getByLabelText("Vazão"), "0.01");
  await userEvent.type(screen.getByLabelText("Velocidade de projeto"), "1.5");
  await userEvent.click(screen.getByRole("link", { name: "Modo Exploratório" }));
  await userEvent.click(screen.getByRole("link", { name: "Diâmetro Calculado" }));

  expect(screen.getByLabelText("Vazão")).toHaveValue("0.01");
  expect(screen.getByLabelText("Velocidade de projeto")).toHaveValue("1.5");
});
```

- [ ] **Step 2: Run the tests and confirm the current flat pages fail the deep-link cases**

Run:

```bash
pnpm vitest frontend/src/test/piping-page.test.tsx frontend/src/test/sizing-page.test.tsx -v
```

Expected: fail on the new child-route assertions before the refactor.

- [ ] **Step 3: Split each page into a shell plus child tab components**

Refactor `piping-page.tsx` and `sizing-page.tsx` so the shell owns state and each tab becomes its own route component.

Recommended extraction shape:

```tsx
// piping
export function PipingPage() {
  return (
    <ModuleTabsLayout
      title="Tubulações"
      subtitle="Consulte materiais, schedules, diâmetros nominais e conexões usadas nos módulos hidráulicos da aplicação."
      tabs={pipingTabs}
    />
  );
}
```

```tsx
// sizing
export function SizingPage() {
  return (
    <ModuleTabsLayout
      title="Dimensionamento"
      subtitle="Calcule o diâmetro hidráulico a partir da vazão e da velocidade de projeto e selecione o próximo diâmetro comercial do schedule adotado."
      tabs={sizingTabs}
    />
  );
}
```

Keep the current request/session guards, `notify` behavior and `ExploratoryPanel` wiring intact. Only move the layout boundary.

- [ ] **Step 4: Run the targeted module tests and the e2e coverage**

Run:

```bash
pnpm vitest frontend/src/test/piping-page.test.tsx frontend/src/test/sizing-page.test.tsx -v
pnpm playwright test frontend/tests/e2e/piping.spec.ts frontend/tests/e2e/sizing.spec.ts
```

Expected: pass with the new child routes and preserved state.

- [ ] **Step 5: Commit the module migration**

```bash
git add frontend/src/features/piping frontend/src/features/sizing frontend/src/test/piping-page.test.tsx frontend/src/test/sizing-page.test.tsx frontend/tests/e2e/piping.spec.ts frontend/tests/e2e/sizing.spec.ts
git commit -m "feat(frontend): tabify piping and sizing" -m "- Move piping and sizing sections to child routes\n- Preserve form state across tab switches\n- Add route-based tests for deep links and history"
```

---

### Task 3: Flow, Pump, and Components Migration

**Files:**
- Modify: `frontend/src/features/flow/flow-page.tsx`
- Create: `frontend/src/features/flow/flow-tabs.ts`
- Create: `frontend/src/features/flow/flow-reynolds-tab.tsx`
- Create: `frontend/src/features/flow/flow-friction-factor-tab.tsx`
- Create: `frontend/src/features/flow/flow-hydraulic-diameter-tab.tsx`
- Modify: `frontend/src/test/flow-page.test.tsx`
- Modify: `frontend/tests/e2e/flow.spec.ts`
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Create: `frontend/src/features/pump/pump-tabs.ts`
- Create: `frontend/src/features/pump/pump-headloss-tab.tsx`
- Create: `frontend/src/features/pump/pump-npsh-tab.tsx`
- Create: `frontend/src/features/pump/pump-head-tab.tsx`
- Create: `frontend/src/features/pump/pump-pressure-profile-tab.tsx`
- Modify: `frontend/src/test/pump-page.test.tsx`
- Modify: `frontend/tests/e2e/pump.spec.ts`
- Modify: `frontend/src/features/components/components-page.tsx`
- Create: `frontend/src/features/components/components-tabs.ts`
- Create: `frontend/src/features/components/components-critical-properties-tab.tsx`
- Create: `frontend/src/features/components/components-pure-fluid-tab.tsx`
- Create: `frontend/src/features/components/components-state-properties-tab.tsx`
- Create: `frontend/src/features/components/components-mixtures-tab.tsx`
- Create: `frontend/src/features/components/components-ternary-diagram-tab.tsx`
- Create: `frontend/src/features/components/components-binary-vle-tab.tsx`
- Create: `frontend/src/features/components/components-mccabe-thiele-tab.tsx`
- Create: `frontend/src/features/components/components-property-surface-tab.tsx`
- Create: `frontend/src/features/components/components-phase-envelope-tab.tsx`
- Modify: `frontend/src/test/components-page.test.tsx`
- Modify: `frontend/tests/e2e/components.spec.ts`

- [ ] **Step 1: Write failing tests for one representative child route in each module**

Add one route-deep-link test per module:

```tsx
it("opens flow on the Reynolds tab", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/flow/reynolds"] });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: /Número de Reynolds/i })).toBeVisible();
});

it("opens pump on the NPSH tab", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/pump/npsh"] });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: /NPSH Disponível/i })).toBeVisible();
});

it("opens components on the binary VLE tab", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/components/binary-vle"] });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: /Diagrama T-x-y \/ y-x/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the tests and confirm the current single-page layout still fails the child-route assertions**

Run:

```bash
pnpm vitest frontend/src/test/flow-page.test.tsx frontend/src/test/pump-page.test.tsx frontend/src/test/components-page.test.tsx -v
```

- [ ] **Step 3: Extract the page sections into route children**

Keep the existing calculation logic, API calls, charts and notifications. Move only the section boundaries.

For `Components`, preserve the current visualizations and split them into child routes in the same order that the page currently presents them:

1. `Propriedades Críticas`
2. `Fluido Puro`
3. `Propriedades por Estado`
4. `Misturas`
5. `Diagrama Ternário`
6. `Diagrama T-x-y / y-x`
7. `McCabe-Thiele`
8. `Superfície de Propriedades`
9. `Envelope de Fase`

The same rule applies to Flow and Pump: one route per current major card.

- [ ] **Step 4: Run the targeted tests and e2e navigation checks**

Run:

```bash
pnpm vitest frontend/src/test/flow-page.test.tsx frontend/src/test/pump-page.test.tsx frontend/src/test/components-page.test.tsx -v
pnpm playwright test frontend/tests/e2e/flow.spec.ts frontend/tests/e2e/pump.spec.ts frontend/tests/e2e/components.spec.ts
```

- [ ] **Step 5: Commit the migration**

```bash
git add frontend/src/features/flow frontend/src/features/pump frontend/src/features/components frontend/src/test/flow-page.test.tsx frontend/src/test/pump-page.test.tsx frontend/src/test/components-page.test.tsx frontend/tests/e2e/flow.spec.ts frontend/tests/e2e/pump.spec.ts frontend/tests/e2e/components.spec.ts
git commit -m "feat(frontend): route flow pump and components tabs" -m "- Move major sections to child routes\n- Preserve existing visualizations and calculations\n- Add route-deep-link coverage for the new tabs"
```

---

### Task 4: Reactor, Balance, and Glossary Migration

**Files:**
- Modify: `frontend/src/features/reactor/reactor-page.tsx`
- Create: `frontend/src/features/reactor/reactor-tabs.ts`
- Create: `frontend/src/features/reactor/reactor-calculations-tab.tsx`
- Create: `frontend/src/features/reactor/reactor-cstr-tab.tsx`
- Create: `frontend/src/features/reactor/reactor-pfr-tab.tsx`
- Create: `frontend/src/features/reactor/reactor-arrhenius-tab.tsx`
- Modify: `frontend/src/test/reactor-page.test.tsx`
- Modify: `frontend/tests/e2e/calculations.spec.ts`
- Modify: `frontend/src/features/balance/balance-page.tsx`
- Create: `frontend/src/features/balance/balance-tabs.ts`
- Create: `frontend/src/features/balance/balance-components-tab.tsx`
- Create: `frontend/src/features/balance/balance-actions-tab.tsx`
- Create: `frontend/src/features/balance/balance-streams-tab.tsx`
- Create: `frontend/src/features/balance/balance-reactions-tab.tsx`
- Create: `frontend/src/features/balance/balance-splits-recycle-tab.tsx`
- Create: `frontend/src/features/balance/balance-results-tab.tsx`
- Create: `frontend/src/features/balance/balance-yields-tab.tsx`
- Modify: `frontend/src/test/balance-page.test.tsx`
- Modify: `frontend/tests/e2e/balance.spec.ts`
- Modify: `frontend/src/features/glossary/glossary-page.tsx`
- Create: `frontend/src/features/glossary/glossary-tabs.ts`
- Modify: `frontend/src/test/glossary-page.test.tsx`
- Modify: `frontend/tests/e2e/glossary.spec.ts`

- [ ] **Step 1: Write failing tests for deep links and preserved state**

Examples:

```tsx
it("opens reactor on the PFR tab", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/reactor/pfr"] });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: /PFR/i })).toBeVisible();
});

it("opens balance on the recycle tab", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/balance/splits-recycle"] });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: /Splits \/ Reciclo/i })).toBeVisible();
});

it("filters glossary entries by category route", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/glossary/reactors"] });
  render(<RouterProvider router={router} />);
  expect(screen.getByText(/CSTR/i)).toBeVisible();
  expect(screen.queryByText(/Número de Reynolds/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests and confirm the current pages fail on child routes**

Run:

```bash
pnpm vitest frontend/src/test/reactor-page.test.tsx frontend/src/test/balance-page.test.tsx frontend/src/test/glossary-page.test.tsx -v
```

- [ ] **Step 3: Refactor the dense modules into route shells**

For `Reactor`, keep the existing `CSTR`, `PFR`, `Arrhenius` and calculation helpers intact, but move the four visible blocks to child routes.

For `Balance`, move the current large blocks to route children in the same order that users see today so the exploration flow stays familiar.

For `Glossary`, keep the search input in the shell, but filter the already loaded data by the active category route so `/glossary/reactors` and `/glossary/balance` are linkable directly.

- [ ] **Step 4: Run the targeted tests and e2e coverage**

Run:

```bash
pnpm vitest frontend/src/test/reactor-page.test.tsx frontend/src/test/balance-page.test.tsx frontend/src/test/glossary-page.test.tsx -v
pnpm playwright test frontend/tests/e2e/calculations.spec.ts frontend/tests/e2e/balance.spec.ts frontend/tests/e2e/glossary.spec.ts
```

- [ ] **Step 5: Commit the dense-module migration**

```bash
git add frontend/src/features/reactor frontend/src/features/balance frontend/src/features/glossary frontend/src/test/reactor-page.test.tsx frontend/src/test/balance-page.test.tsx frontend/src/test/glossary-page.test.tsx frontend/tests/e2e/calculations.spec.ts frontend/tests/e2e/balance.spec.ts frontend/tests/e2e/glossary.spec.ts
git commit -m "feat(frontend): route reactor balance and glossary tabs" -m "- Turn dense module sections into child routes\n- Preserve active search and calculation state\n- Add deep-link coverage for the new route hierarchy"
```

---

### Task 5: Exercises Migration and Final Navigation Sweep

**Files:**
- Modify: `frontend/src/features/exercises/exercises-page.tsx`
- Create: `frontend/src/features/exercises/exercises-tabs.ts`
- Create: `frontend/src/features/exercises/runner-shell.tsx`
- Create: `frontend/src/features/exercises/heat-exchanger-runner.tsx`
- Create: `frontend/src/features/exercises/rankine-runner.tsx`
- Create: `frontend/src/features/exercises/balance-simple-runner.tsx`
- Create: `frontend/src/features/exercises/balance-recycle-runner.tsx`
- Create: `frontend/src/features/exercises/balance-purge-runner.tsx`
- Modify: `frontend/src/test/exercises-page.test.tsx`
- Modify: `frontend/tests/e2e/exercises.spec.ts`
- Modify: `frontend/tests/e2e/navigation.spec.ts`

- [ ] **Step 1: Write failing tests for catalog and runner routes**

Add route-deep-link coverage for the catalogue and for at least one guided runner:

```tsx
it("opens the exercises catalog from the child route", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/exercises/catalog"] });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: /Catálogo legado de exercícios/i })).toBeVisible();
});

it("opens the heat exchanger runner from its child route", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/exercises/heat-exchanger"] });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: /Runner guiado/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the tests and confirm the current monolithic page fails the child-route cases**

Run:

```bash
pnpm vitest frontend/src/test/exercises-page.test.tsx -v
```

- [ ] **Step 3: Split the exercises page into a route shell and runner components**

Keep the current state machine for each exercise family, but move the runner-specific JSX into dedicated child components. The shell should only select the active runner by route and preserve shared state while the user moves within the exercises area.

This is the largest refactor in the plan, so keep the migration conservative:

- preserve step counts;
- preserve current result text;
- preserve completion state;
- preserve the current catalogue view.

- [ ] **Step 4: Run the full navigation and module suite**

Run:

```bash
pnpm vitest frontend/src/test/module-tabs-layout.test.tsx frontend/src/test/piping-page.test.tsx frontend/src/test/sizing-page.test.tsx frontend/src/test/flow-page.test.tsx frontend/src/test/pump-page.test.tsx frontend/src/test/components-page.test.tsx frontend/src/test/reactor-page.test.tsx frontend/src/test/balance-page.test.tsx frontend/src/test/glossary-page.test.tsx frontend/src/test/exercises-page.test.tsx -v
pnpm playwright test frontend/tests/e2e/navigation.spec.ts frontend/tests/e2e/piping.spec.ts frontend/tests/e2e/sizing.spec.ts frontend/tests/e2e/flow.spec.ts frontend/tests/e2e/pump.spec.ts frontend/tests/e2e/components.spec.ts frontend/tests/e2e/calculations.spec.ts frontend/tests/e2e/balance.spec.ts frontend/tests/e2e/glossary.spec.ts frontend/tests/e2e/exercises.spec.ts
```

Expected: all navigation and module-route checks pass, including back/forward, deep links and state retention.

- [ ] **Step 5: Commit the exercises migration and final sweep**

```bash
git add frontend/src/features/exercises frontend/src/test/exercises-page.test.tsx frontend/tests/e2e/exercises.spec.ts frontend/tests/e2e/navigation.spec.ts
git commit -m "feat(frontend): route exercises through child tabs" -m "- Move exercises into route-backed runners and catalog\n- Keep guided step state across tab changes\n- Update navigation coverage for the final route map"
```

---

### Final Verification

After all five tasks, run one last pass before handoff:

```bash
pnpm vitest -v
pnpm playwright test
```

Expected:

- no route regressions in the sidebar or home page;
- each module opens directly on its child route;
- tab switches keep form state;
- browser history works consistently across modules.
