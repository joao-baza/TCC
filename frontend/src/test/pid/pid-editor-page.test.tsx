import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { PidDocumentError, type AccessScope, type PidDocumentPort, type PidServices } from "@/features/pid/api/contracts";
import { PidServicesProvider } from "@/features/pid/api/pid-services";
import type { PidDocument } from "@/features/pid/domain/model";
import { PidEditorPage } from "@/features/pid/editor/pid-editor-page";
import { installPidCanvasGeometryHarness } from "./pid-canvas-harness";

const ids = {
  diagram: "10000000-0000-4000-8000-000000000001",
  pump: "20000000-0000-4000-8000-000000000001",
  tank: "20000000-0000-4000-8000-000000000002",
  pumpOut: "30000000-0000-4000-8000-000000000001",
  tankIn: "30000000-0000-4000-8000-000000000002",
  edge: "40000000-0000-4000-8000-000000000001",
} as const;

let restoreCanvasGeometry: () => void;
beforeAll(() => { restoreCanvasGeometry = installPidCanvasGeometryHarness(); });
afterAll(() => restoreCanvasGeometry());
beforeEach(() => window.history.replaceState(null, "", "/"));

describe("integração real do studio P&ID", () => {
  it("deriva a toolbar da seleção real, executa comandos e alterna a classe de linha", async () => {
    const save = vi.fn().mockResolvedValue(2);
    mount(services({ save }));
    const pump = await screen.findByRole("button", { name: "Bomba P-1" });
    expect(screen.getByRole("button", { name: "Excluir seleção" })).toBeDisabled();

    fireEvent.click(pump);
    await waitFor(() => expect(pump).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("button", { name: "Excluir seleção" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Copiar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Duplicar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Girar 90°" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Agrupar" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Alinhar seleção" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Girar 90°" }));
    await waitFor(() => expect(screen.getByTestId(`equipment-artwork-${ids.pump}`)).toHaveStyle({ transform: "rotate(90deg)" }));

    const tank = screen.getByRole("button", { name: "Tanque T-1" });
    fireEvent.keyDown(document, { key: "Control", code: "ControlLeft" });
    fireEvent.click(tank, { ctrlKey: true });
    fireEvent.keyUp(document, { key: "Control", code: "ControlLeft" });
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Alinhar seleção" })).toBeEnabled());

    fireEvent.click(screen.getByTestId(`process-edge-${ids.edge}`));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Excluir seleção" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Copiar" })).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: "Duplicar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Girar 90°" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Agrupar" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Alinhar seleção" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Legenda de sinais" }));
    const canvasRegion = screen.getByRole("region", { name: "Canvas P&ID" });
    expect(within(canvasRegion).getByRole("dialog", { name: "Sinais utilizados nos fluxogramas de processo" })).toHaveClass("pid-canvas-signal-legend");
    fireEvent.click(await within(canvasRegion).findByRole("button", { name: "Aplicar Sinal pneumático" }));
    await waitFor(() => expect(screen.getByTestId(`process-edge-${ids.edge}`)).toHaveAttribute("data-signal-line-style", "pneumatic-signal"));
    expect(screen.getByText("Estilo de linha aplicado à aresta selecionada.")).toBeInTheDocument();
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][2].edges[ids.edge].lineStyle).toBe("pneumatic-signal");

    const lineSelect = screen.getByLabelText("Tipo de linha de conexão");
    for (const value of ["utility", "signal", "process"]) {
      fireEvent.change(lineSelect, { target: { value } });
      expect(lineSelect).toHaveValue(value);
    }

    fireEvent.click(screen.getByRole("button", { name: "Adicionar anotação" }));
    const annotation = await screen.findByRole("button", { name: "Anotação: Nova anotação" });
    fireEvent.click(annotation);
    await waitFor(() => expect(annotation).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("button", { name: "Copiar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Girar 90°" })).toBeEnabled();
  });

  it("copia os dois links e invalida o link de visualização anterior ao regenerá-lo", async () => {
    const documentPort = statefulTokenPort();
    const clipboard = vi.fn().mockResolvedValue(undefined);
    const previousClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
    try {
      mount(services(documentPort));
      await screen.findByRole("button", { name: "Bomba P-1" });
      fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
      const viewButton = screen.getByRole("button", { name: "Gerar novo link de visualização" });
      const editButton = screen.getByRole("button", { name: "Gerar novo link de edição" });
      expect(viewButton.parentElement).toBe(editButton.parentElement);
      expect(viewButton.parentElement).toHaveClass("flex", "flex-wrap", "gap-3");

      fireEvent.click(viewButton);
      const firstViewLink = await screen.findByDisplayValue(/#access=view-token-1$/);
      const firstViewUrl = (firstViewLink as HTMLInputElement).value;

      fireEvent.click(editButton);
      const editLink = await screen.findByDisplayValue(/#access=edit-token-1$/);
      const editUrl = (editLink as HTMLInputElement).value;

      fireEvent.click(viewButton);
      const currentViewLink = await screen.findByDisplayValue(/#access=view-token-2$/);
      const currentViewUrl = (currentViewLink as HTMLInputElement).value;
      fireEvent.click(screen.getByRole("button", { name: "Copiar link de visualização" }));
      fireEvent.click(screen.getByRole("button", { name: "Copiar link de edição" }));
      await waitFor(() => expect(clipboard).toHaveBeenCalledTimes(2));
      expect(clipboard).toHaveBeenNthCalledWith(1, currentViewUrl);
      expect(clipboard).toHaveBeenNthCalledWith(2, editUrl);
      expect(documentPort.regenerate).toHaveBeenNthCalledWith(1, ids.diagram, "edit-token", "view", 1);
      expect(documentPort.regenerate).toHaveBeenNthCalledWith(2, ids.diagram, "edit-token", "edit", 2);
      expect(documentPort.regenerate).toHaveBeenNthCalledWith(3, ids.diagram, "edit-token-1", "view", 3);

      await expect(documentPort.open(ids.diagram, tokenFrom(firstViewUrl))).rejects.toMatchObject({ code: "ACCESS_DENIED" });
      await expect(documentPort.open(ids.diagram, tokenFrom(currentViewUrl))).resolves.toMatchObject({ scope: "view", revision: 4 });
    } finally {
      if (previousClipboard) Object.defineProperty(navigator, "clipboard", previousClipboard);
      else Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("retorna para a listagem P&ID após confirmar exclusão", async () => {
    const softDelete = vi.fn().mockResolvedValue(2);
    const { router } = mount(services({ softDelete }));
    await screen.findByRole("button", { name: "Bomba P-1" });

    fireEvent.click(screen.getByRole("button", { name: "Excluir diagrama" }));
    fireEvent.change(screen.getByLabelText("Digite Studio integrado para confirmar"), { target: { value: "Studio integrado" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(softDelete).toHaveBeenCalledWith(ids.diagram, "edit-token", 1));
    await waitFor(() => expect(router.state.location.pathname).toBe("/pid"));
    expect(screen.getByRole("heading", { name: "Diagramas P&ID" })).toBeInTheDocument();
  });
});

function mount(pidServices: PidServices) {
  const router = createMemoryRouter([
    { path: "/pid", element: <h1>Diagramas P&ID</h1> },
    { path: "/pid/:diagramId", element: <PidEditorPage /> },
  ], { initialEntries: [`/pid/${ids.diagram}#access=edit-token`] });
  return { router, ...render(<PidServicesProvider services={pidServices}><RouterProvider router={router} /></PidServicesProvider>) };
}

function services(documentOverrides: Partial<PidDocumentPort> = {}): PidServices {
  return {
    document: {
      create: vi.fn(),
      open: vi.fn().mockResolvedValue({ scope: "edit", document: studioDocument(), revision: 1 }),
      save: vi.fn().mockImplementation(async (_diagramId, _token, _document, revision) => revision + 1),
      regenerate: vi.fn().mockResolvedValue({ token: "regenerated-token", revision: 2 }),
      softDelete: vi.fn().mockResolvedValue(2),
      restore: vi.fn().mockResolvedValue(3),
      ...documentOverrides,
    },
    catalog: { list: vi.fn() },
    collaboration: { connect: vi.fn() },
    recent: { list: vi.fn().mockReturnValue([]), upsert: vi.fn() },
  };
}

function statefulTokenPort(): PidDocumentPort {
  let revision = 1;
  let viewToken = "view-token-0";
  let editToken = "edit-token";
  let viewSequence = 0;
  return {
    create: vi.fn(),
    open: vi.fn(async (_diagramId: string, token: string) => {
      if (token === editToken) return { scope: "edit" as const, document: studioDocument(), revision };
      if (token === viewToken) return { scope: "view" as const, document: studioDocument(), revision };
      throw new PidDocumentError("ACCESS_DENIED");
    }),
    save: vi.fn(async (_diagramId, token, _document, expectedRevision) => {
      if (token !== editToken || expectedRevision !== revision) throw new PidDocumentError("CONFLICT");
      return ++revision;
    }),
    regenerate: vi.fn(async (_diagramId, token, scope: AccessScope, expectedRevision) => {
      if (token !== editToken || expectedRevision !== revision) throw new PidDocumentError("CONFLICT");
      revision += 1;
      if (scope === "view") {
        viewToken = `view-token-${++viewSequence}`;
        return { token: viewToken, revision };
      }
      editToken = "edit-token-1";
      return { token: editToken, revision };
    }),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };
}

function tokenFrom(url: string): string {
  return new URLSearchParams(new URL(url).hash.slice(1)).get("access") ?? "";
}

function studioDocument(): PidDocument {
  return {
    schemaVersion: 1,
    id: ids.diagram,
    metadata: {
      title: "Studio integrado",
      standard: "free",
      catalogVersion: "local-v1",
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
      utilityCategories: [],
    },
    nodes: {
      [ids.pump]: { id: ids.pump, symbolKey: "drawio.pid.pumps.centrifugal-pump-1", catalogVersion: "local-v1", x: 100, y: 80, width: 96, height: 64, rotation: 0, tag: "P-1", label: "Bomba", properties: {} },
      [ids.tank]: { id: ids.tank, symbolKey: "drawio.pid.vessels.tank", catalogVersion: "local-v1", x: 360, y: 80, width: 80, height: 72, rotation: 0, tag: "T-1", label: "Tanque", properties: {} },
    },
    ports: {
      [ids.pumpOut]: { id: ids.pumpOut, nodeId: ids.pump, templateKey: "discharge", direction: "output", connectionClass: "process", capacity: 1 },
      [ids.tankIn]: { id: ids.tankIn, nodeId: ids.tank, templateKey: "inlet", direction: "input", connectionClass: "process", capacity: 2 },
    },
    edges: {
      [ids.edge]: { id: ids.edge, sourcePortId: ids.pumpOut, targetPortId: ids.tankIn, connectionClass: "process", lineStyle: "supply-impulse", route: [], tag: "L-1", label: "Processo", properties: {} },
    },
    annotations: {},
    groups: {},
  };
}
