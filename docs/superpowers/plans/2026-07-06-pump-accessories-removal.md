# Pump Accessories Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Pump > Perda de Carga > Acessórios section delete accessory rows with the same removable-row UI pattern already used in other editable forms.

**Architecture:** Extract the repeated icon remove button into a shared component and reuse it from the editable row UIs that already need the same behavior. Update the Pump accessory list to render each fitting as a removable row and keep the existing calculation payload unchanged except for filtering out deleted rows.

**Tech Stack:** React, TypeScript, React Router, Testing Library, Vitest

---

### Task 1: Add a shared remove-button component

**Files:**
- Create: `frontend/src/components/remove-button.tsx`
- Modify: `frontend/src/features/reactor/reactor-page.tsx`
- Modify: `frontend/src/features/balance/balance-page.tsx`

- [ ] **Step 1: Write the shared component**

```tsx
export function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="border-destructive/40 bg-background text-destructive shadow-sm hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
      aria-label={label}
      onClick={onClick}
    >
      <Trash2Icon className="size-4" />
    </Button>
  );
}
```

- [ ] **Step 2: Reuse it in reactor and balance**

```tsx
import { RemoveButton } from "@/components/remove-button";
```

- [ ] **Step 3: Run the impacted tests**

Run: `pnpm vitest frontend/src/test/reactor-page.test.tsx frontend/src/test/balance-page.test.tsx`
Expected: PASS

### Task 2: Make Pump accessories removable

**Files:**
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Modify: `frontend/src/test/pump-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("removes an accessory row before submitting headloss", async () => {
  // add a second fitting row, remove it, then assert only one fitting is sent
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest frontend/src/test/pump-page.test.tsx -t "removes an accessory row before submitting headloss"`
Expected: FAIL because the remove control does not exist yet.

- [ ] **Step 3: Implement the removable accessory row**

```tsx
<div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-4">
  <div className="flex items-center justify-between gap-3">
    <p className="text-sm font-medium text-slate-800">Acessórios</p>
    <Button type="button" variant="outline" onClick={addFittingRow}>
      Adicionar conexão
    </Button>
  </div>

  {fittingRows.map((row, index) => (
    <div key={row.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Conexão {index + 1}
        </h4>
        <RemoveButton
          label={`Remover conexão ${index + 1}`}
          onClick={() => removeFittingRow(row.id)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Combobox ... />
        <NumberField ... />
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Run the test and the full Pump test file**

Run: `pnpm vitest frontend/src/test/pump-page.test.tsx`
Expected: PASS

