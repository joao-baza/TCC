import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import { sanitizePidSvgAsset } from "@/features/pid/catalog/sanitized-svg-asset";
import type { PidDocument, PidNode, PidPort } from "@/features/pid/domain/model";
import { createEmptyDocument } from "@/features/pid/domain/schema";

export const pidPerformanceNodeCount = 500;
export const pidPerformanceEdgeCount = pidPerformanceNodeCount * 2;
export const pidPerformanceSymbol = localCatalog.find(({ key }) => key === "drawio.pid.pumps.centrifugal-pump-1")!;
export const pidPerformanceCatalog = [{
  ...pidPerformanceSymbol,
  portTemplates: [
    { key: "suction", direction: "input" as const, connectionClass: "process" as const, capacity: 1 },
    { key: "discharge", direction: "output" as const, connectionClass: "process" as const, capacity: 1 },
    { key: "suction-aux", direction: "input" as const, connectionClass: "process" as const, capacity: 1 },
    { key: "discharge-aux", direction: "output" as const, connectionClass: "process" as const, capacity: 1 },
  ],
}];
export const pidPerformanceSymbols = new Map([[pidPerformanceSymbol.key, pidPerformanceCatalog[0]]]);
export const pidPerformanceAssets = new Map([[pidPerformanceSymbol.key, sanitizePidSvgAsset(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><circle cx="60" cy="40" r="20" fill="none" stroke="currentColor"/></svg>',
)]]);
export const onPidPerformancePortKey = () => undefined;

export function createPidCommandReferenceDocument(): PidDocument {
  const base = createEmptyDocument(
    { title: "Novo P&ID", standard: "free" },
    {
      generateId: () => "10000000-0000-4000-8000-000000000001",
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    },
  );
  const nodes: PidDocument["nodes"] = {};
  const ports: PidDocument["ports"] = {};
  const edges: PidDocument["edges"] = {};
  const id = (value: number) => `${value.toString(16).padStart(8, "0")}-1000-4000-8000-000000000000`;
  for (let index = 0; index < 500; index += 1) {
    const nodeId = id(index + 10);
    nodes[nodeId] = {
      id: nodeId,
      symbolKey: "project.reference",
      catalogVersion: base.metadata.catalogVersion,
      x: index * 20,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      tag: "",
      label: "Referência",
      properties: {},
    };
    for (let lane = 0; lane < 2; lane += 1) {
      const outputId = id(1_000 + index * 4 + lane * 2);
      const inputId = id(1_000 + index * 4 + lane * 2 + 1);
      ports[outputId] = {
        id: outputId,
        nodeId,
        templateKey: `out-${lane}`,
        direction: "output",
        connectionClass: "process",
        capacity: 1,
      };
      ports[inputId] = {
        id: inputId,
        nodeId,
        templateKey: `in-${lane}`,
        direction: "input",
        connectionClass: "process",
        capacity: 1,
      };
    }
  }
  for (let index = 0; index < 500; index += 1) {
    const targetIndex = (index + 1) % 500;
    for (let lane = 0; lane < 2; lane += 1) {
      const edgeId = id(4_000 + index * 2 + lane);
      edges[edgeId] = {
        id: edgeId,
        sourcePortId: id(1_000 + index * 4 + lane * 2),
        targetPortId: id(1_000 + targetIndex * 4 + lane * 2 + 1),
        connectionClass: "process",
        route: [],
        tag: "",
        label: "",
        properties: {},
      };
    }
  }
  return { ...base, nodes, ports, edges };
}

export function createPidPerformanceDocument(nodeCount = pidPerformanceNodeCount): PidDocument {
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
      symbolKey: pidPerformanceSymbol.key,
      catalogVersion: pidPerformanceSymbol.catalogVersion,
      x: (index % 25) * 144,
      y: Math.floor(index / 25) * 112,
      width: pidPerformanceSymbol.defaultSize.width,
      height: pidPerformanceSymbol.defaultSize.height,
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
    edges[firstEdgeId] = edge(firstEdgeId, portId(index, "discharge"), portId(next, "suction"));
    edges[secondEdgeId] = edge(secondEdgeId, portId(index, "discharge-aux"), portId(second, "suction-aux"));
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
