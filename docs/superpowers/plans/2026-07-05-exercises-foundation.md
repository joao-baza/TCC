# Exercises Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static exercises page with the legacy exercise catalog and the first guided exercise flow in React.

**Architecture:** Introduce typed exercise metadata for the full legacy catalog, then build a local runner state machine for the first guided exercise (`heat-exchanger`). Use the existing `/components` API routes through `apiClient` for property lookups and keep the other legacy exercises visible as upcoming migrations rather than hiding them.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, existing `apiClient`.

---

### Task 1: Prove catalog and runner behavior

**Files:**
- Modify: `frontend/src/test/exercises-page.test.tsx`
- Test: `frontend/src/test/exercises-page.test.tsx`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run `cd frontend && npx vitest run src/test/exercises-page.test.tsx` and confirm failure**
- [ ] **Step 3: Implement the full catalog cards and first exercise runner**
- [ ] **Step 4: Re-run the focused test until green**

### Task 2: Verify integration

**Files:**
- Modify: `frontend/src/features/exercises/exercises-page.tsx`
- Create: `frontend/src/features/exercises/catalog.ts`
- Test: `frontend/src/test/exercises-page.test.tsx`

- [ ] **Step 1: Keep all 7 legacy exercises visible in the selector**
- [ ] **Step 2: Implement the 3-step `Trocador de Calor` guided flow**
- [ ] **Step 3: Re-run `cd frontend && npm test && npm run build`**
