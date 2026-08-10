# P&ID REST API + Utility Line Categories

**Date:** 2026-08-10
**Status:** draft

## Context

O sistema P&ID hoje opera 100% no frontend via `localStorage` (adapter `local`). O backend já tem infraestrutura PostgreSQL (SQLAlchemy + Alembic + Redis), modelos para `pid_diagrams`, `pid_access_tokens`, `pid_document_snapshots`, e serviços de domínio (`DiagramService`, `SnapshotRepository`). Falta expor esses serviços como API REST e criar o adapter remoto no frontend.

Sobre essa base, implementamos o suporte a **categorias de utilidade** (nome + cor) para arestas com `connectionClass === "utility"`, com diferenciação visual por cor no canvas.

## Part 1: P&ID REST API

### 1.1 Backend — Router e Endpoints

Novo arquivo: `routers/pid.py`, registrado em `app.py`.

| Método | Rota | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/pid/diagrams` | `{ title, catalog_version }` | `{ diagram_id, view_token, edit_token, document, revision }` |
| `POST` | `/api/pid/diagrams/:id/open` | `{ token }` | `{ scope, document, revision }` |
| `PUT` | `/api/pid/diagrams/:id/document` | `{ token, document, expected_revision }` | `{ revision }` |
| `POST` | `/api/pid/diagrams/:id/tokens` | `{ edit_token, scope, expected_revision }` | `{ token, revision }` |
| `DELETE` | `/api/pid/diagrams/:id` | `{ edit_token, expected_revision }` | `{ revision }` |
| `POST` | `/api/pid/diagrams/:id/restore` | `{ edit_token, expected_revision }` | `{ revision }` |

**Autenticação:** token enviado no corpo JSON de cada requisição. O backend valida via `DiagramService.authorize()`.

**Dependências FastAPI:** endpoint que injeta `PidRuntime` via `request.app.state.pid_runtime`.

### 1.2 Backend — Novos métodos no DiagramService

Adicionar ao `DiagramService`:

```python
async def open_document(self, diagram_id: UUID, token: str) -> OpenedDiagram
    # 1. authorize(token) → scope ou 403
    # 2. SnapshotRepository.load_latest_valid(diagram_id) → document_projection
    # 3. retorna { scope, document, revision }

async def save_document(self, diagram_id: UUID, token: str, 
                         document: dict, expected_revision: int) -> int
    # 1. authorize(token) → requer EDIT, senão 403
    # 2. SnapshotRepository.get_latest_revision(diagram_id) → revision atual
    # 3. Se revision != expected_revision → 409 CONFLICT
    # 4. SnapshotRepository.append(diagram_id, yjs_state=b"", document_projection=document,
    #                               schema_version=1, is_valid=True)
    # 5. Atualiza PidDiagram.updated_at
    # 6. retorna nova revision
```

### 1.3 Backend — Extensões no SnapshotRepository

```python
async def load_latest_valid(self, diagram_id: UUID) -> tuple[dict, int] | None
    # SELECT document_projection, revision FROM pid_document_snapshots
    # WHERE diagram_id = :id AND is_valid = TRUE
    # ORDER BY revision DESC LIMIT 1
    # Retorna (document, revision) ou None

async def get_latest_revision(self, diagram_id: UUID) -> int | None
    # SELECT MAX(revision) FROM pid_document_snapshots WHERE diagram_id = :id
```

### 1.4 Frontend — RemotePidApi adapter

Novo arquivo: `frontend/src/features/pid/api/remote-pid-api.ts`

```ts
class RemotePidApi implements PidDocumentPort {
  constructor(private readonly baseUrl: string) {}

  async create(input: CreatePidInput): Promise<CreatedPidDiagram> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input.title, catalog_version: "local-v1" }),
    });
    if (!res.ok) throw mapError(res);
    const data = await res.json();
    return {
      diagramId: data.diagram_id,
      document: data.document,
      revision: data.revision,
      readToken: data.view_token,
      editToken: data.edit_token,
      viewUrl: `${window.location.origin}/pid/${data.diagram_id}#access=${data.view_token}`,
      editUrl: `${window.location.origin}/pid/${data.diagram_id}#access=${data.edit_token}`,
    };
  }

  async open(diagramId: string, token: string): Promise<OpenedPidDiagram> { /* POST .../open */ }
  async save(diagramId: string, token: string, document: PidDocument, expectedRevision: number): Promise<number> { /* PUT .../document */ }
  async regenerate(...) { /* POST .../tokens */ }
  async softDelete(...) { /* DELETE */ }
  async restore(...) { /* POST .../restore */ }
}
```

**Mapeamento de erros HTTP → PidDocumentError:**
- 400 → `INVALID_INPUT`
- 403 → `ACCESS_DENIED`
- 404 → `DOCUMENT_NOT_FOUND`
- 409 → `CONFLICT`
- 410 → `DOCUMENT_DELETED` / `RESTORE_EXPIRED`
- 413 → `DOCUMENT_TOO_LARGE`
- 5xx → `STORAGE_CORRUPTED`

### 1.5 Frontend — Ativar adapter remoto

Em `pid-services.tsx`, `createPidServices()`:

```ts
if (normalized.adapter === "remote") {
  return {
    document: new RemotePidApi(normalized.baseUrl ?? window.location.origin),
    catalog: normalized.catalog ?? unavailableCatalog,
    collaboration: normalized.collaboration ?? unavailableCollaboration,
  };
}
```

Novo valor de env: `VITE_PID_ADAPTER=remote`.

### 1.6 Migration (Alembic)

Nenhuma migration nova necessária. O `document_projection` já é `JSONB` e aceita qualquer estrutura. O `utilityCategories` vai dentro do JSON do documento.

---

## Part 2: Utility Line Categories

### 2.1 Data Model (frontend)

**Novo tipo `UtilityCategory`:**

```ts
export interface UtilityCategory {
  id: string;   // uuid
  name: string; // ex: "Vapor", "Água de resfriamento"
  color: string; // ex: "#ef4444"
}
```

**`PidDocument.metadata` estendido:**

```ts
metadata: {
  // ... existing
  utilityCategories: UtilityCategory[];  // default []
}
```

**`PidEdge` estendido:**

```ts
interface PidEdge {
  // ... existing
  utilityCategoryId?: string;
}
```

**Zod schemas** atualizados em `schema.ts`:
- `utilityCategorySchema`: `z.object({ id: uuidSchema, name: z.string().min(1), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })`
- `pidDocumentSchema.metadata`: adicionar `utilityCategories: z.array(utilityCategorySchema)`
- `pidEdgeSchema`: adicionar `utilityCategoryId: z.string().uuid().optional()`

**Schema version** permanece `1` (adições opcionais backward-compatible).

**Paleta:** 16 cores Tailwind 500: `red, orange, amber, yellow, lime, green, emerald, teal, cyan, blue, indigo, violet, purple, fuchsia, pink, slate`.

Mapeamento cor → hex em constante compartilhada:

```ts
export const UTILITY_COLOR_PALETTE: Record<string, string> = {
  red: "#ef4444", orange: "#f97316", amber: "#f59e0b", yellow: "#eab308",
  lime: "#84cc16", green: "#22c55e", emerald: "#10b981", teal: "#14b8a6",
  cyan: "#06b6d4", blue: "#3b82f6", indigo: "#6366f1", violet: "#8b5cf6",
  purple: "#a855f7", fuchsia: "#d946ef", pink: "#ec4899", slate: "#64748b",
};
```

### 2.2 Commands

**`utility.addCategory`** (novo comando):

```ts
interface AddUtilityCategoryCommand {
  type: "utility.addCategory";
  name: string;
  color: string; // nome da cor da paleta (ex: "red"), resolvido para hex no reducer
}
```

Reducer: insere `{ id: crypto.randomUUID(), name, color: UTILITY_COLOR_PALETTE[color] }` em `metadata.utilityCategories`.

**`utility.removeCategory`** (novo comando):

```ts
interface RemoveUtilityCategoryCommand {
  type: "utility.removeCategory";
  categoryId: string;
}
```

Reducer: remove a categoria do array e limpa `utilityCategoryId` de todas as arestas que a referenciam.

**`element.patch`** (existente): adicionar `"utilityCategoryId"` ao `safePatchFields.edge`.

### 2.3 Invariants

Em `invariants.ts`:

```ts
// utilityCategoryId só é válido para arestas utility
if (edge.connectionClass !== "utility" && edge.utilityCategoryId) → warning

// Categoria referenciada deve existir
if (edge.utilityCategoryId && !metadata.utilityCategories.find(c => c.id === edge.utilityCategoryId)) → warning
```

### 2.4 UI — Painel de Categorias

Componente `UtilityCategoriesPanel` acessível por botão na toolbar:

- Lista categorias: bolinha colorida inline + nome + botão X (remover)
- Botão "+ Nova categoria": expande inline com campo de nome + grid 4×4 das 16 cores
- Cores mostradas como círculos preenchidos, seleção com borda destacada
- Ao remover: confirmação se há arestas usando a categoria ("X arestas perderão a cor")

### 2.5 UI — Atribuição na Criação de Aresta

Ao conectar portas com `connectionClass === "utility"`:
- Seletor aparece antes de confirmar (popover ou modal inline)
- Lista categorias do documento + "Sem categoria" (default)
- Aresta criada via comando `edge.create` com `utilityCategoryId` definido

### 2.6 UI — Edição no Inspetor

Quando aresta utility selecionada:
- Novo campo "Categoria": dropdown com categorias + "Nenhuma"
- Patch via `element.patch` no campo `utilityCategoryId`

### 2.7 Rendering — Canvas

**`process-edge.tsx`**:

```tsx
const categoryColor = edge.connectionClass === "utility" && edge.utilityCategoryId
  ? utilityCategories.find(c => c.id === edge.utilityCategoryId)?.color
  : undefined;

<BaseEdge
  style={categoryColor ? { stroke: categoryColor } : undefined}
  className={selected ? "stroke-blue-600" : !categoryColor ? "stroke-slate-600" : ""}
  ...
/>
```

### 2.8 Rendering — SVG Export

**`render-svg.ts`**:

```ts
const category = edge.utilityCategoryId
  ? document.metadata.utilityCategories.find(c => c.id === edge.utilityCategoryId)
  : undefined;
const stroke = category?.color ?? (edge.connectionClass === "signal" ? "#64748b" : "#475569");
```

### 2.9 Fluxo de persistência

1. Usuário cria/remove categorias → comando aplicado no estado local → `PidDocument.metadata.utilityCategories` atualizado
2. Ao salvar (manual ou auto-save) → `RemotePidApi.save()` envia o `PidDocument` completo (com `metadata.utilityCategories`) para `PUT /api/pid/diagrams/:id/document`
3. Backend persiste no `document_projection` JSONB do `PidDocumentSnapshot`
4. Ao abrir diagrama → `RemotePidApi.open()` retorna o documento completo com as categorias

---

## Non-Scope

- Categorias para arestas `process` ou `signal`
- Cores customizadas além da paleta
- Estilos visuais além de cor (stroke-width, dash array)
- Alteração do `connectionClass` após criação da aresta
- Edição de nome/cor de categoria existente (remove e recria)
- Yjs/WebSocket para colaboração em tempo real (a API REST é suficiente para single-user)
- `PidCatalogPort` e `PidCollaborationPort` remotos (stubs mantidos)

## Risks

- **Tamanho do documento**: com categorias e `utilityCategoryId`, o JSON do documento cresce marginalmente. O limite de 100k valores no `PidProperties` já cobre isso.
- **Órfãos na remoção**: tratado pelo reducer de `removeCategory` que limpa referências.
- **Conflito de revisão**: o `expectedRevision` no `save` garante integridade. Se dois clientes salvam simultaneamente, um recebe 409.
- **Migração de localStorage → Postgres**: diagramas existentes no localStorage não migram automaticamente. Usuário precisará recriar ou exportar/importar.
