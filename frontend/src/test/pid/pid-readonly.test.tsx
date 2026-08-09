import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { PidDocumentPort, PidServices } from "@/features/pid/api/contracts";
import { PidServicesProvider } from "@/features/pid/api/pid-services";
import type { PidCommand } from "@/features/pid/domain/commands";
import type { PidDocument } from "@/features/pid/domain/model";
import { createEmptyDocument } from "@/features/pid/domain/schema";
import { canEdit } from "@/features/pid/editor/use-edit-capability";

vi.mock("@/features/pid/canvas/pid-canvas", () => ({
  PidCanvas: ({ document, editable, onCommand, viewportAction }: {
    document: PidDocument;
    editable: boolean;
    onCommand: (command: PidCommand) => boolean;
    viewportAction?: { type: string };
  }) => <div
    data-testid="pid-canvas"
    data-editable={String(editable)}
    data-annotation-count={Object.keys(document.annotations).length}
    data-viewport-action={viewportAction?.type ?? ""}
  >
    <button type="button" onClick={() => onCommand({ type: "annotation.insert", text: "Forçada", position: { x: 1, y: 1 } })}>
      Tentar comando do canvas
    </button>
  </div>,
}));

import { PidEditorPage } from "@/features/pid/editor/pid-editor-page";

const diagramId = "90000000-0000-4000-8000-000000000002";
const documentFixture = createEmptyDocument(
  { title: "Responsivo", standard: "free" },
  { generateId: () => diagramId, now: () => new Date("2026-08-09T12:00:00.000Z") },
);
let originalInnerWidth: PropertyDescriptor | undefined;

beforeAll(() => { originalInnerWidth = Object.getOwnPropertyDescriptor(window, "innerWidth"); });
afterAll(() => {
  if (originalInnerWidth) Object.defineProperty(window, "innerWidth", originalInnerWidth);
});
beforeEach(() => setViewportWidth(1024));

describe("capacidade responsiva de edição", () => {
  it.each([
    ["view", 375, false],
    ["view", 1440, false],
    ["edit", 375, false],
    ["edit", 767, false],
    ["edit", 768, true],
    ["edit", 1440, true],
  ] as const)("canEdit(%s, %i) = %s", (scope, width, expected) => {
    expect(canEdit(scope, width)).toBe(expected);
  });

  it("mantém view e celular somente leitura, bloqueia mutações e preserva leitura", async () => {
    setViewportWidth(375);
    const pidServices = services("view");
    mount(pidServices, true);

    expect(await screen.findByText("Edição disponível em telas a partir de 768 px")).toBeVisible();
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "false");
    expect(screen.queryByRole("button", { name: "Adicionar anotação" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compartilhar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ações do documento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Catálogo de símbolos" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Inspetor" })).toHaveTextContent("Somente leitura");
    expect(screen.getByRole("region", { name: "Validações do documento" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Participantes" })).toHaveTextContent("Você");
    expect(screen.getByText("Sessão local")).toBeVisible();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Voltar ao DCOU" })).toHaveClass("min-h-11", "min-w-11");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-viewport-action", "zoom-in");
    fireEvent.click(screen.getByRole("button", { name: "Tentar comando do canvas" }));
    fireEvent.keyDown(window, { key: "a", ctrlKey: true, shiftKey: true });
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-annotation-count", "0");
    expect(pidServices.document.save).not.toHaveBeenCalled();

    resizeViewport(1024);
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "false");
    expect(screen.queryByRole("button", { name: "Compartilhar" })).not.toBeInTheDocument();
  });

  it("habilita edit exatamente em 768 px e reage ao resize uma vez sob StrictMode", async () => {
    setViewportWidth(767);
    const pidServices = services("edit");
    mount(pidServices, true);
    await screen.findByText("Edição disponível em telas a partir de 768 px");
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "false");

    resizeViewport(768);
    await waitFor(() => expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "true"));
    expect(screen.queryByText("Edição disponível em telas a partir de 768 px")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar anotação" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Compartilhar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Ações do documento" })).toBeEnabled();
    expect(screen.getByRole("region", { name: "Catálogo de símbolos" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "a", ctrlKey: true, shiftKey: true });
    await waitFor(() => expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-annotation-count", "1"));
  });

  it("mantém a sessão local não sincronizada enquanto o salvamento está em andamento", async () => {
    setViewportWidth(768);
    const save = vi.fn(() => new Promise<number>(() => {}));
    mount(services("edit", { save }));
    await screen.findByTestId("pid-canvas");

    vi.useFakeTimers();
    try {
      fireEvent.keyDown(window, { key: "a", ctrlKey: true, shiftKey: true });
      expect(screen.getByLabelText("Colaboração local")).toHaveTextContent("Não salvo");
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(save).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Salvando");
      expect(screen.getByLabelText("Colaboração local")).toHaveTextContent("Não salvo");
    } finally {
      vi.useRealTimers();
    }
  });

  it("faz flush ao perder capacidade e retoma falha somente quando a tela volta a ser editável", async () => {
    setViewportWidth(768);
    const save = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(3);
    mount(services("edit", { save }));
    await screen.findByTestId("pid-canvas");

    fireEvent.keyDown(window, { key: "a", ctrlKey: true, shiftKey: true });
    resizeViewport(375);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Não foi possível salvar o diagrama.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Tentar salvar novamente" })).not.toBeInTheDocument();
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "false");

    resizeViewport(768);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Sincronizado"));
  });

  it("faz flush imediato no shrink e retoma depois de falha que termina após o expand", async () => {
    setViewportWidth(768);
    const first = deferred<number>();
    const save = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(3);
    mount(services("edit", { save }));
    await screen.findByTestId("pid-canvas");

    vi.useFakeTimers();
    try {
      fireEvent.keyDown(window, { key: "a", ctrlKey: true, shiftKey: true });
      resizeViewport(375);
      expect(save).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("button", { name: "Tentar salvar novamente" })).not.toBeInTheDocument();

      resizeViewport(768);
      await act(async () => { first.reject(new Error("offline")); await Promise.resolve(); });
      await act(async () => { await vi.runOnlyPendingTimersAsync(); });
      expect(save).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Sincronizado");
    } finally {
      vi.useRealTimers();
    }
  });

  it("exporta uma projeção JSON real também em view mobile", async () => {
    setViewportWidth(375);
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pid-export");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      mount(services("view"));
      const exportButton = await screen.findByRole("button", { name: "Exportar" });
      fireEvent.click(exportButton);

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:pid-export");
      expect(await screen.findByText("Documento P&ID exportado em JSON.")).toBeInTheDocument();
    } finally {
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
      click.mockRestore();
    }
  });
});

function services(scope: "view" | "edit", overrides: Partial<PidDocumentPort> = {}): PidServices {
  return {
    document: {
      create: vi.fn(),
      open: vi.fn().mockResolvedValue({ scope, document: documentFixture, revision: 1 }),
      save: vi.fn().mockImplementation(async (_diagramId, _token, _document, revision) => revision + 1),
      regenerate: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      ...overrides,
    },
    catalog: { list: vi.fn() },
    collaboration: { connect: vi.fn() },
  };
}

function mount(pidServices: PidServices, strict = false) {
  const router = createMemoryRouter([{ path: "/pid/:diagramId", element: <PidEditorPage /> }], {
    initialEntries: [`/pid/${diagramId}#access=token`],
  });
  const page = <PidServicesProvider services={pidServices}><RouterProvider router={router} /></PidServicesProvider>;
  return render(strict ? <StrictMode>{page}</StrictMode> : page);
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

function resizeViewport(width: number) {
  act(() => {
    setViewportWidth(width);
    window.dispatchEvent(new Event("resize"));
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
