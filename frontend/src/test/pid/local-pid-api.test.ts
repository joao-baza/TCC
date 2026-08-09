import { describe, expect, it } from "vitest";

import type { PidDocumentPort } from "@/features/pid/api/contracts";
import {
  LocalPidApi,
  PidLocalAdapterError,
  type LocalPidRuntime,
} from "@/features/pid/api/local-pid-api";
import { createPidServices } from "@/features/pid/api/pid-services";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const diagramId = "10000000-0000-4000-8000-000000000001";

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

function createHarness() {
  const storage = new MemoryStorage();
  const tokens = ["read-token-original", "edit-token-original", "read-token-new", "edit-token-new"];
  let tokenIndex = 0;
  let now = new Date("2026-08-09T12:00:00.000Z");
  const digests = new Map<string, string>();
  const runtime: LocalPidRuntime = {
    generateUuid: () => diagramId,
    generateToken: () => tokens[tokenIndex++]!,
    digest: async (value) => {
      if (!digests.has(value)) digests.set(value, `${String(digests.size + 1).padStart(64, "0")}`);
      return digests.get(value)!;
    },
    now: () => new Date(now),
    baseUrl: "https://dcou.test/base/ignored",
  };
  return {
    api: new LocalPidApi(storage, runtime),
    runtime,
    storage,
    setNow: (value: string) => { now = new Date(value); },
  };
}

export const pidDocumentPortContract = (createPort: () => PidDocumentPort) => {
  it("cria, grava e reabre um diagrama pelo UUID", async () => {
    const port = createPort();
    const created = await port.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    expect(created.diagramId).toMatch(UUID_PATTERN);
    expect(created.editUrl).toContain(`#access=${created.editToken}`);
    await port.save(created.diagramId, created.editToken, created.document);
    expect(await port.open(created.diagramId, created.editToken)).toMatchObject({ scope: "edit" });
  });
};

describe("contrato PidDocumentPort do adaptador local", () => {
  pidDocumentPortContract(() => createHarness().api);
});

describe("LocalPidApi", () => {
  it("persiste somente digests e usa a chave versionada exata", async () => {
    const { api, storage } = createHarness();
    const created = await api.create({ title: "  Utilidades  ", standard: "isa", participantName: "  Ana  " });

    expect(created.document.metadata.title).toBe("Utilidades");
    expect(storage.key(0)).toBe(`dcou.pid.local.v1.${diagramId}`);
    const serialized = storage.getItem(`dcou.pid.local.v1.${diagramId}`)!;
    expect(serialized).not.toContain(created.readToken);
    expect(serialized).not.toContain(created.editToken);
    expect(serialized).not.toContain("#access=");
    expect(serialized).not.toContain("https://dcou.test");
  });

  it("destaca documentos de entrada, armazenamento e saída", async () => {
    const { api, storage } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "free", participantName: "Ana" });
    const callerDocument = structuredClone(created.document);

    await api.save(diagramId, created.editToken, callerDocument);
    callerDocument.metadata.title = "Mutado pelo chamador";
    const stored = JSON.parse(storage.getItem(`dcou.pid.local.v1.${diagramId}`)!);
    stored.document.metadata.title = "Mutado fora do storage";

    const opened = await api.open(diagramId, created.editToken);
    expect(opened.document.metadata.title).toBe("Utilidades");
    expect(Object.isFrozen(opened.document)).toBe(true);
  });

  it("nega tokens errados, ausentes e revogados com o mesmo erro estável", async () => {
    const { api } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    const newReadToken = await api.regenerate(diagramId, created.editToken, "view");

    for (const token of ["", "incorreto", created.readToken]) {
      await expect(api.open(diagramId, token)).rejects.toMatchObject({
        name: "PidLocalAdapterError",
        code: "ACCESS_DENIED",
        message: "Acesso ao diagrama negado.",
      });
    }
    await expect(api.open(diagramId, newReadToken)).resolves.toMatchObject({ scope: "view" });
  });

  it("separa permissões de leitura e edição", async () => {
    const { api } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });

    await expect(api.open(diagramId, created.readToken)).resolves.toMatchObject({ scope: "view" });
    await expect(api.save(diagramId, created.readToken, created.document)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(api.regenerate(diagramId, created.readToken, "edit")).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("invalida o link de edição antigo e preserva a gestão com o novo", async () => {
    const { api } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    const newEditToken = await api.regenerate(diagramId, created.editToken, "edit");

    await expect(api.open(diagramId, created.editToken)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(api.open(diagramId, newEditToken)).resolves.toMatchObject({ scope: "edit" });
    await expect(api.softDelete(diagramId, newEditToken)).resolves.toBeUndefined();
  });

  it("nega abertura e gravação durante exclusão e restaura em até 30 dias", async () => {
    const { api, setNow } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    await api.softDelete(diagramId, created.editToken);

    await expect(api.open(diagramId, created.editToken)).rejects.toMatchObject({ code: "DOCUMENT_DELETED" });
    await expect(api.save(diagramId, created.editToken, created.document)).rejects.toMatchObject({ code: "DOCUMENT_DELETED" });
    setNow("2026-09-08T12:00:00.000Z");
    await expect(api.restore(diagramId, created.editToken)).resolves.toBeUndefined();
    await expect(api.open(diagramId, created.editToken)).resolves.toMatchObject({ scope: "edit" });
  });

  it("rejeita restauração apó 30 dias de forma determinística", async () => {
    const { api, setNow } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    await api.softDelete(diagramId, created.editToken);
    setNow("2026-09-08T12:00:00.001Z");

    await expect(api.restore(diagramId, created.editToken)).rejects.toMatchObject({ code: "RESTORE_EXPIRED" });
  });

  it("rejeita id divergente e documento inválido ao gravar", async () => {
    const { api } = createHarness();
    const created = await api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" });
    const divergent = { ...created.document, id: "20000000-0000-4000-8000-000000000002" };
    const invalid = { ...created.document, metadata: { ...created.document.metadata, title: " " } };

    await expect(api.save(diagramId, created.editToken, divergent)).rejects.toMatchObject({ code: "DOCUMENT_MISMATCH" });
    await expect(api.save(diagramId, created.editToken, invalid)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
  });

  it("converte armazenamento corrompido e falhas de quota em erros tipados", async () => {
    const corruptStorage = new MemoryStorage();
    corruptStorage.setItem(`dcou.pid.local.v1.${diagramId}`, "{inválido");
    const { runtime } = createHarness();
    const corruptApi = new LocalPidApi(corruptStorage, runtime);

    await expect(corruptApi.open(diagramId, "qualquer")).rejects.toMatchObject({ code: "STORAGE_CORRUPTED" });

    const { api, storage } = createHarness();
    storage.setItem = () => { throw new DOMException("quota", "QuotaExceededError"); };
    await expect(api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" }))
      .rejects.toBeInstanceOf(PidLocalAdapterError);
    await expect(api.create({ title: "Utilidades", standard: "iso", participantName: "Ana" }))
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
});

describe("composição de serviços P&ID", () => {
  it.each([undefined, "", "remote", "LOCAL"])(
    "recusa adaptador ausente ou não suportado: %s",
    (adapter) => expect(() => createPidServices(adapter)).toThrowError("Adaptador P&ID não configurado"),
  );

  it("seleciona local somente quando solicitado explicitamente e aceita dependências injetadas", () => {
    const { storage, runtime } = createHarness();
    expect(createPidServices({ adapter: "local", storage, runtime }).document).toBeInstanceOf(LocalPidApi);
  });
});
