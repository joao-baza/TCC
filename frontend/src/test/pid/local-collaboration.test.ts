import { describe, expect, it, vi } from "vitest";

import {
  createLocalCollaboration,
  type LocalCollaborationScheduler,
} from "@/features/pid/collaboration/local-collaboration";
import { createEmptyDocument } from "@/features/pid/domain/schema";

const diagramId = "90000000-0000-4000-8000-000000000001";

function documentFixture(title = "Sessão local") {
  return createEmptyDocument(
    { title, standard: "free" },
    { generateId: () => diagramId, now: () => new Date("2026-08-09T12:00:00.000Z") },
  );
}

function controlledScheduler() {
  const pending: Array<() => void> = [];
  const schedule: LocalCollaborationScheduler = (callback) => {
    pending.push(callback);
  };
  return { pending, schedule };
}

describe("fachada de colaboração local", () => {
  it("emite estados, participantes e identifica explicitamente a sessão local", () => {
    const scheduler = controlledScheduler();
    const participant = { id: "local-user", name: "Você", color: "#57b9d6", local: true };
    const collaboration = createLocalCollaboration({ participant }, { schedule: scheduler.schedule });
    const observed: string[] = [];
    const unsubscribe = collaboration.subscribe(() => observed.push(collaboration.getSnapshot().status));

    const disconnect = collaboration.connect();
    expect(collaboration.getSnapshot()).toMatchObject({
      label: "Sessão local",
      status: "connecting",
      participants: [{ id: "local-user", name: "Você", local: true }],
    });
    scheduler.pending.shift()?.();
    collaboration.setStatus("unsaved");
    collaboration.setStatus("reconnecting");
    collaboration.setStatus("synced");

    expect(observed).toEqual(["connecting", "synced", "unsaved", "reconnecting", "synced"]);
    unsubscribe();
    unsubscribe();
    collaboration.setStatus("unsaved");
    expect(observed).toHaveLength(5);
    disconnect();
  });

  it("isola snapshots, participantes e alterações remotas dos objetos do chamador", () => {
    const participant = { id: "local-user", name: "Ana", color: "#57b9d6", local: true };
    const collaboration = createLocalCollaboration({ participant });
    const first = collaboration.getSnapshot();

    participant.name = "Nome alterado externamente";
    expect(first.participants[0]?.name).toBe("Ana");
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.participants)).toBe(true);
    expect(Object.isFrozen(first.participants[0])).toBe(true);
    expect(collaboration.getSnapshot()).toBe(first);

    const received = vi.fn();
    collaboration.subscribeDocument(received);
    const localDraft = structuredClone(documentFixture("Rascunho local"));
    expect(collaboration.publishDocument({ origin: "local", document: localDraft, revision: 1 })).toBe(false);
    expect(received).not.toHaveBeenCalled();

    const remoteDraft = structuredClone(documentFixture("Versão remota"));
    expect(collaboration.publishDocument({ origin: "remote", document: remoteDraft, revision: 2 })).toBe(true);
    remoteDraft.metadata.title = "Mutação posterior";

    expect(received).toHaveBeenCalledTimes(1);
    const update = received.mock.calls[0]?.[0];
    expect(update).toMatchObject({ origin: "remote", revision: 2, document: { metadata: { title: "Versão remota" } } });
    expect(Object.isFrozen(update)).toBe(true);
    expect(Object.isFrozen(update.document)).toBe(true);
    expect(Object.isFrozen(update.document.metadata)).toBe(true);
  });

  it("descarta conclusões assíncronas obsoletas e respeita unsubscribe durante emissão", () => {
    const scheduler = controlledScheduler();
    const collaboration = createLocalCollaboration({
      participant: { id: "local-user", name: "Ana", color: "#57b9d6", local: true },
    }, { schedule: scheduler.schedule });
    const second = vi.fn();
    let unsubscribeSecond = () => {};
    const first = vi.fn(() => unsubscribeSecond());
    collaboration.subscribe(first);
    unsubscribeSecond = collaboration.subscribe(second);

    collaboration.connect();
    collaboration.setStatus("unsaved");
    scheduler.pending.shift()?.();

    expect(collaboration.getSnapshot().status).toBe("unsaved");
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).not.toHaveBeenCalled();
  });
});
