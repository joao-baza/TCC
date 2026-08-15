import { describe, expect, it } from "vitest";

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
});
