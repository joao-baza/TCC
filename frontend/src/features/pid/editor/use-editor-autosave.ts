import { useCallback, useEffect, useRef, useState } from "react";

import { isPidDocumentError, type PidDocumentPort } from "../api/contracts";
import type { EditorStore } from "./editor-store";

export type EditorSaveState = "Sincronizado" | "Salvando" | "Não salvo";

export interface EditorAutosaveController {
  readonly state: EditorSaveState;
  readonly error: string | null;
  readonly conflict: boolean;
  markLocalChange(): void;
  retry(): void;
  flush(): Promise<number>;
  suspend(): Promise<number>;
  resumeLocal(revision: number): number;
  resumeRemote(revision: number): void;
}

export function useEditorAutosave(input: {
  readonly diagramId: string;
  readonly editToken: string;
  readonly revision: number;
  readonly store: EditorStore;
  readonly documentPort: PidDocumentPort;
  readonly editable: boolean;
  readonly onRevision: (revision: number) => void;
}): EditorAutosaveController {
  const latest = useRef(input);
  latest.current = input;
  const revisionRef = useRef(input.revision);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);
  const inFlightRef = useRef(false);
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  const flushOnUnmountRef = useRef<() => void>(() => {});
  const suspendedRef = useRef(false);
  const versionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const blockedRef = useRef(false);
  const [state, setState] = useState<EditorSaveState>("Sincronizado");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  useEffect(() => { revisionRef.current = Math.max(revisionRef.current, input.revision); }, [input.revision]);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      flushOnUnmountRef.current();
    };
  }, []);

  const save = useCallback((options: {
    readonly allowSuspended?: boolean;
    readonly throwOnError?: boolean;
    readonly scheduleFollowup?: boolean;
  } = {}): Promise<void> => {
    if (inFlightRef.current) return inFlightPromiseRef.current ?? Promise.resolve();
    if ((!options.allowSuspended && suspendedRef.current) || !latest.current.editable
      || savedVersionRef.current === versionRef.current) return Promise.resolve();
    if (blockedRef.current) {
      const reason = new Error("O autosave está bloqueado por um conflito de revisão.");
      return options.throwOnError ? Promise.reject(reason) : Promise.resolve();
    }
    inFlightRef.current = true;
    if (activeRef.current) { setState("Salvando"); setError(null); }
    const savingVersion = versionRef.current;
    const current = latest.current;
    const execution = (async () => {
      try {
        const nextRevision = await current.documentPort.save(
          current.diagramId,
          current.editToken,
          current.store.getState().document,
          revisionRef.current,
        );
        revisionRef.current = nextRevision;
        savedVersionRef.current = savingVersion;
        if (!activeRef.current) return;
        current.onRevision(nextRevision);
        if (suspendedRef.current || versionRef.current === savingVersion) {
          setState("Sincronizado");
        } else {
          setState("Não salvo");
          if (options.scheduleFollowup !== false) timerRef.current = setTimeout(() => { void save(); }, 0);
        }
      } catch (reason) {
        const isConflict = isPidDocumentError(reason) && reason.code === "CONFLICT";
        blockedRef.current = isConflict;
        if (activeRef.current) {
          setConflict(isConflict);
          setState("Não salvo");
          setError(isConflict
            ? "O diagrama foi alterado em outra janela. Recarregue para revisar a versão atual; nenhuma sobrescrita foi feita."
            : isPidDocumentError(reason) ? reason.message : "Não foi possível salvar o diagrama.");
        }
        if (options.throwOnError) throw reason;
      } finally {
        inFlightRef.current = false;
        inFlightPromiseRef.current = null;
      }
    })();
    inFlightPromiseRef.current = execution;
    return execution;
  }, []);

  const markLocalChange = useCallback(() => {
    if (!latest.current.editable || suspendedRef.current) return;
    versionRef.current += 1;
    if (activeRef.current) setState("Não salvo");
    if (blockedRef.current || inFlightRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void save(); }, 400);
  }, [save]);

  const retry = useCallback(() => {
    if (blockedRef.current || suspendedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    void save();
  }, [save]);

  const flushLatest = useCallback(async (allowSuspended: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    while (savedVersionRef.current !== versionRef.current) {
      if (blockedRef.current) throw new Error("O autosave está bloqueado por um conflito de revisão.");
      if (inFlightPromiseRef.current) await inFlightPromiseRef.current;
      if (savedVersionRef.current === versionRef.current) break;
      await save({ allowSuspended, throwOnError: true, scheduleFollowup: false });
    }
    return revisionRef.current;
  }, [save]);

  const flush = useCallback(() => flushLatest(false), [flushLatest]);

  const suspend = useCallback(async () => {
    suspendedRef.current = true;
    const flushedRevision = await flushLatest(true);
    if (activeRef.current) { setError(null); setConflict(false); setState("Sincronizado"); }
    return flushedRevision;
  }, [flushLatest]);

  flushOnUnmountRef.current = () => {
    if (!latest.current.editable || suspendedRef.current || blockedRef.current
      || savedVersionRef.current === versionRef.current) return;
    void flushLatest(false).catch(() => {});
  };

  const resumeLocal = useCallback((revision: number) => {
    revisionRef.current = Math.max(revisionRef.current, revision);
    suspendedRef.current = false;
    if (!blockedRef.current) { setConflict(false); setError(null); }
    if (savedVersionRef.current === versionRef.current) setState("Sincronizado");
    else if (!blockedRef.current) {
      setState("Não salvo");
      timerRef.current = setTimeout(() => { void save(); }, 400);
    }
    return revisionRef.current;
  }, [save]);

  const resumeRemote = useCallback((revision: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    revisionRef.current = revision;
    versionRef.current = 0;
    savedVersionRef.current = 0;
    suspendedRef.current = false;
    blockedRef.current = false;
    setConflict(false);
    setError(null);
    setState("Sincronizado");
  }, []);

  return { state, error, conflict, markLocalChange, retry, flush, suspend, resumeLocal, resumeRemote };
}
