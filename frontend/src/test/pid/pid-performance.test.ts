import { describe, expect, it } from "vitest";

import { projectPidCanvasDocument } from "@/features/pid/canvas/flow-projection";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import { sanitizePidSvgAsset } from "@/features/pid/catalog/sanitized-svg-asset";
import type { PidDocument, PidNode, PidPort } from "@/features/pid/domain/model";
import { createEmptyDocument } from "@/features/pid/domain/schema";
import { validateDocument } from "@/features/pid/domain/validation";
import { renderPidSvg } from "@/features/pid/export/render-svg";

const nodeCount = 500;
const edgeCount = 1_000;
const symbol = localCatalog.find(({ key }) => key === "project.pump.centrifugal")!;
const symbols = new Map([[symbol.key, symbol]]);
const assets = new Map([[symbol.key, sanitizePidSvgAsset(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><circle cx="60" cy="40" r="20" fill="none" stroke="currentColor"/></svg>',
)]]);
const onPortKey = () => undefined;

describe("orçamento de desempenho do editor P&ID", () => {
  it("projeta 500 nós e 1.000 conexões dentro dos orçamentos de referência", async () => {
    const warmup = largeDocument();
    projectPidCanvasDocument(warmup, symbols, true, onPortKey);
    validateDocument(warmup, { catalog: localCatalog });
    await renderPidSvg(warmup, assets);

    const document = largeDocument();
    const projectionStart = performance.now();
    const projection = projectPidCanvasDocument(document, symbols, true, onPortKey);
    const projectionDuration = performance.now() - projectionStart;

    const validationStart = performance.now();
    const issues = validateDocument(document, { catalog: localCatalog });
    const validationDuration = performance.now() - validationStart;

    const svgStart = performance.now();
    const svg = await renderPidSvg(document, assets);
    const svgDuration = performance.now() - svgStart;

    expect(Object.keys(document.nodes)).toHaveLength(nodeCount);
    expect(Object.keys(document.edges)).toHaveLength(edgeCount);
    expect(projection.nodes).toHaveLength(nodeCount);
    expect(projection.edges).toHaveLength(edgeCount);
    expect(issues).toEqual([]);
    expect(svg.match(/data-element-id=/g)).toHaveLength(nodeCount + edgeCount);
    expect(projectionDuration).toBeLessThan(100);
    expect(validationDuration).toBeLessThan(200);
    expect(svgDuration).toBeLessThan(500);
  }, 10_000);
});

function largeDocument(): PidDocument {
  const base = createEmptyDocument(
    { title: "Referência de desempenho", standard: "free" },
    {
      generateId: () => uuid(999_999),
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    },
  );
  const nodes: Record<string, PidNode> = {};
  const ports: Record<string, PidPort> = {};
  const edges: PidDocument["edges"] = {};

  for (let index = 0; index < nodeCount; index += 1) {
    const nodeId = uuid(index + 1);
    nodes[nodeId] = {
      id: nodeId,
      symbolKey: symbol.key,
      catalogVersion: symbol.catalogVersion,
      x: (index % 25) * 144,
      y: Math.floor(index / 25) * 112,
      width: symbol.defaultSize.width,
      height: symbol.defaultSize.height,
      rotation: 0,
      tag: `P-${String(index + 1).padStart(3, "0")}`,
      label: "Bomba centrífuga",
      properties: {},
    };
    addPort(ports, nodeId, "suction", "input");
    addPort(ports, nodeId, "discharge", "output");
    addPort(ports, nodeId, "suction-aux", "input");
    addPort(ports, nodeId, "discharge-aux", "output");
  }

  for (let index = 0; index < nodeCount; index += 1) {
    const next = (index + 1) % nodeCount;
    const second = (index + 2) % nodeCount;
    const firstEdgeId = uuid(20_000 + index * 2);
    const secondEdgeId = uuid(20_000 + index * 2 + 1);
    edges[firstEdgeId] = edge(
      firstEdgeId,
      portId(index, "discharge"),
      portId(next, "suction"),
    );
    edges[secondEdgeId] = edge(
      secondEdgeId,
      portId(index, "discharge-aux"),
      portId(second, "suction-aux"),
    );
  }

  return {
    ...base,
    nodes,
    ports,
    edges,
    annotations: {},
    groups: {},
  };
}

function addPort(
  ports: Record<string, PidPort>,
  nodeId: string,
  templateKey: string,
  direction: "input" | "output",
): void {
  const nodeIndex = Number.parseInt(nodeId.slice(-12), 16) - 1;
  const templateOffset = ["suction", "discharge", "suction-aux", "discharge-aux"].indexOf(templateKey);
  const id = uuid(10_000 + nodeIndex * 4 + templateOffset);
  ports[id] = {
    id,
    nodeId,
    templateKey,
    direction,
    connectionClass: "process",
    capacity: 1,
  };
}

function portId(index: number, templateKey: string): string {
  const templateOffset = ["suction", "discharge", "suction-aux", "discharge-aux"].indexOf(templateKey);
  return uuid(10_000 + index * 4 + templateOffset);
}

function edge(id: string, sourcePortId: string, targetPortId: string): PidDocument["edges"][string] {
  return {
    id,
    sourcePortId,
    targetPortId,
    connectionClass: "process",
    route: [],
    tag: `L-${Number.parseInt(id.slice(-12), 16) - 20_000}`,
    label: "",
    properties: {},
  };
}

function uuid(value: number): string {
  return `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
}
