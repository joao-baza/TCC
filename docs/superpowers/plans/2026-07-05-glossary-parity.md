# Glossary Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the legacy glossary behavior into the React frontend with complete categorized content and client-side filtering.

**Architecture:** Keep glossary data local to the frontend as a typed catalog, then render category sections from that source of truth. Add a small client-side filter state that hides unmatched terms and collapses empty categories without introducing API dependencies.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, KaTeX helpers already present in the frontend.

---

### Task 1: Prove the missing glossary behavior

**Files:**
- Modify: `frontend/src/test/glossary-page.test.tsx`
- Test: `frontend/src/test/glossary-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("renders grouped glossary sections and filters terms from the legacy catalog", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/glossary"] });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: /Glossário/i })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: /Pesquisar no glossário/i })).toBeInTheDocument();
  expect(screen.getByText(/Hidráulica/i)).toBeInTheDocument();
  expect(screen.getByText(/Número de Reynolds \\(Re\\)/i)).toBeInTheDocument();

  fireEvent.change(screen.getByRole("searchbox", { name: /Pesquisar no glossário/i }), {
    target: { value: "brent" },
  });

  expect(screen.getByText(/Método de Brent/i)).toBeInTheDocument();
  expect(screen.queryByText(/Número de Reynolds \\(Re\\)/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/^Hidráulica$/i)).not.toBeInTheDocument();
  expect(screen.getByText(/^Reatores$/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/test/glossary-page.test.tsx`
Expected: FAIL because the current page has no search field and no legacy grouped catalog.

- [ ] **Step 3: Write minimal implementation**

Create a typed glossary catalog plus a `GlossaryPage` filter state that:
- renders a labeled search input
- groups entries by category
- filters by term/definition/category text
- hides categories with zero matches

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/test/glossary-page.test.tsx`
Expected: PASS

### Task 2: Preserve math-rich glossary content and verify integration

**Files:**
- Modify: `frontend/src/features/glossary/glossary-page.tsx`
- Create: `frontend/src/features/glossary/glossary-data.ts`
- Test: `frontend/src/test/glossary-page.test.tsx`

- [ ] **Step 1: Move the legacy glossary entries into typed frontend data**

```ts
export type GlossaryEntry = {
  term: string;
  category: string;
  definition: string;
};
```

- [ ] **Step 2: Render definitions with the existing KaTeX helpers where legacy content uses `\\(...\\)` or `\\[...\\]`**

Use a small renderer local to the glossary feature so the page keeps formula readability without adding backend or parser dependencies.

- [ ] **Step 3: Re-run focused verification**

Run: `cd frontend && npx vitest run src/test/glossary-page.test.tsx`
Expected: PASS

- [ ] **Step 4: Re-run broader verification**

Run: `cd frontend && npm test && npm run build`
Expected: test suite passes and production build exits with code 0
