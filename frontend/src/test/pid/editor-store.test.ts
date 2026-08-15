import { describe, expect, it, vi } from "vitest";

import {
  deleteSelection,
  moveSelection,
  renameDocument,
} from "@/features/pid/domain/commands";
import type { PidDocument } from "@/features/pid/domain/model";
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
    const initial = documentWithNode();
    const nodeId = Object.keys(initial.nodes)[0];
    const store = createEditorStore(initial);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setSelection([nodeId, nodeId]);
    store.setViewport({ x: 20, y: -10, zoom: 1.5 });

    expect(store.getState()).toMatchObject({
      selection: [nodeId],
      viewport: { x: 20, y: -10, zoom: 1.5 },
    });
    expect("selection" in store.getState().document).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.setSelection([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("retorna snapshots sem expor arrays nem viewport internos", () => {
    const initial = documentWithNode();
    const nodeId = Object.keys(initial.nodes)[0];
    const store = createEditorStore(initial);
    store.dispatch(renameDocument("Local"));
    store.setSelection([nodeId]);
    const first = store.getState();

    expect(() => (first.selection as string[]).push("intruso")).toThrow();
    expect(() => (first.past as unknown[]).pop()).toThrow();
    expect(() => { (first.viewport as { zoom: number }).zoom = 99; }).toThrow();
    expect(store.getState()).toMatchObject({
      selection: [nodeId],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    expect(store.getState().past).toHaveLength(1);
  });

  it("mantém a mesma referência de snapshot até ocorrer uma mutação", () => {
    const store = createEditorStore(document("Inicial", 1));
    const first = store.getState();

    expect(store.getState()).toBe(first);
    store.setViewport({ x: 1, y: 2, zoom: 1 });
    expect(store.getState()).not.toBe(first);
    expect(store.getState()).toBe(store.getState());
  });

  it("enfileira notificações reentrantes em ordem monotônica", () => {
    const store = createEditorStore(document("Inicial", 1));
    const observed: string[] = [];
    store.subscribe((state) => {
      if (state.document.metadata.title === "Um") store.dispatch(renameDocument("Dois"));
    });
    store.subscribe((state) => observed.push(state.document.metadata.title));

    store.dispatch(renameDocument("Um"));

    expect(observed).toEqual(["Um", "Dois"]);
  });

  it("isola listeners que falham e informa o callback de erro", () => {
    const errors: unknown[] = [];
    const store = createEditorStore(document("Inicial", 1), {}, {
      onListenerError: (error) => errors.push(error),
    });
    const later = vi.fn();
    store.subscribe(() => { throw new Error("listener quebrado"); });
    store.subscribe(later);

    expect(() => store.dispatch(renameDocument("Local"))).not.toThrow();
    expect(later).toHaveBeenCalledOnce();
    expect(errors).toHaveLength(1);
  });

  it("limita o histórico local de forma configurável", () => {
    const store = createEditorStore(document("Inicial", 1), {}, { historyLimit: 2 });
    store.dispatch(renameDocument("Um"));
    store.dispatch(renameDocument("Dois"));
    store.dispatch(renameDocument("Três"));

    expect(store.getState().past).toHaveLength(2);
    store.undo();
    store.undo();
    store.undo();
    expect(store.getState().document.metadata.title).toBe("Um");
  });

  it("coalesce movimentos contínuos com a mesma chave em uma entrada de undo", () => {
    const initial = documentWithNode();
    const nodeId = Object.keys(initial.nodes)[0];
    const store = createEditorStore(initial);
    store.dispatch(moveSelection([nodeId], { x: 2, y: 0 }), "local", { coalesceKey: "drag-1" });
    store.dispatch(moveSelection([nodeId], { x: 3, y: 0 }), "local", { coalesceKey: "drag-1" });

    expect(store.getState().document.nodes[nodeId].x).toBe(5);
    expect(store.getState().past).toHaveLength(1);
    store.undo();
    expect(store.getState().document.nodes[nodeId].x).toBe(0);
  });

  it("filtra seleção desconhecida e reconcilia após transições", () => {
    const initial = documentWithNode();
    const nodeId = Object.keys(initial.nodes)[0];
    const store = createEditorStore(initial);
    store.setSelection(["desconhecido", nodeId]);
    expect(store.getState().selection).toEqual([nodeId]);

    store.dispatch(deleteSelection([nodeId]));
    expect(store.getState().selection).toEqual([]);
    store.replace(document("Remoto", 20), "remote");
    expect(store.getState().selection).toEqual([]);
  });

  it("reconcilia a seleção também em undo e redo", () => {
    const initial = document("Inicial", 1);
    const withNode = documentWithNode();
    const nodeId = Object.keys(withNode.nodes)[0];
    const store = createEditorStore(initial);
    store.replace(withNode, "local");
    store.setSelection([nodeId]);

    store.undo();
    expect(store.getState().selection).toEqual([]);
    store.redo();
    expect(store.getState().selection).toEqual([]);
  });
});

function documentWithNode(): PidDocument {
  const base = document("Com nó", 10);
  const nodeId = "0000000b-0000-4000-8000-000000000000";
  return {
    ...base,
    nodes: {
      [nodeId]: {
        id: nodeId,
        symbolKey: "project.test",
        catalogVersion: base.metadata.catalogVersion,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        rotation: 0,
        tag: "",
        label: "Teste",
        properties: {},
      },
    },
  };
}
