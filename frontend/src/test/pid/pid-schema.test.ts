import { describe, expect, it } from "vitest";

import { createEmptyDocument, parsePidDocument } from "@/features/pid/domain/schema";

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

  it("normaliza o título e rejeita títulos em branco", () => {
    expect(createEmptyDocument({ title: "  Área 100  ", standard: "isa" }).metadata.title).toBe("Área 100");
    expect(() => createEmptyDocument({ title: " \n ", standard: "iso" })).toThrow();
  });

  it("rejeita referências e números não finitos", () => {
    const document = createEmptyDocument({ title: "Inválido", standard: "isa" });
    const nodeId = "0d3154fb-627d-4c22-ae10-64d2f6192b61";

    expect(() => parsePidDocument({
      ...document,
      nodes: {
        [nodeId]: {
          id: nodeId,
          symbolKey: "tank",
          catalogVersion: "local-v1",
          x: Infinity,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          tag: "T-100",
          label: "Tanque",
          properties: {},
        },
      },
    })).toThrow();

    expect(() => parsePidDocument({
      ...document,
      ports: {
        "0d3154fb-627d-4c22-ae10-64d2f6192b61": {
          id: "0d3154fb-627d-4c22-ae10-64d2f6192b61",
          nodeId: "d583b060-18e8-455d-a3e4-912b6f81f2ee",
          templateKey: "outlet",
          direction: "output",
          connectionClass: "process",
          capacity: 1,
        },
      },
    })).toThrow(/nodeId/i);
  });

  it("impõe IDs, chaves, rotação e dimensões válidas", () => {
    const document = createEmptyDocument({ title: "Validação", standard: "iso" });
    const nodeId = "0d3154fb-627d-4c22-ae10-64d2f6192b61";

    expect(() => parsePidDocument({
      ...document,
      nodes: {
        outraChave: {
          id: nodeId,
          symbolKey: "tank",
          catalogVersion: "local-v1",
          x: 0,
          y: 0,
          width: 0,
          height: 100,
          rotation: 45,
          tag: "T-100",
          label: "Tanque",
          properties: {},
          ignored: true,
        },
      },
    })).toThrow();
  });

  it("rejeita referências pendentes de bordas, anotações e grupos", () => {
    const document = createEmptyDocument({ title: "Referências", standard: "free" });
    const edgeId = "e8c7ebd1-0ea0-4c4a-8954-05e1f6f1bb8a";

    expect(() => parsePidDocument({
      ...document,
      edges: {
        [edgeId]: {
          id: edgeId,
          sourcePortId: "0d3154fb-627d-4c22-ae10-64d2f6192b61",
          targetPortId: "d583b060-18e8-455d-a3e4-912b6f81f2ee",
          connectionClass: "process",
          route: [],
          tag: "L-100",
          label: "Linha",
          properties: {},
        },
      },
    })).toThrow(/sourcePortId/i);

    const annotationId = "b305900d-3a14-48e9-9702-8aab7470d9a9";
    expect(() => parsePidDocument({
      ...document,
      annotations: {
        [annotationId]: {
          id: annotationId,
          kind: "note",
          text: "Verificar pressão",
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          rotation: 0,
          nodeId: "0d3154fb-627d-4c22-ae10-64d2f6192b61",
          properties: {},
        },
      },
    })).toThrow(/anota.*inexistente/i);

    const groupId = "f73f539d-5eb8-4d47-a2f0-27ab1c6b0f0b";
    expect(() => parsePidDocument({
      ...document,
      groups: {
        [groupId]: {
          id: groupId,
          label: "Área de processo",
          memberIds: ["0d3154fb-627d-4c22-ae10-64d2f6192b61"],
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          properties: {},
        },
      },
    })).toThrow(/grupo.*inexistente/i);
  });
});
