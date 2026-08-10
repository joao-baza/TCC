import { MarkerType, type Position } from "@xyflow/react";

import type { CatalogSymbol } from "../catalog/catalog-symbol";
import {
  getPidNodeGeometry,
  getPidPortAnchorGeometry,
  type PidNodeGeometry,
} from "../domain/geometry";
import type { PidDocument, PidEdge, PidNode, PidPort } from "../domain/model";
import type { EquipmentFlowNode } from "./equipment-node";
import type { ProcessFlowEdge } from "./process-edge";
import { getPidCanvasInteractionGeometry, getPidPortHitTargetGeometry } from "./port-hit-target";

export interface PidFlowProjection {
  readonly nodes: EquipmentFlowNode[];
  readonly edges: ProcessFlowEdge[];
  readonly geometries: ReadonlyMap<string, PidNodeGeometry>;
}

interface FlowSelection {
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
}

interface DocumentSnapshot {
  readonly nodes: readonly PidNode[];
  readonly edges: readonly PidEdge[];
  readonly portsByNode: ReadonlyMap<string, readonly PidPort[]>;
}

interface NodeCacheEntry {
  readonly ports: readonly PidPort[];
  readonly symbol?: CatalogSymbol;
  readonly editable: boolean;
  readonly onPortKey: (portId: string, key: "Enter" | " " | "Escape") => void;
  readonly node: EquipmentFlowNode;
  readonly geometry: PidNodeGeometry;
}

interface EdgeCacheEntry {
  readonly source?: PidPort;
  readonly target?: PidPort;
  readonly editable: boolean;
  readonly edge: ProcessFlowEdge | null;
}

const documentSnapshots = new WeakMap<PidDocument, DocumentSnapshot>();
const nodeAdapters = new WeakMap<PidNode, NodeCacheEntry>();
const edgeAdapters = new WeakMap<PidEdge, EdgeCacheEntry>();

export function projectPidCanvasDocument(
  document: PidDocument,
  symbols: ReadonlyMap<string, CatalogSymbol>,
  editable: boolean,
  onPortKey: (portId: string, key: "Enter" | " " | "Escape") => void,
): PidFlowProjection {
  const snapshot = snapshotDocument(document);
  const geometries = new Map<string, PidNodeGeometry>();
  const nodes = snapshot.nodes.map((node) => {
    const ports = snapshot.portsByNode.get(node.id) ?? [];
    const symbol = symbols.get(node.symbolKey);
    const cached = nodeAdapters.get(node);
    if (cached
      && cached.symbol === symbol
      && cached.editable === editable
      && cached.onPortKey === onPortKey
      && sameReferences(cached.ports, ports)) {
      geometries.set(node.id, cached.geometry);
      return cached.node;
    }
    const geometry = getPidNodeGeometry(node);
    const interactionGeometry = getPidCanvasInteractionGeometry(geometry, ports);
    const portGeometries = new Map(ports.map((port, index) => [
      port.id,
      getPidPortHitTargetGeometry(
        interactionGeometry,
        geometry,
        getPidPortAnchorGeometry(geometry, port, index, ports),
        port,
        index,
        ports,
      ),
    ]));
    const flowNode: EquipmentFlowNode = {
      id: node.id,
      type: "equipment",
      position: { x: interactionGeometry.bounds.x, y: interactionGeometry.bounds.y },
      width: interactionGeometry.bounds.width,
      height: interactionGeometry.bounds.height,
      initialWidth: interactionGeometry.bounds.width,
      initialHeight: interactionGeometry.bounds.height,
      handles: ports.map((port) => {
        const portGeometry = portGeometries.get(port.id)!;
        return {
          id: port.id,
          type: port.direction === "input" ? "target" as const : "source" as const,
          position: portGeometry.position as Position,
          x: portGeometry.targetRect.x,
          y: portGeometry.targetRect.y,
          width: portGeometry.targetSize,
          height: portGeometry.targetSize,
        };
      }),
      draggable: editable,
      connectable: editable,
      deletable: editable,
      selectable: true,
      selected: false,
      domAttributes: { "aria-pressed": false },
      ariaRole: "button",
      ariaLabel: [node.label || symbol?.name || "Equipamento", node.tag].filter(Boolean).join(" "),
      data: { equipment: node, ports, symbol, editable, geometry, interactionGeometry, portGeometries, onPortKey },
    };
    nodeAdapters.set(node, { ports, symbol, editable, onPortKey, node: flowNode, geometry });
    geometries.set(node.id, geometry);
    return flowNode;
  });
  const edges = snapshot.edges.flatMap((edge) => {
    const source = document.ports[edge.sourcePortId];
    const target = document.ports[edge.targetPortId];
    const cached = edgeAdapters.get(edge);
    if (cached && cached.source === source && cached.target === target && cached.editable === editable) {
      return cached.edge ? [cached.edge] : [];
    }
    const flowEdge: ProcessFlowEdge | null = source && target ? {
      id: edge.id,
      type: "process",
      source: source.nodeId,
      target: target.nodeId,
      sourceHandle: source.id,
      targetHandle: target.id,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      selectable: true,
      deletable: editable,
      reconnectable: false,
      selected: false,
      ariaLabel: [edge.tag, edge.label].filter(Boolean).join(" ") || `Conexão ${edge.id}`,
      data: { processEdge: edge, route: edge.route, editable, utilityCategories: document.metadata.utilityCategories },
    } : null;
    edgeAdapters.set(edge, { source, target, editable, edge: flowEdge });
    return flowEdge ? [flowEdge] : [];
  });
  return { nodes, edges, geometries };
}

/** Applies selection with structural sharing; an unchanged selection returns the projection itself. */
export function applyPidCanvasSelection(
  projection: PidFlowProjection,
  selection: FlowSelection,
): PidFlowProjection {
  const selectedNodes = new Set(selection.nodeIds);
  const selectedEdges = new Set(selection.edgeIds);
  let nodesChanged = false;
  let edgesChanged = false;
  const nodes = projection.nodes.map((node) => {
    const selected = selectedNodes.has(node.id);
    if (node.selected === selected && node.domAttributes?.["aria-pressed"] === selected) return node;
    nodesChanged = true;
    return { ...node, selected, domAttributes: { ...node.domAttributes, "aria-pressed": selected } };
  });
  const edges = projection.edges.map((edge) => {
    const selected = selectedEdges.has(edge.id);
    if (edge.selected === selected) return edge;
    edgesChanged = true;
    return { ...edge, selected };
  });
  if (!nodesChanged && !edgesChanged) return projection;
  return {
    nodes: nodesChanged ? nodes : projection.nodes,
    edges: edgesChanged ? edges : projection.edges,
    geometries: projection.geometries,
  };
}

function snapshotDocument(document: PidDocument): DocumentSnapshot {
  const cached = documentSnapshots.get(document);
  if (cached) return cached;
  const portsByNode = new Map<string, PidPort[]>();
  for (const port of sortedValues(document.ports)) {
    const ports = portsByNode.get(port.nodeId);
    if (ports) ports.push(port);
    else portsByNode.set(port.nodeId, [port]);
  }
  const snapshot = {
    nodes: sortedValues(document.nodes),
    edges: sortedValues(document.edges),
    portsByNode,
  };
  documentSnapshots.set(document, snapshot);
  return snapshot;
}

function sortedValues<T extends { id: string }>(record: Record<string, T>): T[] {
  return Object.values(record).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

function sameReferences(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
