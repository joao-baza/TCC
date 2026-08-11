import { describe, expect, it } from "vitest";

import type { ConnectionClass, PidDocument } from "@/features/pid/domain/model";
import {
  renderPidSvg,
  sanitizePidSvgAsset,
} from "@/features/pid/export/render-svg";

const pump = sanitizePidSvgAsset(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><circle cx="60" cy="40" r="20" fill="none" stroke="currentColor"/></svg>',
);

describe("renderPidSvg", () => {
  it("enquadra rota, nó rotacionado, grupo e textos em coordenadas negativas", async () => {
    const document = exportDocument();
    const svg = await renderPidSvg(document, new Map([["project.pump", pump]]), {
      background: "white",
      padding: 24,
    });

    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(" ").map(Number);
    expect(viewBox).toHaveLength(4);
    expect(viewBox![0]).toBeLessThanOrEqual(-74);
    expect(viewBox![1]).toBeLessThanOrEqual(-44);
    expect(viewBox![0] + viewBox![2]).toBeGreaterThanOrEqual(264);
    expect(viewBox![1] + viewBox![3]).toBeGreaterThanOrEqual(194);
    expect(svg).toContain('data-element-id="node-a"');
    expect(svg).toContain('transform="rotate(90 0 0)"');
    expect(svg).toContain("M 0 40");
    expect(svg).toContain("L -50 150");
    expect(svg).toContain("L 240 150");
    expect(svg).toContain("P-101 &amp; reserva");
    expect(svg).toContain("Grupo &lt;A&gt;");
    expect(svg).toContain("Nota &lt;segura&gt;");
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).not.toMatch(/minimap|selection|cursor|validation/i);
  });

  it("produz saída determinística sem fundo para documento vazio", async () => {
    const document = emptyDocument("Vazio");
    const first = await renderPidSvg(document, new Map(), { background: "transparent", padding: 10 });
    const second = await renderPidSvg(document, new Map(), { background: "transparent", padding: 10 });

    expect(first).toBe(second);
    expect(first).toContain('viewBox="-10 -10 20 20"');
    expect(first).not.toContain('fill="#ffffff"');
  });

  it("ordena elementos pelo ID sem depender da ordem de inserção", async () => {
    const document = exportDocument();
    document.nodes = { "node-z": { ...document.nodes["node-a"], id: "node-z" }, "node-a": document.nodes["node-a"] };
    const svg = await renderPidSvg(document, new Map([["project.pump", pump]]));
    expect(svg.indexOf('data-element-id="node-a"')).toBeLessThan(svg.indexOf('data-element-id="node-z"'));
  });

  it("rejeita markup hostil e ativos que não passaram pelo sanitizador confiável", async () => {
    expect(() => sanitizePidSvgAsset('<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>')).toThrow(/não permitido/i);
    expect(() => sanitizePidSvgAsset('<svg viewBox="0 0 10 10"><path d="M0 0" onload="alert(1)"/></svg>')).toThrow(/atributo/i);
    expect(() => sanitizePidSvgAsset('<svg viewBox="0 0 10 10"><image href="javascript:alert(1)"/></svg>')).toThrow(/não permitido/i);
    expect(() => sanitizePidSvgAsset('<!DOCTYPE svg [<!ENTITY x "boom">]><svg viewBox="0 0 10 10"><g/></svg>')).toThrow(/não permitid/i);

    const forged = Object.freeze({ viewBox: "0 0 10 10", markup: '<script>alert(1)</script>' });
    await expect(renderPidSvg(exportDocument(), new Map([["project.pump", forged as never]]))).rejects.toThrow(/sanitizado/i);
  });

  it("escapa conteúdo hostil de títulos, tags, labels e IDs", async () => {
    const document = exportDocument();
    document.nodes["node-a"] = {
      ...document.nodes["node-a"],
      id: 'node-&quot;-<script>',
      tag: '</text><script>alert(1)</script>',
      label: '" onload="alert(2)',
    };
    document.nodes = { [document.nodes["node-a"].id]: document.nodes["node-a"] };
    document.ports = {};
    document.edges = {};
    document.groups = {};

    const svg = await renderPidSvg(document, new Map([["project.pump", pump]]));
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(parsed.querySelector("script")).toBeNull();
    expect(parsed.querySelector("[onload]")).toBeNull();
    expect(svg).toContain("&lt;/text&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(parsed.querySelector("text")?.textContent).toContain('" onload="alert(2)');
  });

  it("inclui o texto completo de anotações pequenas nos limites", async () => {
    const document = emptyDocument("Texto longo");
    document.annotations.note = {
      id: "note", kind: "text", text: "Uma anotação muito maior do que sua caixa",
      x: 0, y: 0, width: 8, height: 8, rotation: 0, properties: {},
    };
    const svg = await renderPidSvg(document, new Map(), { padding: 0 });
    const [, , width] = svg.match(/viewBox="([^"]+)"/)![1].split(" ").map(Number);
    expect(width).toBeGreaterThan(250);
  });

  it("calcula texto rotacionado em torno do centro real da anotação", async () => {
    const document = emptyDocument("Texto rotacionado");
    document.annotations.note = {
      id: "note", kind: "text", text: "Uma anotação longa rotacionada em seu centro",
      x: 0, y: 0, width: 10, height: 10, rotation: 90, properties: {},
    };
    const svg = await renderPidSvg(document, new Map(), { padding: 0 });
    const [x, y, width, height] = svg.match(/viewBox="([^"]+)"/)![1].split(" ").map(Number);
    expect(x + width).toBeLessThan(30);
    expect(y + height).toBeGreaterThan(250);
  });

  it.each([
    ["process", 0, "right"], ["utility", 0, "right"], ["signal", 0, "right"],
    ["process", 90, "down"], ["utility", 90, "down"], ["signal", 90, "down"],
    ["process", 180, "left"], ["utility", 180, "left"], ["signal", 180, "left"],
    ["process", 270, "up"], ["utility", 270, "up"], ["signal", 270, "up"],
  ] as const)("desenha seta fechada %s na rotação %i apontando para %s", async (connectionClass, rotation, direction) => {
    const document = arrowDocument(connectionClass, rotation);
    const first = await renderPidSvg(document, new Map([["project.pump", pump]]), { padding: 0 });
    const second = await renderPidSvg(document, new Map([["project.pump", pump]]), { padding: 0 });
    const parsed = new DOMParser().parseFromString(first, "image/svg+xml");
    const arrow = parsed.querySelector('polygon[data-arrow-for="edge"]');
    const points = arrow?.getAttribute("points")?.trim().split(/\s+/).map((pair) => pair.split(",").map(Number));

    expect(first).toBe(second);
    expect(arrow?.getAttribute("id")).toBe("pid-arrow-0");
    expect(arrow?.getAttribute("fill")).toBe(connectionClass === "signal" ? "#64748b" : "#475569");
    expect(points).toHaveLength(3);
    const [tip, firstBase, secondBase] = points!;
    const base = [(firstBase[0] + secondBase[0]) / 2, (firstBase[1] + secondBase[1]) / 2];
    if (direction === "right") expect(tip[0]).toBeGreaterThan(base[0]);
    if (direction === "left") expect(tip[0]).toBeLessThan(base[0]);
    if (direction === "down") expect(tip[1]).toBeGreaterThan(base[1]);
    if (direction === "up") expect(tip[1]).toBeLessThan(base[1]);
    const [x, y] = parsed.documentElement.getAttribute("viewBox")!.split(" ").map(Number);
    expect(x).toBeLessThan(0);
    expect(y).toBeLessThan(0);
  });

  it("inclui geometria e traço da seta nos limites do SVG", async () => {
    const document = arrowDocument("process", 0);
    document.nodes["node-a"] = { ...document.nodes["node-a"], x: -80, y: 0, width: 2, height: 2 };
    document.nodes["node-b"] = { ...document.nodes["node-b"], x: 0, y: 0, width: 2, height: 2 };
    const svg = await renderPidSvg(document, new Map([["project.pump", pump]]), { padding: 0 });
    const [, y, , height] = new DOMParser().parseFromString(svg, "image/svg+xml")
      .documentElement.getAttribute("viewBox")!.split(" ").map(Number);
    expect(y).toBeLessThanOrEqual(-4);
    expect(y + height).toBeGreaterThanOrEqual(6);
  });

  it("exporta arestas com o mesmo renderer de padrao P&ID", async () => {
    const document = exportDocument();
    document.edges.edge = { ...document.edges.edge, lineStyle: "mechanical-link" };

    const svg = await renderPidSvg(document, new Map([["project.pump", pump]]), { padding: 0 });

    expect(svg).toContain('data-signal-line-style="mechanical-link"');
    expect(svg).toContain('data-glyph="concentric-circle"');
  });

  it("inclui os limites dos glifos de linha no viewBox sem padding", async () => {
    const document = edgeOnlyDocument("mechanical-link");
    document.edges.edge.route = [{ x: 50, y: -40 }];
    document.edges.edge.tag = "";
    document.edges.edge.label = "";

    const svg = await renderPidSvg(document, new Map([["project.pump", pump]]), { padding: 0 });
    const [, y] = new DOMParser().parseFromString(svg, "image/svg+xml")
      .documentElement.getAttribute("viewBox")!.split(" ").map(Number);

    expect(svg).toContain('data-glyph="concentric-circle"');
    expect(y).toBeLessThanOrEqual(-47);
  });

  it("enquadra glifos largos em legendas de nó, aresta, grupo e anotação", async () => {
    const value = "WW界語".repeat(10);
    const fixtures = wideTextDocuments(value);

    for (const fixture of fixtures) {
      const svg = await renderPidSvg(fixture.document, new Map([["project.pump", pump]]), { padding: 0 });
      expectTextToFitViewBox(svg, value, fixture.fontSize, fixture.centered);
    }
  });

  it("processa rota grande em passagem linear sem exceder o orçamento de armazenamento", async () => {
    const document = exportDocument();
    document.edges.edge.route = Array.from({ length: 125_000 }, (_, index) => {
      const step = Math.floor(index / 2);
      return index % 2 === 0 ? { x: step, y: step } : { x: step + 1, y: step };
    });
    document.edges.edge.tag = "";
    document.edges.edge.label = "";
    expect(JSON.stringify(document).length).toBeLessThan(5 * 1024 * 1024);

    const svg = await renderPidSvg(document, new Map([["project.pump", pump]]), { padding: 0 });
    expect(svg).toContain("L 62500 62499");
    expect(svg).toContain('data-arrow-for="edge"');
  }, 15_000);
});

function arrowDocument(connectionClass: ConnectionClass, rotation: number): PidDocument {
  const document = exportDocument();
  document.nodes["node-a"] = { ...document.nodes["node-a"], x: -320, y: -120, width: 40, height: 40, rotation: 0, tag: "", label: "" };
  document.nodes["node-b"] = { ...document.nodes["node-b"], x: -120, y: -120, width: 40, height: 40, rotation, tag: "", label: "" };
  document.ports.source = { ...document.ports.source, connectionClass };
  document.ports.target = { ...document.ports.target, connectionClass };
  document.edges.edge = { ...document.edges.edge, connectionClass, lineStyle: { "process": "supply-impulse" as const, "utility": "supply-impulse" as const, "signal": "electric-signal" as const }[connectionClass], route: [], tag: "", label: "" };
  document.annotations = {};
  document.groups = {};
  return document;
}

function edgeOnlyDocument(lineStyle: PidDocument["edges"][string]["lineStyle"]): PidDocument {
  const document = emptyDocument("Aresta com glifo");
  document.nodes = {
    "node-a": {
      id: "node-a", symbolKey: "project.pump", catalogVersion: "local-v1",
      x: 0, y: 0, width: 2, height: 2, rotation: 0, tag: "", label: "", properties: {},
    },
    "node-b": {
      id: "node-b", symbolKey: "project.pump", catalogVersion: "local-v1",
      x: 200, y: 0, width: 2, height: 2, rotation: 0, tag: "", label: "", properties: {},
    },
  };
  document.ports = {
    source: { id: "source", nodeId: "node-a", templateKey: "out", direction: "output", connectionClass: "signal", capacity: 1 },
    target: { id: "target", nodeId: "node-b", templateKey: "in", direction: "input", connectionClass: "signal", capacity: 1 },
  };
  document.edges = {
    edge: {
      id: "edge", sourcePortId: "source", targetPortId: "target", connectionClass: "signal", lineStyle,
      route: [], tag: "", label: "", properties: {},
    },
  };
  return document;
}

function wideTextDocuments(value: string): readonly { document: PidDocument; fontSize: number; centered: boolean }[] {
  const node = exportDocument();
  node.nodes = { "node-a": { ...node.nodes["node-a"], x: 0, y: 0, width: 10, height: 10, rotation: 0, tag: "", label: value } };
  node.ports = {}; node.edges = {}; node.annotations = {}; node.groups = {};

  const edge = exportDocument();
  edge.nodes["node-a"] = { ...edge.nodes["node-a"], x: 0, y: 0, width: 10, height: 10, rotation: 0, tag: "", label: "" };
  edge.nodes["node-b"] = { ...edge.nodes["node-b"], x: 50, y: 0, width: 10, height: 10, rotation: 0, tag: "", label: "" };
  edge.edges.edge = { ...edge.edges.edge, route: [], tag: "", label: value };
  edge.annotations = {}; edge.groups = {};

  const group = emptyDocument("Grupo largo");
  group.groups.group = { id: "group", label: value, memberIds: [], x: 0, y: 0, width: 5, height: 5, properties: {} };

  const annotation = emptyDocument("Anotação larga");
  annotation.annotations.note = { id: "note", kind: "text", text: value, x: 0, y: 0, width: 5, height: 5, rotation: 0, properties: {} };

  return [
    { document: node, fontSize: 12, centered: true },
    { document: edge, fontSize: 11, centered: true },
    { document: group, fontSize: 12, centered: false },
    { document: annotation, fontSize: 12, centered: false },
  ];
}

function expectTextToFitViewBox(svg: string, value: string, fontSize: number, centered: boolean): void {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const element = Array.from(parsed.querySelectorAll("text")).find((candidate) => candidate.textContent === value);
  expect(element).toBeDefined();
  const textX = Number(element!.getAttribute("x"));
  const width = [...value].length * fontSize;
  const expectedMinX = centered ? textX - width / 2 : textX;
  const expectedMaxX = centered ? textX + width / 2 : textX + width;
  const [viewX, , viewWidth] = parsed.documentElement.getAttribute("viewBox")!.split(" ").map(Number);
  expect(viewX).toBeLessThanOrEqual(expectedMinX);
  expect(viewX + viewWidth).toBeGreaterThanOrEqual(expectedMaxX);
}

function emptyDocument(title: string): PidDocument {
  return {
    schemaVersion: 1,
    id: "export-doc",
    metadata: {
      title,
      standard: "free",
      catalogVersion: "local-v1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      utilityCategories: [],
    },
    nodes: {}, ports: {}, edges: {}, annotations: {}, groups: {},
  };
}

function exportDocument(): PidDocument {
  const document = emptyDocument("Exportação");
  document.nodes = {
    "node-a": {
      id: "node-a", symbolKey: "project.pump", catalogVersion: "local-v1",
      x: -40, y: -20, width: 80, height: 40, rotation: 90,
      tag: "P-101", label: "P-101 & reserva", properties: {},
    },
    "node-b": {
      id: "node-b", symbolKey: "project.pump", catalogVersion: "local-v1",
      x: 200, y: 120, width: 80, height: 60, rotation: 0,
      tag: "P-102", label: "Destino", properties: {},
    },
  };
  document.ports = {
    source: { id: "source", nodeId: "node-a", templateKey: "out", direction: "output", connectionClass: "process", capacity: 1 },
    target: { id: "target", nodeId: "node-b", templateKey: "in", direction: "input", connectionClass: "process", capacity: 1 },
  };
  document.edges = {
    edge: {
      id: "edge", sourcePortId: "source", targetPortId: "target", connectionClass: "process", lineStyle: "supply-impulse",
      route: [{ x: -50, y: 150 }, { x: 240, y: 150 }], tag: "L-1", label: "Linha", properties: {},
    },
  };
  document.annotations = {
    note: { id: "note", kind: "note", text: "Nota <segura>", x: 110, y: -10, width: 100, height: 30, rotation: 0, properties: {} },
  };
  document.groups = {
    group: { id: "group", label: "Grupo <A>", memberIds: ["node-a"], x: -50, y: -20, width: 120, height: 80, properties: {} },
  };
  return document;
}
