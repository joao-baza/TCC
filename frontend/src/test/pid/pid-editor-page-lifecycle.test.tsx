import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { createMemoryRouter, RouterProvider, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PidServices } from "@/features/pid/api/contracts";
import { PidDocumentError } from "@/features/pid/api/contracts";
import { PidServicesProvider } from "@/features/pid/api/pid-services";
import type { PidCommand } from "@/features/pid/domain/commands";
import type { PidDocument } from "@/features/pid/domain/model";
import { createEmptyDocument } from "@/features/pid/domain/schema";

vi.mock("@/features/pid/canvas/pid-canvas", () => ({
  PidCanvas: ({ document: pidDocument, editable, onCommand, onSelectionChange }: {
    document: PidDocument;
    editable: boolean;
    onCommand: (command: PidCommand) => void;
    onSelectionChange: (selection: { nodeIds: string[]; edgeIds: string[] }) => void;
  }) => <div data-testid="pid-canvas" data-editable={String(editable)} data-annotation-count={Object.keys(pidDocument.annotations).length}>
    <button type="button" onClick={() => onCommand({ type: "annotation.insert", text: "Nota", position: { x: 10, y: 10 } })}>Simular alteração</button>
    {Object.values(pidDocument.ports)
      .filter((port) => port.templateKey === "discharge" && port.capacity === 1)
      .map((port) => <button key={port.id} type="button" onClick={() => onCommand({ type: "element.patch", id: port.id, patch: { capacity: 2 } })}>Reparar {port.id}</button>)}
    <button type="button" onClick={() => onSelectionChange({ nodeIds: [], edgeIds: [] })}>Simular seleção</button>
  </div>,
}));

import { PidEditorPage } from "@/features/pid/editor/pid-editor-page";

const diagramId = "00000001-0000-4000-8000-000000000000";
const document = createEmptyDocument(
  { title: "Utilidades", standard: "free" },
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
    recent: { list: vi.fn().mockReturnValue([]), upsert: vi.fn() },
  };
}

function mount(pidServices: PidServices, strict = false) {
  const router = createMemoryRouter([
    { path: "/pid", element: <h1>Diagramas P&ID</h1> },
    { path: "/pid/:diagramId", element: <PidEditorPage /> },
  ], { initialEntries: [`/pid/${diagramId}#access=edit-token`] });
  const page = <PidServicesProvider services={pidServices}><RouterProvider router={router} /></PidServicesProvider>;
  return { router, ...render(strict ? <StrictMode>{page}</StrictMode> : page) };
}

function NavigationControl({ targetId }: { targetId: string }) {
  const navigate = useNavigate();
  return <button type="button" onClick={() => void navigate(`/pid/${targetId}#access=next-token`)}>Navegar para outro diagrama</button>;
}

function mountWithNavigation(pidServices: PidServices, targetId: string) {
  const router = createMemoryRouter([
    { path: "/pid", element: <h1>Diagramas P&ID</h1> },
    {
      path: "/pid/:diagramId",
      element: <><NavigationControl targetId={targetId} /><PidEditorPage /></>,
    },
  ], { initialEntries: [`/pid/${diagramId}#access=edit-token`] });
  return { router, ...render(<PidServicesProvider services={pidServices}><RouterProvider router={router} /></PidServicesProvider>) };
}

function mountWithExitNavigation(pidServices: PidServices) {
  const router = createMemoryRouter([
    { path: "/", element: <h1>Início</h1> },
    { path: "/pid", element: <h1>Diagramas P&ID</h1> },
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

const overloadedIds = {
  firstPump: "10000001-0000-4000-8000-000000000001",
  secondPump: "10000001-0000-4000-8000-000000000002",
  firstTank: "10000001-0000-4000-8000-000000000003",
  secondTank: "10000001-0000-4000-8000-000000000004",
  firstDischarge: "20000001-0000-4000-8000-000000000001",
  secondDischarge: "20000001-0000-4000-8000-000000000002",
  firstInlet: "20000001-0000-4000-8000-000000000003",
  secondInlet: "20000001-0000-4000-8000-000000000004",
} as const;

function doubleOverloadedDocument(): PidDocument {
  const draft = structuredClone(document);
  draft.metadata.standard = "free";
  const node = (id: string, symbolKey: string, x: number, tag: string): PidDocument["nodes"][string] => ({
    id,
    symbolKey,
    catalogVersion: draft.metadata.catalogVersion,
    x,
    y: 40,
    width: 96,
    height: 64,
    rotation: 0,
    tag,
    label: tag,
    properties: {},
  });
  draft.nodes = {
    [overloadedIds.firstPump]: node(overloadedIds.firstPump, "drawio.pid.pumps.centrifugal-pump-1", 20, "P-1"),
    [overloadedIds.secondPump]: node(overloadedIds.secondPump, "drawio.pid.pumps.centrifugal-pump-1", 20, "P-2"),
    [overloadedIds.firstTank]: node(overloadedIds.firstTank, "drawio.pid.vessels.tank", 300, "T-1"),
    [overloadedIds.secondTank]: node(overloadedIds.secondTank, "drawio.pid.vessels.tank", 520, "T-2"),
  };
  draft.ports = {
    [overloadedIds.firstDischarge]: { id: overloadedIds.firstDischarge, nodeId: overloadedIds.firstPump, templateKey: "discharge", direction: "output", connectionClass: "process", capacity: 1 },
    [overloadedIds.secondDischarge]: { id: overloadedIds.secondDischarge, nodeId: overloadedIds.secondPump, templateKey: "discharge", direction: "output", connectionClass: "process", capacity: 1 },
    [overloadedIds.firstInlet]: { id: overloadedIds.firstInlet, nodeId: overloadedIds.firstTank, templateKey: "inlet", direction: "input", connectionClass: "process", capacity: 2 },
    [overloadedIds.secondInlet]: { id: overloadedIds.secondInlet, nodeId: overloadedIds.secondTank, templateKey: "inlet", direction: "input", connectionClass: "process", capacity: 2 },
  };
  const edge = (id: string, sourcePortId: string, targetPortId: string, tag: string): PidDocument["edges"][string] => ({
    id,
    sourcePortId,
    targetPortId,
    connectionClass: "process",
    lineStyle: "supply-impulse",
    route: [],
    tag,
    label: tag,
    properties: {},
  });
  draft.edges = {
    "30000001-0000-4000-8000-000000000001": edge("30000001-0000-4000-8000-000000000001", overloadedIds.firstDischarge, overloadedIds.firstInlet, "L-1"),
    "30000001-0000-4000-8000-000000000002": edge("30000001-0000-4000-8000-000000000002", overloadedIds.firstDischarge, overloadedIds.secondInlet, "L-2"),
    "30000001-0000-4000-8000-000000000003": edge("30000001-0000-4000-8000-000000000003", overloadedIds.secondDischarge, overloadedIds.firstInlet, "L-3"),
    "30000001-0000-4000-8000-000000000004": edge("30000001-0000-4000-8000-000000000004", overloadedIds.secondDischarge, overloadedIds.secondInlet, "L-4"),
  };
  return draft;
}

function documentWithWarnings(): PidDocument {
  const draft = structuredClone(document);
  draft.metadata.standard = "free";
  draft.nodes[overloadedIds.firstPump] = {
    id: overloadedIds.firstPump,
    symbolKey: "drawio.pid.pumps.centrifugal-pump-1",
    catalogVersion: draft.metadata.catalogVersion,
    x: 20,
    y: 40,
    width: 96,
    height: 64,
    rotation: 0,
    tag: "P-1",
    label: "P-1",
    properties: {},
  };
  return draft;
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

  it("mantém reparos parciais localmente e só salva quando todos os erros bloqueantes forem corrigidos", async () => {
    vi.useFakeTimers();
    const invalidDocument = doubleOverloadedDocument();
    const save = vi.fn().mockResolvedValue(2);
    const pidServices = services({
      open: vi.fn().mockResolvedValue({ scope: "edit", document: invalidDocument, revision: 1 }),
      save,
    });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    const repairs = screen.getAllByRole("button", { name: /^Reparar / });
    expect(repairs).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Exportar SVG" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exportar PNG" })).toBeDisabled();
    fireEvent.click(repairs[0]);

    expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Não salvo");
    expect(screen.getByRole("alert")).toHaveTextContent(/erros bloqueantes/i);
    expect(screen.queryByRole("button", { name: "Tentar salvar novamente" })).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(save).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: /^Reparar / })[0]);
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });

    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][2].ports[overloadedIds.firstDischarge].capacity).toBe(2);
    expect(save.mock.calls[0][2].ports[overloadedIds.secondDischarge].capacity).toBe(2);
    expect(screen.getByRole("status", { name: "Status do documento" })).toHaveTextContent("Sincronizado");
    expect(screen.getByRole("button", { name: "Exportar SVG" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Exportar PNG" })).toBeEnabled();
  });

  it("continua salvando documentos que possuem apenas avisos", async () => {
    vi.useFakeTimers();
    const warningDocument = documentWithWarnings();
    const save = vi.fn().mockResolvedValue(2);
    const pidServices = services({
      open: vi.fn().mockResolvedValue({ scope: "edit", document: warningDocument, revision: 1 }),
      save,
    });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });

    expect(save).toHaveBeenCalledOnce();
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
      { title: "Próximo diagrama", standard: "free" },
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
    expect(screen.queryByRole("button", { name: "Excluir diagrama" })).not.toBeInTheDocument();
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

  it("exige o título exato para excluir e retorna para a listagem P&ID", async () => {
    const pidServices = services();
    const { router } = mount(pidServices);
    await screen.findByRole("heading", { name: "Utilidades" });
    const deleteTrigger = screen.getByRole("button", { name: "Excluir diagrama" });
    fireEvent.click(deleteTrigger);
    const confirmation = screen.getByLabelText("Digite Utilidades para confirmar");
    fireEvent.change(confirmation, { target: { value: "utilidades" } });
    expect(screen.getByRole("button", { name: "Confirmar exclusão" })).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(pidServices.document.softDelete).toHaveBeenCalledWith(diagramId, "edit-token", 1));
    await waitFor(() => expect(router.state.location.pathname).toBe("/pid"));
    expect(screen.getByRole("heading", { name: "Diagramas P&ID" })).toBeInTheDocument();
  });

  it("salva a versão pendente antes de excluir e retorna para a listagem", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockImplementation(async (_diagramId, _token, nextDocument) => {
      expect(Object.keys(nextDocument.annotations)).toHaveLength(1);
      return 2;
    });
    const pidServices = services({ save });
    const { router } = mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir diagrama" }));
    fireEvent.change(screen.getByLabelText("Digite Utilidades para confirmar"), { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });

    expect(save).toHaveBeenCalledOnce();
    expect(Object.keys(save.mock.calls[0][2].annotations)).toHaveLength(1);
    expect(pidServices.document.softDelete).toHaveBeenCalledWith(diagramId, "edit-token", 2);
    expect(router.state.location.pathname).toBe("/pid");
    expect(screen.getByRole("heading", { name: "Diagramas P&ID" })).toBeInTheDocument();
  });

  it("aborta a exclusão e mantém a edição recuperável quando o flush falha", async () => {
    const save = vi.fn().mockRejectedValue(new Error("offline"));
    const softDelete = vi.fn();
    const pidServices = services({ save, softDelete });
    mount(pidServices);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Simular alteração" }));
    const deleteTrigger = screen.getByRole("button", { name: "Excluir diagrama" });
    fireEvent.click(deleteTrigger);
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
    fireEvent.click(screen.getByRole("button", { name: "Excluir diagrama" }));
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

    const deleteTrigger = screen.getByRole("button", { name: "Excluir diagrama" });
    fireEvent.click(deleteTrigger);
    const deleteDialog = screen.getByRole("alertdialog", { name: "Excluir diagrama" });
    const confirmation = screen.getByLabelText("Digite Utilidades para confirmar");
    await waitFor(() => expect(confirmation).toHaveFocus());
    expect(deleteTrigger.closest("[data-base-ui-inert]")).not.toBeNull();
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
    expect(deleteTrigger).toHaveFocus();
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
    fireEvent.click(screen.getByRole("button", { name: "Excluir diagrama" }));
    fireEvent.change(screen.getByLabelText("Digite Utilidades para confirmar"), { target: { value: "Utilidades" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    expect(softDelete).not.toHaveBeenCalled();

    await act(async () => { pending.resolve(2); await pending.promise; await Promise.resolve(); });
    expect(softDelete).toHaveBeenCalledWith(diagramId, "edit-token", 2);
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(save).toHaveBeenCalledOnce();
  });

});
