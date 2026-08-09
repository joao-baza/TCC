import { createContext, type ReactNode, useContext, useState } from "react";

import type {
  PidCatalogPort,
  PidCollaborationPort,
  PidServices,
} from "./contracts";
import { LocalPidApi, type LocalPidRuntime } from "./local-pid-api";

const adapterConfigurationError = "Adaptador P&ID não configurado";
const PidServicesContext = createContext<PidServices | null>(null);

export interface CreatePidServicesOptions {
  adapter?: string;
  storage?: Storage;
  runtime?: LocalPidRuntime;
  catalog?: PidCatalogPort;
  collaboration?: PidCollaborationPort;
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

export function createPidServices(options: CreatePidServicesOptions | string | undefined): PidServices {
  const normalized = typeof options === "object" && options !== null
    ? options
    : { adapter: options };
  if (normalized.adapter !== "local") throw new Error(adapterConfigurationError);

  const storage = normalized.storage ?? browserStorage();
  const runtime = normalized.runtime ?? createBrowserLocalPidRuntime();
  return {
    document: new LocalPidApi(storage, runtime),
    catalog: normalized.catalog ?? unavailableCatalog,
    collaboration: normalized.collaboration ?? unavailableCollaboration,
  };
}

export function createBrowserLocalPidRuntime(): LocalPidRuntime {
  const runtimeCrypto = globalThis.crypto;
  if (!runtimeCrypto?.randomUUID || !runtimeCrypto.getRandomValues || !runtimeCrypto.subtle) {
    throw new Error("Runtime criptográfico indisponível para o adaptador P&ID local.");
  }
  return {
    generateUuid: () => runtimeCrypto.randomUUID(),
    generateToken: () => {
      const bytes = runtimeCrypto.getRandomValues(new Uint8Array(32));
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    },
    digest: async (value) => {
      const bytes = await runtimeCrypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    },
    now: () => new Date(),
    baseUrl: globalThis.location?.origin ?? "http://localhost",
  };
}

function browserStorage(): Storage {
  if (!globalThis.localStorage) throw new Error("Armazenamento local indisponível para o adaptador P&ID.");
  return globalThis.localStorage;
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
