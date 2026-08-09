import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  createMemoryRouter,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type {
  PidCollaborationPort,
  PidDocumentPort,
  PidServices,
} from "@/features/pid/api/contracts";
import { PidLocalAdapterError } from "@/features/pid/api/local-pid-api";
import { PidServicesProvider, usePidServices } from "@/features/pid/api/pid-services";
import { createEmptyDocument } from "@/features/pid/domain/schema";
import { CreatePidPage } from "@/features/pid/editor/create-pid-page";
import { PidEditorPage } from "@/features/pid/editor/pid-editor-page";

const diagramId = "10000000-0000-4000-8000-000000000001";
const document = createEmptyDocument(
  { title: "Utilidades", standard: "iso" },
  { generateId: () => diagramId, now: () => new Date("2026-08-09T12:00:00.000Z") },
);

function services(documentPort: Partial<PidDocumentPort> = {}): PidServices {
  return {
    document: {
      create: vi.fn().mockResolvedValue({
        diagramId,
        document,
        readToken: "read-token",
        editToken: "edit-token",
        viewUrl: `https://dcou.test/pid/${diagramId}#access=read-token`,
        editUrl: `https://dcou.test/pid/${diagramId}#access=edit-token`,
      }),
      open: vi.fn().mockResolvedValue({ scope: "edit", document }),
      save: vi.fn().mockResolvedValue(undefined),
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
  it("cria links e só libera o editor apó confirmação explícita", async () => {
    const pidServices = services();
    renderCreate(pidServices);

    fireEvent.change(screen.getByLabelText("Título do diagrama"), { target: { value: "Utilidades" } });
    fireEvent.change(screen.getByLabelText("Norma"), { target: { value: "iso" } });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));

    expect(await screen.findByRole("link", { name: "Link de visualização" })).toHaveAttribute(
      "href",
      `https://dcou.test/pid/${diagramId}#access=read-token`,
    );
    expect(screen.getByRole("link", { name: "Link de edição" })).toHaveAttribute(
      "href",
      `https://dcou.test/pid/${diagramId}#access=edit-token`,
    );
    expect(screen.getByRole("button", { name: "Abrir editor" })).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Copiei o link de edição" }));
    expect(screen.getByRole("link", { name: "Abrir editor" })).toHaveAttribute(
      "href",
      `https://dcou.test/pid/${diagramId}#access=edit-token`,
    );
    expect(pidServices.document.create).toHaveBeenCalledWith({
      title: "Utilidades",
      standard: "iso",
      participantName: "Ana",
    });
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
    expect(await screen.findByRole("link", { name: "Link de edição" })).toBeInTheDocument();
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
      .mockResolvedValueOnce({ scope: "view", document })
      .mockRejectedValueOnce(new PidLocalAdapterError("ACCESS_DENIED"));
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
