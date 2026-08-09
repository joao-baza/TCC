import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
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
  { title: "Utilidades", standard: "iso" },
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
  };
}

function renderCreate(pidServices = services()) {
  return render(
    <PidServicesProvider services={pidServices}>
      <MemoryRouter>
        <CreatePidPage />
      </MemoryRouter>
    </PidServicesProvider>,
  );
}

describe("CreatePidPage", () => {
  it("mostra URLs selecionáveis e só libera navegação apó confirmação explícita", async () => {
    const pidServices = services();
    renderCreate(pidServices);

    fireEvent.change(screen.getByLabelText("Título do diagrama"), { target: { value: "Utilidades" } });
    fireEvent.change(screen.getByLabelText("Norma"), { target: { value: "iso" } });
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
    expect(screen.getByRole("button", { name: "Voltar ao DCOU" })).toBeDisabled();

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
      standard: "iso",
      participantName: "Ana",
    });
    expect(screen.getByRole("link", { name: "Voltar ao DCOU" })).toHaveAttribute("href", "/");
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
    render(
      <PidServicesProvider services={pidServices}>
        <MemoryRouter initialEntries={[`/pid/${diagramId}#access=edit-token`]}>
          <Routes>
            <Route path="/pid/:diagramId" element={<PidEditorPage />} />
          </Routes>
        </MemoryRouter>
      </PidServicesProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Carregando diagrama");
    expect(await screen.findByRole("heading", { name: "Utilidades" })).toBeInTheDocument();
    expect(screen.getByText("Acesso de edição")).toBeInTheDocument();
    expect(pidServices.document.open).toHaveBeenCalledWith(diagramId, "edit-token");
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

    await router.navigate(`/pid/${diagramId}#access=revoked`);
    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso ao diagrama negado.");
    await waitFor(() => expect(open).toHaveBeenNthCalledWith(2, diagramId, "revoked"));
  });
});
