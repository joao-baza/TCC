import {
  applyCommand,
  type CommandContext,
  type PidCommand,
} from "../domain/commands";
import { hasSelectableElement } from "../domain/graph-operations";
import { primeDocumentValidation } from "../domain/invariants";
import type { PidDocument, Point } from "../domain/model";
import { parsePidDocument } from "../domain/schema";

export type EditorChangeOrigin = "local" | "remote";

export interface EditorViewport extends Point {
  zoom: number;
}

export interface EditorState {
  readonly document: PidDocument;
  readonly past: readonly PidDocument[];
  readonly future: readonly PidDocument[];
  readonly selection: readonly string[];
  readonly viewport: Readonly<EditorViewport>;
}

export interface EditorDispatchOptions {
  /** Consecutive local moves with the same key share one undo checkpoint. */
  coalesceKey?: string;
}

export interface EditorStoreOptions {
  historyLimit?: number;
  onListenerError?: (error: unknown) => void;
}

export interface EditorStore {
  getState(): EditorState;
  dispatch(command: PidCommand, origin?: EditorChangeOrigin, options?: EditorDispatchOptions): void;
  replace(document: PidDocument, origin?: EditorChangeOrigin): void;
  undo(): void;
  redo(): void;
  setSelection(ids: readonly string[]): void;
  setViewport(viewport: EditorViewport): void;
  subscribe(listener: (state: EditorState) => void): () => void;
}

interface InternalEditorState {
  document: PidDocument;
  past: PidDocument[];
  future: PidDocument[];
  selection: string[];
  viewport: EditorViewport;
}

const defaultHistoryLimit = 100;

export function createEditorStore(
  initialDocument: PidDocument,
  commandContext: CommandContext = {},
  options: EditorStoreOptions = {},
): EditorStore {
  const historyLimit = normalizeHistoryLimit(options.historyLimit);
  const listeners = new Set<(state: EditorState) => void>();
  const notificationQueue: EditorState[] = [];
  const initial = freezeAndPrime(parsePidDocument(initialDocument));
  const state: InternalEditorState = {
    document: initial,
    past: [],
    future: [],
    selection: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
  let snapshot = createSnapshot(state);
  let notifying = false;
  let activeCoalesceKey: string | undefined;

  const refreshSnapshot = () => {
    state.selection = reconcileSelection(state.document, state.selection);
    snapshot = createSnapshot(state);
  };

  const reportListenerError = (error: unknown) => {
    if (!options.onListenerError) return;
    try {
      options.onListenerError(error);
    } catch {
      // Listener error reporting must not compromise a completed mutation.
    }
  };

  const publish = () => {
    refreshSnapshot();
    notificationQueue.push(snapshot);
    if (notifying) return;
    notifying = true;
    try {
      while (notificationQueue.length > 0) {
        const queuedSnapshot = notificationQueue.shift()!;
        for (const listener of [...listeners]) {
          try {
            listener(queuedSnapshot);
          } catch (error) {
            reportListenerError(error);
          }
        }
      }
    } finally {
      notifying = false;
    }
  };

  const pushPast = (document: PidDocument) => {
    if (historyLimit === 0) return;
    state.past.push(document);
    if (state.past.length > historyLimit) {
      state.past.splice(0, state.past.length - historyLimit);
    }
  };

  const applyDocument = (
    document: PidDocument,
    origin: EditorChangeOrigin,
    coalesceKey?: string,
  ) => {
    const next = freezeAndPrime(document);
    const shouldCoalesce = origin === "local"
      && coalesceKey !== undefined
      && coalesceKey === activeCoalesceKey;
    if (origin === "local") {
      if (!shouldCoalesce) pushPast(state.document);
      state.future = [];
      activeCoalesceKey = coalesceKey;
    } else {
      state.past = [];
      state.future = [];
      activeCoalesceKey = undefined;
    }
    state.document = next;
    publish();
  };

  return {
    getState: () => snapshot,
    dispatch(command, origin = "local", dispatchOptions = {}) {
      const coalesceKey = command.type === "selection.move"
        ? dispatchOptions.coalesceKey
        : undefined;
      applyDocument(applyCommand(state.document, command, commandContext), origin, coalesceKey);
    },
    replace(document, origin = "local") {
      activeCoalesceKey = undefined;
      applyDocument(parsePidDocument(document), origin);
    },
    undo() {
      activeCoalesceKey = undefined;
      const previous = state.past.pop();
      if (!previous) return;
      state.future.push(state.document);
      state.document = previous;
      publish();
    },
    redo() {
      activeCoalesceKey = undefined;
      const next = state.future.pop();
      if (!next) return;
      pushPast(state.document);
      state.document = next;
      publish();
    },
    setSelection(ids) {
      activeCoalesceKey = undefined;
      const next = reconcileSelection(state.document, [...new Set(ids)]);
      if (sameStrings(next, state.selection)) return;
      state.selection = next;
      publish();
    },
    setViewport(viewport) {
      activeCoalesceKey = undefined;
      if (!Number.isFinite(viewport.x)
        || !Number.isFinite(viewport.y)
        || !Number.isFinite(viewport.zoom)
        || viewport.zoom <= 0) {
        throw new Error("O viewport deve conter coordenadas finitas e zoom positivo.");
      }
      if (state.viewport.x === viewport.x
        && state.viewport.y === viewport.y
        && state.viewport.zoom === viewport.zoom) return;
      state.viewport = { ...viewport };
      publish();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function normalizeHistoryLimit(value: number | undefined): number {
  if (value === undefined) return defaultHistoryLimit;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("O limite do histórico deve ser um inteiro não negativo.");
  }
  return value;
}

function reconcileSelection(document: PidDocument, selection: readonly string[]): string[] {
  return selection.filter((id) => hasSelectableElement(document, id));
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function createSnapshot(state: InternalEditorState): EditorState {
  return Object.freeze({
    document: state.document,
    past: Object.freeze([...state.past]),
    future: Object.freeze([...state.future]),
    selection: Object.freeze([...state.selection]),
    viewport: Object.freeze({ ...state.viewport }),
  });
}

function freezeAndPrime(document: PidDocument): PidDocument {
  const frozen = deepFreeze(document);
  primeDocumentValidation(frozen);
  return frozen;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
