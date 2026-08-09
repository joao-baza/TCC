import { z } from "zod";

import { toTrustedCanonicalDocument } from "../domain/invariants";
import type { PidDocument } from "../domain/model";
import { createEmptyDocument, pidDocumentSchema } from "../domain/schema";
import {
  PidDocumentError,
  type AccessScope,
  type CreatedPidDiagram,
  type CreatePidInput,
  type OpenedPidDiagram,
  type PidDocumentPort,
  type RegeneratedPidToken,
} from "./contracts";

const storagePrefix = "dcou.pid.local.v1.";
const restoreWindowMs = 30 * 24 * 60 * 60 * 1_000;
/** Local-only stage limit. It bounds parsing and stays below common browser origin quotas. */
export const localPidSerializedByteLimit = 5 * 1024 * 1024;
const uuidSchema = z.string().uuid();
const revisionSchema = z.number().int().positive();
const createInputSchema = z.object({
  title: z.string().trim().min(1),
  standard: z.enum(["isa", "iso", "free"]),
  participantName: z.string().trim().min(1),
}).strict();
const sha256DigestSchema = z.string().regex(/^[0-9a-f]{64}$/i);
const generatedTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const storedRecordSchema = z.object({
  version: z.literal(1),
  revision: revisionSchema,
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
  randomBytes(length: number): Uint8Array;
  digest(value: string): Promise<string>;
  now(): Date;
  baseUrl: string;
}

export interface LocalPidExclusiveLock {
  runExclusive<T>(key: string, operation: () => Promise<T>): Promise<T>;
}

export class LocalPidApi implements PidDocumentPort {
  constructor(
    private readonly storage: Storage,
    private readonly runtime: LocalPidRuntime,
    private readonly exclusiveLock: LocalPidExclusiveLock,
  ) {}

  async create(input: CreatePidInput): Promise<CreatedPidDiagram> {
    const parsedInput = createInputSchema.safeParse(input);
    if (!parsedInput.success) throw new PidDocumentError("INVALID_INPUT", { cause: parsedInput.error });

    const diagramId = this.generateUuid();
    const { first: readToken, second: editToken } = this.generateDistinctTokens();
    const [readTokenDigest, editTokenDigest] = await Promise.all([
      this.digestToken(readToken),
      this.digestToken(editToken),
    ]);
    if (bestEffortFixedWorkEqual(readTokenDigest, editTokenDigest)) {
      throw new PidDocumentError("CREDENTIAL_GENERATION_FAILED");
    }

    let document: PidDocument;
    try {
      document = toTrustedCanonicalDocument(createEmptyDocument(
        { title: parsedInput.data.title, standard: parsedInput.data.standard },
        { generateId: () => diagramId, now: () => this.runtime.now() },
      ));
    } catch (error) {
      throw new PidDocumentError("ADAPTER_FAILURE", { cause: error });
    }

    const viewUrl = this.accessUrl(diagramId, readToken);
    const editUrl = this.accessUrl(diagramId, editToken);
    const record: StoredPidRecord = {
      version: 1,
      revision: 1,
      diagramId,
      participantName: parsedInput.data.participantName,
      document,
      readTokenDigest,
      editTokenDigest,
      deletedAt: null,
    };

    return this.exclusiveLock.runExclusive(this.storageKey(diagramId), async () => {
      if (this.readSerialized(diagramId) !== null) throw new PidDocumentError("CONFLICT");
      this.writeRecord(record);
      return {
        diagramId,
        document,
        revision: 1,
        readToken,
        editToken,
        viewUrl,
        editUrl,
      };
    });
  }

  async open(diagramId: string, token: string): Promise<OpenedPidDiagram> {
    this.assertAccessDiagramId(diagramId);
    const digest = await this.digestAccessToken(token);
    const record = this.readRecordForAccess(diagramId);
    const scope = authorize(record, digest);
    if (record.deletedAt) throw new PidDocumentError("DOCUMENT_DELETED");
    return { scope, document: record.document, revision: record.revision };
  }

  async save(
    diagramId: string,
    token: string,
    document: PidDocument,
    expectedRevision: number,
  ): Promise<number> {
    this.assertAccessDiagramId(diagramId);
    if (!revisionSchema.safeParse(expectedRevision).success) throw new PidDocumentError("INVALID_INPUT");
    let canonical: PidDocument | null = null;
    let canonicalError: unknown;
    try {
      canonical = canonicalDocument(document);
    } catch (error) {
      canonicalError = error;
    }

    return this.exclusiveLock.runExclusive(this.storageKey(diagramId), async () => {
      const digest = await this.digestAccessToken(token);
      const record = this.readRecordForAccess(diagramId);
      authorizeEdit(record, digest);
      if (record.deletedAt) throw new PidDocumentError("DOCUMENT_DELETED");
      if (record.revision !== expectedRevision) throw new PidDocumentError("CONFLICT");
      if (!canonical) {
        throw canonicalError instanceof PidDocumentError
          ? canonicalError
          : new PidDocumentError("INVALID_DOCUMENT", { cause: canonicalError });
      }
      if (canonical.id !== diagramId) throw new PidDocumentError("DOCUMENT_MISMATCH");
      const revision = record.revision + 1;
      this.writeRecord({ ...record, revision, document: canonical });
      return revision;
    });
  }

  async regenerate(
    diagramId: string,
    editToken: string,
    scope: AccessScope,
    expectedRevision: number,
  ): Promise<RegeneratedPidToken> {
    this.assertAccessDiagramId(diagramId);
    if (scope !== "view" && scope !== "edit") throw new PidDocumentError("INVALID_INPUT");
    if (!revisionSchema.safeParse(expectedRevision).success) throw new PidDocumentError("INVALID_INPUT");

    return this.exclusiveLock.runExclusive(this.storageKey(diagramId), async () => {
      const editDigest = await this.digestAccessToken(editToken);
      const record = this.readRecordForAccess(diagramId);
      authorizeEdit(record, editDigest);
      if (record.deletedAt) throw new PidDocumentError("DOCUMENT_DELETED");
      if (record.revision !== expectedRevision) throw new PidDocumentError("CONFLICT");
      const { token, digest } = await this.generateReplacementToken(record);
      const revision = record.revision + 1;
      this.writeRecord(scope === "view"
        ? { ...record, revision, readTokenDigest: digest }
        : { ...record, revision, editTokenDigest: digest });
      return { token, revision };
    });
  }

  async softDelete(diagramId: string, editToken: string): Promise<void> {
    this.assertAccessDiagramId(diagramId);
    return this.exclusiveLock.runExclusive(this.storageKey(diagramId), async () => {
      const editDigest = await this.digestAccessToken(editToken);
      const record = this.readRecordForAccess(diagramId);
      authorizeEdit(record, editDigest);
      if (record.deletedAt) return;
      this.writeRecord({
        ...record,
        revision: record.revision + 1,
        deletedAt: this.nowIso(),
      });
    });
  }

  async restore(diagramId: string, editToken: string): Promise<void> {
    this.assertAccessDiagramId(diagramId);
    return this.exclusiveLock.runExclusive(this.storageKey(diagramId), async () => {
      const editDigest = await this.digestAccessToken(editToken);
      const record = this.readRecordForAccess(diagramId);
      authorizeEdit(record, editDigest);
      if (!record.deletedAt) return;
      const elapsed = this.now().getTime() - new Date(record.deletedAt).getTime();
      if (elapsed > restoreWindowMs) {
        this.removeRecord(diagramId);
        throw new PidDocumentError("RESTORE_EXPIRED");
      }
      this.writeRecord({ ...record, revision: record.revision + 1, deletedAt: null });
    });
  }

  private generateUuid(): string {
    try {
      return uuidSchema.parse(this.runtime.generateUuid());
    } catch (error) {
      throw new PidDocumentError("CREDENTIAL_GENERATION_FAILED", { cause: error });
    }
  }

  private generateDistinctTokens(): { first: string; second: string } {
    const first = this.generateToken();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const second = this.generateToken();
      if (second !== first) return { first, second };
    }
    throw new PidDocumentError("CREDENTIAL_GENERATION_FAILED");
  }

  private generateToken(): string {
    try {
      const bytes = this.runtime.randomBytes(32);
      if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 32) {
        throw new Error("O gerador deve retornar exatamente 32 bytes.");
      }
      return generatedTokenSchema.parse(encodeBase64Url(bytes));
    } catch (error) {
      if (error instanceof PidDocumentError) throw error;
      throw new PidDocumentError("CREDENTIAL_GENERATION_FAILED", { cause: error });
    }
  }

  private async generateReplacementToken(record: StoredPidRecord): Promise<{ token: string; digest: string }> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const token = this.generateToken();
      const digest = await this.digestToken(token);
      const matchesRead = bestEffortFixedWorkEqual(digest, record.readTokenDigest);
      const matchesEdit = bestEffortFixedWorkEqual(digest, record.editTokenDigest);
      if (!matchesRead && !matchesEdit) return { token, digest };
    }
    throw new PidDocumentError("CREDENTIAL_GENERATION_FAILED");
  }

  private async digestAccessToken(token: string): Promise<string> {
    if (!token) throw new PidDocumentError("ACCESS_DENIED");
    return this.digestToken(token);
  }

  private async digestToken(token: string): Promise<string> {
    try {
      const digest = await this.runtime.digest(token);
      return sha256DigestSchema.parse(digest).toLowerCase();
    } catch (error) {
      throw new PidDocumentError("DIGEST_FAILED", { cause: error });
    }
  }

  private assertAccessDiagramId(diagramId: string): void {
    if (!uuidSchema.safeParse(diagramId).success) throw new PidDocumentError("ACCESS_DENIED");
  }

  private readRecordForAccess(diagramId: string): StoredPidRecord {
    const serialized = this.readSerialized(diagramId);
    if (serialized === null) throw new PidDocumentError("ACCESS_DENIED");
    if (exceedsSerializedLimit(serialized)) {
      throw new PidDocumentError("STORAGE_CORRUPTED");
    }
    try {
      const parsed = storedRecordSchema.parse(JSON.parse(serialized));
      if (parsed.diagramId !== diagramId || parsed.document.id !== diagramId) {
        throw new Error("Identificador persistido divergente.");
      }
      return { ...parsed, document: toTrustedCanonicalDocument(parsed.document) };
    } catch (error) {
      throw new PidDocumentError("STORAGE_CORRUPTED", { cause: error });
    }
  }

  private readSerialized(diagramId: string): string | null {
    try {
      return this.storage.getItem(this.storageKey(diagramId));
    } catch (error) {
      throw new PidDocumentError("STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  private writeRecord(record: StoredPidRecord): void {
    let serialized: string;
    try {
      serialized = JSON.stringify(storedRecordSchema.parse(record));
    } catch (error) {
      throw new PidDocumentError("INVALID_DOCUMENT", { cause: error });
    }
    if (exceedsSerializedLimit(serialized)) {
      throw new PidDocumentError("DOCUMENT_TOO_LARGE");
    }
    try {
      this.storage.setItem(this.storageKey(record.diagramId), serialized);
    } catch (error) {
      throw new PidDocumentError("STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  private removeRecord(diagramId: string): void {
    try {
      this.storage.removeItem(this.storageKey(diagramId));
    } catch (error) {
      throw new PidDocumentError("STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  private storageKey(diagramId: string): string {
    return `${storagePrefix}${diagramId}`;
  }

  private accessUrl(diagramId: string, token: string): string {
    try {
      const url = new URL(`/pid/${diagramId}`, this.runtime.baseUrl);
      // The access capability intentionally stays in the fragment: it remains
      // client-side, but browser history/extensions can still observe it.
      url.hash = `access=${token}`;
      return url.toString();
    } catch (error) {
      throw new PidDocumentError("ADAPTER_FAILURE", { cause: error });
    }
  }

  private now(): Date {
    try {
      const value = this.runtime.now();
      if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error("Relógio inválido.");
      return value;
    } catch (error) {
      throw new PidDocumentError("ADAPTER_FAILURE", { cause: error });
    }
  }

  private nowIso(): string {
    return this.now().toISOString();
  }
}

function canonicalDocument(document: PidDocument): PidDocument {
  try {
    return toTrustedCanonicalDocument(document);
  } catch (error) {
    throw new PidDocumentError("INVALID_DOCUMENT", { cause: error });
  }
}

function authorize(record: StoredPidRecord, digest: string): AccessScope {
  const editMatches = bestEffortFixedWorkEqual(digest, record.editTokenDigest);
  const readMatches = bestEffortFixedWorkEqual(digest, record.readTokenDigest);
  if (editMatches) return "edit";
  if (readMatches) return "view";
  throw new PidDocumentError("ACCESS_DENIED");
}

function authorizeEdit(record: StoredPidRecord, digest: string): void {
  const editMatches = bestEffortFixedWorkEqual(digest, record.editTokenDigest);
  bestEffortFixedWorkEqual(digest, record.readTokenDigest);
  if (!editMatches) throw new PidDocumentError("ACCESS_DENIED");
}

/** Best-effort fixed-work comparison; JavaScript runtimes provide no true constant-time guarantee. */
function bestEffortFixedWorkEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function exceedsSerializedLimit(value: string): boolean {
  return value.length > localPidSerializedByteLimit
    || utf8ByteLength(value) > localPidSerializedByteLimit;
}

function encodeBase64Url(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    result += alphabet[first >> 2];
    result += alphabet[((first & 0b11) << 4) | ((second ?? 0) >> 4)];
    if (second !== undefined) result += alphabet[((second & 0b1111) << 2) | ((third ?? 0) >> 6)];
    if (third !== undefined) result += alphabet[third & 0b111111];
  }
  return result;
}
