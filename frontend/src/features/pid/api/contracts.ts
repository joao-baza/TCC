import type { PidDocument, PidStandard } from "../domain/model";

export type AccessScope = "view" | "edit";

export const pidDocumentErrorMessages = Object.freeze({
  INVALID_INPUT: "Os dados do diagrama são inválidos.",
  ACCESS_DENIED: "Acesso ao diagrama negado.",
  DOCUMENT_DELETED: "O diagrama está excluído.",
  RESTORE_EXPIRED: "O prazo para restaurar o diagrama expirou.",
  DOCUMENT_MISMATCH: "O documento não corresponde ao diagrama.",
  INVALID_DOCUMENT: "O documento P&ID é inválido.",
  CONFLICT: "O diagrama foi alterado em outra janela.",
  DOCUMENT_TOO_LARGE: "O diagrama excede o limite de armazenamento local.",
  STORAGE_CORRUPTED: "Os dados locais do diagrama estão corrompidos.",
  STORAGE_UNAVAILABLE: "Não foi possível acessar o armazenamento local.",
  CREDENTIAL_GENERATION_FAILED: "Não foi possível gerar credenciais seguras.",
  DIGEST_FAILED: "Não foi possível proteger as credenciais do diagrama.",
  ADAPTER_FAILURE: "O adaptador P&ID não conseguiu concluir a operação.",
} as const);

export type PidDocumentErrorCode = keyof typeof pidDocumentErrorMessages;

export class PidDocumentError extends Error {
  constructor(
    public readonly code: PidDocumentErrorCode,
    options?: ErrorOptions,
  ) {
    super(pidDocumentErrorMessages[code], options);
    this.name = "PidDocumentError";
  }
}

export function isPidDocumentError(value: unknown): value is PidDocumentError {
  if (value instanceof PidDocumentError) return true;
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { name?: unknown; code?: unknown; message?: unknown };
  return candidate.name === "PidDocumentError"
    && typeof candidate.code === "string"
    && Object.hasOwn(pidDocumentErrorMessages, candidate.code)
    && candidate.message === pidDocumentErrorMessages[candidate.code as PidDocumentErrorCode];
}

export interface CreatePidInput {
  title: string;
  standard: PidStandard;
  participantName: string;
}

export interface CreatedPidDiagram {
  diagramId: string;
  document: PidDocument;
  revision: number;
  readToken: string;
  editToken: string;
  viewUrl: string;
  editUrl: string;
}

export interface OpenedPidDiagram {
  scope: AccessScope;
  document: PidDocument;
  revision: number;
}

export interface PidDocumentPort {
  create(input: CreatePidInput): Promise<CreatedPidDiagram>;
  open(diagramId: string, token: string): Promise<OpenedPidDiagram>;
  save(diagramId: string, token: string, document: PidDocument, expectedRevision: number): Promise<number>;
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
