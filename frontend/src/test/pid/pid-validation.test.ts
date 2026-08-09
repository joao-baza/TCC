import { describe, expect, it } from "vitest";

import type { CatalogSymbol } from "@/features/pid/domain/commands";
import type { PidDocument } from "@/features/pid/domain/model";
import { validateDocument } from "@/features/pid/domain/validation";

const ids = {
  document: "10000000-0000-4000-8000-000000000001",
  pump: "20000000-0000-4000-8000-000000000001",
  tank: "20000000-0000-4000-8000-000000000002",
  pumpOut: "30000000-0000-4000-8000-000000000001",
  tankIn: "30000000-0000-4000-8000-000000000002",
  edge: "40000000-0000-4000-8000-000000000001",
  secondEdge: "40000000-0000-4000-8000-000000000002",
} as const;

const catalog: readonly CatalogSymbol[] = [
  {
    key: "test.pump",
    name: "Bomba",
    standards: ["free", "isa"],
    catalogVersion: "local-v1",
    defaultSize: { width: 96, height: 64 },
    portTemplates: [{ key: "out", direction: "output", connectionClass: "process", capacity: 1 }],
    properties: { service: "process" },
  },
  {
    key: "test.tank",
    name: "Tanque",
    standards: ["free", "iso"],
    catalogVersion: "local-v1",
    defaultSize: { width: 80, height: 72 },
    portTemplates: [{ key: "in", direction: "input", connectionClass: "process", capacity: 2 }],
    properties: { service: "process" },
  },
];

describe("validação estruturada P&ID", () => {
  it.each([
    ["ID semântico duplicado", duplicateSemanticId()],
    ["nó ausente", mutate((document) => { document.ports[ids.pumpOut].nodeId = unknownId(1); })],
    ["porta ausente", mutate((document) => { document.edges[ids.edge].sourcePortId = unknownId(2); })],
    ["classe incompatível", mutate((document) => { document.edges[ids.edge].connectionClass = "signal"; })],
    ["capacidade excedida", capacityExceeded()],
    ["mistura de standard", mutate((document) => { document.metadata.standard = "iso"; })],
  ])("bloqueia %s", (_name, document) => {
    expect(validateDocument(document, { catalog }).some((issue) => issue.severity === "error")).toBe(true);
  });

  it.each([
    ["tag ausente", mutate((document) => { document.nodes[ids.pump].tag = ""; })],
    ["tag duplicada", mutate((document) => { document.nodes[ids.tank].tag = "P-1"; })],
    ["tag inválida", mutate((document) => { document.nodes[ids.pump].tag = "1 bomba"; })],
    ["porta obrigatória desconectada", mutate((document) => { document.edges = {}; })],
    ["propriedade obrigatória ausente", mutate((document) => { document.nodes[ids.pump].properties = {}; })],
  ])("alerta %s sem produzir erro bloqueante", (_name, document) => {
    const issues = validateDocument(document, { catalog });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.severity === "warning")).toBe(true);
  });

  it("retorna issues imutáveis, estruturadas e em ordem determinística", () => {
    const document = mutate((draft) => {
      draft.nodes[ids.pump].tag = "";
      draft.nodes[ids.tank].tag = "";
      draft.nodes[ids.pump].properties = {};
      draft.edges = {};
    });

    const issues = validateDocument(document, { catalog });
    expect(issues).toEqual(validateDocument(structuredClone(document), { catalog }));
    expect(issues.every((issue) => (
      typeof issue.code === "string"
      && typeof issue.message === "string"
      && ["error", "warning"].includes(issue.severity)
    ))).toBe(true);
    expect(Object.isFrozen(issues)).toBe(true);
    expect(issues.every(Object.isFrozen)).toBe(true);
    expect(issues.map(issueKey)).toEqual([...issues].sort(compareIssues).map(issueKey));
    expect(issues.some((issue) => issue.elementId === ids.pump && issue.field === "tag")).toBe(true);
  });

  it("converte uma entrada fora do schema em erro sem lançar exceção", () => {
    expect(() => validateDocument({ schemaVersion: 999 }, { catalog })).not.toThrow();
    expect(validateDocument({ schemaVersion: 999 }, { catalog })).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "error" }),
    ]));
  });

  it("torna o catálogo obrigatório também na fronteira de runtime", () => {
    expect(validateDocument(baseDocument(), undefined as never)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "catalog.context-required", severity: "error" }),
    ]));
  });

  it("bloqueia quando o catálogo não resolve um símbolo canônico", () => {
    expect(validateDocument(baseDocument(), { catalog: [] })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "catalog.symbol-missing", elementId: ids.pump, severity: "error" }),
    ]));
  });

  it("bloqueia um símbolo de mesma chave resolvido em outra versão de catálogo", () => {
    const wrongVersionCatalog = catalog.map((symbol) => ({ ...symbol, catalogVersion: "local-v2" }));
    const document = mutate((draft) => {
      draft.edges = {};
      draft.nodes[ids.pump].properties = {};
    });

    const issues = validateDocument(document, { catalog: wrongVersionCatalog });

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "catalog.symbol-version-mismatch",
        elementId: ids.pump,
        field: "catalogVersion",
        severity: "error",
      }),
    ]));
    expect(issues.some((issue) => issue.code === "port.required-disconnected" || issue.code === "property.required-missing")).toBe(false);
    expect(issues).toEqual(validateDocument(structuredClone(document), { catalog: wrongVersionCatalog }));
  });
});

function baseDocument(): PidDocument {
  return {
    schemaVersion: 1,
    id: ids.document,
    metadata: {
      title: "Validação",
      standard: "free",
      catalogVersion: "local-v1",
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
    },
    nodes: {
      [ids.pump]: node(ids.pump, "test.pump", "P-1"),
      [ids.tank]: node(ids.tank, "test.tank", "T-1"),
    },
    ports: {
      [ids.pumpOut]: { id: ids.pumpOut, nodeId: ids.pump, templateKey: "out", direction: "output", connectionClass: "process", capacity: 1 },
      [ids.tankIn]: { id: ids.tankIn, nodeId: ids.tank, templateKey: "in", direction: "input", connectionClass: "process", capacity: 2 },
    },
    edges: {
      [ids.edge]: { id: ids.edge, sourcePortId: ids.pumpOut, targetPortId: ids.tankIn, connectionClass: "process", route: [], tag: "L-1", label: "Linha", properties: {} },
    },
    annotations: {},
    groups: {},
  };
}

function node(id: string, symbolKey: string, tag: string): PidDocument["nodes"][string] {
  return { id, symbolKey, catalogVersion: "local-v1", x: 0, y: 0, width: 80, height: 64, rotation: 0, tag, label: tag, properties: { service: "process" } };
}

function mutate(change: (document: PidDocument) => void): PidDocument {
  const document = structuredClone(baseDocument());
  change(document);
  return document;
}

function duplicateSemanticId(): PidDocument {
  return mutate((document) => {
    document.ports[ids.pump] = { ...document.ports[ids.pumpOut], id: ids.pump };
    delete document.ports[ids.pumpOut];
    document.edges[ids.edge].sourcePortId = ids.pump;
  });
}

function capacityExceeded(): PidDocument {
  return mutate((document) => {
    document.edges[ids.secondEdge] = { ...document.edges[ids.edge], id: ids.secondEdge, tag: "L-2" };
  });
}

function unknownId(suffix: number): string {
  return `90000000-0000-4000-8000-${suffix.toString().padStart(12, "0")}`;
}

function issueKey(issue: { severity: string; code: string; elementId?: string; field?: string; message: string }): string {
  return [issue.severity, issue.code, issue.elementId ?? "", issue.field ?? "", issue.message].join("\u0000");
}

function compareIssues(left: Parameters<typeof issueKey>[0], right: Parameters<typeof issueKey>[0]): number {
  return issueKey(left).localeCompare(issueKey(right));
}
