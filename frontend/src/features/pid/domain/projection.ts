import type {
  PidAnnotation,
  PidDocument,
  PidEdge,
  PidGroup,
  PidJsonValue,
  PidNode,
  PidPort,
  PidProperties,
} from "./model";

export interface PidDocumentProjection {
  schemaVersion: 1;
  id: string;
  metadata: PidDocument["metadata"];
  nodes: PidNode[];
  ports: PidPort[];
  edges: PidEdge[];
  annotations: PidAnnotation[];
  groups: PidGroup[];
}

export function projectPidDocument(document: PidDocument): PidDocumentProjection {
  return {
    schemaVersion: document.schemaVersion,
    id: document.id,
    metadata: { ...document.metadata },
    nodes: sortedValues(document.nodes).map(cloneNode),
    ports: sortedValues(document.ports).map(clonePort),
    edges: sortedValues(document.edges).map(cloneEdge),
    annotations: sortedValues(document.annotations).map(cloneAnnotation),
    groups: sortedValues(document.groups).map(cloneGroup),
  };
}

function sortedValues<T extends { id: string }>(values: Record<string, T>): T[] {
  return Object.values(values).sort(compareIdsByCodeUnit);
}

function compareIdsByCodeUnit(left: { id: string }, right: { id: string }): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

function cloneNode(node: PidNode): PidNode {
  return { ...node, properties: cloneProperties(node.properties) };
}

function clonePort(port: PidPort): PidPort {
  return { ...port };
}

function cloneEdge(edge: PidEdge): PidEdge {
  return {
    ...edge,
    route: edge.route.map((point) => ({ ...point })),
    properties: cloneProperties(edge.properties),
  };
}

function cloneAnnotation(annotation: PidAnnotation): PidAnnotation {
  return { ...annotation, properties: cloneProperties(annotation.properties) };
}

function cloneGroup(group: PidGroup): PidGroup {
  return {
    ...group,
    memberIds: [...group.memberIds],
    properties: cloneProperties(group.properties),
  };
}

function cloneProperties(properties: PidProperties): PidProperties {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [key, cloneJsonValue(value)]),
  );
}

function cloneJsonValue(value: PidJsonValue): PidJsonValue {
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  if (value !== null && typeof value === "object") return cloneProperties(value);
  return value;
}
