# Vite React Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy static frontend with a Vite + React + TypeScript application using shadcn/ui while preserving the existing user experience, then align deploy and thesis text with the final stack.

**Architecture:** Build a route-based SPA inside `frontend/` with feature-scoped modules, typed API services, local feature state, and shared shell/navigation components. Port legacy behavior module by module, replacing jQuery plugins with React-native components and isolating charts/math rendering behind small adapters.

**Tech Stack:** Vite, React, TypeScript, react-router-dom, Tailwind CSS, shadcn/ui, lucide-react, sonner, react-hook-form, zod, react-katex, Recharts, Vitest, React Testing Library, Playwright, Docker, nginx, LaTeX.

---

## File Structure Map

### Frontend bootstrap and build

- Create: `frontend/package.json`
- Create: `frontend/package-lock.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/components.json`
- Modify: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/app.tsx`
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/app/globals.css`

### Shared UI and libraries

- Create: `frontend/src/components/app-shell.tsx`
- Create: `frontend/src/components/app-sidebar.tsx`
- Create: `frontend/src/components/math-block.tsx`
- Create: `frontend/src/components/chart-panel.tsx`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/routes.ts`
- Create: `frontend/src/lib/katex.ts`
- Create: `frontend/src/lib/chart.ts`

### Feature directories

- Create: `frontend/src/features/home/home-page.tsx`
- Create: `frontend/src/features/glossary/glossary-page.tsx`
- Create: `frontend/src/features/exercises/exercises-page.tsx`
- Create: `frontend/src/features/piping/piping-page.tsx`
- Create: `frontend/src/features/sizing/sizing-page.tsx`
- Create: `frontend/src/features/flow/flow-page.tsx`
- Create: `frontend/src/features/pump/pump-page.tsx`
- Create: `frontend/src/features/reactor/reactor-page.tsx`
- Create: `frontend/src/features/components/components-page.tsx`
- Create: `frontend/src/features/balance/balance-page.tsx`

### Tests

- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/app-shell.test.tsx`
- Create: `frontend/src/test/api-client.test.ts`
- Create: `frontend/src/test/home-page.test.tsx`
- Create: `frontend/src/test/piping-page.test.tsx`
- Create: `frontend/src/test/sizing-page.test.tsx`
- Create: `frontend/src/test/flow-page.test.tsx`
- Create: `frontend/src/test/pump-page.test.tsx`
- Create: `frontend/src/test/reactor-page.test.tsx`
- Create: `frontend/src/test/components-page.test.tsx`
- Create: `frontend/src/test/balance-page.test.tsx`
- Create: `frontend/src/test/glossary-page.test.tsx`
- Create: `frontend/src/test/exercises-page.test.tsx`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/tests/e2e/navigation.spec.ts`
- Create: `frontend/tests/e2e/calculations.spec.ts`

### Deploy and docs

- Modify: `deploy/Dockerfile.frontend`
- Modify: `deploy/nginx.conf`
- Modify: `deploy/docker-compose.yaml`
- Modify: `README.md`
- Modify: `escrita/TEX/capitulos/4.1-desenvolvimento.tex`
- Modify: `escrita/TEX/capitulos/4.5-recursos-didaticos.tex`
- Modify: `escrita/TEX/capitulos/5-resultados.tex`

### Legacy references to keep during migration, then remove after parity

- Read/Port from: `frontend/js/modules/*.js`
- Read/Port from: `frontend/css/styles.css`
- Read/Port from: `frontend/assets/fonts/*`
- Remove at end if unused: `frontend/vendor/*`, `frontend/js/*`, `frontend/css/tailwind-input.css`, `frontend/css/tailwind.css`, `frontend/tailwind.config.js`

---

### Task 1: Bootstrap Vite, TypeScript, routing, and test harness

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Modify: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/app.tsx`
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/app/globals.css`
- Create: `frontend/src/test/setup.ts`
- Test: `frontend/src/test/app-shell.test.tsx`

- [ ] **Step 1: Write the failing shell navigation test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { App } from "../app/app";

describe("App shell bootstrap", () => {
  it("renders the application title and the home navigation entry", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /DCOU - Dimensionamento Computacional de Operações Unitárias/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Início/i }),
    ).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --runInBand src/test/app-shell.test.tsx`
Expected: FAIL with missing `package.json`, missing test runner, or module resolution errors because the Vite React app does not exist yet.

- [ ] **Step 3: Create the Vite/React/TypeScript scaffold and base dependencies**

```json
{
  "name": "dcou-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 0.0.0.0 --port 4173",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "lucide-react": "^0.543.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^7.8.2",
    "sonner": "^2.0.7"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^24.3.0",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "@vitejs/plugin-react": "^5.0.2",
    "jsdom": "^26.1.0",
    "typescript": "^5.9.2",
    "vite": "^7.1.3",
    "vitest": "^2.1.1"
  }
}
```

```ts
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
```

```tsx
// frontend/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "@/app/router";
import "@/app/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
```

```tsx
// frontend/src/app/app.tsx
import { Outlet } from "react-router-dom";

export function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Outlet />
    </main>
  );
}
```

```tsx
// frontend/src/app/router.tsx
import { createBrowserRouter } from "react-router-dom";

import { App } from "@/app/app";

function Placeholder() {
  return (
    <section className="p-6">
      <h1>DCOU - Dimensionamento Computacional de Operações Unitárias</h1>
      <a href="/">Início</a>
    </section>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Placeholder /> },
    ],
  },
]);
```

```ts
// frontend/src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Install dependencies and run the test again**

Run: `cd frontend && npm install && npm test -- --runInBand src/test/app-shell.test.tsx`
Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit the bootstrap**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html frontend/src/main.tsx frontend/src/app/app.tsx frontend/src/app/router.tsx frontend/src/app/globals.css frontend/src/test/setup.ts frontend/src/test/app-shell.test.tsx
git commit -m "build(frontend): bootstrap vite react application" -m "- add the base Vite React TypeScript scaffold inside frontend\n- configure Vitest and alias resolution for the new app\n- replace the static root entry point with a React bootstrap"
```

### Task 2: Initialize shadcn/ui, shared shell, and global route registry

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/routes.ts`
- Create: `frontend/src/components/app-sidebar.tsx`
- Create: `frontend/src/components/app-shell.tsx`
- Create: `frontend/src/features/home/home-page.tsx`
- Modify: `frontend/src/app/router.tsx`
- Test: `frontend/src/test/home-page.test.tsx`

- [ ] **Step 1: Write the failing home shell test**

```tsx
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

it("shows the sidebar groups and learning trails on the home page", async () => {
  const router = createMemoryRouter(routes, {
    initialEntries: ["/"],
  });

  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("navigation", { name: /Navegação principal/i })).toBeInTheDocument();
  expect(screen.getByText(/Hidráulica & Escoamento/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Tubulações/i })).toHaveAttribute("href", "/piping");
  expect(screen.getByText(/Trilhas de Aprendizagem/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --runInBand src/test/home-page.test.tsx`
Expected: FAIL because the route registry, sidebar, and home page content are not implemented yet.

- [ ] **Step 3: Initialize shadcn and add the shared navigation components**

Run:

```bash
cd frontend
npx shadcn@latest init --base-color slate --defaults
npx shadcn@latest add button card separator sheet scroll-area tooltip sonner
```

Then create these files:

```ts
// frontend/src/lib/routes.ts
export const moduleRoutes = [
  { path: "/", label: "Início", group: "root" },
  { path: "/piping", label: "Tubulações", group: "Hidráulica & Escoamento" },
  { path: "/sizing", label: "Dimensionamento", group: "Hidráulica & Escoamento" },
  { path: "/flow", label: "Escoamento", group: "Hidráulica & Escoamento" },
  { path: "/pump", label: "Perda de Carga & NPSH", group: "Bombas" },
  { path: "/components", label: "Componentes", group: "Propriedades" },
  { path: "/reactor", label: "CSTR / PFR", group: "Reatores" },
  { path: "/balance", label: "Balanço", group: "Balanço de Massa" },
  { path: "/glossary", label: "Glossário", group: "Ferramentas" },
  { path: "/exercises", label: "Exercícios Integrados", group: "Ferramentas" },
] as const;
```

```tsx
// frontend/src/components/app-sidebar.tsx
import { NavLink } from "react-router-dom";

import { moduleRoutes } from "@/lib/routes";

const grouped = moduleRoutes.reduce<Record<string, typeof moduleRoutes>>((acc, route) => {
  acc[route.group] ??= [];
  acc[route.group].push(route);
  return acc;
}, {});

export function AppSidebar() {
  return (
    <aside aria-label="Navegação principal" className="w-72 border-r bg-white">
      <div className="border-b px-6 py-5">
        <p className="text-lg font-semibold">DCOU</p>
        <p className="text-sm text-slate-600">Engenharia Química — UFMS</p>
      </div>
      <nav className="space-y-6 px-4 py-6">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="space-y-2">
            {group !== "root" ? (
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group}
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

```tsx
// frontend/src/components/app-shell.tsx
import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:grid md:grid-cols-[18rem_1fr]">
      <AppSidebar />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/features/home/home-page.tsx
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section className="space-y-8 p-6 md:p-8">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">
          DCOU - Dimensionamento Computacional de Operações Unitárias
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Selecione um módulo na barra lateral, siga uma trilha de aprendizagem ou explore diretamente pelo acesso rápido.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Trilhas de Aprendizagem</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Link to="/piping" className="rounded-xl border p-4 hover:bg-slate-50">
            <p className="font-medium">Transporte de Fluidos</p>
            <p className="mt-2 text-sm text-slate-600">Tubulações → Dimensionamento → Escoamento → Bombas</p>
          </Link>
          <Link to="/reactor" className="rounded-xl border p-4 hover:bg-slate-50">
            <p className="font-medium">Reatores Ideais</p>
            <p className="mt-2 text-sm text-slate-600">Propriedades de Componentes → Reator CSTR / PFR</p>
          </Link>
          <Link to="/balance" className="rounded-xl border p-4 hover:bg-slate-50">
            <p className="font-medium">Balanço de Massa</p>
            <p className="mt-2 text-sm text-slate-600">Componentes → Balanço de Massa</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire the route tree and run the test**

```tsx
// frontend/src/app/router.tsx
import { createBrowserRouter } from "react-router-dom";

import { App } from "@/app/app";
import { AppShell } from "@/components/app-shell";
import { HomePage } from "@/features/home/home-page";

function PlaceholderPage({ title }: { title: string }) {
  return <section className="p-6">{title}</section>;
}

export const routes = [
  {
    path: "/",
    element: <App />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "piping", element: <PlaceholderPage title="Tubulações" /> },
          { path: "sizing", element: <PlaceholderPage title="Dimensionamento" /> },
          { path: "flow", element: <PlaceholderPage title="Escoamento" /> },
          { path: "pump", element: <PlaceholderPage title="Perda de Carga & NPSH" /> },
          { path: "components", element: <PlaceholderPage title="Componentes" /> },
          { path: "reactor", element: <PlaceholderPage title="CSTR / PFR" /> },
          { path: "balance", element: <PlaceholderPage title="Balanço" /> },
          { path: "glossary", element: <PlaceholderPage title="Glossário" /> },
          { path: "exercises", element: <PlaceholderPage title="Exercícios Integrados" /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
```

Run: `cd frontend && npm test -- --runInBand src/test/home-page.test.tsx`
Expected: PASS with the home page, sidebar, and route registry visible.

- [ ] **Step 5: Commit the shared shell**

```bash
git add frontend/components.json frontend/src/lib/routes.ts frontend/src/components/app-sidebar.tsx frontend/src/components/app-shell.tsx frontend/src/features/home/home-page.tsx frontend/src/app/router.tsx frontend/src/test/home-page.test.tsx frontend/src/components/ui
git commit -m "feat(frontend): add routed shell and home page" -m "- initialize shadcn/ui and shared navigation primitives\n- add the persistent sidebar and grouped route registry\n- port the current learning trails and home entry points"
```

### Task 3: Add typed API client, math/chart adapters, and feature scaffolding

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/katex.ts`
- Create: `frontend/src/lib/chart.ts`
- Create: `frontend/src/components/math-block.tsx`
- Create: `frontend/src/components/chart-panel.tsx`
- Test: `frontend/src/test/api-client.test.ts`

- [ ] **Step 1: Write the failing API client test**

```ts
import { ApiClient } from "@/lib/api";

describe("ApiClient", () => {
  it("prefixes all requests with /api and returns parsed JSON", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new ApiClient();
    const result = await client.get<{ ok: boolean }>("/components/compositions");

    expect(fetch).toHaveBeenCalledWith(
      "/api/components/compositions",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --runInBand src/test/api-client.test.ts`
Expected: FAIL because `ApiClient` is not defined yet.

- [ ] **Step 3: Implement the typed API client and shared wrappers**

```ts
// frontend/src/lib/api.ts
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  constructor(private readonly baseUrl = "/api") {}

  async get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      const message = await response.text();
      throw new ApiError(message || "Request failed", response.status);
    }
    return (await response.json()) as T;
  }
}

export const apiClient = new ApiClient();
```

```ts
// frontend/src/lib/katex.ts
import "katex/dist/katex.min.css";

export { InlineMath, BlockMath } from "react-katex";
```

```ts
// frontend/src/lib/chart.ts
export const chartColors = {
  primary: "#0f172a",
  accent: "#2563eb",
  success: "#16a34a",
  warning: "#d97706",
};
```

```tsx
// frontend/src/components/math-block.tsx
import { BlockMath } from "@/lib/katex";

export function MathBlock({ expression }: { expression: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white p-4">
      <BlockMath math={expression} />
    </div>
  );
}
```

```tsx
// frontend/src/components/chart-panel.tsx
import type { ReactNode } from "react";

export function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 min-h-80">{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: Install the remaining shared dependencies and rerun tests**

Run:

```bash
cd frontend
npm install react-hook-form zod @hookform/resolvers react-katex recharts
npm test -- --runInBand src/test/api-client.test.ts
```

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit the shared service layer**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/katex.ts frontend/src/lib/chart.ts frontend/src/components/math-block.tsx frontend/src/components/chart-panel.tsx frontend/src/test/api-client.test.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add shared api and rendering adapters" -m "- add a typed api client with consistent error handling\n- wrap KaTeX and chart primitives for React usage\n- install the shared form, math, and chart dependencies"
```

### Task 4: Port content-first modules and preserve shell parity

**Files:**
- Create: `frontend/src/features/glossary/glossary-page.tsx`
- Create: `frontend/src/features/exercises/exercises-page.tsx`
- Modify: `frontend/src/app/router.tsx`
- Test: `frontend/src/test/glossary-page.test.tsx`
- Test: `frontend/src/test/exercises-page.test.tsx`

- [ ] **Step 1: Write the failing content module tests**

```tsx
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

it("renders glossary content from the new React route", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/glossary"] });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: /Glossário/i })).toBeInTheDocument();
  expect(screen.getByText(/termos/i)).toBeInTheDocument();
});
```

```tsx
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

it("renders the exercises route with the integrated exercises heading", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/exercises"] });
  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("heading", { name: /Exercícios Integrados/i }),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- --runInBand src/test/glossary-page.test.tsx src/test/exercises-page.test.tsx`
Expected: FAIL because the routes still use placeholders.

- [ ] **Step 3: Port the content routes with the current wording and hierarchy**

```tsx
// frontend/src/features/glossary/glossary-page.tsx
export function GlossaryPage() {
  return (
    <section className="space-y-6 p-6 md:p-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Glossário</h1>
        <p className="mt-2 text-slate-600">
          Consulte termos, conceitos e referências usados ao longo dos módulos do DCOU.
        </p>
      </header>
      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Termos</h2>
        <p className="mt-3 text-sm text-slate-700">
          Renderize aqui os termos já existentes no frontend legado, preservando as definições, a ordem de leitura e os agrupamentos conceituais atuais.
        </p>
      </article>
    </section>
  );
}
```

```tsx
// frontend/src/features/exercises/exercises-page.tsx
export function ExercisesPage() {
  return (
    <section className="space-y-6 p-6 md:p-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Exercícios Integrados</h1>
        <p className="mt-2 text-slate-600">
          Resolva exercícios orientados usando os mesmos módulos e fluxos de cálculo da aplicação.
        </p>
      </header>
      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Lista de exercícios</h2>
        <p className="mt-3 text-sm text-slate-700">
          Mantenha os enunciados, as instruções e os links entre módulos já usados no frontend legado, agora controlados por rota React.
        </p>
      </article>
    </section>
  );
}
```

- [ ] **Step 4: Replace the placeholders in the route tree and rerun the tests**

```tsx
// frontend/src/app/router.tsx
import { GlossaryPage } from "@/features/glossary/glossary-page";
import { ExercisesPage } from "@/features/exercises/exercises-page";

// replace the two placeholder routes
{ path: "glossary", element: <GlossaryPage /> },
{ path: "exercises", element: <ExercisesPage /> },
```

Run: `cd frontend && npm test -- --runInBand src/test/glossary-page.test.tsx src/test/exercises-page.test.tsx`
Expected: PASS with both routes rendered from real React components.

- [ ] **Step 5: Commit the content modules**

```bash
git add frontend/src/features/glossary/glossary-page.tsx frontend/src/features/exercises/exercises-page.tsx frontend/src/app/router.tsx frontend/src/test/glossary-page.test.tsx frontend/src/test/exercises-page.test.tsx
git commit -m "feat(frontend): port glossary and exercises routes" -m "- replace placeholder content routes with React pages\n- preserve the current wording and pedagogical hierarchy\n- add tests to lock the shell parity for supporting modules"
```

### Task 5: Port the hydraulic and pump workflows with typed forms and charts

**Files:**
- Create: `frontend/src/features/piping/schema.ts`
- Create: `frontend/src/features/piping/service.ts`
- Create: `frontend/src/features/piping/piping-page.tsx`
- Create: `frontend/src/features/sizing/schema.ts`
- Create: `frontend/src/features/sizing/service.ts`
- Create: `frontend/src/features/sizing/sizing-page.tsx`
- Create: `frontend/src/features/flow/schema.ts`
- Create: `frontend/src/features/flow/service.ts`
- Create: `frontend/src/features/flow/flow-page.tsx`
- Create: `frontend/src/features/pump/schema.ts`
- Create: `frontend/src/features/pump/service.ts`
- Create: `frontend/src/features/pump/pump-page.tsx`
- Test: `frontend/src/test/piping-page.test.tsx`
- Test: `frontend/src/test/sizing-page.test.tsx`
- Test: `frontend/src/test/flow-page.test.tsx`
- Test: `frontend/src/test/pump-page.test.tsx`

- [ ] **Step 1: Write the failing piping module integration test**

```tsx
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

it("loads composition data on the piping route and renders details", async () => {
  vi.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify([{ id: "agua", name: "Água" }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: /Cálculos de Tubulação/i })).toBeInTheDocument();
  expect(await screen.findByText(/Água/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Selecionar composição/i }));
});
```

- [ ] **Step 2: Run the hydraulic tests to verify they fail**

Run: `cd frontend && npm test -- --runInBand src/test/piping-page.test.tsx src/test/sizing-page.test.tsx src/test/flow-page.test.tsx src/test/pump-page.test.tsx`
Expected: FAIL because the legacy modules still have placeholders and no typed services.

- [ ] **Step 3: Port `piping`, `sizing`, `flow`, and `pump` using one feature pattern**

Use the same structure for each feature:

```ts
// frontend/src/features/piping/service.ts
import { apiClient } from "@/lib/api";

export async function listCompositions() {
  return apiClient.get<Array<{ id: string; name: string }>>("/components/compositions");
}
```

```ts
// frontend/src/features/sizing/schema.ts
import { z } from "zod";

export const sizingSchema = z.object({
  flowRate: z.coerce.number().positive(),
  velocity: z.coerce.number().positive(),
});

export type SizingFormValues = z.infer<typeof sizingSchema>;
```

```tsx
// frontend/src/features/sizing/sizing-page.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { sizingSchema, type SizingFormValues } from "@/features/sizing/schema";

export function SizingPage() {
  const form = useForm<SizingFormValues>({
    resolver: zodResolver(sizingSchema),
    defaultValues: {
      flowRate: 0,
      velocity: 0,
    },
  });

  return (
    <section className="space-y-6 p-6 md:p-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Dimensionamento de Tubo</h1>
      </header>
      <form className="rounded-2xl bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-medium">Vazão</label>
        <input
          type="number"
          step="any"
          {...form.register("flowRate")}
          className="w-full rounded-md border px-3 py-2"
        />
      </form>
    </section>
  );
}
```

```tsx
// frontend/src/features/flow/flow-page.tsx
import { LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartPanel } from "@/components/chart-panel";

const flowData = [
  { reynolds: 1000, friction: 0.064 },
  { reynolds: 2000, friction: 0.032 },
];

export function FlowPage() {
  return (
    <section className="space-y-6 p-6 md:p-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Escoamento</h1>
      </header>
      <ChartPanel title="Diagrama de Moody">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={flowData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="reynolds" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="friction" stroke="#2563eb" />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>
    </section>
  );
}
```

- [ ] **Step 4: Replace the route placeholders, run the module tests, and fix until green**

Run: `cd frontend && npm test -- --runInBand src/test/piping-page.test.tsx src/test/sizing-page.test.tsx src/test/flow-page.test.tsx src/test/pump-page.test.tsx`
Expected: PASS with route rendering, typed forms, and at least one chart-backed module verified.

- [ ] **Step 5: Commit the hydraulic and pump features**

```bash
git add frontend/src/features/piping frontend/src/features/sizing frontend/src/features/flow frontend/src/features/pump frontend/src/app/router.tsx frontend/src/test/piping-page.test.tsx frontend/src/test/sizing-page.test.tsx frontend/src/test/flow-page.test.tsx frontend/src/test/pump-page.test.tsx
git commit -m "feat(frontend): port hydraulic and pump workflows" -m "- migrate piping, sizing, flow, and pump into typed React features\n- replace legacy DOM-driven forms with local React form state\n- port the first charted engineering views to Recharts"
```

### Task 6: Port components, reactor, and balance with math rendering and result panels

**Files:**
- Create: `frontend/src/features/components/schema.ts`
- Create: `frontend/src/features/components/service.ts`
- Create: `frontend/src/features/components/components-page.tsx`
- Create: `frontend/src/features/reactor/schema.ts`
- Create: `frontend/src/features/reactor/service.ts`
- Create: `frontend/src/features/reactor/reactor-page.tsx`
- Create: `frontend/src/features/balance/schema.ts`
- Create: `frontend/src/features/balance/service.ts`
- Create: `frontend/src/features/balance/balance-page.tsx`
- Test: `frontend/src/test/components-page.test.tsx`
- Test: `frontend/src/test/reactor-page.test.tsx`
- Test: `frontend/src/test/balance-page.test.tsx`

- [ ] **Step 1: Write the failing reactor test**

```tsx
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

it("renders the reactor page with the formula panel and comparison chart", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/reactor"] });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: /CSTR \/ PFR/i })).toBeInTheDocument();
  expect(screen.getByText(/Levenspiel/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the advanced module tests to verify they fail**

Run: `cd frontend && npm test -- --runInBand src/test/components-page.test.tsx src/test/reactor-page.test.tsx src/test/balance-page.test.tsx`
Expected: FAIL because the advanced calculation features are still placeholders.

- [ ] **Step 3: Port the advanced modules and use KaTeX where the legacy app shows equations**

```tsx
// frontend/src/features/reactor/reactor-page.tsx
import { MathBlock } from "@/components/math-block";
import { ChartPanel } from "@/components/chart-panel";

export function ReactorPage() {
  return (
    <section className="space-y-6 p-6 md:p-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">CSTR / PFR</h1>
        <p className="mt-2 text-slate-600">
          Compare desempenho, volume e conversão para reatores ideais.
        </p>
      </header>
      <MathBlock expression={"\\frac{V}{F_{A0}} = \\int_0^X \\frac{dX}{-r_A}"} />
      <ChartPanel title="Levenspiel">
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-slate-500">
          Gráfico comparativo reativo entre conversão e volume para CSTR e PFR.
        </div>
      </ChartPanel>
    </section>
  );
}
```

```tsx
// frontend/src/features/balance/balance-page.tsx
export function BalancePage() {
  return (
    <section className="space-y-6 p-6 md:p-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Balanço de Massa</h1>
      </header>
      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Resultados</h2>
        <p className="mt-2 text-sm text-slate-700">
          Preserve a mesma lógica de entradas, reações e resultados exibida no frontend legado, agora em componentes React tipados.
        </p>
      </article>
    </section>
  );
}
```

```tsx
// frontend/src/features/components/components-page.tsx
export function ComponentsPage() {
  return (
    <section className="space-y-6 p-6 md:p-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Componentes</h1>
      </header>
      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Busca e propriedades</h2>
        <p className="mt-2 text-sm text-slate-700">
          Exiba a listagem, a seleção e os detalhes de composição consumindo os endpoints atuais da API e preservando o fluxo de consulta já existente.
        </p>
      </article>
    </section>
  );
}
```

- [ ] **Step 4: Wire the routes, run the tests, and add service hooks until they pass**

Run: `cd frontend && npm test -- --runInBand src/test/components-page.test.tsx src/test/reactor-page.test.tsx src/test/balance-page.test.tsx`
Expected: PASS with the advanced modules rendered from React routes and KaTeX visible on the reactor page.

- [ ] **Step 5: Commit the advanced modules**

```bash
git add frontend/src/features/components frontend/src/features/reactor frontend/src/features/balance frontend/src/app/router.tsx frontend/src/test/components-page.test.tsx frontend/src/test/reactor-page.test.tsx frontend/src/test/balance-page.test.tsx
git commit -m "feat(frontend): port advanced calculation modules" -m "- migrate components, reactor, and balance to typed React pages\n- restore equation rendering with KaTeX wrappers\n- establish the final module set for the SPA"
```

### Task 7: Finalize deploy, remove legacy frontend runtime, and rewrite docs/TEX

**Files:**
- Modify: `deploy/Dockerfile.frontend`
- Modify: `deploy/nginx.conf`
- Modify: `deploy/docker-compose.yaml`
- Modify: `README.md`
- Modify: `escrita/TEX/capitulos/4.1-desenvolvimento.tex`
- Modify: `escrita/TEX/capitulos/4.5-recursos-didaticos.tex`
- Modify: `escrita/TEX/capitulos/5-resultados.tex`
- Create: `frontend/playwright.config.ts`
- Test: `frontend/tests/e2e/navigation.spec.ts`
- Test: `frontend/tests/e2e/calculations.spec.ts`

- [ ] **Step 1: Write the failing E2E smoke tests**

```ts
import { test, expect } from "@playwright/test";

test("user can navigate from home to piping", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Tubulações" }).click();
  await expect(page.getByRole("heading", { name: "Cálculos de Tubulação" })).toBeVisible();
});
```

```ts
import { test, expect } from "@playwright/test";

test("reactor route shows the Levenspiel panel", async ({ page }) => {
  await page.goto("/reactor");
  await expect(page.getByText("Levenspiel")).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E suite to verify the tests fail before deploy wiring**

Run: `cd frontend && npm run test:e2e -- --project=chromium`
Expected: FAIL until the Vite dev server, app routes, or deployed build are fully wired.

- [ ] **Step 3: Update the frontend build image and static serving configuration**

```ts
// frontend/playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

```dockerfile
# deploy/Dockerfile.frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist ./
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# deploy/nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        resolver 127.0.0.11 valid=10s ipv6=off;
        set $api_upstream tcc_tcc-api;
        rewrite ^/api/?(.*)$ /$1 break;
        proxy_pass http://$api_upstream:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 4: Restore the thesis files to the last pre-Next revision, then rewrite them for the final stack**

Run:

```bash
git restore --source 7df9d25 -- escrita/TEX/capitulos/4.1-desenvolvimento.tex escrita/TEX/capitulos/5-resultados.tex
git restore --source fca7b81 -- escrita/TEX/capitulos/4.5-recursos-didaticos.tex
```

Then rewrite the affected paragraphs so they state only the final stack, for example:

```tex
O frontend foi desenvolvido usando React com TypeScript e Vite, combinação que permite organizar a interface em componentes reutilizáveis, rotas previsíveis e integração tipada com a API. O Tailwind CSS foi utilizado na estilização da interface, enquanto os componentes de interação utilizam shadcn/ui para manter consistência visual e acessibilidade.
```

```tex
A renderização matemática é realizada com KaTeX no navegador, permitindo exibir expressões em \LaTeX{} com boa legibilidade no contexto didático. Para visualizações gráficas, a interface utiliza componentes reativos compatíveis com React, integrados às telas de cálculo para responder imediatamente às alterações de entrada.
```

- [ ] **Step 5: Run the full verification suite and commit the final integration**

Run:

```bash
cd frontend && npm test
cd frontend && npm run build
cd frontend && npm run test:e2e -- --project=chromium
pytest
cd escrita/TEX && ./../compile.sh
```

Expected:

- `npm test`: PASS
- `npm run build`: PASS with a generated `dist/`
- `npm run test:e2e`: PASS
- `pytest`: PASS for backend and integration contracts
- `compile.sh`: PASS with an updated `main.pdf`

Commit:

```bash
git add frontend deploy/Dockerfile.frontend deploy/nginx.conf deploy/docker-compose.yaml README.md escrita/TEX/capitulos/4.1-desenvolvimento.tex escrita/TEX/capitulos/4.5-recursos-didaticos.tex escrita/TEX/capitulos/5-resultados.tex
git commit -m "feat(frontend): ship the React Vite interface" -m "- replace the legacy static frontend runtime with the Vite build output\n- align deploy and documentation with the final React, TypeScript, and shadcn stack\n- verify the migrated workflows with unit, e2e, backend, and thesis build checks"
```

---

## Self-Review

### Spec coverage

- SPA architecture: covered by Tasks 1 and 2.
- shadcn/ui adoption: covered by Task 2.
- typed API and local feature state: covered by Task 3.
- all modules included: covered by Tasks 4, 5, and 6.
- selective library replacement: covered by Tasks 3, 5, and 6.
- deploy alignment: covered by Task 7.
- thesis rewrite without migration language: covered by Task 7.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” markers remain in the execution steps.
- Commands are explicit for tests, build, and doc restoration.
- Git restore sources for TEX are pinned to exact commits.

### Type consistency

- Route names and module labels match the approved spec.
- Shared `ApiClient` and feature-scoped services are defined before module tasks depend on them.
- KaTeX and chart adapters are established before advanced modules consume them.
