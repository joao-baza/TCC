# Selects to Combobox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all frontend native selects and HTML multi-selects with shared combobox components that support textual search, single selection, and multiple selection with chips.

**Architecture:** Build one shared single-select combobox and one shared multi-select combobox on top of `@base-ui/react`. Migrate each screen by domain so the state and API calls stay intact while only the input widgets change. Finish with a sweep that proves no relevant native selects remain in the frontend.

**Tech Stack:** React 19, TypeScript, `@base-ui/react`, Vitest, Playwright, `@testing-library/react`

---

## File Structure

- Create: `frontend/src/components/ui/multi-combobox.tsx`
- Modify: `frontend/src/components/ui/combobox.tsx`
- Modify: `frontend/src/test/combobox.test.tsx`
- Create: `frontend/src/test/multi-combobox.test.tsx`
- Modify: `frontend/src/features/exploratory/template-selector.tsx`
- Modify: `frontend/src/features/sizing/sizing-page.tsx`
- Modify: `frontend/src/features/balance/balance-page.tsx`
- Modify: `frontend/src/features/flow/flow-page.tsx`
- Modify: `frontend/src/features/piping/piping-page.tsx`
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Modify: `frontend/src/features/reactor/reactor-page.tsx`
- Modify: `frontend/src/features/components/components-page.tsx`
- Modify: `frontend/src/features/exercises/exercises-page.tsx`
- Modify: `frontend/src/test/template-selector.test.tsx`
- Modify: `frontend/src/test/sizing-page.test.tsx`
- Modify: `frontend/src/test/balance-page.test.tsx`
- Modify: `frontend/src/test/flow-page.test.tsx`
- Modify: `frontend/src/test/piping-page.test.tsx`
- Modify: `frontend/src/test/pump-page.test.tsx`
- Modify: `frontend/src/test/reactor-page.test.tsx`
- Modify: `frontend/src/test/components-page.test.tsx`
- Modify: `frontend/src/test/exercises-page.test.tsx`

---

### Task 1: Shared Single-Select Combobox

**Files:**
- Modify: `frontend/src/components/ui/combobox.tsx`
- Modify: `frontend/src/test/combobox.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

function ComboboxHarness({ options }: { options: ComboboxOption[] }) {
  const [value, setValue] = useState("");

  return (
    <Combobox
      label="Fluido"
      placeholder="Selecione um fluido"
      options={options}
      value={value}
      onValueChange={setValue}
    />
  );
}

it("selects a filtered option with Enter", () => {
  render(
    <ComboboxHarness
      options={[
        { value: "water", label: "Water" },
        { value: "ethanol", label: "Ethanol" },
        { value: "propane", label: "Propane" },
      ]}
    />,
  );

  const input = screen.getByRole("combobox", { name: /fluido/i });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "eth" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

  expect(input).toHaveValue("Ethanol");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/combobox.test.tsx -t "selects a filtered option with Enter"`

Expected: FAIL because the current combobox does not confirm selection from keyboard Enter after filtering.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";

export function Combobox({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção",
  emptyText = "Nenhuma opção encontrada",
  className,
}: ComboboxProps) {
  return (
    <BaseCombobox.Root items={options} value={value || null} onValueChange={onValueChange}>
      <BaseCombobox.Label>{label}</BaseCombobox.Label>
      <BaseCombobox.Input placeholder={placeholder} />
      <BaseCombobox.Portal>
        <BaseCombobox.Popup>
          <BaseCombobox.List>
            {options.map((option) => (
              <BaseCombobox.Item key={option.value} value={option.value}>
                {option.label}
              </BaseCombobox.Item>
            ))}
          </BaseCombobox.List>
        </BaseCombobox.Popup>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/combobox.test.tsx`

Expected: PASS with the keyboard selection case green and the existing filtering assertion still green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/combobox.tsx frontend/src/test/combobox.test.tsx
git commit -m "feat: upgrade shared combobox selection behavior"
```

---

### Task 2: Shared Multi-Select Combobox

**Files:**
- Create: `frontend/src/components/ui/multi-combobox.tsx`
- Create: `frontend/src/test/multi-combobox.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import { MultiCombobox, type MultiComboboxOption } from "@/components/ui/multi-combobox";

function MultiComboboxHarness({ options }: { options: MultiComboboxOption[] }) {
  const [value, setValue] = useState<string[]>([]);

  return (
    <MultiCombobox
      label="Propriedades do fluido"
      options={options}
      value={value}
      onValueChange={setValue}
      placeholder="Selecione propriedades"
    />
  );
}

it("adds chips and removes one chip", () => {
  render(
    <MultiComboboxHarness
      options={[
        { value: "D", label: "Density" },
        { value: "V", label: "Viscosity" },
        { value: "Z", label: "Compressibility factor" },
      ]}
    />,
  );

  const input = screen.getByRole("combobox", { name: /propriedades do fluido/i });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "den" } });
  fireEvent.click(screen.getByRole("option", { name: "Density" }));

  expect(screen.getByText("Density")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /remover density/i }));

  expect(screen.queryByText("Density")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/multi-combobox.test.tsx`

Expected: FAIL because the file does not exist yet and no chip-based multi-select is implemented.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";

export function MultiCombobox({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Selecione opções",
  emptyText = "Nenhuma opção encontrada",
  className,
}: MultiComboboxProps) {
  return (
    <BaseCombobox.Root items={options} multiple value={value} onValueChange={onValueChange}>
      <BaseCombobox.Label>{label}</BaseCombobox.Label>
      <BaseCombobox.Chips>
        {value.map((selectedValue) => {
          const selectedOption = options.find((option) => option.value === selectedValue);

          return (
            <BaseCombobox.Chip key={selectedValue} value={selectedValue}>
              {selectedOption?.label ?? selectedValue}
              <BaseCombobox.ChipRemove />
            </BaseCombobox.Chip>
          );
        })}
      </BaseCombobox.Chips>
      <BaseCombobox.Input placeholder={placeholder} />
      <BaseCombobox.Portal>
        <BaseCombobox.Popup>
          <BaseCombobox.List>
            {options.map((option) => (
              <BaseCombobox.Item key={option.value} value={option.value}>
                {option.label}
              </BaseCombobox.Item>
            ))}
          </BaseCombobox.List>
        </BaseCombobox.Popup>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/multi-combobox.test.tsx`

Expected: PASS with chips rendered and removable, without duplicated values.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/multi-combobox.tsx frontend/src/test/multi-combobox.test.tsx
git commit -m "feat: add shared multi combobox"
```

---

### Task 3: Simple Screen Selects

**Files:**
- Modify: `frontend/src/features/exploratory/template-selector.tsx`
- Modify: `frontend/src/features/sizing/sizing-page.tsx`
- Modify: `frontend/src/features/balance/balance-page.tsx`
- Modify: `frontend/src/test/template-selector.test.tsx`
- Modify: `frontend/src/test/sizing-page.test.tsx`
- Modify: `frontend/src/test/balance-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";

import { sizingExploratory } from "@/features/exploratory/templates";
import { TemplateSelector } from "@/features/exploratory/template-selector";

it("filters templates by name and confirms with Enter", () => {
  const onSelect = vi.fn();

  render(
    <TemplateSelector templates={sizingExploratory.templates} activeKey={null} onSelect={onSelect} />,
  );

  const input = screen.getByRole("combobox", { name: /modo exploratório/i });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "linha" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

  expect(onSelect).toHaveBeenCalledWith("suction-line");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/template-selector.test.tsx -t "filters templates by name and confirms with Enter"`

Expected: FAIL because the current `<select>` does not support textual filtering or Enter-to-confirm search.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Combobox } from "@/components/ui/combobox";

<Combobox
  label="Modo Exploratório"
  options={templates.map((template) => ({
    value: template.key,
    label: template.name,
  }))}
  value={activeKey ?? ""}
  onValueChange={onSelect}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/template-selector.test.tsx src/test/sizing-page.test.tsx src/test/balance-page.test.tsx`

Expected: PASS after the search-enabled combobox is wired into the template selector and the two page forms use the same shared control.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/exploratory/template-selector.tsx frontend/src/features/sizing/sizing-page.tsx frontend/src/features/balance/balance-page.tsx frontend/src/test/template-selector.test.tsx frontend/src/test/sizing-page.test.tsx frontend/src/test/balance-page.test.tsx
git commit -m "feat: migrate simple selects to combobox"
```

---

### Task 4: Hydraulics and Reactor Screens

**Files:**
- Modify: `frontend/src/features/flow/flow-page.tsx`
- Modify: `frontend/src/features/piping/piping-page.tsx`
- Modify: `frontend/src/features/pump/pump-page.tsx`
- Modify: `frontend/src/features/reactor/reactor-page.tsx`
- Modify: `frontend/src/test/flow-page.test.tsx`
- Modify: `frontend/src/test/piping-page.test.tsx`
- Modify: `frontend/src/test/pump-page.test.tsx`
- Modify: `frontend/src/test/reactor-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";

import { FlowPage } from "@/features/flow/flow-page";

it("searches the hydraulic method combobox by text", async () => {
  render(<FlowPage />);

  const method = screen.getByRole("combobox", { name: /método de cálculo/i });
  fireEvent.focus(method);
  fireEvent.change(method, { target: { value: "swamee" } });
  fireEvent.keyDown(method, { key: "Enter", code: "Enter" });

  expect(method).toHaveValue("SwameeJain");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/flow-page.test.tsx -t "searches the hydraulic method combobox by text"`

Expected: FAIL because the current select widgets do not filter by typed text.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Combobox } from "@/components/ui/combobox";

<Combobox
  label="Método de cálculo"
  options={methods.map((method) => ({ value: method, label: method }))}
  value={headlossForm.method}
  onValueChange={(value) => setHeadlossField("method", value as HeadlossMethod)}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/flow-page.test.tsx src/test/piping-page.test.tsx src/test/pump-page.test.tsx src/test/reactor-page.test.tsx`

Expected: PASS after each select is converted to the shared combobox and the existing dependent state resets still work.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/flow/flow-page.tsx frontend/src/features/piping/piping-page.tsx frontend/src/features/pump/pump-page.tsx frontend/src/features/reactor/reactor-page.tsx frontend/src/test/flow-page.test.tsx frontend/src/test/piping-page.test.tsx frontend/src/test/pump-page.test.tsx frontend/src/test/reactor-page.test.tsx
git commit -m "feat: migrate hydraulic and reactor selects"
```

---

### Task 5: Components Page Multi-Selects

**Files:**
- Modify: `frontend/src/features/components/components-page.tsx`
- Modify: `frontend/src/test/components-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";

import { ComponentsPage } from "@/features/components/components-page";

it("adds and removes multiple property chips", async () => {
  render(<ComponentsPage />);

  const properties = screen.getByRole("combobox", { name: /propriedades do fluido/i });
  fireEvent.focus(properties);
  fireEvent.change(properties, { target: { value: "den" } });
  fireEvent.click(await screen.findByRole("option", { name: /density/i }));

  expect(screen.getByText(/density/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/components-page.test.tsx -t "adds and removes multiple property chips"`

Expected: FAIL because the current `<select multiple>` is still plain HTML and does not expose chip-based selection.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { MultiCombobox } from "@/components/ui/multi-combobox";

<MultiCombobox
  label="Propriedades do fluido"
  options={Object.entries(propertyNames).map(([key, label]) => ({
    value: key,
    label: translatePropertyLabel(label),
  }))}
  value={propertyForm.propertyNames}
  onValueChange={(nextValues) =>
    setPropertyForm((current) => ({ ...current, propertyNames: nextValues }))
  }
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/components-page.test.tsx`

Expected: PASS with both the critical/pure/mix property selection flows still working and the new chip UI replacing the old HTML multi-selects.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/components/components-page.tsx frontend/src/test/components-page.test.tsx
git commit -m "feat: migrate component property multi-selects"
```

---

### Task 6: Exercises Page and Final Sweep

**Files:**
- Modify: `frontend/src/features/exercises/exercises-page.tsx`
- Modify: `frontend/src/test/exercises-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";

import { ExercisesPage } from "@/features/exercises/exercises-page";

it("searches a reactor component combobox inside exercises", async () => {
  render(<ExercisesPage />);

  const component = screen.getByRole("combobox", { name: /componente 1/i });
  fireEvent.focus(component);
  fireEvent.change(component, { target: { value: "water" } });
  fireEvent.keyDown(component, { key: "Enter", code: "Enter" });

  expect(component).toHaveValue("Water");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/exercises-page.test.tsx -t "searches a reactor component combobox inside exercises"`

Expected: FAIL because the exercises form still uses native selects.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Combobox } from "@/components/ui/combobox";

<Combobox
  label="Componente 1"
  options={componentOptions.map((option) => ({ value: option, label: option }))}
  value={component.component_name}
  onValueChange={(value) => onComponentChange(index, "component_name", value)}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/exercises-page.test.tsx`

Expected: PASS with the exercises flow still behaving the same, just with searchable selection widgets.

- [ ] **Step 5: Final sweep**

```bash
cd frontend
rg -n "<select|selectedOptions" src tests
npx vitest run
npx playwright test
```

Expected: no remaining relevant native selects in the migrated screens, unit tests green, and the targeted Playwright suite green.

---

## Coverage Check

- Shared single-select behavior is covered by Task 1.
- Shared multi-select behavior is covered by Task 2.
- Small form screens are covered by Task 3.
- Hydraulics and reactor forms are covered by Task 4.
- The component property multi-select migration is covered by Task 5.
- The exercises screen and the global no-select sweep are covered by Task 6.

If any screen still needs a one-off native select after the sweep, it should be justified explicitly and left out of this migration only if there is a concrete accessibility or behavior reason.
