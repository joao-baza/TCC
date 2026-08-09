import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { createMemoryRouter, RouterProvider, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PidServices } from "@/features/pid/api/contracts";
import { PidDocumentError } from "@/features/pid/api/contracts";
import { PidServicesProvider } from "@/features/pid/api/pid-services";
import { createEmptyDocument } from "@/features/pid/domain/schema";

vi.mock("@/features/pid/canvas/pid-canvas", () => ({
  PidCanvas: ({ document: pidDocument, editable, onCommand, onSelectionChange }: {
    document: { annotations: Record<string, unknown> };
    editable: boolean;
    onCommand: (command: { type: "annotation.insert"; text: string; position: { x: number; y: number } }) => void;
    onSelectionChange: (selection: { nodeIds: string[]; edgeIds: string[] }) => void;
  }) => <div data-testid="pid-canvas" data-editable={String(editable)} data-annotation-count={Object.keys(pidDocument.annotations).length}>
    <button type="button" onClick={() => onCommand({ type: "annotation.insert", text: "Nota", position: { x: 10, y: 10 } })}>Simular alteração</button>
    <button type="button" onClick={() => onSelectionChange({ nodeIds: [], edgeIds: [] })}>Simular seleção</button>
  </div>,
}));

import { PidEditorPage } from "@/features/pid/editor/pid-editor-page";

const diagramId = "00000001-0000-4000-8000-000000000000";
const document = createEmptyDocument(
  { title: "Utilidades", standard: "iso" },
  { generateId: () => diagramId, now: () => new Date("2026-08-09T12:00:00Z") },
);

function services(overrides: Partial<PidServices["document"]> = {}, scope: "view" | "edit" = "edit"): PidServices {
  return {
    document: {
      create: vi.fn(),
      open: vi.fn().mockResolvedValue({ scope, document, revision: 1 }),
      save: vi.fn().mockResolvedValue(2),
      regenerate: vi.fn().mockResolvedValue({ token: "rotated-token", revision: 2 }),
      softDelete: vi.fn().mockResolvedValue(3),
      restore: vi.fn().mockResolvedValue(4),
      ...overrides,
    },
    catalog: { list: vi.fn() },
    collaboration: { connect: vi.fn() },
  };
}

function mount(pidServices: PidServices, strict = false) {
  const router = createMemoryRouter([{
    path: "/pid/:diagramId",
    element: <PidEditorPage />,
  }], { initialEntries: [`/pid/${diagramId}#access=edit-token`] });
  const page = <PidServicesProvider services={pidServices}><RouterProvider router={router} /></PidServicesProvider>;
  return render(strict ? <StrictMode>{page}</StrictMode> : page);
}

function NavigationControl({ targetId }: { targetId: string }) {
  const navigate = useNavigate();
  return <button type="button" onClick={() => void navigate(`/pid/${targetId}#access=next-token`)}>Navegar para outro diagrama</button>;
}

function mountWithNavigation(pidServices: PidServices, targetId: string) {
  const router = createMemoryRouter([{
    path: "/pid/:diagramId",
    element: <><NavigationControl targetId={targetId} /><PidEditorPage /></>,
  }], { initialEntries: [`/pid/${diagramId}#access=edit-token`] });
  return { router, ...render(<PidServicesProvider services={pidServices}><RouterProvider router={router} /></PidServicesProvider>) };
}

function mountWithExitNavigation(pidServices: PidServices) {
  const router = createMemoryRouter([
    { path: "/", element: <h1>Início</h1> },
    { path: "/pid/:diagramId", element: <PidEditorPage /> },
  ], { initialEntries: ["/", `/pid/${diagramId}#access=edit-token`], initialIndex: 1 });
  return { router, ...render(<PidServicesProvider services={pidServices}><RouterProvider router={router} /></PidServicesProvider>) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

describe("studio focado P&ID", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => window.history.replaceState(null, "", "/"));

  it("compõe toolbar, catálogo, canvas, inspector reservado e status sem AppShell", async () => {
    mount(services());
    expect(await screen.findByRole("heading", { name: "Utilidades" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Ferramentas do editor P&ID" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Catálogo de símbolos" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Inspetor" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Sincronizado");
    expect(screen.getByRole("link", { name: "Voltar ao DCOU" })).toHaveAttribute("href", "/");
    expect(screen.getByText("ISO")).toBeInTheDocument();
    expect(screen.getByText("Acesso de edição")).toHaveClass("sr-only");
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Compartilhar" })).toBeEnabled();
  });

  it("salva mudança local uma vez após debounce de 400ms mesmo em StrictMode", async () => {
    vi.useFakeTimers();
    const pidServices = services();
    mount(pidServices, true);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Não salvo");
    await act(async () => { await vi.advanceTimersByTimeAsync(399); });
    expect(pidServices.document.save).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(pidServices.document.save).toHaveBeenCalledOnce();
    expect(pidServices.document.save).toHaveBeenCalledWith(diagramId, "edit-token", expect.any(Object), 1);
    expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Sincronizado");
  });

  it("bloqueia autosave em conflito e orienta recarregar sem sobrescrever", async () => {
    vi.useFakeTimers();
    const pidServices = services({ save: vi.fn().mockRejectedValue(new PidDocumentError("CONFLICT")) });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(screen.getByRole("alert")).toHaveTextContent("alterado em outra janela");
    expect(screen.getByRole("button", { name: "Recarregar diagrama" })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(pidServices.document.save).toHaveBeenCalledOnce();
  });

  it("serializa saves e coalesce a versão mais recente alterada durante uma requisição em voo", async () => {
    vi.useFakeTimers();
    const first = deferred<number>();
    const second = deferred<number>();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const pidServices = services({ save });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    expect(save).toHaveBeenCalledOnce();

    await act(async () => { first.resolve(2); await first.promise; });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][3]).toBe(2);
    expect(Object.keys(save.mock.calls[1][2].annotations)).toHaveLength(2);
    await act(async () => { second.resolve(3); await second.promise; });
    expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Sincronizado");
  });

  it("oferece retry para falha transitória e não atualiza estado depois do unmount", async () => {
    vi.useFakeTimers();
    const pending = deferred<number>();
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockReturnValueOnce(pending.promise);
    const pidServices = services({ save });
    const mounted = mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar");
    fireEvent.click(screen.getByRole("button", { name: "Tentar salvar novamente" }));
    expect(save).toHaveBeenCalledTimes(2);
    mounted.unmount();
    await act(async () => { pending.resolve(2); await pending.promise; });
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("faz flush da versão pendente ao desmontar sem atualizar estado depois do unmount", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(2);
    const mounted = mount(services({ save }));
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    mounted.unmount();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(save).toHaveBeenCalledOnce();
    expect(Object.keys(save.mock.calls[0][2].annotations)).toHaveLength(1);
    const afterUnmount = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(afterUnmount);
    expect(afterUnmount.defaultPrevented).toBe(false);
  });

  it("aguarda o flush antes de abrir outra rota e permite retry quando o save falha", async () => {
    const targetId = "00000002-0000-4000-8000-000000000000";
    const nextDocument = createEmptyDocument(
      { title: "Próximo diagrama", standard: "iso" },
      { generateId: () => targetId, now: () => new Date("2026-08-09T12:00:00Z") },
    );
    const firstSave = deferred<number>();
    const save = vi.fn().mockReturnValueOnce(firstSave.promise).mockResolvedValueOnce(2);
    const open = vi.fn()
      .mockResolvedValueOnce({ scope: "edit", document, revision: 1 })
      .mockResolvedValueOnce({ scope: "edit", document: nextDocument, revision: 2 });
    mountWithNavigation(services({ open, save }), targetId);
    await screen.findByRole("heading", { name: "Utilidades" });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    fireEvent.click(screen.getByRole("button", { name: "Navegar para outro diagrama" }));
    expect(open).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Utilidades" })).toBeInTheDocument();

    await act(async () => { firstSave.reject(new Error("offline")); await Promise.resolve(); });
    expect(await screen.findByText(/Não foi possível salvar o diagrama antes de navegar/)).toBeInTheDocument();
    expect(open).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Utilidades" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar navegar novamente" }));
    expect(await screen.findByRole("heading", { name: "Próximo diagrama" })).toBeInTheDocument();
    expect(open).toHaveBeenCalledTimes(2);
    expect(Object.keys(save.mock.calls[1][2].annotations)).toHaveLength(1);
  });

  it.each([
    ["link Voltar ao DCOU", async (router: ReturnType<typeof createMemoryRouter>) => {
      fireEvent.click(screen.getByRole("link", { name: "Voltar ao DCOU" }));
      await Promise.resolve();
    }],
    ["histórico Back", async (router: ReturnType<typeof createMemoryRouter>) => { await router.navigate(-1); }],
  ])("bloqueia saída por %s até salvar e só prossegue uma vez após retry", async (_label, leave) => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(2);
    const { router } = mountWithExitNavigation(services({ save }));
    await screen.findByRole("heading", { name: "Utilidades" });
    let destinationArrivals = 0;
    const unsubscribe = router.subscribe((state) => {
      if (state.location.pathname === "/") destinationArrivals += 1;
    });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));

    await act(async () => { await leave(router); });

    expect(await screen.findByText(/Não foi possível salvar o diagrama antes de navegar/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/pid/${diagramId}`);
    expect(screen.getByRole("heading", { name: "Utilidades" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Permanecer no editor" })).toBeEnabled();
    expect(destinationArrivals).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Tentar navegar novamente" }));
    expect(await screen.findByRole("heading", { name: "Início" })).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(2);
    expect(destinationArrivals).toBe(1);
    await act(async () => { await Promise.resolve(); });
    expect(destinationArrivals).toBe(1);
    unsubscribe();
  });

  it("mantém o studio de visualização somente leitura e sem controles de mutação", async () => {
    mount(services({}, "view"));
    await screen.findByRole("heading", { name: "Utilidades" });
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-editable", "false");
    expect(screen.queryByRole("button", { name: "Compartilhar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ações do documento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir seleção" })).not.toBeInTheDocument();
  });

  it("rotaciona o token de edição atomicamente para saves seguintes e para a URL", async () => {
    vi.useFakeTimers();
    const pidServices = services();
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    fireEvent.click(screen.getByRole("button", { name: "Gerar novo link de edição" }));
    await act(async () => { await Promise.resolve(); });
    expect(pidServices.document.regenerate).toHaveBeenCalledWith(diagramId, "edit-token", "edit", 1);
    expect(window.location.hash).toBe("#access=rotated-token");
    fireEvent.click(screen.getByRole("button", { name: "Fechar compartilhamento" }));
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(pidServices.document.save).toHaveBeenCalledWith(diagramId, "rotated-token", expect.any(Object), 2);
  });

  it("exige o título exato para excluir e permite restaurar com a revisão retornada", async () => {
    const pidServices = services();
    mount(pidServices);
    await screen.findByRole("heading", { name: "Utilidades" });
    const actionsTrigger = screen.getByRole("button", { name: "Ações do documento" });
    fireEvent.click(actionsTrigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir diagrama" }));
    const confirmation = screen.getByLabelText("Digite Utilidades para confirmar");
    fireEvent.change(confirmation, { target: { value: "utilidades" } });
    expect(screen.getByRole("button", { name: "Confirmar exclusão" })).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(pidServices.document.softDelete).toHaveBeenCalledWith(diagramId, "edit-token", 1));
    expect(await screen.findByRole("alert")).toHaveTextContent("Diagrama excluído");
    fireEvent.click(screen.getByRole("button", { name: "Restaurar diagrama" }));
    await waitFor(() => expect(pidServices.document.restore).toHaveBeenCalledWith(diagramId, "edit-token", 3));
    expect(screen.getByTestId("pid-canvas")).toBeInTheDocument();
  });

  it("salva a versão pendente antes de excluir e restaura o conteúdo mais recente", async () => {
    vi.useFakeTimers();
    let persisted = document;
    const save = vi.fn().mockImplementation(async (_diagramId, _token, nextDocument) => {
      persisted = nextDocument;
      return 2;
    });
    const open = vi.fn()
      .mockResolvedValueOnce({ scope: "edit", document, revision: 1 })
      .mockImplementationOnce(async () => ({ scope: "edit", document: persisted, revision: 4 }));
    const pidServices = services({ open, save });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    fireEvent.click(screen.getByRole("button", { name: "Ações do documento" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir diagrama" }));
    fireEvent.change(screen.getByLabelText("Digite Utilidades para confirmar"), { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });

    expect(save).toHaveBeenCalledOnce();
    expect(Object.keys(save.mock.calls[0][2].annotations)).toHaveLength(1);
    expect(pidServices.document.softDelete).toHaveBeenCalledWith(diagramId, "edit-token", 2);
    expect(screen.queryByRole("button", { name: "Compartilhar" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Pesquisar símbolos")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pid-canvas")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restaurar diagrama" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByRole("button", { name: "Compartilhar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pesquisar símbolos")).toBeInTheDocument();
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-annotation-count", "1");
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(save).toHaveBeenLastCalledWith(diagramId, "edit-token", expect.any(Object), 4);
  });

  it("aborta a exclusão e mantém a edição recuperável quando o flush falha", async () => {
    const save = vi.fn().mockRejectedValue(new Error("offline"));
    const softDelete = vi.fn();
    const pidServices = services({ save, softDelete });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    const actionsTrigger = screen.getByRole("button", { name: "Ações do documento" });
    fireEvent.click(actionsTrigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir diagrama" }));
    fireEvent.change(screen.getByLabelText("Digite Utilidades para confirmar"), { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(save).toHaveBeenCalledOnce();
    expect(softDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId("pid-canvas")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog", { name: "Excluir diagrama" })).toHaveTextContent("Não foi possível excluir");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog", { name: "Excluir diagrama" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Compartilhar" })).toBeEnabled();
    expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Não salvo");
  });

  it("preserva a revisão confirmada quando um flush parcial falha antes da exclusão", async () => {
    const firstSave = deferred<number>();
    const save = vi.fn()
      .mockReturnValueOnce(firstSave.promise)
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(async (_diagramId, _token, _document, expectedRevision) => {
        if (expectedRevision !== 2) throw new PidDocumentError("CONFLICT");
        return 3;
      });
    const softDelete = vi.fn().mockResolvedValue(4);
    const pidServices = services({ save, softDelete });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    fireEvent.click(screen.getByRole("button", { name: "Ações do documento" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir diagrama" }));
    fireEvent.change(screen.getByLabelText("Digite Utilidades para confirmar"), { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    await act(async () => { firstSave.resolve(2); await firstSave.promise; await Promise.resolve(); });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(Object.keys(save.mock.calls[0][2].annotations)).toHaveLength(1);
    expect(Object.keys(save.mock.calls[1][2].annotations)).toHaveLength(2);
    expect(save.mock.calls[1][3]).toBe(2);
    expect(softDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "Excluir diagrama" })).toHaveTextContent("Não foi possível excluir");

    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(softDelete).toHaveBeenCalledWith(diagramId, "edit-token", 3));
    expect(save).toHaveBeenCalledTimes(3);
    expect(Object.keys(save.mock.calls[2][2].annotations)).toHaveLength(2);
    expect(save.mock.calls[2][3]).toBe(2);
  });

  it("contém foco e bloqueia atalhos do editor nos diálogos de share e exclusão", async () => {
    const pidServices = services();
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    const shareTrigger = screen.getByRole("button", { name: "Compartilhar" });
    fireEvent.click(shareTrigger);
    const shareDialog = screen.getByRole("dialog", { name: "Compartilhar diagrama" });
    const closeShare = screen.getByRole("button", { name: "Fechar compartilhamento" });
    await waitFor(() => expect(closeShare).toHaveFocus());
    expect(shareTrigger.closest("[data-base-ui-inert]")).not.toBeNull();
    fireEvent.keyDown(closeShare, { key: "Tab", shiftKey: true });
    expect(shareDialog).toContainElement(globalThis.document.activeElement as HTMLElement);
    fireEvent.keyDown(closeShare, { key: "a", ctrlKey: true, shiftKey: true });
    expect(pidServices.document.save).not.toHaveBeenCalled();
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-annotation-count", "0");
    expect(shareDialog).toBeInTheDocument();
    fireEvent.keyDown(closeShare, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Compartilhar diagrama" })).not.toBeInTheDocument());
    expect(shareTrigger).toHaveFocus();

    const actionsTrigger = screen.getByRole("button", { name: "Ações do documento" });
    fireEvent.click(actionsTrigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir diagrama" }));
    const deleteDialog = screen.getByRole("alertdialog", { name: "Excluir diagrama" });
    const confirmation = screen.getByLabelText("Digite Utilidades para confirmar");
    await waitFor(() => expect(confirmation).toHaveFocus());
    expect(actionsTrigger.closest("[data-base-ui-inert]")).not.toBeNull();
    const cancel = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.keyDown(confirmation, { key: "Tab", shiftKey: true });
    expect(deleteDialog).toContainElement(globalThis.document.activeElement as HTMLElement);
    cancel.focus();
    fireEvent.keyDown(cancel, { key: "a", ctrlKey: true, shiftKey: true });
    expect(pidServices.document.save).not.toHaveBeenCalled();
    expect(screen.getByTestId("pid-canvas")).toHaveAttribute("data-annotation-count", "0");
    expect(deleteDialog).toBeInTheDocument();
    fireEvent.keyDown(cancel, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog", { name: "Excluir diagrama" })).not.toBeInTheDocument());
    expect(actionsTrigger).toHaveFocus();
  });

  it("espera o save em voo antes do soft delete e não agenda save subsequente", async () => {
    vi.useFakeTimers();
    const pending = deferred<number>();
    const save = vi.fn().mockReturnValue(pending.promise);
    const softDelete = vi.fn().mockResolvedValue(3);
    const pidServices = services({ save, softDelete });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Ações do documento" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir diagrama" }));
    fireEvent.change(screen.getByLabelText("Digite Utilidades para confirmar"), { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    expect(softDelete).not.toHaveBeenCalled();

    await act(async () => { pending.resolve(2); await pending.promise; await Promise.resolve(); });
    expect(softDelete).toHaveBeenCalledWith(diagramId, "edit-token", 2);
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(save).toHaveBeenCalledOnce();
  });

  it("preserva a revisão restaurada e recupera sem repetir o CAS quando a primeira reabertura falha", async () => {
    const open = vi.fn()
      .mockResolvedValueOnce({ scope: "edit", document, revision: 1 })
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ scope: "edit", document, revision: 4 });
    const restore = vi.fn().mockResolvedValue(4);
    const pidServices = services({ open, restore });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Ações do documento" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir diagrama" }));
    fireEvent.change(screen.getByLabelText("Digite Utilidades para confirmar"), { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Restaurar diagrama" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Restaurar diagrama" }));
    expect(await screen.findByText("O diagrama foi restaurado, mas não foi possível recarregá-lo.")).toBeInTheDocument();
    expect(restore).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Tentar recuperar diagrama" }));
    await waitFor(() => expect(screen.getByTestId("pid-canvas")).toBeInTheDocument());

    expect(restore).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await waitFor(() => expect(pidServices.document.save).toHaveBeenCalledWith(diagramId, "edit-token", expect.any(Object), 4));
  });
});
