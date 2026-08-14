import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PidSessionStatus } from "@/features/pid/editor/pid-session-status";
import type { CollaborationSnapshot } from "@/features/pid/collaboration/contracts";

const collaboration = {
  label: "Sessão local" as const,
  status: "synced" as const,
  participants: [{ id: "local", name: "Você", color: "#57b9d6", local: true }],
};

describe("PidSessionStatus", () => {
  it("exposes save state without the synced collaboration label", () => {
    render(<PidSessionStatus saveState="Sincronizado" collaboration={collaboration} />);

    expect(screen.getByRole("group", { name: "Estado da sessão" })).toHaveTextContent("Sincronizado");
    expect(screen.getByRole("group", { name: "Estado da sessão" })).not.toHaveTextContent("Sessão local sincronizada");
  });

  it.each([
    ["connecting", "Conectando sessão"],
    ["reconnecting", "Reconectando sessão"],
    ["unsaved", "Alterações locais pendentes"],
  ] as const)("shows the %s collaboration state", (status, label) => {
    render(<PidSessionStatus saveState="Sincronizado" collaboration={{ ...collaboration, status } satisfies CollaborationSnapshot} />);

    expect(screen.getByRole("group", { name: "Estado da sessão" })).toHaveTextContent(label);
  });

  it("prioritizes conflict state and keeps retry available", () => {
    const onRetry = vi.fn();
    render(<PidSessionStatus saveState="Não salvo" collaboration={{ ...collaboration, status: "reconnecting" }} conflict onRetry={onRetry} />);

    expect(screen.getByRole("group", { name: "Estado da sessão" })).toHaveTextContent("Conflito");
    screen.getByRole("button", { name: "Tentar salvar novamente" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
