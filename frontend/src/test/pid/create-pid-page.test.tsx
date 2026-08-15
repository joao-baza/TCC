import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryRouter,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  PidCollaborationPort,
  PidDocumentPort,
  PidServices,
} from "@/features/pid/api/contracts";
import { PidDocumentError } from "@/features/pid/api/contracts";
import { PidServicesProvider, usePidServices } from "@/features/pid/api/pid-services";
import { createEmptyDocument } from "@/features/pid/domain/schema";
import { CreatePidPage } from "@/features/pid/editor/create-pid-page";
import { PidEditorPage } from "@/features/pid/editor/pid-editor-page";

const diagramId = "10000000-0000-4000-8000-000000000001";
const document = createEmptyDocument(
  { title: "Utilidades", standard: "free" },
  { generateId: () => diagramId, now: () => new Date("2026-08-09T12:00:00.000Z") },
);

afterEach(() => vi.restoreAllMocks());

function services(documentPort: Partial<PidDocumentPort> = {}): PidServices {
  return {
    document: {
      create: vi.fn().mockResolvedValue({
        diagramId,
        document,
        revision: 1,
        readToken: "read-token",
        editToken: "edit-token",
        viewUrl: `https://dcou.test/pid/${diagramId}#access=read-token`,
        editUrl: `https://dcou.test/pid/${diagramId}#access=edit-token`,
      }),
      open: vi.fn().mockResolvedValue({ scope: "edit", document, revision: 1 }),
      save: vi.fn().mockResolvedValue(2),
      regenerate: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      ...documentPort,
    },
    catalog: { list: vi.fn() },
    collaboration: { connect: vi.fn() } as unknown as PidCollaborationPort,
    recent: { list: vi.fn().mockReturnValue([]), upsert: vi.fn() },
  };
}

function renderCreate(pidServices = services()) {
  const router = createMemoryRouter([{
    path: "*",
    element: (
      <PidServicesProvider services={pidServices}>
        <CreatePidPage />
      </PidServicesProvider>
    ),
  }], { initialEntries: ["/pid"] });
  return render(<RouterProvider router={router} />);
}

function renderCreateDataRouter(pidServices = services()) {
  const router = createMemoryRouter([
    { path: "/", element: <h1>Início</h1> },
    {
      path: "/pid",
      element: (
        <PidServicesProvider services={pidServices}>
          <CreatePidPage />
        </PidServicesProvider>
      ),
    },
  ], { initialEntries: ["/", "/pid"], initialIndex: 1 });
  render(<RouterProvider router={router} />);
  return router;
}

async function createDiagram() {
  fireEvent.change(screen.getByLabelText("Título do diagrama"), { target: { value: "Utilidades" } });
  fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
  fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));
  await screen.findByLabelText("Link de edição");
}

describe("CreatePidPage", () => {
  it("mostra URLs selecionáveis e só libera navegação apó confirmação explícita", async () => {
    const pidServices = services();
    renderCreate(pidServices);

    expect(screen.queryByLabelText("Norma")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Título do diagrama"), { target: { value: "Utilidades" } });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));

    expect(await screen.findByLabelText("Link de visualização")).toHaveValue(
      `https://dcou.test/pid/${diagramId}#access=read-token`,
    );
    expect(screen.getByLabelText("Link de visualização")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Link de edição")).toHaveValue(
      `https://dcou.test/pid/${diagramId}#access=edit-token`,
    );
    expect(screen.getByRole("button", { name: "Abrir visualização" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abrir editor" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Voltar ao DCOU" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voltar ao DCOU" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Copiei o link de edição" }));
    expect(screen.getByRole("link", { name: "Abrir visualização" })).toHaveAttribute(
      "href",
      `https://dcou.test/pid/${diagramId}#access=read-token`,
    );
    expect(screen.getByRole("link", { name: "Abrir editor" })).toHaveAttribute(
      "href",
      `https://dcou.test/pid/${diagramId}#access=edit-token`,
    );
    expect(pidServices.document.create).toHaveBeenCalledWith({
      title: "Utilidades",
      participantName: "Ana",
    });
    expect(pidServices.recent.upsert).toHaveBeenCalledWith({
      diagramId,
      title: "Utilidades",
      scope: "edit",
      url: `https://dcou.test/pid/${diagramId}#access=edit-token`,
    });
    expect(screen.queryByRole("link", { name: "Voltar ao DCOU" })).not.toBeInTheDocument();
  });

  it("mostra erros acessíveis sem chamar a porta para formulário inválido", async () => {
    const pidServices = services();
    renderCreate(pidServices);
    fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));

    expect(await screen.findAllByRole("alert")).toHaveLength(2);
    expect(screen.getByText("Informe o título do diagrama.")).toBeInTheDocument();
    expect(screen.getByText("Informe seu nome.")).toBeInTheDocument();
    expect(pidServices.document.create).not.toHaveBeenCalled();
  });

  it("anuncia falha da porta e permite tentar novamente", async () => {
    const create = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        diagramId,
        document,
        revision: 1,
        readToken: "read-token",
        editToken: "edit-token",
        viewUrl: `https://dcou.test/pid/${diagramId}#access=read-token`,
        editUrl: `https://dcou.test/pid/${diagramId}#access=edit-token`,
      });
    renderCreate(services({ create }));
    fireEvent.change(screen.getByLabelText("Título do diagrama"), { target: { value: "Utilidades" } });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });

    fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível criar o diagrama.");
    fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));
    expect(await screen.findByLabelText("Link de edição")).toBeInTheDocument();
  });

  it("preserva a capacidade anterior quando uma substituição confirmada falha", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({
        diagramId,
        document,
        revision: 1,
        readToken: "read-token",
        editToken: "edit-token",
        viewUrl: `https://dcou.test/pid/${diagramId}#access=read-token`,
        editUrl: `https://dcou.test/pid/${diagramId}#access=edit-token`,
      })
      .mockRejectedValueOnce(new Error("offline"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderCreate(services({ create }));
    fireEvent.change(screen.getByLabelText("Título do diagrama"), { target: { value: "Utilidades" } });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));
    await screen.findByLabelText("Link de edição");
    fireEvent.click(screen.getByRole("checkbox", { name: "Copiei o link de edição" }));

    fireEvent.change(screen.getByLabelText("Título do diagrama"), { target: { value: "Nova tentativa" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível criar o diagrama.");
    expect(screen.getByLabelText("Link de edição")).toHaveValue(
      `https://dcou.test/pid/${diagramId}#access=edit-token`,
    );
    expect(window.confirm).toHaveBeenCalled();
  });

  it("bloqueia duplo envio enquanto a criação está pendente", async () => {
    let resolveCreate!: (value: Awaited<ReturnType<PidDocumentPort["create"]>>) => void;
    const create = vi.fn(() => new Promise<Awaited<ReturnType<PidDocumentPort["create"]>>>((resolve) => {
      resolveCreate = resolve;
    }));
    renderCreate(services({ create }));
    fireEvent.change(screen.getByLabelText("Título do diagrama"), { target: { value: "Utilidades" } });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    const submit = screen.getByRole("button", { name: "Criar diagrama" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Criando…" })).toBeDisabled();
    resolveCreate({
      diagramId,
      document,
      revision: 1,
      readToken: "read-token",
      editToken: "edit-token",
      viewUrl: `https://dcou.test/pid/${diagramId}#access=read-token`,
      editUrl: `https://dcou.test/pid/${diagramId}#access=edit-token`,
    });
    expect(await screen.findByLabelText("Link de edição")).toBeInTheDocument();
  });

  it("protege saída antes da confirmação e oferece fallback de cópia manual", async () => {
    const previousClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    try {
      renderCreate();
      fireEvent.change(screen.getByLabelText("Título do diagrama"), { target: { value: "Utilidades" } });
      fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
      fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));
      await screen.findByLabelText("Link de edição");

      const beforeUnload = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(beforeUnload);
      expect(beforeUnload.defaultPrevented).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "Copiar edição" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Selecione o link e copie manualmente");

      fireEvent.click(screen.getByRole("checkbox", { name: "Copiei o link de edição" }));
      const afterConfirmation = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(afterConfirmation);
      expect(afterConfirmation.defaultPrevented).toBe(false);
    } finally {
      if (previousClipboard) Object.defineProperty(navigator, "clipboard", previousClipboard);
      else Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("bloqueia o voltar do Router e respeita as escolhas de permanecer e sair", async () => {
    const router = renderCreateDataRouter();
    await createDiagram();

    await router.navigate(-1);
    expect(router.state.location.pathname).toBe("/pid");
    expect(await screen.findByRole("alertdialog", { name: "Link de edição ainda não confirmado" }))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Permanecer nesta página" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/pid");

    await router.navigate(-1);
    fireEvent.click(await screen.findByRole("button", { name: "Sair desta página" }));
    expect(await screen.findByRole("heading", { name: "Início" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("permite voltar normalmente depois da confirmação da capacidade", async () => {
    const router = renderCreateDataRouter();
    await createDiagram();
    fireEvent.click(screen.getByRole("checkbox", { name: "Copiei o link de edição" }));

    await router.navigate(-1);

    expect(await screen.findByRole("heading", { name: "Início" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("contém o foco, torna o fundo inerte e trata Escape como permanência", async () => {
    const router = renderCreateDataRouter();
    await createDiagram();
    const origin = screen.getByRole("checkbox", { name: "Copiei o link de edição" });
    origin.focus();
    expect(origin).toHaveFocus();

    await act(async () => { await router.navigate(-1); });

    const dialog = await screen.findByRole("alertdialog", {
      name: "Link de edição ainda não confirmado",
    });
    const stay = screen.getByRole("button", { name: "Permanecer nesta página" });
    await waitFor(() => expect(stay).toHaveFocus());
    expect(dialog).toContainElement(stay);
    const inertBackground = origin.closest("[data-base-ui-inert]");
    expect(inertBackground).not.toBeNull();
    fireEvent.click(globalThis.document.querySelector('[data-slot="alert-dialog-overlay"]')!);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/pid");

    fireEvent.keyDown(stay, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/pid");
    expect(origin).toHaveFocus();
  });
});

describe("PidServicesProvider", () => {
  it("falha claramente quando o hook é usado fora do provider", () => {
    expect(() => renderHook(() => usePidServices())).toThrow(
      "usePidServices deve ser usado dentro de PidServicesProvider.",
    );
  });
});

describe("PidEditorPage", () => {
  it("abre pelo UUID e token do fragmento e renderiza título e escopo", async () => {
    const pidServices = services();
    const router = createMemoryRouter([{
      path: "/pid/:diagramId",
      element: <PidEditorPage />,
    }], { initialEntries: [`/pid/${diagramId}#access=edit-token`] });
    render(<PidServicesProvider services={pidServices}><RouterProvider router={router} /></PidServicesProvider>);

    expect(screen.getByRole("status")).toHaveTextContent("Carregando diagrama");
    expect(await screen.findByRole("heading", { name: "Utilidades" })).toBeInTheDocument();
    expect(screen.getByText("Acesso de edição")).toBeInTheDocument();
    expect(pidServices.document.open).toHaveBeenCalledWith(diagramId, "edit-token");
    expect(pidServices.recent.upsert).toHaveBeenCalledWith({
      diagramId,
      title: "Utilidades",
      scope: "edit",
      url: `/pid/${diagramId}#access=edit-token`,
    });
  });

  it("reabre quando UUID ou fragmento mudam e mostra erro tipado", async () => {
    const open = vi.fn()
      .mockResolvedValueOnce({ scope: "view", document, revision: 1 })
      .mockRejectedValueOnce(new PidDocumentError("ACCESS_DENIED"));
    const pidServices = services({ open });
    const router = createMemoryRouter([{
      path: "/pid/:diagramId",
      element: (
        <PidServicesProvider services={pidServices}>
          <PidEditorPage />
        </PidServicesProvider>
      ),
    }], { initialEntries: [`/pid/${diagramId}#access=read-token`] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("Acesso de visualização")).toBeInTheDocument();
    expect(pidServices.recent.upsert).toHaveBeenCalledWith({
      diagramId,
      title: "Utilidades",
      scope: "view",
      url: `/pid/${diagramId}#access=read-token`,
    });

    await router.navigate(`/pid/${diagramId}#access=revoked`);
    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso ao diagrama negado.");
    await waitFor(() => expect(open).toHaveBeenNthCalledWith(2, diagramId, "revoked"));
  });
});
