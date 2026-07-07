# Framework do Modo Exploratório + Wiring no Sizing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a camada transversal do **Modo Exploratório** (seletor de template, sliders com debounce, roteiro guiado de 4 passos + atividade, e comparação de até 3 cenários) como componentes React reutilizáveis em `src/features/exploratory/`, portando **verbatim** a configuração pedagógica do legado (`8967e14:frontend/js/modules/didatic.js`), e conectá-la ao módulo **Dimensionamento (Sizing)** de modo que mover um slider recalcule o diâmetro e atualize o `VelocityProfileChart` ao vivo, com cenários salvos listados.

**Architecture:** Frontend Vite + React 19 + shadcn (estilo `base-nova` sobre `@base-ui/react`) + Tailwind v4. O conteúdo (templates, sliders, roteiros, atividades) é *dado puro* portado verbatim para módulos `.ts` tipados; o comportamento (debounce, aplicação de campos, cenários) é reimplementado num hook React (`useExploratory`). Cada página é dona do estado do form e do resultado; o `ExploratoryPanel` recebe a config do módulo + um estado com callbacks (`applyFields`, `changeField`, `describeScenario`) e é controlado pela página. Vive em `src/features/exploratory/`.

**Tech Stack:** React 19, react-router-dom 7, `@base-ui/react` (base do shadcn `base-nova`), sonner (via `notify`), react-katex/katex, vitest + @testing-library/react (jsdom, `globals: true`), Tailwind v4.

**Escopo deste plano:** O **framework exploratório** (types, templates verbatim de todos os 5 módulos, hook, 5 componentes UI) e o **wiring no Sizing**. **NÃO** inclui wiring de Flow/Pump/Reactor/Balance (cada um entra no seu spec/plano próprio, reusando este framework). Assume que o **Plano 1** (`2026-07-05-sizing-base-e-fundacao.md`) já foi executado — portanto os primitivos abaixo **já existem** e devem ser **reusados, não recriados**:

- `@/lib/api` → `apiClient` (extrai `detail` do FastAPI, erro legível), `ApiError`.
- `@/lib/notify` → `notify.success/error/info` (sonner).
- `@/lib/validation` → `validateNumber(rule, raw, label)`.
- `@/lib/units` → `formatQuantity`, `abbreviateUnit`, `formatNumber`.
- `@/components/number-field` → `NumberField`.
- `@/components/property-table` → `PropertyTable`.
- `@/components/how-it-works` → `HowItWorks`, `TheoryRef`.
- `@/components/variables-table` → `VariablesTable`.
- `@/components/math-block` → `MathBlock` (já existia antes do Plano 1).
- `@/components/viz/velocity-profile` → `VelocityProfileChart`, `buildVelocityProfile`, tipo `VelocityProfile`.
- `@/features/sizing/didactics` → `DiameterHowItWorks`, `RealDiameterHowItWorks`.
- `@/features/sizing/presets` → `sizingExample`.
- `@/features/sizing/sizing-page.tsx` → `SizingPage` já em paridade base (acordeões, exemplo, validação, toast, `VelocityProfileChart`).

Referência do spec: `docs/superpowers/specs/2026-07-04-restauracao-paridade-frontend-react-design.md` (§6 Framework do Modo Exploratório). Design de referência: `docs/superpowers/specs/2026-07-02-modo-exploratorio-didatico-design.md`. Fonte verbatim: `8967e14:frontend/js/modules/didatic.js` e `8967e14:frontend/js/modules/sizing.js`.

**Comandos úteis:**
- Rodar todos os testes: `cd frontend && npm test`
- Rodar um teste específico: `cd frontend && npx vitest run src/test/<arquivo>.test.tsx`
- Type-check/build: `cd frontend && npm run build`

> **Nota de portabilidade verbatim:** No legado, os `default`/`min`/`max`/`step` dos sliders são **números** e os `fields` são **strings**. Isso é portado exatamente assim para preservar a paridade. No legado o `scenarioSummaryFn` lia o DOM (`document.getElementById(...)`); aqui isso vira o callback `describeScenario()` da página (que lê o estado React). Os `steps` são sempre 4 e `activity` é sempre 1 string por template — portamos como `steps: string[]` (4 itens) e `activity: string` (o primeiro/único item do array legado). O `apply` (usado só no Balance no legado, via querySelector) não é portado como função DOM: o Balance mapeia esses sliders para `field`/`extraFields` quando for wirado no seu próprio plano; aqui portamos os `min/max/step/default/label/unit` verbatim e deixamos o `field` desses sliders como o nome do campo lógico do Balance (documentado em `meta`).

---

## File Structure

**Criar:**
- `frontend/src/components/ui/slider.tsx` — via shadcn CLI (`npx shadcn@latest add slider`)
- `frontend/src/features/exploratory/types.ts` — contratos tipados
- `frontend/src/features/exploratory/templates.ts` — configs verbatim dos 5 módulos
- `frontend/src/features/exploratory/use-exploratory.ts` — hook de estado (templates/sliders/cenários)
- `frontend/src/features/exploratory/template-selector.tsx`
- `frontend/src/features/exploratory/param-slider.tsx`
- `frontend/src/features/exploratory/guided-steps.tsx`
- `frontend/src/features/exploratory/scenario-comparison.tsx`
- `frontend/src/features/exploratory/exploratory-panel.tsx`
- Testes: `frontend/src/test/exploratory-templates.test.ts`, `use-exploratory.test.ts`, `template-selector.test.tsx`, `param-slider.test.tsx`, `guided-steps.test.tsx`, `scenario-comparison.test.tsx`, `exploratory-panel.test.tsx`

**Modificar:**
- `frontend/src/features/sizing/sizing-page.tsx` — instanciar `useExploratory(sizingExploratory, ...)` e renderizar `<ExploratoryPanel>` abaixo do resultado
- `frontend/src/test/sizing-page.test.tsx` — casos de integração do painel (template + slider + cenário)

---

## Task 1: Componente `Slider` do shadcn

Adiciona o primitivo `Slider` (estilo `base-nova` sobre `@base-ui/react`). Precisamos conhecer os **nomes exportados** e a **assinatura de `onValueChange`** antes de escrever o `ParamSlider`.

**Files:**
- Create: `frontend/src/components/ui/slider.tsx` (via CLI)

- [ ] **Step 1: Adicionar o componente**

Run: `cd frontend && npx shadcn@latest add slider`
Expected: cria `src/components/ui/slider.tsx`.

- [ ] **Step 2: Descobrir os exports e a API**

Run: `cd frontend && grep -nE "export|onValueChange|value=|defaultValue" src/components/ui/slider.tsx`
Anotar:
- O nome do componente exportado (esperado: `Slider`).
- Se o valor é passado como `number[]` (padrão Radix/Base UI) ou `number`.
- O nome do callback de mudança (esperado: `onValueChange` recebendo `number[]`, ou possivelmente `(value: number) => void` no Base UI).

> **IMPORTANTE:** Se a API divergir do assumido no Task 5 (que assume `Slider` com `value={[n]}` e `onValueChange={(v: number[]) => ...}`), ajuste **apenas o wrapper `ParamSlider`** (Task 5) — o restante do plano não toca no `Slider` diretamente. Se o Base UI expuser `value={n}` / `onValueChange={(v: number) => ...}`, adapte o handler do `ParamSlider` de acordo. O teste do `ParamSlider` (Task 5) usa `fireEvent` num `<input type="range">` interno, que é o markup que tanto Radix quanto Base UI renderizam por baixo — cobrindo os dois casos.

- [ ] **Step 3: Type-check**

Run: `cd frontend && npm run build`
Expected: sem erros de tipo introduzidos pelo novo arquivo.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/ui/slider.tsx components.json
git commit -m "feat(frontend): add shadcn slider primitive"
```

---

## Task 2: `types.ts` — contratos do framework

Define os tipos que os componentes e templates consomem. Sem lógica; é validado indiretamente por `templates.ts` (Task 3) e pelos componentes.

**Files:**
- Create: `frontend/src/features/exploratory/types.ts`

- [ ] **Step 1: Implementar**

```ts
// frontend/src/features/exploratory/types.ts

/**
 * Um slider exploratório. `min`/`max`/`step`/`default` são NÚMEROS (verbatim do
 * legado). `field` é o id lógico do campo do form que o slider controla.
 * `linkedFields`/`extraFields` recebem o mesmo valor do slider (ex.: reator
 * espelha a conversão em CSTR + PFR + plot).
 */
export type SliderConfig = {
  id: string;
  field: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  linkedFields?: string[];
  extraFields?: string[];
};

/**
 * Um template didático de um módulo. `fields` é o preset aplicado ao form
 * (strings, verbatim). `sliders` calibra os controles. `steps` são os 4 cards
 * do roteiro; `activity` é a pergunta final. `meta` guarda dados específicos do
 * módulo (ex.: `roughness` no flow, `reactionOrders` no reactor).
 */
export type TemplateConfig = {
  key: string;
  name: string;
  fields: Record<string, string>;
  sliders: SliderConfig[];
  steps: string[];
  activity: string;
  meta?: Record<string, unknown>;
};

/** A configuração exploratória completa de um módulo. */
export type ModuleExploratoryConfig = {
  module: string;
  templates: TemplateConfig[];
};

/** Um cenário salvo para comparação (máx. 3 por módulo). */
export type Scenario = {
  id: string;
  name: string;
  color: string;
};

/** Cores dos cenários, na ordem de salvamento (verbatim do legado). */
export const SCENARIO_COLORS = ["#2563EB", "#D97706", "#16A34A"] as const;
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run build`
Expected: sem erros (arquivo só de tipos + uma const).

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/features/exploratory/types.ts
git commit -m "feat(frontend): add exploratory framework types"
```

---

## Task 3: `templates.ts` — configs verbatim dos 5 módulos

Porta o `pedagogicTemplates` de `8967e14:frontend/js/modules/didatic.js` **verbatim** (campos, faixas dos sliders, `steps` de 4 itens, `activity`, `meta` com `roughness`/`reactionOrders` quando houver). Exporta `sizingExploratory`, `flowExploratory`, `pumpExploratory`, `reactorExploratory`, `balanceExploratory`.

**Files:**
- Create: `frontend/src/features/exploratory/templates.ts`
- Test: `frontend/src/test/exploratory-templates.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// frontend/src/test/exploratory-templates.test.ts
import {
  balanceExploratory,
  flowExploratory,
  pumpExploratory,
  reactorExploratory,
  sizingExploratory,
} from "@/features/exploratory/templates";

describe("templates exploratórios", () => {
  it("sizing tem 2 templates com faixas verbatim", () => {
    expect(sizingExploratory.module).toBe("sizing");
    expect(sizingExploratory.templates.map((t) => t.key)).toEqual([
      "process-line",
      "suction-line",
    ]);
    const processLine = sizingExploratory.templates[0];
    expect(processLine.fields).toEqual({ "flow-rate": "0.01", velocity: "1.5" });
    const flowSlider = processLine.sliders.find((s) => s.field === "flow-rate");
    expect(flowSlider).toMatchObject({
      min: 0.001,
      max: 0.05,
      step: 0.001,
      default: 0.01,
      unit: "m3/s",
    });
    expect(processLine.steps).toHaveLength(4);
    expect(processLine.activity).toMatch(/DN comercial abaixo de 100 mm/);
  });

  it("flow tem 3 templates e carrega roughness em meta", () => {
    expect(flowExploratory.templates.map((t) => t.key)).toEqual([
      "water-pvc-dn100",
      "oil-steel-dn80",
      "air-duct-200",
    ]);
    expect(flowExploratory.templates[1].meta?.roughness).toBe(0.045);
  });

  it("reactor espelha a conversão em linkedFields e extraFields", () => {
    const firstOrder = reactorExploratory.templates[0];
    const convSlider = firstOrder.sliders.find(
      (s) => s.field === "cstr-conversion",
    );
    expect(convSlider?.linkedFields).toEqual(["pfr-conversion"]);
    expect(convSlider?.extraFields).toEqual(["plot-max-conversion"]);
    expect(reactorExploratory.templates[1].meta?.reactionOrders).toEqual([2, 0]);
  });

  it("pump tem 3 sliders no template padrão", () => {
    expect(pumpExploratory.templates[0].sliders).toHaveLength(3);
  });

  it("balance tem 2 templates com 2 sliders cada", () => {
    expect(balanceExploratory.templates.map((t) => t.key)).toEqual([
      "simple-separation",
      "recycle-system",
    ]);
    expect(balanceExploratory.templates[0].sliders).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/exploratory-templates.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar (valores VERBATIM de `8967e14`)**

```ts
// frontend/src/features/exploratory/templates.ts
import type { ModuleExploratoryConfig } from "@/features/exploratory/types";

export const sizingExploratory: ModuleExploratoryConfig = {
  module: "sizing",
  templates: [
    {
      key: "process-line",
      name: "Linha de processo - Água, v=1,5 m/s",
      fields: { "flow-rate": "0.01", velocity: "1.5" },
      sliders: [
        {
          id: "sizing-sl-flow",
          field: "flow-rate",
          label: "Vazao",
          unit: "m3/s",
          min: 0.001,
          max: 0.05,
          step: 0.001,
          default: 0.01,
        },
        {
          id: "sizing-sl-vel",
          field: "velocity",
          label: "Velocidade",
          unit: "m/s",
          min: 0.5,
          max: 3,
          step: 0.1,
          default: 1.5,
        },
      ],
      steps: [
        "Observe o diametro teorico calculado e a selecao do diametro real para o caso base.",
        "Aumente a vazao e note o crescimento do diametro necessario para manter a mesma velocidade.",
        "Reduza a velocidade para discutir linhas de succao e o aumento do DN comercial.",
        "Salve os cenarios e compare o compromisso entre custo de tubulacao e perda de carga.",
      ],
      activity:
        "Qual e a maior vazao que ainda permite um DN comercial abaixo de 100 mm neste caso?",
    },
    {
      key: "suction-line",
      name: "Linha de sucção - Água, v=0,8 m/s",
      fields: { "flow-rate": "0.005", velocity: "0.8" },
      sliders: [
        {
          id: "sizing-sl-flow",
          field: "flow-rate",
          label: "Vazao",
          unit: "m3/s",
          min: 0.001,
          max: 0.03,
          step: 0.001,
          default: 0.005,
        },
        {
          id: "sizing-sl-vel",
          field: "velocity",
          label: "Velocidade",
          unit: "m/s",
          min: 0.5,
          max: 2,
          step: 0.1,
          default: 0.8,
        },
      ],
      steps: [
        "Use o caso de succao para trabalhar velocidades menores e maior diametro nominal.",
        "Aumente a velocidade e compare o ganho de compacidade com o risco hidraulico associado.",
        "Observe como o campo de diametro calculado alimenta a selecao do diametro real.",
        "Salve dois cenarios e compare os DNs sugeridos.",
      ],
      activity:
        "Em qual faixa de velocidade a linha ainda se mantem coerente para succao de bomba?",
    },
  ],
};

export const flowExploratory: ModuleExploratoryConfig = {
  module: "flow",
  templates: [
    {
      key: "water-pvc-dn100",
      name: "Água a 20°C — PVC DN100, v=1,5 m/s",
      fields: {
        "characteristic-diameter": "100",
        "reynolds-velocity": "1.5",
        density: "998",
        "dynamic-viscosity": "0.001",
      },
      sliders: [
        {
          id: "flow-sl-vel",
          field: "reynolds-velocity",
          label: "Velocidade",
          unit: "m/s",
          min: 0.02,
          max: 5,
          step: 0.01,
          default: 1.5,
        },
        {
          id: "flow-sl-diam",
          field: "characteristic-diameter",
          label: "Diametro",
          unit: "mm",
          min: 50,
          max: 300,
          step: 10,
          default: 100,
        },
      ],
      steps: [
        "Observe o numero de Reynolds e localize o ponto operacional no Diagrama de Moody.",
        "Reduza a velocidade para aproximar o sistema do regime laminar e acompanhe a mudanca no fator de atrito.",
        "Varie o diametro para perceber o efeito da rugosidade relativa no ponto operacional.",
        "Salve cenarios distintos e compare os pontos sobrepostos no grafico.",
      ],
      activity: "Qual velocidade leva este sistema para a fronteira laminar em DN100?",
      meta: { roughness: 0.0015 },
    },
    {
      key: "oil-steel-dn80",
      name: "Óleo viscoso — Aço DN80, v=0,5 m/s",
      fields: {
        "characteristic-diameter": "80",
        "reynolds-velocity": "0.5",
        density: "870",
        "dynamic-viscosity": "0.05",
      },
      sliders: [
        {
          id: "flow-sl-vel",
          field: "reynolds-velocity",
          label: "Velocidade",
          unit: "m/s",
          min: 0.1,
          max: 3,
          step: 0.1,
          default: 0.5,
        },
        {
          id: "flow-sl-diam",
          field: "characteristic-diameter",
          label: "Diametro",
          unit: "mm",
          min: 50,
          max: 200,
          step: 10,
          default: 80,
        },
      ],
      steps: [
        "Compare o escoamento viscoso com o caso de agua e veja como a viscosidade domina o Reynolds.",
        "Aumente a velocidade para se aproximar da transicao de regime.",
        "Use o diametro como variavel de comparacao para alterar a rugosidade relativa do ponto no Moody.",
        "Salve e compare com o template de agua.",
      ],
      activity: "Qual velocidade minima produz turbulencia neste caso de oleo?",
      meta: { roughness: 0.045 },
    },
    {
      key: "air-duct-200",
      name: "Ar — Duto 200 mm, v=3 m/s",
      fields: {
        "characteristic-diameter": "200",
        "reynolds-velocity": "3",
        density: "1.2",
        "dynamic-viscosity": "0.0000181",
      },
      sliders: [
        {
          id: "flow-sl-vel",
          field: "reynolds-velocity",
          label: "Velocidade",
          unit: "m/s",
          min: 0.2,
          max: 10,
          step: 0.2,
          default: 3,
        },
        {
          id: "flow-sl-diam",
          field: "characteristic-diameter",
          label: "Diametro hidraulico",
          unit: "mm",
          min: 100,
          max: 500,
          step: 25,
          default: 200,
        },
      ],
      steps: [
        "Observe como a combinacao de baixa densidade e baixa viscosidade desloca o ponto do ar no diagrama.",
        "Leve o sistema para a zona de transicao reduzindo a velocidade.",
        "Aumente a velocidade para notar a menor sensibilidade do fator de atrito em regime muito turbulento.",
        "Salve e compare os tres fluidos estudados.",
      ],
      activity: "Que diametro minimo manteria a velocidade de ventilacao abaixo de 8 m/s?",
      meta: { roughness: 0.09 },
    },
  ],
};

export const pumpExploratory: ModuleExploratoryConfig = {
  module: "pump",
  templates: [
    {
      key: "standard-pump",
      name: "Bombeamento padrão — água, L=100 m, DN100",
      fields: {
        "pipe-length": "100",
        "headloss-diameter": "100",
        "headloss-flow-rate": "0.01",
        "headloss-friction-factor": "0.02",
        "headloss-velocity": "1.27",
        "atmospheric-pressure": "1.033",
        "vapor-pressure": "0.023",
        "specific-mass": "998",
        "npsh-friction-factor": "2",
        "pump-inlet-velocity": "1.27",
        "gauge-elevation": "3",
        pressure1: "0",
        pressure2: "200000",
        elevation1: "0",
        elevation2: "5",
        velocity1: "1.27",
        velocity2: "1.27",
        "head-specific-mass": "998",
        "head-friction-factor": "2",
        "npsh-required": "3",
      },
      sliders: [
        {
          id: "pump-sl-len",
          field: "pipe-length",
          label: "Comprimento",
          unit: "m",
          min: 20,
          max: 300,
          step: 10,
          default: 100,
        },
        {
          id: "pump-sl-flow",
          field: "headloss-flow-rate",
          label: "Vazao",
          unit: "m3/s",
          min: 0.005,
          max: 0.03,
          step: 0.001,
          default: 0.01,
        },
        {
          id: "pump-sl-elev",
          field: "gauge-elevation",
          label: "Cota de succao",
          unit: "m",
          min: 0,
          max: 10,
          step: 0.5,
          default: 3,
        },
      ],
      steps: [
        "Observe a curva de perda de carga para o caso base com agua.",
        "Aumente o comprimento para ver a curva se deslocar e a perda de carga crescer.",
        "Altere a cota de succao para enxergar o impacto direto na margem de NPSH.",
        "Salve cenarios e compare a decomposicao da altura manometrica.",
      ],
      activity: "Qual vazao aproxima o sistema do limite de cavitacao neste arranjo?",
    },
    {
      key: "high-resistance",
      name: "Alta resistência — óleo, L=200 m, DN80",
      fields: {
        "pipe-length": "200",
        "headloss-diameter": "80",
        "headloss-flow-rate": "0.008",
        "headloss-friction-factor": "0.035",
        "headloss-velocity": "1.59",
        "atmospheric-pressure": "1.033",
        "vapor-pressure": "0.001",
        "specific-mass": "870",
        "npsh-friction-factor": "5",
        "pump-inlet-velocity": "1.59",
        "gauge-elevation": "2",
        pressure1: "0",
        pressure2: "300000",
        elevation1: "0",
        elevation2: "8",
        velocity1: "1.59",
        velocity2: "1.59",
        "head-specific-mass": "870",
        "head-friction-factor": "5",
        "npsh-required": "3",
      },
      sliders: [
        {
          id: "pump-sl-len",
          field: "pipe-length",
          label: "Comprimento",
          unit: "m",
          min: 50,
          max: 400,
          step: 25,
          default: 200,
        },
        {
          id: "pump-sl-flow",
          field: "headloss-flow-rate",
          label: "Vazao",
          unit: "m3/s",
          min: 0.002,
          max: 0.02,
          step: 0.001,
          default: 0.008,
        },
        {
          id: "pump-sl-elev",
          field: "gauge-elevation",
          label: "Cota de succao",
          unit: "m",
          min: 0,
          max: 8,
          step: 0.5,
          default: 2,
        },
      ],
      steps: [
        "Observe a penalizacao hidraulica do oleo em uma linha mais resistente.",
        "Reduza a vazao para comparar como a perda de carga cai mais rapidamente.",
        "Compare a margem de NPSH com o caso de agua.",
        "Salve e compare os dois cenarios principais de operacao.",
      ],
      activity:
        "Que diametro seria necessario para reduzir hf sem alterar a vazao de projeto?",
    },
  ],
};

export const reactorExploratory: ModuleExploratoryConfig = {
  module: "reactor",
  templates: [
    {
      key: "first-order",
      name: "Reação de 1a ordem - A para B",
      fields: {
        "cstr-conversion": "0.8",
        "cstr-rate-constant": "0.5",
        "pfr-conversion": "0.8",
        "pfr-rate-constant": "0.5",
        "plot-rate-constant": "0.5",
        "plot-max-conversion": "0.95",
      },
      sliders: [
        {
          id: "reactor-sl-conv",
          field: "cstr-conversion",
          linkedFields: ["pfr-conversion"],
          extraFields: ["plot-max-conversion"],
          label: "Conversao X",
          unit: "",
          min: 0.1,
          max: 0.95,
          step: 0.01,
          default: 0.8,
        },
        {
          id: "reactor-sl-k",
          field: "cstr-rate-constant",
          linkedFields: ["pfr-rate-constant"],
          extraFields: ["plot-rate-constant"],
          label: "Constante k",
          unit: "min-1",
          min: 0.05,
          max: 2,
          step: 0.05,
          default: 0.5,
        },
      ],
      steps: [
        "Use o template para comparar a eficiencia volumetrica de CSTR e PFR no diagrama de Levenspiel.",
        "Aumente a conversao e note como o CSTR cresce mais rapidamente do que o PFR.",
        "Aumente a constante cinetica para reduzir ambos os volumes sem alterar a tendencia relativa.",
        "Salve cenarios e sobreponha as curvas de volume no grafico.",
      ],
      activity:
        "Em que faixa de conversao a diferenca relativa entre CSTR e PFR se torna mais visivel?",
    },
    {
      key: "second-order",
      name: "Reação de 2a ordem - A para B",
      fields: {
        "cstr-conversion": "0.6",
        "cstr-rate-constant": "0.1",
        "pfr-conversion": "0.6",
        "pfr-rate-constant": "0.1",
        "plot-rate-constant": "0.1",
        "plot-max-conversion": "0.85",
      },
      sliders: [
        {
          id: "reactor-sl-conv",
          field: "cstr-conversion",
          linkedFields: ["pfr-conversion"],
          extraFields: ["plot-max-conversion"],
          label: "Conversao X",
          unit: "",
          min: 0.1,
          max: 0.9,
          step: 0.01,
          default: 0.6,
        },
        {
          id: "reactor-sl-k",
          field: "cstr-rate-constant",
          linkedFields: ["pfr-rate-constant"],
          extraFields: ["plot-rate-constant"],
          label: "Constante k",
          unit: "L mol-1 min-1",
          min: 0.05,
          max: 1,
          step: 0.05,
          default: 0.1,
        },
      ],
      steps: [
        "Compare um caso de segunda ordem com a referencia de primeira ordem no grafico de volume.",
        "Aumente a conversao e observe como o crescimento de volume se torna mais severo.",
        "Varie k para discutir o efeito combinado de cinetica mais lenta e conversao elevada.",
        "Salve cenarios e compare as curvas sobrepostas.",
      ],
      activity:
        "Como a ordem da reacao altera a distancia entre as curvas de CSTR e PFR?",
      meta: { reactionOrders: [2, 0] },
    },
  ],
};

export const balanceExploratory: ModuleExploratoryConfig = {
  module: "balance",
  templates: [
    {
      key: "simple-separation",
      name: "Separação simples - alimentação de 100 mol/h",
      fields: {},
      sliders: [
        {
          id: "balance-sl-recycle",
          field: "recycle-fraction",
          label: "Razao de reciclo",
          unit: "",
          min: 0,
          max: 0.9,
          step: 0.05,
          default: 0.5,
        },
        {
          id: "balance-sl-feed",
          field: "composition-value",
          label: "Fracao do componente principal",
          unit: "",
          min: 0.1,
          max: 0.9,
          step: 0.05,
          default: 0.6,
        },
      ],
      steps: [
        "Carregue o exemplo do modulo e calcule o balanco para conferir o fechamento global.",
        "Gere o grafico de correntes e compare entradas e saidas por corrente.",
        "Ajuste manualmente as correntes do exemplo e recalcule.",
        "Discuta com a turma como a conservacao de massa aparece no conjunto de resultados.",
      ],
      activity: "Que mudancas nas correntes de saida mantem o fechamento do balanco?",
    },
    {
      key: "recycle-system",
      name: "Sistema com reciclo - razão de reciclo 50%",
      fields: {},
      sliders: [
        {
          id: "balance-sl-recycle",
          field: "recycle-fraction",
          label: "Razao de reciclo",
          unit: "",
          min: 0.1,
          max: 0.9,
          step: 0.05,
          default: 0.5,
        },
        {
          id: "balance-sl-feed",
          field: "composition-value",
          label: "Fracao do componente principal",
          unit: "",
          min: 0.1,
          max: 0.9,
          step: 0.05,
          default: 0.5,
        },
      ],
      steps: [
        "Carregue o exemplo e concentre a discussao no efeito do reciclo sobre as correntes internas.",
        "Use o slider de reciclo para ampliar ou reduzir a parcela retornada ao processo.",
        "Altere a fracao do componente principal na alimentacao e compare o grafico de correntes.",
        "Salve cenarios e discuta a sensibilidade do fechamento ao reciclo.",
      ],
      activity:
        "Em que faixa de reciclo o sistema passa a depender mais das correntes internas do que da alimentacao fresca?",
    },
  ],
};
```

> **Nota (Balance):** no legado os sliders do Balance usavam `apply(value)` com `querySelector` (`.recycle-fraction`, `.composition-value`), sem `field`. Aqui portamos os `min/max/step/default/label/unit` **verbatim** e demos ao `field` o nome do campo lógico (`recycle-fraction`, `composition-value`); o plano do Balance decidirá como esses campos mapeiam para o form de correntes. `fields: {}` reflete que o legado não pré-preenchia campos por id (chamava `loadExampleData()`).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/exploratory-templates.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/exploratory/templates.ts src/test/exploratory-templates.test.ts
git commit -m "feat(frontend): port pedagogic templates verbatim for 5 modules"
```

---

## Task 4: `use-exploratory.ts` — hook de estado do painel

O hook liga a config do módulo aos callbacks da página. Contrato:

```ts
useExploratory(config, {
  applyFields(fields: Record<string, string>): void,
  changeField(field: string, value: string): void,
  describeScenario(): string,
})
=> {
  activeKey: string | null,
  applyTemplate(key: string): void,
  sliderValue(id: string): number,
  onSlider(cfg: SliderConfig, value: number): void, // valor local imediato + debounce 300ms → changeField(field) e linkedFields/extraFields
  scenarios: Scenario[],
  saveScenario(): void,   // máx 3, cores #2563EB/#D97706/#16A34A
  clearScenarios(): void,
}
```

Comportamento:
- `applyTemplate(key)` → seta `activeKey`, chama `applyFields(tpl.fields)`, e reseta cada `sliderValue(cfg.id)` para `cfg.default`.
- `onSlider(cfg, value)` → atualiza o valor local do slider **imediatamente** (para o rótulo/posição), e agenda (debounce 300 ms) `changeField(cfg.field, String(value))` + um `changeField` para cada `linkedFields` e `extraFields`. O debounce é **por slider id** (mover outro slider não cancela o timer do primeiro só se forem ids diferentes — usamos um mapa de timers por id).
- `saveScenario()` → se já há 3 cenários, `notify.error("Use no máximo 3 cenários por módulo.")` e retorna; senão cria `{ id, name: describeScenario(), color: SCENARIO_COLORS[len] }`.
- `clearScenarios()` → esvazia a lista.

**Files:**
- Create: `frontend/src/features/exploratory/use-exploratory.ts`
- Test: `frontend/src/test/use-exploratory.test.ts`

- [ ] **Step 1: Escrever o teste que falha** (usa `renderHook` + fake timers para o debounce)

```ts
// frontend/src/test/use-exploratory.test.ts
import { act, renderHook } from "@testing-library/react";

import { useExploratory } from "@/features/exploratory/use-exploratory";
import { sizingExploratory } from "@/features/exploratory/templates";
import { reactorExploratory } from "@/features/exploratory/templates";

const notifyError = vi.fn();
vi.mock("@/lib/notify", () => ({
  notify: { success: vi.fn(), error: (m: string) => notifyError(m), info: vi.fn() },
}));

function makeState() {
  return {
    applyFields: vi.fn(),
    changeField: vi.fn(),
    describeScenario: vi.fn(() => "Q=0.01 m3/s, v=1.5 m/s"),
  };
}

describe("useExploratory", () => {
  beforeEach(() => {
    notifyError.mockClear();
  });

  it("applyTemplate aplica os campos e calibra os sliders para o default", () => {
    const state = makeState();
    const { result } = renderHook(() => useExploratory(sizingExploratory, state));

    act(() => result.current.applyTemplate("process-line"));

    expect(result.current.activeKey).toBe("process-line");
    expect(state.applyFields).toHaveBeenCalledWith({
      "flow-rate": "0.01",
      velocity: "1.5",
    });
    expect(result.current.sliderValue("sizing-sl-flow")).toBe(0.01);
    expect(result.current.sliderValue("sizing-sl-vel")).toBe(1.5);
  });

  it("onSlider atualiza o valor local na hora e chama changeField após 300ms", () => {
    vi.useFakeTimers();
    try {
      const state = makeState();
      const { result } = renderHook(() =>
        useExploratory(sizingExploratory, state),
      );
      act(() => result.current.applyTemplate("process-line"));

      const cfg = sizingExploratory.templates[0].sliders[0]; // flow-rate
      act(() => result.current.onSlider(cfg, 0.02));

      // valor local imediato
      expect(result.current.sliderValue("sizing-sl-flow")).toBe(0.02);
      // ainda não propagou
      expect(state.changeField).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(300));
      expect(state.changeField).toHaveBeenCalledWith("flow-rate", "0.02");
    } finally {
      vi.useRealTimers();
    }
  });

  it("propaga linkedFields e extraFields do reactor após o debounce", () => {
    vi.useFakeTimers();
    try {
      const state = makeState();
      const { result } = renderHook(() =>
        useExploratory(reactorExploratory, state),
      );
      act(() => result.current.applyTemplate("first-order"));

      const conv = reactorExploratory.templates[0].sliders[0]; // cstr-conversion
      act(() => result.current.onSlider(conv, 0.5));
      act(() => vi.advanceTimersByTime(300));

      expect(state.changeField).toHaveBeenCalledWith("cstr-conversion", "0.5");
      expect(state.changeField).toHaveBeenCalledWith("pfr-conversion", "0.5");
      expect(state.changeField).toHaveBeenCalledWith("plot-max-conversion", "0.5");
    } finally {
      vi.useRealTimers();
    }
  });

  it("saveScenario respeita o máximo de 3 e usa as cores na ordem", () => {
    const state = makeState();
    const { result } = renderHook(() => useExploratory(sizingExploratory, state));
    act(() => result.current.applyTemplate("process-line"));

    act(() => result.current.saveScenario());
    act(() => result.current.saveScenario());
    act(() => result.current.saveScenario());

    expect(result.current.scenarios.map((s) => s.color)).toEqual([
      "#2563EB",
      "#D97706",
      "#16A34A",
    ]);
    expect(result.current.scenarios[0].name).toBe("Q=0.01 m3/s, v=1.5 m/s");

    act(() => result.current.saveScenario()); // 4º
    expect(result.current.scenarios).toHaveLength(3);
    expect(notifyError).toHaveBeenCalledWith("Use no máximo 3 cenários por módulo.");
  });

  it("clearScenarios esvazia a lista", () => {
    const state = makeState();
    const { result } = renderHook(() => useExploratory(sizingExploratory, state));
    act(() => result.current.applyTemplate("process-line"));
    act(() => result.current.saveScenario());
    act(() => result.current.clearScenarios());
    expect(result.current.scenarios).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/use-exploratory.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```ts
// frontend/src/features/exploratory/use-exploratory.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { notify } from "@/lib/notify";
import {
  SCENARIO_COLORS,
  type ModuleExploratoryConfig,
  type Scenario,
  type SliderConfig,
} from "@/features/exploratory/types";

export type ExploratoryState = {
  applyFields: (fields: Record<string, string>) => void;
  changeField: (field: string, value: string) => void;
  describeScenario: () => string;
};

const DEBOUNCE_MS = 300;

export function useExploratory(
  config: ModuleExploratoryConfig,
  state: ExploratoryState,
) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  // Timers de debounce por slider id (mover um slider não cancela os outros).
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Mantém os callbacks atuais sem recriar handlers a cada render.
  const stateRef = useRef(state);
  stateRef.current = state;

  const templatesByKey = useMemo(() => {
    const map: Record<string, (typeof config.templates)[number]> = {};
    for (const template of config.templates) {
      map[template.key] = template;
    }
    return map;
  }, [config]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const applyTemplate = useCallback(
    (key: string) => {
      const template = templatesByKey[key];
      if (!template) return;

      setActiveKey(key);
      stateRef.current.applyFields(template.fields);

      const nextValues: Record<string, number> = {};
      for (const slider of template.sliders) {
        nextValues[slider.id] = slider.default;
      }
      setSliderValues(nextValues);
    },
    [templatesByKey],
  );

  const sliderValue = useCallback(
    (id: string) => sliderValues[id] ?? 0,
    [sliderValues],
  );

  const onSlider = useCallback((cfg: SliderConfig, value: number) => {
    // 1) valor local imediato (rótulo/posição do slider)
    setSliderValues((prev) => ({ ...prev, [cfg.id]: value }));

    // 2) debounce por id → propaga para os campos do form
    const existing = timers.current[cfg.id];
    if (existing) clearTimeout(existing);
    timers.current[cfg.id] = setTimeout(() => {
      const raw = String(value);
      stateRef.current.changeField(cfg.field, raw);
      (cfg.linkedFields ?? []).forEach((field) =>
        stateRef.current.changeField(field, raw),
      );
      (cfg.extraFields ?? []).forEach((field) =>
        stateRef.current.changeField(field, raw),
      );
    }, DEBOUNCE_MS);
  }, []);

  const saveScenario = useCallback(() => {
    setScenarios((prev) => {
      if (prev.length >= 3) {
        notify.error("Use no máximo 3 cenários por módulo.");
        return prev;
      }
      const scenario: Scenario = {
        id: `${config.module}-${Date.now()}-${prev.length}`,
        name: stateRef.current.describeScenario(),
        color: SCENARIO_COLORS[prev.length],
      };
      return [...prev, scenario];
    });
  }, [config.module]);

  const clearScenarios = useCallback(() => setScenarios([]), []);

  return {
    activeKey,
    applyTemplate,
    sliderValue,
    onSlider,
    scenarios,
    saveScenario,
    clearScenarios,
  };
}

export type ExploratoryController = ReturnType<typeof useExploratory>;
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/use-exploratory.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/exploratory/use-exploratory.ts src/test/use-exploratory.test.ts
git commit -m "feat(frontend): add useExploratory hook (templates, debounced sliders, scenarios)"
```

---

## Task 5: `param-slider.tsx` — slider com rótulo, valor e limites

Wrapper sobre o `Slider` do shadcn (Task 1). Exibe rótulo, valor atual com unidade e min/max. Ao mover → `onChange(value: number)`.

**Files:**
- Create: `frontend/src/features/exploratory/param-slider.tsx`
- Test: `frontend/src/test/param-slider.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// frontend/src/test/param-slider.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";

import { ParamSlider } from "@/features/exploratory/param-slider";
import type { SliderConfig } from "@/features/exploratory/types";

const cfg: SliderConfig = {
  id: "sizing-sl-flow",
  field: "flow-rate",
  label: "Vazao",
  unit: "m3/s",
  min: 0.001,
  max: 0.05,
  step: 0.001,
  default: 0.01,
};

describe("ParamSlider", () => {
  it("mostra rótulo, valor com unidade e os limites", () => {
    render(<ParamSlider config={cfg} value={0.01} onChange={() => {}} />);
    expect(screen.getByText("Vazao")).toBeInTheDocument();
    expect(screen.getByText("0.01 m3/s")).toBeInTheDocument();
    // limites min/max
    expect(screen.getByText("0.001 m3/s")).toBeInTheDocument();
    expect(screen.getByText("0.05 m3/s")).toBeInTheDocument();
  });

  it("dispara onChange com o novo valor numérico ao mover", () => {
    const onChange = vi.fn();
    render(<ParamSlider config={cfg} value={0.01} onChange={onChange} />);
    const range = screen.getByRole("slider");
    fireEvent.change(range, { target: { value: "0.02" } });
    expect(onChange).toHaveBeenCalledWith(0.02);
  });
});
```

> **Nota sobre o `role="slider"`:** tanto Radix quanto Base UI renderizam um `<input type="range">` (ou um elemento com `role="slider"`) por baixo. `getByRole("slider")` encontra esse elemento. Se o `Slider` do shadcn não expuser um input nativo que responda a `fireEvent.change`, substitua o Step 2 do teste por interação de teclado no thumb: `fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" })` e ajuste a asserção para `onChange` ter sido chamado com o próximo passo (`0.011`). Verifique o markup real com `grep -n "input\|role" src/components/ui/slider.tsx` (Task 1, Step 2) antes de decidir.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/param-slider.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar**

```tsx
// frontend/src/features/exploratory/param-slider.tsx
import { Slider } from "@/components/ui/slider";
import type { SliderConfig } from "@/features/exploratory/types";

function withUnit(value: number, unit: string) {
  return unit ? `${value} ${unit}` : String(value);
}

export function ParamSlider({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">
        <span>{config.label}</span>
        <span className="font-mono text-[#2563EB]">
          {withUnit(value, config.unit)}
        </span>
      </div>
      <Slider
        aria-label={config.label}
        min={config.min}
        max={config.max}
        step={config.step}
        value={[value]}
        onValueChange={(next: number[]) => onChange(next[0])}
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{withUnit(config.min, config.unit)}</span>
        <span>{withUnit(config.max, config.unit)}</span>
      </div>
    </div>
  );
}
```

> **Se o `Slider` do Base UI usar valor escalar** (`value={number}` / `onValueChange={(v: number) => ...}`), troque as duas linhas por `value={value}` e `onValueChange={(next: number) => onChange(next)}`. Descoberto na Task 1, Step 2.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/param-slider.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/exploratory/param-slider.tsx src/test/param-slider.test.tsx
git commit -m "feat(frontend): add ParamSlider (label, value, limits) over shadcn Slider"
```

---

## Task 6: `template-selector.tsx` — dropdown de templates

Dropdown com "Selecione um template didático" + uma opção por template (usa `template.name`). Ao selecionar → `onSelect(key)`. Mantém `<select>` nativo (poucos itens, testável por `getByLabelText`/`getByRole("combobox")`).

**Files:**
- Create: `frontend/src/features/exploratory/template-selector.tsx`
- Test: `frontend/src/test/template-selector.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// frontend/src/test/template-selector.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateSelector } from "@/features/exploratory/template-selector";
import { sizingExploratory } from "@/features/exploratory/templates";

describe("TemplateSelector", () => {
  it("lista os templates e emite a key ao selecionar", () => {
    const onSelect = vi.fn();
    render(
      <TemplateSelector
        templates={sizingExploratory.templates}
        activeKey={null}
        onSelect={onSelect}
      />,
    );

    expect(
      screen.getByRole("option", { name: /Linha de processo/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Modo Exploratório/i), {
      target: { value: "suction-line" },
    });
    expect(onSelect).toHaveBeenCalledWith("suction-line");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/template-selector.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar**

```tsx
// frontend/src/features/exploratory/template-selector.tsx
import type { TemplateConfig } from "@/features/exploratory/types";

export function TemplateSelector({
  templates,
  activeKey,
  onSelect,
}: {
  templates: TemplateConfig[];
  activeKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 text-base font-bold text-[#5B21B6]">
        🎓 Modo Exploratório
      </span>
      <label className="sr-only" htmlFor="exploratory-template-select">
        Modo Exploratório — selecionar template
      </label>
      <select
        id="exploratory-template-select"
        aria-label="Modo Exploratório"
        value={activeKey ?? ""}
        onChange={(event) => {
          if (event.target.value) onSelect(event.target.value);
        }}
        className="min-w-[220px] flex-1 rounded-[0.875rem] border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
      >
        <option value="">Selecione um template didático</option>
        {templates.map((template) => (
          <option key={template.key} value={template.key}>
            {template.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/template-selector.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/exploratory/template-selector.tsx src/test/template-selector.test.tsx
git commit -m "feat(frontend): add exploratory TemplateSelector"
```

---

## Task 7: `guided-steps.tsx` — roteiro de 4 cards colapsáveis + atividade

Renderiza um título "Roteiro de exploração", 4 cards numerados (colapsáveis: clicar no cabeçalho mostra/esconde o texto), e um card destacado "Atividade" com a pergunta. Cada card começa **expandido**.

**Files:**
- Create: `frontend/src/features/exploratory/guided-steps.tsx`
- Test: `frontend/src/test/guided-steps.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// frontend/src/test/guided-steps.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";

import { GuidedSteps } from "@/features/exploratory/guided-steps";
import { sizingExploratory } from "@/features/exploratory/templates";

const tpl = sizingExploratory.templates[0];

describe("GuidedSteps", () => {
  it("renderiza os 4 passos numerados e a atividade", () => {
    render(<GuidedSteps steps={tpl.steps} activity={tpl.activity} />);
    expect(screen.getByText("Roteiro de exploração")).toBeInTheDocument();
    expect(screen.getByText("Atividade")).toBeInTheDocument();
    expect(
      screen.getByText(/Observe o diametro teorico calculado/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/maior vazao que ainda permite um DN comercial/i),
    ).toBeInTheDocument();
    // 4 botões de passo (um por card colapsável)
    expect(screen.getAllByRole("button", { name: /Passo \d/i })).toHaveLength(4);
  });

  it("colapsa e reexpande um passo ao clicar no cabeçalho", () => {
    render(<GuidedSteps steps={tpl.steps} activity={tpl.activity} />);
    const firstHeader = screen.getByRole("button", { name: /Passo 1/i });
    // começa expandido
    expect(
      screen.getByText(/Observe o diametro teorico calculado/i),
    ).toBeVisible();
    fireEvent.click(firstHeader);
    expect(
      screen.queryByText(/Observe o diametro teorico calculado/i),
    ).not.toBeInTheDocument();
    fireEvent.click(firstHeader);
    expect(
      screen.getByText(/Observe o diametro teorico calculado/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/guided-steps.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar**

```tsx
// frontend/src/features/exploratory/guided-steps.tsx
import { useState } from "react";

function StepCard({ index, text }: { index: number; text: string }) {
  const [open, setOpen] = useState(true);
  const number = index + 1;

  return (
    <div className="mb-2 rounded-2xl border border-slate-200 bg-white/90">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">
          {number}
        </span>
        <span className="text-sm font-medium text-slate-700">
          Passo {number}
        </span>
        <span className="ml-auto text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <p className="px-4 pb-4 pl-14 text-sm leading-relaxed text-slate-700">
          {text}
        </p>
      ) : null}
    </div>
  );
}

export function GuidedSteps({
  steps,
  activity,
}: {
  steps: string[];
  activity: string;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[#5B21B6]">
        Roteiro de exploração
      </div>
      {steps.map((text, index) => (
        <StepCard key={index} index={index} text={text} />
      ))}

      <div className="mb-2 mt-3 text-xs font-bold uppercase tracking-[0.08em] text-[#5B21B6]">
        Atividade
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
        <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#D97706] text-xs font-bold text-white">
          ?
        </span>
        <p className="text-sm leading-relaxed text-slate-800">{activity}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/guided-steps.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/exploratory/guided-steps.tsx src/test/guided-steps.test.tsx
git commit -m "feat(frontend): add collapsible GuidedSteps with activity card"
```

---

## Task 8: `scenario-comparison.tsx` — salvar/limpar + lista

Cabeçalho "Comparação de cenários" com botões "Salvar cenário" e "Limpar"; lista com uma linha por cenário (bolinha na cor do cenário + nome + resumo). Recebe `scenarios`, `onSave`, `onClear`.

**Files:**
- Create: `frontend/src/features/exploratory/scenario-comparison.tsx`
- Test: `frontend/src/test/scenario-comparison.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// frontend/src/test/scenario-comparison.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";

import { ScenarioComparison } from "@/features/exploratory/scenario-comparison";
import type { Scenario } from "@/features/exploratory/types";

const scenarios: Scenario[] = [
  { id: "a", name: "Q=0.01 m3/s, v=1.5 m/s", color: "#2563EB" },
  { id: "b", name: "Q=0.02 m3/s, v=2 m/s", color: "#D97706" },
];

describe("ScenarioComparison", () => {
  it("renderiza os cenários e aciona salvar/limpar", () => {
    const onSave = vi.fn();
    const onClear = vi.fn();
    render(
      <ScenarioComparison
        scenarios={scenarios}
        onSave={onSave}
        onClear={onClear}
      />,
    );

    expect(screen.getByText("Comparação de cenários")).toBeInTheDocument();
    expect(screen.getByText("Q=0.01 m3/s, v=1.5 m/s")).toBeInTheDocument();
    expect(screen.getByText("Q=0.02 m3/s, v=2 m/s")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Salvar cenário/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Limpar/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/scenario-comparison.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar**

```tsx
// frontend/src/features/exploratory/scenario-comparison.tsx
import type { Scenario } from "@/features/exploratory/types";

export function ScenarioComparison({
  scenarios,
  onSave,
  onClear,
}: {
  scenarios: Scenario[];
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#5B21B6]">
          Comparação de cenários
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] px-4 py-1.5 text-xs font-semibold text-white"
          >
            Salvar cenário
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {scenarios.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Salve até 3 cenários para comparar lado a lado.
          </p>
        ) : (
          scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5"
            >
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ background: scenario.color }}
              />
              <span className="flex-1 text-sm text-slate-800">
                {scenario.name}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/scenario-comparison.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/exploratory/scenario-comparison.tsx src/test/scenario-comparison.test.tsx
git commit -m "feat(frontend): add ScenarioComparison list with save/clear"
```

---

## Task 9: `exploratory-panel.tsx` — compõe tudo

`<ExploratoryPanel config state />`. Instancia `useExploratory(config, state)`, renderiza o `TemplateSelector` e — só quando há template ativo — os `ParamSlider`s, `GuidedSteps` e `ScenarioComparison`. Um slot opcional `children` (render prop com `scenarios`) permite a página sobrepor os cenários na sua visualização.

**Files:**
- Create: `frontend/src/features/exploratory/exploratory-panel.tsx`
- Test: `frontend/src/test/exploratory-panel.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// frontend/src/test/exploratory-panel.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";

import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import { sizingExploratory } from "@/features/exploratory/templates";

describe("ExploratoryPanel", () => {
  it("começa só com o seletor; ao escolher template mostra sliders, roteiro e cenários", () => {
    const state = {
      applyFields: vi.fn(),
      changeField: vi.fn(),
      describeScenario: vi.fn(() => "Q=0.01 m3/s, v=1.5 m/s"),
    };

    render(<ExploratoryPanel config={sizingExploratory} state={state} />);

    // seletor sempre presente
    expect(screen.getByLabelText(/Modo Exploratório/i)).toBeInTheDocument();
    // ainda sem sliders/roteiro
    expect(screen.queryByText("Roteiro de exploração")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Modo Exploratório/i), {
      target: { value: "process-line" },
    });

    expect(state.applyFields).toHaveBeenCalledWith({
      "flow-rate": "0.01",
      velocity: "1.5",
    });
    expect(screen.getByText("Roteiro de exploração")).toBeInTheDocument();
    expect(screen.getByText("Vazao")).toBeInTheDocument();
    expect(screen.getByText("Comparação de cenários")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/exploratory-panel.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar**

```tsx
// frontend/src/features/exploratory/exploratory-panel.tsx
import type { ReactNode } from "react";

import type {
  ModuleExploratoryConfig,
  Scenario,
} from "@/features/exploratory/types";
import {
  useExploratory,
  type ExploratoryState,
} from "@/features/exploratory/use-exploratory";
import { GuidedSteps } from "@/features/exploratory/guided-steps";
import { ParamSlider } from "@/features/exploratory/param-slider";
import { ScenarioComparison } from "@/features/exploratory/scenario-comparison";
import { TemplateSelector } from "@/features/exploratory/template-selector";

export function ExploratoryPanel({
  config,
  state,
  children,
}: {
  config: ModuleExploratoryConfig;
  state: ExploratoryState;
  /** Slot opcional: a página pode sobrepor os cenários salvos na sua visualização. */
  children?: (scenarios: Scenario[]) => ReactNode;
}) {
  const controller = useExploratory(config, state);
  const activeTemplate = config.templates.find(
    (template) => template.key === controller.activeKey,
  );

  return (
    <section
      aria-label="Modo Exploratório"
      className="mt-6 rounded-[1.25rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm"
    >
      <TemplateSelector
        templates={config.templates}
        activeKey={controller.activeKey}
        onSelect={controller.applyTemplate}
      />

      {activeTemplate ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {activeTemplate.sliders.map((slider) => (
              <ParamSlider
                key={slider.id}
                config={slider}
                value={controller.sliderValue(slider.id)}
                onChange={(value) => controller.onSlider(slider, value)}
              />
            ))}
          </div>

          {children ? children(controller.scenarios) : null}

          <GuidedSteps
            steps={activeTemplate.steps}
            activity={activeTemplate.activity}
          />

          <ScenarioComparison
            scenarios={controller.scenarios}
            onSave={controller.saveScenario}
            onClear={controller.clearScenarios}
          />
        </>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/exploratory-panel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Rodar toda a suíte do framework + build**

Run: `cd frontend && npx vitest run src/test/exploratory-templates.test.ts src/test/use-exploratory.test.ts src/test/param-slider.test.tsx src/test/template-selector.test.tsx src/test/guided-steps.test.tsx src/test/scenario-comparison.test.tsx src/test/exploratory-panel.test.tsx && npm run build`
Expected: todos PASS + build limpo.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/features/exploratory/exploratory-panel.tsx src/test/exploratory-panel.test.tsx
git commit -m "feat(frontend): add ExploratoryPanel composing selector, sliders, steps, scenarios"
```

---

## Task 10: Wire no Sizing — painel ao vivo abaixo do resultado

Em `sizing-page.tsx`, instanciar `useExploratory` via `<ExploratoryPanel>` e conectar os callbacks ao estado do form. O slider aplica `flow-rate`/`velocity` ao estado (com debounce dentro do hook) e a página **recalcula o diâmetro** (dispara o mesmo submit da calculadora) para atualizar o `VelocityProfileChart` ao vivo. Os cenários salvos aparecem na lista (overlay no SVG é opcional/simples — aqui exibimos um resumo textual dos cenários salvos abaixo do gráfico).

**Files:**
- Modify: `frontend/src/features/sizing/sizing-page.tsx`
- Modify: `frontend/src/test/sizing-page.test.tsx`

> **Pré-requisito de estado:** este wire assume que o `sizing-page.tsx` do Plano 1 tem `flowRate`/`velocity` como estado string, `calculatedResult` (`{ value, units }`), e um handler que faz o POST em `/sizing/calculated-diameter`. Extraia a chamada de cálculo para uma função `runCalculatedDiameter(flow: string, vel: string)` reutilizável (chamada tanto pelo submit do form quanto pelo recálculo do slider), para não depender de um `FormEvent`.

- [ ] **Step 1: Escrever/atualizar os testes de integração (append aos casos do Plano 1)**

Adicionar ao final do `describe("SizingPage", ...)` em `frontend/src/test/sizing-page.test.tsx` (o `beforeEach`/`afterEach` e o `fetchMock` do Plano 1 são reusados; se o arquivo do Plano 1 usar um `fetchMock` local com `mockImplementation` no `beforeEach`, mantenha-o):

```tsx
  it("mostra o painel exploratório e aplica um template", async () => {
    renderSizing();
    await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i });

    const select = await screen.findByLabelText(/Modo Exploratório/i);
    fireEvent.change(select, { target: { value: "process-line" } });

    // template preenche os campos do form
    expect(screen.getByLabelText(/Vazão/i)).toHaveValue(0.01);
    expect(screen.getByLabelText(/Velocidade de projeto/i)).toHaveValue(1.5);
    // roteiro guiado aparece
    expect(await screen.findByText("Roteiro de exploração")).toBeInTheDocument();
  });

  it("salva um cenário exploratório e o exibe na lista", async () => {
    renderSizing();
    await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i });

    fireEvent.change(await screen.findByLabelText(/Modo Exploratório/i), {
      target: { value: "process-line" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar cenário/i }));

    // resumo (describeScenario) usa o estado atual da página
    expect(await screen.findByText(/Q=0.01/)).toBeInTheDocument();
  });
```

> **Nota:** para o `renderSizing()` acima, garanta que o teste do Plano 1 define esse helper (ele o define — `createMemoryRouter(routes, { initialEntries: ["/sizing"] })`). Se não, adicione-o no topo do arquivo.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/sizing-page.test.tsx`
Expected: FAIL (não há painel exploratório na página ainda).

- [ ] **Step 3: Refatorar a chamada de cálculo e adicionar o painel**

No `sizing-page.tsx`, extrair a lógica de cálculo do handler para uma função reutilizável e adicionar os imports e o painel. Aplicar estas três edições (ajuste os nomes se o Plano 1 os grafou diferente):

**(a) Imports — adicionar no topo:**

```tsx
import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import { sizingExploratory } from "@/features/exploratory/templates";
```

**(b) Extrair `runCalculatedDiameter` e apontar o `changeField` para o estado.** Dentro do componente `SizingPage`, adicionar (ou substituir a lógica interna do handler existente por uma chamada a esta função):

```tsx
  async function runCalculatedDiameter(flow: string, vel: string) {
    for (const [rule, raw, label] of [
      ["positive", flow, "Vazão"],
      ["positive", vel, "Velocidade"],
    ] as const) {
      const message =
        raw.trim() === ""
          ? `Informe ${label.toLowerCase()}.`
          : validateNumber(rule, raw, label);
      if (message) {
        notify.error(message);
        return;
      }
    }

    setRealDiameterResult(null);
    setIsCalculating(true);
    try {
      const result = await apiClient.post<QuantityResult>(
        "/sizing/calculated-diameter",
        { flow_rate: Number(flow), velocity: Number(vel) },
      );
      setCalculatedResult(result);
      setCalculatedDiameterInput(result.value.toFixed(2));
    } catch (error) {
      setCalculatedResult(null);
      notify.error(
        error instanceof Error ? error.message : "Falha ao calcular o diâmetro.",
      );
    } finally {
      setIsCalculating(false);
    }
  }

  // Callbacks consumidos pelo ExploratoryPanel.
  function applyExploratoryFields(fields: Record<string, string>) {
    if (fields["flow-rate"] !== undefined) setFlowRate(fields["flow-rate"]);
    if (fields.velocity !== undefined) setVelocity(fields.velocity);
  }

  function changeExploratoryField(field: string, value: string) {
    if (field === "flow-rate") {
      setFlowRate(value);
      void runCalculatedDiameter(value, velocity);
    } else if (field === "velocity") {
      setVelocity(value);
      void runCalculatedDiameter(flowRate, value);
    }
  }

  function describeScenario() {
    return `Q=${flowRate || "—"} m3/s, v=${velocity || "—"} m/s`;
  }
```

> **Sobre o valor "fresco" no `changeField`:** o handler do form (`handleCalculatedDiameterSubmit` do Plano 1) deve passar a delegar para `runCalculatedDiameter(flowRate, velocity)`. No `changeExploratoryField`, passamos o `value` recém-mudado explicitamente (e o outro campo do estado atual) para evitar ler estado defasado dentro do mesmo tick. Como o hook já faz debounce de 300 ms, cada recálculo dispara uma vez por parada do slider.

**(c) Renderizar o painel abaixo do resultado.** Logo após o bloco de resultado do "Diâmetro Calculado" (o `div` que contém `PropertyTable` + `VelocityProfileChart`, ainda dentro do `<CardContent>` do primeiro card, ou logo abaixo da grade de cards — escolha manter dentro da `<section>` principal, após a `<div className="grid ...">`), inserir:

```tsx
      <ExploratoryPanel
        config={sizingExploratory}
        state={{
          applyFields: applyExploratoryFields,
          changeField: changeExploratoryField,
          describeScenario,
        }}
      >
        {(scenarios) =>
          calculatedResult ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Perfil ao vivo
              </p>
              <VelocityProfileChart
                velocity={Number(velocity) || 0}
                diameterMm={calculatedResult.value}
              />
              {scenarios.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {scenarios.map((scenario) => (
                    <li
                      key={scenario.id}
                      className="flex items-center gap-2 text-xs text-slate-600"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: scenario.color }}
                      />
                      {scenario.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null
        }
      </ExploratoryPanel>
```

> Ajuste os imports que faltarem (`validateNumber` de `@/lib/validation`, `notify` de `@/lib/notify`, `VelocityProfileChart` de `@/components/viz/velocity-profile`) — todos já existem do Plano 1.

- [ ] **Step 4: Rodar o teste do Sizing e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/sizing-page.test.tsx`
Expected: PASS (casos do Plano 1 + os 2 novos).

- [ ] **Step 5: Rodar a suíte inteira + build**

Run: `cd frontend && npm test && npm run build`
Expected: todos os testes PASS e build sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/features/sizing/sizing-page.tsx src/test/sizing-page.test.tsx
git commit -m "feat(frontend): wire exploratory panel into sizing (live velocity profile, scenarios)"
```

---

## Verificação Final (Definition of Done — Framework Exploratório + Sizing)

Conferir contra o spec **§6** (Framework do Modo Exploratório) e o item "Painel exploratório" da checklist **§4**:

| Requisito (spec §6) | Onde é atendido |
|---|---|
| **§6.1.1 TemplateSelector** — dropdown 2–3 cenários; ao selecionar preenche o form, calibra sliders e ativa o roteiro | Task 6 (`TemplateSelector`) + Task 4 (`applyTemplate` chama `applyFields` e calibra sliders) + Task 9 (só mostra sliders/roteiro com template ativo) + Task 10 (wire preenche o form) |
| **§6.1.2 ParamSlider** — 2–3 sliders; mover → atualiza campo → resubmete com **debounce 300 ms** → viz ao vivo; mostra rótulo, valor+unidade e min/max | Task 5 (`ParamSlider` UI) + Task 4 (`onSlider` valor imediato + debounce 300 ms via fake timers) + Task 10 (`changeField` recalcula → `VelocityProfileChart` ao vivo) |
| **§6.1.3 ScenarioComparison** — "Salvar Cenário" (**máx 3**), lista, cores `#2563EB`/`#D97706`/`#16A34A`, "Limpar" | Task 8 (`ScenarioComparison` UI) + Task 4 (`saveScenario` máx 3 + `SCENARIO_COLORS` na ordem + `clearScenarios`) + Task 10 (lista/overlay no Sizing) |
| **§6.1.4 GuidedSteps** — 4 cards numerados colapsáveis + 1 pergunta de atividade, por template | Task 7 (`GuidedSteps` 4 cards colapsáveis + card de atividade) + Task 3 (`steps[4]` + `activity` verbatim) |
| **§6.2 Contrato de recálculo por página** — a página é dona do form; o painel recebe callbacks (aplicar valores, disparar cálculo, resumir cenário) | Task 4 (`ExploratoryState`: `applyFields`/`changeField`/`describeScenario`) + Task 10 (Sizing implementa os três) |
| **§6.3 Local** — `features/exploratory/` com os 4 componentes, `use-exploratory.ts`, `templates.ts` + `ExploratoryPanel` recebendo config + callbacks | Tasks 2–9 (todos em `src/features/exploratory/`) |
| **§6.4 Configuração verbatim de `8967e14`** — templates/sliders/roteiros portados sem alteração (com `meta` p/ `roughness`/`reactionOrders`) | Task 3 (`templates.ts`, testado por `exploratory-templates.test.ts`) |
| **§4 checklist — "Painel exploratório" (sizing)** — seletor + sliders + comparação + roteiro no módulo Sizing | Task 10 (`<ExploratoryPanel>` renderizado no `sizing-page.tsx`, testado em `sizing-page.test.tsx`) |
| **§4 checklist — Testes (vitest) cobrindo o comportamento** | Tasks 3–10 (todos com teste que falha → passa) |

**Fora do escopo deste plano (registrado):** o wiring de Flow/Pump/Reactor/Balance ao `ExploratoryPanel` (cada um no seu plano próprio, reusando este framework); o overlay multi-série real dos cenários nos gráficos recharts de Flow/Pump/Reactor (aqui, no Sizing, o overlay é o resumo textual + o perfil ao vivo).

Rodar por último `cd frontend && npm test` e `npm run build`; ambos devem passar limpos.
