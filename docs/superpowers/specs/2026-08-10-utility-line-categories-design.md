# Utility Line Categories and Color Rendering

**Date:** 2026-08-10
**Status:** draft

## Context

Arestas P&ID com `connectionClass === "utility"` hoje renderizam identicamente a arestas `process` — sempre `stroke-slate-600`. O objetivo é permitir que o usuário crie categorias de utilidade (nome + cor) por documento e atribuí-las às arestas, resultando em diferenciação visual por cor no canvas e na exportação SVG.

**Escopo do sistema atual:**
- `connectionClass` já existe no modelo (`"process" | "utility" | "signal"`)
- As arestas renderizam com Tailwind `stroke-slate-600` fixo (sem diferenciação)
- O SVG export já diferencia signal (dashed), mas utility = process (sólido)
- Armazenamento 100% client-side via localStorage
- Command pattern imutável com Zod schema validation

## Design Decisions

| Decisão | Escolha |
|---------|---------|
| Escopo das categorias | Por documento P&ID |
| Seleção de cor | Paleta fixa de 16 cores Tailwind 500 |
| Atribuição de categoria | Na criação da aresta + editável no inspetor |
| Armazenamento da referência | Campo dedicado `utilityCategoryId` no `PidEdge` |

## Data Model

### Novo tipo: `UtilityCategory`

```ts
export interface UtilityCategory {
  id: string;    // uuid
  name: string;  // ex: "Vapor", "Água de resfriamento"
  color: string; // ex: "#ef4444" (Tailwind red-500)
}
```

### `PidDocument.metadata` estendido

```ts
metadata: {
  // ... existing fields
  utilityCategories: UtilityCategory[];  // default []
}
```

### `PidEdge` estendido

```ts
interface PidEdge {
  // ... existing fields
  utilityCategoryId?: string;
}
```

### Safe-patch fields

Adicionar `"utilityCategoryId"` ao conjunto `safePatchFields.edge` em `command-reducers.ts`.

### Paleta de cores

16 cores do Tailwind 500: `red, orange, amber, yellow, lime, green, emerald, teal, cyan, blue, indigo, violet, purple, fuchsia, pink, slate`.

### Schema version

Permanece `1`. Campo opcional em edge é backward-compatible.

### Zod schema

- `utilityCategorySchema`: `z.object({ id: z.string().uuid(), name: z.string().min(1), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })`
- `pidDocumentSchema.metadata`: adicionar `utilityCategories: z.array(utilityCategorySchema)`
- `pidEdgeSchema`: adicionar `utilityCategoryId: z.string().uuid().optional()`

## Commands

### `utility.addCategory`

```ts
interface AddUtilityCategoryCommand {
  type: "utility.addCategory";
  name: string;
  color: string;
}
```

Reducer: insere `{ id: crypto.randomUUID(), name, color }` em `metadata.utilityCategories`.

### `utility.removeCategory`

```ts
interface RemoveUtilityCategoryCommand {
  type: "utility.removeCategory";
  categoryId: string;
}
```

Reducer: remove a categoria do array e percorre todas as arestas limpando `utilityCategoryId` onde referenciava a categoria removida.

### `element.patch` (existente)

Já suporta patch de campos no `safePatchFields`. Adicionar `utilityCategoryId` ao conjunto de campos seguros para edge. O comando em si não muda.

## Invariants

Nova validação em `invariants.ts`:

```ts
if (edge.connectionClass !== "utility" && edge.utilityCategoryId !== undefined) {
  // warning: utilityCategoryId só é válido para arestas utility
}
if (edge.utilityCategoryId && !metadata.utilityCategories.find(c => c.id === edge.utilityCategoryId)) {
  // warning: categoria referenciada não existe
}
```

## UI

### Painel de gerenciamento de categorias

- Acessível por botão na toolbar do editor ("Categorias de Utilidade")
- Abre como painel lateral ou popover
- Lista categorias existentes: bolinha colorida + nome + botão remover (ícone X)
- Botão "+ Nova categoria" abre inline: campo de nome + grid 4x4 da paleta + confirmar

### Atribuição na criação de aresta

Ao conectar duas portas com `connectionClass === "utility"`, antes de confirmar a aresta, exibe um seletor com:
- Lista das categorias do documento (nome + bolinha colorida)
- Opção "Sem categoria" (default)
- A aresta é criada com `utilityCategoryId` correspondente (ou `undefined`)

### Edição no inspetor de propriedades

Quando uma aresta utility está selecionada, o inspetor mostra:
- Campo "Categoria de utilidade": dropdown com categorias + opção "Nenhuma"
- O patch de `utilityCategoryId` é enviado via `element.patch` existente

## Rendering

### Canvas (`process-edge.tsx`)

```tsx
const strokeColor = edge.connectionClass === "utility" && edge.utilityCategoryId
  ? utilityCategories.find(c => c.id === edge.utilityCategoryId)?.color
  : undefined;

// Usar estilo inline para cor dinâmica (Tailwind não suporta cores arbitrárias em runtime)
style={strokeColor ? { stroke: strokeColor } : undefined}
className={selected ? "stroke-blue-600" : !strokeColor ? "stroke-slate-600" : ""}
```

### SVG Export (`render-svg.ts`)

```ts
const category = edge.utilityCategoryId
  ? document.metadata.utilityCategories.find(c => c.id === edge.utilityCategoryId)
  : undefined;
const stroke = category?.color ?? "#475569";
```

Arestas `process` e `signal` mantêm comportamento atual inalterado.

## Non-Scope

- Categorias para arestas `process` ou `signal` (só utility)
- Cores customizadas além da paleta
- Estilos visuais além de cor (stroke-width, dash array)
- Import/export de categorias entre documentos
- Alteração do `connectionClass` após criação da aresta

## Risks

- **Arestas órfãs**: se uma categoria for removida enquanto arestas a referenciam, o comando `removeCategory` limpa as referências. Arestas voltam ao cinza padrão.
- **Paleta insuficiente**: 16 cores cobre a maioria dos casos reais de utilidades em um único P&ID. Se insuficiente no futuro, pode ser expandida.
- **Schema migration**: campo opcional em objeto existente é seguro. Nenhum diagrama existente quebra.
