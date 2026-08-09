import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PidServices } from "@/features/pid/api/contracts";
import { PidDocumentError } from "@/features/pid/api/contracts";
import { PidServicesProvider } from "@/features/pid/api/pid-services";
import { createEmptyDocument } from "@/features/pid/domain/schema";

vi.mock("@/features/pid/canvas/pid-canvas", () => ({
  PidCanvas: ({ editable, onCommand, onSelectionChange }: {
    editable: boolean;
    onCommand: (command: { type: "annotation.insert"; text: string; position: { x: number; y: number } }) => void;
    onSelectionChange: (selection: { nodeIds: string[]; edgeIds: string[] }) => void;
  }) => <div data-testid="pid-canvas" data-editable={String(editable)}>
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
  const page = <PidServicesProvider services={pidServices}>
    <MemoryRouter initialEntries={[`/pid/${diagramId}#access=edit-token`]}>
      <Routes><Route path="/pid/:diagramId" element={<PidEditorPage />} /></Routes>
    </MemoryRouter>
  </PidServicesProvider>;
  return render(strict ? <StrictMode>{page}</StrictMode> : page);
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
    fireEvent.click(screen.getByRole("button", { name: "Ações do documento" }));
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

  it("cancela autosave pendente ao excluir e só reabilita editor, share e catálogo após restaurar", async () => {
    vi.useFakeTimers();
    const open = vi.fn()
      .mockResolvedValueOnce({ scope: "edit", document, revision: 1 })
      .mockResolvedValueOnce({ scope: "edit", document, revision: 4 });
    const pidServices = services({ open });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    fireEvent.click(screen.getByRole("button", { name: "Ações do documento" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir diagrama" }));
    fireEvent.change(screen.getByLabelText("Digite Utilidades para confirmar"), { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });

    expect(pidServices.document.save).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Compartilhar" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Pesquisar símbolos")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pid-canvas")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restaurar diagrama" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByRole("button", { name: "Compartilhar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pesquisar símbolos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(pidServices.document.save).toHaveBeenCalledWith(diagramId, "edit-token", expect.any(Object), 4);
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
});
