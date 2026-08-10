export type PidStandard = "free";
export type PortDirection = "input" | "output" | "bidirectional";
export type ConnectionClass = "process" | "utility" | "signal";

export type PidJsonValue =
  | string
  | number
  | boolean
  | null
  | PidJsonValue[]
  | { [key: string]: PidJsonValue };

export type PidProperties = Record<string, PidJsonValue>;

export interface Point {
  x: number;
  y: number;
}

export interface PidNode {
  id: string;
  symbolKey: string;
  catalogVersion: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  tag: string;
  label: string;
  properties: PidProperties;
}

export interface PidPort {
  id: string;
  nodeId: string;
  templateKey: string;
  direction: PortDirection;
  connectionClass: ConnectionClass;
  capacity: number;
  /** Normalized anchor within the unrotated equipment bounds. */
  anchor?: Point;
}

export interface PidEdge {
  id: string;
  sourcePortId: string;
  targetPortId: string;
  connectionClass: ConnectionClass;
  route: Point[];
  tag: string;
  label: string;
  properties: PidProperties;
}

export interface PidAnnotation {
  id: string;
  kind: "text" | "note" | "callout";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  nodeId?: string;
  edgeId?: string;
  properties: PidProperties;
}

export interface PidGroup {
  id: string;
  label: string;
  memberIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  properties: PidProperties;
}

export interface PidDocument {
  schemaVersion: 1;
  id: string;
  metadata: {
    title: string;
    standard: PidStandard;
    catalogVersion: string;
    createdAt: string;
    updatedAt: string;
  };
  nodes: Record<string, PidNode>;
  ports: Record<string, PidPort>;
  edges: Record<string, PidEdge>;
  annotations: Record<string, PidAnnotation>;
  groups: Record<string, PidGroup>;
}
