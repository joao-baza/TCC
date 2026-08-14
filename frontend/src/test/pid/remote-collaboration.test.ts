import { describe, expect, it, vi } from "vitest";

import { createRemoteCollaboration } from "@/features/pid/collaboration/remote-collaboration";

describe("fachada de colaboração remota", () => {
  it("mantém snapshot estável entre leituras para useSyncExternalStore", () => {
    const participant = { id: "remote-user", name: "Você", color: "#57b9d6", local: true };
    const collaboration = createRemoteCollaboration({
      diagramId: "90000000-0000-4000-8000-000000000001",
      token: "token",
      participant,
      baseUrl: "https://example.com",
    });
    const first = collaboration.getSnapshot();
    const listener = vi.fn();

    participant.name = "Mutação externa";
    expect(collaboration.getSnapshot()).toBe(first);
    expect(first).toMatchObject({
      label: "Sessão colaborativa",
      status: "connecting",
      participants: [{ id: "remote-user", name: "Você", local: true }],
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.participants)).toBe(true);
    expect(Object.isFrozen(first.participants[0])).toBe(true);

    collaboration.subscribe(listener);
    collaboration.setStatus("connecting");
    expect(listener).not.toHaveBeenCalled();

    collaboration.setStatus("synced");
    const second = collaboration.getSnapshot();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(first);
    expect(collaboration.getSnapshot()).toBe(second);
  });
});
