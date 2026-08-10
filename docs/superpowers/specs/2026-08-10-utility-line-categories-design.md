# P&ID Multi-User Platform: REST API + Collaboration + Utility Categories

**Date:** 2026-08-10
**Status:** draft

## Context

O sistema P&ID hoje é single-user com `localStorage` (`VITE_PID_ADAPTER=local`). O backend já tem infraestrutura PostgreSQL + Redis, modelos para `pid_diagrams`/`pid_access_tokens`/`pid_document_snapshots`, e serviços de domínio. A infraestrutura de colaboração está como scaffolding: `yjs_state` BYTEA, `TicketStore` em Redis, `PidCollaborationPort` stub, `PID_WS_PUBLIC_URL` configurado.

Este spec cobre 3 subsistemas interdependentes, implementados em ordem:

1. **P&ID REST API** — persistência remota em Postgres
2. **Colaboração em tempo real** — WebSocket + Yjs + Redis pub/sub
3. **Categorias de utilidade** — nome + cor para arestas `utility`

---

## Part 1: P&ID REST API

### 1.1 Objetivo

Substituir `LocalPidApi` (localStorage) por `RemotePidApi` (HTTP → Postgres), mantendo a mesma interface `PidDocumentPort`. Diagramas passam a ser persistidos no servidor via `pid_document_snapshots`.

### 1.2 Backend — Router (`routers/pid.py`)

| Método | Rota | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/pid/diagrams` | `{ title, catalog_version }` | `{ diagram_id, view_token, edit_token, document, revision }` |
| `POST` | `/api/pid/diagrams/:id/open` | `{ token }` | `{ scope, document, revision }` |
| `PUT` | `/api/pid/diagrams/:id/document` | `{ token, document, expected_revision }` | `{ revision }` |
| `POST` | `/api/pid/diagrams/:id/tokens` | `{ edit_token, scope, expected_revision }` | `{ token, revision }` |
| `DELETE` | `/api/pid/diagrams/:id` | `{ edit_token, expected_revision }` | `{ revision }` |
| `POST` | `/api/pid/diagrams/:id/restore` | `{ edit_token, expected_revision }` | `{ revision }` |

Autenticação: token no corpo JSON. Backend valida via `DiagramService.authorize()`.

### 1.3 Backend — Novos métodos no `DiagramService`

```python
async def open_document(diagram_id: UUID, token: str) -> OpenedDiagram:
    # authorize → scope, carrega último snapshot válido, retorna { scope, document, revision }

async def save_document(diagram_id: UUID, token: str, 
                         document: dict, expected_revision: int) -> int:
    # authorize → requer EDIT
    # verifica revision atual == expected_revision (senão 409)
    # append snapshot (yjs_state=b"", document_projection=document, is_valid=True)
    # atualiza diagram.updated_at
    # retorna nova revision
```

### 1.4 Backend — Extensões no `SnapshotRepository`

```python
async def load_latest_valid(diagram_id: UUID) -> tuple[dict, int] | None
async def get_latest_revision(diagram_id: UUID) -> int | None
```

### 1.5 Frontend — `RemotePidApi`

Novo arquivo: `frontend/src/features/pid/api/remote-pid-api.ts`

Implementa `PidDocumentPort` via `fetch()`. Cada método mapeia para um endpoint REST. Erros HTTP mapeados para `PidDocumentError`:
- 400 → `INVALID_INPUT`, 403 → `ACCESS_DENIED`, 404 → `DOCUMENT_NOT_FOUND`
- 409 → `CONFLICT`, 410 → `DOCUMENT_DELETED`/`RESTORE_EXPIRED`
- 413 → `DOCUMENT_TOO_LARGE`, 5xx → `STORAGE_CORRUPTED`

### 1.6 Ativação

`createPidServices()` em `pid-services.tsx`:

```ts
if (normalized.adapter === "remote") {
  return {
    document: new RemotePidApi(normalized.baseUrl ?? window.location.origin),
    catalog: ..., collaboration: ...,
  };
}
```

`VITE_PID_ADAPTER=remote` no `.env.production`.

### 1.7 Migration

Nenhuma. `document_projection` já é JSONB. Schema version permanece `1`.

---

## Part 2: Real-Time Collaboration

### 2.1 Objetivo

Múltiplos usuários editam o mesmo diagrama simultaneamente. Cada alteração local é sincronizada em tempo real via WebSocket usando Yjs (CRDT). O servidor faz broadcast das atualizações para todos os clientes conectados ao mesmo diagrama.

### 2.2 Arquitetura

```
Cliente A ──WebSocket──┐
                       ├── FastAPI WS Server ── Redis Pub/Sub ──┤
Cliente B ──WebSocket──┘                                        │
                       ┌────────────────────────────────────────┘
                       ▼
                 PostgreSQL (yjs_state snapshot periódico)
```

- Cada cliente mantém um `Y.Doc` local
- Alterações são enviadas como Yjs updates binários via WebSocket
- Servidor faz broadcast para todos os clientes no mesmo diagrama
- A cada N segundos (ou N updates), o servidor persiste um snapshot do `Y.Doc` completo no `pid_document_snapshots`
- `document_projection` JSON é derivado do `Y.Doc` pelo servidor para consultas REST

### 2.3 Backend — WebSocket Server

Novo arquivo: `pid/ws/handler.py`

**Rota:** `WS /pid/ws/{diagram_id}?ticket=<one-time-ticket>`

**Ciclo de vida da conexão:**

1. Cliente obtém ticket via `POST /api/pid/diagrams/:id/ws-ticket` (usa `TicketStore.issue()`)
2. Cliente conecta WebSocket com o ticket
3. Servidor valida ticket via `TicketStore.consume()` → obtém `diagram_id`, `scope`
4. Se `scope === "view"`, conexão é read-only (recebe updates, não envia)
5. Servidor carrega snapshot Yjs mais recente e envia como estado inicial
6. Cliente aplica estado inicial ao `Y.Doc` local
7. Loop de mensagens binárias (Yjs updates)
8. Ao desconectar, servidor remove subscription do Redis

**Pub/Sub Redis:**

```python
# Canal: pid:ws:{diagram_id}
# Cada instância do servidor:
#   - SUBSCRIBE ao canal do diagrama
#   - Ao receber update de um cliente, PUBLISH no canal
#   - Ao receber mensagem do Redis, broadcast para clientes locais
```

Isso permite múltiplas instâncias do servidor (Docker Swarm replicas).

### 2.4 Backend — Snapshot Persistência

Novo arquivo: `pid/ws/persistence.py`

Background task por diagrama ativo:

```python
async def persistence_loop(diagram_id, ydoc, snapshot_repo, interval=5):
    # A cada `interval` segundos, se houve mudanças:
    #   snapshot = Yjs.encode_state_as_update(ydoc)
    #   projection = ydoc_to_json(ydoc)  # derivar PidDocument do Y.Doc
    #   await snapshot_repo.append(diagram_id, yjs_state=snapshot, 
    #                               document_projection=projection, is_valid=True)
```

### 2.5 Frontend — `RemoteCollaboration`

Nova implementação real de `PidCollaborationPort` em `frontend/src/features/pid/collaboration/remote-collaboration.ts`:

```ts
class RemoteCollaboration implements PidCollaborationPort {
  connect(input: CollaborationInput): CollaborationSession {
    // 1. Obter ticket via POST /api/pid/diagrams/:id/ws-ticket
    // 2. Conectar WebSocket a wss://host/pid/ws/{diagramId}?ticket=...
    // 3. Criar Y.Doc local
    // 4. Aplicar estado inicial recebido do servidor
    // 5. Usar y-websocket ou implementação própria para sync
    // 6. Retornar CollaborationSession com:
    //    - ydoc: Y.Doc
    //    - awareness: awareness protocol
    //    - status: "connecting" | "synced" | "unsaved" | "reconnecting"
    //    - participants: lista de usuários conectados
  }
}
```

### 2.6 Frontend — Integração com o Editor

`pid-editor-page.tsx` já consome `PidCollaborationPort` via `createLocalCollaboration()`. Substituir por `RemoteCollaboration` quando `VITE_PID_ADAPTER=remote`.

**Fluxo de edição com Yjs:**

1. `Y.Doc` é a fonte da verdade. O estado do ReactFlow é derivado do `Y.Doc`.
2. Alterações do usuário → Yjs update → WebSocket → servidor → broadcast → outros clientes
3. `publishDocument()` e `subscribeDocument()` do `local-collaboration.ts` são substituídos por bindings Yjs
4. Autosave: a cada N segundos sem alterações, dispara `saveDocument()` via REST para garantir persistência

### 2.7 Dependências Novas

**Frontend:** `yjs`, `y-websocket` (ou `lib0` para WebSocket próprio)
**Backend:** `y-py` (Yjs port para Python, para derivar `document_projection` do Y.Doc)

### 2.8 Migration

Nenhuma. `yjs_state` BYTEA já existe.

---

## Part 3: Utility Line Categories

### 3.1 Objetivo

Arestas com `connectionClass === "utility"` ganham diferenciação visual por cor. O usuário cria categorias (nome + cor) no documento e as atribui às arestas.

### 3.2 Data Model

**Novo tipo `UtilityCategory`:**

```ts
export interface UtilityCategory {
  id: string;   // uuid
  name: string; // ex: "Vapor"
  color: string; // hex, ex: "#ef4444"
}
```

**`PidDocument.metadata` estendido:**

```ts
metadata: { /* ...existing... */ utilityCategories: UtilityCategory[] }
```

**`PidEdge` estendido:**

```ts
interface PidEdge { /* ...existing... */ utilityCategoryId?: string }
```

**Zod schemas** atualizados em `schema.ts` com validação para ambos os campos.

**Paleta de cores** (16 cores Tailwind 500):

```ts
const UTILITY_COLOR_PALETTE: Record<string, string> = {
  red: "#ef4444", orange: "#f97316", amber: "#f59e0b", yellow: "#eab308",
  lime: "#84cc16", green: "#22c55e", emerald: "#10b981", teal: "#14b8a6",
  cyan: "#06b6d4", blue: "#3b82f6", indigo: "#6366f1", violet: "#8b5cf6",
  purple: "#a855f7", fuchsia: "#d946ef", pink: "#ec4899", slate: "#64748b",
};
```

### 3.3 Commands

**`utility.addCategory`:**

```ts
{ type: "utility.addCategory"; name: string; color: string }
// Reducer: insere { id: crypto.randomUUID(), name, color: PALETTE[color] }
```

**`utility.removeCategory`:**

```ts
{ type: "utility.removeCategory"; categoryId: string }
// Reducer: remove categoria e limpa utilityCategoryId das arestas órfãs
```

**`element.patch`:** adicionar `utilityCategoryId` ao `safePatchFields.edge`.

### 3.4 Invariants

- `utilityCategoryId` só é válido se `connectionClass === "utility"`
- Categoria referenciada deve existir em `metadata.utilityCategories`

### 3.5 UI — Painel de Categorias

Componente `UtilityCategoriesPanel`, acessível por botão na toolbar:

- Lista categorias: bolinha colorida + nome + botão remover
- "+ Nova categoria": campo nome + grid 4×4 de cores + confirmar
- Confirmação ao remover se há arestas usando a categoria

### 3.6 UI — Atribuição e Edição

- **Criação de aresta utility**: seletor de categoria antes de confirmar (popover)
- **Inspetor de propriedades**: dropdown para alterar categoria da aresta selecionada

### 3.7 Rendering

**Canvas (`process-edge.tsx`):**

```tsx
const categoryColor = edge.connectionClass === "utility" && edge.utilityCategoryId
  ? utilityCategories.find(c => c.id === edge.utilityCategoryId)?.color
  : undefined;
<BaseEdge style={categoryColor ? { stroke: categoryColor } : undefined}
  className={selected ? "stroke-blue-600" : !categoryColor ? "stroke-slate-600" : ""} />
```

**SVG export (`render-svg.ts`):** mesma lógica, aplicada ao atributo `stroke`.

### 3.8 Persistência

Categorias vivem em `PidDocument.metadata.utilityCategories`. Com a API REST (Part 1), são persistidas no `document_projection` JSONB. Com colaboração (Part 2), são sincronizadas via Yjs como parte do documento.

---

## Dependency Order

```
Part 1 (REST API) ──► Part 2 (Collaboration) ──► Part 3 (Utility Categories)
```

Part 1 é autossuficiente. Part 2 depende da Part 1 para autenticação e persistência de snapshots. Part 3 depende da Part 1 e da Part 2 (ou ao menos da Part 1) para persistir categorias no servidor.

O frontend pode implementar Part 3 contra o adapter `local` inicialmente (como prova de conceito), e a feature funciona automaticamente com `remote` quando as Parts 1 e 2 estiverem prontas — as categorias estão no `PidDocument`, que é o que o adapter persiste.

## Non-Scope

- Migração automática de diagramas do localStorage para Postgres
- Cores customizadas além da paleta de 16
- Estilos visuais além de cor (stroke-width, dash array, etc.)
- Categorias para arestas `process` ou `signal`
- Edição inline de nome/cor de categoria existente (remove e recria)
- Convite/ compartilhamento de diagramas via UI (tokens já são gerados)
- Presence/Awareness avançado (cursores, seleções)

## Risks

| Risco | Mitigação |
|-------|-----------|
| **Yjs ↔ PidDocument**: conflito entre estado Yjs e comandos imutáveis existentes | Y.Doc é a fonte da verdade; comandos são traduzidos para operações Yjs. O estado imutável é derivado do Y.Doc. |
| **Conflito de edição simultânea**: dois usuários alteram a mesma categoria/aresta | Yjs resolve automaticamente (CRDT). Último write wins para campos simples. |
| **Perda de dados**: servidor cai antes de persistir snapshot | Yjs updates são efêmeros, mas o cliente mantém o estado local. Autosave REST como fallback. |
| **Complexidade**: 3 subsistemas em sequência é ambicioso | Cada parte entrega valor independente. Part 1 já permite compartilhar diagramas (sem colaboração em tempo real). |
| **y-py dependência**: Yjs port para Python pode ter bugs ou atrasos | Usar `y-py` apenas para derivar `document_projection`. Se não funcionar, derivar do último snapshot REST. |
