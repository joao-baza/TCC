import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

const fetchMock = vi.fn<typeof fetch>();
const notifyMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/notify", () => ({
  notify: notifyMock,
}));

type MockBalanceOptions = {
  balanceError?: string;
  yieldError?: string;
  delayBalance?: boolean;
  delayYield?: boolean;
};

function mockBalanceRequests(options?: MockBalanceOptions) {
  let resolveBalance: ((response: Response) => void) | undefined;
  let resolveYield: ((response: Response) => void) | undefined;

  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/mass-balance/example") && method === "GET") {
      return Response.json({
        components: ["A", "B", "C", "D"],
        streams: [
          {
            name: "Alimentacao_Fresca",
            direction: 1,
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          {
            name: "Saida_Do_Reator",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Reciclo",
            direction: 1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
          {
            name: "Produto",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null, D: null },
          },
        ],
        reactions: [
          {
            stoichiometry: { A: -1, C: 1 },
            key_component: "A",
            conversion: 0.7,
          },
        ],
        splits: [
          {
            parent_stream: "Saida_Do_Reator",
            recycle_stream: "Reciclo",
            purge_stream: "Produto",
            fraction: 0.6,
          },
        ],
      });
    }

    if (url.endsWith("/api/mass-balance/calculate") && method === "POST") {
      if (options?.delayBalance) {
        return new Promise<Response>((resolve) => {
          resolveBalance = resolve;
        });
      }

      if (options?.balanceError) {
        return new Response(JSON.stringify({ detail: options.balanceError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        metricas: {
          alimentacao_fresca: 100,
          vazao_produto: 40,
          taxa_reciclo: 0.6,
        },
        resultados: {
          Alimentacao_Fresca: {
            vazao: 100,
            composicoes: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
          Reciclo: {
            vazao: 60,
            composicoes: { A: 0.18, B: 0.05, C: 0.57, D: 0.2 },
          },
          Produto: {
            vazao: 40,
            composicoes: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
        },
      });
    }

    if (url.endsWith("/api/mass-balance/yields") && method === "POST") {
      if (options?.delayYield) {
        return new Promise<Response>((resolve) => {
          resolveYield = resolve;
        });
      }

      if (options?.yieldError) {
        return new Response(JSON.stringify({ detail: options.yieldError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        rendimentos: {
          C_a_partir_de_A: 81.25,
          D_a_partir_de_B: 77.5,
        },
        resultados: {
          Produto: {
            vazao: 40,
            composicoes: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
        },
      });
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveBalance(response: Response) {
      resolveBalance?.(response);
    },
    resolveYield(response: Response) {
      resolveYield?.(response);
    },
  };
}

function renderBalancePage() {
  const router = createMemoryRouter(routes, { initialEntries: ["/balance"] });
  render(<RouterProvider router={router} />);
}

describe("BalancePage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    notifyMock.error.mockReset();
    notifyMock.success.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the didactic accordion, loads the worked example, calculates balance and yields, and renders the frontend stream graph", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Como funciona - Balanço de Massa/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    expect(await screen.findByDisplayValue("Alimentacao_Fresca")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("Saida_Do_Reator").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("0.6")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));

    expect(await screen.findByText(/Taxa de reciclo/i)).toBeInTheDocument();
    expect(screen.getByTestId("stream-graph")).toBeInTheDocument();
    expect(screen.getByTestId("process-sankey")).toBeInTheDocument();
    expect(screen.getByTestId("ternary-diagram")).toBeInTheDocument();
    expect(screen.getByTestId("recycle-purge-map")).toBeInTheDocument();
    expect(screen.getByTestId("stream-table")).toBeInTheDocument();
    expect(screen.getAllByText(/Alimentacao_Fresca/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reciclo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Produto/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Calcular Rendimentos/i }));
    expect(await screen.findByText(/C a partir de A/i)).toBeInTheDocument();
    expect(screen.getByText(/81.25%/i)).toBeInTheDocument();
  });

  it("shows saved exploratory scenarios in the stream graph", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    const template = screen.getByRole("combobox", { name: /Modo Exploratório/i });
    fireEvent.focus(template);
    fireEvent.change(template, { target: { value: "simples" } });
    fireEvent.keyDown(template, { key: "Enter", code: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));

    expect(await screen.findByText(/Taxa de reciclo/i)).toBeInTheDocument();
    expect(screen.getByTestId("stream-graph")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Salvar cenário/i }));

    const graph = screen.getByTestId("stream-graph");
    expect(within(graph).getByTestId("saved-scenarios")).toBeInTheDocument();
    expect(within(graph).getAllByTestId("saved-scenario")).toHaveLength(1);
    expect(within(graph).getByTestId("saved-scenario")).toHaveTextContent(/R=/i);
  });

  it("generates the stream graph from the dedicated action button", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    fireEvent.click(screen.getByRole("button", { name: /Gerar Gráfico de Correntes/i }));

    const graph = await screen.findByTestId("stream-graph");
    expect(graph).toBeInTheDocument();
    expect(within(graph).getByText(/Alimentacao_Fresca/i)).toBeInTheDocument();
    expect(within(graph).getByText(/Reciclo/i)).toBeInTheDocument();
  });

  it("shows a success notification when loading the worked example", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await waitFor(() => {
      expect(notifyMock.success).toHaveBeenCalledWith("Exemplo carregado com sucesso.");
    });
  });

  it("clears stale balance outputs after dependent input edits", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Rendimentos/i }));

    expect(await screen.findByText(/Taxa de reciclo/i)).toBeInTheDocument();
    expect(await screen.findByText(/C a partir de A/i)).toBeInTheDocument();
    expect(screen.getByTestId("stream-graph")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fração de reciclo \(0-1\)/i), {
      target: { value: "0.5" },
    });

    expect(screen.queryByText(/Taxa de reciclo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/C a partir de A/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("stream-graph")).not.toBeInTheDocument();
  });

  it("ignores delayed balance responses after dependent input edits", async () => {
    const balanceRequests = mockBalanceRequests({ delayBalance: true });
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));
    fireEvent.change(screen.getByLabelText(/Fração de reciclo \(0-1\)/i), {
      target: { value: "0.5" },
    });

    balanceRequests.resolveBalance(
      Response.json({
          metricas: {
            alimentacao_fresca: 100,
            vazao_produto: 40,
            taxa_reciclo: 0.6,
          },
          resultados: {
            Alimentacao_Fresca: {
              vazao: 100,
              composicoes: { A: 0.8, B: 0.2, C: 0, D: 0 },
            },
            Reciclo: {
              vazao: 60,
              composicoes: { A: 0.18, B: 0.05, C: 0.57, D: 0.2 },
            },
            Produto: {
              vazao: 40,
              composicoes: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
            },
          },
        }),
      );

    await waitFor(() => {
      expect(screen.queryByText(/Taxa de reciclo/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId("stream-graph")).not.toBeInTheDocument();
    });
  });

  it("warns when adding a duplicate component", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nome do componente/i), {
      target: { value: "A" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Adicionar$/i }));
    expect(await screen.findByRole("button", { name: /Remover componente A/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nome do componente/i), {
      target: { value: "A" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Adicionar$/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith("O componente A já existe");
    });
  });

  it("shows the exploratory panel and applies the recycle template", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Painel Exploratório/i })).toBeInTheDocument();

    const template = screen.getByRole("combobox", { name: /Modo Exploratório/i });
    fireEvent.focus(template);
    fireEvent.change(template, { target: { value: "reciclo" } });
    fireEvent.keyDown(template, { key: "Enter", code: "Enter" });

    expect(await screen.findByDisplayValue("Alimentacao_Fresca")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("Reciclo").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("Produto").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("0.5").length).toBeGreaterThan(0);
    expect(screen.getByText(/Roteiro de exploração/i)).toBeInTheDocument();
  });

  it("clears balance outputs when the exploratory recycle slider changes", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    const template = screen.getByRole("combobox", { name: /Modo Exploratório/i });
    fireEvent.focus(template);
    fireEvent.change(template, { target: { value: "reciclo" } });
    fireEvent.keyDown(template, { key: "Enter", code: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Rendimentos/i }));

    expect(await screen.findByText(/Taxa de reciclo/i)).toBeInTheDocument();
    expect(await screen.findByText(/C a partir de A/i)).toBeInTheDocument();
    expect(screen.getByTestId("stream-graph")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("slider", { name: /Razao de reciclo/i }), {
      target: { value: "0.6" },
    });

    await waitFor(() => {
      expect(screen.queryByText(/Alimentação fresca/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/C a partir de A/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId("stream-graph")).not.toBeInTheDocument();
    });
  });

  it("shows an error notification when the mass balance calculation fails", async () => {
    mockBalanceRequests({ balanceError: "Falha no backend do balanço" });
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular balanço de massa: Falha no backend do balanço",
      );
    });
  });

  it("shows an error notification when the yield calculation fails", async () => {
    mockBalanceRequests({ yieldError: "Falha no backend dos rendimentos" });
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    fireEvent.click(screen.getByRole("button", { name: /Calcular Rendimentos/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular rendimentos: Falha no backend dos rendimentos",
      );
    });
  });
});
