# P&ID Recent Diagrams - Design Spec

**Date:** 2026-08-10
**Scope:** `frontend/src/features/pid/`
**Goal:** Add a local "Meus diagramas" tab to the P&ID editor so users can reopen diagrams created or accessed in the current browser.

---

## 1. Current Context

The P&ID editor already persists full local diagrams in `localStorage` through `LocalPidApi`, using keys in the `dcou.pid.local.v1.<diagramId>` namespace. The stored document records keep token digests only; the raw access token exists only in the generated or opened URL fragment.

Because old raw tokens cannot be reconstructed from existing records, this feature only tracks diagrams created or opened after the feature ships. No migration of previous local diagrams is required.

Complexity is **low to medium**. The document persistence already exists; the new work is a separate recent-access index, a list tab, and validation around token-bearing local shortcuts.

---

## 2. Approved Scope

### In Scope

- Keep `/pid` opening on the existing **Novo diagrama** flow.
- Add a second tab in the Editor P&ID tab bar: **Meus diagramas**.
- Store a lightweight recent-diagrams index in `localStorage`.
- Update the index when a diagram is created.
- Update the index when a diagram URL is opened successfully.
- Store edit access when the user created or opened a diagram with edit permission.
- Store view access when the user opened a view-only link.
- Avoid downgrading a known edit entry to view-only if the same diagram is later opened with view access.
- List only diagrams tracked after this feature exists.
- Keep the feature local to the browser; no cross-device sync.

### Out of Scope

- Migrating old diagrams already present in `localStorage`.
- Reconstructing old edit or view tokens from hashed token digests.
- Backend persistence or account-based diagram history.
- Sharing the recent list across browsers or devices.
- Changing the canonical P&ID document schema.
- Adding `createdAt`, `firstSeenAt`, or `revision` to recent-list entries.

---

## 3. Data Model

Use a separate localStorage key:

```text
dcou.pid.recent.v1
```

Suggested payload:

```ts
interface RecentPidDiagramIndex {
  version: 1;
  items: RecentPidDiagram[];
}

interface RecentPidDiagram {
  diagramId: string;
  title: string;
  scope: "edit" | "view";
  url: string;
  lastOpenedAt: string;
}
```

The `url` field stores the full local route with fragment, for example:

```text
/pid/<diagramId>#access=<token>
```

or an absolute URL if the existing URL generator continues producing absolute links. Consumers should be able to pass the stored value to React Router navigation or an anchor without parsing and rebuilding the token manually.

The index should enforce an upper bound to avoid unbounded local growth. A practical default is the most recent 50 entries, sorted descending by `lastOpenedAt`.

---

## 4. Update Rules

### On Create

When `LocalPidApi.create()` returns `CreatedPidDiagram`, the UI or recent-index service records:

- `diagramId`
- `title` from `document.metadata.title`
- `scope: "edit"`
- `url: editUrl`
- `lastOpenedAt: now`

This happens after successful creation only. Failed creation must not write a recent entry.

### On Open

When `PidEditorPage` opens `/pid/:diagramId#access=...` successfully, it records:

- `diagramId`
- `title` from the opened document metadata
- `scope` returned by `document.open()`
- `url` from the current route and hash
- `lastOpenedAt: now`

If an existing item is `scope: "edit"` and the new successful open returns `scope: "view"`, keep the edit URL and edit scope while refreshing `lastOpenedAt` and title. This prevents a view-only visit from weakening the useful shortcut.

If an existing item is view-only and a later successful open returns edit access, replace it with the edit URL and edit scope.

### On Invalid Index

If `dcou.pid.recent.v1` is missing, malformed, oversized, or fails schema validation, treat it as an empty index. The editor must remain usable.

---

## 5. UI And Routing

The Editor P&ID tab order is:

1. **Novo diagrama**
2. **Meus diagramas**

`/pid` remains the default route and renders **Novo diagrama**.

Add a route for the list, preferably:

```text
/pid/meus-diagramas
```

The focused editor route remains:

```text
/pid/:diagramId
```

Because `meus-diagramas` can conflict with `:diagramId` if route ordering is wrong, the router must declare the static list route before the dynamic diagram route or keep the list inside the AppShell route tree and the focused editor route outside it.

### Meus Diagramas Screen

The list uses the same `ModuleTabsLayout` styling already used by `/pid`.

Each row/card shows:

- diagram title
- last opened timestamp in a compact local format
- access label: `Acesso de edição` or `Somente visualização`
- primary action:
  - `Abrir editor` for edit entries
  - `Abrir visualização` for view entries

The screen should include an empty state:

```text
Os diagramas criados ou abertos neste navegador aparecerão aqui.
```

No explanatory wall of text is needed in the app.

---

## 6. Privacy And Security

This feature intentionally stores the raw access URL, including the token fragment, in localStorage. That is necessary for one-click reopen.

The UI and documentation should keep the boundary clear:

- The recent list is local to this browser.
- Anyone with access to this browser profile may reopen entries listed there.
- Clearing browser storage removes the recent list and local diagrams.
- The feature does not upload or sync recent diagrams.

Existing behavior already exposes generated edit URLs to the user. This feature makes that local capability persistent for new diagrams and successfully opened links.

---

## 7. Error Handling

- If the recent index cannot be read, show the empty state or a compact local-storage unavailable message.
- If writing the recent index fails, do not block diagram creation or opening. Prefer a non-fatal status message only if the user is on the recent-list surface.
- If opening a recent entry fails because the diagram was deleted, corrupted, or the token is invalid, reuse the existing `/pid/:diagramId` error handling.
- If a recent entry has an invalid URL or invalid UUID, drop it from the in-memory list and do not render an unsafe link.

---

## 8. Implementation Shape

Create a small local service or module dedicated to recent diagrams, for example:

```text
frontend/src/features/pid/recent/recent-pid-diagrams.ts
```

Responsibilities:

- parse the index
- validate entries
- upsert an entry
- preserve edit entries when a later view entry arrives
- sort by `lastOpenedAt`
- enforce the maximum item count
- expose a list function for the UI

Avoid placing recent-list logic directly inside `LocalPidApi` unless the existing port contract is intentionally expanded. Keeping it separate avoids mixing canonical document persistence with browser navigation history.

The P&ID services layer may expose the recent service alongside `document`, `catalog`, and `collaboration`, or the UI may import the browser-local recent module directly. A service-bound approach is easier to test with injected storage and clock.

---

## 9. Testing Plan

### Unit Tests

Add focused tests for the recent module:

- returns an empty list for missing index
- returns an empty list for malformed index
- writes a created edit entry
- writes a successful view entry
- upgrades view to edit when edit access is later opened
- does not downgrade edit to view
- sorts by `lastOpenedAt` descending
- enforces the max entry count
- filters invalid URLs or UUIDs

### Route/UI Tests

Add or update P&ID route tests:

- `/pid` renders **Novo diagrama** as the default tab
- `/pid/meus-diagramas` renders **Meus diagramas**
- the tab order is **Novo diagrama**, then **Meus diagramas**
- creating a diagram causes it to appear in the recent list
- opening a diagram URL causes it to appear in the recent list
- a view-only recent item renders `Abrir visualização`
- an edit recent item renders `Abrir editor`

### Integration Test

Extend the existing route integration flow:

1. create a diagram at `/pid`
2. confirm the edit link is generated
3. navigate to `/pid/meus-diagramas`
4. assert the created title appears with edit access
5. open the item and verify the focused editor loads the diagram

### Build Gate

Run the focused P&ID tests and `npm run build` from `frontend`.

---

## 10. Open Decisions

No open product decisions remain for this scope.

Implementation may choose exact component/file names as long as the route contract, data fields, and privacy behavior above remain intact.
