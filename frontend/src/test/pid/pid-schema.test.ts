import { describe, expect, it, vi } from "vitest";

import type { PidDocument, PidJsonValue, PidProperties } from "@/features/pid/domain/model";
import { LINE_STYLES, LINE_STYLE_INFO, DEFAULT_LINE_STYLE } from "@/features/pid/domain/line-style";
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
      utilityCategories: [],
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
        lineStyle: "supply-impulse",
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
    expect(createEmptyDocument(
      { title: "  Área 100  ", standard: "free", catalogVersion: " catálogo-local " },
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
    ["título em branco", { title: " \n ", standard: "free" }],
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
    const parsed = parsePidDocument(document);

    expect(parsed).toEqual(document);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it.each(["isa", "iso"])("rejeita documento com a norma removida %s", (standard) => {
    const document = createPopulatedDocument();

    expect(() => parsePidDocument({
      ...document,
      metadata: { ...document.metadata, standard },
    })).toThrow();
  });

  it("aceita somente os 12 estilos canonicos da legenda de sinais", () => {
    expect(LINE_STYLES).toEqual([
      "supply-impulse",
      "pneumatic-signal",
      "hydraulic-signal",
      "guided-electromagnetic-sonic",
      "software-link",
      "binary-pneumatic-signal",
      "undefined-signal",
      "electric-signal",
      "capillary-tube",
      "unguided-electromagnetic-sonic",
      "mechanical-link",
      "binary-electric-signal",
    ]);
    expect(Object.keys(LINE_STYLE_INFO)).toEqual([...LINE_STYLES]);
    expect(DEFAULT_LINE_STYLE.process).toBe("supply-impulse");
    expect(DEFAULT_LINE_STYLE.utility).toBe("supply-impulse");
    expect(DEFAULT_LINE_STYLE.signal).toBe("electric-signal");
  });

  it.each(["solid-thick", "solid-thin", "dashed", "pneumatic", "hydraulic", "capillary", "guided-wave", "unguided-wave", "digital", "mechanical", "undefined"])(
    "rejeita estilo legado removido %s",
    (lineStyle) => {
      const document = createPopulatedDocument();
      document.edges[ids.edge].lineStyle = lineStyle as never;

      expect(() => parsePidDocument(document)).toThrow();
    },
  );

  it("destaca propriedades analisadas do objeto de entrada", () => {
    const input = createPopulatedDocument();
    const parsed = parsePidDocument(input);

    (input.nodes[ids.node].properties.operating as Record<string, unknown>).pressure = 99;

    expect(parsed.nodes[ids.node].properties).toEqual({ operating: { pressure: 3.5 }, enabled: true });
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

  it("aceita rotação livre em graus finitos", () => {
    const document = createPopulatedDocument();
    document.nodes[ids.node] = { ...document.nodes[ids.node], rotation: 37.5 };
    document.annotations[ids.annotation] = { ...document.annotations[ids.annotation], rotation: 12.25 };

    expect(pidDocumentSchema.safeParse(document).success).toBe(true);
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

  it("rejeita arrays esparsos nas propriedades", () => {
    const document = createPopulatedDocument();
    const values = [1, null, 3];
    delete values[1];
    document.nodes[ids.node].properties = { values };

    expect(() => parsePidDocument(document)).toThrow();
  });

  it("rejeita propriedades com chaves symbol sem inspecionar o valor bigint", () => {
    const document = createPopulatedDocument();
    const properties: PidDocument["nodes"][string]["properties"] = {};
    Object.defineProperty(properties, Symbol("bigint"), { enumerable: true, value: 1n });
    document.nodes[ids.node].properties = properties;

    expect(() => parsePidDocument(document)).toThrow();
  });

  it.each([
    ["não enumerável", (properties: PidDocument["nodes"][string]["properties"]) => {
      Object.defineProperty(properties, "hidden", { enumerable: false, value: "segredo" });
    }],
    ["accessor", (properties: PidDocument["nodes"][string]["properties"]) => {
      Object.defineProperty(properties, "computed", {
        enumerable: true,
        get: () => "não deve ser lido",
      });
    }],
  ])("rejeita propriedades com descritor %s", (_rule, defineProperty) => {
    const document = createPopulatedDocument();
    const properties: PidDocument["nodes"][string]["properties"] = {};
    defineProperty(properties);
    document.nodes[ids.node].properties = properties;

    expect(() => parsePidDocument(document)).toThrow();
  });

  it("inclui o índice do membro pendente no caminho do erro de grupo", () => {
    const document = createPopulatedDocument();
    document.groups[ids.group].memberIds = [ids.node, ids.document];

    const result = pidDocumentSchema.safeParse(document);
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toContainEqual(expect.objectContaining({
      path: ["groups", ids.group, "memberIds", 1],
    }));
  });

  it("rejeita uma referência circular direta com o caminho da propriedade", () => {
    const document = createPopulatedDocument();
    const properties: PidProperties = {};
    properties.self = properties;
    document.nodes[ids.node].properties = properties;

    const result = pidDocumentSchema.safeParse(document);
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toContainEqual(expect.objectContaining({
      path: ["nodes", ids.node, "properties", "self"],
      message: expect.stringMatching(/cíclica/i),
    }));
  });

  it("rejeita referências circulares mútuas", () => {
    const document = createPopulatedDocument();
    const first: PidProperties = {};
    const second: PidProperties = {};
    first.next = second;
    second.next = first;
    document.nodes[ids.node].properties = { first };

    expect(() => parsePidDocument(document)).toThrow(/cíclica/i);
  });

  it("aceita referências acíclicas compartilhadas e as destaca", () => {
    const document = createPopulatedDocument();
    const shared: PidProperties = { status: "normal" };
    document.nodes[ids.node].properties = { left: shared, right: shared };

    const parsed = parsePidDocument(document);
    const left = parsed.nodes[ids.node].properties.left as PidProperties;
    const right = parsed.nodes[ids.node].properties.right as PidProperties;
    shared.status = "alterado";

    expect(left).toEqual({ status: "normal" });
    expect(right).toEqual({ status: "normal" });
    expect(left).not.toBe(right);
  });

  it("rejeita profundidade de propriedades acima de 64 com o caminho exato", () => {
    const document = createPopulatedDocument();
    let nested: PidJsonValue = "fim";
    for (let depth = 0; depth < 65; depth += 1) nested = { child: nested };
    document.nodes[ids.node].properties = { root: nested };

    const result = pidDocumentSchema.safeParse(document);
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toContainEqual(expect.objectContaining({
      path: ["nodes", ids.node, "properties", "root", ...Array(64).fill("child")],
      message: expect.stringMatching(/profundidade máxima/i),
    }));
  });

  it("rejeita um array esparso de comprimento declarado muito grande sem percorrê-lo", () => {
    const document = createPopulatedDocument();
    const values: PidJsonValue[] = [];
    values.length = 1_000_000;
    document.nodes[ids.node].properties = { values };

    const result = pidDocumentSchema.safeParse(document);
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toContainEqual(expect.objectContaining({
      path: ["nodes", ids.node, "properties", "values"],
      message: expect.stringMatching(/10\.000/i),
    }));
  });

  it("rejeita uma travessia que excede o orçamento de 100.000 valores", () => {
    const document = createPopulatedDocument();
    const rows: PidJsonValue[] = Array.from(
      { length: 20 },
      () => Array.from({ length: 5_000 }, () => 0),
    );
    document.nodes[ids.node].properties = { rows };

    const result = pidDocumentSchema.safeParse(document);
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toContainEqual(expect.objectContaining({
      path: ["nodes", ids.node, "properties", "rows", 19, 4978],
      message: expect.stringMatching(/100\.000/i),
    }));
  });

  it("aceita documento legado sem utilityCategories no metadata", () => {
    const document = createPopulatedDocument();
    const legacy = JSON.parse(JSON.stringify(document)) as typeof document;
    delete (legacy.metadata as Record<string, unknown>).utilityCategories;

    const parsed = parsePidDocument(legacy);
    expect(parsed.metadata.utilityCategories).toEqual([]);
  });

  it("aceita utilityCategoryId opcional nas arestas", () => {
    const document = createPopulatedDocument();
    const withCategory = {
      ...document,
      metadata: {
        ...document.metadata,
        utilityCategories: [{ id: "c0000000-0000-4000-8000-000000000001", name: "Vapor", color: "#ef4444" }],
      },
      edges: {
        [ids.edge]: {
          ...document.edges[ids.edge],
          connectionClass: "utility" as const,
          utilityCategoryId: "c0000000-0000-4000-8000-000000000001",
        },
      },
    };

    const parsed = parsePidDocument(withCategory);
    expect(parsed.edges[ids.edge].utilityCategoryId).toBe("c0000000-0000-4000-8000-000000000001");
    expect(parsed.metadata.utilityCategories).toHaveLength(1);
  });

  it("rejeita utilityCategoryId com UUID inválido", () => {
    const document = createPopulatedDocument();
    const invalid = {
      ...document,
      metadata: {
        ...document.metadata,
        utilityCategories: [],
      },
      edges: {
        [ids.edge]: {
          ...document.edges[ids.edge],
          connectionClass: "utility" as const,
          utilityCategoryId: "not-a-uuid",
        },
      },
    };

    expect(() => parsePidDocument(invalid)).toThrow();
  });
});
