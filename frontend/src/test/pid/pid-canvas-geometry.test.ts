import { Position } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";

import {
  canonicalPositionFromFlow,
  getPidNodeGeometry,
  getPidPortAnchorGeometry,
} from "@/features/pid/domain/geometry";
import {
  getPidCanvasInteractionGeometry,
  getPidPortHitTargetGeometry,
} from "@/features/pid/canvas/port-hit-target";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import {
  boundsForNodes,
  buildGraphIndex,
  createPortConnectionValidation,
  getPortConnectionRejection,
} from "@/features/pid/domain/graph-operations";
import type { PidDocument, PidNode, PidPort } from "@/features/pid/domain/model";
import { orthogonalPoints } from "@/features/pid/canvas/process-edge";
import { assertDocumentInvariants } from "@/features/pid/domain/commands";

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
    [0, { x: 10, y: 20, width: 120, height: 60 }],
    [90, { x: 40, y: -10, width: 60, height: 120 }],
    [180, { x: 10, y: 20, width: 120, height: 60 }],
    [270, { x: 40, y: -10, width: 60, height: 120 }],
  ] as const)("rotaciona bounds retangulares em %i° preservando o centro", (rotation, expected) => {
    const rotated = { ...node, rotation };
    const geometry = getPidNodeGeometry(rotated);

    expect(geometry.bounds).toEqual(expected);
    expect(canonicalPositionFromFlow(rotated, geometry, {
      x: geometry.bounds.x + 32,
      y: geometry.bounds.y - 16,
    })).toEqual({ x: rotated.x + 32, y: rotated.y - 16 });
    expect(boundsForNodes([rotated])).toEqual(expected);
  });

  it("mantém bounds canônicos e escalona apenas alvos interativos de nó legado", () => {
    const legacy = { ...node, width: 40, height: 40 };
    const legacyPorts = ports(3);
    const geometry = getPidNodeGeometry(legacy);
    const interaction = getPidCanvasInteractionGeometry(geometry, legacyPorts);
    const anchors = legacyPorts.map((port, index) => getPidPortAnchorGeometry(geometry, port, index, legacyPorts));
    const handles = anchors.map((anchor, index) => getPidPortHitTargetGeometry(
      interaction,
      geometry,
      anchor,
      legacyPorts[index],
      index,
      legacyPorts,
    ));

    expect(geometry.bounds).toEqual({ x: legacy.x, y: legacy.y, width: 40, height: 40 });
    expect(anchors.map(({ y }) => y)).toEqual([10, 20, 30]);
    expect(handles.every(({ position, targetSize }) => position === Position.Left && targetSize === 44)).toBe(true);
    for (let index = 1; index < handles.length; index += 1) {
      expect(handles[index].targetRect.y).toBeGreaterThanOrEqual(
        handles[index - 1].targetRect.y + handles[index - 1].targetRect.height,
      );
    }
  });

  it("não deixa o tamanho do alvo de UI alterar bounds ou invariantes do domínio", () => {
    const document = validationDocument();
    const grouped = {
      ...document,
      groups: {
        group: { id: "group", memberIds: ["sourceNode", "targetNode"], label: "Grupo", properties: {}, ...boundsForNodes(Object.values(document.nodes)) },
      },
    };
    const sourceNode = document.nodes.sourceNode;
    const sourcePorts = Object.values(document.ports).filter(({ nodeId }) => nodeId === sourceNode.id);
    const geometry = getPidNodeGeometry(sourceNode);
    const interaction = getPidCanvasInteractionGeometry(geometry, sourcePorts);
    const anchor = getPidPortAnchorGeometry(geometry, sourcePorts[0], 0, sourcePorts);
    const smallTarget = getPidPortHitTargetGeometry(interaction, geometry, anchor, sourcePorts[0], 0, sourcePorts, 20);
    const largeInteraction = getPidCanvasInteractionGeometry(geometry, sourcePorts, 96);
    const largeTarget = getPidPortHitTargetGeometry(largeInteraction, geometry, anchor, sourcePorts[0], 0, sourcePorts, 96);

    expect(smallTarget.targetRect).not.toEqual(largeTarget.targetRect);
    expect(boundsForNodes(Object.values(document.nodes))).toEqual({
      x: grouped.groups.group.x,
      y: grouped.groups.group.y,
      width: grouped.groups.group.width,
      height: grouped.groups.group.height,
    });
    expect(assertDocumentInvariants(grouped).filter(({ code }) => code === "group.bounds")).toEqual([]);
  });

  it("mantém todos os alvos de perímetro sem interseção em símbolos reais e legados", () => {
    const fixtures = [
      ...localCatalog.map((symbol, fixtureIndex) => ({
        node: { ...node, id: `node-${fixtureIndex}`, symbolKey: symbol.key, width: symbol.defaultSize.width, height: symbol.defaultSize.height },
        ports: symbol.portTemplates.map((template, portIndex) => ({
          ...template,
          id: `port-${fixtureIndex}-${portIndex}`,
          nodeId: `node-${fixtureIndex}`,
          templateKey: template.key,
        })),
      })),
      {
        node: { ...node, id: "legacy", width: 24, height: 32 },
        ports: [
          ...ports(3).map((port) => ({ ...port, nodeId: "legacy" })),
          { id: "legacy-output", nodeId: "legacy", templateKey: "output", direction: "output" as const, connectionClass: "process" as const, capacity: 1 },
          { id: "legacy-bottom", nodeId: "legacy", templateKey: "bottom", direction: "bidirectional" as const, connectionClass: "signal" as const, capacity: 1 },
        ],
      },
    ];
    for (const fixture of fixtures) {
      for (const rotation of [0, 90, 180, 270] as const) {
        const rotated = { ...fixture.node, rotation };
        const canonical = getPidNodeGeometry(rotated);
        const interaction = getPidCanvasInteractionGeometry(canonical, fixture.ports);
        const targets = fixture.ports.map((port, index) => getPidPortHitTargetGeometry(
          interaction,
          canonical,
          getPidPortAnchorGeometry(canonical, port, index, fixture.ports),
          port,
          index,
          fixture.ports,
        ));
        expect(interaction.canonicalRect.width).toBe(canonical.bounds.width);
        expect(interaction.canonicalRect.height).toBe(canonical.bounds.height);
        for (let left = 0; left < targets.length; left += 1) {
          for (let right = left + 1; right < targets.length; right += 1) {
            expect(rectanglesIntersect(targets[left].targetRect, targets[right].targetRect),
              `${fixture.node.symbolKey} ${rotation}°: ${fixture.ports[left].templateKey}/${fixture.ports[right].templateKey}`)
              .toBe(false);
          }
        }
      }
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

function rectanglesIntersect(left: { x: number; y: number; width: number; height: number }, right: { x: number; y: number; width: number; height: number }): boolean {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}
