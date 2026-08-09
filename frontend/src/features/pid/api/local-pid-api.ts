import { z } from "zod";

import { toTrustedCanonicalDocument } from "../domain/invariants";
import type { PidDocument } from "../domain/model";
import { createEmptyDocument, pidDocumentSchema } from "../domain/schema";
import type {
  AccessScope,
  CreatedPidDiagram,
  CreatePidInput,
  OpenedPidDiagram,
  PidDocumentPort,
} from "./contracts";

const storagePrefix = "dcou.pid.local.v1.";
const restoreWindowMs = 30 * 24 * 60 * 60 * 1_000;
const uuidSchema = z.string().uuid();
const createInputSchema = z.object({
  title: z.string().trim().min(1),
  standard: z.enum(["isa", "iso", "free"]),
  participantName: z.string().trim().min(1),
}).strict();
const sha256DigestSchema = z.string().regex(/^[0-9a-f]{64}$/i);
const storedRecordSchema = z.object({
  version: z.literal(1),
  diagramId: uuidSchema,
  participantName: z.string().trim().min(1),
  document: pidDocumentSchema,
  readTokenDigest: sha256DigestSchema,
  editTokenDigest: sha256DigestSchema,
  deletedAt: z.string().datetime({ offset: true }).nullable(),
}).strict();

type StoredPidRecord = z.infer<typeof storedRecordSchema>;

export interface LocalPidRuntime {
  generateUuid(): string;
  generateToken(): string;
  digest(value: string): Promise<string>;
  now(): Date;
  baseUrl: string;
}

export type PidLocalAdapterErrorCode =
  | "INVALID_INPUT"
  | "ACCESS_DENIED"
  | "DOCUMENT_DELETED"
  | "RESTORE_EXPIRED"
  | "DOCUMENT_MISMATCH"
  | "INVALID_DOCUMENT"
  | "STORAGE_CORRUPTED"
  | "STORAGE_UNAVAILABLE"
  | "RUNTIME_UNAVAILABLE";

const errorMessages: Record<PidLocalAdapterErrorCode, string> = {
  INVALID_INPUT: "Os dados do diagrama são inválidos.",
  ACCESS_DENIED: "Acesso ao diagrama negado.",
  DOCUMENT_DELETED: "O diagrama está excluído.",
  RESTORE_EXPIRED: "O prazo para restaurar o diagrama expirou.",
  DOCUMENT_MISMATCH: "O documento não corresponde ao diagrama.",
  INVALID_DOCUMENT: "O documento P&ID é inválido.",
  STORAGE_CORRUPTED: "Os dados locais do diagrama estão corrompidos.",
  STORAGE_UNAVAILABLE: "Não foi possível acessar o armazenamento local.",
  RUNTIME_UNAVAILABLE: "Não foi possível gerar credenciais seguras.",
};

export class PidLocalAdapterError extends Error {
  constructor(
    public readonly code: PidLocalAdapterErrorCode,
    options?: ErrorOptions,
  ) {
    super(errorMessages[code], options);
    this.name = "PidLocalAdapterError";
  }
}

export class LocalPidApi implements PidDocumentPort {
  constructor(
    private readonly storage: Storage,
    private readonly runtime: LocalPidRuntime,
  ) {}

  async create(input: CreatePidInput): Promise<CreatedPidDiagram> {
    const parsedInput = createInputSchema.safeParse(input);
    if (!parsedInput.success) throw new PidLocalAdapterError("INVALID_INPUT", { cause: parsedInput.error });

    const diagramId = this.runtime.generateUuid();
    if (!uuidSchema.safeParse(diagramId).success) throw new PidLocalAdapterError("RUNTIME_UNAVAILABLE");
    const { first: readToken, second: editToken } = this.generateDistinctTokens();
    const [readTokenDigest, editTokenDigest] = await Promise.all([
      this.digestToken(readToken),
      this.digestToken(editToken),
    ]);
    if (constantTimeEqual(readTokenDigest, editTokenDigest)) {
      throw new PidLocalAdapterError("RUNTIME_UNAVAILABLE");
    }

    let document: PidDocument;
    try {
      document = toTrustedCanonicalDocument(createEmptyDocument(
        { title: parsedInput.data.title, standard: parsedInput.data.standard },
        { generateId: () => diagramId, now: () => this.runtime.now() },
      ));
    } catch (error) {
      throw new PidLocalAdapterError("RUNTIME_UNAVAILABLE", { cause: error });
    }

    const viewUrl = this.accessUrl(diagramId, readToken);
    const editUrl = this.accessUrl(diagramId, editToken);
    this.writeRecord({
      version: 1,
      diagramId,
      participantName: parsedInput.data.participantName,
      document,
      readTokenDigest,
      editTokenDigest,
      deletedAt: null,
    });

    return {
      diagramId,
      document,
      readToken,
      editToken,
      viewUrl,
      editUrl,
    };
  }

  async open(diagramId: string, token: string): Promise<OpenedPidDiagram> {
    const record = this.readRecordForAccess(diagramId);
    const scope = await this.authorizeAny(record, token);
    if (record.deletedAt) throw new PidLocalAdapterError("DOCUMENT_DELETED");
    return { scope, document: record.document };
  }

  async save(diagramId: string, token: string, document: PidDocument): Promise<void> {
    const record = this.readRecordForAccess(diagramId);
    await this.authorizeEdit(record, token);
    if (record.deletedAt) throw new PidLocalAdapterError("DOCUMENT_DELETED");
    const canonical = canonicalDocument(document);
    if (canonical.id !== diagramId) throw new PidLocalAdapterError("DOCUMENT_MISMATCH");
    this.writeRecord({ ...record, document: canonical });
  }

  async regenerate(diagramId: string, editToken: string, scope: AccessScope): Promise<string> {
    const record = this.readRecordForAccess(diagramId);
    await this.authorizeEdit(record, editToken);
    if (record.deletedAt) throw new PidLocalAdapterError("DOCUMENT_DELETED");
    if (scope !== "view" && scope !== "edit") throw new PidLocalAdapterError("INVALID_INPUT");

    const { token, digest } = await this.generateReplacementToken(record);
    this.writeRecord(scope === "view"
      ? { ...record, readTokenDigest: digest }
      : { ...record, editTokenDigest: digest });
    return token;
  }

  async softDelete(diagramId: string, editToken: string): Promise<void> {
    const record = this.readRecordForAccess(diagramId);
    await this.authorizeEdit(record, editToken);
    if (record.deletedAt) return;
    this.writeRecord({ ...record, deletedAt: this.runtime.now().toISOString() });
  }

  async restore(diagramId: string, editToken: string): Promise<void> {
    const record = this.readRecordForAccess(diagramId);
    await this.authorizeEdit(record, editToken);
    if (!record.deletedAt) return;
    const elapsed = this.runtime.now().getTime() - new Date(record.deletedAt).getTime();
    if (elapsed > restoreWindowMs) throw new PidLocalAdapterError("RESTORE_EXPIRED");
    this.writeRecord({ ...record, deletedAt: null });
  }

  private generateDistinctTokens(): { first: string; second: string } {
    const first = this.runtime.generateToken();
    if (!first) throw new PidLocalAdapterError("RUNTIME_UNAVAILABLE");
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const second = this.runtime.generateToken();
      if (second && second !== first) return { first, second };
    }
    throw new PidLocalAdapterError("RUNTIME_UNAVAILABLE");
  }

  private async generateReplacementToken(record: StoredPidRecord): Promise<{ token: string; digest: string }> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const token = this.runtime.generateToken();
      if (!token) continue;
      const digest = await this.digestToken(token);
      if (!constantTimeEqual(digest, record.readTokenDigest)
        && !constantTimeEqual(digest, record.editTokenDigest)) return { token, digest };
    }
    throw new PidLocalAdapterError("RUNTIME_UNAVAILABLE");
  }

  private async authorizeAny(record: StoredPidRecord, token: string): Promise<AccessScope> {
    const digest = await this.digestToken(token);
    if (constantTimeEqual(digest, record.editTokenDigest)) return "edit";
    if (constantTimeEqual(digest, record.readTokenDigest)) return "view";
    throw new PidLocalAdapterError("ACCESS_DENIED");
  }

  private async authorizeEdit(record: StoredPidRecord, token: string): Promise<void> {
    const digest = await this.digestToken(token);
    if (!constantTimeEqual(digest, record.editTokenDigest)) throw new PidLocalAdapterError("ACCESS_DENIED");
  }

  private async digestToken(token: string): Promise<string> {
    if (!token) throw new PidLocalAdapterError("ACCESS_DENIED");
    try {
      const digest = await this.runtime.digest(token);
      return sha256DigestSchema.parse(digest).toLowerCase();
    } catch (error) {
      if (error instanceof PidLocalAdapterError) throw error;
      throw new PidLocalAdapterError("RUNTIME_UNAVAILABLE", { cause: error });
    }
  }

  private readRecordForAccess(diagramId: string): StoredPidRecord {
    if (!uuidSchema.safeParse(diagramId).success) throw new PidLocalAdapterError("ACCESS_DENIED");
    let serialized: string | null;
    try {
      serialized = this.storage.getItem(`${storagePrefix}${diagramId}`);
    } catch (error) {
      throw new PidLocalAdapterError("STORAGE_UNAVAILABLE", { cause: error });
    }
    if (serialized === null) throw new PidLocalAdapterError("ACCESS_DENIED");
    try {
      const parsed = storedRecordSchema.parse(JSON.parse(serialized));
      if (parsed.diagramId !== diagramId || parsed.document.id !== diagramId) {
        throw new Error("Identificador persistido divergente.");
      }
      return { ...parsed, document: toTrustedCanonicalDocument(parsed.document) };
    } catch (error) {
      throw new PidLocalAdapterError("STORAGE_CORRUPTED", { cause: error });
    }
  }

  private writeRecord(record: StoredPidRecord): void {
    try {
      this.storage.setItem(`${storagePrefix}${record.diagramId}`, JSON.stringify(record));
    } catch (error) {
      throw new PidLocalAdapterError("STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  private accessUrl(diagramId: string, token: string): string {
    try {
      const url = new URL(`/pid/${diagramId}`, this.runtime.baseUrl);
      url.hash = `access=${token}`;
      return url.toString();
    } catch (error) {
      throw new PidLocalAdapterError("RUNTIME_UNAVAILABLE", { cause: error });
    }
  }
}

function canonicalDocument(document: PidDocument): PidDocument {
  try {
    return toTrustedCanonicalDocument(document);
  } catch (error) {
    throw new PidLocalAdapterError("INVALID_DOCUMENT", { cause: error });
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}
