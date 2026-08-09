import type { PidDocument, PidStandard } from "../domain/model";

export type AccessScope = "view" | "edit";

export interface CreatePidInput {
  title: string;
  standard: PidStandard;
  participantName: string;
}

export interface CreatedPidDiagram {
  diagramId: string;
  document: PidDocument;
  readToken: string;
  editToken: string;
  viewUrl: string;
  editUrl: string;
}

export interface OpenedPidDiagram {
  scope: AccessScope;
  document: PidDocument;
}

export interface PidDocumentPort {
  create(input: CreatePidInput): Promise<CreatedPidDiagram>;
  open(diagramId: string, token: string): Promise<OpenedPidDiagram>;
  save(diagramId: string, token: string, document: PidDocument): Promise<void>;
  regenerate(diagramId: string, editToken: string, scope: AccessScope): Promise<string>;
  softDelete(diagramId: string, editToken: string): Promise<void>;
  restore(diagramId: string, editToken: string): Promise<void>;
}

export interface CatalogSymbolManifest {
  key: string;
  label: string;
  category: string;
}

export interface CatalogManifest {
  standard: PidStandard;
  version: string;
  symbols: readonly CatalogSymbolManifest[];
}

export interface PidCatalogPort {
  list(standard: PidStandard): Promise<CatalogManifest>;
}

export interface CollaborationInput {
  diagramId: string;
  accessToken: string;
  participantName: string;
}

export type CollaborationStatus = "connecting" | "connected" | "disconnected";

export interface CollaborationSession {
  readonly status: CollaborationStatus;
  disconnect(): void;
  subscribe(listener: (document: PidDocument) => void): () => void;
}

export interface PidCollaborationPort {
  connect(input: CollaborationInput): CollaborationSession;
}

export interface PidServices {
  document: PidDocumentPort;
  catalog: PidCatalogPort;
  collaboration: PidCollaborationPort;
}
