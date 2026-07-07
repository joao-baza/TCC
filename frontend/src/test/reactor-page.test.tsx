import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function mockReactorRequests(options?: {
  cstrError?: string;
  pfrError?: string;
  delayCstr?: boolean;
}) {
  let resolveCstr: ((response: Response) => void) | undefined;

  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/reactor/cstr/calculation-types") && method === "GET") {
      return Response.json([
        "conversion_and_kinetics",
        "volume_and_kinetics",
        "residence_time_and_kinetics",
      ]);
    }

    if (url.endsWith("/api/reactor/pfr/calculation-types") && method === "GET") {
      return Response.json([
        "conversion_and_kinetics",
        "volume_and_kinetics",
        "residence_time_and_kinetics",
      ]);
    }

    if (url.endsWith("/api/components/list") && method === "GET") {
      return Response.json(["A", "B"]);
    }

    if (url.endsWith("/api/reactor/cstr") && method === "POST") {
      if (options?.delayCstr) {
        return new Promise<Response>((resolve) => {
          resolveCstr = resolve;
        });
      }

      if (options?.cstrError) {
        return new Response(JSON.stringify({ detail: options.cstrError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        volume: { value: 9.6, units: "meter ** 3" },
        reaction_rate: { value: 200, units: "mole / meter ** 3 / second" },
        taxa_de_reacao: { value: 200, units: "mole / meter ** 3 / second" },
        outlet_concentrations: {
          A: { value: 400, units: "mole / meter ** 3" },
          B: { value: 1600, units: "mole / meter ** 3" },
        },
        concentracoes_de_saida: {
          A: { value: 400, units: "mole / meter ** 3" },
          B: { value: 1600, units: "mole / meter ** 3" },
        },
        dilution_factor: { value: 0, units: "dimensionless" },
        fator_de_diluicao: { value: 0, units: "dimensionless" },
        "molar_rate_inlet_(limitant)": { value: 2400, units: "mole / second" },
        "vazao_molar_entrada_(limitante)": { value: 2400, units: "mole / second" },
        flow_rate_outlet: { value: 1.2, units: "meter ** 3 / second" },
        vazao_de_saida: { value: 1.2, units: "meter ** 3 / second" },
        residence_time: { value: 8, units: "second" },
        tempo_de_residencia: { value: 8, units: "second" },
        conversion: 0.8,
        conversao: 0.8,
      });
    }

    if (url.endsWith("/api/reactor/pfr") && method === "POST") {
      if (options?.pfrError) {
        return new Response(JSON.stringify({ detail: options.pfrError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        volume: { value: 9.6, units: "meter ** 3" },
        reaction_rate: { value: 200, units: "mole / meter ** 3 / second" },
        taxa_de_reacao: { value: 200, units: "mole / meter ** 3 / second" },
        outlet_concentrations: {
          A: { value: 400, units: "mole / meter ** 3" },
          B: { value: 1600, units: "mole / meter ** 3" },
        },
        concentracoes_de_saida: {
          A: { value: 400, units: "mole / meter ** 3" },
          B: { value: 1600, units: "mole / meter ** 3" },
        },
        dilution_factor: { value: 0, units: "dimensionless" },
        fator_de_diluicao: { value: 0, units: "dimensionless" },
        "molar_rate_inlet_(limitant)": { value: 2400, units: "mole / second" },
        "vazao_molar_entrada_(limitante)": { value: 2400, units: "mole / second" },
        flow_rate_outlet: { value: 1.2, units: "meter ** 3 / second" },
        vazao_de_saida: { value: 1.2, units: "meter ** 3 / second" },
        residence_time: { value: 8, units: "second" },
        tempo_de_residencia: { value: 8, units: "second" },
        conversion: 0.8,
        conversao: 0.8,
      });
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveCstr(response: Response) {
      resolveCstr?.(response);
    },
  };
}

function renderReactorPage() {
  const router = createMemoryRouter(routes, { initialEntries: ["/reactor"] });
  render(<RouterProvider router={router} />);
}

function selectReactorTab(label: "CSTR" | "PFR" | "Levenspiel" | "Arrhenius") {
  fireEvent.click(screen.getByRole("tab", { name: label }));
}

function getCardRowContaining(card: HTMLElement, text: string | RegExp) {
  return within(card)
    .queryAllByText(text)
    .find((node) => node.closest("tr"))
    ?.closest("tr");
}

function expectCardUnitMath(card: HTMLElement, label: string | RegExp) {
  const row = getCardRowContaining(card, label);
  const unitCell = row?.querySelector("td:nth-child(3)");

  expect(unitCell?.querySelector(".katex")).not.toBeNull();
}

async function expectCardValueMath(
  card: HTMLElement,
  label: string | RegExp,
  expected?: string,
) {
  await waitFor(() => {
    const row = getCardRowContaining(card, label);
    const valueCell = row?.querySelector("td:nth-child(2)");

    expect(valueCell?.querySelector(".katex")).not.toBeNull();

    if (expected) {
      expect(valueCell?.textContent ?? "").toContain(expected);
    }
  });
}

function expectCardRowAbsent(card: HTMLElement, label: string | RegExp) {
  expect(getCardRowContaining(card, label)).toBeUndefined();
}

describe("ReactorPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    notifyMock.success.mockReset();
    notifyMock.error.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the didactic accordions, loads the worked example, calculates CSTR and PFR, and renders the Levenspiel view", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();
    expect(screen.getByText(/Como funciona - Reator CSTR/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));
    expect(notifyMock.success).toHaveBeenCalledWith("Exemplo carregado com sucesso.");

    const cstrCard = screen.getByTestId("reactor-cstr-card");

    expect(within(cstrCard).getByLabelText(/Conversão \(0-1\)/i)).toHaveValue(0.8);
    expect(within(cstrCard).getByLabelText(/Constante de velocidade/i)).toHaveValue(0.5);
    expect(
      within(cstrCard).getAllByLabelText(/^Componente$/i, { selector: "input" })[0],
    ).toHaveValue("A");
    expect(within(cstrCard).getAllByText(/Vazão de entrada/i)[0].textContent).toContain(
      "m³/s",
    );
    expect(within(cstrCard).getAllByText(/Concentração molar/i)[0].textContent).toContain(
      "mol/L",
    );

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    await expectCardValueMath(cstrCard, /^Volume$/i);
    expectCardUnitMath(cstrCard, /^Volume$/i);
    const cstrResultTable = within(cstrCard).getByRole("table");
    expect(
      within(cstrResultTable).getByText(/^Concentrações na saída \[A\]$/i),
    ).toBeInTheDocument();
    expect(
      within(cstrResultTable).getByText(/^Concentrações na saída \[B\]$/i),
    ).toBeInTheDocument();
    expect(within(cstrResultTable).queryByText(/^Concentrações na saída$/i)).toBeNull();

    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    expect(screen.getByText(/Como funciona - Reator PFR/i)).toBeInTheDocument();
    expect(within(pfrCard).getByLabelText(/Razão de reciclo/i)).toHaveValue(0);
    expect(within(pfrCard).getByLabelText(/Conversão \(0-1\)/i)).toHaveValue(0.8);
    expect(within(pfrCard).getAllByText(/Vazão de entrada/i)[0].textContent).toContain("m³/s");
    expect(within(pfrCard).getAllByText(/Concentração molar/i)[0].textContent).toContain(
      "mol/L",
    );

    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await expectCardValueMath(pfrCard, /^Volume$/i);
    expectCardUnitMath(pfrCard, /^Volume$/i);
    const pfrResultTable = within(pfrCard).getByRole("table");
    expect(
      within(pfrResultTable).getByText(/^Concentrações na saída \[A\]$/i),
    ).toBeInTheDocument();
    expect(
      within(pfrResultTable).getByText(/^Concentrações na saída \[B\]$/i),
    ).toBeInTheDocument();
    expect(within(pfrResultTable).queryByText(/^Concentrações na saída$/i)).toBeNull();
    expect(within(pfrCard).getByTestId("pfr-profile-chart")).toBeInTheDocument();
    expect(within(pfrCard).getByText(/Como funciona - Conversão x reciclo/i)).toBeInTheDocument();
    expect(within(pfrCard).getByTestId("pfr-recycle-da-chart")).toBeInTheDocument();

    selectReactorTab("Levenspiel");
    expect(await screen.findByTestId("levenspiel-chart")).toBeInTheDocument();

    selectReactorTab("CSTR");
  });

  it("removes a reactor component row from the editable form", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    expect(cstrCard.querySelectorAll("button[aria-label^='Remover componente']")).toHaveLength(2);

    fireEvent.click(cstrCard.querySelector("button[aria-label='Remover componente 2']")!);

    expect(cstrCard.querySelectorAll("button[aria-label^='Remover componente']")).toHaveLength(1);
  });

  it("clears stale reactor results and chart after dependent input edits", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    await expectCardValueMath(cstrCard, /^Volume$/i);

    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    selectReactorTab("CSTR");

    const cstrChartCard = await screen.findByTestId("reactor-cstr-card");

    fireEvent.change(within(cstrChartCard).getByLabelText(/Conversão \(0-1\)/i), {
      target: { value: "0.7" },
    });

    expectCardRowAbsent(cstrChartCard, /^Volume$/i);
  });

  it("ignores delayed CSTR responses after the user edits the form", async () => {
    const reactorRequests = mockReactorRequests({ delayCstr: true });
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    fireEvent.change(within(cstrCard).getByLabelText(/Conversão \(0-1\)/i), {
      target: { value: "0.7" },
    });

    reactorRequests.resolveCstr(
      Response.json({
        volume: { value: 1.23, units: "m³" },
        conversion: 0.65,
        limiting_reagent: "A",
      }),
    );

    await waitFor(() => {
      expectCardRowAbsent(cstrCard, /^Volume$/i);
      expect(screen.queryByText(/Diagrama de Levenspiel/i)).not.toBeInTheDocument();
    });
  });

  it("does not serialize a blank extra component row as zero-valued chemistry data", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    fireEvent.click(within(cstrCard).getByText(/Adicionar componente/i));
    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));

    await expectCardValueMath(cstrCard, /^Volume$/i);
    expect(requestBodiesFor("/api/reactor/cstr")).toContainEqual({
      input_type: "conversion_and_kinetics",
      conversion: 0.8,
      components: [
        {
          state: "liquid",
          component_name: "A",
          flow_rate_inlet: 1.2,
          molar_concentration_inlet: 2,
        },
        {
          state: "liquid",
          component_name: "B",
          flow_rate_inlet: 0,
          molar_concentration_inlet: 0,
        },
      ],
      stoichiometric_coefficients: [-1, 1],
      reaction_rate_params: { k: 0.5, reaction_orders: [1, 0] },
      operation_conditions: {
        initial_temperature: 298.15,
        initial_pressure: 101325,
        final_temperature: 298.15,
        final_pressure: 101325,
      },
    });
  });

  it("hides the comparative Levenspiel chart when shared kinetics diverge between CSTR and PFR", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");

    fireEvent.change(within(cstrCard).getByLabelText(/Constante de velocidade/i), {
      target: { value: "0.7" },
    });

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    await expectCardValueMath(cstrCard, /^Volume$/i);

    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    selectReactorTab("CSTR");
    const cstrChartCard = await screen.findByTestId("reactor-cstr-card");
    fireEvent.change(within(cstrChartCard).getByLabelText(/Temperatura inicial/i), {
      target: { value: "311" },
    });

    expectCardRowAbsent(cstrChartCard, /^Volume$/i);
  });

  it("hides the comparative Levenspiel chart when operating conditions diverge between CSTR and PFR", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");

    fireEvent.change(within(cstrCard).getByLabelText(/Temperatura inicial/i), {
      target: { value: "310" },
    });

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    await expectCardValueMath(cstrCard, /^Volume$/i);

    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    selectReactorTab("CSTR");
    const cstrChartCard = await screen.findByTestId("reactor-cstr-card");
    fireEvent.change(within(cstrChartCard).getByLabelText(/Temperatura inicial/i), {
      target: { value: "311" },
    });

    expectCardRowAbsent(cstrChartCard, /^Volume$/i);
  });

  it("shows an error notification when the CSTR calculation fails", async () => {
    mockReactorRequests({ cstrError: "Falha no backend CSTR" });
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular CSTR: Falha no backend CSTR",
      );
    });
  });

  it("shows an error notification when the PFR calculation fails", async () => {
    mockReactorRequests({ pfrError: "Falha no backend PFR" });
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    selectReactorTab("PFR");
    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular PFR: Falha no backend PFR",
      );
    });
  });
});
