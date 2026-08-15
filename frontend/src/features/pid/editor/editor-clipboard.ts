import { toTrustedCanonicalDocument } from "../domain/invariants";
import type {
  PidAnnotation,
  PidDocument,
  PidEdge,
  PidGroup,
  PidNode,
  PidPort,
  Point,
} from "../domain/model";

export interface EditorClipboardFragment {
  readonly standard: PidDocument["metadata"]["standard"];
  readonly catalogVersion: string;
  readonly nodes: Readonly<Record<string, Readonly<PidNode>>>;
  readonly ports: Readonly<Record<string, Readonly<PidPort>>>;
  readonly edges: Readonly<Record<string, Readonly<PidEdge>>>;
  readonly annotations: Readonly<Record<string, Readonly<PidAnnotation>>>;
  readonly groups: Readonly<Record<string, Readonly<PidGroup>>>;
}

export interface PasteEditorFragmentOptions {
  readonly generateId?: () => string;
  readonly offset: Point;
}

export interface PastedEditorFragment {
  readonly document: PidDocument;
  readonly selection: readonly string[];
}

export function copyEditorSelection(
  document: PidDocument,
  selection: readonly string[],
): EditorClipboardFragment {
  const selected = new Set(selection);
  const nodeIds = new Set(selection.filter((id) => Boolean(document.nodes[id])));
  for (const group of Object.values(document.groups)) {
    if (selected.has(group.id)) group.memberIds.forEach((id) => nodeIds.add(id));
  }
  const nodes = pick(document.nodes, (node) => nodeIds.has(node.id));
  const ports = pick(document.ports, (port) => nodeIds.has(port.nodeId));
  const portIds = new Set(Object.keys(ports));
  const edges = pick(document.edges, (edge) => (
    portIds.has(edge.sourcePortId) && portIds.has(edge.targetPortId)
  ));
  const edgeIds = new Set(Object.keys(edges));
  const groups = pick(document.groups, (group) => (
    group.memberIds.length > 0 && group.memberIds.every((id) => nodeIds.has(id))
  ));
  const annotations = pick(document.annotations, (annotation) => (
    selected.has(annotation.id)
    || (annotation.nodeId !== undefined && nodeIds.has(annotation.nodeId))
    || (annotation.edgeId !== undefined && edgeIds.has(annotation.edgeId))
  ));
  if (Object.keys(nodes).length === 0 && Object.keys(annotations).length === 0) {
    throw new Error("A seleção para copiar está vazia.");
  }
  return deepFreeze({
    standard: document.metadata.standard,
    catalogVersion: document.metadata.catalogVersion,
    nodes,
    ports,
    edges,
    annotations,
    groups,
  });
}

export function pasteEditorFragment(
  document: PidDocument,
  fragment: EditorClipboardFragment,
  options: PasteEditorFragmentOptions,
): PastedEditorFragment {
  if (fragment.standard !== document.metadata.standard
    || fragment.catalogVersion !== document.metadata.catalogVersion) {
    throw new Error("O fragmento não é compatível com a norma e o catálogo atuais.");
  }
  const generateId = options.generateId ?? defaultGenerateId;
  const occupied = new Set([
    ...Object.keys(document.nodes), ...Object.keys(document.ports), ...Object.keys(document.edges),
    ...Object.keys(document.annotations), ...Object.keys(document.groups),
  ]);
  const allocate = () => {
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const id = generateId();
      if (!occupied.has(id)) { occupied.add(id); return id; }
    }
    throw new Error("Não foi possível gerar um UUID fresco para colar o fragmento.");
  };
  const nodeMap = allocateMap(Object.keys(fragment.nodes), allocate);
  const portMap = allocateMap(Object.keys(fragment.ports), allocate);
  const edgeMap = allocateMap(Object.keys(fragment.edges), allocate);
  const groupMap = allocateMap(Object.keys(fragment.groups), allocate);
  const annotationMap = allocateMap(Object.keys(fragment.annotations), allocate);
  const nodes = { ...document.nodes };
  const ports = { ...document.ports };
  const edges = { ...document.edges };
  const groups = { ...document.groups };
  const annotations = { ...document.annotations };
  const { x, y } = options.offset;

  for (const node of Object.values(fragment.nodes)) {
    const id = nodeMap.get(node.id)!;
    nodes[id] = clone({ ...node, id, x: node.x + x, y: node.y + y });
  }
  for (const port of Object.values(fragment.ports)) {
    const id = portMap.get(port.id)!;
    const nodeId = nodeMap.get(port.nodeId);
    if (nodeId) ports[id] = clone({ ...port, id, nodeId });
  }
  for (const edge of Object.values(fragment.edges)) {
    const sourcePortId = portMap.get(edge.sourcePortId);
    const targetPortId = portMap.get(edge.targetPortId);
    if (!sourcePortId || !targetPortId) continue;
    const id = edgeMap.get(edge.id)!;
    edges[id] = clone({
      ...edge, id, sourcePortId, targetPortId,
      route: edge.route.map((point) => ({ x: point.x + x, y: point.y + y })),
    });
  }
  for (const group of Object.values(fragment.groups)) {
    const memberIds = group.memberIds.flatMap((id) => nodeMap.get(id) ?? []);
    if (memberIds.length !== group.memberIds.length) continue;
    const id = groupMap.get(group.id)!;
    groups[id] = clone({ ...group, id, memberIds, x: group.x + x, y: group.y + y });
  }
  for (const annotation of Object.values(fragment.annotations)) {
    const id = annotationMap.get(annotation.id)!;
    const nodeId = annotation.nodeId ? nodeMap.get(annotation.nodeId) : undefined;
    const edgeId = annotation.edgeId ? edgeMap.get(annotation.edgeId) : undefined;
    annotations[id] = clone({
      ...annotation, id, x: annotation.x + x, y: annotation.y + y,
      ...(nodeId ? { nodeId } : { nodeId: undefined }),
      ...(edgeId ? { edgeId } : { edgeId: undefined }),
    });
  }
  const next = toTrustedCanonicalDocument({ ...document, nodes, ports, edges, groups, annotations });
  return Object.freeze({ document: next, selection: Object.freeze([...nodeMap.values(), ...annotationMap.values()]) });
}

function pick<T extends object>(values: Record<string, T>, predicate: (value: T) => boolean): Record<string, T> {
  return Object.fromEntries(Object.values(values).filter(predicate).map((value) => {
    const copied = clone(value) as T & { id: string };
    return [copied.id, copied];
  }));
}

function allocateMap(ids: readonly string[], allocate: () => string): Map<string, string> {
  return new Map(ids.map((id) => [id, allocate()]));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function defaultGenerateId(): string {
  if (typeof crypto?.randomUUID !== "function") throw new Error("crypto.randomUUID está indisponível.");
  return crypto.randomUUID();
}
