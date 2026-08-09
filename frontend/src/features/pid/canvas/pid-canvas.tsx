import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  type Connection,
  type EdgeTypes,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { CatalogIndex } from "../catalog/catalog-index";
import type { CatalogSymbol } from "../catalog/catalog-symbol";
import { deleteSelection, type PidCommand } from "../domain/commands";
import type { PidDocument, PidPort } from "../domain/model";
import { getPortConnectionRejection, uniqueIds } from "../domain/graph-operations";
import { projectPidDocument } from "../domain/projection";
import { EquipmentNode, getPortHandleGeometry, type EquipmentFlowNode } from "./equipment-node";
import { ProcessEdge, type ProcessFlowEdge } from "./process-edge";

const nodeTypes = { equipment: EquipmentNode } satisfies NodeTypes;
const edgeTypes = { process: ProcessEdge } satisfies EdgeTypes;

export interface PidCanvasSelection {
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
}

export interface PidCanvasProps {
  readonly document: PidDocument;
  readonly catalog: CatalogIndex | readonly CatalogSymbol[];
  readonly editable: boolean;
  readonly onCommand: (command: PidCommand) => void;
  readonly onSelectionChange?: (selection: PidCanvasSelection) => void;
  readonly className?: string;
}

export function PidCanvas(props: PidCanvasProps) {
  return (
    <ReactFlowProvider>
      <PidCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function PidCanvasInner({ document, catalog, editable, onCommand, onSelectionChange, className }: PidCanvasProps) {
  const [selection, setSelection] = useState<PidCanvasSelection>({ nodeIds: [], edgeIds: [] });
  const selectionRef = useRef(selection);
  const notifiedSelectionRef = useRef(selection);
  const projection = useMemo(() => projectPidDocument(document), [document]);
  const symbols = useMemo(() => resolveCatalog(catalog, document), [catalog, document.metadata.standard]);
  const portsByNode = useMemo(() => {
    const result = new Map<string, PidPort[]>();
    for (const port of projection.ports) {
      const ports = result.get(port.nodeId);
      if (ports) ports.push(port);
      else result.set(port.nodeId, [port]);
    }
    return result;
  }, [projection.ports]);

  const nodes = useMemo<EquipmentFlowNode[]>(() => projection.nodes.map((node) => {
    const ports = portsByNode.get(node.id) ?? [];
    return {
      id: node.id,
      type: "equipment",
      position: { x: node.x, y: node.y },
      width: node.width,
      height: node.height,
      initialWidth: node.width,
      initialHeight: node.height,
      handles: ports.map((port, index) => {
        const geometry = getPortHandleGeometry(port, index, ports, node.rotation);
        return {
          id: port.id,
          type: port.direction === "input" ? "target" as const : "source" as const,
          position: geometry.position,
          x: geometry.x * node.width - 22,
          y: geometry.y * node.height - 22,
          width: 44,
          height: 44,
        };
      }),
      draggable: editable,
      connectable: editable,
      deletable: editable,
      selectable: true,
      selected: selection.nodeIds.includes(node.id),
      domAttributes: { "aria-pressed": selection.nodeIds.includes(node.id) },
      ariaRole: "button",
      ariaLabel: [node.label || symbols.get(node.symbolKey)?.name || "Equipamento", node.tag].filter(Boolean).join(" "),
      data: {
        equipment: node,
        ports,
        symbol: symbols.get(node.symbolKey),
        editable,
      },
    };
  }), [editable, portsByNode, projection.nodes, selection.nodeIds, symbols]);

  const edges = useMemo<ProcessFlowEdge[]>(() => projection.edges.flatMap((edge) => {
    const source = document.ports[edge.sourcePortId];
    const target = document.ports[edge.targetPortId];
    if (!source || !target) return [];
    return [{
      id: edge.id,
      type: "process" as const,
      source: source.nodeId,
      target: target.nodeId,
      sourceHandle: source.id,
      targetHandle: target.id,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      selectable: true,
      deletable: editable,
      reconnectable: false,
      selected: selection.edgeIds.includes(edge.id),
      ariaLabel: [edge.tag, edge.label].filter(Boolean).join(" ") || `Conexão ${edge.id}`,
      data: { processEdge: edge, route: edge.route, editable },
    }];
  }), [document.ports, editable, projection.edges, selection.edgeIds]);

  const commitSelection = useCallback((update: (current: PidCanvasSelection) => PidCanvasSelection) => {
    const current = selectionRef.current;
    const next = update(current);
    if (sameSelection(current, next)) return;
    selectionRef.current = next;
    setSelection(next);
  }, []);
  useEffect(() => {
    if (sameSelection(notifiedSelectionRef.current, selection)) return;
    notifiedSelectionRef.current = selection;
    onSelectionChange?.(selection);
  }, [onSelectionChange, selection]);
  useEffect(() => {
    commitSelection((current) => ({
      nodeIds: current.nodeIds.filter((id) => Boolean(document.nodes[id])),
      edgeIds: current.edgeIds.filter((id) => Boolean(document.edges[id])),
    }));
  }, [commitSelection, document.edges, document.nodes]);
  const handleNodesChange = useCallback((changes: NodeChange<EquipmentFlowNode>[]) => {
    if (!changes.some((change) => change.type === "select" || change.type === "remove")) return;
    commitSelection((current) => {
      const selected = new Set(current.nodeIds);
      for (const change of changes) {
        if (change.type === "select" && change.selected) selected.add(change.id);
        else if (change.type === "select" || change.type === "remove") selected.delete(change.id);
      }
      return { nodeIds: [...selected], edgeIds: current.edgeIds };
    });
  }, [commitSelection]);
  const handleEdgesChange = useCallback((changes: EdgeChange<ProcessFlowEdge>[]) => {
    if (!changes.some((change) => change.type === "select" || change.type === "remove")) return;
    commitSelection((current) => {
      const selected = new Set(current.edgeIds);
      for (const change of changes) {
        if (change.type === "select" && change.selected) selected.add(change.id);
        else if (change.type === "select" || change.type === "remove") selected.delete(change.id);
      }
      return { nodeIds: current.nodeIds, edgeIds: [...selected] };
    });
  }, [commitSelection]);

  const normalizeConnection = useCallback(
    (connection: ProcessFlowEdge | Connection) => normalizePidConnection(document, connection),
    [document],
  );
  const isValidConnection = useCallback((connection: ProcessFlowEdge | Connection) => {
    const normalized = normalizeConnection(connection);
    return normalized !== null && isPidConnectionValid(document, normalized.sourcePortId, normalized.targetPortId);
  }, [document, normalizeConnection]);
  const handleConnect = useCallback((connection: Connection) => {
    if (!editable) return;
    const command = pidConnectionCommand(document, connection);
    if (command) onCommand(command);
  }, [document, editable, onCommand]);
  const handleDragStop = useCallback((_event: MouseEvent | TouchEvent, node: EquipmentFlowNode, movedNodes: EquipmentFlowNode[]) => {
    if (!editable) return;
    const selectedIds = movedNodes.map(({ id }) => id).filter((id) => document.nodes[id]);
    const command = createPidMoveCommand(document, node.id, node.position, selectedIds);
    if (command) onCommand(command);
  }, [document.nodes, editable, onCommand]);
  const handleDelete = useCallback(({ nodes: deletedNodes, edges: deletedEdges }: {
    nodes: EquipmentFlowNode[];
    edges: ProcessFlowEdge[];
  }) => {
    if (!editable) return;
    const ids = [...deletedNodes.map(({ id }) => id), ...deletedEdges.map(({ id }) => id)];
    if (ids.length > 0) onCommand(deleteSelection(ids));
  }, [editable, onCommand]);

  return (
    <div
      data-testid="pid-canvas"
      data-editable={String(editable)}
      className={`h-[640px] min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${className ?? ""}`}
      style={{ height: "640px" }}
    >
      <ReactFlow<EquipmentFlowNode, ProcessFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        nodesDraggable={editable}
        nodesConnectable={editable}
        edgesReconnectable={false}
        elementsSelectable
        multiSelectionKeyCode={["Meta", "Control"]}
        selectionMode={SelectionMode.Partial}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={editable ? ["Backspace", "Delete"] : null}
        isValidConnection={isValidConnection}
        onConnect={handleConnect}
        onNodeDragStop={handleDragStop}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onDelete={handleDelete}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable ariaLabel="Minimapa do diagrama P&ID" />
      </ReactFlow>
    </div>
  );
}

function resolveCatalog(catalog: CatalogIndex | readonly CatalogSymbol[], document: PidDocument): ReadonlyMap<string, CatalogSymbol> {
  const entries: readonly CatalogSymbol[] = "search" in catalog
    ? catalog.search("", { standard: document.metadata.standard })
    : catalog;
  return new Map(entries.map((symbol) => [symbol.key, symbol]));
}

export function normalizePidConnection(
  document: PidDocument,
  connection: { readonly sourceHandle?: string | null; readonly targetHandle?: string | null },
): { sourcePortId: string; targetPortId: string } | null {
  if (!connection.sourceHandle || !connection.targetHandle) return null;
  const source = document.ports[connection.sourceHandle];
  const target = document.ports[connection.targetHandle];
  if (!source || !target) return null;
  if (source.direction === "input" || target.direction === "output") {
    if (target.direction !== "input" && source.direction !== "output") {
      return { sourcePortId: target.id, targetPortId: source.id };
    }
  }
  return { sourcePortId: source.id, targetPortId: target.id };
}

export function isPidConnectionValid(document: PidDocument, sourcePortId: string, targetPortId: string): boolean {
  return getPortConnectionRejection(document, sourcePortId, targetPortId) === null;
}

export function pidConnectionCommand(
  document: PidDocument,
  connection: { readonly sourceHandle?: string | null; readonly targetHandle?: string | null },
): Extract<PidCommand, { type: "ports.connect" }> | null {
  const normalized = normalizePidConnection(document, connection);
  if (!normalized || !isPidConnectionValid(document, normalized.sourcePortId, normalized.targetPortId)) return null;
  return { type: "ports.connect", ...normalized };
}

export function createPidMoveCommand(
  document: PidDocument,
  draggedNodeId: string,
  position: { readonly x: number; readonly y: number },
  selectedNodeIds: readonly string[],
): Extract<PidCommand, { type: "selection.move" }> | null {
  const canonical = document.nodes[draggedNodeId];
  if (!canonical) return null;
  const delta = { x: position.x - canonical.x, y: position.y - canonical.y };
  if (delta.x === 0 && delta.y === 0) return null;
  const selected = uniqueIds(selectedNodeIds.filter((id) => document.nodes[id]));
  const ids = selected.includes(draggedNodeId) ? selected : [draggedNodeId];
  return { type: "selection.move", ids, delta };
}

function sameSelection(left: PidCanvasSelection, right: PidCanvasSelection): boolean {
  return left.nodeIds.length === right.nodeIds.length
    && left.edgeIds.length === right.edgeIds.length
    && left.nodeIds.every((id, index) => id === right.nodeIds[index])
    && left.edgeIds.every((id, index) => id === right.edgeIds[index]);
}
