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
        volume: { value: 1.23, units: "m³" },
        conversion: 0.65,
        limiting_reagent: "A",
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
        volume: { value: 0.91, units: "m³" },
        conversion: 0.8,
        limiting_reagent: "A",
        outlet_concentrations: {
          A: { value: 0.4, units: "mol/L" },
          B: { value: 1.6, units: "mol/L" },
        },
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

function expectCardUnitMath(card: HTMLElement) {
  expect(card.querySelector(".katex")).not.toBeNull();
}

function getCardRowContaining(card: HTMLElement, text: string | RegExp) {
  return within(card)
    .queryAllByText(text)
    .find((node) => node.closest("tr"))
    ?.closest("tr");
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
    expect(screen.getByText(/Como funciona - Reator PFR/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));
    expect(notifyMock.success).toHaveBeenCalledWith("Exemplo carregado com sucesso.");

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    const pfrCard = screen.getByTestId("reactor-pfr-card");

    expect(within(cstrCard).getByLabelText(/Conversão \(0-1\)/i)).toHaveValue(0.8);
    expect(within(cstrCard).getByLabelText(/Constante de velocidade/i)).toHaveValue(0.5);
    expect(
      within(cstrCard).getAllByLabelText(/^Componente$/i, { selector: "input" })[0],
    ).toHaveValue("A");
    expect(within(pfrCard).getByLabelText(/Razão de reciclo/i)).toHaveValue(0);
    expect(within(pfrCard).getByLabelText(/Conversão \(0-1\)/i)).toHaveValue(0.8);

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await expectCardValueMath(cstrCard, /^Volume$/i);
    expectCardUnitMath(cstrCard);
    await expectCardValueMath(pfrCard, /^Volume$/i);
    expectCardUnitMath(pfrCard);

    expect(screen.getByText(/Diagrama de Levenspiel/i)).toBeInTheDocument();
    expect(screen.getByText(/CSTR operacional/i)).toBeInTheDocument();
    expect(screen.getByText(/PFR operacional/i)).toBeInTheDocument();
    expect(screen.getByText(/X máx = 0.95/i)).toBeInTheDocument();
    expect(screen.getByText(/Aproximação didática local/i)).toBeInTheDocument();
    expect(screen.getByTestId("pfr-profile-chart")).toBeInTheDocument();
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

  it("shows saved exploratory scenarios in the Levenspiel chart", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));
    fireEvent.change(screen.getByLabelText(/Modo Exploratório/i), {
      target: { value: "first-order" },
    });

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    const pfrCard = screen.getByTestId("reactor-pfr-card");

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await expectCardValueMath(cstrCard, /^Volume$/i);
    expectCardUnitMath(cstrCard);
    await expectCardValueMath(pfrCard, /^Volume$/i);
    expectCardUnitMath(pfrCard);

    fireEvent.click(screen.getByText(/Salvar cenário/i));

    const levenspielChart = screen.getByLabelText(/Diagrama de Levenspiel/i);
    expect(within(levenspielChart).getByTestId("saved-scenarios")).toBeInTheDocument();
    expect(within(levenspielChart).getAllByTestId("saved-scenario")).toHaveLength(1);
    expect(within(levenspielChart).getByTestId("saved-scenario")).toHaveTextContent(
      /X=0\.8\s*·\s*k=0\.5/i,
    );
  });

  it("updates the Levenspiel chart when the exploratory conversion slider changes", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));
    fireEvent.change(screen.getByLabelText(/Modo Exploratório/i), {
      target: { value: "first-order" },
    });

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    const pfrCard = screen.getByTestId("reactor-pfr-card");

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await expectCardValueMath(cstrCard, /^Volume$/i);
    expectCardUnitMath(cstrCard);
    await expectCardValueMath(pfrCard, /^Volume$/i);
    expectCardUnitMath(pfrCard);
    expect(screen.getByText(/X máx = 0.95/i)).toBeInTheDocument();

    vi.useFakeTimers();
    try {
      const conversionSlider = screen.getByLabelText(/Conversao X/i);
      fireEvent.change(conversionSlider, { target: { value: "0.9" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
    } finally {
      vi.useRealTimers();
    }

    expect(screen.getByLabelText(/Diagrama de Levenspiel/i)).toBeInTheDocument();
    expect(screen.getByText(/X máx = 0\.90/i)).toBeInTheDocument();
  });

  it("clears stale reactor results and chart after dependent input edits", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    const pfrCard = screen.getByTestId("reactor-pfr-card");

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await expectCardValueMath(cstrCard, /^Volume$/i);
    expectCardUnitMath(cstrCard);
    await expectCardValueMath(pfrCard, /^Volume$/i);
    expectCardUnitMath(pfrCard);
    expect(screen.getByText(/Diagrama de Levenspiel/i)).toBeInTheDocument();

    fireEvent.change(within(cstrCard).getByLabelText(/Conversão \(0-1\)/i), {
      target: { value: "0.7" },
    });

    expectCardRowAbsent(cstrCard, /^Volume$/i);
    expectCardRowAbsent(pfrCard, /^Volume$/i);
    expect(screen.queryByText(/Diagrama de Levenspiel/i)).not.toBeInTheDocument();
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

  it("shows the exploratory panel and applies the first-order template", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Modo Exploratório/i), {
      target: { value: "first-order" },
    });

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    const pfrCard = screen.getByTestId("reactor-pfr-card");

    expect(within(cstrCard).getByLabelText(/Conversão \(0-1\)/i)).toHaveValue(0.8);
    expect(within(cstrCard).getByLabelText(/Constante de velocidade/i)).toHaveValue(0.5);
    expect(within(pfrCard).getByLabelText(/Conversão \(0-1\)/i)).toHaveValue(0.8);
    expect(within(pfrCard).getByLabelText(/Constante de velocidade/i)).toHaveValue(0.5);
    expect(screen.getByText(/Roteiro de exploração/i)).toBeInTheDocument();
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
    expectCardUnitMath(cstrCard);
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
    const pfrCard = screen.getByTestId("reactor-pfr-card");

    fireEvent.change(within(cstrCard).getByLabelText(/Constante de velocidade/i), {
      target: { value: "0.7" },
    });

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await expectCardValueMath(cstrCard, /^Volume$/i);
    expectCardUnitMath(cstrCard);
    await expectCardValueMath(pfrCard, /^Volume$/i);
    expectCardUnitMath(pfrCard);
    expect(screen.queryByText(/Diagrama de Levenspiel/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Alinhe conversão, cinética e alimentação entre CSTR e PFR/i),
    ).toBeInTheDocument();
  });

  it("hides the comparative Levenspiel chart when operating conditions diverge between CSTR and PFR", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    const pfrCard = screen.getByTestId("reactor-pfr-card");

    fireEvent.change(within(cstrCard).getByLabelText(/Temperatura inicial/i), {
      target: { value: "310" },
    });

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await expectCardValueMath(cstrCard, /^Volume$/i);
    expectCardUnitMath(cstrCard);
    await expectCardValueMath(pfrCard, /^Volume$/i);
    expectCardUnitMath(pfrCard);
    expect(screen.queryByText(/Diagrama de Levenspiel/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Alinhe conversão, cinética e alimentação entre CSTR e PFR/i),
    ).toBeInTheDocument();
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

    const pfrCard = screen.getByTestId("reactor-pfr-card");
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular PFR: Falha no backend PFR",
      );
    });
  });
});
