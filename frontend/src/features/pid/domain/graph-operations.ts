import type { PidDocument, PidGroup, PidNode, PidPort } from "./model";
import { getPidNodeFlowGeometry } from "./geometry";

export interface PidGraphIndex {
  readonly portsByNode: ReadonlyMap<string, readonly PidPort[]>;
  readonly connectionCountByPort: ReadonlyMap<string, number>;
  readonly groupsByNode: ReadonlyMap<string, readonly string[]>;
  readonly edgePairKeys: ReadonlySet<string>;
}

export interface PortConnectionRejection {
  readonly code: string;
  readonly message: string;
  readonly path: readonly (string | number)[];
}

export interface PortConnectionValidation {
  readonly index: PidGraphIndex;
  readonly getRejection: (sourcePortId: string, targetPortId: string) => PortConnectionRejection | null;
  readonly isValid: (sourcePortId: string, targetPortId: string) => boolean;
}

export function buildGraphIndex(document: PidDocument): PidGraphIndex {
  const portsByNode = new Map<string, PidPort[]>();
  const connectionCountByPort = new Map<string, number>();
  const groupsByNode = new Map<string, string[]>();
  const edgePairKeys = new Set<string>();

  for (const port of Object.values(document.ports)) {
    const ports = portsByNode.get(port.nodeId);
    if (ports) ports.push(port);
    else portsByNode.set(port.nodeId, [port]);
  }
  for (const edge of Object.values(document.edges)) {
    edgePairKeys.add(connectionPairKey(edge.sourcePortId, edge.targetPortId));
    connectionCountByPort.set(
      edge.sourcePortId,
      (connectionCountByPort.get(edge.sourcePortId) ?? 0) + 1,
    );
    connectionCountByPort.set(
      edge.targetPortId,
      (connectionCountByPort.get(edge.targetPortId) ?? 0) + 1,
    );
  }
  for (const group of Object.values(document.groups)) {
    for (const memberId of group.memberIds) {
      const groups = groupsByNode.get(memberId);
      if (groups) groups.push(group.id);
      else groupsByNode.set(memberId, [group.id]);
    }
  }

  return { portsByNode, connectionCountByPort, groupsByNode, edgePairKeys };
}

/** Shared candidate policy used by command reducers and UI adapters. */
export function getPortConnectionRejection(
  document: PidDocument,
  sourcePortId: string,
  targetPortId: string,
  index: PidGraphIndex = buildGraphIndex(document),
): PortConnectionRejection | null {
  const source = document.ports[sourcePortId];
  const target = document.ports[targetPortId];
  if (!source || !target) {
    return rejection("command.connect.missing-port", "As duas portas da conexão devem existir.", ["ports"]);
  }
  if (source.id === target.id) {
    return rejection("connection.same-port", "Uma porta não pode ser conectada a ela mesma.", ["ports", source.id]);
  }
  if (source.nodeId === target.nodeId) {
    return rejection("connection.same-node", "Não é permitido conectar portas do mesmo nó.", ["ports"]);
  }
  if (source.direction === "input" || target.direction === "output") {
    return rejection("connection.direction", "A direção das portas é incompatível com a conexão.", ["ports"]);
  }
  if (source.connectionClass !== target.connectionClass) {
    return rejection("connection.class", "A classe das portas deve ser compatível.", ["ports"]);
  }
  for (const port of [source, target]) {
    if ((index.connectionCountByPort.get(port.id) ?? 0) >= port.capacity) {
      return rejection(
        "connection.capacity",
        `A capacidade da porta ${port.id} foi excedida.`,
        ["ports", port.id, "capacity"],
      );
    }
  }
  if (index.edgePairKeys.has(connectionPairKey(source.id, target.id))) {
    return rejection("connection.duplicate", "A mesma conexão não pode ser criada mais de uma vez.", ["edges"]);
  }
  return null;
}

export function createPortConnectionValidation(
  document: PidDocument,
  buildIndex: (document: PidDocument) => PidGraphIndex = buildGraphIndex,
): PortConnectionValidation {
  const index = buildIndex(document);
  const getRejection = (sourcePortId: string, targetPortId: string) => getPortConnectionRejection(
    document,
    sourcePortId,
    targetPortId,
    index,
  );
  return {
    index,
    getRejection,
    isValid: (sourcePortId, targetPortId) => getRejection(sourcePortId, targetPortId) === null,
  };
}

function rejection(
  code: string,
  message: string,
  path: readonly (string | number)[],
): PortConnectionRejection {
  return { code, message, path };
}

export function boundsForNodes(
  nodes: readonly PidNode[],
  ports: readonly PidPort[] = [],
): Pick<PidGroup, "x" | "y" | "width" | "height"> {
  const nodeBounds = nodes.map((node) => getPidNodeFlowGeometry(
    node,
    ports.filter((port) => port.nodeId === node.id),
  ).bounds);
  const x = Math.min(...nodeBounds.map((bounds) => bounds.x));
  const y = Math.min(...nodeBounds.map((bounds) => bounds.y));
  const right = Math.max(...nodeBounds.map((bounds) => bounds.x + bounds.width));
  const bottom = Math.max(...nodeBounds.map((bounds) => bounds.y + bounds.height));
  return { x, y, width: right - x, height: bottom - y };
}

export function recalculateGroupBounds(document: PidDocument): PidDocument {
  if (document.groups === undefined || Object.keys(document.groups).length === 0) return document;
  let groups = document.groups;
  for (const [groupId, group] of Object.entries(document.groups)) {
    const members = group.memberIds
      .map((memberId) => document.nodes[memberId])
      .filter((node): node is PidNode => Boolean(node));
    if (members.length === 0) {
      if (groups === document.groups) groups = { ...groups };
      delete groups[groupId];
      continue;
    }
    const bounds = boundsForNodes(members, Object.values(document.ports));
    if (group.x !== bounds.x
      || group.y !== bounds.y
      || group.width !== bounds.width
      || group.height !== bounds.height) {
      if (groups === document.groups) groups = { ...groups };
      groups[groupId] = { ...group, ...bounds };
    }
  }
  return groups === document.groups ? document : { ...document, groups };
}

function connectionPairKey(sourcePortId: string, targetPortId: string): string {
  return `${sourcePortId}\u0000${targetPortId}`;
}

export function hasSelectableElement(document: PidDocument, id: string): boolean {
  return Boolean(
    document.nodes[id]
    || document.ports[id]
    || document.edges[id]
    || document.annotations[id]
    || document.groups[id],
  );
}

export function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

export function omitKeys<T>(source: Record<string, T>, keys: ReadonlySet<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(source).filter(([id]) => !keys.has(id)));
}
