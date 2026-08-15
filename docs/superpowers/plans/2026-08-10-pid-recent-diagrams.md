# P&ID Recent Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local "Meus diagramas" tab to the P&ID editor so users can reopen diagrams created or accessed in the current browser.

**Architecture:** Keep canonical diagram persistence untouched. Add a small recent-diagrams service backed by a separate `localStorage` key, expose it through `PidServices`, and consume it from the create/open flows plus a new list page under the `/pid` shell route. The focused `/pid/:diagramId` editor stays outside the AppShell.

**Tech Stack:** React 19, React Router 7, TypeScript, Zod, Vitest, Testing Library, browser `localStorage`.

---

## File Structure

- Create `frontend/src/features/pid/recent/recent-pid-diagrams.ts`: typed local recent-index service with storage parsing, upsert, list, URL validation, edit-preservation rules, and max-size enforcement.
- Create `frontend/src/test/pid/recent-pid-diagrams.test.ts`: focused unit coverage for the recent-index behavior.
- Modify `frontend/src/features/pid/api/contracts.ts`: add `PidRecentDiagramsPort` and include `recent` in `PidServices`.
- Modify `frontend/src/features/pid/api/pid-services.tsx`: instantiate the browser-local recent service through injected `storage` and `runtime.now`.
- Modify `frontend/src/test/pid/local-pid-api.test.ts`: extend service-construction coverage so test services expose `recent`.
- Create `frontend/src/features/pid/editor/pid-tabs.ts`: shared tab definitions for `Novo diagrama` and `Meus diagramas`.
- Create `frontend/src/features/pid/editor/recent-pid-diagrams-page.tsx`: list page for recent local diagrams.
- Modify `frontend/src/features/pid/editor/create-pid-page.tsx`: use shared tabs and record edit access after successful creation.
- Modify `frontend/src/features/pid/editor/pid-editor-page.tsx`: record a recent entry after successful open.
- Modify `frontend/src/features/pid/routing/pid-route-local.tsx`: add `/pid/meus-diagramas` as a shell route and keep `/pid/:diagramId` focused.
- Modify `frontend/src/features/pid/routing/pid-route-disabled.tsx`: disabled adapter must cover `/pid/meus-diagramas` without initializing local services.
- Modify `frontend/src/test/pid/pid-routes.test.tsx`: assert tab order, default tab, list route, and focused editor isolation.
- Modify `frontend/src/test/pid/create-pid-page.test.tsx`: include the `recent` test double and assert recording after create.
- Modify `frontend/src/test/pid/pid-route-integration.test.tsx`: create a diagram, verify it appears in `Meus diagramas`, and reopen it.

---

### Task 1: Recent Diagrams Storage Module

**Files:**
- Create: `frontend/src/features/pid/recent/recent-pid-diagrams.ts`
- Create: `frontend/src/test/pid/recent-pid-diagrams.test.ts`

- [ ] **Step 1: Write failing unit tests for missing, malformed, and valid listing**

Create `frontend/src/test/pid/recent-pid-diagrams.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import {
  LocalRecentPidDiagrams,
  recentPidDiagramsStorageKey,
  type RecentPidDiagram,
} from "@/features/pid/recent/recent-pid-diagrams";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function recent(storage = new MemoryStorage()) {
  let now = new Date("2026-08-10T12:00:00.000Z");
  return {
    storage,
    port: new LocalRecentPidDiagrams(storage, () => now),
    setNow: (iso: string) => { now = new Date(iso); },
  };
}

const editItem = {
  diagramId: "10000000-0000-4000-8000-000000000001",
  title: "Utilidades",
  scope: "edit" as const,
  url: "/pid/10000000-0000-4000-8000-000000000001#access=edit-token",
};

describe("LocalRecentPidDiagrams", () => {
  it("retorna lista vazia quando o índice não existe", () => {
    expect(recent().port.list()).toEqual([]);
  });

  it("trata índice malformado como vazio", () => {
    const harness = recent();
    harness.storage.setItem(recentPidDiagramsStorageKey, "{quebrado");
    expect(harness.port.list()).toEqual([]);
  });

  it("lista entradas válidas ordenadas por último acesso descrescente", () => {
    const harness = recent();
    harness.storage.setItem(recentPidDiagramsStorageKey, JSON.stringify({
      version: 1,
      items: [
        { ...editItem, lastOpenedAt: "2026-08-10T10:00:00.000Z" },
        {
          diagramId: "20000000-0000-4000-8000-000000000002",
          title: "Linha de vapor",
          scope: "view",
          url: "/pid/20000000-0000-4000-8000-000000000002#access=view-token",
          lastOpenedAt: "2026-08-10T11:00:00.000Z",
        },
      ],
    }));

    expect(harness.port.list().map((item) => item.title)).toEqual([
      "Linha de vapor",
      "Utilidades",
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd frontend
npm test -- src/test/pid/recent-pid-diagrams.test.ts
```

Expected: fail with module-not-found for `@/features/pid/recent/recent-pid-diagrams`.

- [ ] **Step 3: Implement minimal recent service listing behavior**

Create `frontend/src/features/pid/recent/recent-pid-diagrams.ts`:

```ts
import { z } from "zod";

import type { AccessScope, PidRecentDiagramsPort } from "../api/contracts";

export const recentPidDiagramsStorageKey = "dcou.pid.recent.v1";
export const recentPidDiagramsLimit = 50;

const uuidSchema = z.string().uuid();
const recentPidDiagramSchema = z.object({
  diagramId: uuidSchema,
  title: z.string().trim().min(1),
  scope: z.enum(["edit", "view"]),
  url: z.string().trim().min(1),
  lastOpenedAt: z.string().datetime({ offset: true }),
}).strict().refine((item) => isSafeRecentUrl(item.url, item.diagramId), {
  message: "URL recente inválida.",
  path: ["url"],
});

const recentPidDiagramIndexSchema = z.object({
  version: z.literal(1),
  items: z.array(recentPidDiagramSchema),
}).strict();

export type RecentPidDiagram = z.infer<typeof recentPidDiagramSchema>;

export interface UpsertRecentPidDiagramInput {
  readonly diagramId: string;
  readonly title: string;
  readonly scope: AccessScope;
  readonly url: string;
}

export class LocalRecentPidDiagrams implements PidRecentDiagramsPort {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date,
  ) {}

  list(): RecentPidDiagram[] {
    return sortRecentItems(this.readIndex());
  }

  upsert(input: UpsertRecentPidDiagramInput): void {
    const parsed = recentPidDiagramSchema.omit({ lastOpenedAt: true }).safeParse(input);
    if (!parsed.success) return;
    const timestamp = this.readNowIso();
    const existing = this.readIndex();
    const previous = existing.find((item) => item.diagramId === parsed.data.diagramId);
    const nextItem: RecentPidDiagram = previous?.scope === "edit" && parsed.data.scope === "view"
      ? { ...previous, title: parsed.data.title, lastOpenedAt: timestamp }
      : { ...parsed.data, lastOpenedAt: timestamp };
    const next = [
      nextItem,
      ...existing.filter((item) => item.diagramId !== nextItem.diagramId),
    ].sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt))
      .slice(0, recentPidDiagramsLimit);
    this.writeIndex(next);
  }

  private readIndex(): RecentPidDiagram[] {
    let serialized: string | null;
    try {
      serialized = this.storage.getItem(recentPidDiagramsStorageKey);
    } catch {
      return [];
    }
    if (serialized === null || serialized.length > 256 * 1024) return [];
    try {
      const parsed = recentPidDiagramIndexSchema.safeParse(JSON.parse(serialized));
      return parsed.success ? parsed.data.items : [];
    } catch {
      return [];
    }
  }

  private writeIndex(items: RecentPidDiagram[]): void {
    try {
      this.storage.setItem(recentPidDiagramsStorageKey, JSON.stringify({ version: 1, items }));
    } catch {
      return;
    }
  }

  private readNowIso(): string {
    try {
      const value = this.now();
      if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error("Relógio inválido.");
      return value.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
}

function sortRecentItems(items: RecentPidDiagram[]): RecentPidDiagram[] {
  return [...items].sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt));
}

function isSafeRecentUrl(value: string, diagramId: string): boolean {
  try {
    const url = new URL(value, "http://local.pid");
    return url.pathname === `/pid/${diagramId}`
      && Boolean(url.hash.match(/^#access=[A-Za-z0-9_-]+$/));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify listing passes**

Run:

```bash
cd frontend
npm test -- src/test/pid/recent-pid-diagrams.test.ts
```

Expected: pass for the first three tests.

- [ ] **Step 5: Add failing upsert tests for edit/view rules and max size**

Append these tests inside the existing `describe`:

```ts
  it("grava uma entrada de edição com timestamp atual", () => {
    const harness = recent();

    harness.port.upsert(editItem);

    expect(harness.port.list()).toEqual<RecentPidDiagram[]>([{
      ...editItem,
      lastOpenedAt: "2026-08-10T12:00:00.000Z",
    }]);
  });

  it("atualiza view para edit quando uma capacidade de edição é aberta depois", () => {
    const harness = recent();
    harness.port.upsert({ ...editItem, scope: "view", url: "/pid/10000000-0000-4000-8000-000000000001#access=view-token" });
    harness.setNow("2026-08-10T13:00:00.000Z");

    harness.port.upsert(editItem);

    expect(harness.port.list()[0]).toMatchObject({
      diagramId: editItem.diagramId,
      scope: "edit",
      url: editItem.url,
      lastOpenedAt: "2026-08-10T13:00:00.000Z",
    });
  });

  it("não rebaixa edit para view quando um link de visualização é aberto depois", () => {
    const harness = recent();
    harness.port.upsert(editItem);
    harness.setNow("2026-08-10T13:00:00.000Z");

    harness.port.upsert({
      ...editItem,
      title: "Utilidades revisado",
      scope: "view",
      url: "/pid/10000000-0000-4000-8000-000000000001#access=view-token",
    });

    expect(harness.port.list()[0]).toMatchObject({
      title: "Utilidades revisado",
      scope: "edit",
      url: editItem.url,
      lastOpenedAt: "2026-08-10T13:00:00.000Z",
    });
  });

  it("limita a lista aos 50 itens mais recentes", () => {
    const harness = recent();
    for (let index = 0; index < 55; index += 1) {
      harness.setNow(`2026-08-10T12:${index.toString().padStart(2, "0")}:00.000Z`);
      const prefix = (0x30000000 + index).toString(16);
      const id = `${prefix}-0000-4000-8000-000000000000`;
      harness.port.upsert({
        diagramId: id,
        title: `Diagrama ${index}`,
        scope: "edit",
        url: `/pid/${id}#access=edit-token-${index}`,
      });
    }

    const list = harness.port.list();
    expect(list).toHaveLength(50);
    expect(list[0].title).toBe("Diagrama 54");
    expect(list.at(-1)?.title).toBe("Diagrama 5");
  });

  it("ignora entradas com URL insegura", () => {
    const harness = recent();
    harness.storage.setItem(recentPidDiagramsStorageKey, JSON.stringify({
      version: 1,
      items: [
        { ...editItem, url: "javascript:alert(1)", lastOpenedAt: "2026-08-10T12:00:00.000Z" },
        { ...editItem, lastOpenedAt: "2026-08-10T11:00:00.000Z" },
      ],
    }));

    expect(harness.port.list()).toEqual([{ ...editItem, lastOpenedAt: "2026-08-10T11:00:00.000Z" }]);
  });
```

- [ ] **Step 6: Run tests to verify the new tests pass**

Run:

```bash
cd frontend
npm test -- src/test/pid/recent-pid-diagrams.test.ts
```

Expected: all recent module tests pass.

- [ ] **Step 7: Commit recent module**

Run:

```bash
git add frontend/src/features/pid/recent/recent-pid-diagrams.ts frontend/src/test/pid/recent-pid-diagrams.test.ts
git commit -m "feat: add local P&ID recent diagram index"
```

Expected: commit includes only the recent module and its tests.

---

### Task 2: Expose Recent Service Through PidServices

**Files:**
- Modify: `frontend/src/features/pid/api/contracts.ts`
- Modify: `frontend/src/features/pid/api/pid-services.tsx`
- Modify: `frontend/src/test/pid/local-pid-api.test.ts`

- [ ] **Step 1: Write the failing service-construction test**

In `frontend/src/test/pid/local-pid-api.test.ts`, extend the existing service factory test near the bottom:

```ts
  it("expõe o índice local de diagramas recentes no serviço P&ID", () => {
    const { storage, runtime, lock } = createHarness();
    const services = createPidServices({ adapter: "local", storage, runtime, lock });

    services.recent.upsert({
      diagramId,
      title: "Utilidades",
      scope: "edit",
      url: `/pid/${diagramId}#access=edit-token`,
    });

    expect(services.recent.list()).toEqual([expect.objectContaining({
      diagramId,
      title: "Utilidades",
      scope: "edit",
    })]);
  });
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
cd frontend
npm test -- src/test/pid/local-pid-api.test.ts -t "índice local de diagramas recentes"
```

Expected: TypeScript/test failure because `services.recent` is not defined.

- [ ] **Step 3: Add recent port types to contracts**

Modify `frontend/src/features/pid/api/contracts.ts`:

```ts
export interface RecentPidDiagram {
  diagramId: string;
  title: string;
  scope: AccessScope;
  url: string;
  lastOpenedAt: string;
}

export interface UpsertRecentPidDiagramInput {
  diagramId: string;
  title: string;
  scope: AccessScope;
  url: string;
}

export interface PidRecentDiagramsPort {
  list(): RecentPidDiagram[];
  upsert(input: UpsertRecentPidDiagramInput): void;
}
```

Then update `PidServices`:

```ts
export interface PidServices {
  document: PidDocumentPort;
  catalog: PidCatalogPort;
  collaboration: PidCollaborationPort;
  recent: PidRecentDiagramsPort;
}
```

- [ ] **Step 4: Wire the browser-local service**

Modify imports in `frontend/src/features/pid/api/pid-services.tsx`:

```ts
import { LocalRecentPidDiagrams } from "../recent/recent-pid-diagrams";
```

Extend `CreatePidServicesOptions`:

```ts
  recent?: PidRecentDiagramsPort;
```

Include `PidRecentDiagramsPort` in the contract imports:

```ts
  PidRecentDiagramsPort,
```

Return it in `createPidServices`:

```ts
  return {
    document: new LocalPidApi(storage, runtime, lock),
    catalog: normalized.catalog ?? unavailableCatalog,
    collaboration: normalized.collaboration ?? unavailableCollaboration,
    recent: normalized.recent ?? new LocalRecentPidDiagrams(storage, runtime.now),
  };
```

- [ ] **Step 5: Fix test service doubles**

Search for object literals typed as `PidServices`:

```bash
cd ..
rg -n "PidServices|services\\(" frontend/src/test/pid -g '*.ts' -g '*.tsx'
```

For each test helper that returns `PidServices`, add:

```ts
    recent: { list: vi.fn().mockReturnValue([]), upsert: vi.fn() },
```

Do not change production behavior in this step.

- [ ] **Step 6: Run service and recent tests**

Run:

```bash
cd frontend
npm test -- src/test/pid/local-pid-api.test.ts src/test/pid/recent-pid-diagrams.test.ts
```

Expected: both files pass.

- [ ] **Step 7: Commit service wiring**

Run:

```bash
git add frontend/src/features/pid/api/contracts.ts frontend/src/features/pid/api/pid-services.tsx frontend/src/test/pid
git commit -m "feat: expose P&ID recent diagrams service"
```

Expected: commit includes service wiring and any test-double updates needed for compilation.

---

### Task 3: Add Meus Diagramas Route And UI

**Files:**
- Create: `frontend/src/features/pid/editor/pid-tabs.ts`
- Create: `frontend/src/features/pid/editor/recent-pid-diagrams-page.tsx`
- Modify: `frontend/src/features/pid/editor/create-pid-page.tsx`
- Modify: `frontend/src/features/pid/routing/pid-route-local.tsx`
- Modify: `frontend/src/features/pid/routing/pid-route-disabled.tsx`
- Modify: `frontend/src/test/pid/pid-routes.test.tsx`

- [ ] **Step 1: Add failing route tests**

In `frontend/src/test/pid/pid-routes.test.tsx`, update the route declaration case:

```ts
it.each([
  "/pid",
  "/pid/meus-diagramas",
  "/pid/7c1fdcea-c47a-49d2-b16f-22c30da1b3cb",
])(
  "declara a rota P&ID %s",
  (path) => expect(matchRoutes(routes, path)).not.toBeNull(),
);
```

Add tests:

```ts
it("mantém Novo diagrama como tab padrão e Meus diagramas como segunda tab", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/pid"] });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: "Editor P&ID" })).toBeInTheDocument();
  const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
  expect(tabs).toEqual(["Novo diagrama", "Meus diagramas"]);
  expect(screen.getByRole("tab", { name: "Novo diagrama" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "Meus diagramas" })).toHaveAttribute("href", "/pid/meus-diagramas");
});

it("renderiza Meus diagramas dentro do layout geral", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/pid/meus-diagramas"] });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: "Editor P&ID" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Meus diagramas" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("Os diagramas criados ou abertos neste navegador aparecerão aqui.")).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: /Navegação principal/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run route tests to verify failure**

Run:

```bash
cd frontend
npm test -- src/test/pid/pid-routes.test.tsx
```

Expected: `/pid/meus-diagramas` is not rendered as a recent-list tab yet.

- [ ] **Step 3: Create shared tab definitions**

Create `frontend/src/features/pid/editor/pid-tabs.ts`:

```ts
export const pidEditorTabs = [
  { to: "/pid", label: "Novo diagrama" },
  { to: "/pid/meus-diagramas", label: "Meus diagramas" },
] as const;
```

Modify `CreatePidPage`:

```ts
import { pidEditorTabs } from "./pid-tabs";
```

Replace:

```tsx
tabs={[{ to: "/pid", label: "Novo diagrama" }]}
```

with:

```tsx
tabs={pidEditorTabs}
```

- [ ] **Step 4: Create the recent list page**

Create `frontend/src/features/pid/editor/recent-pid-diagrams-page.tsx`:

```tsx
import { Link } from "react-router-dom";

import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { usePidServices } from "../api/pid-services";
import { pidEditorTabs } from "./pid-tabs";

export function RecentPidDiagramsPage() {
  const { recent } = usePidServices();
  const diagrams = recent.list();

  return (
    <ModuleTabsLayout
      title="Editor P&ID"
      subtitle="Reabra diagramas criados ou acessados neste navegador."
      tabs={pidEditorTabs}
    >
      <Card>
        <CardHeader
          title="Meus diagramas"
          subtitle="Histórico local deste navegador."
        />
        <CardContent className="grid gap-3">
          {diagrams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Os diagramas criados ou abertos neste navegador aparecerão aqui.
            </p>
          ) : diagrams.map((diagram) => (
            <article
              key={diagram.diagramId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{diagram.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Último acesso: {formatRecentDate(diagram.lastOpenedAt)} · {diagram.scope === "edit" ? "Acesso de edição" : "Somente visualização"}
                </p>
              </div>
              <Link
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                to={diagram.url}
              >
                {diagram.scope === "edit" ? "Abrir editor" : "Abrir visualização"}
              </Link>
            </article>
          ))}
        </CardContent>
      </Card>
    </ModuleTabsLayout>
  );
}

function formatRecentDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
```

- [ ] **Step 5: Wire `/pid/meus-diagramas` route**

Modify `frontend/src/features/pid/routing/pid-route-local.tsx`.

Add lazy import:

```ts
const RecentPidDiagramsPage = lazy(() =>
  import("../editor/recent-pid-diagrams-page").then(({ RecentPidDiagramsPage }) => ({
    default: RecentPidDiagramsPage,
  })),
);
```

Change `pidRoute` to a parent shell route:

```tsx
import { Outlet, type RouteObject } from "react-router-dom";
```

```tsx
export const pidRoute: RouteObject = {
  path: "pid",
  element: <PidServicesLayout><Outlet /></PidServicesLayout>,
  errorElement: <PidRouteErrorPage />,
  children: [
    { index: true, element: <CreatePidPage /> },
    { path: "meus-diagramas", element: <RecentPidDiagramsPage /> },
  ],
};
```

Keep:

```tsx
export const pidFocusedEditorRoute: RouteObject = {
  path: "pid/:diagramId",
  element: <PidServicesLayout><PidEditorPage /></PidServicesLayout>,
  errorElement: <PidRouteErrorPage />,
};
```

In `frontend/src/features/pid/routing/pid-route-disabled.tsx`, make the disabled shell cover both `/pid` and `/pid/meus-diagramas`:

```ts
export const pidRoute: RouteObject = {
  path: "pid/*",
  element: <PidDisabledPage />,
};
```

Keep `pidFocusedEditorRoute` as-is.

- [ ] **Step 6: Run route tests**

Run:

```bash
cd frontend
npm test -- src/test/pid/pid-routes.test.tsx
```

Expected: route tests pass. If `/pid/meus-diagramas` is caught by the focused route, adjust `frontend/src/app/router.tsx` so the AppShell branch containing the static route is evaluated before `pidFocusedEditorRoute`, then rerun the same test.

- [ ] **Step 7: Commit route and UI shell**

Run:

```bash
git add frontend/src/features/pid/editor/pid-tabs.ts frontend/src/features/pid/editor/recent-pid-diagrams-page.tsx frontend/src/features/pid/editor/create-pid-page.tsx frontend/src/features/pid/routing/pid-route-local.tsx frontend/src/features/pid/routing/pid-route-disabled.tsx frontend/src/app/router.tsx frontend/src/test/pid/pid-routes.test.tsx
git commit -m "feat: add P&ID recent diagrams tab"
```

Expected: commit contains the tab/list route and tests.

---

### Task 4: Record Recent Entries On Create And Open

**Files:**
- Modify: `frontend/src/features/pid/editor/create-pid-page.tsx`
- Modify: `frontend/src/features/pid/editor/pid-editor-page.tsx`
- Modify: `frontend/src/test/pid/create-pid-page.test.tsx`
- Modify: `frontend/src/test/pid/pid-editor-page.test.tsx` or `frontend/src/test/pid/create-pid-page.test.tsx` existing editor tests

- [ ] **Step 1: Add failing create-page test**

In `frontend/src/test/pid/create-pid-page.test.tsx`, update the `services()` helper to expose `recent`:

```ts
    recent: { list: vi.fn().mockReturnValue([]), upsert: vi.fn() },
```

In the first create test, after the create assertion, add:

```ts
    expect(pidServices.recent.upsert).toHaveBeenCalledWith({
      diagramId,
      title: "Utilidades",
      scope: "edit",
      url: `https://dcou.test/pid/${diagramId}#access=edit-token`,
    });
```

- [ ] **Step 2: Run create-page test to verify failure**

Run:

```bash
cd frontend
npm test -- src/test/pid/create-pid-page.test.tsx -t "URLs selecionáveis"
```

Expected: fails because create page does not call `recent.upsert`.

- [ ] **Step 3: Record after successful create**

Modify `CreatePidPage`:

```ts
  const { document: documentPort, recent } = usePidServices();
```

After `setCreated(result);`, add:

```ts
      recent.upsert({
        diagramId: result.diagramId,
        title: result.document.metadata.title,
        scope: "edit",
        url: result.editUrl,
      });
```

This write is intentionally best-effort because `LocalRecentPidDiagrams.upsert()` catches storage failures.

- [ ] **Step 4: Run create-page tests**

Run:

```bash
cd frontend
npm test -- src/test/pid/create-pid-page.test.tsx
```

Expected: create-page tests pass.

- [ ] **Step 5: Add failing editor-open test**

In the `PidEditorPage` open test in `frontend/src/test/pid/create-pid-page.test.tsx`, after the `document.open` assertion, add:

```ts
    expect(pidServices.recent.upsert).toHaveBeenCalledWith({
      diagramId,
      title: "Utilidades",
      scope: "edit",
      url: `/pid/${diagramId}#access=edit-token`,
    });
```

For the view-token navigation test, add:

```ts
    expect(pidServices.recent.upsert).toHaveBeenCalledWith({
      diagramId,
      title: "Utilidades",
      scope: "view",
      url: `/pid/${diagramId}#access=read-token`,
    });
```

- [ ] **Step 6: Run editor-open tests to verify failure**

Run:

```bash
cd frontend
npm test -- src/test/pid/create-pid-page.test.tsx -t "abre pelo UUID|reabre quando UUID"
```

Expected: fails because the editor does not record opens.

- [ ] **Step 7: Record after successful open**

Modify `PidEditorPage`:

```ts
  const { document: documentPort, recent } = usePidServices();
```

Inside the successful `documentPort.open()` path, before `setSession(...)`, add:

```ts
        recent.upsert({
          diagramId,
          title: opened.document.metadata.title,
          scope: opened.scope,
          url: `${location.pathname}${location.hash}`,
        });
```

To access the current pathname, change the location destructure:

```ts
  const location = useLocation();
  const { hash } = location;
```

- [ ] **Step 8: Run create/editor tests**

Run:

```bash
cd frontend
npm test -- src/test/pid/create-pid-page.test.tsx
```

Expected: tests pass.

- [ ] **Step 9: Commit recent recording**

Run:

```bash
git add frontend/src/features/pid/editor/create-pid-page.tsx frontend/src/features/pid/editor/pid-editor-page.tsx frontend/src/test/pid/create-pid-page.test.tsx
git commit -m "feat: record P&ID diagrams when created or opened"
```

Expected: commit contains only create/open recording and tests.

---

### Task 5: Integration Coverage And Final Build

**Files:**
- Modify: `frontend/src/test/pid/pid-route-integration.test.tsx`
- Modify as needed: `frontend/src/test/pid/pid-production-boundary.test.tsx`

- [ ] **Step 1: Extend route integration test for Meus diagramas**

Modify `frontend/src/test/pid/pid-route-integration.test.tsx` after the existing create/open assertions:

```ts
  await router.navigate("/pid/meus-diagramas");

  expect(await screen.findByRole("heading", { name: "Meus diagramas" })).toBeInTheDocument();
  expect(screen.getByText("Utilidades")).toBeInTheDocument();
  expect(screen.getByText(/Acesso de edição/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("link", { name: "Abrir editor" }));

  expect(await screen.findByRole("heading", { name: "Utilidades" })).toBeInTheDocument();
  expect(screen.getByText("Acesso de edição")).toBeInTheDocument();
```

- [ ] **Step 2: Run integration test**

Run:

```bash
cd frontend
npm test -- src/test/pid/pid-route-integration.test.tsx
```

Expected: integration test passes.

- [ ] **Step 3: Check production-disabled route behavior**

Run:

```bash
cd frontend
npm test -- src/test/pid/pid-production-boundary.test.tsx
```

Expected: production-disabled tests pass. If the disabled route test still only imports `pidFocusedEditorRoute`, add a case for `pidRoute` with `/pid/meus-diagramas`:

```ts
it("mantém Meus diagramas indisponível quando o adaptador está desabilitado", async () => {
  const router = createMemoryRouter([{
    path: "/",
    element: <App />,
    children: [pidRoute],
  }], { initialEntries: ["/pid/meus-diagramas"] });

  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: "Editor P&ID indisponível" })).toBeVisible();
});
```

- [ ] **Step 4: Run focused P&ID test set**

Run:

```bash
cd frontend
npm test -- \
  src/test/pid/recent-pid-diagrams.test.ts \
  src/test/pid/local-pid-api.test.ts \
  src/test/pid/pid-routes.test.tsx \
  src/test/pid/create-pid-page.test.tsx \
  src/test/pid/pid-route-integration.test.tsx \
  src/test/pid/pid-production-boundary.test.tsx
```

Expected: all focused files pass.

- [ ] **Step 5: Run build**

Run:

```bash
cd frontend
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 6: Optional browser smoke**

If a dev server is not already running, start it:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5177
```

Open:

```text
http://127.0.0.1:5177/pid
http://127.0.0.1:5177/pid/meus-diagramas
```

Expected:

- `/pid` shows `Novo diagrama` selected.
- `/pid/meus-diagramas` shows `Meus diagramas` selected.
- Creating a diagram makes it appear in `Meus diagramas`.

- [ ] **Step 7: Commit final integration**

Run:

```bash
git add frontend/src/test/pid/pid-route-integration.test.tsx frontend/src/test/pid/pid-production-boundary.test.tsx
git commit -m "test: cover P&ID recent diagrams flow"
```

Expected: final commit contains integration/disabled-boundary coverage.

---

## Self-Review Checklist

- Spec coverage: Tasks cover separate localStorage index, create/open updates, edit-preservation, `/pid` default tab, `/pid/meus-diagramas`, empty state, privacy boundary, and focused tests/build.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `RecentPidDiagram`, `UpsertRecentPidDiagramInput`, and `PidRecentDiagramsPort` are defined before use; task snippets use the same `scope`, `url`, and `lastOpenedAt` fields as the spec.
- Scope check: no backend, account sync, old-token migration, `createdAt`, `firstSeenAt`, or `revision` work is included.
