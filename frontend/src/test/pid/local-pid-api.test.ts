import { describe, expect, it, vi } from "vitest";

import {
  PidDocumentError,
  isPidDocumentError,
  type PidDocumentPort,
} from "@/features/pid/api/contracts";
import {
  LocalPidApi,
  localPidCleanupScanLimit,
  localPidSerializedByteLimit,
  type LocalPidExclusiveLock,
  type LocalPidRuntime,
} from "@/features/pid/api/local-pid-api";
import {
  PidServicesError,
  createBrowserExclusiveLock,
  createBrowserLocalPidRuntime,
  createPidServices,
  isPidServicesError,
} from "@/features/pid/api/pid-services";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const diagramId = "10000000-0000-4000-8000-000000000001";
const storageKey = `dcou.pid.local.v1.${diagramId}`;
const cleanupCursorKey = "dcou.pid.local.v1.cleanup-cursor";
const cleanupLockKey = "dcou.pid.local.v1.cleanup-lock";

function candidateId(index: number): string {
  return `${(0xa0000000 + index).toString(16)}-0000-4000-8000-000000000000`;
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class SerialExclusiveLock implements LocalPidExclusiveLock {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    this.tails.set(key, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}

function tokenForSeed(seed: number): string {
  const binary = String.fromCharCode(...new Uint8Array(32).fill(seed));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

interface HarnessOverrides {
  byteSeeds?: number[];
  digest?: (value: string) => Promise<string>;
  lock?: LocalPidExclusiveLock;
  storage?: MemoryStorage;
}

function createHarness(overrides: HarnessOverrides = {}) {
  const storage = overrides.storage ?? new MemoryStorage();
  const lock = overrides.lock ?? new SerialExclusiveLock();
  const byteSeeds = overrides.byteSeeds ?? [1, 2, 3, 4, 5, 6, 7, 8];
  let byteIndex = 0;
  let now = new Date("2026-08-09T12:00:00.000Z");
  const digests = new Map<string, string>();
  const runtime: LocalPidRuntime = {
    generateUuid: () => diagramId,
    randomBytes: () => new Uint8Array(32).fill(byteSeeds[byteIndex++] ?? 250),
    digest: overrides.digest ?? (async (value) => {
      if (!digests.has(value)) digests.set(value, `${String(digests.size + 1).padStart(64, "0")}`);
      return digests.get(value)!;
    }),
    now: () => new Date(now),
    baseUrl: "https://dcou.test/base/ignored",
  };
  return {
    api: new LocalPidApi(storage, runtime, lock),
    secondApi: new LocalPidApi(storage, runtime, lock),
    lock,
    runtime,
    storage,
    setNow: (value: string) => { now = new Date(value); },
  };
}

export const pidDocumentPortContract = (createPort: () => PidDocumentPort) => {
  it("cria, grava e reabre um diagrama pelo UUID e revisão", async () => {
    const port = createPort();
    const created = await port.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    expect(created.diagramId).toMatch(UUID_PATTERN);
    expect(created.revision).toBe(1);
    expect(created.editUrl).toContain(`#access=${created.editToken}`);
    const revision = await port.save(created.diagramId, created.editToken, created.document, created.revision);
    expect(revision).toBe(2);
    expect(await port.open(created.diagramId, created.editToken)).toMatchObject({ scope: "edit", revision: 2 });
  });
};

describe("contrato PidDocumentPort do adaptador local", () => {
  pidDocumentPortContract(() => createHarness().api);
});

describe("LocalPidApi", () => {
  it("persiste somente digests, revisão e a chave versionada exata", async () => {
    const { api, storage } = createHarness();
    const created = await api.create({ title: "  Utilidades  ", standard: "isa", participantName: "  Ana  " });

    expect(created.document.metadata.title).toBe("Utilidades");
    expect(created.readToken).toMatch(TOKEN_PATTERN);
    expect(created.editToken).toMatch(TOKEN_PATTERN);
    expect(created.readToken).not.toBe(created.editToken);
    expect(storage.getItem(cleanupCursorKey)).not.toBeNull();
    expect(storage.getItem(storageKey)).not.toBeNull();
    const serialized = storage.getItem(storageKey)!;
    expect(serialized).not.toContain(created.readToken);
    expect(serialized).not.toContain(created.editToken);
    expect(serialized).not.toContain("#access=");
    expect(serialized).not.toContain("https://dcou.test");
    expect(JSON.parse(serialized)).toMatchObject({ revision: 1 });
  });

  it("destaca documentos de entrada, armazenamento e saída", async () => {
    const { api, storage } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "free", participantName: "Ana" });
    const callerDocument = structuredClone(created.document);

    await api.save(diagramId, created.editToken, callerDocument, created.revision);
    callerDocument.metadata.title = "Mutado pelo chamador";
    const stored = JSON.parse(storage.getItem(storageKey)!);
    stored.document.metadata.title = "Mutado fora do storage";

    const opened = await api.open(diagramId, created.editToken);
    expect(opened.document.metadata.title).toBe("Utilidades");
    expect(Object.isFrozen(opened.document)).toBe(true);
  });

  it("nega tokens errados, ausentes e revogados com o mesmo erro compartilhado", async () => {
    const { api } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    const regenerated = await api.regenerate(
      diagramId,
      created.editToken,
      "view",
      created.revision,
    );

    for (const token of ["", tokenForSeed(99), created.readToken]) {
      await expect(api.open(diagramId, token)).rejects.toMatchObject({
        name: "PidDocumentError",
        code: "ACCESS_DENIED",
        message: "Acesso ao diagrama negado.",
      });
    }
    expect(regenerated.revision).toBe(2);
    await expect(api.open(diagramId, regenerated.token)).resolves.toMatchObject({ scope: "view", revision: 2 });
  });

  it("expõe erro compartilhado com type guard estável", () => {
    const error = new PidDocumentError("CONFLICT");
    expect(isPidDocumentError(error)).toBe(true);
    expect(isPidDocumentError({ code: "CONFLICT" })).toBe(false);
    expect(error.message).toBe("O diagrama foi alterado em outra janela.");
  });

  it("separa permissões de leitura e edição", async () => {
    const { api } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });

    await expect(api.open(diagramId, created.readToken)).resolves.toMatchObject({ scope: "view" });
    await expect(api.save(diagramId, created.readToken, created.document, 1)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(api.regenerate(diagramId, created.readToken, "edit", created.revision)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("faz uma de duas gravações concorrentes vencer e rejeita a revisão obsoleta", async () => {
    const { api, secondApi } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    const first = structuredClone(created.document);
    first.metadata.title = "Primeira janela";
    const second = structuredClone(created.document);
    second.metadata.title = "Segunda janela";

    const results = await Promise.allSettled([
      api.save(diagramId, created.editToken, first, created.revision),
      secondApi.save(diagramId, created.editToken, second, created.revision),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT" },
    });
    expect((await api.open(diagramId, created.editToken)).revision).toBe(2);
  });

  it("serializa rotações concorrentes sem devolver token já inválido", async () => {
    const { api, secondApi } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });

    const results = await Promise.allSettled([
      api.regenerate(diagramId, created.editToken, "edit", created.revision),
      secondApi.regenerate(diagramId, created.editToken, "edit", created.revision),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: "ACCESS_DENIED" });
    expect(fulfilled[0].value.revision).toBe(2);
    await expect(api.open(diagramId, fulfilled[0].value.token)).resolves.toMatchObject({ scope: "edit", revision: 2 });
    await expect(api.open(diagramId, created.editToken)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("faz uma de duas rotações concorrentes de leitura vencer sem devolver token inválido", async () => {
    const { api, secondApi } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });

    const results = await Promise.allSettled([
      api.regenerate(diagramId, created.editToken, "view", created.revision),
      secondApi.regenerate(diagramId, created.editToken, "view", created.revision),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: "CONFLICT" });
    expect(fulfilled[0].value.revision).toBe(2);
    await expect(api.open(diagramId, fulfilled[0].value.token)).resolves.toMatchObject({
      scope: "view",
      revision: 2,
    });
    await expect(api.open(diagramId, created.readToken)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("impede gravação concorrente de desfazer exclusão", async () => {
    const { api, secondApi, storage } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    const changed = structuredClone(created.document);
    changed.metadata.title = "Não deve reviver";

    const [deletion, save] = await Promise.allSettled([
      api.softDelete(diagramId, created.editToken, created.revision),
      secondApi.save(diagramId, created.editToken, changed, created.revision),
    ]);

    expect(deletion.status).toBe("fulfilled");
    expect(save).toMatchObject({ status: "rejected", reason: { code: "DOCUMENT_DELETED" } });
    expect(JSON.parse(storage.getItem(storageKey)!)).toMatchObject({
      revision: 2,
      deletedAt: "2026-08-09T12:00:00.000Z",
      document: { metadata: { title: "Utilidades" } },
    });
  });

  it("restaura dentro de 30 dias e elimina definitivamente registro expirado", async () => {
    const active = createHarness();
    const created = await active.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    expect(await active.api.softDelete(diagramId, created.editToken, created.revision)).toBe(2);
    active.setNow("2026-09-08T12:00:00.000Z");
    expect(await active.api.restore(diagramId, created.editToken, 2)).toBe(3);
    await expect(active.api.open(diagramId, created.editToken)).resolves.toMatchObject({ scope: "edit", revision: 3 });

    const expired = createHarness();
    const expiredCreated = await expired.api.create({ title: "Expirado", standard: "iso", participantName: "Ana" });
    await expired.api.softDelete(diagramId, expiredCreated.editToken, expiredCreated.revision);
    expired.setNow("2026-09-08T12:00:00.001Z");
    await expect(expired.api.restore(diagramId, expiredCreated.editToken, 2)).rejects.toMatchObject({ code: "RESTORE_EXPIRED" });
    expect(expired.storage.getItem(storageKey)).toBeNull();
  });

  it("rejeita exclusão obsoleta apó gravação ou rotação mais nova", async () => {
    const saved = createHarness();
    const savedCreated = await saved.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    await saved.api.save(diagramId, savedCreated.editToken, savedCreated.document, savedCreated.revision);
    await expect(saved.api.softDelete(diagramId, savedCreated.editToken, savedCreated.revision))
      .rejects.toMatchObject({ code: "CONFLICT" });

    const rotated = createHarness();
    const rotatedCreated = await rotated.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    await rotated.api.regenerate(diagramId, rotatedCreated.editToken, "view", rotatedCreated.revision);
    await expect(rotated.api.softDelete(diagramId, rotatedCreated.editToken, rotatedCreated.revision))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("serializa nova exclusão e restauração concorrentes nas duas ordens", async () => {
    const deleteFirst = createHarness();
    const firstCreated = await deleteFirst.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    const deletedRevision = await deleteFirst.api.softDelete(
      diagramId,
      firstCreated.editToken,
      firstCreated.revision,
    );
    expect(await deleteFirst.api.softDelete(diagramId, firstCreated.editToken, deletedRevision)).toBe(3);
    await expect(deleteFirst.secondApi.restore(diagramId, firstCreated.editToken, deletedRevision))
      .rejects.toMatchObject({ code: "CONFLICT" });

    const restoreFirst = createHarness();
    const secondCreated = await restoreFirst.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    const secondDeletedRevision = await restoreFirst.api.softDelete(
      diagramId,
      secondCreated.editToken,
      secondCreated.revision,
    );
    expect(await restoreFirst.api.restore(diagramId, secondCreated.editToken, secondDeletedRevision)).toBe(3);
    await expect(restoreFirst.secondApi.softDelete(diagramId, secondCreated.editToken, secondDeletedRevision))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("limpa proativamente apenas exclusões expiradas do namespace", async () => {
    const harness = createHarness();
    const created = await harness.api.create({ title: "Expirado", standard: "iso", participantName: "Ana" });
    await harness.api.softDelete(diagramId, created.editToken, created.revision);
    const expired = JSON.parse(harness.storage.getItem(storageKey)!);
    const recentId = "20000000-0000-4000-8000-000000000002";
    const activeId = "30000000-0000-4000-8000-000000000003";
    const corruptId = "40000000-0000-4000-8000-000000000004";
    const newId = "50000000-0000-4000-8000-000000000005";
    const cloneFor = (id: string, deletedAt: string | null) => JSON.stringify({
      ...expired,
      diagramId: id,
      deletedAt,
      document: { ...expired.document, id },
    });
    harness.storage.setItem(`dcou.pid.local.v1.${recentId}`, cloneFor(recentId, "2026-08-20T12:00:00.000Z"));
    harness.storage.setItem(`dcou.pid.local.v1.${activeId}`, cloneFor(activeId, null));
    harness.storage.setItem(`dcou.pid.local.v1.${corruptId}`, "{corrompido");
    harness.storage.setItem("outra.aplicacao", "preservar");
    harness.setNow("2026-09-09T12:00:00.000Z");
    harness.runtime.generateUuid = () => newId;

    await harness.api.create({ title: "Novo", standard: "iso", participantName: "Ana" });

    expect(harness.storage.getItem(storageKey)).toBeNull();
    expect(harness.storage.getItem(`dcou.pid.local.v1.${recentId}`)).not.toBeNull();
    expect(harness.storage.getItem(`dcou.pid.local.v1.${activeId}`)).not.toBeNull();
    expect(harness.storage.getItem(`dcou.pid.local.v1.${corruptId}`)).toBe("{corrompido");
    expect(harness.storage.getItem("outra.aplicacao")).toBe("preservar");
  });

  it("limita cada varredura proativa a uma quantidade fixa de chaves", async () => {
    const harness = createHarness();
    for (let index = 0; index < localPidCleanupScanLimit + 3; index += 1) {
      const id = `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000000`;
      harness.storage.setItem(`dcou.pid.local.v1.${id}`, "{corrompido");
    }
    const runExclusive = vi.spyOn(harness.lock, "runExclusive");
    const storageKeyAt = vi.spyOn(harness.storage, "key");
    harness.runtime.generateUuid = () => "60000000-0000-4000-8000-000000000006";

    await harness.api.create({ title: "Novo", standard: "iso", participantName: "Ana" });

    expect(storageKeyAt).toHaveBeenCalledTimes(localPidCleanupScanLimit);
    expect(runExclusive).toHaveBeenCalledTimes(localPidCleanupScanLimit + 2);
  });

  it("persiste o cursor numérico entre reconstruções e alcança o fim sem enumerar toda a origem", async () => {
    const harness = createHarness();
    const created = await harness.api.create({ title: "Modelo", standard: "iso", participantName: "Ana" });
    await harness.api.softDelete(diagramId, created.editToken, created.revision);
    const deleted = JSON.parse(harness.storage.getItem(storageKey)!);
    harness.storage.removeItem(storageKey);

    const unrelatedCount = 2_048;
    for (let index = 0; index < unrelatedCount; index += 1) {
      harness.storage.setItem(`outra.aplicacao.${index.toString().padStart(4, "0")}`, "preservar");
    }
    const expiredTailId = "ffffffff-0000-4000-8000-000000000000";
    harness.storage.setItem(`dcou.pid.local.v1.${expiredTailId}`, JSON.stringify({
      ...deleted,
      diagramId: expiredTailId,
      document: { ...deleted.document, id: expiredTailId },
    }));
    harness.storage.setItem(cleanupCursorKey, "cursor-corrompido");
    harness.setNow("2026-09-09T12:00:00.000Z");
    let randomSeed = 20;
    harness.runtime.randomBytes = () => new Uint8Array(32).fill(randomSeed++);

    const storageKeyAt = vi.spyOn(harness.storage, "key");
    const maxPasses = Math.ceil((unrelatedCount + localPidCleanupScanLimit * 2) / localPidCleanupScanLimit);
    for (let pass = 0; pass < maxPasses; pass += 1) {
      storageKeyAt.mockClear();
      harness.runtime.generateUuid = () => `${(0xe1000000 + pass).toString(16)}-0000-4000-8000-000000000000`;
      const reconstructed = new LocalPidApi(harness.storage, harness.runtime, harness.lock);
      await reconstructed.create({ title: `Novo ${pass}`, standard: "iso", participantName: "Ana" });
      expect(storageKeyAt.mock.calls.length).toBeLessThanOrEqual(localPidCleanupScanLimit);
      if (harness.storage.getItem(`dcou.pid.local.v1.${expiredTailId}`) === null) break;
    }

    expect(harness.storage.getItem(`dcou.pid.local.v1.${expiredTailId}`)).toBeNull();
    expect(JSON.parse(harness.storage.getItem(cleanupCursorKey)!)).toEqual({
      version: 1,
      nextSlot: expect.any(Number),
    });
    expect(harness.storage.getItem("outra.aplicacao.0000")).toBe("preservar");
    expect(harness.storage.getItem("outra.aplicacao.2047")).toBe("preservar");
  });

  it("remove o expirado antes de repetir a gravação do cursor quando a quota está cheia", async () => {
    const harness = createHarness();
    const created = await harness.api.create({ title: "Expirado", standard: "iso", participantName: "Ana" });
    await harness.api.softDelete(diagramId, created.editToken, created.revision);
    harness.storage.removeItem(cleanupCursorKey);
    harness.setNow("2026-09-09T12:00:00.000Z");
    harness.runtime.generateUuid = () => "d1000000-0000-4000-8000-000000000000";

    const setItem = harness.storage.setItem.bind(harness.storage);
    vi.spyOn(harness.storage, "setItem").mockImplementation((key, value) => {
      if (key === cleanupCursorKey && harness.storage.getItem(storageKey) !== null) {
        throw new DOMException("quota", "QuotaExceededError");
      }
      setItem(key, value);
    });

    const reconstructed = new LocalPidApi(harness.storage, harness.runtime, harness.lock);
    await expect(reconstructed.create({ title: "Novo", standard: "iso", participantName: "Ana" }))
      .resolves.toMatchObject({ diagramId: "d1000000-0000-4000-8000-000000000000" });
    expect(harness.storage.getItem(storageKey)).toBeNull();
    expect(JSON.parse(harness.storage.getItem(cleanupCursorKey)!)).toEqual({
      version: 1,
      nextSlot: expect.any(Number),
    });

    const unavailable = createHarness();
    const unavailableCreated = await unavailable.api.create({
      title: "Expirado",
      standard: "iso",
      participantName: "Ana",
    });
    await unavailable.api.softDelete(diagramId, unavailableCreated.editToken, unavailableCreated.revision);
    unavailable.storage.removeItem(cleanupCursorKey);
    unavailable.setNow("2026-09-09T12:00:00.000Z");
    const unavailableSetItem = unavailable.storage.setItem.bind(unavailable.storage);
    vi.spyOn(unavailable.storage, "setItem").mockImplementation((key, value) => {
      if (key === cleanupCursorKey) throw new DOMException("quota", "QuotaExceededError");
      unavailableSetItem(key, value);
    });

    await expect(unavailable.api.create({ title: "Novo", standard: "iso", participantName: "Ana" }))
      .rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
    expect(unavailable.storage.getItem(storageKey)).toBeNull();
  });

  it("recalcula o próximo slot quando a exclusão desloca os índices da origem", async () => {
    const harness = createHarness();
    const created = await harness.api.create({ title: "Modelo", standard: "iso", participantName: "Ana" });
    await harness.api.softDelete(diagramId, created.editToken, created.revision);
    const deleted = JSON.parse(harness.storage.getItem(storageKey)!);
    const expiredId = "b1000000-0000-4000-8000-000000000000";

    harness.storage.clear();
    harness.storage.setItem(`dcou.pid.local.v1.${expiredId}`, JSON.stringify({
      ...deleted,
      diagramId: expiredId,
      document: { ...deleted.document, id: expiredId },
    }));
    for (let index = 0; index < 40; index += 1) {
      harness.storage.setItem(`outra.aplicacao.${index.toString().padStart(2, "0")}`, "preservar");
    }
    harness.storage.setItem(cleanupCursorKey, JSON.stringify({ version: 1, nextSlot: 0 }));
    harness.setNow("2026-09-09T12:00:00.000Z");
    harness.runtime.generateUuid = () => "b2000000-0000-4000-8000-000000000000";

    await harness.api.create({ title: "Novo", standard: "iso", participantName: "Ana" });

    expect(harness.storage.getItem(`dcou.pid.local.v1.${expiredId}`)).toBeNull();
    expect(JSON.parse(harness.storage.getItem(cleanupCursorKey)!)).toEqual({ version: 1, nextSlot: 31 });
  });

  it("coordena o avanço do cursor entre duas abas", async () => {
    const harness = createHarness();
    const candidateKeys = new Set<string>();
    for (let index = 0; index < localPidCleanupScanLimit * 2; index += 1) {
      const key = `dcou.pid.local.v1.${candidateId(index)}`;
      candidateKeys.add(key);
      harness.storage.setItem(key, "{corrompido");
    }
    const runExclusive = vi.spyOn(harness.lock, "runExclusive");
    const firstRuntime = { ...harness.runtime, generateUuid: () => "f1000000-0000-4000-8000-000000000000" };
    const secondRuntime = { ...harness.runtime, generateUuid: () => "f2000000-0000-4000-8000-000000000000" };
    const firstTab = new LocalPidApi(harness.storage, firstRuntime, harness.lock);
    const secondTab = new LocalPidApi(harness.storage, secondRuntime, harness.lock);

    await Promise.all([
      firstTab.create({ title: "Aba 1", standard: "iso", participantName: "Ana" }),
      secondTab.create({ title: "Aba 2", standard: "iso", participantName: "Bia" }),
    ]);

    const inspected = runExclusive.mock.calls
      .map(([key]) => key)
      .filter((key) => candidateKeys.has(key));
    expect(inspected).toHaveLength(localPidCleanupScanLimit * 2);
    expect(new Set(inspected)).toHaveLength(localPidCleanupScanLimit * 2);
    expect(runExclusive.mock.calls.filter(([key]) => key === cleanupLockKey)).toHaveLength(2);
  });

  it("rejeita id divergente e documento inválido ao gravar", async () => {
    const { api } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    const divergent = { ...created.document, id: "20000000-0000-4000-8000-000000000002" };
    const invalid = { ...created.document, metadata: { ...created.document.metadata, title: " " } };

    await expect(api.save(diagramId, created.editToken, divergent, 1)).rejects.toMatchObject({ code: "DOCUMENT_MISMATCH" });
    await expect(api.save(diagramId, created.editToken, invalid, 1)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
  });

  it("limita registros a 5 MiB antes de chamar Storage.setItem", async () => {
    const { api, storage } = createHarness();
    const setItem = vi.spyOn(storage, "setItem");

    await expect(api.create({
      title: "x".repeat(5 * 1024 * 1024),
      standard: "iso",
      participantName: "Ana",
    })).rejects.toMatchObject({ code: "DOCUMENT_TOO_LARGE" });
    expect(setItem).toHaveBeenCalledWith(cleanupCursorKey, expect.any(String));
    expect(storage.getItem(storageKey)).toBeNull();
  });

  it("converte armazenamento corrompido, leitura e quota em erros tipados", async () => {
    const corruptStorage = new MemoryStorage();
    corruptStorage.setItem(storageKey, "{inválido");
    const { runtime, lock } = createHarness();
    const corruptApi = new LocalPidApi(corruptStorage, runtime, lock);
    await expect(corruptApi.open(diagramId, tokenForSeed(10))).rejects.toMatchObject({ code: "STORAGE_CORRUPTED" });

    const oversizedStorage = new MemoryStorage();
    oversizedStorage.setItem(storageKey, "x".repeat(localPidSerializedByteLimit + 1));
    const oversizedApi = new LocalPidApi(oversizedStorage, runtime, lock);
    await expect(oversizedApi.open(diagramId, tokenForSeed(10))).rejects.toMatchObject({ code: "STORAGE_CORRUPTED" });

    const unavailable = createHarness();
    unavailable.storage.getItem = () => { throw new DOMException("denied", "SecurityError"); };
    await expect(unavailable.api.open(diagramId, tokenForSeed(10))).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });

    const quota = createHarness();
    quota.storage.setItem = () => { throw new DOMException("quota", "QuotaExceededError"); };
    await expect(quota.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" }))
      .rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
  });

  it.each([
    ["título", { title: " ", standard: "iso", participantName: "Ana" }],
    ["participante", { title: "Utilidades", standard: "iso", participantName: " " }],
    ["norma", { title: "Utilidades", standard: "din", participantName: "Ana" }],
  ])("valida %s na criação", async (_field, input) => {
    const { api } = createHarness();
    await expect(api.create(input as never)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("rejeita bytes curtos ou malformados na geração de credenciais", async () => {
    const short = createHarness();
    short.runtime.randomBytes = () => new Uint8Array(31);
    await expect(short.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" }))
      .rejects.toMatchObject({ code: "CREDENTIAL_GENERATION_FAILED" });

    const malformed = createHarness();
    malformed.runtime.randomBytes = () => [1, 2, 3] as unknown as Uint8Array;
    await expect(malformed.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" }))
      .rejects.toMatchObject({ code: "CREDENTIAL_GENERATION_FAILED" });
  });

  it("limita tentativas quando o gerador repete credenciais", async () => {
    const repeated = createHarness({ byteSeeds: new Array(12).fill(7) });
    await expect(repeated.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" }))
      .rejects.toMatchObject({ code: "CREDENTIAL_GENERATION_FAILED" });
  });

  it("rejeita colisão de digest entre credenciais distintas", async () => {
    const collision = createHarness({ digest: async () => "0".repeat(64) });
    await expect(collision.api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" }))
      .rejects.toMatchObject({ code: "CREDENTIAL_GENERATION_FAILED" });
  });

  it("distingue falha de digest da falha de geração", async () => {
    const { api } = createHarness({ digest: async () => { throw new Error("subtle indisponível"); } });
    await expect(api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" }))
      .rejects.toMatchObject({ code: "DIGEST_FAILED" });
  });

  it("produz bytes seguros no runtime do navegador e tokens com 32 bytes", async () => {
    const runtime = createBrowserLocalPidRuntime();
    expect(runtime.randomBytes(32)).toHaveLength(32);
    const api = new LocalPidApi(new MemoryStorage(), runtime, new SerialExclusiveLock());
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    expect(created.readToken).toMatch(TOKEN_PATTERN);
    expect(created.editToken).toMatch(TOKEN_PATTERN);
  });
});

describe("composição de serviços P&ID", () => {
  it.each([undefined, "", "remote", "LOCAL"])(
    "recusa adaptador ausente ou não suportado: %s",
    (adapter) => expect(() => createPidServices(adapter)).toThrowError("Adaptador P&ID não configurado"),
  );

  it("seleciona local somente quando solicitado explicitamente e aceita dependências injetadas", () => {
    const { storage, runtime, lock } = createHarness();
    expect(createPidServices({ adapter: "local", storage, runtime, lock }).document).toBeInstanceOf(LocalPidApi);
  });

  it("expõe falhas de configuração e capacidades do navegador como erro tipado", () => {
    const adapterError = (() => {
      try {
        createPidServices(undefined);
      } catch (error) {
        return error;
      }
    })();
    expect(adapterError).toBeInstanceOf(PidServicesError);
    expect(isPidServicesError(adapterError)).toBe(true);
    expect(adapterError).toMatchObject({ code: "ADAPTER_NOT_CONFIGURED" });

    const descriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    try {
      expect(() => createBrowserExclusiveLock()).toThrowError(PidServicesError);
      expect(() => createBrowserExclusiveLock()).toThrowError(
        "Web Locks indisponível para o adaptador P&ID local.",
      );
    } finally {
      if (descriptor) Object.defineProperty(navigator, "locks", descriptor);
      else Reflect.deleteProperty(navigator, "locks");
    }

    const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: undefined });
    try {
      expect(() => createPidServices({ adapter: "local" })).toThrow(expect.objectContaining({
        name: "PidServicesError",
        code: "STORAGE_UNAVAILABLE",
      }));
    } finally {
      if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }

    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
    try {
      expect(() => createPidServices({
        adapter: "local",
        storage: new MemoryStorage(),
        lock: new SerialExclusiveLock(),
      })).toThrow(expect.objectContaining({
        name: "PidServicesError",
        code: "CRYPTO_UNAVAILABLE",
      }));
    } finally {
      if (cryptoDescriptor) Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
      else Reflect.deleteProperty(globalThis, "crypto");
    }
  });

  it("serializa duas instâncias de lock do navegador pelo mesmo gerenciador", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
    const tails = new Map<string, Promise<void>>();
    const manager = {
      request: async <T>(
        name: string,
        _options: LockOptions,
        callback: () => Promise<T>,
      ): Promise<T> => {
        const previous = tails.get(name) ?? Promise.resolve();
        let release!: () => void;
        const current = new Promise<void>((resolve) => { release = resolve; });
        const tail = previous.then(() => current);
        tails.set(name, tail);
        await previous;
        try {
          return await callback();
        } finally {
          release();
          if (tails.get(name) === tail) tails.delete(name);
        }
      },
    };
    Object.defineProperty(navigator, "locks", { configurable: true, value: manager });
    try {
      const first = createBrowserExclusiveLock();
      const second = createBrowserExclusiveLock();
      const events: string[] = [];
      let releaseFirst!: () => void;
      const gate = new Promise<void>((resolve) => { releaseFirst = resolve; });
      const firstOperation = first.runExclusive("diagrama", async () => {
        events.push("primeiro-início");
        await gate;
        events.push("primeiro-fim");
      });
      const secondOperation = second.runExclusive("diagrama", async () => {
        events.push("segundo");
      });

      await vi.waitFor(() => expect(events).toEqual(["primeiro-início"]));
      releaseFirst();
      await Promise.all([firstOperation, secondOperation]);
      expect(events).toEqual(["primeiro-início", "primeiro-fim", "segundo"]);
    } finally {
      if (descriptor) Object.defineProperty(navigator, "locks", descriptor);
      else Reflect.deleteProperty(navigator, "locks");
    }
  });
});
