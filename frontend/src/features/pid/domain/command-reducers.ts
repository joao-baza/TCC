import {
  commandError,
  type CatalogSymbol,
  type PidCommand,
} from "./command-contract";
import { isCatalogSymbolCompatible } from "./catalog-compatibility";
import {
  boundsForNodes,
  buildGraphIndex,
  getPortConnectionRejection,
  hasSelectableElement,
  omitKeys,
  uniqueIds,
} from "./graph-operations";
import type {
  PidAnnotation,
  PidDocument,
  PidEdge,
  PidGroup,
  PidNode,
  PidPort,
  Point,
} from "./model";
import { parsePidProperties, pidPointSchema } from "./schema";

export function reduceCommand(
  document: PidDocument,
  command: PidCommand,
  allocateId: () => string,
): PidDocument {
  switch (command.type) {
    case "symbol.insert":
      return insertCatalogSymbol(document, command.symbol, command.position, allocateId);
    case "annotation.insert":
      return insertTextAnnotation(document, command.text, command.position, allocateId);
    case "selection.move":
      return moveElements(document, command.ids, command.delta);
    case "selection.align":
      return alignElements(document, command.ids, command.axis);
    case "ports.connect":
      return connectDocumentPorts(document, command.sourcePortId, command.targetPortId, allocateId);
    case "selection.rotate":
      return rotateElements(document, command.ids, command.degrees);
    case "selection.group":
      return groupNodes(document, command.ids, allocateId);
    case "selection.duplicate":
      return duplicateElements(document, command.ids, command.offset, allocateId);
    case "selection.delete":
      return deleteElements(document, command.ids);
    case "element.patch":
      return patchDocumentElement(document, command.id, command.patch);
    case "document.rename":
      return renamePidDocument(document, command.title);
  }
}

export function createIdAllocator(document: PidDocument, generateId: () => string): () => string {
  const allocated = new Set([
    document.id,
    ...Object.keys(document.nodes),
    ...Object.keys(document.ports),
    ...Object.keys(document.edges),
    ...Object.keys(document.annotations),
    ...Object.keys(document.groups),
  ]);
  return () => {
    const id = generateId();
    if (allocated.has(id)) {
      throw commandError("command.id.duplicate", `O gerador produziu o ID duplicado ${id}.`, ["id"]);
    }
    allocated.add(id);
    return id;
  };
}

function insertCatalogSymbol(
  document: PidDocument,
  symbol: CatalogSymbol,
  position: Point,
  allocateId: () => string,
): PidDocument {
  if (!isCatalogSymbolCompatible(document.metadata.standard, symbol.standards)) {
    throw commandError(
      "command.symbol.incompatible-standard",
      "O símbolo não é compatível com o standard do documento.",
      ["symbol", "standards"],
    );
  }
  if (symbol.catalogVersion.trim() !== document.metadata.catalogVersion) {
    throw commandError(
      "command.symbol.incompatible-catalog",
      "O símbolo não é compatível com a versão do catálogo do documento.",
      ["symbol", "catalogVersion"],
    );
  }
  const templateKeys = symbol.portTemplates.map((template) => template.key.trim().toLowerCase());
  if (new Set(templateKeys).size !== templateKeys.length) {
    throw commandError(
      "command.symbol.duplicate-port-template",
      "Os templates de porta do símbolo devem ter chaves distintas.",
      ["symbol", "portTemplates"],
    );
  }

  const nodeId = allocateId();
  let properties;
  try {
    properties = parsePidProperties(symbol.properties ?? {});
  } catch (cause) {
    throw commandError(
      "command.symbol.invalid-properties",
      "As propriedades padrão do símbolo são inválidas.",
      ["symbol", "properties"],
      cause,
    );
  }
  const node: PidNode = {
    id: nodeId,
    symbolKey: symbol.key.trim(),
    catalogVersion: symbol.catalogVersion.trim(),
    x: position.x,
    y: position.y,
    width: symbol.defaultSize.width,
    height: symbol.defaultSize.height,
    rotation: 0,
    tag: symbol.tag?.trim() ?? "",
    label: symbol.label?.trim() || symbol.name.trim(),
    properties,
  };
  const insertedPorts: Record<string, PidPort> = {};
  for (const template of symbol.portTemplates) {
    const id = allocateId();
    insertedPorts[id] = {
      id,
      nodeId,
      templateKey: template.key.trim(),
      direction: template.direction,
      connectionClass: template.connectionClass,
      capacity: template.capacity,
      ...(template.anchor === undefined ? {} : { anchor: { ...template.anchor } }),
    };
  }
  return {
    ...document,
    nodes: { ...document.nodes, [nodeId]: node },
    ports: { ...document.ports, ...insertedPorts },
  };
}

function insertTextAnnotation(
  document: PidDocument,
  text: string,
  position: Point,
  allocateId: () => string,
): PidDocument {
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw commandError(
      "command.annotation.blank-text",
      "A anotação deve conter texto não vazio.",
      ["annotation", "text"],
    );
  }
  const id = allocateId();
  const annotation: PidAnnotation = {
    id,
    kind: "text",
    text: normalizedText,
    x: position.x,
    y: position.y,
    width: 180,
    height: 56,
    rotation: 0,
    properties: {},
  };
  return { ...document, annotations: { ...document.annotations, [id]: annotation } };
}

function moveElements(document: PidDocument, ids: string[], delta: Point): PidDocument {
  const selection = resolvePositionedSelection(document, ids);
  let nodes = document.nodes;
  let annotations = document.annotations;
  for (const id of selection.nodeIds) {
    if (nodes === document.nodes) nodes = { ...nodes };
    const node = document.nodes[id];
    nodes[id] = { ...node, x: node.x + delta.x, y: node.y + delta.y };
  }
  for (const id of selection.annotationIds) {
    if (annotations === document.annotations) annotations = { ...annotations };
    const annotation = document.annotations[id];
    annotations[id] = { ...annotation, x: annotation.x + delta.x, y: annotation.y + delta.y };
  }
  return { ...document, nodes, annotations };
}

function alignElements(
  document: PidDocument,
  ids: string[],
  axis: Extract<PidCommand, { type: "selection.align" }>["axis"],
): PidDocument {
  const selection = resolvePositionedSelection(document, ids);
  const elements = [
    ...selection.nodeIds.map((id) => ({ kind: "node" as const, id, value: document.nodes[id] })),
    ...selection.annotationIds.map((id) => ({ kind: "annotation" as const, id, value: document.annotations[id] })),
  ];
  const left = Math.min(...elements.map((element) => element.value.x));
  const right = Math.max(...elements.map((element) => element.value.x + element.value.width));
  const top = Math.min(...elements.map((element) => element.value.y));
  const bottom = Math.max(...elements.map((element) => element.value.y + element.value.height));
  const targetX = axis === "left" ? left : axis === "right" ? right : (left + right) / 2;
  const targetY = axis === "top" ? top : axis === "bottom" ? bottom : (top + bottom) / 2;
  let nodes = document.nodes;
  let annotations = document.annotations;
  for (const element of elements) {
    const nextPosition = axis === "left"
      ? { x: targetX }
      : axis === "right"
        ? { x: targetX - element.value.width }
        : axis === "center-x"
          ? { x: targetX - element.value.width / 2 }
          : axis === "top"
            ? { y: targetY }
            : axis === "bottom"
              ? { y: targetY - element.value.height }
              : { y: targetY - element.value.height / 2 };
    if (element.kind === "node") {
      if (nodes === document.nodes) nodes = { ...nodes };
      nodes[element.id] = { ...element.value, ...nextPosition };
    } else {
      if (annotations === document.annotations) annotations = { ...annotations };
      annotations[element.id] = { ...element.value, ...nextPosition };
    }
  }
  return { ...document, nodes, annotations };
}

function rotateElements(document: PidDocument, ids: string[], degrees: 90 | -90): PidDocument {
  const selection = resolvePositionedSelection(document, ids);
  let nodes = document.nodes;
  let annotations = document.annotations;
  for (const id of selection.nodeIds) {
    if (nodes === document.nodes) nodes = { ...nodes };
    const node = document.nodes[id];
    nodes[id] = { ...node, rotation: normalizeRotation(node.rotation + degrees) };
  }
  for (const id of selection.annotationIds) {
    if (annotations === document.annotations) annotations = { ...annotations };
    const annotation = document.annotations[id];
    annotations[id] = { ...annotation, rotation: normalizeRotation(annotation.rotation + degrees) };
  }
  return { ...document, nodes, annotations };
}

function connectDocumentPorts(
  document: PidDocument,
  sourcePortId: string,
  targetPortId: string,
  allocateId: () => string,
): PidDocument {
  const source = document.ports[sourcePortId];
  const rejection = getPortConnectionRejection(document, sourcePortId, targetPortId);
  if (rejection) throw commandError(rejection.code, rejection.message, rejection.path);
  if (!source) throw new Error("A validação de conexão aceitou uma porta ausente.");
  const id = allocateId();
  const edge: PidEdge = {
    id,
    sourcePortId,
    targetPortId,
    connectionClass: source.connectionClass,
    route: [],
    tag: "",
    label: "",
    properties: {},
  };
  return { ...document, edges: { ...document.edges, [id]: edge } };
}

function groupNodes(document: PidDocument, ids: string[], allocateId: () => string): PidDocument {
  const memberIds = uniqueIds(ids);
  if (memberIds.length === 0 || memberIds.some((id) => !document.nodes[id])) {
    throw commandError(
      "command.group.invalid-members",
      "Um grupo deve conter ao menos um nó existente.",
      ["selection"],
    );
  }
  const id = allocateId();
  const group: PidGroup = {
    id,
    label: "",
    memberIds,
    ...boundsForNodes(memberIds.map((memberId) => document.nodes[memberId])),
    properties: {},
  };
  return { ...document, groups: { ...document.groups, [id]: group } };
}

function duplicateElements(
  document: PidDocument,
  ids: string[],
  offset: Point,
  allocateId: () => string,
): PidDocument {
  const selection = uniqueIds(ids);
  if (selection.length === 0) {
    throw commandError("command.duplicate.empty", "A seleção para duplicação está vazia.", ["selection"]);
  }
  const nodeIds = new Set<string>();
  const groupIds = new Set<string>();
  const annotationIds = new Set<string>();
  const explicitPortIds = new Set<string>();
  const explicitEdgeIds = new Set<string>();
  for (const id of selection) {
    if (document.nodes[id]) nodeIds.add(id);
    else if (document.groups[id]) {
      groupIds.add(id);
      document.groups[id].memberIds.forEach((memberId) => nodeIds.add(memberId));
    } else if (document.annotations[id]) annotationIds.add(id);
    else if (document.ports[id]) explicitPortIds.add(id);
    else if (document.edges[id]) explicitEdgeIds.add(id);
    else {
      throw commandError(
        "command.duplicate.unknown-element",
        `O elemento selecionado ${id} não pode ser duplicado.`,
        ["selection", id],
      );
    }
  }
  for (const portId of explicitPortIds) {
    if (!nodeIds.has(document.ports[portId].nodeId)) {
      throw commandError(
        "command.duplicate.external-reference",
        "Uma porta só pode ser duplicada junto com seu nó proprietário.",
        ["ports", portId, "nodeId"],
      );
    }
  }
  for (const edgeId of explicitEdgeIds) {
    const edge = document.edges[edgeId];
    const source = document.ports[edge.sourcePortId];
    const target = document.ports[edge.targetPortId];
    if (!source || !target || !nodeIds.has(source.nodeId) || !nodeIds.has(target.nodeId)) {
      throw commandError(
        "command.duplicate.external-reference",
        "Uma aresta só pode ser duplicada quando seus dois nós estão na seleção.",
        ["edges", edgeId],
      );
    }
  }

  const nodeIdMap = new Map<string, string>();
  const portIdMap = new Map<string, string>();
  const edgeIdMap = new Map<string, string>();
  const nodes = nodeIds.size > 0 ? { ...document.nodes } : document.nodes;
  let ports = document.ports;
  let edges = document.edges;
  const groups = groupIds.size > 0 ? { ...document.groups } : document.groups;
  const annotations = annotationIds.size > 0 ? { ...document.annotations } : document.annotations;

  for (const oldId of nodeIds) {
    const oldNode = document.nodes[oldId];
    const id = allocateId();
    nodeIdMap.set(oldId, id);
    nodes[id] = {
      ...oldNode,
      id,
      x: oldNode.x + offset.x,
      y: oldNode.y + offset.y,
      tag: "",
      properties: parsePidProperties(oldNode.properties),
    };
  }
  for (const oldPort of Object.values(document.ports)) {
    const nodeId = nodeIdMap.get(oldPort.nodeId);
    if (!nodeId) continue;
    if (ports === document.ports) ports = { ...ports };
    const id = allocateId();
    portIdMap.set(oldPort.id, id);
    ports[id] = { ...oldPort, id, nodeId };
  }
  for (const oldEdge of Object.values(document.edges)) {
    const sourcePortId = portIdMap.get(oldEdge.sourcePortId);
    const targetPortId = portIdMap.get(oldEdge.targetPortId);
    if (!sourcePortId || !targetPortId) continue;
    if (edges === document.edges) edges = { ...edges };
    const id = allocateId();
    edgeIdMap.set(oldEdge.id, id);
    edges[id] = {
      ...oldEdge,
      id,
      sourcePortId,
      targetPortId,
      route: oldEdge.route.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y })),
      tag: "",
      properties: parsePidProperties(oldEdge.properties),
    };
  }
  for (const oldId of groupIds) {
    const oldGroup = document.groups[oldId];
    const id = allocateId();
    const memberIds = oldGroup.memberIds.map((memberId) => nodeIdMap.get(memberId)!);
    groups[id] = {
      ...oldGroup,
      id,
      memberIds,
      ...boundsForNodes(memberIds.map((memberId) => nodes[memberId])),
      properties: parsePidProperties(oldGroup.properties),
    };
  }
  for (const oldId of annotationIds) {
    const oldAnnotation = document.annotations[oldId];
    const id = allocateId();
    const mappedNodeId = oldAnnotation.nodeId ? nodeIdMap.get(oldAnnotation.nodeId) : undefined;
    const mappedEdgeId = oldAnnotation.edgeId ? edgeIdMap.get(oldAnnotation.edgeId) : undefined;
    annotations[id] = {
      ...oldAnnotation,
      id,
      x: oldAnnotation.x + offset.x,
      y: oldAnnotation.y + offset.y,
      nodeId: mappedNodeId ?? oldAnnotation.nodeId,
      edgeId: mappedEdgeId ?? oldAnnotation.edgeId,
      properties: parsePidProperties(oldAnnotation.properties),
    };
  }
  return { ...document, nodes, ports, edges, groups, annotations };
}

function deleteElements(document: PidDocument, ids: string[]): PidDocument {
  const selected = new Set(uniqueIds(ids));
  if (selected.size === 0) {
    throw commandError("command.delete.empty", "A seleção para exclusão está vazia.", ["selection"]);
  }
  for (const id of selected) {
    if (!hasSelectableElement(document, id)) {
      throw commandError("command.delete.unknown-element", `O elemento ${id} não existe.`, ["selection", id]);
    }
  }
  const deletedNodes = new Set([...selected].filter((id) => Boolean(document.nodes[id])));
  const deletedPorts = new Set([...selected].filter((id) => Boolean(document.ports[id])));
  for (const port of Object.values(document.ports)) {
    if (deletedNodes.has(port.nodeId)) deletedPorts.add(port.id);
  }
  const deletedEdges = new Set([...selected].filter((id) => Boolean(document.edges[id])));
  for (const edge of Object.values(document.edges)) {
    if (deletedPorts.has(edge.sourcePortId) || deletedPorts.has(edge.targetPortId)) deletedEdges.add(edge.id);
  }
  const deletedAnnotations = new Set([...selected].filter((id) => Boolean(document.annotations[id])));
  for (const annotation of Object.values(document.annotations)) {
    if ((annotation.nodeId && deletedNodes.has(annotation.nodeId))
      || (annotation.edgeId && deletedEdges.has(annotation.edgeId))) {
      deletedAnnotations.add(annotation.id);
    }
  }
  const deletedGroups = new Set([...selected].filter((id) => Boolean(document.groups[id])));
  return {
    ...document,
    nodes: deletedNodes.size ? omitKeys(document.nodes, deletedNodes) : document.nodes,
    ports: deletedPorts.size ? omitKeys(document.ports, deletedPorts) : document.ports,
    edges: deletedEdges.size ? omitKeys(document.edges, deletedEdges) : document.edges,
    annotations: deletedAnnotations.size ? omitKeys(document.annotations, deletedAnnotations) : document.annotations,
    groups: deleteAndPruneGroups(document.groups, deletedGroups, deletedNodes),
  };
}

type ElementKind = "node" | "port" | "edge" | "annotation" | "group";

const safePatchFields: Record<ElementKind, ReadonlySet<string>> = {
  node: new Set(["x", "y", "width", "height", "rotation", "tag", "label", "properties"]),
  port: new Set(["direction", "connectionClass", "capacity"]),
  edge: new Set(["route", "tag", "label", "properties"]),
  annotation: new Set(["kind", "text", "x", "y", "width", "height", "rotation", "properties"]),
  group: new Set(["label", "properties"]),
};

function patchDocumentElement(document: PidDocument, id: string, patch: Record<string, unknown>): PidDocument {
  const kind = resolveElementKind(document, id);
  if (!kind) throw commandError("command.patch.unknown-element", `O elemento ${id} não existe.`, ["elements", id]);
  const mapName = mapNameFor(kind);
  const safePatch = readSafePatch(patch, safePatchFields[kind], [mapName, id]);
  switch (kind) {
    case "node":
      return { ...document, nodes: { ...document.nodes, [id]: { ...document.nodes[id], ...safePatch } as PidNode } };
    case "port":
      return { ...document, ports: { ...document.ports, [id]: { ...document.ports[id], ...safePatch } as PidPort } };
    case "edge":
      return { ...document, edges: { ...document.edges, [id]: { ...document.edges[id], ...safePatch } as PidEdge } };
    case "annotation":
      return {
        ...document,
        annotations: { ...document.annotations, [id]: { ...document.annotations[id], ...safePatch } as PidAnnotation },
      };
    case "group":
      return { ...document, groups: { ...document.groups, [id]: { ...document.groups[id], ...safePatch } as PidGroup } };
  }
}

function readSafePatch(
  patch: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  basePath: readonly (string | number)[],
): Record<string, unknown> {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    throw commandError("command.patch.invalid", "O patch deve ser um objeto simples.", basePath);
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(patch)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw commandError(
        "command.patch.forbidden-field",
        `O campo ${String(key)} não pode ser alterado por patch.`,
        [...basePath, String(key)],
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(patch, key);
    if (!descriptor?.enumerable || "get" in descriptor || "set" in descriptor) {
      throw commandError(
        "command.patch.unsafe-descriptor",
        `O campo ${key} do patch não é serializável.`,
        [...basePath, key],
      );
    }
    try {
      result[key] = key === "properties"
        ? parsePidProperties(descriptor.value)
        : key === "route"
          ? cloneRoute(descriptor.value)
          : descriptor.value;
    } catch (cause) {
      throw commandError(
        "command.patch.invalid-value",
        `O valor do campo ${key} é inválido.`,
        [...basePath, key],
        cause,
      );
    }
  }
  return result;
}

function cloneRoute(value: unknown): Point[] {
  if (!Array.isArray(value)) throw new Error("A rota deve ser uma lista de pontos.");
  return value.map((point) => pidPointSchema.parse(point));
}

function renamePidDocument(document: PidDocument, title: string): PidDocument {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    throw commandError("command.document.blank-title", "O título do documento é obrigatório.", ["metadata", "title"]);
  }
  return { ...document, metadata: { ...document.metadata, title: normalizedTitle } };
}

function resolvePositionedSelection(document: PidDocument, ids: string[]) {
  const selectedIds = uniqueIds(ids);
  if (selectedIds.length === 0) {
    throw commandError("command.selection.empty", "A seleção está vazia.", ["selection"]);
  }
  const nodeIds = new Set<string>();
  const annotationIds = new Set<string>();
  for (const id of selectedIds) {
    if (document.nodes[id]) nodeIds.add(id);
    else if (document.annotations[id]) annotationIds.add(id);
    else if (document.groups[id]) document.groups[id].memberIds.forEach((memberId) => nodeIds.add(memberId));
    else {
      throw commandError(
        "command.selection.unsupported-element",
        `O elemento ${id} não suporta esta operação.`,
        ["selection", id],
      );
    }
  }
  if (nodeIds.size === 0 && annotationIds.size === 0) {
    throw commandError("command.selection.empty", "A seleção não contém elementos posicionáveis.", ["selection"]);
  }
  return { nodeIds: [...nodeIds], annotationIds: [...annotationIds] };
}

function resolveElementKind(document: PidDocument, id: string): ElementKind | undefined {
  if (document.nodes[id]) return "node";
  if (document.ports[id]) return "port";
  if (document.edges[id]) return "edge";
  if (document.annotations[id]) return "annotation";
  if (document.groups[id]) return "group";
  return undefined;
}

function mapNameFor(kind: ElementKind): "nodes" | "ports" | "edges" | "annotations" | "groups" {
  if (kind === "node") return "nodes";
  if (kind === "port") return "ports";
  if (kind === "edge") return "edges";
  if (kind === "annotation") return "annotations";
  return "groups";
}

function deleteAndPruneGroups(
  groups: PidDocument["groups"],
  deletedGroups: ReadonlySet<string>,
  deletedNodes: ReadonlySet<string>,
): PidDocument["groups"] {
  if (deletedGroups.size === 0 && deletedNodes.size === 0) return groups;
  let next = groups;
  for (const [id, group] of Object.entries(groups)) {
    if (deletedGroups.has(id)) {
      if (next === groups) next = { ...groups };
      delete next[id];
      continue;
    }
    const memberIds = group.memberIds.filter((memberId) => !deletedNodes.has(memberId));
    if (memberIds.length === group.memberIds.length) continue;
    if (next === groups) next = { ...groups };
    if (memberIds.length === 0) delete next[id];
    else next[id] = { ...group, memberIds };
  }
  return next;
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}
