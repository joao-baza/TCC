# Balance Base + Exploratorio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar a paridade didatica do modulo de balanço no frontend React com acordeão teórico, resultados mais pedagógicos, gráfico de correntes no frontend e painel exploratório funcional para reciclo/purga.

**Architecture:** `balance-page.tsx` continua como dona do estado de componentes, correntes, reações e splits, mas passa a usar primitivos compartilhados (`HowItWorks`, `PropertyTable`, `NumberField`, `ExploratoryPanel`) e um visual local dedicado para comparar as correntes calculadas. O conteúdo didático e o exemplo saem da página principal para arquivos menores, seguindo o mesmo padrão consolidado em `flow`, `pump` e `reactor`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, SVG/frontend local visualization com os componentes compartilhados já existentes.

---

### Task 1: Cobrir a paridade esperada de Balance com testes falhando primeiro

**Files:**
- Modify: `frontend/src/test/balance-page.test.tsx`
- Create: `frontend/src/test/stream-graph.test.tsx`

- [ ] **Step 1: Write the failing integration tests for the restored balance behaviors**

```tsx
it("shows the didactic accordion, loads the worked example, calculates balance and yields, and renders the frontend stream graph", async () => {
  // assert accordion title
  // assert example hydration
  // assert metrics/results/yields
  // assert local stream graph labels and bars
});

it("clears stale balance outputs after dependent input edits", async () => {
  // calculate balance/yields, then edit split or composition and expect outputs/graph to disappear
});

it("shows the exploratory panel and applies the recycle template", async () => {
  // select exploratory template and assert split/composition fields + guided steps
});
```

- [ ] **Step 2: Run the balance-focused tests to verify they fail**

Run: `cd frontend && npx vitest run src/test/balance-page.test.tsx src/test/stream-graph.test.tsx`
Expected: FAIL with missing accordion, missing exploratory wiring, and missing frontend stream graph component.

- [ ] **Step 3: Add a focused visual unit test for the stream graph contract**

```tsx
it("renders streams sorted by flow rate with direction and composition summaries", () => {
  // render graph with a few streams and assert labels/values/visual markers
});
```

- [ ] **Step 4: Re-run the focused chart test and confirm it fails for the missing component**

Run: `cd frontend && npx vitest run src/test/stream-graph.test.tsx`
Expected: FAIL because the stream graph component does not exist yet.

### Task 2: Implement the didactic layer, frontend stream graph, and exploratory wiring

**Files:**
- Create: `frontend/src/components/viz/stream-graph.tsx`
- Create: `frontend/src/features/balance/didactics.tsx`
- Create: `frontend/src/features/balance/presets.ts`
- Modify: `frontend/src/features/balance/balance-page.tsx`
- Modify: `frontend/src/features/exploratory/templates.ts`
- Modify: `frontend/src/test/balance-page.test.tsx`
- Create: `frontend/src/test/stream-graph.test.tsx`

- [ ] **Step 1: Implement the frontend stream graph and didactic helpers**

```tsx
export function StreamGraph(...) {
  // render per-stream bars/lanes from calculated balance results
  // expose labels for direction, flow, and component composition summary
}
```

```tsx
export function BalanceHowItWorks() { /* accordion + formulas + variables tables + references */ }
```

```ts
export const balanceWorkedExample = {
  components: [...],
  streams: [...],
  reactions: [...],
  splits: [...],
};
```

- [ ] **Step 2: Refactor `balance-page.tsx` to use shared primitives and exploratory state**

```tsx
<BalanceHowItWorks />
<ExploratoryPanel config={balanceExploratory} state={...}>
  {(scenarios) => <StreamGraph ... scenarios={scenarios} />}
</ExploratoryPanel>
```

Include:
- local `loadExample` using `balanceWorkedExample`
- stale-state invalidation for balance result, yield result, and stream graph
- frontend stream graph fed by `balanceResult.results`
- exploratory field mapping for recycle fraction and principal component fraction in the loaded example
- exploratory template application that hydrates the example before moving sliders

- [ ] **Step 3: Update `balanceExploratory` to carry the fields needed by the React page**

```ts
fields: {
  "exploratory-template": "simple-separation",
  "split-fraction": "0.5",
  "feed-main-fraction": "0.6",
}
```

Keep the verbatim steps/activity, but bind the slider fields to the actual React page field names used in `balance-page.tsx`.

- [ ] **Step 4: Run the balance-focused tests until they pass**

Run: `cd frontend && npx vitest run src/test/balance-page.test.tsx src/test/stream-graph.test.tsx`
Expected: PASS with balance didactics, local graph, and exploratory template behavior restored.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS with the new balance slice integrated and no regressions.

- [ ] **Step 6: Run the production build**

Run: `cd frontend && npm run build`
Expected: PASS with the balance files included in the Vite build output.

## Self-Review

- Spec coverage: cobre os itens de Balance da spec principal: acordeão, exemplo, gráfico de correntes, reciclo/purga e exploratório.
- Placeholder scan: sem TODO/TBD.
- Type consistency: `balanceWorkedExample`, `StreamGraph` e `balanceExploratory` usam os mesmos nomes de campos esperados pela página.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-balance-base-e-exploratorio.md`. Continuing with inline execution in this session.
