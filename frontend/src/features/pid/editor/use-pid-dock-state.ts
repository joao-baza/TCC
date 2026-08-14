import { useCallback, useEffect, useState } from "react";

export type PidDock = "catalog" | "inspector";

export interface PidDockState {
  readonly catalogOpen: boolean;
  readonly inspectorOpen: boolean;
}

export const PID_DOCK_BREAKPOINT = 1280;
const STORAGE_PREFIX = "dcou.pid.docks.v1:";
const DEFAULT_STATE: PidDockState = Object.freeze({ catalogOpen: false, inspectorOpen: true });

export function pidDockStorageKey(diagramId: string): string {
  return `${STORAGE_PREFIX}${diagramId}`;
}

export function readPidDockState(diagramId: string, storage: Storage | undefined = getSessionStorage()): PidDockState {
  if (!storage || !diagramId) return { ...DEFAULT_STATE };
  try {
    const parsed: unknown = JSON.parse(storage.getItem(pidDockStorageKey(diagramId)) ?? "null");
    if (!isPidDockState(parsed)) return { ...DEFAULT_STATE };
    return parsed;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function normalizePidDockState(state: PidDockState, viewportWidth: number): PidDockState {
  if (viewportWidth >= PID_DOCK_BREAKPOINT || !(state.catalogOpen && state.inspectorOpen)) return state;
  return { ...state, catalogOpen: false };
}

export function usePidDockState(diagramId: string, viewportWidth: number) {
  const [state, setState] = useState<PidDockState>(() => readPidDockState(diagramId));

  useEffect(() => {
    setState(normalizePidDockState(readPidDockState(diagramId), viewportWidth));
  }, [diagramId, viewportWidth]);

  useEffect(() => {
    const storage = getSessionStorage();
    if (!storage || !diagramId) return;
    try {
      storage.setItem(pidDockStorageKey(diagramId), JSON.stringify(state));
    } catch {
      // Dock preferences are optional presentation state; storage failure must not block editing.
    }
  }, [diagramId, state]);

  const setDockOpen = useCallback((dock: PidDock, open: boolean) => {
    setState((current) => {
      const next = dock === "catalog"
        ? {
          ...current,
          catalogOpen: open,
          inspectorOpen: open && viewportWidth < PID_DOCK_BREAKPOINT ? false : current.inspectorOpen,
        }
        : {
          ...current,
          inspectorOpen: open,
          catalogOpen: open && viewportWidth < PID_DOCK_BREAKPOINT ? false : current.catalogOpen,
        };
      return normalizePidDockState(next, viewportWidth);
    });
  }, [viewportWidth]);

  const toggleDock = useCallback((dock: PidDock) => {
    setDockOpen(dock, dock === "catalog" ? !state.catalogOpen : !state.inspectorOpen);
  }, [setDockOpen, state.catalogOpen, state.inspectorOpen]);

  return { ...state, setDockOpen, toggleDock } as const;
}

function isPidDockState(value: unknown): value is PidDockState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.catalogOpen === "boolean" && typeof candidate.inspectorOpen === "boolean";
}

function getSessionStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}
