import { describe, expect, it, vi } from "vitest";

import type { PidDocument } from "@/features/pid/domain/model";
import {
  createEmptyDocument,
  parsePidDocument,
  pidDocumentSchema,
} from "@/features/pid/domain/schema";

const ids = {
  document: "10000000-0000-4000-8000-000000000001",
  node: "20000000-0000-4000-8000-000000000002",
  sourcePort: "30000000-0000-4000-8000-000000000003",
  targetPort: "40000000-0000-4000-8000-000000000004",
  edge: "50000000-0000-4000-8000-000000000005",
  annotation: "60000000-0000-4000-8000-000000000006",
  group: "70000000-0000-4000-8000-000000000007",
} as const;

function createPopulatedDocument(): PidDocument {
  return {
    schemaVersion: 1,
    id: ids.document,
    metadata: {
      title: "Área 100",
      standard: "free",
      catalogVersion: "local-v1",
      createdAt: "2026-08-09T12:00:00.000Z",
      updatedAt: "2026-08-09T12:00:00.000Z",
    },
    nodes: {
      [ids.node]: {
        id: ids.node,
        symbolKey: "tank",
        catalogVersion: "local-v1",
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        rotation: 90,
        tag: "T-100",
        label: "Tanque",
        properties: { operating: { pressure: 3.5 }, enabled: true },
      },
    },
    ports: {
      [ids.sourcePort]: {
        id: ids.sourcePort,
        nodeId: ids.node,
        templateKey: "outlet",
        direction: "output",
        connectionClass: "process",
        capacity: 2,
      },
      [ids.targetPort]: {
        id: ids.targetPort,
        nodeId: ids.node,
        templateKey: "inlet",
        direction: "input",
        connectionClass: "process",
        capacity: 1,
      },
    },
    edges: {
      [ids.edge]: {
        id: ids.edge,
        sourcePortId: ids.sourcePort,
        targetPortId: ids.targetPort,
        connectionClass: "process",
        route: [{ x: 110, y: 20 }, { x: 180, y: 20 }],
        tag: "L-100",
        label: "Linha de processo",
        properties: { insulation: { class: "A" } },
      },
    },
    annotations: {
      [ids.annotation]: {
        id: ids.annotation,
        kind: "callout",
        text: "Operação normal",
        x: 120,
        y: 30,
        width: 160,
        height: 50,
        rotation: 0,
        nodeId: ids.node,
        edgeId: ids.edge,
        properties: { style: { color: "blue" } },
      },
    },
    groups: {
      [ids.group]: {
        id: ids.group,
        label: "Área de processo",
        memberIds: [ids.node],
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        properties: { area: { code: "A100" } },
      },
    },
  };
}

describe("documento canônico P&ID", () => {
  it("cria um documento v1 com mapas vazios e UUID", () => {
    const document = createEmptyDocument({ title: "Área 100", standard: "free" });

    expect(document).toMatchObject({
      schemaVersion: 1,
      metadata: { title: "Área 100", standard: "free", catalogVersion: "local-v1" },
    });
    expect(document.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(document.nodes).toEqual({});
    expect(document.ports).toEqual({});
    expect(document.edges).toEqual({});
    expect(document.annotations).toEqual({});
    expect(document.groups).toEqual({});
    expect(document.metadata.createdAt).toBe(document.metadata.updatedAt);
    expect(parsePidDocument(JSON.parse(JSON.stringify(document)))).toEqual(document);
  });

  it("aceita dependências injetadas para UUID e relógio", () => {
    const factory = createEmptyDocument as (
      input: Parameters<typeof createEmptyDocument>[0],
      context: { generateId: () => string; now: () => Date },
    ) => PidDocument;

    expect(factory(
      { title: "  Área 100  ", standard: "isa", catalogVersion: " catálogo-local " },
      {
        generateId: () => ids.document,
        now: () => new Date("2026-08-09T12:00:00.000Z"),
      },
    )).toMatchObject({
      id: ids.document,
      metadata: {
        title: "Área 100",
        catalogVersion: "catálogo-local",
        createdAt: "2026-08-09T12:00:00.000Z",
        updatedAt: "2026-08-09T12:00:00.000Z",
      },
    });
  });

  it.each([
    ["título em branco", { title: " \n ", standard: "iso" }],
    ["standard fora do contrato", { title: "Área 100", standard: "outro" }],
    ["versão de catálogo em branco", { title: "Área 100", standard: "free", catalogVersion: " " }],
  ])("rejeita entrada de fábrica inválida: %s", (_rule, input) => {
    expect(() => createEmptyDocument(input as Parameters<typeof createEmptyDocument>[0])).toThrow();
  });

  it("expõe um erro de domínio quando randomUUID não existe no runtime padrão", () => {
    vi.stubGlobal("crypto", {});
    try {
      expect(() => createEmptyDocument({ title: "Área 100", standard: "free" })).toThrow(/indisponível/i);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("faz round-trip de um grafo completo serializável", () => {
    const document = createPopulatedDocument();

    expect(parsePidDocument(JSON.parse(JSON.stringify(document)))).toEqual(document);
  });

  it.each([
    ["números não finitos", () => ({
      ...createPopulatedDocument(),
      nodes: { [ids.node]: { ...createPopulatedDocument().nodes[ids.node], x: Infinity } },
    })],
    ["chave de mapa diferente do id", () => ({
      ...createPopulatedDocument(),
      nodes: { outraChave: createPopulatedDocument().nodes[ids.node] },
    })],
    ["dimensões não positivas", () => ({
      ...createPopulatedDocument(),
      nodes: { [ids.node]: { ...createPopulatedDocument().nodes[ids.node], width: 0 } },
    })],
    ["rotação fora de múltiplo de 90", () => ({
      ...createPopulatedDocument(),
      nodes: { [ids.node]: { ...createPopulatedDocument().nodes[ids.node], rotation: 45 } },
    })],
    ["porta com nó pendente", () => ({
      ...createPopulatedDocument(),
      ports: { ...createPopulatedDocument().ports, [ids.sourcePort]: { ...createPopulatedDocument().ports[ids.sourcePort], nodeId: ids.document } },
    })],
    ["borda com porta de origem pendente", () => ({
      ...createPopulatedDocument(),
      edges: { [ids.edge]: { ...createPopulatedDocument().edges[ids.edge], sourcePortId: ids.document } },
    })],
    ["borda com porta de destino pendente", () => ({
      ...createPopulatedDocument(),
      edges: { [ids.edge]: { ...createPopulatedDocument().edges[ids.edge], targetPortId: ids.document } },
    })],
    ["anotação com nó pendente", () => ({
      ...createPopulatedDocument(),
      annotations: { [ids.annotation]: { ...createPopulatedDocument().annotations[ids.annotation], nodeId: ids.document } },
    })],
    ["anotação com borda pendente", () => ({
      ...createPopulatedDocument(),
      annotations: { [ids.annotation]: { ...createPopulatedDocument().annotations[ids.annotation], edgeId: ids.document } },
    })],
    ["grupo com membro pendente", () => ({
      ...createPopulatedDocument(),
      groups: { [ids.group]: { ...createPopulatedDocument().groups[ids.group], memberIds: [ids.document] } },
    })],
  ])("rejeita %s", (_rule, invalidDocument) => {
    expect(() => parsePidDocument(invalidDocument())).toThrow();
  });

  it.each([0, 0.5])("rejeita capacidade de porta inválida: %s", (capacity) => {
    const document = createPopulatedDocument();
    document.ports[ids.sourcePort].capacity = capacity;

    expect(() => parsePidDocument(document)).toThrow();
  });

  it.each(["__proto__", "prototype", "constructor"])(
    "rejeita a chave recursiva insegura %s com caminho exato",
    (unsafeKey) => {
      const document = createPopulatedDocument();
      document.nodes[ids.node].properties = JSON.parse(`{"${unsafeKey}": {"value": true}}`);

      const result = pidDocumentSchema.safeParse(document);
      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ["nodes", ids.node, "properties", unsafeKey],
      }));
    },
  );
});
