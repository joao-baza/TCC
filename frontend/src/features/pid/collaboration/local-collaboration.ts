import { parsePidDocument } from "../domain/schema";
import type {
  CollaborationDocumentUpdate,
  CollaborationFacade,
  CollaborationParticipant,
  CollaborationSnapshot,
  CollaborationSyncStatus,
} from "./contracts";

export type LocalCollaborationScheduler = (callback: () => void) => void;

export interface LocalCollaborationInput {
  readonly participant: CollaborationParticipant;
}

export interface LocalCollaborationRuntime {
  readonly schedule?: LocalCollaborationScheduler;
}

export function createLocalCollaboration(
  input: LocalCollaborationInput,
  runtime: LocalCollaborationRuntime = {},
): CollaborationFacade {
  const schedule = runtime.schedule ?? queueMicrotask;
  const participants = Object.freeze([freezeParticipant(input.participant)]);
  const listeners = new Set<() => void>();
  const documentListeners = new Set<(update: CollaborationDocumentUpdate) => void>();
  let snapshot = freezeSnapshot("connecting", participants);
  let transition = 0;

  const emitSnapshot = () => {
    for (const listener of [...listeners]) {
      if (listeners.has(listener)) listener();
    }
  };
  const setStatus = (status: CollaborationSyncStatus, force = false) => {
    transition += 1;
    if (!force && snapshot.status === status) return;
    snapshot = freezeSnapshot(status, participants);
    emitSnapshot();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
    subscribeDocument(listener) {
      documentListeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        documentListeners.delete(listener);
      };
    },
    connect() {
      setStatus("connecting", true);
      const pendingTransition = transition;
      let active = true;
      schedule(() => {
        if (!active || transition !== pendingTransition) return;
        setStatus("synced");
      });
      return () => {
        if (!active) return;
        active = false;
        if (transition === pendingTransition) transition += 1;
      };
    },
    setStatus,
    publishDocument(update) {
      if (update.origin !== "remote") return false;
      const remoteUpdate = Object.freeze({
        origin: "remote" as const,
        document: deepFreeze(parsePidDocument(update.document)),
        revision: normalizeRevision(update.revision),
      });
      for (const listener of [...documentListeners]) {
        if (documentListeners.has(listener)) listener(remoteUpdate);
      }
      return true;
    },
  };
}

function normalizeRevision(revision: number): number {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new TypeError("A revisão remota deve ser um inteiro não negativo.");
  }
  return revision;
}

function freezeParticipant(participant: CollaborationParticipant): CollaborationParticipant {
  return Object.freeze({
    id: participant.id,
    name: participant.name,
    color: participant.color,
    local: participant.local,
  });
}

function freezeSnapshot(
  status: CollaborationSyncStatus,
  participants: readonly CollaborationParticipant[],
): CollaborationSnapshot {
  return Object.freeze({ label: "Sessão local", status, participants });
}

function deepFreeze<T>(value: T, visited = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object" || visited.has(value)) return value;
  visited.add(value);
  for (const child of Object.values(value)) deepFreeze(child, visited);
  return Object.freeze(value);
}
