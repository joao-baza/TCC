import { describe, expect, it } from "vitest";

import { applyCommand, insertSymbol } from "@/features/pid/domain/commands";
import { createEmptyDocument } from "@/features/pid/domain/schema";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import { copyEditorSelection, pasteEditorFragment } from "@/features/pid/editor/editor-clipboard";

function uuidFactory(start = 1) {
  let value = start;
  return () => `${(value++).toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`;
}

function connectedDocument() {
  const generateId = uuidFactory();
  let document = createEmptyDocument({ title: "Malha", standard: "free" }, { generateId, now: () => new Date("2026-08-09T12:00:00Z") });
  document = applyCommand(document, insertSymbol(localCatalog[0], { x: 0, y: 0 }), { generateId });
  document = applyCommand(document, insertSymbol(localCatalog[2], { x: 180, y: 0 }), { generateId });
  const nodes = Object.keys(document.nodes);
  const source = Object.values(document.ports).find((port) => port.nodeId === nodes[0])!;
  const target = Object.values(document.ports).find((port) => port.nodeId === nodes[1])!;
  document = applyCommand(document, { type: "ports.connect", sourcePortId: source.id, targetPortId: target.id }, { generateId });
  document = applyCommand(document, { type: "selection.group", ids: nodes }, { generateId });
  return document;
}

describe("clipboard interno do editor P&ID", () => {
  it("copia um fragmento canônico profundamente destacado e congelado", () => {
    const document = connectedDocument();
    const fragment = copyEditorSelection(document, Object.keys(document.nodes));
    const copiedNode = Object.values(fragment.nodes)[0];
    expect(Object.isFrozen(fragment)).toBe(true);
    expect(Object.isFrozen(fragment.nodes)).toBe(true);
    expect(Object.isFrozen(copiedNode.properties)).toBe(true);
    expect(Object.keys(fragment.edges)).toHaveLength(1);
    expect(Object.keys(fragment.groups)).toHaveLength(1);
    expect(() => { document.nodes[copiedNode.id].label = "Ataque"; }).toThrow();
    expect(copiedNode.label).not.toBe("Ataque");
    expect(() => { (copiedNode.properties as Record<string, unknown>).hostile = true; }).toThrow();
  });

  it("cola após excluir a origem, gera UUIDs frescos e preserva relações internas", () => {
    const source = connectedDocument();
    const fragment = copyEditorSelection(source, Object.keys(source.nodes));
    const empty = { ...source, nodes: {}, ports: {}, edges: {}, groups: {}, annotations: {} };
    const first = pasteEditorFragment(empty, fragment, { generateId: uuidFactory(100), offset: { x: 24, y: 24 } });
    expect(Object.keys(first.document.nodes)).toHaveLength(2);
    expect(Object.keys(first.document.edges)).toHaveLength(1);
    expect(Object.keys(first.document.groups)).toHaveLength(1);
    const edge = Object.values(first.document.edges)[0];
    expect(first.document.ports[edge.sourcePortId]).toBeDefined();
    expect(first.document.ports[edge.targetPortId]).toBeDefined();
    expect(first.selection).toHaveLength(2);
    expect(first.selection.every((id) => !source.nodes[id])).toBe(true);

    const second = pasteEditorFragment(first.document, fragment, { generateId: uuidFactory(200), offset: { x: 48, y: 48 } });
    expect(Object.keys(second.document.nodes)).toHaveLength(4);
    expect(new Set(Object.keys(second.document.nodes)).size).toBe(4);
    expect(Math.min(...second.selection.map((id) => second.document.nodes[id].x))).toBe(48);
  });

  it("exclui arestas externas inseguras e rejeita fragmento de outra norma", () => {
    const document = connectedDocument();
    const firstNode = Object.keys(document.nodes)[0];
    const fragment = copyEditorSelection(document, [firstNode]);
    expect(Object.keys(fragment.edges)).toHaveLength(0);
    expect(() => pasteEditorFragment({ ...document, metadata: { ...document.metadata, standard: "isa" } }, fragment, { generateId: uuidFactory(300), offset: { x: 1, y: 1 } })).toThrow(/norma|compatível/i);
  });
});
