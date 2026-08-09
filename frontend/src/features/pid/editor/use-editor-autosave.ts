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
  suspend(): Promise<number>;
  resumeLocal(revision: number): void;
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
  const suspendedRef = useRef(false);
  const versionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const blockedRef = useRef(false);
  const [state, setState] = useState<EditorSaveState>("Sincronizado");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  useEffect(() => { revisionRef.current = input.revision; }, [input.revision]);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback((): Promise<void> => {
    if (inFlightRef.current || suspendedRef.current || blockedRef.current || !latest.current.editable
      || savedVersionRef.current === versionRef.current) return Promise.resolve();
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
          timerRef.current = setTimeout(() => { void save(); }, 0);
        }
      } catch (reason) {
        if (!activeRef.current || suspendedRef.current) return;
        const isConflict = isPidDocumentError(reason) && reason.code === "CONFLICT";
        blockedRef.current = isConflict;
        setConflict(isConflict);
        setState("Não salvo");
        setError(isConflict
          ? "O diagrama foi alterado em outra janela. Recarregue para revisar a versão atual; nenhuma sobrescrita foi feita."
          : isPidDocumentError(reason) ? reason.message : "Não foi possível salvar o diagrama.");
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

  const suspend = useCallback(async () => {
    suspendedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    await inFlightPromiseRef.current;
    if (activeRef.current) { setError(null); setConflict(false); setState("Sincronizado"); }
    return revisionRef.current;
  }, []);

  const resumeLocal = useCallback((revision: number) => {
    revisionRef.current = revision;
    suspendedRef.current = false;
    blockedRef.current = false;
    setConflict(false); setError(null);
    if (savedVersionRef.current === versionRef.current) setState("Sincronizado");
    else {
      setState("Não salvo");
      timerRef.current = setTimeout(() => { void save(); }, 400);
    }
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

  return { state, error, conflict, markLocalChange, retry, suspend, resumeLocal, resumeRemote };
}
