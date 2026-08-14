import { describe, expect, it } from "vitest";

import {
  PID_DOCK_BREAKPOINT,
  normalizePidDockState,
  pidDockStorageKey,
  readPidDockState,
} from "@/features/pid/editor/use-pid-dock-state";

describe("estado visual dos docks P&ID", () => {
  it("usa uma chave por diagrama e inicia com canvas-first", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
      clear: () => storage.clear(),
      key: (index: number) => [...storage.keys()][index] ?? null,
      get length() { return storage.size; },
    } as Storage;

    expect(pidDockStorageKey("diagram-a")).not.toBe(pidDockStorageKey("diagram-b"));
    expect(readPidDockState("diagram-a", adapter)).toEqual({ catalogOpen: false, inspectorOpen: true });
  });

  it("descarta estado inválido sem bloquear o editor", () => {
    const storage = { getItem: () => "{invalid" } as unknown as Storage;
    expect(readPidDockState("diagram-a", storage)).toEqual({ catalogOpen: false, inspectorOpen: true });
  });

  it("mantém apenas um dock aberto no breakpoint intermediário", () => {
    const state = { catalogOpen: true, inspectorOpen: true } as const;
    expect(normalizePidDockState(state, PID_DOCK_BREAKPOINT - 1)).toEqual({ catalogOpen: false, inspectorOpen: true });
    expect(normalizePidDockState(state, PID_DOCK_BREAKPOINT)).toEqual(state);
  });

  it("permite alternar qual dock fica visível no breakpoint intermediário", () => {
    expect(normalizePidDockState({ catalogOpen: true, inspectorOpen: false }, PID_DOCK_BREAKPOINT - 1)).toEqual({ catalogOpen: true, inspectorOpen: false });
  });
});
