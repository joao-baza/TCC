import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

const fetchMock = vi.fn<typeof fetch>();
const notifyMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/notify", () => ({
  notify: notifyMock,
}));

function requestBodiesFor(pathSuffix: string, method = "POST") {
  return fetchMock.mock.calls
    .filter(([input, init]) => {
      const url = String(input);
      const requestMethod = init?.method ?? "GET";
      return url.endsWith(pathSuffix) && requestMethod === method;
    })
    .map(([, init]) => JSON.parse(String(init?.body ?? "{}")));
}

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
        components: ["A", "B", "C"],
        streams: [
          {
            name: "Alimentacao_Fresca",
            direction: 1,
            flow_rate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0 },
          },
          {
            name: "Saida_Do_Reator",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null },
          },
          {
            name: "Reciclo",
            direction: 1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null },
          },
          {
            name: "Produto",
            direction: -1,
            flow_rate: null,
            compositions: { A: null, B: null, C: null },
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
            composicoes: { A: 0.8, B: 0.2, C: 0 },
          },
          Reciclo: {
            vazao: 60,
            composicoes: { A: 0.18, B: 0.05, C: 0.57 },
          },
          Produto: {
            vazao: 40,
            composicoes: { A: 0.1, B: 0.05, C: 0.65 },
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
            composicoes: { A: 0.1, B: 0.05, C: 0.65 },
          },
        },
      });
    }

    if (url.endsWith("/api/mass-balance/chart") && method === "POST") {
      return Response.json({
        id: "mass-balance-chart",
        title: "Composição mássica das correntes",
        subtitle:
          "Cada barra representa a vazão da corrente, segmentada pela contribuição mássica dos componentes.",
        axes: {
          x: {
            scale: "linear",
            label: "Corrente",
            units: "índice",
            domain: { min: 1, max: 3 },
            ticks: [1, 2, 3],
            major_ticks: [1, 2, 3],
          },
          flow: {
            scale: "linear",
            label: "Vazão mássica da corrente",
            units: "massa ou mol/tempo",
            domain: { min: 0, max: 100 },
            ticks: [0, 50, 100],
            major_ticks: [0, 50, 100],
          },
        },
        series: [
          {
            id: "component-a",
            name: "Contribuição de A",
            kind: "bar",
            color: "#2563eb",
            points: [
              { x: 1, y: 80 },
              { x: 2, y: 10.8 },
              { x: 3, y: 4 },
            ],
          },
          {
            id: "component-b",
            name: "Contribuição de B",
            kind: "bar",
            color: "#16a34a",
            points: [
              { x: 1, y: 20 },
              { x: 2, y: 3 },
              { x: 3, y: 2 },
            ],
          },
          {
            id: "component-c",
            name: "Contribuição de C",
            kind: "bar",
            color: "#f59e0b",
            points: [
              { x: 1, y: 0 },
              { x: 2, y: 34.2 },
              { x: 3, y: 26 },
            ],
          },
          {
            id: "component-d",
            name: "Contribuição de D",
            kind: "bar",
            color: "#dc2626",
            points: [
              { x: 1, y: 0 },
              { x: 2, y: 12 },
              { x: 3, y: 8 },
            ],
          },
        ],
        markers: [],
        annotations: [],
        metadata: {
          version: "1.0",
          units: {
            x: "índice",
            flow: "massa ou mol/tempo",
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

async function openBalanceTab(name: string | RegExp) {
  fireEvent.click(screen.getByRole("tab", { name }));
  await waitFor(() => {
    expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  });
}

async function selectComboboxOption(label: string | RegExp, query: string, optionName: string | RegExp) {
  const input = screen.getByLabelText(label, { selector: "input" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: query } });
  const expectedValue =
    typeof optionName === "string" ? optionName : null;

  if (expectedValue) {
    await waitFor(() => {
      expect(input).toHaveValue(expectedValue);
    });
    return;
  }

  fireEvent.click(await screen.findByText(optionName));
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

  it("shows the didactic accordion, loads the worked example, and auto-calculates derived tabs", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await openBalanceTab(/^Correntes$/i);
    expect(await screen.findByDisplayValue("Alimentacao_Fresca")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("Saida_Do_Reator").length).toBeGreaterThan(0);
    await openBalanceTab(/^Splits \/ Reciclo$/i);
    expect(screen.getByDisplayValue("0.6")).toBeInTheDocument();

    await openBalanceTab(/^Resultados$/i);
    expect(screen.getByRole("button", { name: /Calcular Balanço de Massa/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Calcular Rendimentos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gerar Gráfico de Correntes/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Alimentação/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reciclo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Produto/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: /Tabela de correntes calculadas/i })).toBeInTheDocument();
    expect(screen.getAllByText(/u\. cons\. = unidades consistentes/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Composições por corrente/i)).not.toBeInTheDocument();
    expect(await screen.findByTestId("recycle-purge-map")).toBeInTheDocument();
    expect(await screen.findByTestId("mass-balance-chart")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Matriz de rendimentos/i })).toBeInTheDocument();
    expect(screen.getByText(/81.25%/i)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Ações$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Rendimentos$/i })).not.toBeInTheDocument();
  });

  it("runs balance, yields, and chart generation from a single results button", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    await openBalanceTab(/^Resultados$/i);

    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));
    expect(await screen.findByRole("table", { name: /Matriz de rendimentos/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Alimentação/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reciclo/i).length).toBeGreaterThan(0);
    expect(await screen.findByTestId("mass-balance-chart")).toBeInTheDocument();
    const nativeChart = await screen.findByTestId("mass-balance-native-chart");
    expect(nativeChart).toBeInTheDocument();
    expect(nativeChart.className).toContain("overflow-x-auto");
    expect(nativeChart.className).toContain("overflow-y-auto");
    expect(screen.getByTestId("mass-balance-chart").querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByText(/Composição mássica das correntes/i)).toBeInTheDocument();
    expect(screen.getByText(/Cada barra representa a vazão da corrente/i)).toBeInTheDocument();
    const yieldMatrixTable = screen.getByRole("table", { name: /Matriz de rendimentos/i });
    expect(yieldMatrixTable).toBeInTheDocument();
    expect(within(yieldMatrixTable).getByRole("columnheader", { name: "A" })).toBeInTheDocument();
    expect(within(yieldMatrixTable).getByRole("columnheader", { name: "B" })).toBeInTheDocument();
    expect(within(yieldMatrixTable).getByRole("columnheader", { name: "C" })).toBeInTheDocument();
    expect(within(yieldMatrixTable).getByRole("rowheader", { name: "A" })).toBeInTheDocument();
    expect(within(yieldMatrixTable).getByRole("rowheader", { name: "B" })).toBeInTheDocument();
    expect(within(yieldMatrixTable).getByRole("rowheader", { name: "C" })).toBeInTheDocument();
    expect(within(yieldMatrixTable).queryByRole("columnheader", { name: "D" })).not.toBeInTheDocument();
    expect(within(yieldMatrixTable).queryByRole("rowheader", { name: "D" })).not.toBeInTheDocument();
    expect(screen.getByText("81.25%")).toBeInTheDocument();
    expect(screen.queryByText(/Alimentação fresca/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vazão de produto/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Taxa de reciclo/i)).not.toBeInTheDocument();
    expect(yieldMatrixTable.parentElement?.className).toContain("overflow-x-auto");
    expect(yieldMatrixTable.parentElement?.className).toContain("overflow-y-auto");
    expect(yieldMatrixTable.parentElement?.className).toContain("max-h-");
    expect(requestBodiesFor("/api/mass-balance/calculate")).toHaveLength(2);
    expect(requestBodiesFor("/api/mass-balance/yields")).toHaveLength(2);
    expect(requestBodiesFor("/api/mass-balance/chart")).toContainEqual({
      components: ["A", "B", "C"],
      streams: [
        {
          name: "Alimentacao_Fresca",
          direction: 1,
          flow_rate: 100,
          compositions: { A: 0.8, B: 0.2, C: 0 },
        },
        {
          name: "Saida_Do_Reator",
          direction: -1,
          flow_rate: null,
          compositions: { A: null, B: null, C: null },
        },
        {
          name: "Reciclo",
          direction: 1,
          flow_rate: null,
          compositions: { A: null, B: null, C: null },
        },
        {
          name: "Produto",
          direction: -1,
          flow_rate: null,
          compositions: { A: null, B: null, C: null },
        },
      ],
      reactions: [{ stoichiometry: { A: -1, C: 1 }, key_component: "A", conversion: 0.7 }],
      splits: [
        {
          parent_stream: "Saida_Do_Reator",
          recycle_stream: "Reciclo",
          purge_stream: "Produto",
          fraction: 0.6,
        },
      ],
    });
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

  it("keeps contextual actions inside each balance card instead of the parent module card", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    const moduleHeader = screen
      .getByRole("heading", { level: 1, name: /^Balanço de Massa$/i })
      .closest('[data-slot="card-header"]');
    expect(moduleHeader).not.toBeNull();
    expect(within(moduleHeader as HTMLElement).getByRole("button", { name: /Carregar exemplo/i })).toBeInTheDocument();
    expect(
      within(moduleHeader as HTMLElement).queryByRole("button", { name: /Adicionar Corrente/i }),
    ).not.toBeInTheDocument();
    expect(
      within(moduleHeader as HTMLElement).queryByRole("button", { name: /Calcular Rendimentos/i }),
    ).not.toBeInTheDocument();
    expect(
      within(moduleHeader as HTMLElement).queryByRole("button", { name: /Gerar Gráfico de Correntes/i }),
    ).not.toBeInTheDocument();

    await openBalanceTab(/^Correntes$/i);
    const streamsHeader = screen
      .getByRole("heading", { level: 2, name: /^Correntes$/i })
      .closest('[data-slot="card-header"]');
    expect(streamsHeader).not.toBeNull();
    const addStreamButton = within(streamsHeader as HTMLElement).getByRole("button", {
      name: /Adicionar Corrente/i,
    });
    expect(addStreamButton).toBeInTheDocument();
    expect(addStreamButton.className).toContain("bg-primary");
    expect(addStreamButton.className).not.toContain("border-input");
    expect(addStreamButton.closest('[data-slot="card-action"]')?.className).toContain("justify-self-end");

    await openBalanceTab(/^Reações$/i);
    const reactionsHeader = screen
      .getByRole("heading", { level: 2, name: /^Reações$/i })
      .closest('[data-slot="card-header"]');
    expect(reactionsHeader).not.toBeNull();
    const addReactionButton = within(reactionsHeader as HTMLElement).getByRole("button", {
      name: /Adicionar Reação/i,
    });
    expect(addReactionButton).toBeInTheDocument();
    expect(addReactionButton.className).toContain("bg-primary");
    expect(addReactionButton.className).not.toContain("border-input");
    expect(addReactionButton.closest('[data-slot="card-action"]')?.className).toContain("justify-self-end");

    await openBalanceTab(/^Splits \/ Reciclo$/i);
    const splitsHeader = screen
      .getByRole("heading", { level: 2, name: /^Splits \/ Reciclo$/i })
      .closest('[data-slot="card-header"]');
    expect(splitsHeader).not.toBeNull();
    const addSplitButton = within(splitsHeader as HTMLElement).getByRole("button", {
      name: /Adicionar Split/i,
    });
    expect(addSplitButton).toBeInTheDocument();
    expect(addSplitButton.className).toContain("bg-primary");
    expect(addSplitButton.className).not.toContain("border-input");
    expect(addSplitButton.closest('[data-slot="card-action"]')?.className).toContain("justify-self-end");

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    await openBalanceTab(/^Resultados$/i);
    const resultsHeader = screen
      .getByRole("heading", { level: 2, name: /^Resultados do Balanço$/i })
      .closest('[data-slot="card-header"]');
    expect(resultsHeader).not.toBeNull();
    expect(
      within(resultsHeader as HTMLElement).getByRole("button", { name: /Calcular Balanço de Massa/i }),
    ).toBeInTheDocument();
    expect(
      within(resultsHeader as HTMLElement).queryByRole("button", { name: /Calcular Rendimentos/i }),
    ).not.toBeInTheDocument();
    expect(
      within(resultsHeader as HTMLElement).queryByRole("button", { name: /Gerar Gráfico de Correntes/i }),
    ).not.toBeInTheDocument();
  });

  it("uses created streams as selectable options for split and recycle fields", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await openBalanceTab(/^Splits \/ Reciclo$/i);

    expect(screen.getByLabelText(/Corrente pai/i, { selector: "input" })).toHaveValue("Saida_Do_Reator");
    expect(screen.getByLabelText(/Corrente de reciclo/i, { selector: "input" })).toHaveValue("Reciclo");
    expect(screen.getByLabelText(/Corrente de purga/i, { selector: "input" })).toHaveValue("Produto");

    await selectComboboxOption(/Corrente pai/i, "alim", "Alimentacao_Fresca");
    await selectComboboxOption(/Corrente de reciclo/i, "saida", "Saida_Do_Reator");
    await selectComboboxOption(/Corrente de purga/i, "rec", "Reciclo");

    fireEvent.change(screen.getByLabelText(/Fração de reciclo \(0-1\)/i), {
      target: { value: "0.5" },
    });

    await openBalanceTab(/^Resultados$/i);
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));

    expect(requestBodiesFor("/api/mass-balance/calculate")).toContainEqual(
      expect.objectContaining({
        splits: [
          {
            parent_stream: "Alimentacao_Fresca",
            recycle_stream: "Saida_Do_Reator",
            purge_stream: "Reciclo",
            fraction: 0.5,
          },
        ],
      }),
    );
  });

  it("shows dashed centered empty-state cards for streams, reactions, and splits", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    await openBalanceTab(/^Correntes$/i);
    const emptyStreams = await screen.findByText("Adicione uma corrente");
    expect(emptyStreams.closest("div")?.className).toContain("border-dashed");
    expect(emptyStreams.closest("div")?.className).toContain("justify-center");
    expect(emptyStreams.closest("div")?.className).toContain("items-center");

    await openBalanceTab(/^Reações$/i);
    const emptyReactions = await screen.findByText("Adicione uma reação");
    expect(emptyReactions.closest("div")?.className).toContain("border-dashed");
    expect(emptyReactions.closest("div")?.className).toContain("justify-center");
    expect(emptyReactions.closest("div")?.className).toContain("items-center");

    await openBalanceTab(/^Splits \/ Reciclo$/i);
    const emptySplits = await screen.findByText("Adicione um split / reciclo");
    expect(emptySplits.closest("div")?.className).toContain("border-dashed");
    expect(emptySplits.closest("div")?.className).toContain("justify-center");
    expect(emptySplits.closest("div")?.className).toContain("items-center");
  });

  it("clears stale balance outputs after dependent input edits", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await openBalanceTab(/^Resultados$/i);
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));
    expect(await screen.findByRole("table", { name: /Matriz de rendimentos/i })).toBeInTheDocument();

    await openBalanceTab(/^Splits \/ Reciclo$/i);
    fireEvent.change(screen.getByLabelText(/Fração de reciclo \(0-1\)/i), {
      target: { value: "0.5" },
    });

    await openBalanceTab(/^Resultados$/i);
    expect(screen.queryByRole("table", { name: /Tabela de correntes calculadas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: /Matriz de rendimentos/i })).not.toBeInTheDocument();
  });

  it("ignores delayed balance responses after dependent input edits", async () => {
    const balanceRequests = mockBalanceRequests({ delayBalance: true });
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await openBalanceTab(/^Resultados$/i);
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));
    await openBalanceTab(/^Splits \/ Reciclo$/i);
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
              composicoes: { A: 0.8, B: 0.2, C: 0 },
            },
            Reciclo: {
              vazao: 60,
              composicoes: { A: 0.18, B: 0.05, C: 0.57 },
            },
            Produto: {
              vazao: 40,
              composicoes: { A: 0.1, B: 0.05, C: 0.65 },
            },
          },
        }),
      );

    await waitFor(() => {
      expect(screen.queryByRole("table", { name: /Tabela de correntes calculadas/i })).not.toBeInTheDocument();
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

  it("shows an error notification when the mass balance calculation fails", async () => {
    mockBalanceRequests({ balanceError: "Falha no backend do balanço" });
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    await openBalanceTab(/^Resultados$/i);
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
    await openBalanceTab(/^Resultados$/i);
    expect(notifyMock.error).toHaveBeenCalledWith("Erro ao carregar exemplo: Falha no backend dos rendimentos");
    notifyMock.error.mockReset();
    fireEvent.click(screen.getByRole("button", { name: /Calcular Balanço de Massa/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular rendimentos: Falha no backend dos rendimentos",
      );
    });
  });

  it("shows a dashed empty state in results before running the calculation and removes helper copy", async () => {
    mockBalanceRequests();
    renderBalancePage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
    ).toBeInTheDocument();

    await openBalanceTab(/^Resultados$/i);

    const emptyResults = screen.getByText("Execute o cálculo para visualizar vazões e composições fechadas.");
    expect(emptyResults.className).toContain("border-dashed");
    expect(emptyResults.className).toContain("justify-center");
    expect(emptyResults.className).toContain("items-center");
    expect(
      screen.queryByText(/Use o exemplo para carregar um caso com alimentação, reação e reciclo\./i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Esta aba concentra cálculo, rendimentos e visualização de correntes no mesmo fluxo\./i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Execute as ações acima para consolidar o fechamento do balanço, os rendimentos e o gráfico de correntes\./i),
    ).not.toBeInTheDocument();
  });

  it.each(["/balance/actions", "/balance/yields"])(
    "redirects legacy balance route %s to the results tab",
    async (initialPath) => {
      mockBalanceRequests();
      const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
      render(<RouterProvider router={router} />);

      expect(
        await screen.findByRole("heading", { level: 1, name: /^Balanço de Massa$/i }),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /^Resultados$/i })).toHaveAttribute(
          "aria-selected",
          "true",
        );
      });
      expect(screen.queryByRole("tab", { name: /^Ações$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: /^Rendimentos$/i })).not.toBeInTheDocument();
    },
  );
});
