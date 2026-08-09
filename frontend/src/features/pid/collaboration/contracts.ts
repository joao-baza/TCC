import type { PidDocument } from "../domain/model";

export type CollaborationSyncStatus = "connecting" | "synced" | "reconnecting" | "unsaved";
export type CollaborationDocumentOrigin = "local" | "remote";

export interface CollaborationParticipant {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly local: boolean;
}

export interface CollaborationSnapshot {
  readonly label: "Sessão local";
  readonly status: CollaborationSyncStatus;
  readonly participants: readonly CollaborationParticipant[];
}

export interface CollaborationDocumentUpdate {
  readonly origin: CollaborationDocumentOrigin;
  readonly document: PidDocument;
  readonly revision: number;
}

export interface CollaborationFacade {
  getSnapshot(): CollaborationSnapshot;
  subscribe(listener: () => void): () => void;
  subscribeDocument(listener: (update: CollaborationDocumentUpdate) => void): () => void;
  connect(): () => void;
  setStatus(status: CollaborationSyncStatus): void;
  publishDocument(update: CollaborationDocumentUpdate): boolean;
}
