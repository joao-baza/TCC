import type { PidDocument, PidGroup, PidNode, PidPort } from "./model";

export interface PidGraphIndex {
  readonly portsByNode: ReadonlyMap<string, readonly PidPort[]>;
  readonly connectionCountByPort: ReadonlyMap<string, number>;
  readonly groupsByNode: ReadonlyMap<string, readonly string[]>;
}

export function buildGraphIndex(document: PidDocument): PidGraphIndex {
  const portsByNode = new Map<string, PidPort[]>();
  const connectionCountByPort = new Map<string, number>();
  const groupsByNode = new Map<string, string[]>();

  for (const port of Object.values(document.ports)) {
    const ports = portsByNode.get(port.nodeId);
    if (ports) ports.push(port);
    else portsByNode.set(port.nodeId, [port]);
  }
  for (const edge of Object.values(document.edges)) {
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

  return { portsByNode, connectionCountByPort, groupsByNode };
}

export function boundsForNodes(nodes: readonly PidNode[]): Pick<PidGroup, "x" | "y" | "width" | "height"> {
  const nodeBounds = nodes.map(rotatedNodeBounds);
  const x = Math.min(...nodeBounds.map((bounds) => bounds.x));
  const y = Math.min(...nodeBounds.map((bounds) => bounds.y));
  const right = Math.max(...nodeBounds.map((bounds) => bounds.x + bounds.width));
  const bottom = Math.max(...nodeBounds.map((bounds) => bounds.y + bounds.height));
  return { x, y, width: right - x, height: bottom - y };
}

function rotatedNodeBounds(node: PidNode): Pick<PidNode, "x" | "y" | "width" | "height"> {
  const quarterTurns = Math.abs(node.rotation / 90) % 2;
  if (quarterTurns === 0) {
    return { x: node.x, y: node.y, width: node.width, height: node.height };
  }
  const width = node.height;
  const height = node.width;
  return {
    x: node.x + (node.width - width) / 2,
    y: node.y + (node.height - height) / 2,
    width,
    height,
  };
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
    const bounds = boundsForNodes(members);
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
