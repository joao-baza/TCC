# Padronização de Resultados em Tabela no Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify result rendering in the frontend behind a reusable table section and a single number-formatting rule that keeps very small and very large values readable.

**Architecture:** Add a table-only number formatter that emits math-safe output for `PropertyTable`, then wrap result tables in one shared frontend component for title, spacing, and empty state. Migrate the pages that still render result cards or `dl/dd` blocks to that wrapper, leaving backend contracts untouched.

**Tech Stack:** React, TypeScript, Vitest, Playwright, Tailwind CSS, KaTeX/InlineMath.

---

## File Structure

- `frontend/src/lib/table-number.ts`: shared formatter for table values only, including scientific notation thresholds.
- `frontend/src/components/property-table.tsx`: render `PropertyTable` values through the new formatter and keep the table contract intact.
- `frontend/src/components/result-table-section.tsx`: reusable result wrapper that standardizes title, spacing, empty state, and the embedded `PropertyTable`.
- `frontend/src/features/components/components-page.tsx`: migrate `/components` result blocks off `dl/dd` cards and onto the shared wrapper.
- `frontend/src/features/flow/flow-page.tsx`, `frontend/src/features/pump/pump-page.tsx`, `frontend/src/features/sizing/sizing-page.tsx`, `frontend/src/features/reactor/reactor-page.tsx`: replace local result wrappers with the shared wrapper where they already render `PropertyTable`.
- `frontend/src/test/table-number.test.ts`: unit coverage for the scientific-notation cutoff and mantissa precision.
- `frontend/src/test/property-table.test.tsx`: adjust rendering assertions for the new table-number formatter.
- `frontend/src/test/result-table-section.test.tsx`: cover empty and populated wrapper states.
- `frontend/src/test/components-page.test.tsx`: verify `/components` still renders the expected results after the migration.

---

### Task 1: Add a table-only number formatter

**Files:**
- Create: `frontend/src/lib/table-number.ts`
- Modify: `frontend/src/components/property-table.tsx`
- Test: `frontend/src/test/table-number.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { formatTableValueLatex } from "@/lib/table-number";

describe("formatTableValueLatex", () => {
  it("uses decimal formatting for normal values", () => {
    expect(formatTableValueLatex(126.16)).toBe("\\text{126,16}");
    expect(formatTableValueLatex(0)).toBe("\\text{0}");
  });

  it("uses scientific notation for very small and very large values", () => {
    expect(formatTableValueLatex(0.00008949025483876957)).toBe(
      "\\text{8,94903} \\times 10^{-5}",
    );
    expect(formatTableValueLatex(1234567)).toBe("\\text{1,23457} \\times 10^{6}");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd frontend && npm test -- src/test/table-number.test.ts`

Expected: failure because `frontend/src/lib/table-number.ts` does not exist yet.

- [ ] **Step 3: Implement the formatter and wire it into `PropertyTable`**

Create the new helper with the actual cutoff logic:

```ts
const SCIENTIFIC_LOWER_BOUND = 1e-4;
const SCIENTIFIC_UPPER_BOUND = 1e5;

function escapeLatexText(value: string) {
  return value.replace(/([\\{}#$%&_~^])/g, "\\$1");
}

function formatScientificMantissa(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 5,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(value);
}

export function formatTableValueLatex(value: number | string | null) {
  if (value === null) {
    return "\\text{—}";
  }

  if (typeof value === "string") {
    return `\\text{${escapeLatexText(value)}}`;
  }

  if (!Number.isFinite(value)) {
    return `\\text{${String(value)}}`;
  }

  if (value === 0) {
    return "\\text{0}";
  }

  const absValue = Math.abs(value);
  if (absValue < SCIENTIFIC_LOWER_BOUND || absValue >= SCIENTIFIC_UPPER_BOUND) {
    const [mantissa, exponent] = value.toExponential(5).split("e");
    return `\\text{${formatScientificMantissa(Number(mantissa))}} \\times 10^{${Number(exponent)}}`;
  }

  return `\\text{${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(value)}}`;
}
```

Update `PropertyTable` so `ValueMath` renders the helper output directly with `InlineMath`, and keep the unit column unchanged:

```tsx
function ValueMath({ value }: { value: number | string | null }) {
  return <InlineMath math={formatTableValueLatex(value)} />;
}
```

- [ ] **Step 4: Run the targeted tests and confirm pass**

Run: `cd frontend && npm test -- src/test/table-number.test.ts src/test/property-table.test.tsx`

Expected: `PASS` for both suites, with the value cell still using KaTeX.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/table-number.ts frontend/src/components/property-table.tsx frontend/src/test/table-number.test.ts frontend/src/test/property-table.test.tsx
git commit -m "feat(frontend): add scientific table number formatting"
```

---

### Task 2: Add a reusable result table wrapper

**Files:**
- Create: `frontend/src/components/result-table-section.tsx`
- Test: `frontend/src/test/result-table-section.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";

import { ResultTableSection } from "@/components/result-table-section";

describe("ResultTableSection", () => {
  it("renders the table when rows are present", () => {
    render(
      <ResultTableSection
        title="Resultado"
        emptyLabel="Sem resultado"
        rows={[{ label: "Diâmetro", value: 12.3, units: "millimeter" }]}
      />,
    );

    expect(screen.getByText("Resultado")).toBeInTheDocument();
    expect(screen.getByText("Diâmetro")).toBeInTheDocument();
    expect(screen.queryByText("Sem resultado")).not.toBeInTheDocument();
  });

  it("shows an empty state when rows are missing", () => {
    render(<ResultTableSection title="Resultado" emptyLabel="Sem resultado" rows={[]} />);

    expect(screen.getByText("Sem resultado")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd frontend && npm test -- src/test/result-table-section.test.tsx`

Expected: failure because the component does not exist yet.

- [ ] **Step 3: Implement the wrapper**

Create a small presentational component that only knows about title, rows, and empty state:

```tsx
type ResultTableSectionProps = {
  title: string;
  emptyLabel: string;
  rows: PropertyRow[];
};

export function ResultTableSection({ title, emptyLabel, rows }: ResultTableSectionProps) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {rows.length > 0 ? (
        <PropertyTable rows={rows} />
      ) : (
        <p className="mt-3 text-sm text-slate-600">{emptyLabel}</p>
      )}
    </div>
  );
}
```

Keep it free of domain logic and keep the `PropertyTable` contract intact.

- [ ] **Step 4: Run the targeted test and confirm pass**

Run: `cd frontend && npm test -- src/test/result-table-section.test.tsx`

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/result-table-section.tsx frontend/src/test/result-table-section.test.tsx
git commit -m "feat(frontend): add reusable result table section"
```

---

### Task 3: Migrate calculation pages to the shared wrapper

**Files:**
- Modify: `frontend/src/features/flow/flow-page.tsx`
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Modify: `frontend/src/features/sizing/sizing-page.tsx`
- Modify: `frontend/src/features/reactor/reactor-page.tsx`

- [ ] **Step 1: Replace the local result wrappers with the shared component**

Use `ResultTableSection` in place of the current `ResultSummary` / `ReactorResultPanel` wrappers.

Example replacement shape:

```tsx
<ResultTableSection
  title="Resultado"
  emptyLabel="Execute o cálculo para visualizar o resultado."
  rows={
    result
      ? [{ label, value: result.value, units: result.units }]
      : []
  }
/>
```

For the reactor page, keep the error handling where it already lives and only swap the successful result rendering into the shared wrapper.

- [ ] **Step 2: Remove the duplicated local wrapper markup**

Delete the old local wrapper functions once all call sites use `ResultTableSection`.

That includes the repeated card, title, and empty-state markup in each file, but not unrelated form or chart code.

- [ ] **Step 3: Run the feature tests that cover those pages**

Run:

```bash
cd frontend && npm test -- src/test/flow-page.test.tsx src/test/pump-page.test.tsx src/test/sizing-page.test.tsx src/test/reactor-page.test.tsx
```

Expected: `PASS`, with no regressions in the calculation flows.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/flow/flow-page.tsx frontend/src/features/pump/pump-page.tsx frontend/src/features/sizing/sizing-page.tsx frontend/src/features/reactor/reactor-page.tsx
git commit -m "refactor(frontend): reuse result table section"
```

---

### Task 4: Migrate `/components` result blocks to the shared wrapper

**Files:**
- Modify: `frontend/src/features/components/components-page.tsx`
- Modify: `frontend/src/test/components-page.test.tsx`

- [ ] **Step 1: Replace the `dl/dd` result blocks with table rows**

Convert the critical properties, pure-fluid properties, state properties, and mixture property results to `PropertyTable` rows, then render them through `ResultTableSection`.

Example:

```tsx
const criticalRows = formatCriticalProperties(criticalResult);

<ResultTableSection
  title="Propriedades Críticas"
  emptyLabel="Selecione um fluido e execute o cálculo para ver o resultado."
  rows={criticalRows.map(({ key, label, value, units }) => ({
    label,
    value,
    units,
  }))}
/>
```

Keep the mixture composition chips as a separate visual block, but make the property result itself use the same table format as the other cards.

- [ ] **Step 2: Add or adjust the page test for the new rendering**

Use the existing `components-page` test file to assert that the representative result still renders after the migration and that a small value no longer collapses to zero.

```tsx
expect(screen.getByText(/Temperatura crítica/i)).toBeInTheDocument();
expect(screen.getByText(/Pressão do ponto triplo/i)).toBeInTheDocument();
expect(screen.getByText("8,94903")).toBeInTheDocument();
```

The exact selector can stay resilient, but the test should prove the table format and the scientific-notation cutoff are both visible in `/components`.

- [ ] **Step 3: Run the page test**

Run: `cd frontend && npm test -- src/test/components-page.test.tsx`

Expected: `PASS`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/components/components-page.tsx frontend/src/test/components-page.test.tsx
git commit -m "feat(frontend): standardize component results"
```

---

### Task 5: Verify the full frontend surface

**Files:**
- Modify only if a regression is found in: `frontend/src/test/property-table.test.tsx`, `frontend/src/test/result-table-section.test.tsx`, `frontend/src/test/components-page.test.tsx`, `frontend/src/test/flow-page.test.tsx`, `frontend/src/test/pump-page.test.tsx`, `frontend/src/test/sizing-page.test.tsx`, `frontend/src/test/reactor-page.test.tsx`, `frontend/tests/e2e/components.spec.ts`

- [ ] **Step 1: Run the focused frontend test set**

Run:

```bash
cd frontend && npm test -- src/test/table-number.test.ts src/test/property-table.test.tsx src/test/result-table-section.test.tsx src/test/components-page.test.tsx src/test/flow-page.test.tsx src/test/pump-page.test.tsx src/test/sizing-page.test.tsx src/test/reactor-page.test.tsx
```

Expected: all suites pass.

- [ ] **Step 2: Run the e2e check for `/components`**

Run:

```bash
cd frontend && npx playwright test tests/e2e/components.spec.ts --project=chromium
```

Expected: pass with the result cards still rendering correctly in the browser.

- [ ] **Step 3: Run the production build**

Run:

```bash
cd frontend && npm run build
```

Expected: successful build with no TypeScript or bundling regressions.

- [ ] **Step 4: Commit the verification-only fixes if any test forced follow-up edits**

If any test forces a small follow-up fix, commit that delta separately with a message that matches the touched scope. Do not mix verification cleanup with unrelated UI work.
