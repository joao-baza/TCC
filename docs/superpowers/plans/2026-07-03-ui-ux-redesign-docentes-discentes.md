# UI/UX Redesign para Docentes e Discentes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar o frontend Next do DCOU como um estúdio de simulação didático, melhorando navegação, home, módulos técnicos e camada visual didático-analítica sem perder a cobertura de testes.

**Architecture:** A implementação começa pela arquitetura de informação e pelo shell, depois cria uma base visual compartilhada para os módulos, e por fim refatora `piping`, `sizing` e `flow` para o novo padrão. A fase inicial assume reaproveitamento dos contratos atuais da API; se algum módulo exigir dados novos, a mudança deve ser protegida por testes no cliente, backend e e2e antes de acoplar a nova UI.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS global legado (`frontend/css/styles.css`), Vitest + Testing Library, Playwright, FastAPI/Python para eventuais mudanças de contrato.

---

## File Structure

**Shell e arquitetura de informação**
- Modify: `frontend/src/features/shell/navigation.ts`
- Modify: `frontend/src/features/shell/app-shell.tsx`
- Modify: `frontend/src/features/shell/home-page.tsx`
- Modify: `frontend/src/features/shell/app-experience.tsx`
- Create: `frontend/src/features/shell/module-registry.ts`

**Base visual compartilhada**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/css/styles.css`
- Create: `frontend/src/components/module-page.tsx`
- Create: `frontend/src/components/module-visual-panel.tsx`
- Create: `frontend/src/components/module-continuity-panel.tsx`

**Módulos técnicos**
- Modify: `frontend/src/features/piping/piping-feature.tsx`
- Modify: `frontend/src/features/sizing/sizing-feature.tsx`
- Modify: `frontend/src/features/flow/flow-feature.tsx`

**Cliente de API e contrato**
- Modify: `frontend/src/lib/api.ts`
- Test: `frontend/src/test/api-client.test.ts`
- Conditional backend files if contract changes:
  - Modify: `routers/flow.py`
  - Modify: `routers/piping.py`
  - Modify: `routers/sizing.py`
  - Test: `demo/` or new `tests/` module-level API tests matching changed route

**Testes**
- Modify: `frontend/src/test/app-shell.test.tsx`
- Modify: `frontend/src/test/app-navigation.test.tsx`
- Modify: `frontend/src/test/app-experience.test.tsx`
- Modify: `frontend/src/test/piping-feature.test.tsx`
- Modify: `frontend/src/test/sizing-feature.test.tsx`
- Modify: `frontend/src/test/flow-feature.test.tsx`
- Create: `frontend/src/test/home-page.test.tsx`
- Modify: `frontend/tests/e2e/home.spec.ts`

**Documentação**
- Modify only if a new product module is added: `/escrita/TEX/capitulos/*.tex`

---

### Task 1: Travar a nova arquitetura de informação com testes de navegação, home e e2e

**Files:**
- Create: `frontend/src/test/home-page.test.tsx`
- Modify: `frontend/src/test/app-shell.test.tsx`
- Modify: `frontend/src/test/app-navigation.test.tsx`
- Modify: `frontend/src/test/app-experience.test.tsx`
- Modify: `frontend/tests/e2e/home.spec.ts`

- [ ] **Step 1: Write the failing unit tests for the new IA**

Adicionar testes como estes:

```tsx
import { render, screen } from "@testing-library/react";
import { HomePage } from "@/features/shell/home-page";
import { AppShell } from "@/features/shell/app-shell";

describe("HomePage IA", () => {
  it("prioritizes the two primary entry actions", () => {
    render(<HomePage />);

    expect(screen.getByRole("button", { name: "Iniciar uma simulação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir uma trilha" })).toBeInTheDocument();
  });

  it("surfaces docência and recursos blocks", () => {
    render(<HomePage />);

    expect(screen.getByText("Recursos de Apoio")).toBeInTheDocument();
    expect(screen.getByText("Para Docência")).toBeInTheDocument();
  });
});

describe("AppShell IA", () => {
  it("renders top-level product sections", () => {
    render(<AppShell />);

    expect(screen.getByRole("link", { name: "Início" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Simulações" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trilhas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Recursos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docência" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Extend the e2e to lock the first-use journey**

Adicionar um cenário Playwright como este:

```ts
test("starts from home and reaches a simulation through the new primary CTA", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Iniciar uma simulação" }).click();
  await expect(page.getByRole("heading", { name: "Simulações em Destaque" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir módulo de Escoamento" }).click();
  await expect(page.getByRole("heading", { name: "Cálculos de Escoamento" })).toBeVisible();
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
cd frontend
npm run test -- --runInBand app-shell app-navigation app-experience home-page
npx playwright test tests/e2e/home.spec.ts
```

Expected:

```text
FAIL HomePage IA prioritizes the two primary entry actions
FAIL AppShell IA renders top-level product sections
FAIL tests/e2e/home.spec.ts starts from home and reaches a simulation through the new primary CTA
```

- [ ] **Step 4: Commit the red baseline**

```bash
git add frontend/src/test/home-page.test.tsx frontend/src/test/app-shell.test.tsx frontend/src/test/app-navigation.test.tsx frontend/src/test/app-experience.test.tsx frontend/tests/e2e/home.spec.ts
git commit -m "test: lock new shell information architecture"
```

### Task 2: Introduzir o novo mapa de navegação e o registry central do produto

**Files:**
- Create: `frontend/src/features/shell/module-registry.ts`
- Modify: `frontend/src/features/shell/navigation.ts`
- Modify: `frontend/src/features/shell/app-shell.tsx`
- Modify: `frontend/src/features/shell/app-experience.tsx`
- Test: `frontend/src/test/app-shell.test.tsx`
- Test: `frontend/src/test/app-navigation.test.tsx`

- [ ] **Step 1: Implement the shared registry**

Criar `frontend/src/features/shell/module-registry.ts`:

```ts
export type ProductSectionId =
  | "home"
  | "simulations"
  | "trails"
  | "resources"
  | "teaching";

export type SimulationModuleId =
  | "piping"
  | "sizing"
  | "flow"
  | "glossary";

export const productSections = [
  { id: "home", label: "Início" },
  { id: "simulations", label: "Simulações" },
  { id: "trails", label: "Trilhas" },
  { id: "resources", label: "Recursos" },
  { id: "teaching", label: "Docência" }
] as const;

export const simulationModules = [
  { id: "piping", label: "Tubulações", group: "Hidráulica & Escoamento" },
  { id: "sizing", label: "Dimensionamento", group: "Hidráulica & Escoamento" },
  { id: "flow", label: "Escoamento", group: "Hidráulica & Escoamento" },
  { id: "glossary", label: "Glossário", group: "Recursos" }
] as const;
```

- [ ] **Step 2: Wire the shell and navigation to the registry**

Atualizar `navigation.ts` e `app-shell.tsx` para renderizar os links de topo e os grupos secundários:

```ts
import { productSections, simulationModules } from "@/features/shell/module-registry";

export const shellNavigation = {
  topLevel: productSections,
  simulations: simulationModules
};
```

```tsx
<nav aria-label="Menu principal" className="sidebar-nav">
  <div className="nav-group">
    {shellNavigation.topLevel.map((item) => (
      <a
        key={item.id}
        aria-current={currentSection === item.id ? "page" : undefined}
        className={`nav-item${currentSection === item.id ? " active" : ""}`}
        href={`#${item.id}`}
        onClick={(event) => {
          event.preventDefault();
          onNavigateSection?.(item.id);
        }}
      >
        {item.label}
      </a>
    ))}
  </div>
</nav>
```

- [ ] **Step 3: Run the shell tests**

Run:

```bash
cd frontend
npm run test -- app-shell app-navigation
```

Expected:

```text
PASS frontend/src/test/app-shell.test.tsx
PASS frontend/src/test/app-navigation.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/shell/module-registry.ts frontend/src/features/shell/navigation.ts frontend/src/features/shell/app-shell.tsx frontend/src/features/shell/app-experience.tsx frontend/src/test/app-shell.test.tsx frontend/src/test/app-navigation.test.tsx
git commit -m "feat: add top-level product navigation"
```

### Task 3: Redesenhar a home para intenção de uso, recursos e docência

**Files:**
- Modify: `frontend/src/features/shell/home-page.tsx`
- Modify: `frontend/css/styles.css`
- Modify: `frontend/src/test/home-page.test.tsx`
- Modify: `frontend/src/test/app-experience.test.tsx`
- Modify: `frontend/tests/e2e/home.spec.ts`

- [ ] **Step 1: Implement the new home structure**

Reescrever `HomePage` para incluir CTAs, blocos por objetivo e faixa de docência:

```tsx
export function HomePage({ onNavigate, onSelectModule }: HomePageProps) {
  return (
    <AppShell currentSection="home" onNavigateSection={onNavigate}>
      <section className="home-hero home-hero--studio">
        <p className="eyebrow">Simulação aplicada à Engenharia Química</p>
        <h1>DCOU - Dimensionamento Computacional de Operações Unitárias</h1>
        <p className="hero-copy">
          Estude conceitos, execute simulações e interprete resultados no mesmo fluxo.
        </p>
        <div className="hero-actions">
          <button type="button" onClick={() => onNavigate?.("simulations")}>
            Iniciar uma simulação
          </button>
          <button type="button" onClick={() => onNavigate?.("trails")}>
            Seguir uma trilha
          </button>
        </div>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 2: Add the new home styles**

Adicionar em `frontend/css/styles.css`:

```css
.home-hero--studio {
  display: grid;
  gap: 1rem;
  padding: 2rem;
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.14), transparent 38%),
    linear-gradient(135deg, #f8fafc 0%, #ecfeff 100%);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.home-block-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
```

- [ ] **Step 3: Run home tests and e2e**

Run:

```bash
cd frontend
npm run test -- home-page app-experience
npx playwright test tests/e2e/home.spec.ts
```

Expected:

```text
PASS frontend/src/test/home-page.test.tsx
PASS frontend/src/test/app-experience.test.tsx
PASS tests/e2e/home.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/shell/home-page.tsx frontend/css/styles.css frontend/src/test/home-page.test.tsx frontend/src/test/app-experience.test.tsx frontend/tests/e2e/home.spec.ts
git commit -m "feat: redesign home for simulation-first entry"
```

### Task 4: Criar a base visual compartilhada para páginas de módulo

**Files:**
- Create: `frontend/src/components/module-page.tsx`
- Create: `frontend/src/components/module-visual-panel.tsx`
- Create: `frontend/src/components/module-continuity-panel.tsx`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/css/styles.css`

- [ ] **Step 1: Add the reusable module scaffolding**

Criar `module-page.tsx`:

```tsx
import type { PropsWithChildren, ReactNode } from "react";

type ModulePageProps = PropsWithChildren<{
  title: string;
  eyebrow: string;
  summary: string;
  breadcrumbs: string[];
  aside?: ReactNode;
}>;

export function ModulePage({
  title,
  eyebrow,
  summary,
  breadcrumbs,
  aside,
  children
}: ModulePageProps) {
  return (
    <div className="module-page">
      <header className="module-page-header">
        <nav aria-label="Localização" className="module-breadcrumb">
          {breadcrumbs.join(" › ")}
        </nav>
        <p className="module-eyebrow">{eyebrow}</p>
        <h2 className="module-heading">{title}</h2>
        <p className="module-summary">{summary}</p>
      </header>
      <div className="module-page-body">
        <div className="module-page-main">{children}</div>
        {aside ? <aside className="module-page-aside">{aside}</aside> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the shared didactic and visual styles**

Adicionar regras como:

```css
.module-page {
  display: grid;
  gap: 1.5rem;
}

.module-page-body {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
}

.module-visual-panel,
.module-continuity-panel,
.module-didactic-panel {
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: #fff;
  padding: 1rem;
}
```

- [ ] **Step 3: Run a targeted smoke test**

Run:

```bash
cd frontend
npm run test -- app-experience piping-feature sizing-feature flow-feature
```

Expected:

```text
FAIL
```

Observação: a suíte ainda deve falhar porque os módulos ainda não usam os novos componentes. Aqui o objetivo é confirmar que a infraestrutura foi adicionada sem remover o comportamento existente.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/module-page.tsx frontend/src/components/module-visual-panel.tsx frontend/src/components/module-continuity-panel.tsx frontend/src/app/globals.css frontend/css/styles.css
git commit -m "feat: add shared simulation studio module scaffolding"
```

### Task 5: Refatorar `piping` para o novo fluxo com apoio visual e continuidade

**Files:**
- Modify: `frontend/src/features/piping/piping-feature.tsx`
- Modify: `frontend/src/test/piping-feature.test.tsx`
- Modify: `frontend/tests/e2e/home.spec.ts`

- [ ] **Step 1: Write the failing piping tests**

Adicionar testes como:

```tsx
it("shows objective, input area, visual interpretation and next steps", async () => {
  render(<PipingFeature api={createApiStub()} />);

  expect(screen.getByText("Selecione materiais, schedules e conexões")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Leitura Técnica" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Próximos Passos" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Rebuild the feature around `ModulePage`**

Aplicar uma estrutura como:

```tsx
return (
  <ModulePage
    eyebrow="Simulação de tubulações"
    title="Cálculos de Tubulação"
    summary="Selecione materiais, schedules e conexões para interpretar escolhas construtivas."
    breadcrumbs={["Início", "Simulações", "Tubulações"]}
    aside={
      <>
        <ModuleVisualPanel title="Leitura Técnica">
          <p>Compare rugosidade, diâmetro externo e impacto das conexões selecionadas.</p>
        </ModuleVisualPanel>
        <ModuleContinuityPanel
          title="Próximos Passos"
          actions={["Usar dados no módulo de Escoamento", "Abrir glossário contextual"]}
        />
      </>
    }
  >
    <section className="module-form-section">{/* composição */}</section>
    <section className="module-form-section">{/* schedule e diâmetro */}</section>
    <section className="module-form-section">{/* conexões */}</section>
  </ModulePage>
);
```

- [ ] **Step 3: Run unit and e2e coverage**

Run:

```bash
cd frontend
npm run test -- piping-feature app-experience
npx playwright test tests/e2e/home.spec.ts --grep "navigates to piping"
```

Expected:

```text
PASS frontend/src/test/piping-feature.test.tsx
PASS frontend/src/test/app-experience.test.tsx
PASS tests/e2e/home.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/piping/piping-feature.tsx frontend/src/test/piping-feature.test.tsx frontend/tests/e2e/home.spec.ts
git commit -m "feat: redesign piping module as guided simulation page"
```

### Task 6: Refatorar `sizing` para leitura de resultado, faixa visual e continuidade

**Files:**
- Modify: `frontend/src/features/sizing/sizing-feature.tsx`
- Modify: `frontend/src/test/sizing-feature.test.tsx`
- Modify: `frontend/tests/e2e/home.spec.ts`

- [ ] **Step 1: Write the failing sizing tests**

```tsx
it("highlights the main sizing result and the follow-up to real diameter", async () => {
  render(<SizingFeature api={createApiStub()} />);

  expect(screen.getByText("Defina vazão e velocidade para estimar o diâmetro inicial.")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Interpretação do Resultado" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Add a visual interpretation panel**

Estruturar o módulo assim:

```tsx
<ModuleVisualPanel title="Interpretação do Resultado">
  {calculatedResult ? (
    <ul>
      <li>Diâmetro calculado: {calculatedResult.value.toFixed(2)} {calculatedResult.units}</li>
      <li>Use o schedule para comparar o valor calculado com alternativas reais.</li>
    </ul>
  ) : (
    <p>Execute o cálculo para visualizar a leitura técnica e a continuidade recomendada.</p>
  )}
</ModuleVisualPanel>
```

- [ ] **Step 3: Run unit and e2e coverage**

Run:

```bash
cd frontend
npm run test -- sizing-feature
npx playwright test tests/e2e/home.spec.ts --grep "Dimensionamento"
```

Expected:

```text
PASS frontend/src/test/sizing-feature.test.tsx
PASS tests/e2e/home.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/sizing/sizing-feature.tsx frontend/src/test/sizing-feature.test.tsx frontend/tests/e2e/home.spec.ts
git commit -m "feat: add guided interpretation to sizing module"
```

### Task 7: Refatorar `flow` com visuais didático-analíticos para Reynolds, atrito e diâmetro hidráulico

**Files:**
- Modify: `frontend/src/features/flow/flow-feature.tsx`
- Modify: `frontend/src/test/flow-feature.test.tsx`
- Modify: `frontend/tests/e2e/home.spec.ts`

- [ ] **Step 1: Write the failing flow tests**

Adicionar testes como:

```tsx
it("renders didactic panels for reynolds regime and friction interpretation", async () => {
  render(<FlowFeature api={createApiStub()} />);

  expect(screen.getByRole("heading", { name: "Regime de Escoamento" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Leitura do Fator de Atrito" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Add derived visual interpretation inside the module**

Adicionar helpers locais explícitos:

```tsx
function describeReynoldsRegime(value?: number) {
  if (value === undefined) return "Preencha os parâmetros para identificar o regime.";
  if (value < 2300) return "Regime laminar.";
  if (value <= 4000) return "Faixa de transição.";
  return "Regime turbulento.";
}
```

E renderizar painéis:

```tsx
<ModuleVisualPanel title="Regime de Escoamento">
  <p>{describeReynoldsRegime(reynoldsResult?.value)}</p>
</ModuleVisualPanel>

<ModuleVisualPanel title="Leitura do Fator de Atrito">
  <p>
    {frictionResult
      ? `O fator ${frictionResult.value.toFixed(4)} resume a perda associada ao material, diâmetro e regime selecionados.`
      : "Selecione composição, schedule, diâmetro e método para interpretar o fator de atrito."}
  </p>
</ModuleVisualPanel>
```

- [ ] **Step 3: Run unit and e2e coverage**

Run:

```bash
cd frontend
npm run test -- flow-feature
npx playwright test tests/e2e/home.spec.ts --grep "Escoamento"
```

Expected:

```text
PASS frontend/src/test/flow-feature.test.tsx
PASS tests/e2e/home.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/flow/flow-feature.tsx frontend/src/test/flow-feature.test.tsx frontend/tests/e2e/home.spec.ts
git commit -m "feat: add didactic and analytic visuals to flow module"
```

### Task 8: Auditar o contrato da API e proteger cliente/backend se a UI exigir novos dados

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/test/api-client.test.ts`
- Conditional backend route files only if contract changes are needed:
  - `routers/flow.py`
  - `routers/piping.py`
  - `routers/sizing.py`

- [ ] **Step 1: Lock the current client contract with tests**

Adicionar ou expandir `frontend/src/test/api-client.test.ts`:

```ts
it("keeps the current flow and piping endpoints stable", async () => {
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ value: 99800, units: "dimensionless" })
  });

  const client = createApiClient({ baseUrl: "/api", fetchImpl: fetchImpl as typeof fetch });
  await client.calculateReynolds({
    characteristic_diameter: 50,
    velocity: 2,
    density: 998,
    dynamic_viscosity: 0.001
  });

  expect(fetchImpl).toHaveBeenCalledWith(
    "/api/flow/reynolds",
    expect.objectContaining({ method: "POST" })
  );
});
```

- [ ] **Step 2: Stop if the UI can be derived client-side**

Regra de execução:

```text
Se os novos painéis visuais puderem ser derivados de dados já retornados pela API atual,
não alterar backend nesta fase.
```

- [ ] **Step 3: If new backend fields become necessary, add backend tests before route changes**

Exemplo para `routers/flow.py`:

```python
def test_reynolds_endpoint_can_return_regime_metadata(client):
    response = client.post(
        "/flow/reynolds",
        json={
            "characteristic_diameter": 50,
            "velocity": 2,
            "density": 998,
            "dynamic_viscosity": 0.001,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["value"] > 0
    assert payload["units"] == "dimensionless"
    assert payload["regime"] in {"laminar", "transition", "turbulent"}
```

- [ ] **Step 4: Run client and backend tests**

Run:

```bash
cd frontend
npm run test -- api-client

cd ..
pytest -q
```

Expected:

```text
PASS frontend/src/test/api-client.test.ts
PASS backend/API tests covering any changed route contract
```

- [ ] **Step 5: Commit only if a contract change was required**

```bash
git add frontend/src/lib/api.ts frontend/src/test/api-client.test.ts routers/flow.py routers/piping.py routers/sizing.py
git commit -m "feat: extend api contracts for simulation studio visuals"
```

### Task 9: Verificação integrada, acessibilidade básica e sincronização com a tese se houver novos módulos

**Files:**
- Modify only if new product module is introduced: `/escrita/TEX/capitulos/*.tex`

- [ ] **Step 1: Run the complete frontend unit suite**

Run:

```bash
cd frontend
npm run test
```

Expected:

```text
PASS
```

- [ ] **Step 2: Run the targeted e2e suite**

Run:

```bash
cd frontend
npx playwright test tests/e2e/home.spec.ts
```

Expected:

```text
PASS
```

- [ ] **Step 3: Run backend tests if any API route changed in Task 8**

Run:

```bash
pytest -q
```

Expected:

```text
PASS
```

- [ ] **Step 4: Sync the thesis only if a new named module was added**

Se a execução criar novo módulo de produto, atualizar a tese com texto mínimo rastreável:

```tex
\subsection{Novo módulo no frontend}
O frontend do DCOU passou a incluir o módulo de <nome-do-modulo>, concebido para
apoiar a interpretação didática e analítica de <fenômeno ou operação>.
```

- [ ] **Step 5: Final commit**

```bash
git status
git add frontend/src frontend/tests/e2e frontend/css/styles.css frontend/src/app/globals.css escrita/TEX/capitulos
git commit -m "feat: deliver simulation studio ui overhaul"
```

---

## Self-Review

**Spec coverage**
- Home orientada por intenção: coberta em Tasks 1-3.
- Nova navegação por `Início`, `Simulações`, `Trilhas`, `Recursos`, `Docência`: coberta em Task 2.
- Estrutura compartilhada para módulos: coberta em Task 4.
- Refatoração de `piping`, `sizing` e `flow`: coberta em Tasks 5-7.
- Camada visual didática e analítica: coberta em Tasks 5-7 e protegida por Task 8.
- Testes de frontend, backend se houver contrato novo, e e2e: cobertos em Tasks 1, 5-9.
- Sincronização com `/escrita` se houver novo módulo: coberta em Task 9.

**Placeholder scan**
- Nenhum `TODO`, `TBD` ou referência vaga foi deixado como instrução principal.
- A única condição explícita é a mudança de contrato backend, tratada com passos concretos e comandos específicos.

**Type consistency**
- O plano usa `productSections`, `simulationModules`, `ModulePage`, `ModuleVisualPanel` e `ModuleContinuityPanel` de forma consistente.
- Os testes e snippets de fluxo (`home`, `simulations`, `piping`, `sizing`, `flow`, `glossary`) seguem os mesmos ids e nomes esperados.
