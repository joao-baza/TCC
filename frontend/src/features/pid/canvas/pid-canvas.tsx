import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  applyNodeChanges,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
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
import { canonicalPositionFromFlow, type PidNodeFlowGeometry } from "../domain/geometry";
import type { PidDocument } from "../domain/model";
import { createPortConnectionValidation, getPortConnectionRejection, type PidGraphIndex, uniqueIds } from "../domain/graph-operations";
import { EquipmentNode, type EquipmentFlowNode } from "./equipment-node";
import { projectPidCanvasDocument } from "./flow-projection";
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
  readonly selection?: PidCanvasSelection;
  readonly className?: string;
}

export function PidCanvas(props: PidCanvasProps) {
  return (
    <ReactFlowProvider>
      <PidCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function PidCanvasInner({
  document,
  catalog,
  editable,
  onCommand,
  onSelectionChange,
  selection: controlledSelection,
  className,
}: PidCanvasProps) {
  const initialSelection = controlledSelection ?? { nodeIds: [], edgeIds: [] };
  const [selection, setSelection] = useState<PidCanvasSelection>(initialSelection);
  const selectionRef = useRef(initialSelection);
  const notifiedSelectionRef = useRef(initialSelection);
  const documentRef = useRef(document);
  const onCommandRef = useRef(onCommand);
  const editableRef = useRef(editable);
  const pointerDraggingRef = useRef(false);
  const draggingNodeIdsRef = useRef<ReadonlySet<string>>(new Set());
  const [keyboardSourcePortId, setKeyboardSourcePortId] = useState<string | null>(null);
  const keyboardSourcePortRef = useRef<string | null>(null);
  const [connectionAnnouncement, setConnectionAnnouncement] = useState("");
  documentRef.current = document;
  onCommandRef.current = onCommand;
  editableRef.current = editable;
  const connectionValidation = useMemo(() => createPortConnectionValidation(document), [document]);
  const connectionValidationRef = useRef(connectionValidation);
  connectionValidationRef.current = connectionValidation;
  const symbols = useMemo(() => resolveCatalog(catalog, document), [catalog, document.metadata.standard]);
  const updateKeyboardSourcePort = useCallback((portId: string | null) => {
    keyboardSourcePortRef.current = portId;
    setKeyboardSourcePortId(portId);
  }, []);
  const handlePortKey = useCallback((portId: string, key: "Enter" | " " | "Escape") => {
    if (!editableRef.current) return;
    if (key === "Escape") {
      updateKeyboardSourcePort(null);
      setConnectionAnnouncement("Conexão por teclado cancelada.");
      return;
    }
    const sourcePortId = keyboardSourcePortRef.current;
    const currentDocument = documentRef.current;
    const port = currentDocument.ports[portId];
    if (!port) {
      updateKeyboardSourcePort(null);
      return;
    }
    if (!sourcePortId) {
      updateKeyboardSourcePort(portId);
      setConnectionAnnouncement(`Porta ${port.templateKey} selecionada como origem.`);
      return;
    }
    const normalized = normalizePidConnection(currentDocument, {
      sourceHandle: sourcePortId,
      targetHandle: portId,
    });
    const rejection = normalized
      ? connectionValidationRef.current.getRejection(normalized.sourcePortId, normalized.targetPortId)
      : { message: "As duas portas da conexão devem existir." };
    if (!normalized || rejection) {
      setConnectionAnnouncement(`Conexão inválida: ${rejection?.message}`);
      return;
    }
    onCommandRef.current({ type: "ports.connect", ...normalized });
    updateKeyboardSourcePort(null);
    setConnectionAnnouncement("Conexão criada com sucesso.");
  }, [updateKeyboardSourcePort]);
  const projection = useMemo(
    () => projectPidCanvasDocument(document, symbols, editable, handlePortKey),
    [document, editable, handlePortKey, symbols],
  );
  const [nodes, setNodes] = useNodesState<EquipmentFlowNode>(projection.nodes);
  const [edges, setEdges, onFlowEdgesChange] = useEdgesState<ProcessFlowEdge>(projection.edges);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

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
    if (!controlledSelection || sameSelection(selectionRef.current, controlledSelection)) return;
    selectionRef.current = controlledSelection;
    notifiedSelectionRef.current = controlledSelection;
    setSelection(controlledSelection);
  }, [controlledSelection]);
  useEffect(() => {
    commitSelection((current) => ({
      nodeIds: current.nodeIds.filter((id) => Boolean(document.nodes[id])),
      edgeIds: current.edgeIds.filter((id) => Boolean(document.edges[id])),
    }));
  }, [commitSelection, document.edges, document.nodes]);
  useEffect(() => {
    const transientNodeIds = pointerDraggingRef.current ? draggingNodeIdsRef.current : undefined;
    setNodes((current) => reconcileNodes(current, projection.nodes, transientNodeIds));
    setEdges((current) => reconcileEdges(current, projection.edges));
  }, [projection, setEdges, setNodes]);
  useEffect(() => {
    const selectedNodes = new Set(selection.nodeIds);
    const selectedEdges = new Set(selection.edgeIds);
    setNodes((current) => current.map((node) => {
      const selected = selectedNodes.has(node.id);
      return node.selected === selected && node.domAttributes?.["aria-pressed"] === selected
        ? node
        : { ...node, selected, domAttributes: { ...node.domAttributes, "aria-pressed": selected } };
    }));
    setEdges((current) => current.map((edge) => edge.selected === selectedEdges.has(edge.id)
      ? edge
      : { ...edge, selected: selectedEdges.has(edge.id) }));
  }, [selection, setEdges, setNodes]);
  const handleNodesChange = useCallback((changes: NodeChange<EquipmentFlowNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
    if (changes.some((change) => change.type === "select" || change.type === "remove")) {
      commitSelection((current) => {
        const selected = new Set(current.nodeIds);
        for (const change of changes) {
          if (change.type === "select" && change.selected) selected.add(change.id);
          else if (change.type === "select" || change.type === "remove") selected.delete(change.id);
        }
        return { nodeIds: [...selected], edgeIds: current.edgeIds };
      });
    }
    if (!editableRef.current || pointerDraggingRef.current) return;
    const positionChange = changes.find(
      (change): change is Extract<NodeChange<EquipmentFlowNode>, { type: "position" }> => (
        change.type === "position" && Boolean(change.position)
      ),
    );
    if (!positionChange?.position) return;
    const flowNode = nodesRef.current.find(({ id }) => id === positionChange.id);
    const command = createPidMoveCommand(
      documentRef.current,
      positionChange.id,
      positionChange.position,
      selectionRef.current.nodeIds,
      flowNode?.data.geometry,
    );
    if (command) onCommandRef.current(command);
  }, [commitSelection, setNodes]);
  const handleEdgesChange = useCallback((changes: EdgeChange<ProcessFlowEdge>[]) => {
    onFlowEdgesChange(changes);
    if (changes.some((change) => change.type === "select" || change.type === "remove")) {
      commitSelection((current) => {
        const selected = new Set(current.edgeIds);
        for (const change of changes) {
          if (change.type === "select" && change.selected) selected.add(change.id);
          else if (change.type === "select" || change.type === "remove") selected.delete(change.id);
        }
        return { nodeIds: current.nodeIds, edgeIds: [...selected] };
      });
    }
  }, [commitSelection, onFlowEdgesChange]);

  const normalizeConnection = useCallback(
    (connection: ProcessFlowEdge | Connection) => normalizePidConnection(document, connection),
    [document],
  );
  const isValidConnection = useCallback((connection: ProcessFlowEdge | Connection) => {
    const normalized = normalizeConnection(connection);
    return normalized !== null && connectionValidation.isValid(normalized.sourcePortId, normalized.targetPortId);
  }, [connectionValidation, normalizeConnection]);
  const handleConnect = useCallback((connection: Connection) => {
    if (!editable) return;
    const command = pidConnectionCommand(document, connection, connectionValidation.index);
    if (command) onCommand(command);
  }, [connectionValidation.index, document, editable, onCommand]);
  const handleDragStart = useCallback((_event: MouseEvent | TouchEvent, node: EquipmentFlowNode, movedNodes: EquipmentFlowNode[]) => {
    pointerDraggingRef.current = true;
    draggingNodeIdsRef.current = new Set((movedNodes.length > 0 ? movedNodes : [node]).map(({ id }) => id));
  }, []);
  const handleDragStop = useCallback((_event: MouseEvent | TouchEvent, node: EquipmentFlowNode, movedNodes: EquipmentFlowNode[]) => {
    pointerDraggingRef.current = false;
    draggingNodeIdsRef.current = new Set();
    if (!editable) return;
    const selectedIds = movedNodes.map(({ id }) => id).filter((id) => document.nodes[id]);
    const command = createPidMoveCommand(document, node.id, node.position, selectedIds, node.data.geometry);
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
      data-keyboard-source-port={keyboardSourcePortId ?? ""}
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
        onNodeDragStart={handleDragStart}
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
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {connectionAnnouncement}
      </div>
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

export function isPidConnectionValid(
  document: PidDocument,
  sourcePortId: string,
  targetPortId: string,
  index?: PidGraphIndex,
): boolean {
  return getPortConnectionRejection(document, sourcePortId, targetPortId, index) === null;
}

export function pidConnectionCommand(
  document: PidDocument,
  connection: { readonly sourceHandle?: string | null; readonly targetHandle?: string | null },
  index?: PidGraphIndex,
): Extract<PidCommand, { type: "ports.connect" }> | null {
  const normalized = normalizePidConnection(document, connection);
  if (!normalized || !isPidConnectionValid(document, normalized.sourcePortId, normalized.targetPortId, index)) return null;
  return { type: "ports.connect", ...normalized };
}

export function createPidMoveCommand(
  document: PidDocument,
  draggedNodeId: string,
  position: { readonly x: number; readonly y: number },
  selectedNodeIds: readonly string[],
  geometry?: PidNodeFlowGeometry,
): Extract<PidCommand, { type: "selection.move" }> | null {
  const canonical = document.nodes[draggedNodeId];
  if (!canonical) return null;
  const canonicalPosition = geometry ? canonicalPositionFromFlow(canonical, geometry, position) : position;
  const delta = { x: canonicalPosition.x - canonical.x, y: canonicalPosition.y - canonical.y };
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

function reconcileNodes(
  current: EquipmentFlowNode[],
  canonical: EquipmentFlowNode[],
  transientNodeIds?: ReadonlySet<string>,
): EquipmentFlowNode[] {
  const currentById = new Map(current.map((node) => [node.id, node]));
  let changed = current.length !== canonical.length;
  const next = canonical.map((node) => {
    const existing = currentById.get(node.id);
    if (!existing) { changed = true; return node; }
    const preserveTransientPosition = transientNodeIds?.has(node.id) === true;
    if (existing.data === node.data
      && (preserveTransientPosition
        || (existing.position.x === node.position.x && existing.position.y === node.position.y))
      && existing.width === node.width
      && existing.height === node.height
      && existing.draggable === node.draggable
      && existing.connectable === node.connectable) return existing;
    changed = true;
    return {
      ...node,
      position: preserveTransientPosition ? existing.position : node.position,
      selected: existing.selected,
      domAttributes: { ...node.domAttributes, "aria-pressed": Boolean(existing.selected) },
    };
  });
  return changed ? next : current;
}

function reconcileEdges(current: ProcessFlowEdge[], canonical: ProcessFlowEdge[]): ProcessFlowEdge[] {
  const currentById = new Map(current.map((edge) => [edge.id, edge]));
  let changed = current.length !== canonical.length;
  const next = canonical.map((edge) => {
    const existing = currentById.get(edge.id);
    if (!existing) { changed = true; return edge; }
    if (existing.data === edge.data
      && existing.source === edge.source
      && existing.target === edge.target
      && existing.deletable === edge.deletable) return existing;
    changed = true;
    return { ...edge, selected: existing.selected };
  });
  return changed ? next : current;
}
