# Reactor Base + Exploratorio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar a paridade didatica do modulo de reatores no frontend React com acordeoes teoricos, exemplo carregavel, visualizacao Levenspiel gerada no frontend e painel exploratorio funcional.

**Architecture:** A pagina `reactor-page.tsx` continua dona do estado de CSTR, PFR e do grafico, mas passa a usar primitivos compartilhados (`HowItWorks`, `NumberField`, `PropertyTable`, `ExploratoryPanel`) e um componente de visualizacao focado em comparar CSTR e PFR a partir dos mesmos parametros cineticos. A logica de presets e textos didaticos sai da pagina principal para arquivos menores, seguindo o padrao ja estabelecido em `flow` e `pump`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, componentes compartilhados do frontend atual.

---

### Task 1: Cobrir a paridade esperada de Reactor com testes falhando primeiro

**Files:**
- Modify: `frontend/src/test/reactor-page.test.tsx`
- Create: `frontend/src/test/levenspiel-chart.test.tsx`

- [ ] **Step 1: Write the failing integration tests for the restored reactor behaviors**

```tsx
it("shows the didactic accordions, loads the worked example, calculates CSTR/PFR, and renders the frontend Levenspiel view", async () => {
  // assert accordion titles
  // load example and assert key fields
  // submit CSTR and PFR
  // assert result tables
  // assert Levenspiel chart labels and operational markers
});

it("clears stale reactor results when dependent fields change", async () => {
  // calculate once, then edit conversion/rate constant and expect results/chart to disappear
});

it("shows the exploratory panel and applies the first-order template", async () => {
  // select template, assert mirrored fields for CSTR/PFR/plot and guided steps
});
```

- [ ] **Step 2: Run the reactor tests to verify they fail for the missing parity behaviors**

Run: `cd frontend && npx vitest run src/test/reactor-page.test.tsx src/test/levenspiel-chart.test.tsx`
Expected: FAIL with missing accordion assertions, missing exploratory wiring, or missing frontend Levenspiel rendering.

- [ ] **Step 3: Add a focused visual unit test for the chart contract**

```tsx
it("plots sorted conversion points and operational markers for CSTR and PFR", () => {
  // render chart with two series and assert labels/markers are present
});
```

- [ ] **Step 4: Re-run the focused tests and confirm the same intended failures**

Run: `cd frontend && npx vitest run src/test/levenspiel-chart.test.tsx`
Expected: FAIL because the chart component does not exist yet.

### Task 2: Implement the didactic content, chart, and exploratory wiring for Reactor

**Files:**
- Create: `frontend/src/components/viz/levenspiel-chart.tsx`
- Create: `frontend/src/features/reactor/didactics.tsx`
- Create: `frontend/src/features/reactor/presets.ts`
- Modify: `frontend/src/features/reactor/reactor-page.tsx`
- Modify: `frontend/src/test/reactor-page.test.tsx`
- Create: `frontend/src/test/levenspiel-chart.test.tsx`

- [ ] **Step 1: Implement the frontend Levenspiel chart and pedagogic helpers**

```tsx
export function LevenspielChart(...) {
  // render CSTR and PFR series from computed points
  // render operational conversion markers
  // optionally overlay saved exploratory scenarios
}
```

```tsx
export function CstrHowItWorks() { /* accordion + KaTeX + variables table */ }
export function PfrHowItWorks() { /* accordion + KaTeX + variables table */ }
```

```ts
export const reactorWorkedExample = {
  cstr: { ... },
  pfr: { ... },
  plot: { maxConversion: "0.95" },
};
```

- [ ] **Step 2: Refactor `reactor-page.tsx` to use shared primitives and exploratory state**

```tsx
<CstrHowItWorks />
<PfrHowItWorks />
<ExploratoryPanel config={reactorExploratory} state={...}>
  {(scenarios) => <LevenspielChart ... scenarios={scenarios} />}
</ExploratoryPanel>
```

Include:
- local helpers to derive chart points from the current kinetic inputs
- example loading via `reactorWorkedExample`
- stale-state invalidation for CSTR, PFR, and chart outputs
- chart generation from frontend data while keeping the backend plot request stable if still needed for parity support

- [ ] **Step 3: Run the reactor-focused tests until they pass**

Run: `cd frontend && npx vitest run src/test/reactor-page.test.tsx src/test/levenspiel-chart.test.tsx`
Expected: PASS with the restored reactor didactics, chart, and exploratory template behavior.

- [ ] **Step 4: Run the broader frontend validation**

Run: `cd frontend && npm test`
Expected: PASS with the reactor slice integrated without regressions.

- [ ] **Step 5: Run the production build**

Run: `cd frontend && npm run build`
Expected: PASS with the new reactor files included in the Vite bundle.

## Self-Review

- Spec coverage: cobre os itens de Reactor da spec principal: acordeoes, exemplo, visualizacao Levenspiel, exploratorio e testes.
- Placeholder scan: sem TODO/TBD.
- Type consistency: `reactorWorkedExample`, `LevenspielChart` e `reactorExploratory` usam os mesmos nomes de campos esperados pela pagina.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-reactor-base-e-exploratorio.md`. Continuing with the previously selected execution mode:

**1. Subagent-Driven (selected)** - execute task-by-task with implementation plus review loops in this session.
