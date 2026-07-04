# Frontend Next Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the current static frontend to a Next.js + React + TypeScript application while preserving the current UI/UX as closely as possible, adding automated frontend tests and Playwright coverage, and updating the TCC text to describe the resulting architecture and current project state.

**Architecture:** Replace the current single `index.html` plus global `window.*` modules with a Next.js App Router application organized by reusable UI components, feature modules, and typed API clients. Keep the backend contract and same-origin `/api` proxy model intact so the migration is isolated to the frontend and documentation layers.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, KaTeX, React Testing Library, Vitest, Playwright.

---

### Task 1: Baseline shell and deploy contract

**Files:**
- Create: `frontend-next/package.json`
- Create: `frontend-next/tsconfig.json`
- Create: `frontend-next/next.config.ts`
- Create: `frontend-next/app/layout.tsx`
- Create: `frontend-next/app/page.tsx`
- Create: `frontend-next/app/globals.css`
- Modify: `deploy/Dockerfile.frontend`
- Modify: `deploy/nginx.conf`

- [ ] Create the Next.js scaffold with TypeScript and Tailwind configured for a static shell plus same-origin API access.
- [ ] Recreate the current sidebar, hash-like module navigation, and home dashboard shell in React.
- [ ] Preserve the `/api` reverse-proxy expectation in development and production configuration.

### Task 2: Shared design system and compatibility layer

**Files:**
- Create: `frontend-next/components/layout/*`
- Create: `frontend-next/components/ui/*`
- Create: `frontend-next/lib/api.ts`
- Create: `frontend-next/lib/katex.ts`
- Create: `frontend-next/lib/utils.ts`
- Copy/Adapt: `frontend/assets/**`
- Copy/Adapt: `frontend/css/styles.css`

- [ ] Port the existing typography, color system, spacing, and responsive behavior into the Next.js app.
- [ ] Replace legacy jQuery/select2/SweetAlert usage with typed React components backed by shadcn/ui and toast/dialog patterns.
- [ ] Create typed API wrappers for all existing backend endpoints.

### Task 3: Feature migration by domain

**Files:**
- Create: `frontend-next/features/piping/*`
- Create: `frontend-next/features/sizing/*`
- Create: `frontend-next/features/flow/*`
- Create: `frontend-next/features/pump/*`
- Create: `frontend-next/features/reactor/*`
- Create: `frontend-next/features/components/*`
- Create: `frontend-next/features/balance/*`
- Create: `frontend-next/features/glossary/*`
- Create: `frontend-next/features/exercises/*`

- [ ] Migrate each current module into feature-scoped React components and hooks.
- [ ] Keep form flows, labels, navigation wording, and core interactions as close as possible to the current UI.
- [ ] Encapsulate charts, math rendering, and didactic/exploratory helpers behind composable React interfaces.

### Task 4: Frontend automated tests

**Files:**
- Create: `frontend-next/vitest.config.ts`
- Create: `frontend-next/tests/unit/*`
- Create: `frontend-next/tests/integration/*`
- Create: `frontend-next/playwright.config.ts`
- Create: `frontend-next/tests/e2e/*`

- [ ] Add unit and integration coverage for the shell, API client, and representative migrated modules.
- [ ] Add Playwright flows for navigation and at least the main calculation paths that prove the migrated UX still works end-to-end.
- [ ] Ensure the tests can run against the local backend contract.

### Task 5: TCC writing update

**Files:**
- Modify: `escrita/TEX/capitulos/4.1-desenvolvimento.tex`
- Modify: `escrita/TEX/capitulos/4.3-api.tex`
- Modify: `escrita/TEX/capitulos/4.5-recursos-didaticos.tex`
- Modify: `escrita/TEX/capitulos/5-resultados.tex`
- Modify: `README.md`

- [ ] Update the written project description so it describes the resulting frontend stack and current architecture as-is.
- [ ] Remove wording that implies the stack is outdated or mid-transition.
- [ ] Keep the text aligned with the actual code after the migration.

### Task 6: Final verification

**Files:**
- Verify: `frontend-next/**`
- Verify: `escrita/TEX/**`
- Verify: deploy/runtime commands

- [ ] Run frontend unit/integration tests.
- [ ] Run Playwright against the migrated frontend.
- [ ] Rebuild the TCC PDF and confirm the written description matches the final codebase.
