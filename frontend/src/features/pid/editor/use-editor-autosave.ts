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
  acceptRemoteRevision(revision: number): void;
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

  const save = useCallback(async () => {
    if (inFlightRef.current || blockedRef.current || !latest.current.editable
      || savedVersionRef.current === versionRef.current) return;
    inFlightRef.current = true;
    if (activeRef.current) { setState("Salvando"); setError(null); }
    const savingVersion = versionRef.current;
    const current = latest.current;
    try {
      const nextRevision = await current.documentPort.save(
        current.diagramId,
        current.editToken,
        current.store.getState().document,
        revisionRef.current,
      );
      if (!activeRef.current) return;
      revisionRef.current = nextRevision;
      current.onRevision(nextRevision);
      savedVersionRef.current = savingVersion;
      if (versionRef.current === savingVersion) {
        setState("Sincronizado");
      } else {
        setState("Não salvo");
        timerRef.current = setTimeout(() => { void save(); }, 0);
      }
    } catch (reason) {
      if (!activeRef.current) return;
      const isConflict = isPidDocumentError(reason) && reason.code === "CONFLICT";
      blockedRef.current = isConflict;
      setConflict(isConflict);
      setState("Não salvo");
      setError(isConflict
        ? "O diagrama foi alterado em outra janela. Recarregue para revisar a versão atual; nenhuma sobrescrita foi feita."
        : isPidDocumentError(reason) ? reason.message : "Não foi possível salvar o diagrama.");
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const markLocalChange = useCallback(() => {
    if (!latest.current.editable) return;
    versionRef.current += 1;
    if (activeRef.current) setState("Não salvo");
    if (blockedRef.current || inFlightRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void save(); }, 400);
  }, [save]);

  const retry = useCallback(() => {
    if (blockedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    void save();
  }, [save]);

  const acceptRemoteRevision = useCallback((revision: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    revisionRef.current = revision;
    versionRef.current = 0;
    savedVersionRef.current = 0;
    blockedRef.current = false;
    setConflict(false);
    setError(null);
    setState("Sincronizado");
  }, []);

  return { state, error, conflict, markLocalChange, retry, acceptRemoteRevision };
}
