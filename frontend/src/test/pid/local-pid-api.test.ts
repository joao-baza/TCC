import { describe, expect, it, vi } from "vitest";

import {
  PidDocumentError,
  isPidDocumentError,
  type PidDocumentPort,
} from "@/features/pid/api/contracts";
import {
  LocalPidApi,
  localPidSerializedByteLimit,
  type LocalPidExclusiveLock,
  type LocalPidRuntime,
} from "@/features/pid/api/local-pid-api";
import {
  createBrowserLocalPidRuntime,
  createPidServices,
} from "@/features/pid/api/pid-services";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const diagramId = "10000000-0000-4000-8000-000000000001";
const storageKey = `dcou.pid.local.v1.${diagramId}`;

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
    expect(storage.key(0)).toBe(storageKey);
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
      api.softDelete(diagramId, created.editToken),
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
    await active.api.softDelete(diagramId, created.editToken);
    active.setNow("2026-09-08T12:00:00.000Z");
    await active.api.restore(diagramId, created.editToken);
    await expect(active.api.open(diagramId, created.editToken)).resolves.toMatchObject({ scope: "edit", revision: 3 });

    const expired = createHarness();
    const expiredCreated = await expired.api.create({ title: "Expirado", standard: "iso", participantName: "Ana" });
    await expired.api.softDelete(diagramId, expiredCreated.editToken);
    expired.setNow("2026-09-08T12:00:00.001Z");
    await expect(expired.api.restore(diagramId, expiredCreated.editToken)).rejects.toMatchObject({ code: "RESTORE_EXPIRED" });
    expect(expired.storage.getItem(storageKey)).toBeNull();
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
    expect(setItem).not.toHaveBeenCalled();
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
});
