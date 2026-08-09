import { useCallback, useEffect, useRef, useState } from "react";

import { isPidDocumentError, type PidDocumentPort } from "../api/contracts";
import type { PidDocument } from "../domain/model";
import type { EditorStore } from "./editor-store";

export type EditorSaveState = "Sincronizado" | "Salvando" | "Não salvo";

export interface EditorAutosaveController {
  readonly state: EditorSaveState;
  readonly error: string | null;
  readonly conflict: boolean;
  readonly validationBlocked: boolean;
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
  readonly getPersistenceBlock: (document: PidDocument) => string | null;
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
  const previousEditableRef = useRef(input.editable);
  const retryOnCapabilityRestoreRef = useRef(false);
  const suspendedRef = useRef(false);
  const versionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const blockedRef = useRef(false);
  const validationBlockedRef = useRef(false);
  const [state, setState] = useState<EditorSaveState>("Sincronizado");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [validationBlocked, setValidationBlocked] = useState(false);

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
    if ((!options.allowSuspended && suspendedRef.current)
      || savedVersionRef.current === versionRef.current) return Promise.resolve();
    if (blockedRef.current) {
      const reason = new Error("O autosave está bloqueado por um conflito de revisão.");
      return options.throwOnError ? Promise.reject(reason) : Promise.resolve();
    }
    const current = latest.current;
    const document = current.store.getState().document;
    const persistenceBlock = readPersistenceBlock(current.getPersistenceBlock, document);
    if (persistenceBlock) {
      validationBlockedRef.current = true;
      if (activeRef.current) {
        setValidationBlocked(true);
        setState("Não salvo");
        setError(persistenceBlock);
      }
      const reason = new Error(persistenceBlock);
      return options.throwOnError ? Promise.reject(reason) : Promise.resolve();
    }
    validationBlockedRef.current = false;
    inFlightRef.current = true;
    if (activeRef.current) { setValidationBlocked(false); setState("Salvando"); setError(null); }
    const savingVersion = versionRef.current;
    const execution = (async () => {
      try {
        const nextRevision = await current.documentPort.save(
          current.diagramId,
          current.editToken,
          document,
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
          if (options.scheduleFollowup !== false && !validationBlockedRef.current) timerRef.current = setTimeout(() => { void save(); }, 0);
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
        if (retryOnCapabilityRestoreRef.current) {
          if (savedVersionRef.current === versionRef.current || blockedRef.current || validationBlockedRef.current) {
            retryOnCapabilityRestoreRef.current = false;
          } else if (latest.current.editable) {
            retryOnCapabilityRestoreRef.current = false;
            timerRef.current = setTimeout(() => { void save(); }, 0);
          }
        }
      }
    })();
    inFlightPromiseRef.current = execution;
    return execution;
  }, []);

  const markLocalChange = useCallback(() => {
    if (!latest.current.editable || suspendedRef.current) return;
    versionRef.current += 1;
    if (activeRef.current) setState("Não salvo");
    const persistenceBlock = readPersistenceBlock(
      latest.current.getPersistenceBlock,
      latest.current.store.getState().document,
    );
    if (persistenceBlock) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      validationBlockedRef.current = true;
      if (activeRef.current) {
        setValidationBlocked(true);
        if (!blockedRef.current) {
          setConflict(false);
          setError(persistenceBlock);
        }
      }
      return;
    }
    validationBlockedRef.current = false;
    if (activeRef.current) {
      setValidationBlocked(false);
      if (!blockedRef.current) { setConflict(false); setError(null); }
    }
    if (blockedRef.current || inFlightRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void save(); }, 400);
  }, [save]);

  useEffect(() => {
    const wasEditable = previousEditableRef.current;
    previousEditableRef.current = input.editable;
    if (wasEditable && !input.editable) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      if (savedVersionRef.current !== versionRef.current) void save();
      return;
    }
    if (!wasEditable && input.editable
      && savedVersionRef.current !== versionRef.current
      && !blockedRef.current
      && !validationBlockedRef.current) {
      if (inFlightRef.current) {
        retryOnCapabilityRestoreRef.current = true;
        return;
      }
      retryOnCapabilityRestoreRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { void save(); }, 0);
    }
  }, [input.editable, save]);

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
    if (suspendedRef.current || blockedRef.current || validationBlockedRef.current
      || savedVersionRef.current === versionRef.current) return;
    void flushLatest(false).catch(() => {});
  };

  const resumeLocal = useCallback((revision: number) => {
    revisionRef.current = Math.max(revisionRef.current, revision);
    suspendedRef.current = false;
    const persistenceBlock = readPersistenceBlock(
      latest.current.getPersistenceBlock,
      latest.current.store.getState().document,
    );
    validationBlockedRef.current = Boolean(persistenceBlock);
    setValidationBlocked(Boolean(persistenceBlock));
    if (!blockedRef.current) { setConflict(false); setError(persistenceBlock); }
    if (savedVersionRef.current === versionRef.current) setState("Sincronizado");
    else if (!blockedRef.current && !persistenceBlock) {
      setState("Não salvo");
      timerRef.current = setTimeout(() => { void save(); }, 400);
    } else if (persistenceBlock) setState("Não salvo");
    return revisionRef.current;
  }, [save]);

  const resumeRemote = useCallback((revision: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    revisionRef.current = revision;
    versionRef.current = 0;
    savedVersionRef.current = 0;
    suspendedRef.current = false;
    blockedRef.current = false;
    validationBlockedRef.current = false;
    setConflict(false);
    setValidationBlocked(false);
    setError(null);
    setState("Sincronizado");
  }, []);

  return { state, error, conflict, validationBlocked, markLocalChange, retry, flush, suspend, resumeLocal, resumeRemote };
}

function readPersistenceBlock(
  getPersistenceBlock: (document: PidDocument) => string | null,
  document: PidDocument,
): string | null {
  try {
    return getPersistenceBlock(document);
  } catch {
    return "Não foi possível validar o diagrama. A persistência foi bloqueada por segurança.";
  }
}
