import { describe, expect, it } from "vitest";

import type { PidDocument } from "@/features/pid/domain/model";
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
});

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
      id: "edge", sourcePortId: "source", targetPortId: "target", connectionClass: "process",
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
