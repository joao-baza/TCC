import * as Y from "yjs";
import { parsePidDocument } from "../domain/schema";
import type {
  CollaborationDocumentUpdate,
  CollaborationFacade,
  CollaborationParticipant,
  CollaborationSnapshot,
  CollaborationSyncStatus,
} from "./contracts";

export interface RemoteCollaborationInput {
  readonly diagramId: string;
  readonly token: string;
  readonly participant: CollaborationParticipant;
  readonly baseUrl: string;
}

export function createRemoteCollaboration(
  input: RemoteCollaborationInput,
): CollaborationFacade {
  const { diagramId, token, participant, baseUrl } = input;
  const ydoc = new Y.Doc();
  const participants = new Set<CollaborationParticipant>([participant]);
  const listeners = new Set<() => void>();
  const documentListeners = new Set<(update: CollaborationDocumentUpdate) => void>();
  let ws: WebSocket | null = null;
  let status: CollaborationSyncStatus = "connecting";
  let cleanup: (() => void) | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const emitSnapshot = () => {
    for (const l of listeners) l();
  };

  const setStatus = (s: CollaborationSyncStatus) => {
    if (status === s) return;
    status = s;
    emitSnapshot();
  };

  const getSnapshot = (): CollaborationSnapshot => ({
    label: "Sessão colaborativa" as CollaborationSnapshot["label"],
    status,
    participants: [...participants],
  });

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };

  const subscribeDocument = (
    listener: (update: CollaborationDocumentUpdate) => void,
  ): (() => void) => {
    documentListeners.add(listener);
    return () => { documentListeners.delete(listener); };
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      doConnect();
    }, 3000);
  };

  const doConnect = async () => {
    if (ws?.readyState === WebSocket.OPEN) return;
    setStatus("connecting");
    try {
      const ticketRes = await fetch(
        `${baseUrl}/api/pid/diagrams/${diagramId}/ws-ticket`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        },
      );
      if (!ticketRes.ok) {
        scheduleReconnect();
        return;
      }
      const { ticket: wsTicket } = await ticketRes.json();

      const protocol = baseUrl.startsWith("https") ? "wss" : "ws";
      const host = baseUrl.replace(/^https?:\/\//, "");
      const url = `${protocol}://${host}/pid/ws/${diagramId}?ticket=${wsTicket}`;
      ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setStatus("synced");
        const update = Y.encodeStateAsUpdate(ydoc);
        if (update.length > 1 && ws?.readyState === WebSocket.OPEN) {
          ws.send(update);
        }
      };

      ws.onmessage = (event) => {
        const data = new Uint8Array(event.data as ArrayBuffer);
        Y.applyUpdate(ydoc, data);
      };

      ws.onclose = () => {
        ws = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws?.close();
        ws = null;
        scheduleReconnect();
      };
    } catch {
      scheduleReconnect();
    }
  };

  const connect = (): (() => void) => {
    if (cleanup) return cleanup;
    void doConnect();

    ydoc.on("update", (update: Uint8Array) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(update);
      }
    });

    cleanup = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      ws?.close();
      ws = null;
    };

    return cleanup;
  };

  const publishDocument = (update: CollaborationDocumentUpdate): boolean => {
    if (update.origin !== "remote") return false;
    const doc = parsePidDocument(update.document);
    for (const l of documentListeners) {
      l({ origin: "remote", document: doc, revision: update.revision });
    }
    return true;
  };

  return { getSnapshot, subscribe, subscribeDocument, connect, setStatus, publishDocument };
}
