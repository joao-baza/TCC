# P&ID Line Styles and Connection Class Documentation

**Date:** 2026-08-10
**Status:** draft

## Context

O sistema P&ID atualmente tem 3 `ConnectionClass` (`process`, `utility`, `signal`) que controlam regras de compatibilidade entre portas, mas todas as linhas são renderizadas de forma idêntica no canvas (sólidas, mesma cor). Apenas na exportação SVG há distinção: `signal` vira tracejada. Não há documentação explicando quando usar cada classe nem diferença visual entre elas.

O objetivo é:

1. Adicionar representação visual distinta para cada tipo de linha no canvas e na exportação
2. Documentar o significado de cada classe e estilo
3. Permitir que o usuário escolha o estilo de linha independente da classe de conexão

## Design

### Modelo de dados

`ConnectionClass` permanece com 3 valores para regras de compatibilidade:

```typescript
type ConnectionClass = "process" | "utility" | "signal";
```

Novo tipo `LineStyle` para controle visual:

```typescript
type LineStyle =
  | "solid-thick"
  | "solid-thin"
  | "pneumatic"
  | "dashed"
  | "hydraulic"
  | "capillary"
  | "guided-wave"
  | "unguided-wave"
  | "digital"
  | "mechanical"
  | "undefined";
```

**Novo campo em `PidEdge`:** `lineStyle: LineStyle` (obrigatório).

**Mapeamento padrão ConnectionClass → LineStyle:**

| Classe | Estilo padrão |
|--------|--------------|
| `process` | `solid-thick` |
| `utility` | `solid-thin` |
| `signal` | `dashed` |

Ao inserir uma aresta, `lineStyle` recebe o default da `connectionClass` da porta. Ao trocar `connectionClass` no inspector, `lineStyle` reseta para o default da nova classe. O usuário pode alterar `lineStyle` livremente depois.

### Renderização no canvas

Arquivo alterado: `frontend/src/features/pid/canvas/process-edge.tsx`

Cada `LineStyle` produz um `<path>` SVG distinto:

| Estilo | SVG |
|--------|-----|
| `solid-thick` | `stroke-width="3"` |
| `solid-thin` | `stroke-width="1.5"` |
| `pneumatic` | `stroke-dasharray="12 4"` + marcadores `//` ao longo da linha |
| `dashed` | `stroke-dasharray="8 4"` |
| `hydraulic` | `stroke-dasharray="20 4 4 4"` |
| `capillary` | Sólida fina + marcadores de cruz (`+`) periódicos |
| `guided-wave` | Curva senoidal contínua (amplitude ~4px, período ~20px) |
| `unguided-wave` | Curva senoidal com gaps |
| `digital` | Sólida fina + círculos preenchidos periódicos |
| `mechanical` | `stroke-dasharray="4 4"` |
| `undefined` | `stroke-dasharray="16 6"` |

**Cores fixas:**
- `process` → `#475569` (slate-600)
- `utility` → `#475569` (slate-600)
- `signal` → `#64748b` (slate-500)

**Marcadores repetidos** (pneumatic, capillary, digital): como SVG `<path>` não suporta marcadores intermediários nativamente, usa-se múltiplos segmentos de `<path>` com `<marker-mid>` ou um `<pattern>` ao longo do trajeto. A implementação exata será definida no plano.

### Renderização na exportação SVG

Arquivo alterado: `frontend/src/features/pid/export/render-svg.ts`

Mesma lógica de renderização do canvas, aplicada durante a geração do SVG/PNG exportado. Deve-se extrair a função de renderização de linha para um módulo compartilhado entre canvas e exportação, evitando duplicação.

### Propriedades no inspector

Arquivo alterado: `frontend/src/features/pid/editor/properties-inspector.tsx`

Ao selecionar uma aresta, o inspector mostra:

- **Classe de conexão** (dropdown: Processo / Utilidade / Sinal) — já existente
- **Estilo de linha** (novo dropdown com os 11 estilos, label em pt-BR)

Sem indicador de cor — cores são fixas por classe.

### Documentação e tooltips

Dicionário estático com descrições para cada classe e estilo, usado nos tooltips dos dropdowns do inspector:

```typescript
const LINE_STYLE_INFO: Record<LineStyle, { label: string; description: string }> = {
  "solid-thick":     { label: "Contínua grossa",     description: "Tubulação principal de processo" },
  "solid-thin":      { label: "Contínua fina",       description: "Conexão ao processo, tomada de instrumento ou linha de impulso" },
  "pneumatic":       { label: "Sinal pneumático",    description: "Transmissão por ar comprimido (3-15 psi)" },
  "dashed":          { label: "Sinal elétrico",      description: "Sinal elétrico/eletrônico (4-20 mA, binário)" },
  "hydraulic":       { label: "Sinal hidráulico",    description: "Transmissão por fluido hidráulico pressurizado" },
  "capillary":       { label: "Tubo capilar",        description: "Sistema preenchido ou selo remoto com capilar" },
  "guided-wave":     { label: "Guiado (fibra/cabo)", description: "Sinal eletromagnético/sônico guiado (fibra óptica, cabo especial)" },
  "unguided-wave":   { label: "Não guiado (rádio)",  description: "Sinal sem fio, rádio ou comunicação não guiada" },
  "digital":         { label: "Digital/barramento",  description: "Comunicação digital, barramento ou link de dados entre sistemas" },
  "mechanical":      { label: "Ligação mecânica",    description: "Acoplamento mecânico entre dispositivos" },
  "undefined":       { label: "Sinal indefinido",    description: "Meio de transmissão não definido ou irrelevante" },
};

const CONNECTION_CLASS_INFO: Record<ConnectionClass, { label: string; description: string }> = {
  "process":  { label: "Processo",  description: "Linha de fluido do processo produtivo principal" },
  "utility":  { label: "Utilidade", description: "Linha de serviço auxiliar (vapor, água, ar, etc.)" },
  "signal":   { label: "Sinal",     description: "Conexão de instrumentação, controle ou transmissão de dados" },
};
```

### Compatibilidade de conexão

Sem alteração: portas continuam usando `connectionClass` para validação. `LineStyle` não afeta compatibilidade — duas portas `signal` podem ser conectadas independente de uma usar `dashed` e a outra `pneumatic`.

### Valores padrão ao inserir aresta

Quando o usuário conecta duas portas, o `lineStyle` da aresta é definido como o default da `connectionClass` compartilhada pelas portas (ex: portas `signal` → aresta `dashed`).

## Não-escopo

- Customização de cor por linha (cores são fixas por classe)
- Alteração do seletor de `connectionClass` na toolbar (já existe)
- Alteração nas regras de compatibilidade entre portas

## Riscos

- **Marcadores repetidos no canvas**: SVG `<marker-mid>` tem suporte limitado em alguns renderizadores. A implementação com `<pattern>` ou múltiplos segmentos precisa ser validada no React Flow.
- **Curva senoidal para guided/unguided-wave**: performance com muitos edges pode degradar. Considerar simplificação se necessário.
