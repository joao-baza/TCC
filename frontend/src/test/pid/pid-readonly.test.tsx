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
  PidCanvas: ({ document, editable, onCommand, onSelectionChange, viewportAction }: {
    document: PidDocument;
    editable: boolean;
    onCommand: (command: PidCommand) => boolean;
    onSelectionChange: (selection: { nodeIds: string[]; edgeIds: string[]; annotationIds: string[] }) => void;
    viewportAction?: { type: string };
  }) => <div
    data-testid="pid-canvas"
    data-editable={String(editable)}
    data-annotation-count={Object.keys(document.annotations).length}
    data-annotation-texts={Object.values(document.annotations).map((annotation) => annotation.text).join("|")}
    data-viewport-action={viewportAction?.type ?? ""}
  >
    <button type="button" onClick={() => onCommand({ type: "annotation.insert", text: "Forçada", position: { x: 1, y: 1 } })}>
      Tentar comando do canvas
    </button>
    {Object.keys(document.annotations)[0] && <button type="button" onClick={() => onSelectionChange({
      nodeIds: [], edgeIds: [], annotationIds: [Object.keys(document.annotations)[0]],
    })}>
      Selecionar anotação
    </button>}
    <button type="button" onClick={() => onSelectionChange({ nodeIds: [], edgeIds: [], annotationIds: [] })}>
      Limpar seleção
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
    expect(screen.getByRole("button", { name: "Exportar SVG" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Exportar PNG" })).toBeEnabled();
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
      expect(screen.getByRole("button", { name: "Exportar SVG" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Exportar PNG" })).toBeDisabled();
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

  it("consolida e salva o rascunho válido do inspetor antes de revogar a edição", async () => {
    const annotationId = "50000000-0000-4000-8000-000000000099";
    let persisted = documentWithAnnotation(annotationId);
    let revision = 1;
    const save = vi.fn().mockImplementation(async (_id, _token, next: PidDocument) => {
      persisted = structuredClone(next);
      revision += 1;
      return revision;
    });
    const pidServices = services("edit", {
      open: vi.fn().mockImplementation(async () => ({ scope: "edit", document: structuredClone(persisted), revision })),
      save,
    });
    const first = mount(pidServices, true);

    fireEvent.click(await screen.findByRole("button", { name: "Selecionar anotação" }));
    const text = screen.getByLabelText("Texto");
    text.focus();
    fireEvent.change(text, { target: { value: "Rascunho sem blur" } });

    resizeViewport(375);
    await waitFor(() => expect(save).toHaveBeenCalledWith(
      diagramId,
      "token",
      expect.objectContaining({
        annotations: expect.objectContaining({
          [annotationId]: expect.objectContaining({ text: "Rascunho sem blur" }),
        }),
      }),
      1,
    ));
    expect(screen.getByLabelText("Texto")).toBeDisabled();

    first.unmount();
    setViewportWidth(768);
    mount(pidServices, true);
    fireEvent.click(await screen.findByRole("button", { name: "Selecionar anotação" }));
    expect(screen.getByLabelText("Texto")).toHaveValue("Rascunho sem blur");
  });

  it("preserva um rascunho inválido no modo somente leitura e permite corrigi-lo ao expandir", async () => {
    const annotationId = "50000000-0000-4000-8000-000000000099";
    const save = vi.fn().mockImplementation(async (_id, _token, _next, currentRevision) => currentRevision + 1);
    mount(services("edit", {
      open: vi.fn().mockResolvedValue({ scope: "edit", document: documentWithAnnotation(annotationId), revision: 1 }),
      save,
    }), true);

    fireEvent.click(await screen.findByRole("button", { name: "Selecionar anotação" }));
    const x = screen.getByLabelText("Posição X");
    x.focus();
    fireEvent.change(x, { target: { value: "" } });

    resizeViewport(375);
    await waitFor(() => expect(screen.getByLabelText("Posição X")).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByLabelText("Posição X")).toBeDisabled();
    expect(screen.getByLabelText("Posição X")).toHaveValue(null);
    expect(screen.getByText("Informe um número.")).toBeVisible();
    expect(save).not.toHaveBeenCalled();

    resizeViewport(768);
    await waitFor(() => expect(screen.getByLabelText("Posição X")).toBeEnabled());
    expect(screen.getByLabelText("Posição X")).toHaveValue(null);
    fireEvent.change(screen.getByLabelText("Posição X"), { target: { value: "42" } });
    fireEvent.blur(screen.getByLabelText("Posição X"));
    await waitFor(() => expect(save).toHaveBeenCalledWith(
      diagramId,
      "token",
      expect.objectContaining({
        annotations: expect.objectContaining({
          [annotationId]: expect.objectContaining({ x: 42 }),
        }),
      }),
      1,
    ));
  });

  it.each([
    ["undo", "botão"],
    ["undo", "atalho"],
    ["redo", "botão"],
    ["redo", "atalho"],
    ["paste", "botão"],
    ["paste", "atalho"],
    ["duplicate", "botão"],
    ["duplicate", "atalho"],
  ] as const)("bloqueia %s por %s sem descartar o rascunho inválido", async (action, trigger) => {
    const annotationId = "50000000-0000-4000-8000-000000000099";
    mount(services("edit", {
      open: vi.fn().mockResolvedValue({ scope: "edit", document: documentWithAnnotation(annotationId), revision: 1 }),
    }), true);

    fireEvent.click(await screen.findByRole("button", { name: "Selecionar anotação" }));
    const text = screen.getByLabelText("Texto");
    if (action === "undo" || action === "redo") {
      fireEvent.change(text, { target: { value: "Texto confirmado" } });
      fireEvent.blur(text);
      await waitFor(() => expect(screen.getByRole("button", { name: "Desfazer" })).toBeEnabled());
    }
    if (action === "redo") {
      fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Refazer" })).toBeEnabled());
    }
    if (action === "paste") {
      fireEvent.click(screen.getByRole("button", { name: "Copiar" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Colar" })).toBeEnabled());
    }

    const x = screen.getByLabelText("Posição X");
    fireEvent.change(x, { target: { value: "" } });
    fireEvent.blur(x);
    expect(x).toHaveAttribute("aria-invalid", "true");

    if (trigger === "botão") {
      fireEvent.click(screen.getByRole("button", { name: action === "undo"
        ? "Desfazer"
        : action === "redo"
          ? "Refazer"
          : action === "paste"
            ? "Colar"
            : "Duplicar" }));
    } else {
      fireEvent.keyDown(window, action === "undo"
        ? { key: "z", ctrlKey: true }
        : action === "redo"
          ? { key: "z", ctrlKey: true, shiftKey: true }
          : action === "paste"
            ? { key: "v", ctrlKey: true }
            : { key: "d", ctrlKey: true });
    }

    await waitFor(() => expect(screen.getByLabelText("Posição X")).toHaveValue(null));
    expect(screen.getByLabelText("Posição X")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Informe um número.")).toBeVisible();
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-annotation-count", "1");
    expect(screen.getByLabelText("Texto")).toHaveValue(action === "undo" ? "Texto confirmado" : "Texto persistido");
  });

  it("prepara o rascunho válido uma vez antes de duplicar", async () => {
    const annotationId = "50000000-0000-4000-8000-000000000099";
    mount(services("edit", {
      open: vi.fn().mockResolvedValue({ scope: "edit", document: documentWithAnnotation(annotationId), revision: 1 }),
    }), true);

    fireEvent.click(await screen.findByRole("button", { name: "Selecionar anotação" }));
    const text = screen.getByLabelText("Texto");
    text.focus();
    fireEvent.change(text, { target: { value: "Rascunho válido" } });
    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));

    await waitFor(() => expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-annotation-count", "2"));
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute(
      "data-annotation-texts",
      "Rascunho válido|Rascunho válido",
    );
  });

  it("bloqueia troca de seleção e ferramenta enquanto o rascunho exige correção", async () => {
    const annotationId = "50000000-0000-4000-8000-000000000099";
    mount(services("edit", {
      open: vi.fn().mockResolvedValue({ scope: "edit", document: documentWithAnnotation(annotationId), revision: 1 }),
    }), true);

    fireEvent.click(await screen.findByRole("button", { name: "Selecionar anotação" }));
    const x = screen.getByLabelText("Posição X");
    fireEvent.change(x, { target: { value: "" } });
    fireEvent.blur(x);

    fireEvent.click(screen.getByRole("button", { name: "Linha de utilidade" }));
    expect(screen.getByRole("button", { name: "Linha de processo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Linha de utilidade" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(screen.getByLabelText("Posição X")).toHaveValue(null);
    expect(screen.getByLabelText("Posição X")).toHaveAttribute("aria-invalid", "true");
  });

  it("exporta uma projeção SVG real também em view mobile", async () => {
    setViewportWidth(375);
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pid-export");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      mount(services("view"));
      const exportButton = await screen.findByRole("button", { name: "Exportar SVG" });
      fireEvent.click(exportButton);

      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
      const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/svg+xml;charset=utf-8");
      expect(click).toHaveBeenCalledTimes(1);
      expect(await screen.findByText("Documento P&ID exportado em SVG.")).toBeInTheDocument();
      await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:pid-export"));
    } finally {
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
      click.mockRestore();
    }
  });

  it("mantém SVG disponível e relata a mensagem exata quando o PNG falha", async () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><circle cx="60" cy="40" r="20" fill="none" stroke="currentColor"/></svg>';
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, text: async () => source } as Response);
    const OriginalImage = globalThis.Image;
    class FailingImage {
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      private value = "";
      set src(value: string) { this.value = value; if (value) queueMicrotask(() => this.onerror?.(new Event("error"))); }
      get src() { return this.value; }
    }
    Object.defineProperty(globalThis, "Image", { configurable: true, value: FailingImage });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pid-export");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const nodeId = "50000000-0000-4000-8000-000000000001";
      const withNode = { ...documentFixture, nodes: {
        [nodeId]: { id: nodeId, symbolKey: "project.pump.centrifugal", catalogVersion: "local-v1", x: 0, y: 0, width: 96, height: 64, rotation: 0, tag: "P-1", label: "Bomba", properties: {} },
      } };
      mount(services("view", { open: vi.fn().mockResolvedValue({ scope: "view", document: withNode, revision: 1 }) }));
      const png = await screen.findByRole("button", { name: "Exportar PNG" });
      fireEvent.click(png);
      fireEvent.click(png);

      expect(await screen.findByText("Não foi possível gerar PNG")).toBeVisible();
      expect(screen.getByRole("button", { name: "Exportar SVG" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Exportar PNG" })).toBeEnabled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:pid-export");
    } finally {
      fetchMock.mockRestore(); createObjectURL.mockRestore(); revokeObjectURL.mockRestore();
      Object.defineProperty(globalThis, "Image", { configurable: true, value: OriginalImage });
    }
  });

  it("permite repetir SVG depois de falha transitória ao carregar o ativo", async () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect x="20" y="10" width="80" height="60" fill="none" stroke="currentColor"/></svg>';
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, text: async () => source } as Response);
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pid-export");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      const nodeId = "50000000-0000-4000-8000-000000000002";
      const withNode = { ...documentFixture, nodes: {
        [nodeId]: { id: nodeId, symbolKey: "project.tank.storage", catalogVersion: "local-v1", x: 0, y: 0, width: 80, height: 72, rotation: 0, tag: "T-1", label: "Tanque", properties: {} },
      } };
      mount(services("view", { open: vi.fn().mockResolvedValue({ scope: "view", document: withNode, revision: 1 }) }));
      const svg = await screen.findByRole("button", { name: "Exportar SVG" });
      fireEvent.click(svg);
      expect(await screen.findByText("Não foi possível gerar SVG")).toBeVisible();

      fireEvent.click(svg);
      expect(await screen.findByText("Documento P&ID exportado em SVG.")).toBeVisible();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(click).toHaveBeenCalledOnce();
    } finally {
      fetchMock.mockRestore(); createObjectURL.mockRestore(); revokeObjectURL.mockRestore(); click.mockRestore();
    }
  });

  it("cancela o download quando o editor desmonta durante o carregamento", async () => {
    const pending = deferred<Response>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pid-export");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      const nodeId = "50000000-0000-4000-8000-000000000003";
      const withNode = { ...documentFixture, nodes: {
        [nodeId]: { id: nodeId, symbolKey: "project.instrument.flow-indicator", catalogVersion: "local-v1", x: 0, y: 0, width: 56, height: 56, rotation: 0, tag: "FI-1", label: "Indicador", properties: {} },
      } };
      const mounted = mount(services("view", { open: vi.fn().mockResolvedValue({ scope: "view", document: withNode, revision: 1 }) }));
      fireEvent.click(await screen.findByRole("button", { name: "Exportar SVG" }));
      mounted.unmount();
      await act(async () => {
        pending.resolve({ ok: true, text: async () => '<svg viewBox="0 0 120 80"><circle cx="60" cy="40" r="20" fill="none" stroke="currentColor"/></svg>' } as Response);
        await pending.promise;
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(createObjectURL).not.toHaveBeenCalled();
    } finally {
      fetchMock.mockRestore(); createObjectURL.mockRestore(); click.mockRestore();
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

function documentWithAnnotation(annotationId: string): PidDocument {
  const document = structuredClone(documentFixture);
  document.annotations[annotationId] = {
    id: annotationId,
    kind: "note",
    text: "Texto persistido",
    x: 10,
    y: 20,
    width: 120,
    height: 80,
    rotation: 0,
    properties: {},
  };
  return document;
}
