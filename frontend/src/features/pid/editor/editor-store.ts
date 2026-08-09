import {
  applyCommand,
  type CommandContext,
  type PidCommand,
} from "../domain/commands";
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

export interface EditorStore {
  getState(): EditorState;
  dispatch(command: PidCommand, origin?: EditorChangeOrigin): void;
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

export function createEditorStore(
  initialDocument: PidDocument,
  commandContext: CommandContext = {},
): EditorStore {
  const listeners = new Set<(state: EditorState) => void>();
  const state: InternalEditorState = {
    document: freezeDocument(parsePidDocument(initialDocument)),
    past: [],
    future: [],
    selection: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  const getState = (): EditorState => Object.freeze({
    document: state.document,
    past: Object.freeze([...state.past]),
    future: Object.freeze([...state.future]),
    selection: Object.freeze([...state.selection]),
    viewport: Object.freeze({ ...state.viewport }),
  });

  const notify = () => {
    const snapshot = getState();
    for (const listener of [...listeners]) listener(snapshot);
  };

  const applyDocument = (document: PidDocument, origin: EditorChangeOrigin) => {
    const next = freezeDocument(document);
    if (origin === "local") {
      state.past.push(state.document);
      state.future = [];
    } else {
      state.past = [];
      state.future = [];
    }
    state.document = next;
    notify();
  };

  return {
    getState,
    dispatch(command, origin = "local") {
      applyDocument(applyCommand(state.document, command, commandContext), origin);
    },
    replace(document, origin = "local") {
      applyDocument(parsePidDocument(document), origin);
    },
    undo() {
      const previous = state.past.pop();
      if (!previous) return;
      state.future.push(state.document);
      state.document = previous;
      notify();
    },
    redo() {
      const next = state.future.pop();
      if (!next) return;
      state.past.push(state.document);
      state.document = next;
      notify();
    },
    setSelection(ids) {
      state.selection = [...new Set(ids)];
      notify();
    },
    setViewport(viewport) {
      if (!Number.isFinite(viewport.x)
        || !Number.isFinite(viewport.y)
        || !Number.isFinite(viewport.zoom)
        || viewport.zoom <= 0) {
        throw new Error("O viewport deve conter coordenadas finitas e zoom positivo.");
      }
      state.viewport = { ...viewport };
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function freezeDocument(document: PidDocument): PidDocument {
  return deepFreeze(document);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
