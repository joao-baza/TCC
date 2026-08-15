import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  Background,
  applyNodeChanges,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  ViewportPortal,
  useReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type EdgeTypes,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { CatalogIndex } from "../catalog/catalog-index";
import type { CatalogSymbol } from "../catalog/catalog-symbol";
import { deleteSelection, moveSelection, patchElement, type PidCommand } from "../domain/commands";
import {
  annotationColorsFromProperties,
  annotationTextAlignFromProperties,
  annotationTextVerticalAlignFromProperties,
  type AnnotationTextVerticalAlign,
} from "../domain/annotation-style";
import type { PidAnnotation, PidDocument } from "../domain/model";
import type { ConnectionClass } from "../domain/model";
import { createPortConnectionValidation, getPortConnectionRejection, type PidGraphIndex, uniqueIds } from "../domain/graph-operations";
import { EquipmentNode, type EquipmentFlowNode } from "./equipment-node";
import { applyPidCanvasSelection, projectPidCanvasDocument, type PidFlowProjection } from "./flow-projection";
import type { PidCanvasInteractionGeometry } from "./port-hit-target";
import { ProcessEdge, type ProcessFlowEdge } from "./process-edge";

const nodeTypes = { equipment: EquipmentNode } satisfies NodeTypes;
const edgeTypes = { process: ProcessEdge } satisfies EdgeTypes;

export interface PidCanvasSelection {
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
  readonly annotationIds?: readonly string[];
}

interface PidCanvasBaseProps {
  readonly document: PidDocument;
  readonly catalog: CatalogIndex | readonly CatalogSymbol[];
  readonly editable: boolean;
  readonly onCommand: (command: PidCommand) => void;
  readonly className?: string;
  readonly activeConnectionClass?: ConnectionClass;
  readonly viewportAction?: PidCanvasViewportAction;
  readonly onViewportChange?: (viewport: Viewport) => void;
}

export interface PidCanvasViewportAction {
  readonly type: "fit" | "zoom-in" | "zoom-out";
  readonly nonce: number;
}

type ControlledSelectionProps = {
  readonly selection: PidCanvasSelection;
  readonly onSelectionChange: (selection: PidCanvasSelection) => void;
  readonly defaultSelection?: never;
};

type UncontrolledSelectionProps = {
  readonly selection?: never;
  readonly defaultSelection?: PidCanvasSelection;
  readonly onSelectionChange?: (selection: PidCanvasSelection) => void;
};

export type PidCanvasProps = PidCanvasBaseProps & (ControlledSelectionProps | UncontrolledSelectionProps);

interface AnnotationDragState {
  readonly ids: readonly string[];
  readonly startClient: { readonly x: number; readonly y: number };
  readonly viewportZoom: number;
}

interface AnnotationDragPreview {
  readonly ids: readonly string[];
  readonly delta: { readonly x: number; readonly y: number };
}

type AnnotationResizeDirection = "nw" | "ne" | "se" | "sw";
type AnnotationTransformDraft = Pick<PidAnnotation, "x" | "y" | "width" | "height">;

interface AnnotationResizeState {
  readonly id: string;
  readonly direction: AnnotationResizeDirection;
  readonly startClient: { readonly x: number; readonly y: number };
  readonly start: AnnotationTransformDraft;
  readonly viewportZoom: number;
}

interface AnnotationResizePreview {
  readonly id: string;
  readonly draft: AnnotationTransformDraft;
}

const EMPTY_SELECTION: PidCanvasSelection = { nodeIds: [], edgeIds: [] };
const EDITABLE_ARIA_LABELS = {
  "node.a11yDescription.default": "Pressione Enter ou Espaço para selecionar. Use as setas para mover e Delete para excluir. Escape cancela.",
  "node.a11yDescription.keyboardDisabled": "Pressione Enter ou Espaço para selecionar. Use as setas para mover e Delete para excluir. Escape cancela.",
  "edge.a11yDescription.default": "Pressione Enter ou Espaço para selecionar a conexão. Use Delete para excluir e Escape para cancelar.",
} as const;
const READONLY_ARIA_LABELS = {
  "node.a11yDescription.default": "Pressione Enter ou Espaço para selecionar um equipamento. Escape cancela a seleção.",
  "node.a11yDescription.keyboardDisabled": "Pressione Enter ou Espaço para selecionar um equipamento. Escape cancela a seleção.",
  "edge.a11yDescription.default": "Pressione Enter ou Espaço para selecionar uma conexão. Escape cancela a seleção.",
} as const;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MIN_ANNOTATION_WIDTH = 48;
const MIN_ANNOTATION_HEIGHT = 32;

export function pidCanvasViewportDuration(
  type: PidCanvasViewportAction["type"],
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  return type === "fit" ? 200 : 150;
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
  defaultSelection,
  className,
  activeConnectionClass,
  viewportAction,
  onViewportChange,
}: PidCanvasProps) {
  const flow = useReactFlow();
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const isControlled = controlledSelection !== undefined;
  const initialSelection = controlledSelection ?? defaultSelection ?? EMPTY_SELECTION;
  const [selection, setSelection] = useState<PidCanvasSelection>(initialSelection);
  const selectionRef = useRef(initialSelection);
  const pendingControlledSelectionRef = useRef(initialSelection);
  const notifiedSelectionRef = useRef(initialSelection);
  const documentRef = useRef(document);
  const onCommandRef = useRef(onCommand);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const isControlledRef = useRef(isControlled);
  const editableRef = useRef(editable);
  const activeConnectionClassRef = useRef(activeConnectionClass);
  const additiveSelectionIntentRef = useRef(false);
  const pointerDraggingRef = useRef(false);
  const draggingNodeIdsRef = useRef<ReadonlySet<string>>(new Set());
  const annotationDragRef = useRef<AnnotationDragState | null>(null);
  const annotationDraggedRef = useRef(false);
  const [annotationDragPreview, setAnnotationDragPreview] = useState<AnnotationDragPreview | null>(null);
  const annotationResizeRef = useRef<AnnotationResizeState | null>(null);
  const [annotationResizePreview, setAnnotationResizePreview] = useState<AnnotationResizePreview | null>(null);
  const [keyboardSourcePortId, setKeyboardSourcePortId] = useState<string | null>(null);
  const keyboardSourcePortRef = useRef<string | null>(null);
  const [connectionAnnouncement, setConnectionAnnouncement] = useState("");
  const [canvasViewport, setCanvasViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  documentRef.current = document;
  onCommandRef.current = onCommand;
  onSelectionChangeRef.current = onSelectionChange;
  isControlledRef.current = isControlled;
  editableRef.current = editable;
  activeConnectionClassRef.current = activeConnectionClass;
  const connectionValidation = useMemo(() => createPortConnectionValidation(document), [document]);
  const connectionValidationRef = useRef(connectionValidation);
  connectionValidationRef.current = connectionValidation;
  const symbols = useMemo(() => resolveCatalog(catalog, document), [catalog, document.metadata.standard]);
  const updateKeyboardSourcePort = useCallback((portId: string | null) => {
    keyboardSourcePortRef.current = portId;
    setKeyboardSourcePortId(portId);
  }, []);
  useEffect(() => {
    const sourcePortId = keyboardSourcePortRef.current;
    if (sourcePortId && (!editable || !document.ports[sourcePortId])) {
      updateKeyboardSourcePort(null);
      setConnectionAnnouncement("Conexão por teclado cancelada.");
    }
  }, [document.ports, editable, updateKeyboardSourcePort]);
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
      setConnectionAnnouncement(`Conexão inválida: ${rejection?.message ?? "as portas não correspondem ao tipo de linha ativo."}`);
      return;
    }
    onCommandRef.current({
      type: "ports.connect",
      ...normalized,
      ...(activeConnectionClassRef.current ? { connectionClass: activeConnectionClassRef.current } : {}),
    });
    updateKeyboardSourcePort(null);
    setConnectionAnnouncement("Conexão criada com sucesso.");
  }, [updateKeyboardSourcePort]);
  const handleElementPatch = useCallback((id: string, patch: Record<string, unknown>) => {
    if (!editableRef.current) return;
    onCommandRef.current(patchElement(id, patch));
  }, []);
  const projection = useMemo(
    () => projectPidCanvasDocument(document, symbols, editable, handlePortKey, handleElementPatch),
    [document, editable, handleElementPatch, handlePortKey, symbols],
  );
  const initialProjectionRef = useRef<PidFlowProjection | null>(null);
  if (!initialProjectionRef.current) initialProjectionRef.current = applyPidCanvasSelection(projection, initialSelection);
  const [nodes, setNodes] = useNodesState<EquipmentFlowNode>(initialProjectionRef.current.nodes);
  const [edges, setEdges, onFlowEdgesChange] = useEdgesState<ProcessFlowEdge>(initialProjectionRef.current.edges);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const commitSelection = useCallback((update: (current: PidCanvasSelection) => PidCanvasSelection) => {
    const current = isControlledRef.current ? pendingControlledSelectionRef.current : selectionRef.current;
    const next = update(current);
    if (sameSelection(current, next)) return;
    if (isControlledRef.current) {
      pendingControlledSelectionRef.current = next;
      onSelectionChangeRef.current?.(next);
      return;
    }
    selectionRef.current = next;
    setSelection(next);
  }, []);
  useEffect(() => {
    if (isControlled) return;
    if (sameSelection(notifiedSelectionRef.current, selection)) return;
    notifiedSelectionRef.current = selection;
    onSelectionChange?.(selection);
  }, [isControlled, onSelectionChange, selection]);
  useEffect(() => {
    if (!controlledSelection) return;
    pendingControlledSelectionRef.current = controlledSelection;
    if (sameSelection(selectionRef.current, controlledSelection)) return;
    selectionRef.current = controlledSelection;
    notifiedSelectionRef.current = controlledSelection;
    setSelection(controlledSelection);
  }, [controlledSelection]);
  useEffect(() => {
    commitSelection((current) => ({
      nodeIds: current.nodeIds.filter((id) => Boolean(document.nodes[id])),
      edgeIds: current.edgeIds.filter((id) => Boolean(document.edges[id])),
      ...selectionAnnotations(current.annotationIds?.filter((id) => Boolean(document.annotations[id])) ?? []),
    }));
  }, [commitSelection, document.annotations, document.edges, document.nodes]);
  useEffect(() => {
    const selectedProjection = applyPidCanvasSelection(projection, selectionRef.current);
    const transientNodeIds = pointerDraggingRef.current ? draggingNodeIdsRef.current : undefined;
    setNodes((current) => reconcileNodes(current, selectedProjection.nodes, transientNodeIds));
    setEdges((current) => reconcileEdges(current, selectedProjection.edges));
  }, [projection, setEdges, setNodes]);
  useEffect(() => {
    const selectedNodes = new Set(selection.nodeIds);
    const selectedEdges = new Set(selection.edgeIds);
    setNodes((current) => applyNodeSelection(current, selectedNodes));
    setEdges((current) => applyEdgeSelection(current, selectedEdges));
  }, [selection, setEdges, setNodes]);
  const handleNodesChange = useCallback((changes: NodeChange<EquipmentFlowNode>[]) => {
    if (changes.some((change) => change.type === "select" || change.type === "remove")) {
      commitSelection((current) => {
        const selected = new Set(current.nodeIds);
        for (const change of changes) {
          if (change.type === "select" && change.selected) selected.add(change.id);
          else if (change.type === "select" || change.type === "remove") selected.delete(change.id);
        }
        const preserveAnnotations = additiveSelectionIntentRef.current
          || !changes.some((change) => change.type === "select" && change.selected);
        return {
          nodeIds: [...selected], edgeIds: current.edgeIds,
          ...selectionAnnotations(preserveAnnotations ? current.annotationIds ?? [] : []),
        };
      });
    }
    const selectionNormalizedChanges = isControlledRef.current
      ? changes.map((change) => change.type === "select"
        ? { ...change, selected: selectionRef.current.nodeIds.includes(change.id) }
        : change)
      : changes;
    if (!editableRef.current) {
      const inertChanges = selectionNormalizedChanges.filter((change) => (
        change.type !== "position" && change.type !== "remove"
      ));
      setNodes((current) => applyNodeChanges(inertChanges, current));
      return;
    }
    if (pointerDraggingRef.current) {
      setNodes((current) => applyNodeChanges(selectionNormalizedChanges, current));
      return;
    }
    const positionChange = selectionNormalizedChanges.find(
      (change): change is Extract<NodeChange<EquipmentFlowNode>, { type: "position" }> => (
        change.type === "position" && Boolean(change.position)
      ),
    );
    if (!positionChange?.position) {
      setNodes((current) => applyNodeChanges(selectionNormalizedChanges, current));
      return;
    }
    const flowNode = nodesRef.current.find(({ id }) => id === positionChange.id);
    const command = createPidMoveCommand(
      documentRef.current,
      positionChange.id,
      positionChange.position,
      selectionRef.current.nodeIds,
      flowNode?.data.interactionGeometry,
    );
    if (!command) {
      setNodes((current) => applyNodeChanges(selectionNormalizedChanges, current));
      return;
    }
    const movingIds = new Set(command.ids);
    const nonSelectedPositionChanges = selectionNormalizedChanges.filter(
      (change) => change.type !== "position" || !movingIds.has(change.id),
    );
    const normalizedPositionChanges: NodeChange<EquipmentFlowNode>[] = command.ids.flatMap((id) => {
      const current = nodesRef.current.find((node) => node.id === id);
      return current ? [{
        id,
        type: "position" as const,
        position: { x: current.position.x + command.delta.x, y: current.position.y + command.delta.y },
      }] : [];
    });
    setNodes((current) => applyNodeChanges([...nonSelectedPositionChanges, ...normalizedPositionChanges], current));
    onCommandRef.current(command);
  }, [commitSelection, setNodes]);
  const handleEdgesChange = useCallback((changes: EdgeChange<ProcessFlowEdge>[]) => {
    if (changes.some((change) => change.type === "select" || change.type === "remove")) {
      commitSelection((current) => {
        const selected = new Set(current.edgeIds);
        for (const change of changes) {
          if (change.type === "select" && change.selected) selected.add(change.id);
          else if (change.type === "select" || change.type === "remove") selected.delete(change.id);
        }
        const preserveAnnotations = additiveSelectionIntentRef.current
          || !changes.some((change) => change.type === "select" && change.selected);
        return {
          nodeIds: current.nodeIds, edgeIds: [...selected],
          ...selectionAnnotations(preserveAnnotations ? current.annotationIds ?? [] : []),
        };
      });
    }
    const normalized = isControlledRef.current
      ? changes.map((change) => change.type === "select"
        ? { ...change, selected: selectionRef.current.edgeIds.includes(change.id) }
        : change)
      : changes;
    onFlowEdgesChange(normalized);
  }, [commitSelection, onFlowEdgesChange]);

  const normalizeConnection = useCallback(
    (connection: ProcessFlowEdge | Connection) => normalizePidConnection(document, connection),
    [document],
  );
  const isValidConnection = useCallback((connection: ProcessFlowEdge | Connection) => {
    const normalized = normalizeConnection(connection);
    return normalized !== null
      && connectionValidation.isValid(normalized.sourcePortId, normalized.targetPortId);
  }, [connectionValidation, normalizeConnection]);
  const handleConnect = useCallback((connection: Connection) => {
    if (!editable) return;
    const command = pidConnectionCommand(document, connection, connectionValidation.index);
    if (command) onCommand({
      ...command,
      ...(activeConnectionClass ? { connectionClass: activeConnectionClass } : {}),
    });
  }, [activeConnectionClass, connectionValidation.index, document, editable, onCommand]);
  const handleDragStart = useCallback((_event: MouseEvent | TouchEvent, node: EquipmentFlowNode, movedNodes: EquipmentFlowNode[]) => {
    pointerDraggingRef.current = true;
    draggingNodeIdsRef.current = new Set((movedNodes.length > 0 ? movedNodes : [node]).map(({ id }) => id));
  }, []);
  const handleDragStop = useCallback((_event: MouseEvent | TouchEvent, node: EquipmentFlowNode, movedNodes: EquipmentFlowNode[]) => {
    pointerDraggingRef.current = false;
    draggingNodeIdsRef.current = new Set();
    if (!editable) return;
    const selectedIds = movedNodes.map(({ id }) => id).filter((id) => document.nodes[id]);
    const command = createPidMoveCommand(document, node.id, node.position, selectedIds, node.data.interactionGeometry);
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
  const handleAnnotationClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>, annotationId: string) => {
    event.stopPropagation();
    if (annotationDraggedRef.current) {
      annotationDraggedRef.current = false;
      event.preventDefault();
      return;
    }
    commitSelection((current) => {
      const selected = new Set(current.annotationIds ?? []);
      if (event.ctrlKey || event.metaKey) {
        if (selected.has(annotationId)) selected.delete(annotationId); else selected.add(annotationId);
        return { nodeIds: current.nodeIds, edgeIds: current.edgeIds, ...selectionAnnotations([...selected]) };
      }
      return { nodeIds: [], edgeIds: [], annotationIds: [annotationId] };
    });
  }, [commitSelection]);
  const handleAnnotationPointerMove = useCallback((event: PointerEvent) => {
    const drag = annotationDragRef.current;
    if (!drag) return;
    const zoom = drag.viewportZoom || 1;
    const delta = {
      x: (event.clientX - drag.startClient.x) / zoom,
      y: (event.clientY - drag.startClient.y) / zoom,
    };
    if (delta.x !== 0 || delta.y !== 0) annotationDraggedRef.current = true;
    setAnnotationDragPreview({ ids: drag.ids, delta });
  }, []);
  const handleAnnotationPointerEnd = useCallback((event: PointerEvent) => {
    const drag = annotationDragRef.current;
    if (!drag) return;
    annotationDragRef.current = null;
    window.removeEventListener("pointermove", handleAnnotationPointerMove);
    window.removeEventListener("pointerup", handleAnnotationPointerEnd);
    window.removeEventListener("pointercancel", handleAnnotationPointerEnd);
    const zoom = drag.viewportZoom || 1;
    const delta = {
      x: (event.clientX - drag.startClient.x) / zoom,
      y: (event.clientY - drag.startClient.y) / zoom,
    };
    setAnnotationDragPreview(null);
    if (delta.x === 0 && delta.y === 0) return;
    annotationDraggedRef.current = true;
    onCommandRef.current(moveSelection([...drag.ids], delta));
  }, [handleAnnotationPointerMove]);
  const handleAnnotationPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, annotationId: string) => {
    if (!editableRef.current || event.button !== 0) return;
    event.stopPropagation();
    const selectedAnnotations = selectionRef.current.annotationIds ?? [];
    const isSelected = selectedAnnotations.includes(annotationId);
    const ids = isSelected
      ? selectedAnnotations
      : event.ctrlKey || event.metaKey
        ? uniqueIds([...selectedAnnotations, annotationId])
        : [annotationId];
    if (!isSelected) {
      commitSelection((current) => event.ctrlKey || event.metaKey
        ? {
          nodeIds: current.nodeIds,
          edgeIds: current.edgeIds,
          annotationIds: uniqueIds([...(current.annotationIds ?? []), annotationId]),
        }
        : { nodeIds: [], edgeIds: [], annotationIds: [annotationId] });
    }
    annotationDragRef.current = {
      ids,
      startClient: { x: event.clientX, y: event.clientY },
      viewportZoom: canvasViewport.zoom,
    };
    annotationDraggedRef.current = false;
    window.addEventListener("pointermove", handleAnnotationPointerMove);
    window.addEventListener("pointerup", handleAnnotationPointerEnd);
    window.addEventListener("pointercancel", handleAnnotationPointerEnd);
  }, [canvasViewport.zoom, commitSelection, handleAnnotationPointerEnd, handleAnnotationPointerMove]);
  const handleAnnotationResizePointerMove = useCallback((event: PointerEvent) => {
    const resize = annotationResizeRef.current;
    if (!resize) return;
    const zoom = resize.viewportZoom || 1;
    const delta = {
      x: (event.clientX - resize.startClient.x) / zoom,
      y: (event.clientY - resize.startClient.y) / zoom,
    };
    const draft = resizeAnnotationTransform(resize.start, resize.direction, delta.x, delta.y);
    if (draft.width !== resize.start.width || draft.height !== resize.start.height || draft.x !== resize.start.x || draft.y !== resize.start.y) {
      annotationDraggedRef.current = true;
    }
    setAnnotationResizePreview({ id: resize.id, draft });
  }, []);
  const handleAnnotationResizePointerEnd = useCallback((event: PointerEvent) => {
    const resize = annotationResizeRef.current;
    if (!resize) return;
    annotationResizeRef.current = null;
    window.removeEventListener("pointermove", handleAnnotationResizePointerMove);
    window.removeEventListener("pointerup", handleAnnotationResizePointerEnd);
    window.removeEventListener("pointercancel", handleAnnotationResizePointerEnd);
    const zoom = resize.viewportZoom || 1;
    const draft = resizeAnnotationTransform(resize.start, resize.direction, (event.clientX - resize.startClient.x) / zoom, (event.clientY - resize.startClient.y) / zoom);
    setAnnotationResizePreview(null);
    const patch = diffAnnotationTransform(resize.start, draft);
    if (Object.keys(patch).length === 0) return;
    annotationDraggedRef.current = true;
    onCommandRef.current(patchElement(resize.id, patch));
  }, [handleAnnotationResizePointerMove]);
  const handleAnnotationResizePointerDown = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    annotationId: string,
    direction: AnnotationResizeDirection,
    start: AnnotationTransformDraft,
  ) => {
    if (!editableRef.current || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    annotationResizeRef.current = {
      id: annotationId,
      direction,
      startClient: { x: event.clientX, y: event.clientY },
      start,
      viewportZoom: canvasViewport.zoom,
    };
    annotationDraggedRef.current = false;
    window.addEventListener("pointermove", handleAnnotationResizePointerMove);
    window.addEventListener("pointerup", handleAnnotationResizePointerEnd);
    window.addEventListener("pointercancel", handleAnnotationResizePointerEnd);
  }, [canvasViewport.zoom, handleAnnotationResizePointerEnd, handleAnnotationResizePointerMove]);
  const handleAnnotationKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, annotationId: string) => {
    if (!editableRef.current || (event.key !== "Delete" && event.key !== "Backspace")) return;
    event.preventDefault(); event.stopPropagation();
    onCommandRef.current(deleteSelection([annotationId]));
  }, []);
  useEffect(() => () => {
    window.removeEventListener("pointermove", handleAnnotationPointerMove);
    window.removeEventListener("pointerup", handleAnnotationPointerEnd);
    window.removeEventListener("pointercancel", handleAnnotationPointerEnd);
    window.removeEventListener("pointermove", handleAnnotationResizePointerMove);
    window.removeEventListener("pointerup", handleAnnotationResizePointerEnd);
    window.removeEventListener("pointercancel", handleAnnotationResizePointerEnd);
  }, [handleAnnotationPointerEnd, handleAnnotationPointerMove, handleAnnotationResizePointerEnd, handleAnnotationResizePointerMove]);
  useEffect(() => {
    if (!viewportAction) return;
    const duration = pidCanvasViewportDuration(viewportAction.type, reducedMotionRef.current);
    if (viewportAction.type === "fit") void flow.fitView({ duration });
    else if (viewportAction.type === "zoom-in") void flow.zoomIn({ duration });
    else void flow.zoomOut({ duration });
  }, [flow, viewportAction]);

  return (
    <div
      data-testid="pid-canvas"
      data-editable={String(editable)}
      data-canvas-mode={editable ? "editing" : "readonly"}
      data-keyboard-source-port={keyboardSourcePortId ?? ""}
      data-viewport-animation-duration={viewportAction
        ? pidCanvasViewportDuration(viewportAction.type, reducedMotion)
        : undefined}
      className={`pid-canvas-flow relative h-[640px] min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-200 ${className ?? ""}`}
      style={{ height: "640px" }}
      onPointerDownCapture={(event) => { additiveSelectionIntentRef.current = event.ctrlKey || event.metaKey; }}
      onClickCapture={(event) => { additiveSelectionIntentRef.current = event.ctrlKey || event.metaKey; }}
      onKeyDownCapture={(event) => { additiveSelectionIntentRef.current = event.ctrlKey || event.metaKey; }}
    >
      <ReactFlow<EquipmentFlowNode, ProcessFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[1, 1]}
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
        ariaLabelConfig={editable ? EDITABLE_ARIA_LABELS : READONLY_ARIA_LABELS}
        deleteKeyCode={editable ? ["Backspace", "Delete"] : null}
        isValidConnection={isValidConnection}
        onConnect={handleConnect}
        onNodeDragStart={handleDragStart}
        onNodeDragStop={handleDragStop}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onMove={(_event, nextViewport) => setCanvasViewport(nextViewport)}
        onMoveEnd={(_event, nextViewport) => { setCanvasViewport(nextViewport); onViewportChange?.(nextViewport); }}
        onDelete={handleDelete}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--pid-canvas-grid)" gap={16} size={1} />
        <ViewportPortal>
          <div className="pid-canvas-annotations" aria-label="Anotações do diagrama">
            {Object.values(document.annotations).map((annotation) => {
              const selected = selectionRef.current.annotationIds?.includes(annotation.id) === true;
              const colors = annotationColorsFromProperties(annotation.properties);
              const textAlign = annotationTextAlignFromProperties(annotation.properties);
              const textVerticalAlign = annotationTextVerticalAlignFromProperties(annotation.properties);
              const resizeDraft = annotationResizePreview?.id === annotation.id ? annotationResizePreview.draft : annotation;
              const dragDelta = annotationDragPreview?.ids.includes(annotation.id) === true
                ? annotationDragPreview.delta
                : { x: 0, y: 0 };
              return <button
                key={annotation.id}
                type="button"
                aria-label={`Anotação: ${annotation.text}`}
                aria-pressed={selected}
                className="pid-canvas-annotation nodrag nopan"
                style={{
                  left: resizeDraft.x + dragDelta.x,
                  top: resizeDraft.y + dragDelta.y,
                  width: resizeDraft.width,
                  height: resizeDraft.height,
                  color: colors.textColor,
                  backgroundColor: colors.fillColor,
                  textAlign,
                  justifyContent: annotationTextVerticalAlignToJustifyContent(textVerticalAlign),
                  transform: `rotate(${annotation.rotation}deg)`,
                }}
                onPointerDown={(event) => handleAnnotationPointerDown(event, annotation.id)}
                onClick={(event) => handleAnnotationClick(event, annotation.id)}
                onKeyDown={(event) => handleAnnotationKeyDown(event, annotation.id)}
              >
                <span className="pid-canvas-annotation__text">{annotation.text}</span>
                {editable && selected && (["nw", "ne", "se", "sw"] as const).map((direction) => (
                  <span
                    key={direction}
                    aria-hidden="true"
                    data-testid={`annotation-resize-${direction}-${annotation.id}`}
                    className={`nodrag nopan absolute size-3 rounded-sm border border-blue-700 bg-white shadow-sm ${annotationResizeCursor(direction)}`}
                    style={annotationResizeHandleStyle(direction)}
                    onPointerDown={(event) => handleAnnotationResizePointerDown(event, annotation.id, direction, resizeDraft)}
                  />
                ))}
              </button>;
            })}
          </div>
        </ViewportPortal>
        <MiniMap pannable zoomable ariaLabel="Minimapa do diagrama P&ID" />
      </ReactFlow>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {connectionAnnouncement}
      </div>
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
}

function subscribeReducedMotion(notify: () => void): () => void {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  }
  media.addListener(notify);
  return () => media.removeListener(notify);
}

function readReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
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
  interactionGeometry?: PidCanvasInteractionGeometry,
): Extract<PidCommand, { type: "selection.move" }> | null {
  const canonical = document.nodes[draggedNodeId];
  if (!canonical) return null;
  const canonicalPosition = interactionGeometry ? {
    x: position.x - (interactionGeometry.bounds.x - canonical.x),
    y: position.y - (interactionGeometry.bounds.y - canonical.y),
  } : position;
  const delta = { x: canonicalPosition.x - canonical.x, y: canonicalPosition.y - canonical.y };
  if (delta.x === 0 && delta.y === 0) return null;
  const selected = uniqueIds(selectedNodeIds.filter((id) => document.nodes[id]));
  const ids = selected.includes(draggedNodeId) ? selected : [draggedNodeId];
  return { type: "selection.move", ids, delta };
}

function resizeAnnotationTransform(
  start: AnnotationTransformDraft,
  direction: AnnotationResizeDirection,
  deltaX: number,
  deltaY: number,
): AnnotationTransformDraft {
  let { x, y, width, height } = start;
  if (direction.includes("e")) width = start.width + deltaX;
  if (direction.includes("s")) height = start.height + deltaY;
  if (direction.includes("w")) {
    width = start.width - deltaX;
    x = start.x + deltaX;
  }
  if (direction.includes("n")) {
    height = start.height - deltaY;
    y = start.y + deltaY;
  }
  if (width < MIN_ANNOTATION_WIDTH) {
    if (direction.includes("w")) x = start.x + start.width - MIN_ANNOTATION_WIDTH;
    width = MIN_ANNOTATION_WIDTH;
  }
  if (height < MIN_ANNOTATION_HEIGHT) {
    if (direction.includes("n")) y = start.y + start.height - MIN_ANNOTATION_HEIGHT;
    height = MIN_ANNOTATION_HEIGHT;
  }
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function diffAnnotationTransform(
  start: AnnotationTransformDraft,
  draft: AnnotationTransformDraft,
): Record<string, number> {
  const patch: Record<string, number> = {};
  if (start.x !== draft.x) patch.x = draft.x;
  if (start.y !== draft.y) patch.y = draft.y;
  if (start.width !== draft.width) patch.width = draft.width;
  if (start.height !== draft.height) patch.height = draft.height;
  return patch;
}

function annotationResizeCursor(direction: AnnotationResizeDirection): string {
  return direction === "nw" || direction === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize";
}

function annotationResizeHandleStyle(direction: AnnotationResizeDirection): CSSProperties {
  return {
    left: direction.includes("w") ? 3 : undefined,
    right: direction.includes("e") ? 3 : undefined,
    top: direction.includes("n") ? 3 : undefined,
    bottom: direction.includes("s") ? 3 : undefined,
  };
}

function annotationTextVerticalAlignToJustifyContent(
  alignment: AnnotationTextVerticalAlign,
): CSSProperties["justifyContent"] {
  if (alignment === "middle") return "center";
  if (alignment === "bottom") return "flex-end";
  return "flex-start";
}

function sameSelection(left: PidCanvasSelection, right: PidCanvasSelection): boolean {
  return left.nodeIds.length === right.nodeIds.length
    && left.edgeIds.length === right.edgeIds.length
    && (left.annotationIds?.length ?? 0) === (right.annotationIds?.length ?? 0)
    && left.nodeIds.every((id, index) => id === right.nodeIds[index])
    && left.edgeIds.every((id, index) => id === right.edgeIds[index])
    && (left.annotationIds ?? []).every((id, index) => id === right.annotationIds?.[index]);
}

function selectionAnnotations(annotationIds: readonly string[]): { annotationIds?: readonly string[] } {
  return annotationIds.length > 0 ? { annotationIds: [...annotationIds] } : {};
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

function applyNodeSelection(
  current: EquipmentFlowNode[],
  selectedNodeIds: ReadonlySet<string>,
): EquipmentFlowNode[] {
  let changed = false;
  const next = current.map((node) => {
    const selected = selectedNodeIds.has(node.id);
    if (node.selected === selected && node.domAttributes?.["aria-pressed"] === selected) return node;
    changed = true;
    return { ...node, selected, domAttributes: { ...node.domAttributes, "aria-pressed": selected } };
  });
  return changed ? next : current;
}

function applyEdgeSelection(
  current: ProcessFlowEdge[],
  selectedEdgeIds: ReadonlySet<string>,
): ProcessFlowEdge[] {
  let changed = false;
  const next = current.map((edge) => {
    const selected = selectedEdgeIds.has(edge.id);
    if (edge.selected === selected) return edge;
    changed = true;
    return { ...edge, selected };
  });
  return changed ? next : current;
}
