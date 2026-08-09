import { Position } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";

import {
  canonicalPositionFromFlow,
  getPidNodeFlowGeometry,
  getPidPortFlowGeometry,
  minimumNodeSizeForPorts,
} from "@/features/pid/domain/geometry";
import {
  boundsForNodes,
  buildGraphIndex,
  createPortConnectionValidation,
  getPortConnectionRejection,
} from "@/features/pid/domain/graph-operations";
import type { PidDocument, PidNode, PidPort } from "@/features/pid/domain/model";
import { orthogonalPoints } from "@/features/pid/canvas/process-edge";

const node: PidNode = {
  id: "node",
  symbolKey: "project.valve.control",
  catalogVersion: "local-v1",
  x: 10,
  y: 20,
  width: 120,
  height: 60,
  rotation: 0,
  tag: "XV-1",
  label: "Válvula",
  properties: {},
};

function ports(count = 2): PidPort[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `input-${index}`,
    nodeId: node.id,
    templateKey: `input-${index}`,
    direction: "input" as const,
    connectionClass: index === 0 ? "process" as const : "signal" as const,
    capacity: 1,
  }));
}

describe("geometria canônica compartilhada do canvas P&ID", () => {
  it.each([
    [0, { x: 10, y: 4, width: 120, height: 92 }],
    [90, { x: 24, y: -10, width: 92, height: 120 }],
    [180, { x: 10, y: 4, width: 120, height: 92 }],
    [270, { x: 24, y: -10, width: 92, height: 120 }],
  ] as const)("rotaciona bounds retangulares em %i° preservando o centro", (rotation, expected) => {
    const rotated = { ...node, rotation };
    const geometry = getPidNodeFlowGeometry(rotated, ports());

    expect(geometry.bounds).toEqual(expected);
    expect(canonicalPositionFromFlow(rotated, geometry, {
      x: geometry.bounds.x + 32,
      y: geometry.bounds.y - 16,
    })).toEqual({ x: rotated.x + 32, y: rotated.y - 16 });
    expect(boundsForNodes([rotated], ports())).toEqual(expected);
  });

  it("expande nó legado pequeno e mantém alvos de 44px sem sobreposição", () => {
    const legacy = { ...node, width: 40, height: 40 };
    const legacyPorts = ports(3);
    const geometry = getPidNodeFlowGeometry(legacy, legacyPorts);
    const handles = legacyPorts.map((port, index) => getPidPortFlowGeometry(geometry, port, index, legacyPorts));

    expect(minimumNodeSizeForPorts(legacyPorts)).toEqual({ width: 44, height: 140 });
    expect(geometry.bounds.height).toBe(140);
    expect(handles.every(({ position, targetSize }) => position === Position.Left && targetSize === 44)).toBe(true);
    for (let index = 1; index < handles.length; index += 1) {
      expect(handles[index].targetRect.y).toBeGreaterThanOrEqual(
        handles[index - 1].targetRect.y + handles[index - 1].targetRect.height,
      );
    }
  });

  it.each([
    [Position.Left, { x: -24, y: 0 }],
    [Position.Right, { x: 24, y: 0 }],
    [Position.Top, { x: 0, y: -24 }],
    [Position.Bottom, { x: 0, y: 24 }],
  ] as const)("preserva tangentes de origem e destino para %s", (position, tangent) => {
    const source = { x: 100, y: 100 };
    const target = { x: 300, y: 220 };
    const points = orthogonalPoints(source, [{ x: 180, y: 150 }], target, position, position);

    expect(points[1]).toEqual({ x: source.x + tangent.x, y: source.y + tangent.y });
    expect(points.at(-2)).toEqual({ x: target.x + tangent.x, y: target.y + tangent.y });
    for (let index = 1; index < points.length; index += 1) {
      expect(points[index].x === points[index - 1].x || points[index].y === points[index - 1].y).toBe(true);
      expect(points[index]).not.toEqual(points[index - 1]);
    }
  });

  it("reutiliza o índice fornecido na validação quente", () => {
    const document = validationDocument();
    const index = buildGraphIndex(document);
    const counts = index.connectionCountByPort as Map<string, number>;
    const originalGet = counts.get.bind(counts);
    let reads = 0;
    counts.get = (key) => { reads += 1; return originalGet(key); };

    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(getPortConnectionRejection(document, "source", "target", index)).toBeNull();
    }
    expect(reads).toBe(40);
  });

  it("constrói o índice uma vez para validações repetidas", () => {
    const document = validationDocument();
    const build = vi.fn(buildGraphIndex);
    const validation = createPortConnectionValidation(document, build);

    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(validation.isValid("source", "target")).toBe(true);
    }
    expect(build).toHaveBeenCalledTimes(1);
  });
});

function validationDocument(): PidDocument {
  return {
    schemaVersion: 1,
    id: "document",
    metadata: {
      title: "Teste",
      standard: "free",
      catalogVersion: "local-v1",
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
    },
    nodes: {
      sourceNode: { ...node, id: "sourceNode" },
      targetNode: { ...node, id: "targetNode", x: 300 },
    },
    ports: {
      source: { id: "source", nodeId: "sourceNode", templateKey: "out", direction: "output", connectionClass: "process", capacity: 1 },
      target: { id: "target", nodeId: "targetNode", templateKey: "in", direction: "input", connectionClass: "process", capacity: 1 },
    },
    edges: {},
    annotations: {},
    groups: {},
  };
}
