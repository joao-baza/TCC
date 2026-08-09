import type {
  ConnectionClass,
  PidAnnotation,
  PidDocument,
  PidEdge,
  PidGroup,
  PidJsonValue,
  PidNode,
  PidPort,
  PidProperties,
  PidStandard,
  Point,
  PortDirection,
} from "./model";
import { pidDocumentSchema } from "./schema";

export interface CatalogPortTemplate {
  key: string;
  direction: PortDirection;
  connectionClass: ConnectionClass;
  capacity: number;
}

export interface CatalogSymbol {
  key: string;
  standards: PidStandard[];
  catalogVersion: string;
  name: string;
  defaultSize: { width: number; height: number };
  portTemplates: CatalogPortTemplate[];
  tag?: string;
  label?: string;
  properties?: PidProperties;
}

export type PidCommand =
  | { type: "symbol.insert"; symbol: CatalogSymbol; position: Point }
  | { type: "annotation.insert"; text: string; position: Point }
  | { type: "selection.move"; ids: string[]; delta: Point }
  | { type: "selection.align"; ids: string[]; axis: "left" | "center-x" | "right" | "top" | "center-y" | "bottom" }
  | { type: "ports.connect"; sourcePortId: string; targetPortId: string }
  | { type: "selection.rotate"; ids: string[]; degrees: 90 | -90 }
  | { type: "selection.group"; ids: string[] }
  | { type: "selection.duplicate"; ids: string[]; offset: Point }
  | { type: "selection.delete"; ids: string[] }
  | { type: "element.patch"; id: string; patch: Record<string, unknown> }
  | { type: "document.rename"; title: string };

export interface CommandContext {
  generateId?: () => string;
  now?: () => Date;
}

export interface DocumentInvariantIssue {
  code: string;
  path: (string | number)[];
  message: string;
}

export class DomainCommandError extends Error {
  readonly issues: readonly DocumentInvariantIssue[];

  constructor(message: string, issues: readonly DocumentInvariantIssue[] = []) {
    super(message);
    this.name = "DomainCommandError";
    this.issues = issues;
  }
}

export const insertSymbol = (symbol: CatalogSymbol, position: Point): PidCommand => ({
  type: "symbol.insert",
  symbol,
  position,
});

export const insertAnnotation = (text: string, position: Point): PidCommand => ({
  type: "annotation.insert",
  text,
  position,
});

export const moveSelection = (ids: string[], delta: Point): PidCommand => ({
  type: "selection.move",
  ids,
  delta,
});

export const alignSelection = (
  ids: string[],
  axis: Extract<PidCommand, { type: "selection.align" }>["axis"],
): PidCommand => ({ type: "selection.align", ids, axis });

export const connectPorts = (sourcePortId: string, targetPortId: string): PidCommand => ({
  type: "ports.connect",
  sourcePortId,
  targetPortId,
});

export const rotateSelection = (ids: string[], degrees: 90 | -90): PidCommand => ({
  type: "selection.rotate",
  ids,
  degrees,
});

export const groupSelection = (ids: string[]): PidCommand => ({ type: "selection.group", ids });

export const duplicateSelection = (ids: string[], offset: Point): PidCommand => ({
  type: "selection.duplicate",
  ids,
  offset,
});

export const deleteSelection = (ids: string[]): PidCommand => ({ type: "selection.delete", ids });

export const patchElement = (id: string, patch: Record<string, unknown>): PidCommand => ({
  type: "element.patch",
  id,
  patch,
});

export const renameDocument = (title: string): PidCommand => ({ type: "document.rename", title });

export function applyCommand(
  document: PidDocument,
  command: PidCommand,
  context: CommandContext = {},
): PidDocument {
  try {
    const inputIssues = assertDocumentInvariants(document);
    if (inputIssues.length > 0) {
      throw new DomainCommandError("O documento de entrada viola invariantes do domínio.", inputIssues);
    }

    const runtime: Required<CommandContext> = {
      generateId: context.generateId ?? defaultIdGenerator,
      now: context.now ?? defaultClock,
    };
    const allocator = createIdAllocator(document, runtime.generateId);
    let next: PidDocument;

    switch (command.type) {
      case "symbol.insert":
        next = applyInsertSymbol(document, command.symbol, command.position, allocator);
        break;
      case "annotation.insert":
        next = applyInsertAnnotation(document, command.text, command.position, allocator);
        break;
      case "selection.move":
        next = applyMove(document, command.ids, command.delta);
        break;
      case "selection.align":
        next = applyAlign(document, command.ids, command.axis);
        break;
      case "ports.connect":
        next = applyConnect(document, command.sourcePortId, command.targetPortId, allocator);
        break;
      case "selection.rotate":
        next = applyRotate(document, command.ids, command.degrees);
        break;
      case "selection.group":
        next = applyGroup(document, command.ids, allocator);
        break;
      case "selection.duplicate":
        next = applyDuplicate(document, command.ids, command.offset, allocator);
        break;
      case "selection.delete":
        next = applyDelete(document, command.ids);
        break;
      case "element.patch":
        next = applyPatch(document, command.id, command.patch);
        break;
      case "document.rename":
        next = applyRename(document, command.title);
        break;
    }

    next = {
      ...next,
      metadata: {
        ...next.metadata,
        updatedAt: runtime.now().toISOString(),
      },
    };
    const issues = assertDocumentInvariants(next);
    if (issues.length > 0) {
      throw new DomainCommandError("O comando produziria um documento inválido.", issues);
    }
    return next;
  } catch (error) {
    if (error instanceof DomainCommandError) throw error;
    const message = error instanceof Error ? error.message : "Falha desconhecida.";
    throw new DomainCommandError(`Não foi possível aplicar o comando: ${message}`);
  }
}

export function assertDocumentInvariants(value: unknown): DocumentInvariantIssue[] {
  const parsed = pidDocumentSchema.safeParse(value);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      code: `schema.${issue.code}`,
      path: issue.path.map((part) => typeof part === "number" ? part : String(part)),
      message: issue.message,
    }));
  }

  const document = parsed.data;
  const issues: DocumentInvariantIssue[] = [];
  validateUniqueElementIds(document, issues);
  validateSemanticTags(document, issues);

  for (const [nodeId, node] of Object.entries(document.nodes)) {
    if (node.catalogVersion !== document.metadata.catalogVersion) {
      addIssue(
        issues,
        "catalog.version-mismatch",
        ["nodes", nodeId, "catalogVersion"],
        "A versão do símbolo deve ser compatível com a versão do catálogo do documento.",
      );
    }
    const templateKeys = new Set<string>();
    for (const port of Object.values(document.ports).filter((candidate) => candidate.nodeId === nodeId)) {
      const normalizedKey = port.templateKey.trim().toLowerCase();
      if (templateKeys.has(normalizedKey)) {
        addIssue(
          issues,
          "semantic.duplicate-port-template",
          ["ports", port.id, "templateKey"],
          `O nó ${nodeId} possui templates de porta duplicados.`,
        );
      }
      templateKeys.add(normalizedKey);
    }
  }

  const connectionCount = new Map<string, number>();
  const semanticConnections = new Set<string>();
  for (const [edgeId, edge] of Object.entries(document.edges)) {
    const source = document.ports[edge.sourcePortId];
    const target = document.ports[edge.targetPortId];
    if (!source || !target) continue;

    if (source.id === target.id) {
      addIssue(issues, "connection.same-port", ["edges", edgeId], "Uma porta não pode ser conectada a ela mesma.");
    }
    if (source.nodeId === target.nodeId) {
      addIssue(issues, "connection.same-node", ["edges", edgeId], "Não é permitido conectar portas do mesmo nó.");
    }
    if (source.direction === "input" || target.direction === "output") {
      addIssue(issues, "connection.direction", ["edges", edgeId], "A direção das portas é incompatível com a conexão.");
    }
    if (source.connectionClass !== target.connectionClass || edge.connectionClass !== source.connectionClass) {
      addIssue(issues, "connection.class", ["edges", edgeId], "A classe da conexão deve coincidir nas duas portas e na borda.");
    }

    const semanticKey = `${source.id}\u0000${target.id}`;
    if (semanticConnections.has(semanticKey)) {
      addIssue(issues, "connection.duplicate", ["edges", edgeId], "A mesma conexão não pode ser criada mais de uma vez.");
    }
    semanticConnections.add(semanticKey);
    connectionCount.set(source.id, (connectionCount.get(source.id) ?? 0) + 1);
    connectionCount.set(target.id, (connectionCount.get(target.id) ?? 0) + 1);
  }

  for (const [portId, count] of connectionCount) {
    const port = document.ports[portId];
    if (port && count > port.capacity) {
      addIssue(
        issues,
        "connection.capacity",
        ["ports", portId, "capacity"],
        `A capacidade da porta foi excedida (${count}/${port.capacity}).`,
      );
    }
  }

  for (const [groupId, group] of Object.entries(document.groups)) {
    const members = new Set<string>();
    for (const [index, memberId] of group.memberIds.entries()) {
      if (members.has(memberId)) {
        addIssue(
          issues,
          "semantic.duplicate-group-member",
          ["groups", groupId, "memberIds", index],
          "Um nó não pode aparecer duas vezes no mesmo grupo.",
        );
      }
      members.add(memberId);
    }
  }

  return issues;
}

function applyInsertSymbol(
  document: PidDocument,
  symbol: CatalogSymbol,
  position: Point,
  allocateId: () => string,
): PidDocument {
  if (document.metadata.standard !== "free" && !symbol.standards.includes(document.metadata.standard)) {
    throw new DomainCommandError("O símbolo não é compatível com o standard do documento.");
  }
  if (symbol.catalogVersion.trim() !== document.metadata.catalogVersion) {
    throw new DomainCommandError("O símbolo não é compatível com a versão do catálogo do documento.");
  }
  const templateKeys = symbol.portTemplates.map((template) => template.key.trim().toLowerCase());
  if (new Set(templateKeys).size !== templateKeys.length) {
    throw new DomainCommandError("Os templates de porta do símbolo devem ter chaves distintas.");
  }

  const nodeId = allocateId();
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
    properties: cloneProperties(symbol.properties ?? {}),
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
    };
  }

  return {
    ...document,
    nodes: { ...document.nodes, [nodeId]: node },
    ports: { ...document.ports, ...insertedPorts },
  };
}

function applyInsertAnnotation(
  document: PidDocument,
  text: string,
  position: Point,
  allocateId: () => string,
): PidDocument {
  const normalizedText = text.trim();
  if (!normalizedText) throw new DomainCommandError("A anotação deve conter texto não vazio.");
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

function applyMove(document: PidDocument, ids: string[], delta: Point): PidDocument {
  const elements = resolvePositionedSelection(document, ids);
  let nodes = document.nodes;
  let annotations = document.annotations;
  for (const element of elements) {
    if (element.kind === "node") {
      if (nodes === document.nodes) nodes = { ...nodes };
      nodes[element.id] = { ...element.value, x: element.value.x + delta.x, y: element.value.y + delta.y };
    } else {
      if (annotations === document.annotations) annotations = { ...annotations };
      annotations[element.id] = { ...element.value, x: element.value.x + delta.x, y: element.value.y + delta.y };
    }
  }
  return { ...document, nodes, annotations };
}

function applyAlign(
  document: PidDocument,
  ids: string[],
  axis: Extract<PidCommand, { type: "selection.align" }>["axis"],
): PidDocument {
  const elements = resolvePositionedSelection(document, ids);
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

function applyConnect(
  document: PidDocument,
  sourcePortId: string,
  targetPortId: string,
  allocateId: () => string,
): PidDocument {
  const source = document.ports[sourcePortId];
  const target = document.ports[targetPortId];
  if (!source || !target) throw new DomainCommandError("As duas portas da conexão devem existir.");
  if (source.id === target.id) throw new DomainCommandError("Uma porta não pode ser conectada a ela mesma.");
  if (source.nodeId === target.nodeId) throw new DomainCommandError("Não é permitido conectar portas do mesmo nó.");
  if (source.direction === "input" || target.direction === "output") {
    throw new DomainCommandError("A direção das portas é incompatível com a conexão.");
  }
  if (source.connectionClass !== target.connectionClass) {
    throw new DomainCommandError("A classe das portas deve ser compatível.");
  }
  for (const port of [source, target]) {
    const used = Object.values(document.edges)
      .filter((edge) => edge.sourcePortId === port.id || edge.targetPortId === port.id)
      .length;
    if (used >= port.capacity) throw new DomainCommandError(`A capacidade da porta ${port.id} foi excedida.`);
  }
  if (Object.values(document.edges).some(
    (edge) => edge.sourcePortId === source.id && edge.targetPortId === target.id,
  )) {
    throw new DomainCommandError("A mesma conexão não pode ser criada mais de uma vez.");
  }

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

function applyRotate(document: PidDocument, ids: string[], degrees: 90 | -90): PidDocument {
  const elements = resolvePositionedSelection(document, ids);
  let nodes = document.nodes;
  let annotations = document.annotations;
  for (const element of elements) {
    const rotation = normalizeRotation(element.value.rotation + degrees);
    if (element.kind === "node") {
      if (nodes === document.nodes) nodes = { ...nodes };
      nodes[element.id] = { ...element.value, rotation };
    } else {
      if (annotations === document.annotations) annotations = { ...annotations };
      annotations[element.id] = { ...element.value, rotation };
    }
  }
  return { ...document, nodes, annotations };
}

function applyGroup(document: PidDocument, ids: string[], allocateId: () => string): PidDocument {
  const memberIds = uniqueIds(ids);
  if (memberIds.length === 0 || memberIds.some((id) => !document.nodes[id])) {
    throw new DomainCommandError("Um grupo deve conter ao menos um nó existente.");
  }
  const bounds = boundsFor(memberIds.map((id) => document.nodes[id]));
  const id = allocateId();
  const group: PidGroup = {
    id,
    label: "",
    memberIds,
    ...bounds,
    properties: {},
  };
  return { ...document, groups: { ...document.groups, [id]: group } };
}

function applyDuplicate(
  document: PidDocument,
  ids: string[],
  offset: Point,
  allocateId: () => string,
): PidDocument {
  const selection = uniqueIds(ids);
  if (selection.length === 0) throw new DomainCommandError("A seleção para duplicação está vazia.");
  const nodeIds = new Set<string>();
  const groupIds = new Set<string>();
  const annotationIds = new Set<string>();
  for (const id of selection) {
    if (document.nodes[id]) nodeIds.add(id);
    else if (document.groups[id]) {
      groupIds.add(id);
      document.groups[id].memberIds.forEach((memberId) => nodeIds.add(memberId));
    } else if (document.annotations[id]) annotationIds.add(id);
    else throw new DomainCommandError(`O elemento selecionado ${id} não pode ser duplicado.`);
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
      properties: cloneProperties(oldNode.properties),
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
      properties: cloneProperties(oldEdge.properties),
    };
  }
  for (const oldId of groupIds) {
    const oldGroup = document.groups[oldId];
    const id = allocateId();
    groups[id] = {
      ...oldGroup,
      id,
      memberIds: oldGroup.memberIds.map((memberId) => nodeIdMap.get(memberId)!),
      x: oldGroup.x + offset.x,
      y: oldGroup.y + offset.y,
      properties: cloneProperties(oldGroup.properties),
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
      properties: cloneProperties(oldAnnotation.properties),
    };
  }

  return { ...document, nodes, ports, edges, groups, annotations };
}

function applyDelete(document: PidDocument, ids: string[]): PidDocument {
  const selected = new Set(uniqueIds(ids));
  if (selected.size === 0) throw new DomainCommandError("A seleção para exclusão está vazia.");
  for (const id of selected) {
    if (!resolveElementKind(document, id)) throw new DomainCommandError(`O elemento ${id} não existe.`);
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

const safePatchFields = {
  node: new Set(["x", "y", "width", "height", "rotation", "tag", "label", "properties"]),
  port: new Set(["direction", "connectionClass", "capacity"]),
  edge: new Set(["route", "tag", "label", "properties"]),
  annotation: new Set(["kind", "text", "x", "y", "width", "height", "rotation", "properties"]),
  group: new Set(["label", "x", "y", "width", "height", "properties"]),
} as const;

function applyPatch(document: PidDocument, id: string, patch: Record<string, unknown>): PidDocument {
  const kind = resolveElementKind(document, id);
  if (!kind) throw new DomainCommandError(`O elemento ${id} não existe.`);
  const safePatch = readSafePatch(patch, safePatchFields[kind]);
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

function applyRename(document: PidDocument, title: string): PidDocument {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) throw new DomainCommandError("O título do documento é obrigatório.");
  return { ...document, metadata: { ...document.metadata, title: normalizedTitle } };
}

type PositionedSelection =
  | { kind: "node"; id: string; value: PidNode }
  | { kind: "annotation"; id: string; value: PidAnnotation };

function resolvePositionedSelection(document: PidDocument, ids: string[]): PositionedSelection[] {
  const selectedIds = uniqueIds(ids);
  if (selectedIds.length === 0) throw new DomainCommandError("A seleção está vazia.");
  return selectedIds.map((id) => {
    if (document.nodes[id]) return { kind: "node" as const, id, value: document.nodes[id] };
    if (document.annotations[id]) return { kind: "annotation" as const, id, value: document.annotations[id] };
    throw new DomainCommandError(`O elemento ${id} não suporta esta operação.`);
  });
}

function resolveElementKind(document: PidDocument, id: string): keyof typeof safePatchFields | undefined {
  if (document.nodes[id]) return "node";
  if (document.ports[id]) return "port";
  if (document.edges[id]) return "edge";
  if (document.annotations[id]) return "annotation";
  if (document.groups[id]) return "group";
  return undefined;
}

function readSafePatch(patch: Record<string, unknown>, allowed: ReadonlySet<string>): Record<string, unknown> {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    throw new DomainCommandError("O patch deve ser um objeto simples.");
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(patch)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw new DomainCommandError(`O campo ${String(key)} não pode ser alterado por patch.`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(patch, key);
    if (!descriptor?.enumerable || "get" in descriptor || "set" in descriptor) {
      throw new DomainCommandError(`O campo ${key} do patch não é serializável.`);
    }
    result[key] = cloneJson(descriptor.value);
  }
  return result;
}

function validateUniqueElementIds(document: PidDocument, issues: DocumentInvariantIssue[]): void {
  const seen = new Map<string, string>();
  for (const [mapName, map] of Object.entries({
    nodes: document.nodes,
    ports: document.ports,
    edges: document.edges,
    annotations: document.annotations,
    groups: document.groups,
  })) {
    for (const id of Object.keys(map)) {
      const previous = seen.get(id);
      if (previous) {
        addIssue(
          issues,
          "semantic.duplicate-id",
          [mapName, id],
          `O ID ${id} também é usado em ${previous}.`,
        );
      } else {
        seen.set(id, mapName);
      }
    }
  }
}

function validateSemanticTags(document: PidDocument, issues: DocumentInvariantIssue[]): void {
  const seen = new Map<string, string>();
  for (const [mapName, map] of Object.entries({ nodes: document.nodes, edges: document.edges })) {
    for (const element of Object.values(map)) {
      const normalizedTag = element.tag.trim().toLowerCase();
      if (!normalizedTag) continue;
      const previous = seen.get(normalizedTag);
      if (previous) {
        addIssue(
          issues,
          "semantic.duplicate-tag",
          [mapName, element.id, "tag"],
          `A tag ${element.tag.trim()} também é usada em ${previous}.`,
        );
      } else {
        seen.set(normalizedTag, `${mapName}.${element.id}`);
      }
    }
  }
}

function addIssue(
  issues: DocumentInvariantIssue[],
  code: string,
  path: (string | number)[],
  message: string,
): void {
  issues.push({ code, path, message });
}

function boundsFor(elements: Array<{ x: number; y: number; width: number; height: number }>) {
  const x = Math.min(...elements.map((element) => element.x));
  const y = Math.min(...elements.map((element) => element.y));
  const right = Math.max(...elements.map((element) => element.x + element.width));
  const bottom = Math.max(...elements.map((element) => element.y + element.height));
  return { x, y, width: right - x, height: bottom - y };
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function omitKeys<T>(source: Record<string, T>, keys: ReadonlySet<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(source).filter(([id]) => !keys.has(id)));
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
    if (memberIds.length !== group.memberIds.length) {
      if (next === groups) next = { ...groups };
      next[id] = { ...group, memberIds };
    }
  }
  return next;
}

function createIdAllocator(document: PidDocument, generateId: () => string): () => string {
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
    if (allocated.has(id)) throw new DomainCommandError(`O gerador produziu o ID duplicado ${id}.`);
    allocated.add(id);
    return id;
  };
}

function cloneProperties(properties: PidProperties): PidProperties {
  const cloned = cloneJson(properties);
  if (Array.isArray(cloned) || cloned === null || typeof cloned !== "object") {
    throw new DomainCommandError("As propriedades devem ser um objeto JSON simples.");
  }
  return cloned as PidProperties;
}

interface JsonCloneState {
  valuesVisited: number;
}

function cloneJson(
  value: unknown,
  active = new WeakSet<object>(),
  state: JsonCloneState = { valuesVisited: 0 },
  depth = 0,
): PidJsonValue {
  state.valuesVisited += 1;
  if (state.valuesVisited > 100_000) {
    throw new DomainCommandError("O limite de 100.000 valores serializáveis foi excedido.");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new DomainCommandError("Valores numéricos devem ser finitos.");
    return value;
  }
  if (typeof value !== "object") throw new DomainCommandError("O valor do patch deve ser serializável como JSON.");
  if (depth > 64) throw new DomainCommandError("A profundidade máxima de propriedades foi excedida.");
  if (active.has(value)) throw new DomainCommandError("Referências cíclicas não são permitidas.");
  active.add(value);
  try {
    if (Array.isArray(value)) {
      const clone: PidJsonValue[] = [];
      const ownKeys = Reflect.ownKeys(value);
      if (value.length > 10_000 || ownKeys.length - 1 > 10_000) {
        throw new DomainCommandError("Arrays serializáveis não podem exceder 10.000 itens ou chaves.");
      }
      for (const key of ownKeys) {
        if (key === "length") continue;
        if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) {
          throw new DomainCommandError("Arrays não podem conter chaves extras.");
        }
      }
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || "get" in descriptor || "set" in descriptor) {
          throw new DomainCommandError("Arrays devem ser densos e não podem conter accessors.");
        }
        clone.push(cloneJson(descriptor.value, active, state, depth + 1));
      }
      return clone;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new DomainCommandError("Objetos serializáveis devem usar um protótipo simples.");
    }
    const clone: Record<string, PidJsonValue> = {};
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length > 10_000) {
      throw new DomainCommandError("Objetos serializáveis não podem exceder 10.000 chaves.");
    }
    for (const key of ownKeys) {
      if (typeof key !== "string" || key === "__proto__" || key === "prototype" || key === "constructor") {
        throw new DomainCommandError(`A chave ${String(key)} não é permitida.`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || "get" in descriptor || "set" in descriptor) {
        throw new DomainCommandError(`A propriedade ${key} deve ser enumerável e não pode usar accessors.`);
      }
      clone[key] = cloneJson(descriptor.value, active, state, depth + 1);
    }
    return clone;
  } finally {
    active.delete(value);
  }
}

function defaultIdGenerator(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID !== "function") {
    throw new DomainCommandError("crypto.randomUUID está indisponível no runtime padrão.");
  }
  return randomUUID.call(globalThis.crypto);
}

function defaultClock(): Date {
  return new Date();
}
