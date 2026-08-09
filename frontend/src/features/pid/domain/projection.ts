import type {
  PidAnnotation,
  PidDocument,
  PidEdge,
  PidGroup,
  PidNode,
  PidPort,
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
    metadata: document.metadata,
    nodes: sortedValues(document.nodes),
    ports: sortedValues(document.ports),
    edges: sortedValues(document.edges),
    annotations: sortedValues(document.annotations),
    groups: sortedValues(document.groups),
  };
}

function sortedValues<T extends { id: string }>(values: Record<string, T>): T[] {
  return Object.values(values).sort((left, right) => left.id.localeCompare(right.id));
}
