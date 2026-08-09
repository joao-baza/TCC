import { describe, expect, it } from "vitest";

import { projectPidCanvasDocument } from "@/features/pid/canvas/flow-projection";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import type { PidDocument } from "@/features/pid/domain/model";
import { validateDocument } from "@/features/pid/domain/validation";
import { renderPidSvg } from "@/features/pid/export/render-svg";

import {
  createPidPerformanceDocument,
  onPidPerformancePortKey,
  pidPerformanceAssets,
  pidPerformanceEdgeCount,
  pidPerformanceNodeCount,
  pidPerformanceSymbols,
} from "./pid-performance-fixture";

describe("carga de referência do editor P&ID", () => {
  it("preserva volume, cardinalidade e correção na carga de referência", async () => {
    const document = createPidPerformanceDocument();
    const projection = projectPidCanvasDocument(document, pidPerformanceSymbols, true, onPidPerformancePortKey);
    const issues = validateDocument(document, { catalog: localCatalog });
    const svg = await renderPidSvg(document, pidPerformanceAssets);

    expect(Object.keys(document.nodes)).toHaveLength(pidPerformanceNodeCount);
    expect(Object.keys(document.ports)).toHaveLength(pidPerformanceNodeCount * 4);
    expect(Object.keys(document.edges)).toHaveLength(pidPerformanceEdgeCount);
    expect(projection.nodes).toHaveLength(pidPerformanceNodeCount);
    expect(projection.edges).toHaveLength(pidPerformanceEdgeCount);
    expect(projection.geometries).toHaveLength(pidPerformanceNodeCount);
    expect(issues).toEqual([]);
    expect(svg.match(/data-element-id=/g)).toHaveLength(pidPerformanceNodeCount + pidPerformanceEdgeCount);
  }, 10_000);

  it("mantém crescimento estrutural linear ao dobrar a carga", async () => {
    const half = await cardinality(pidPerformanceNodeCount / 2);
    const full = await cardinality(pidPerformanceNodeCount);

    expect(full).toEqual(Object.fromEntries(
      Object.entries(half).map(([key, value]) => [key, value * 2]),
    ));
  }, 10_000);
});

async function cardinality(nodeCount: number): Promise<Record<string, number>> {
  const instrumentation = instrumentRecordReads(createPidPerformanceDocument(nodeCount));
  const { document } = instrumentation;
  const projection = projectPidCanvasDocument(document, pidPerformanceSymbols, true, onPidPerformancePortKey);
  const issues = validateDocument(document, { catalog: localCatalog });
  const svg = await renderPidSvg(document, pidPerformanceAssets);
  expect(issues).toEqual([]);
  return {
    nodes: Object.keys(document.nodes).length,
    ports: Object.keys(document.ports).length,
    edges: Object.keys(document.edges).length,
    projectedNodes: projection.nodes.length,
    projectedEdges: projection.edges.length,
    geometries: projection.geometries.size,
    exportedElements: svg.match(/data-element-id=/g)?.length ?? 0,
    recordReads: instrumentation.reads(),
  };
}

function instrumentRecordReads(document: PidDocument): {
  readonly document: PidDocument;
  readonly reads: () => number;
} {
  let reads = 0;
  const track = <T>(record: Record<string, T>): Record<string, T> => new Proxy(record, {
    get(target, property, receiver) {
      if (typeof property === "string" && Object.hasOwn(target, property)) reads += 1;
      return Reflect.get(target, property, receiver) as T;
    },
  });
  return {
    document: {
      ...document,
      nodes: track(document.nodes),
      ports: track(document.ports),
      edges: track(document.edges),
      annotations: track(document.annotations),
      groups: track(document.groups),
    },
    reads: () => reads,
  };
}
