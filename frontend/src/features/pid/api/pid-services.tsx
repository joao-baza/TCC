import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Link, useRouteError } from "react-router-dom";

import type {
  PidCatalogPort,
  PidCollaborationPort,
  PidRecentDiagramsPort,
  PidServices,
} from "./contracts";
import {
  LocalPidApi,
  type LocalPidExclusiveLock,
  type LocalPidRuntime,
} from "./local-pid-api";
import { RemotePidApi } from "./remote-pid-api";
import { LocalRecentPidDiagrams } from "../recent/recent-pid-diagrams";

const pidServicesErrorMessages = Object.freeze({
  ADAPTER_NOT_CONFIGURED: "Adaptador P&ID não configurado",
  CRYPTO_UNAVAILABLE: "Runtime criptográfico indisponível para o adaptador P&ID local.",
  LOCKS_UNAVAILABLE: "Web Locks indisponível para o adaptador P&ID local.",
  STORAGE_UNAVAILABLE: "Armazenamento local indisponível para o adaptador P&ID.",
} as const);

export type PidServicesErrorCode = keyof typeof pidServicesErrorMessages;

export class PidServicesError extends Error {
  constructor(
    public readonly code: PidServicesErrorCode,
    options?: ErrorOptions,
  ) {
    super(pidServicesErrorMessages[code], options);
    this.name = "PidServicesError";
  }
}

export function isPidServicesError(value: unknown): value is PidServicesError {
  if (value instanceof PidServicesError) return true;
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { name?: unknown; code?: unknown; message?: unknown };
  return candidate.name === "PidServicesError"
    && typeof candidate.code === "string"
    && Object.hasOwn(pidServicesErrorMessages, candidate.code)
    && candidate.message === pidServicesErrorMessages[candidate.code as PidServicesErrorCode];
}
const PidServicesContext = createContext<PidServices | null>(null);

export interface CreatePidServicesOptions {
  adapter?: string;
  storage?: Storage;
  runtime?: LocalPidRuntime;
  lock?: LocalPidExclusiveLock;
  catalog?: PidCatalogPort;
  collaboration?: PidCollaborationPort;
  recent?: PidRecentDiagramsPort;
}

export interface PidServicesProviderProps {
  services: PidServices;
  children: ReactNode;
}

export function PidServicesProvider({ services, children }: PidServicesProviderProps) {
  return <PidServicesContext.Provider value={services}>{children}</PidServicesContext.Provider>;
}

export function usePidServices(): PidServices {
  const services = useContext(PidServicesContext);
  if (!services) throw new Error("usePidServices deve ser usado dentro de PidServicesProvider.");
  return services;
}

export function PidServicesBoundary({ children }: { children: ReactNode }) {
  const inherited = useContext(PidServicesContext);
  const [configured] = useState<PidServices | null>(() => inherited ?? createPidServices({
    adapter: import.meta.env.VITE_PID_ADAPTER,
  }));
  if (inherited) return children;
  return <PidServicesProvider services={configured!}>{children}</PidServicesProvider>;
}

export function PidRouteErrorPage() {
  const error = useRouteError();
  const capabilityError = isPidServicesError(error);
  useEffect(() => {
    if (!capabilityError) console.error("Falha inesperada na rota P&ID.", error);
  }, [capabilityError, error]);
  return (
    <main className="mx-auto grid min-h-screen max-w-2xl content-center gap-4 p-6">
      <h1 className="text-3xl font-semibold">Editor P&ID indisponível</h1>
      <p role="alert">
        {capabilityError ? error.message : "Não foi possível abrir o editor P&ID."}
      </p>
      {capabilityError ? (
        <p className="text-sm text-muted-foreground">
          Use um navegador atualizado e permita armazenamento local, criptografia segura e Web Locks para esta página.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tente recarregar a página. Se o problema continuar, volte ao início e tente novamente mais tarde.
        </p>
      )}
      <Link className="w-fit text-sm font-medium underline" to="/">Voltar ao DCOU</Link>
    </main>
  );
}

export function createPidServices(options: CreatePidServicesOptions | string | undefined): PidServices {
  const normalized = typeof options === "object" && options !== null
    ? options
    : { adapter: options };
  if (normalized.adapter === "remote") {
    const baseUrl = window.location.origin;
    return {
      document: new RemotePidApi(baseUrl),
      catalog: ("catalog" in normalized ? normalized.catalog : undefined) ?? unavailableCatalog,
      collaboration: ("collaboration" in normalized ? normalized.collaboration : undefined) ?? unavailableCollaboration,
      recent: new LocalRecentPidDiagrams(browserStorage(), createBrowserLocalPidRuntime().now),
    };
  }

  if (normalized.adapter !== "local") throw new PidServicesError("ADAPTER_NOT_CONFIGURED");

  const storage = normalized.storage ?? browserStorage();
  const runtime = normalized.runtime ?? createBrowserLocalPidRuntime();
  const lock = normalized.lock ?? createBrowserExclusiveLock();
  return {
    document: new LocalPidApi(storage, runtime, lock),
    catalog: normalized.catalog ?? unavailableCatalog,
    collaboration: normalized.collaboration ?? unavailableCollaboration,
    recent: normalized.recent ?? new LocalRecentPidDiagrams(storage, runtime.now),
  };
}

export function createBrowserLocalPidRuntime(): LocalPidRuntime {
  let runtimeCrypto: Crypto | undefined;
  try {
    runtimeCrypto = globalThis.crypto;
  } catch (error) {
    throw new PidServicesError("CRYPTO_UNAVAILABLE", { cause: error });
  }
  if (!runtimeCrypto?.randomUUID || !runtimeCrypto.getRandomValues || !runtimeCrypto.subtle) {
    throw new PidServicesError("CRYPTO_UNAVAILABLE");
  }
  return {
    generateUuid: () => runtimeCrypto.randomUUID(),
    randomBytes: (length) => runtimeCrypto.getRandomValues(new Uint8Array(length)),
    digest: async (value) => {
      const bytes = await runtimeCrypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    },
    now: () => new Date(),
    baseUrl: globalThis.location?.origin ?? "http://localhost",
  };
}

export function createBrowserExclusiveLock(): LocalPidExclusiveLock {
  const locks = globalThis.navigator?.locks;
  if (!locks?.request) {
    throw new PidServicesError("LOCKS_UNAVAILABLE");
  }
  return {
    runExclusive: async (key, operation) => await locks.request(
      key,
      { mode: "exclusive" },
      async () => await operation(),
    ) as Awaited<ReturnType<typeof operation>>,
  };
}

function browserStorage(): Storage {
  try {
    const storage = globalThis.localStorage;
    if (!storage) throw new PidServicesError("STORAGE_UNAVAILABLE");
    return storage;
  } catch (error) {
    if (isPidServicesError(error)) throw error;
    throw new PidServicesError("STORAGE_UNAVAILABLE", { cause: error });
  }
}

const unavailableCatalog: PidCatalogPort = {
  list: async () => {
    throw new Error("Catálogo P&ID ainda não configurado.");
  },
};

const unavailableCollaboration: PidCollaborationPort = {
  connect: () => {
    throw new Error("Colaboração P&ID ainda não configurada.");
  },
};
