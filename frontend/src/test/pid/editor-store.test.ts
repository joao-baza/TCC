import { describe, expect, it, vi } from "vitest";

import { renameDocument } from "@/features/pid/domain/commands";
import { createEditorStore } from "@/features/pid/editor/editor-store";
import { createEmptyDocument } from "@/features/pid/domain/schema";

function document(title: string, sequence: number) {
  return createEmptyDocument(
    { title, standard: "free" },
    {
      generateId: () => `${sequence.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`,
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    },
  );
}

describe("estado local do editor P&ID", () => {
  it("registra comando local no histórico e suporta undo/redo", () => {
    const store = createEditorStore(document("Inicial", 1));

    store.dispatch(renameDocument("Local"), "local");
    expect(store.getState().document.metadata.title).toBe("Local");
    expect(store.getState().past).toHaveLength(1);
    expect(store.getState().future).toHaveLength(0);

    store.undo();
    expect(store.getState().document.metadata.title).toBe("Inicial");
    expect(store.getState().future).toHaveLength(1);
    store.redo();
    expect(store.getState().document.metadata.title).toBe("Local");
  });

  it("limpa o futuro quando um novo comando local é aplicado", () => {
    const store = createEditorStore(document("Inicial", 1));
    store.dispatch(renameDocument("Primeiro"));
    store.undo();
    store.dispatch(renameDocument("Segundo"));

    expect(store.getState().future).toHaveLength(0);
    store.redo();
    expect(store.getState().document.metadata.title).toBe("Segundo");
  });

  it("não desfaz uma substituição marcada como remota", () => {
    const empty = document("Inicial", 1);
    const remoteDocument = document("Remoto", 2);
    const store = createEditorStore(empty);
    store.dispatch(renameDocument("Local"), "local");
    store.replace(remoteDocument, "remote");
    store.undo();

    expect(store.getState().document.metadata.title).toBe(remoteDocument.metadata.title);
    expect(store.getState().past).toHaveLength(0);
    expect(store.getState().future).toHaveLength(0);
  });

  it("não inclui comandos remotos no undo local", () => {
    const store = createEditorStore(document("Inicial", 1));
    store.dispatch(renameDocument("Remoto"), "remote");
    store.undo();

    expect(store.getState().document.metadata.title).toBe("Remoto");
    expect(store.getState().past).toHaveLength(0);
  });

  it("mantém seleção e viewport fora do documento e notifica assinantes", () => {
    const store = createEditorStore(document("Inicial", 1));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setSelection(["node-2", "node-1", "node-1"]);
    store.setViewport({ x: 20, y: -10, zoom: 1.5 });

    expect(store.getState()).toMatchObject({
      selection: ["node-2", "node-1"],
      viewport: { x: 20, y: -10, zoom: 1.5 },
    });
    expect("selection" in store.getState().document).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.setSelection([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("retorna snapshots sem expor arrays nem viewport internos", () => {
    const store = createEditorStore(document("Inicial", 1));
    store.dispatch(renameDocument("Local"));
    store.setSelection(["node-1"]);
    const first = store.getState();

    expect(() => (first.selection as string[]).push("intruso")).toThrow();
    expect(() => (first.past as unknown[]).pop()).toThrow();
    expect(() => { (first.viewport as { zoom: number }).zoom = 99; }).toThrow();
    expect(store.getState()).toMatchObject({
      selection: ["node-1"],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    expect(store.getState().past).toHaveLength(1);
  });
});
