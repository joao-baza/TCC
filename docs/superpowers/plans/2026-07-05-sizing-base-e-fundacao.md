# Fundação Compartilhada + Sizing Base — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar o módulo Dimensionamento (Sizing) à paridade base com o legado (acordeões teóricos, exemplo, validação inline, toast de erro/sucesso, formatação com unidades da API e SVG de perfil de velocidade), construindo no caminho os primitivos compartilhados que os demais módulos vão reusar.

**Architecture:** Frontend Vite + React 19 + shadcn (estilo `base-nova` sobre `@base-ui/react`) + Tailwind v4. Reaproveita conteúdo verbatim do legado (`c17f3cc`) e reimplementa comportamento no idioma React. Os primitivos (`apiClient`, `notify`, `validation`, `NumberField`, `PropertyTable`, `HowItWorks`, `VelocityProfile`) vivem em `src/lib` e `src/components` e são consumidos pela página `src/features/sizing/sizing-page.tsx`.

**Tech Stack:** React 19, react-router-dom 7, sonner, react-katex/katex, vitest + @testing-library/react (jsdom, `globals: true`), Tailwind v4.

**Escopo deste plano:** Fundação base + Sizing base. **NÃO** inclui o modo exploratório (sliders/templates/cenários/roteiros) — esse é o Plano 2 (`2026-07-05-sizing-exploratorio-e-framework.md`). Também **não** troca os tokens globais de cor (`--primary`), que ficam para a passada de design system. Referência do spec: `docs/superpowers/specs/2026-07-04-restauracao-paridade-frontend-react-design.md`.

**Comandos úteis:**
- Rodar todos os testes: `cd frontend && npm test`
- Rodar um teste específico: `cd frontend && npx vitest run src/test/<arquivo>.test.tsx`
- Type-check/build: `cd frontend && npm run build`

---

## File Structure

**Criar:**
- `frontend/src/lib/units.ts` — abreviação de unidades + `formatQuantity`
- `frontend/src/lib/notify.ts` — wrapper de toasts sobre sonner
- `frontend/src/lib/validation.ts` — regras de validação numérica (funções puras)
- `frontend/src/components/number-field.tsx` — input numérico com validação no blur
- `frontend/src/components/property-table.tsx` — tabela Propriedade/Valor/Unidade
- `frontend/src/components/variables-table.tsx` — tabela de variáveis (símbolo/descrição/unidade)
- `frontend/src/components/how-it-works.tsx` — item de acordeão "Como funciona"
- `frontend/src/components/ui/accordion.tsx` — via shadcn CLI
- `frontend/src/components/viz/velocity-profile.tsx` — SVG do perfil de velocidade
- `frontend/src/features/sizing/didactics.tsx` — conteúdo dos 2 acordeões do Sizing
- `frontend/src/features/sizing/presets.ts` — preset "Carregar exemplo"
- `frontend/src/test/units.test.ts`, `validation.test.ts`, `notify.test.ts`, `number-field.test.tsx`, `property-table.test.tsx`, `how-it-works.test.tsx`, `velocity-profile.test.ts`

**Modificar:**
- `frontend/src/lib/api.ts` — extrair `detail` do FastAPI
- `frontend/src/app/globals.css` — tokens didáticos (regime/formula/ref)
- `frontend/src/features/sizing/sizing-page.tsx` — integrar todos os primitivos
- `frontend/src/test/sizing-page.test.tsx` — atualizar para a nova UI + novos casos
- `frontend/src/test/api-client.test.ts` — caso de extração de `detail`

---

## Task 1: `apiClient` extrai o `detail` do FastAPI

Hoje `request()` usa `response.text()` e mostra o JSON cru `{"detail":"..."}`. Deve tentar `response.json()` e extrair `detail`.

**Files:**
- Modify: `frontend/src/lib/api.ts:28-37`
- Test: `frontend/src/test/api-client.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar/checar `frontend/src/test/api-client.test.ts`:

```ts
import { ApiClient, ApiError } from "@/lib/api";

describe("ApiClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("extrai o campo detail do FastAPI em respostas de erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: "Vazão inválida" }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const client = new ApiClient();
    await expect(client.get("/x")).rejects.toMatchObject({
      message: "Vazão inválida",
      status: 422,
    });
  });

  it("usa o texto cru quando o corpo não é JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Bad Gateway", { status: 502 })),
    );
    const client = new ApiClient();
    await expect(client.get("/x")).rejects.toBeInstanceOf(ApiError);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/api-client.test.ts`
Expected: FAIL (hoje a mensagem é o JSON cru `{"detail":"Vazão inválida"}`, não `"Vazão inválida"`).

- [ ] **Step 3: Implementar**

Substituir o corpo de `request` em `frontend/src/lib/api.ts` (linhas 28-37):

```ts
  private async request<T>(path: string, init: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      const message = await this.extractErrorMessage(response);
      throw new ApiError(message, response.status);
    }

    return (await response.json()) as T;
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    const raw = await response.text();
    if (!raw) return "Request failed";
    try {
      const data = JSON.parse(raw) as { detail?: unknown };
      if (typeof data.detail === "string" && data.detail.trim()) {
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        const first = data.detail[0] as { msg?: string };
        if (typeof first?.msg === "string") return first.msg;
      }
    } catch {
      // corpo não-JSON: cai no texto cru
    }
    return raw;
  }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/api-client.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/api.ts src/test/api-client.test.ts
git commit -m "fix(frontend): extract FastAPI detail in ApiClient errors"
```

---

## Task 2: `lib/units.ts` — abreviação de unidades e `formatQuantity`

O backend retorna `units: "millimeter"`. Precisamos exibir `mm` e formatar números (removendo `.00`, usando notação científica em extremos).

**Files:**
- Create: `frontend/src/lib/units.ts`
- Test: `frontend/src/test/units.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { abbreviateUnit, formatQuantity } from "@/lib/units";

describe("units", () => {
  it("abrevia unidades conhecidas", () => {
    expect(abbreviateUnit("millimeter")).toBe("mm");
    expect(abbreviateUnit("meter")).toBe("m");
    expect(abbreviateUnit("desconhecida")).toBe("desconhecida");
  });

  it("formata quantidade removendo zeros decimais e anexando a unidade", () => {
    expect(formatQuantity(126.16, "millimeter")).toBe("126.16 mm");
    expect(formatQuantity(150, "millimeter")).toBe("150 mm");
    expect(formatQuantity(150)).toBe("150");
  });

  it("usa notação científica em valores muito pequenos", () => {
    expect(formatQuantity(0.0000123, "meter")).toBe("1.2300e-5 m");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/units.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```ts
// frontend/src/lib/units.ts
const UNIT_ABBREVIATIONS: Record<string, string> = {
  millimeter: "mm",
  millimeters: "mm",
  meter: "m",
  meters: "m",
  "meter ** 3 / second": "m³/s",
  "cubic meter / second": "m³/s",
  "meter / second": "m/s",
  pascal: "Pa",
  kelvin: "K",
  dimensionless: "",
};

export function abbreviateUnit(units: string): string {
  return UNIT_ABBREVIATIONS[units] ?? units;
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) {
    return value.toExponential(4);
  }
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

export function formatQuantity(
  value: number,
  units?: string,
  digits = 2,
): string {
  const num = formatNumber(value, digits);
  const unit = units ? abbreviateUnit(units) : "";
  return unit ? `${num} ${unit}` : num;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/units.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/units.ts src/test/units.test.ts
git commit -m "feat(frontend): add unit abbreviation and quantity formatting"
```

---

## Task 3: `lib/notify.ts` — wrapper de toasts

Padroniza as chamadas de feedback sobre o `<Toaster/>` (sonner) já montado em `app.tsx`.

**Files:**
- Create: `frontend/src/lib/notify.ts`
- Test: `frontend/src/test/notify.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { notify } from "@/lib/notify";

const success = vi.fn();
const error = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (...a: unknown[]) => success(...a), error: (...a: unknown[]) => error(...a), info: vi.fn() },
}));

describe("notify", () => {
  it("delega para toast.success e toast.error", () => {
    notify.success("ok");
    notify.error("falhou");
    expect(success).toHaveBeenCalledWith("ok");
    expect(error).toHaveBeenCalledWith("falhou");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/notify.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```ts
// frontend/src/lib/notify.ts
import { toast } from "sonner";

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
};
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/notify.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/notify.ts src/test/notify.test.ts
git commit -m "feat(frontend): add notify toast helpers"
```

---

## Task 4: `lib/validation.ts` — regras de validação numérica

Porta o helper `_setupFieldValidation` do legado como funções puras.

**Files:**
- Create: `frontend/src/lib/validation.ts`
- Test: `frontend/src/test/validation.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { validateNumber } from "@/lib/validation";

describe("validateNumber", () => {
  it("aceita vazio (validação de preenchimento é separada)", () => {
    expect(validateNumber("positive", "", "Vazão")).toBeNull();
  });
  it("positive rejeita zero e negativos", () => {
    expect(validateNumber("positive", "0", "Vazão")).toBe("Vazão deve ser um número positivo (> 0).");
    expect(validateNumber("positive", "5", "Vazão")).toBeNull();
  });
  it("nonneg aceita zero mas rejeita negativo", () => {
    expect(validateNumber("nonneg", "0", "Cota")).toBeNull();
    expect(validateNumber("nonneg", "-1", "Cota")).toBe("Cota deve ser ≥ 0.");
  });
  it("number rejeita não-números", () => {
    expect(validateNumber("number", "abc", "X")).toBe("X deve ser um número válido.");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/validation.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```ts
// frontend/src/lib/validation.ts
export type ValidationRule = "positive" | "nonneg" | "number";

export function validateNumber(
  rule: ValidationRule,
  raw: string,
  label: string,
): string | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (Number.isNaN(value)) return `${label} deve ser um número válido.`;
  if (rule === "positive" && !(value > 0)) {
    return `${label} deve ser um número positivo (> 0).`;
  }
  if (rule === "nonneg" && !(value >= 0)) {
    return `${label} deve ser ≥ 0.`;
  }
  return null;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/validation.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/validation.ts src/test/validation.test.ts
git commit -m "feat(frontend): add numeric validation rules"
```

---

## Task 5: `components/number-field.tsx` — input com validação no blur

Input controlado que valida no blur (mostra mensagem `aria-live`), limpa no focus, e marca `aria-invalid`. Mantém `id`+`label` para `getByLabelText`.

**Files:**
- Create: `frontend/src/components/number-field.tsx`
- Test: `frontend/src/test/number-field.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { NumberField } from "@/components/number-field";

function Harness() {
  const [v, setV] = useState("");
  return <NumberField id="flow" label="Vazão" rule="positive" value={v} onChange={setV} />;
}

describe("NumberField", () => {
  it("mostra erro no blur com valor inválido e limpa no focus", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Vazão");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent("Vazão deve ser um número positivo (> 0).");
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.focus(input);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/number-field.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar**

```tsx
// frontend/src/components/number-field.tsx
import { useState } from "react";

import { cn } from "@/lib/utils";
import { validateNumber, type ValidationRule } from "@/lib/validation";

type NumberFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rule?: ValidationRule;
  unit?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  min?: string;
};

export function NumberField({
  id,
  label,
  value,
  onChange,
  rule = "positive",
  unit,
  placeholder,
  required,
  step = "any",
  min = "0",
}: NumberFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const errorId = `err-${id}`;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-foreground" htmlFor={id}>
        {label}
        {unit ? <span className="ml-1 text-muted-foreground">({unit})</span> : null}
      </label>
      <input
        id={id}
        type="number"
        step={step}
        min={min}
        required={required}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onFocus={() => setError(null)}
        onChange={(event) => {
          setError(null);
          onChange(event.target.value);
        }}
        onBlur={(event) => setError(validateNumber(rule, event.target.value, label))}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400",
          error ? "border-destructive" : "border-slate-200",
        )}
      />
      {error ? (
        <p id={errorId} role="alert" aria-live="polite" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/number-field.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/number-field.tsx src/test/number-field.test.tsx
git commit -m "feat(frontend): add NumberField with inline blur validation"
```

---

## Task 6: `components/property-table.tsx` — tabela de resultados

Renderiza pares Propriedade/Valor/Unidade com `tabular-nums`, usando `formatQuantity`.

**Files:**
- Create: `frontend/src/components/property-table.tsx`
- Test: `frontend/src/test/property-table.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { render, screen } from "@testing-library/react";
import { PropertyTable } from "@/components/property-table";

describe("PropertyTable", () => {
  it("renderiza propriedade, valor formatado e unidade", () => {
    render(
      <PropertyTable
        rows={[{ label: "Diâmetro", value: 126.16, units: "millimeter" }]}
      />,
    );
    expect(screen.getByText("Diâmetro")).toBeInTheDocument();
    expect(screen.getByText("126.16 mm")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/property-table.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar**

```tsx
// frontend/src/components/property-table.tsx
import { formatQuantity } from "@/lib/units";

export type PropertyRow = {
  label: string;
  value: number | string;
  units?: string;
};

export function PropertyTable({ rows }: { rows: PropertyRow[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-slate-100 last:border-0">
            <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
            <td className="py-2 text-right font-medium tabular-nums text-slate-900">
              {typeof row.value === "number"
                ? formatQuantity(row.value, row.units)
                : row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/property-table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/property-table.tsx src/test/property-table.test.tsx
git commit -m "feat(frontend): add PropertyTable result component"
```

---

## Task 7: Acordeão + `HowItWorks` + `VariablesTable`

Adiciona o primitivo shadcn `accordion` e cria o wrapper "Como funciona" com tabela de variáveis. Reusa `MathBlock` (já existente) para fórmulas.

**Files:**
- Create: `frontend/src/components/ui/accordion.tsx` (via CLI)
- Create: `frontend/src/components/variables-table.tsx`
- Create: `frontend/src/components/how-it-works.tsx`
- Test: `frontend/src/test/how-it-works.test.tsx`

- [ ] **Step 1: Adicionar o componente shadcn accordion**

Run: `cd frontend && npx shadcn@latest add accordion`
Expected: cria `src/components/ui/accordion.tsx` exportando `Accordion, AccordionItem, AccordionTrigger, AccordionContent`.
Verificar os nomes exportados: `grep -n "export" src/components/ui/accordion.tsx`. Se os nomes diferirem, ajustar os imports dos passos seguintes de acordo.

- [ ] **Step 2: Escrever o teste que falha**

```tsx
import { render, screen } from "@testing-library/react";
import { HowItWorks } from "@/components/how-it-works";

describe("HowItWorks", () => {
  it("renderiza o título do bloco teórico", () => {
    render(
      <HowItWorks title="Como funciona — Cálculo de Diâmetro">
        <p>Conteúdo</p>
      </HowItWorks>,
    );
    expect(
      screen.getByText("Como funciona — Cálculo de Diâmetro"),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/how-it-works.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 4: Implementar `VariablesTable` e `HowItWorks`**

```tsx
// frontend/src/components/variables-table.tsx
export type VariableRow = { symbol: string; description: string; unit?: string };

export function VariablesTable({
  headers = ["Símbolo", "Variável", "Unidade"],
  rows,
}: {
  headers?: [string, string, string?] | string[];
  rows: VariableRow[];
}) {
  return (
    <table className="my-3 w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          {headers.map((h) => (
            <th key={h} className="border-b border-slate-200 py-1 pr-4 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.symbol} className="border-b border-slate-100 last:border-0">
            <td className="py-1 pr-4 font-mono">{row.symbol}</td>
            <td className="py-1 pr-4">{row.description}</td>
            {row.unit !== undefined ? <td className="py-1">{row.unit}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

```tsx
// frontend/src/components/how-it-works.tsx
import type { ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function HowItWorks({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Accordion className="w-full">
      <AccordionItem value={title}>
        <AccordionTrigger className="text-sm font-medium text-[#5B21B6]">
          {title}
        </AccordionTrigger>
        <AccordionContent className="space-y-2 text-sm text-muted-foreground">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function TheoryRef({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs italic text-muted-foreground">{children}</p>;
}
```

> Nota: se o `Accordion` do shadcn exigir a prop `type="single" collapsible`, adicioná-la ao `<Accordion>`. Verificar a assinatura em `src/components/ui/accordion.tsx` após o Step 1.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/how-it-works.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/ui/accordion.tsx src/components/variables-table.tsx src/components/how-it-works.tsx src/test/how-it-works.test.tsx
git commit -m "feat(frontend): add accordion, HowItWorks and VariablesTable primitives"
```

---

## Task 8: `components/viz/velocity-profile.tsx` — SVG de perfil de velocidade

Porta `_renderVelocityProfile` do legado. Separa o cálculo puro (testável) da renderização SVG. Uma das 7 visualizações da tese.

**Files:**
- Create: `frontend/src/components/viz/velocity-profile.tsx`
- Test: `frontend/src/test/velocity-profile.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { buildVelocityProfile } from "@/components/viz/velocity-profile";

describe("buildVelocityProfile", () => {
  it("classifica o regime pelo Reynolds (água a 20°C)", () => {
    // Re = 1e6 * V * D(m). V=1.5, D=0.126 m -> ~189000 (turbulento)
    expect(buildVelocityProfile(1.5, 126).regime).toBe("turbulent");
    // V=0.1, D=0.01 m -> Re=1000 (laminar)
    expect(buildVelocityProfile(0.1, 10).regime).toBe("laminar");
  });

  it("gera uma flecha por posição radial", () => {
    expect(buildVelocityProfile(1.5, 126).arrows).toHaveLength(9);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/velocity-profile.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```tsx
// frontend/src/components/viz/velocity-profile.tsx
export type Regime = "laminar" | "transition" | "turbulent";

const REGIME_COLOR: Record<Regime, string> = {
  laminar: "#3B82F6",
  transition: "#F59E0B",
  turbulent: "#EF4444",
};
const REGIME_LABEL: Record<Regime, string> = {
  laminar: "Laminar",
  transition: "Transição",
  turbulent: "Turbulento",
};

export type ProfileArrow = { x1: number; y1: number; x2: number; y2: number; tip: string };

export type VelocityProfile = {
  reynolds: number;
  regime: Regime;
  color: string;
  label: string;
  arrows: ProfileArrow[];
  diameterMm: number;
  velocity: number;
};

export function buildVelocityProfile(
  velocity: number,
  diameterMm: number,
): VelocityProfile {
  const diameterM = diameterMm / 1000;
  const reynolds = (1000 * velocity * diameterM) / 0.001;
  const isLam = reynolds < 2300;
  const isTurb = reynolds >= 4000;
  const regime: Regime = isLam ? "laminar" : isTurb ? "turbulent" : "transition";
  const color = REGIME_COLOR[regime];

  const ys = [-0.85, -0.65, -0.45, -0.25, 0, 0.25, 0.45, 0.65, 0.85];
  const maxLen = 260;
  const startX = 55;
  const cy = 70;
  const hr = 48;

  const arrows: ProfileArrow[] = ys.map((y) => {
    let vr: number;
    if (isLam) vr = 1 - y * y;
    else if (isTurb) vr = Math.pow(1 - Math.abs(y), 1 / 7);
    else {
      const t = (reynolds - 2300) / 1700;
      vr = (1 - y * y) * (1 - t) + Math.pow(1 - Math.abs(y), 1 / 7) * t;
    }
    const len = Math.max(14, vr * maxLen);
    const yp = cy + y * hr;
    return { x1: startX, y1: yp, x2: startX + len, y2: yp, tip: `${startX + len},${yp}` };
  });

  return {
    reynolds,
    regime,
    color,
    label: REGIME_LABEL[regime],
    arrows,
    diameterMm,
    velocity,
  };
}

export function VelocityProfileChart({
  velocity,
  diameterMm,
}: {
  velocity: number;
  diameterMm: number;
}) {
  const p = buildVelocityProfile(velocity, diameterMm);
  const cy = 70;
  const hr = 48;
  const top = cy - hr;
  const bottom = cy + hr;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 p-3">
      <div className="mb-2 text-sm font-medium text-slate-800">
        Perfil de Velocidade — Duto Circular
      </div>
      <svg viewBox="0 0 400 140" className="w-full" style={{ maxHeight: 140 }} role="img" aria-label={`Perfil de velocidade ${p.label}`}>
        <rect x="0" y={top} width="400" height={hr * 2} fill="rgba(59,130,246,0.06)" />
        <line x1="0" y1={top} x2="400" y2={top} stroke="#1F2937" strokeWidth={3} />
        <line x1="0" y1={bottom} x2="400" y2={bottom} stroke="#1F2937" strokeWidth={3} />
        <text x="6" y={top - 3} fontSize="9" fill="#6B7280">parede</text>
        <text x="6" y={bottom + 10} fontSize="9" fill="#6B7280">parede</text>
        {p.arrows.map((a, i) => (
          <g key={i}>
            <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={p.color} strokeWidth={2.5} strokeLinecap="round" />
            <polygon points={`${a.x2},${a.y2 - 4} ${a.x2 + 8},${a.y2} ${a.x2},${a.y2 + 4}`} fill={p.color} />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{ background: `${p.color}20`, color: p.color, borderColor: `${p.color}50` }}
        >
          {p.label} — Re ≈ {p.reynolds.toFixed(0)}
        </span>
        <span className="text-xs text-muted-foreground">
          Perfil estimado para água a 20&nbsp;°C · D = {p.diameterMm.toFixed(1)} mm · V = {p.velocity} m/s
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/velocity-profile.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/viz/velocity-profile.tsx src/test/velocity-profile.test.ts
git commit -m "feat(frontend): add velocity profile SVG visualization"
```

---

## Task 9: Conteúdo do Sizing — acordeões e preset

Conteúdo verbatim de `c17f3cc:frontend/index.html` (linhas 213-262) e do preset `didatic.js`.

**Files:**
- Create: `frontend/src/features/sizing/didactics.tsx`
- Create: `frontend/src/features/sizing/presets.ts`

- [ ] **Step 1: Criar o preset**

```ts
// frontend/src/features/sizing/presets.ts
export const sizingExample = {
  flowRate: "0.01",
  velocity: "1.5",
} as const;
```

- [ ] **Step 2: Criar os componentes de conteúdo dos acordeões**

```tsx
// frontend/src/features/sizing/didactics.tsx
import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { MathBlock } from "@/components/math-block";
import { VariablesTable } from "@/components/variables-table";

export function DiameterHowItWorks() {
  return (
    <HowItWorks title="Como funciona — Cálculo de Diâmetro">
      <p>
        Para escoamento em seção circular, a equação da continuidade relaciona a{" "}
        <strong>vazão volumétrica</strong>, a <strong>velocidade média</strong> e a{" "}
        <strong>área transversal</strong> do tubo:
      </p>
      <MathBlock expression={"D = \\sqrt{\\dfrac{4Q}{\\pi V}}"} />
      <VariablesTable
        rows={[
          { symbol: "D", description: "Diâmetro calculado", unit: "m" },
          { symbol: "Q", description: "Vazão volumétrica", unit: "m³/s" },
          { symbol: "V", description: "Velocidade média do fluido", unit: "m/s" },
        ]}
      />
      <p>
        <strong>Diâmetro comercial:</strong> o valor calculado é um mínimo teórico. Na
        prática, seleciona-se o <em>diâmetro nominal (DN) imediatamente superior</em>{" "}
        disponível no catálogo para o schedule desejado (SCH 40, SCH 80 etc.). Após a
        seleção, recalcula-se a perda de carga com o diâmetro interno real.
      </p>
      <p>
        <strong>Dica:</strong> velocidades muito altas causam erosão e ruído; muito baixas
        favorecem deposição de sólidos e crescimento biológico em linhas de processo.
      </p>
      <TheoryRef>Ref.: White, Mecânica dos Fluidos, 8ª ed., McGraw-Hill, 2018.</TheoryRef>
    </HowItWorks>
  );
}

export function RealDiameterHowItWorks() {
  return (
    <HowItWorks title="Como funciona — Diâmetro Nominal Comercial">
      <p>
        O diâmetro calculado é um valor contínuo. Na prática, tubos são fabricados em{" "}
        <strong>diâmetros nominais padronizados (DN)</strong> por <em>schedule</em>{" "}
        (espessura de parede): SCH 10, SCH 40, SCH 80, etc.
      </p>
      <p>
        A lógica de seleção é: encontrar o <em>diâmetro interno real</em> imediatamente
        superior ao diâmetro calculado no catálogo para o schedule escolhido.
      </p>
      <VariablesTable
        headers={["Conceito", "Descrição"]}
        rows={[
          { symbol: "DN (Diâmetro Nominal)", description: "Designador comercial em mm — NÃO é o diâmetro interno real" },
          { symbol: "Schedule (SCH)", description: "Indica a espessura da parede; quanto maior o número, menor o diâmetro interno" },
          { symbol: "Diâmetro interno real", description: "= Diâmetro externo − 2 × espessura de parede" },
        ]}
      />
      <p>
        <strong>Fluxo de uso:</strong> (1) calcule D no card anterior → (2) selecione o
        schedule → (3) o sistema retorna o menor DN comercial cujo diâmetro interno ≥ D
        calculado.
      </p>
      <p>
        <strong>Dica:</strong> após selecionar o diâmetro real, recalcule a perda de carga
        com o diâmetro interno efetivo — a velocidade real será menor que a de projeto.
      </p>
      <TheoryRef>
        Ref.: ASME B36.10M — Welded and Seamless Wrought Steel Pipe · White, Mecânica dos
        Fluidos, 8ª ed.
      </TheoryRef>
    </HowItWorks>
  );
}
```

> Nota: `VariablesTable` precisa aceitar linhas sem `unit` (2 colunas). Isso já está previsto na implementação da Task 7 (a coluna de unidade só renderiza quando `row.unit !== undefined`), mas os cabeçalhos são passados como 2 elementos aqui.

- [ ] **Step 3: Type-check**

Run: `cd frontend && npm run build`
Expected: sem erros de tipo relacionados a estes arquivos.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/features/sizing/didactics.tsx src/features/sizing/presets.ts
git commit -m "feat(frontend): add sizing accordions content and example preset"
```

---

## Task 10: Integração no `sizing-page.tsx` + testes

Reescreve a página usando os primitivos. Preserva os seletores do teste existente (`getByLabelText(/Vazão/i)`, `/Velocidade de projeto/i`, `/Diâmetro calculado/i`, `/Schedule/i`, botões "Calcular diâmetro" / "Obter diâmetro real", textos "126.16 mm" / "150 mm").

**Files:**
- Modify: `frontend/src/features/sizing/sizing-page.tsx` (arquivo inteiro)
- Modify: `frontend/src/test/sizing-page.test.tsx`

- [ ] **Step 1: Escrever/atualizar o teste com os novos comportamentos**

Substituir `frontend/src/test/sizing-page.test.tsx` por (mantém o fluxo original + adiciona acordeão, exemplo e validação):

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

const fetchMock = vi.fn<typeof fetch>();

function renderSizing() {
  const router = createMemoryRouter(routes, { initialEntries: ["/sizing"] });
  render(<RouterProvider router={router} />);
}

describe("SizingPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/piping/schedules") && method === "GET") {
        return new Response(
          JSON.stringify([{ name: "STD", diameters: [25, 40], description: "Schedule padrão" }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/api/sizing/calculated-diameter") && method === "POST") {
        return new Response(JSON.stringify({ value: 126.16, units: "millimeter" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/api/sizing/real-diameter") && method === "POST") {
        return new Response(JSON.stringify({ value: 150, units: "millimeter" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unhandled request: ${method} ${url}`);
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("completa o fluxo de dimensionamento", async () => {
    renderSizing();
    expect(
      await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "STD" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Vazão/i), { target: { value: "0.05" } });
    fireEvent.change(screen.getByLabelText(/Velocidade de projeto/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro/i }));

    expect(await screen.findByText(/126.16 mm/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Diâmetro calculado/i)).toHaveValue(126.16);

    fireEvent.change(screen.getByLabelText(/Schedule/i), { target: { value: "STD" } });
    fireEvent.click(screen.getByRole("button", { name: /Obter diâmetro real/i }));
    expect(await screen.findByText(/150 mm/i)).toBeInTheDocument();
  });

  it("mostra os acordeões teóricos 'Como funciona'", async () => {
    renderSizing();
    expect(
      await screen.findByText(/Como funciona — Cálculo de Diâmetro/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Como funciona — Diâmetro Nominal Comercial/i),
    ).toBeInTheDocument();
  });

  it("carrega o exemplo preenchendo os campos", async () => {
    renderSizing();
    await screen.findByRole("heading", { name: /Dimensionamento de Tubulação/i });
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    expect(screen.getByLabelText(/Vazão/i)).toHaveValue(0.01);
    expect(screen.getByLabelText(/Velocidade de projeto/i)).toHaveValue(1.5);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/test/sizing-page.test.tsx`
Expected: FAIL (não há botão "Carregar exemplo" nem acordeões ainda).

- [ ] **Step 3: Reescrever a página**

Substituir todo o conteúdo de `frontend/src/features/sizing/sizing-page.tsx`:

```tsx
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NumberField } from "@/components/number-field";
import { PropertyTable } from "@/components/property-table";
import { VelocityProfileChart } from "@/components/viz/velocity-profile";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { validateNumber } from "@/lib/validation";
import { DiameterHowItWorks, RealDiameterHowItWorks } from "@/features/sizing/didactics";
import { sizingExample } from "@/features/sizing/presets";

type Schedule = { name: string; diameters: number[]; description: string };
type QuantityResult = { value: number; units: string };

export function SizingPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [flowRate, setFlowRate] = useState("");
  const [velocity, setVelocity] = useState("");
  const [schedule, setSchedule] = useState("");
  const [calculatedDiameterInput, setCalculatedDiameterInput] = useState("");

  const [calculatedResult, setCalculatedResult] = useState<QuantityResult | null>(null);
  const [realDiameterResult, setRealDiameterResult] = useState<QuantityResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isResolvingRealDiameter, setIsResolvingRealDiameter] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadSchedules() {
      setScheduleError(null);
      try {
        const response = await apiClient.get<Schedule[]>("/piping/schedules");
        if (!ignore) setSchedules(response);
      } catch (error) {
        if (!ignore) {
          const message = error instanceof Error ? error.message : "Falha ao carregar schedules.";
          setScheduleError(message);
          notify.error(message);
        }
      }
    }
    void loadSchedules();
    return () => {
      ignore = true;
    };
  }, []);

  function loadExample() {
    setFlowRate(sizingExample.flowRate);
    setVelocity(sizingExample.velocity);
    notify.success("Exemplo carregado com sucesso.");
  }

  function clearCalculatedForm() {
    setFlowRate("");
    setVelocity("");
    setCalculatedResult(null);
  }

  async function handleCalculatedDiameterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const [rule, raw, label] of [
      ["positive", flowRate, "Vazão"],
      ["positive", velocity, "Velocidade"],
    ] as const) {
      const message = raw.trim() === ""
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
      const result = await apiClient.post<QuantityResult>("/sizing/calculated-diameter", {
        flow_rate: Number(flowRate),
        velocity: Number(velocity),
      });
      setCalculatedResult(result);
      setCalculatedDiameterInput(result.value.toFixed(2));
    } catch (error) {
      setCalculatedResult(null);
      const message = error instanceof Error ? error.message : "Falha ao calcular o diâmetro.";
      notify.error(message);
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleRealDiameterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!calculatedDiameterInput.trim() || !schedule) {
      notify.error("Informe o diâmetro calculado e selecione um schedule.");
      return;
    }
    setIsResolvingRealDiameter(true);
    try {
      const result = await apiClient.post<QuantityResult>("/sizing/real-diameter", {
        calculated_diameter: Number(calculatedDiameterInput),
        schedule,
      });
      setRealDiameterResult(result);
    } catch (error) {
      setRealDiameterResult(null);
      const message = error instanceof Error ? error.message : "Falha ao obter o diâmetro real.";
      notify.error(message);
    } finally {
      setIsResolvingRealDiameter(false);
    }
  }

  return (
    <section className="space-y-8 p-6 md:p-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold">Dimensionamento de Tubulação</h1>
          <Button type="button" variant="outline" onClick={loadExample}>
            ▶ Carregar exemplo
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Calcule o diâmetro hidráulico a partir da vazão e da velocidade de projeto e, em
            seguida, selecione o próximo diâmetro comercial do schedule adotado.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Diâmetro Calculado</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <DiameterHowItWorks />
            <form className="space-y-4" onSubmit={handleCalculatedDiameterSubmit}>
              <NumberField id="flow-rate" label="Vazão" unit="m³/s" rule="positive" value={flowRate} onChange={setFlowRate} placeholder="ex: 0.01" />
              <NumberField id="design-velocity" label="Velocidade de projeto" unit="m/s" rule="positive" value={velocity} onChange={setVelocity} placeholder="ex: 1.5" />
              <div className="flex items-center gap-4">
                <Button type="submit" disabled={isCalculating}>
                  {isCalculating ? "Calculando..." : "Calcular diâmetro"}
                </Button>
                <Button type="button" variant="link" onClick={clearCalculatedForm}>
                  Limpar campos
                </Button>
              </div>
            </form>

            {calculatedResult ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Resultado
                </p>
                <PropertyTable rows={[{ label: "Diâmetro calculado", value: calculatedResult.value, units: calculatedResult.units }]} />
                <VelocityProfileChart velocity={Number(velocity)} diameterMm={calculatedResult.value} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Diâmetro Real</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <RealDiameterHowItWorks />
            <form className="space-y-4" onSubmit={handleRealDiameterSubmit}>
              <NumberField id="calculated-diameter" label="Diâmetro calculado" unit="mm" rule="positive" value={calculatedDiameterInput} onChange={setCalculatedDiameterInput} placeholder="ex: 126.16" />
              <label className="block text-sm font-medium text-foreground" htmlFor="schedule">
                Schedule
                <select
                  id="schedule"
                  required
                  value={schedule}
                  onChange={(event) => setSchedule(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                  disabled={schedules.length === 0}
                >
                  <option value="">Selecione um schedule</option>
                  {schedules.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {scheduleError ? <p className="text-sm text-destructive">{scheduleError}</p> : null}
              <Button type="submit" disabled={isResolvingRealDiameter || schedules.length === 0}>
                {isResolvingRealDiameter ? "Consultando..." : "Obter diâmetro real"}
              </Button>
            </form>

            {realDiameterResult ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Resultado
                </p>
                <PropertyTable rows={[{ label: "Diâmetro real", value: realDiameterResult.value, units: realDiameterResult.units }]} />
              </div>
            ) : null}

            {schedule ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-muted-foreground">
                {schedules.find((item) => item.name === schedule)?.description ?? "Schedule selecionado."}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste do Sizing e confirmar que passa**

Run: `cd frontend && npx vitest run src/test/sizing-page.test.tsx`
Expected: PASS (3 testes).

> Se o teste do acordeão falhar porque o conteúdo começa colapsado e o `AccordionTrigger` só renderiza o título (que é o que asseguramos), tudo bem — o teste só verifica o título. Se o shadcn ocultar o texto do trigger, usar `getByRole("button", { name: /Como funciona/i })`.

- [ ] **Step 5: Rodar a suíte inteira + build**

Run: `cd frontend && npm test && npm run build`
Expected: todos os testes PASS e build sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/features/sizing/sizing-page.tsx src/test/sizing-page.test.tsx
git commit -m "feat(frontend): bring sizing module to base parity (accordions, example, validation, toast, velocity profile)"
```

---

## Verificação Final (Definition of Done — Sizing base)

Conferir contra o spec §4 (itens de base; os itens de exploratório são do Plano 2):

- [x] Acordeões "Como funciona" com fórmula (KaTeX) + tabela de variáveis + referência — Tasks 7, 9
- [x] "Carregar exemplo" + "Limpar campos" — Task 10
- [x] Validação inline por campo + validação pré-API com mensagem específica — Tasks 4, 5, 10
- [x] Tratamento de erro (try/catch + `detail` do FastAPI + toast) — Tasks 1, 10
- [x] Feedback de sucesso (toast) + loading + botões desabilitados — Tasks 3, 10
- [x] Visualização (perfil de velocidade SVG) — Task 8
- [x] Fórmulas em KaTeX + `units` da API (via `formatQuantity`/`PropertyTable`) — Tasks 2, 6, 10
- [ ] Combobox — **adiado** para o módulo Componentes (YAGNI: schedule tem poucos itens). Registrar no spec.
- [ ] Tokens de marca globais — **adiado** para a passada de design system.
- [ ] Painel exploratório — **Plano 2**.
- [x] Testes vitest cobrindo o comportamento — todas as tasks

Rodar `cd frontend && npm test` e `npm run build` uma última vez; ambos devem passar limpos.
