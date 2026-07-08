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
  delayPfr?: boolean;
  delayLevenspiel?: boolean;
}) {
  const resolveCstrQueue: Array<(response: Response) => void> = [];
  const resolvePfrQueue: Array<(response: Response) => void> = [];
  let resolveLevenspiel: ((response: Response) => void) | undefined;

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
      return Response.json(["Water", "Ethanol"]);
    }

    if (url.endsWith("/api/reactor/cstr") && method === "POST") {
      if (options?.delayCstr) {
        return new Promise<Response>((resolve) => {
          resolveCstrQueue.push(resolve);
        });
      }

      if (options?.cstrError) {
        return new Response(JSON.stringify({ detail: options.cstrError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        volume: { value: 3.0, units: "meter ** 3" },
        reaction_rate: { value: 200, units: "mole / meter ** 3 / second" },
        taxa_de_reacao: { value: 200, units: "mole / meter ** 3 / second" },
        outlet_concentrations: {
          Water: { value: 3.9, units: "mole / meter ** 3" },
          Ethanol: { value: 0.7, units: "mole / meter ** 3" },
        },
        concentracoes_de_saida: {
          Water: { value: 3.9, units: "mole / meter ** 3" },
          Ethanol: { value: 0.7, units: "mole / meter ** 3" },
        },
        dilution_factor: { value: 0, units: "dimensionless" },
        fator_de_diluicao: { value: 0, units: "dimensionless" },
        "molar_rate_inlet_(limitant)": { value: 6000, units: "mole / second" },
        "vazao_molar_entrada_(limitante)": { value: 6000, units: "mole / second" },
        flow_rate_outlet: { value: 1.2, units: "meter ** 3 / second" },
        vazao_de_saida: { value: 1.2, units: "meter ** 3 / second" },
        residence_time: { value: 8, units: "second" },
        tempo_de_residencia: { value: 8, units: "second" },
        conversion: 0.24,
        conversao: 0.24,
      });
    }

    if (url.endsWith("/api/reactor/pfr") && method === "POST") {
      if (options?.delayPfr) {
        return new Promise<Response>((resolve) => {
          resolvePfrQueue.push(resolve);
        });
      }

      if (options?.pfrError) {
        return new Response(JSON.stringify({ detail: options.pfrError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        volume: { value: 3.0, units: "meter ** 3" },
        reaction_rate: { value: 200, units: "mole / meter ** 3 / second" },
        taxa_de_reacao: { value: 200, units: "mole / meter ** 3 / second" },
        outlet_concentrations: {
          Water: { value: 3.2, units: "mole / meter ** 3" },
          Ethanol: { value: 0.91, units: "mole / meter ** 3" },
        },
        concentracoes_de_saida: {
          Water: { value: 3.2, units: "mole / meter ** 3" },
          Ethanol: { value: 0.91, units: "mole / meter ** 3" },
        },
        dilution_factor: { value: 0, units: "dimensionless" },
        fator_de_diluicao: { value: 0, units: "dimensionless" },
        "molar_rate_inlet_(limitant)": { value: 6000, units: "mole / second" },
        "vazao_molar_entrada_(limitante)": { value: 6000, units: "mole / second" },
        flow_rate_outlet: { value: 1.2, units: "meter ** 3 / second" },
        vazao_de_saida: { value: 1.2, units: "meter ** 3 / second" },
        residence_time: { value: 8, units: "second" },
        tempo_de_residencia: { value: 8, units: "second" },
        conversion: 0.182478,
        conversao: 0.182478,
      });
    }

    if (url.endsWith("/api/reactor/pfr/recycle-profile") && method === "POST") {
      return Response.json({
        points: [
          { recycling_ratio: 0, conversion: { value: 0.182478, units: "dimensionless" } },
          { recycling_ratio: 0.25, conversion: { value: 0.300067, units: "dimensionless" } },
          { recycling_ratio: 0.5, conversion: { value: 0.322949, units: "dimensionless" } },
          { recycling_ratio: 1, conversion: { value: 0.339067, units: "dimensionless" } },
          { recycling_ratio: 2, conversion: { value: 0.347392, units: "dimensionless" } },
          { recycling_ratio: 5, conversion: { value: 0.350848, units: "dimensionless" } },
          { recycling_ratio: 10, conversion: { value: 0.351259, units: "dimensionless" } },
        ],
      });
    }

    if (url.endsWith("/api/reactor/levenspiel/chart") && method === "POST") {
      if (options?.delayLevenspiel) {
        return new Promise<Response>((resolve) => {
          resolveLevenspiel = resolve;
        });
      }

      return Response.json({
        id: "reactor-levenspiel-chart",
        title: "Comparação Levenspiel CSTR vs PFR",
        subtitle: "Volume necessário em função da conversão para a mesma cinética sem reciclo.",
        axes: {
          x: {
            scale: "linear",
            label: "Conversão",
            units: "adimensional",
            domain: { min: 0, max: 0.9 },
            ticks: [0, 0.3, 0.6, 0.9],
            major_ticks: [0, 0.3, 0.6, 0.9],
          },
          y: {
            scale: "linear",
            label: "Volume",
            units: "m³",
            domain: { min: 0, max: 12 },
            ticks: [0, 4, 8, 12],
            major_ticks: [0, 4, 8, 12],
          },
        },
        series: [
          {
            id: "cstr-volume",
            name: "CSTR",
            kind: "line",
            color: "#2563eb",
            points: [
              { x: 0.2, y: 2 },
              { x: 0.5, y: 6 },
              { x: 0.8, y: 9.6 },
            ],
          },
          {
            id: "pfr-volume",
            name: "PFR",
            kind: "line",
            color: "#dc2626",
            points: [
              { x: 0.2, y: 1.6 },
              { x: 0.5, y: 4.8 },
              { x: 0.8, y: 8.1 },
            ],
          },
        ],
        markers: [
          { id: "cstr-operating-point", x: 0.8, y: 9.6, label: "CSTR operacional", color: "#2563eb" },
          { id: "pfr-operating-point", x: 0.8, y: 8.1, label: "PFR operacional", color: "#dc2626" },
        ],
        annotations: [],
        metadata: { version: "1.0", units: { x: "adimensional", y: "m³" } },
      });
    }

    if (url.endsWith("/api/reactor/pfr/spatial-profile") && method === "POST") {
      return Response.json({
        stations: [
          {
            relative_volume: 0,
            conversion: { value: 0, units: "adimensional" },
            temperature: { value: 300, units: "K" },
            concentrations: {
              Water: { value: 5, units: "mol/m³" },
              Ethanol: { value: 0, units: "mol/m³" },
            },
          },
          {
            relative_volume: 0.1,
            conversion: { value: 0.03, units: "adimensional" },
            temperature: { value: 315, units: "K" },
            concentrations: {
              Water: { value: 4.75, units: "mol/m³" },
              Ethanol: { value: 0.15, units: "mol/m³" },
            },
          },
          {
            relative_volume: 0.2,
            conversion: { value: 0.06, units: "adimensional" },
            temperature: { value: 330, units: "K" },
            concentrations: {
              Water: { value: 4.55, units: "mol/m³" },
              Ethanol: { value: 0.28, units: "mol/m³" },
            },
          },
          {
            relative_volume: 0.25,
            conversion: { value: 0.08, units: "adimensional" },
            temperature: { value: 337.5, units: "K" },
            concentrations: {
              Water: { value: 4.4, units: "mol/m³" },
              Ethanol: { value: 0.36, units: "mol/m³" },
            },
          },
          {
            relative_volume: 0.4,
            conversion: { value: 0.12, units: "adimensional" },
            temperature: { value: 360, units: "K" },
            concentrations: {
              Water: { value: 4.15, units: "mol/m³" },
              Ethanol: { value: 0.52, units: "mol/m³" },
            },
          },
          {
            relative_volume: 0.5,
            conversion: { value: 0.14, units: "adimensional" },
            temperature: { value: 375, units: "K" },
            concentrations: {
              Water: { value: 4.0, units: "mol/m³" },
              Ethanol: { value: 0.61, units: "mol/m³" },
            },
          },
          {
            relative_volume: 0.6,
            conversion: { value: 0.155, units: "adimensional" },
            temperature: { value: 390, units: "K" },
            concentrations: {
              Water: { value: 3.85, units: "mol/m³" },
              Ethanol: { value: 0.69, units: "mol/m³" },
            },
          },
          {
            relative_volume: 0.75,
            conversion: { value: 0.17, units: "adimensional" },
            temperature: { value: 412.5, units: "K" },
            concentrations: {
              Water: { value: 3.6, units: "mol/m³" },
              Ethanol: { value: 0.81, units: "mol/m³" },
            },
          },
          {
            relative_volume: 0.8,
            conversion: { value: 0.176, units: "adimensional" },
            temperature: { value: 420, units: "K" },
            concentrations: {
              Water: { value: 3.45, units: "mol/m³" },
              Ethanol: { value: 0.86, units: "mol/m³" },
            },
          },
          {
            relative_volume: 1,
            conversion: { value: 0.182478, units: "adimensional" },
            temperature: { value: 450, units: "K" },
            concentrations: {
              Water: { value: 3.2, units: "mol/m³" },
              Ethanol: { value: 0.91, units: "mol/m³" },
            },
          },
        ],
      });
    }

    if (url.endsWith("/api/reactor/pfr/profile/chart") && method === "POST") {
      return Response.json({
        id: "reactor-pfr-profile-chart",
        title: "Perfil espacial do PFR",
        subtitle: "Concentrações e temperatura ao longo do volume relativo do reator.",
        axes: {
          x: {
            scale: "linear",
            label: "Posição relativa no reator",
            units: "adimensional",
            domain: { min: 0, max: 1 },
            ticks: [0, 0.25, 0.5, 0.75, 1],
            major_ticks: [0, 0.25, 0.5, 0.75, 1],
          },
          y: {
            scale: "linear",
            label: "Concentração",
            units: "mol/m³",
            domain: { min: 0, max: 5 },
            ticks: [0, 2.5, 5],
            major_ticks: [0, 2.5, 5],
          },
          temperature: {
            scale: "linear",
            label: "Temperatura",
            units: "K",
            domain: { min: 300, max: 450 },
            ticks: [300, 375, 450],
            major_ticks: [300, 375, 450],
          },
        },
        series: [
          {
            id: "component-water",
            name: "Concentração de Water",
            kind: "line",
            color: "#2563eb",
            points: [
              { x: 0, y: 5 },
              { x: 0.25, y: 4.4 },
              { x: 0.5, y: 4.0 },
              { x: 0.75, y: 3.6 },
              { x: 1, y: 3.2 },
            ],
          },
          {
            id: "component-ethanol",
            name: "Concentração de Ethanol",
            kind: "line",
            color: "#16a34a",
            points: [
              { x: 0, y: 0 },
              { x: 0.25, y: 0.36 },
              { x: 0.5, y: 0.61 },
              { x: 0.75, y: 0.81 },
              { x: 1, y: 0.91 },
            ],
          },
          {
            id: "temperature-profile",
            name: "Temperatura",
            kind: "line",
            color: "#ea580c",
            points: [
              { x: 0, y: 300 },
              { x: 0.25, y: 337.5 },
              { x: 0.5, y: 375 },
              { x: 0.75, y: 412.5 },
              { x: 1, y: 450 },
            ],
          },
        ],
        markers: [
          {
            id: "outlet-conversion",
            x: 1,
            y: 0.182478,
            label: "Conversão de saída = 0.182",
            color: "#7c3aed",
          },
        ],
        annotations: [],
        metadata: {
          version: "1.0",
          units: { x: "adimensional", y: "mol/m³", temperature: "K" },
        },
      });
    }

    if (url.endsWith("/api/reactor/pfr/recycle-profile/chart") && method === "POST") {
      return Response.json({
        id: "reactor-pfr-recycle-profile-chart",
        title: "Conversão em função do reciclo",
        subtitle: "Perfil de sensibilidade da conversão ao variar a razão de reciclo.",
        axes: {
          x: {
            scale: "linear",
            label: "Razão de reciclo",
            units: "adimensional",
            domain: { min: 0, max: 10 },
            ticks: [0, 2, 5, 10],
            major_ticks: [0, 2, 5, 10],
          },
          y: {
            scale: "linear",
            label: "Conversão",
            units: "adimensional",
            domain: { min: 0.18, max: 0.36 },
            ticks: [0.18, 0.27, 0.36],
            major_ticks: [0.18, 0.27, 0.36],
          },
        },
        series: [
          {
            id: "conversion-vs-recycle",
            name: "Conversão",
            kind: "line",
            color: "#2563eb",
            points: [
              { x: 0, y: 0.182478 },
              { x: 0.25, y: 0.300067 },
              { x: 0.5, y: 0.322949 },
              { x: 1, y: 0.339067 },
              { x: 2, y: 0.347392 },
              { x: 5, y: 0.350848 },
              { x: 10, y: 0.351259 },
            ],
          },
        ],
        markers: [{ id: "baseline-recycle", x: 0, y: 0.182478, label: "Sem reciclo", color: "#dc2626" }],
        annotations: [],
        metadata: { version: "1.0", units: { x: "adimensional", y: "adimensional" } },
      });
    }

    if (url.endsWith("/api/reactor/arrhenius/chart") && method === "POST") {
      return Response.json({
        id: "reactor-arrhenius-chart",
        title: "Arrhenius",
        subtitle: "Curva semilog de Arrhenius: 1000 / T versus ln(k).",
        axes: {
          x: {
            scale: "linear",
            label: "1000 / T",
            units: "10^3 K^-1",
            domain: { min: 2.4, max: 3.4 },
            ticks: [2.4, 2.8, 3.2, 3.4],
            major_ticks: [2.4, 2.8, 3.2, 3.4],
          },
          y: {
            scale: "linear",
            label: "ln(k)",
            units: "adimensional",
            domain: { min: -2, max: 1 },
            ticks: [-2, -1, 0, 1],
            major_ticks: [-2, -1, 0, 1],
          },
        },
        series: [
          {
            id: "arrhenius-curve",
            name: "Curva de Arrhenius",
            kind: "line",
            color: "#0f766e",
            points: [
              { x: 2.4, y: 0.9 },
              { x: 2.8, y: 0.2 },
              { x: 3.2, y: -0.8 },
            ],
          },
        ],
        markers: [{ id: "reference-point", x: 2.85, y: -0.69, label: "Ponto de referência", color: "#dc2626" }],
        annotations: [],
        metadata: { version: "1.0", units: { x: "10^3 K^-1", y: "adimensional" } },
      });
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveCstr(response: Response, order: "oldest" | "newest" = "oldest") {
      const resolver =
        order === "newest" ? resolveCstrQueue.pop() : resolveCstrQueue.shift();
      resolver?.(response);
    },
    resolvePfr(response: Response, order: "oldest" | "newest" = "oldest") {
      const resolver =
        order === "newest" ? resolvePfrQueue.pop() : resolvePfrQueue.shift();
      resolver?.(response);
    },
    resolveLevenspiel(response: Response) {
      resolveLevenspiel?.(response);
    },
  };
}

function renderReactorPage(initialEntry = "/reactor/cstr") {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
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

  it("shows the didactic accordions, loads the worked example, auto-calculates CSTR and PFR, and renders the Levenspiel view", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();
    expect(screen.getByText(/Como funciona - Reator CSTR/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));
    expect(notifyMock.success).toHaveBeenCalledWith("Exemplo carregado com sucesso.");

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    await waitFor(() => {
      expect(within(cstrCard).getByLabelText(/Volume do reator/i)).toHaveValue(3);
    });

    expect(within(cstrCard).getByLabelText(/Constante de velocidade/i)).toHaveValue(0.01);
    expect(
      within(cstrCard).getAllByLabelText(/^Componente$/i, { selector: "input" })[0],
    ).toHaveValue("Água");
    expect(
      within(cstrCard).getAllByLabelText(/^Componente$/i, { selector: "input" })[1],
    ).toHaveValue("Etanol");
    expect(within(cstrCard).getAllByLabelText(/Concentração molar/i)[0]).toHaveValue(5000);
    expect(within(cstrCard).getAllByText(/Vazão de entrada/i)[0].textContent).toContain(
      "m³/s",
    );
    expect(within(cstrCard).getAllByText(/Concentração molar/i)[0].textContent).toContain(
      "mol/m³",
    );
    await expectCardValueMath(cstrCard, /^Volume$/i);
    expectCardUnitMath(cstrCard, /^Volume$/i);
    const cstrResultTable = within(cstrCard).getByRole("table");
    expect(
      within(cstrResultTable).getByText(/^Concentrações na saída \[Water\]$/i),
    ).toBeInTheDocument();
    expect(
      within(cstrResultTable).getByText(/^Concentrações na saída \[Ethanol\]$/i),
    ).toBeInTheDocument();
    expect(within(cstrResultTable).queryByText(/^Concentrações na saída$/i)).toBeNull();

    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    expect(screen.getByText(/Como funciona - Reator PFR/i)).toBeInTheDocument();
    const recyclingRatio = within(pfrCard).getByLabelText(/Razão de reciclo/i);
    expect(recyclingRatio).toHaveValue(0);
    fireEvent.blur(recyclingRatio);
    expect(within(pfrCard).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(pfrCard).getByLabelText(/Volume do reator/i)).toHaveValue(3);
    expect(
      within(pfrCard).getAllByLabelText(/^Componente$/i, { selector: "input" })[0],
    ).toHaveValue("Água");
    expect(
      within(pfrCard).getAllByLabelText(/^Componente$/i, { selector: "input" })[1],
    ).toHaveValue("Etanol");
    expect(within(pfrCard).getByLabelText(/Constante de velocidade/i)).toHaveValue(0.01);
    expect(within(pfrCard).getAllByLabelText(/Concentração molar/i)[0]).toHaveValue(5000);
    expect(within(pfrCard).getAllByText(/Vazão de entrada/i)[0].textContent).toContain("m³/s");
    expect(within(pfrCard).getAllByText(/Concentração molar/i)[0].textContent).toContain(
      "mol/m³",
    );

    await expectCardValueMath(pfrCard, /^Volume$/i);
    expectCardUnitMath(pfrCard, /^Volume$/i);
    const pfrResultTable = within(pfrCard).getByRole("table");
    expect(
      within(pfrResultTable).getByText(/^Concentrações na saída \[Water\]$/i),
    ).toBeInTheDocument();
    expect(
      within(pfrResultTable).getByText(/^Concentrações na saída \[Ethanol\]$/i),
    ).toBeInTheDocument();
    expect(within(pfrResultTable).queryByText(/^Concentrações na saída$/i)).toBeNull();
    expect(await within(pfrCard).findByTestId("pfr-profile-chart")).toBeInTheDocument();
    expect(within(pfrCard).getByTestId("pfr-reactor-schematic")).toBeInTheDocument();
    expect(within(pfrCard).getByTestId("pfr-recycle-da-chart")).toBeInTheDocument();
    expect(within(pfrCard).getByText(/Concentração por componente/i)).toBeInTheDocument();
    expect(within(pfrCard).getByText(/Programa térmico/i)).toBeInTheDocument();
    expect(within(pfrCard).getByText(/Conversão em função do reciclo/i)).toBeInTheDocument();
    expect(pfrCard.textContent ?? "").toMatch(/Water:\s*5(?:[.,]0+)?\s*mol\/m³/i);
    expect(pfrCard.textContent ?? "").toMatch(/Ethanol:\s*0[.,]91(?:0+)?\s*mol\/m³/i);
    expect(requestBodiesFor("/api/reactor/cstr")).toContainEqual({
      input_type: "volume_and_kinetics",
      components: [
        {
          state: "liquid",
          component_name: "Water",
          flow_rate_inlet: 1.2,
          molar_concentration_inlet: 5000,
        },
        {
          state: "liquid",
          component_name: "Ethanol",
          flow_rate_inlet: 0,
          molar_concentration_inlet: 0,
        },
      ],
      stoichiometric_coefficients: [-1, 1],
      reaction_rate_params: { k: 0.01, reaction_orders: [1, 0.5] },
      operation_conditions: {
        initial_temperature: 300,
        initial_pressure: 101325,
        final_temperature: 450,
        final_pressure: 101325,
      },
      volume: 3,
    });
    expect(requestBodiesFor("/api/reactor/pfr")).toContainEqual({
      input_type: "volume_and_kinetics",
      components: [
        {
          state: "liquid",
          component_name: "Water",
          flow_rate_inlet: 1.2,
          molar_concentration_inlet: 5000,
        },
        {
          state: "liquid",
          component_name: "Ethanol",
          flow_rate_inlet: 0,
          molar_concentration_inlet: 0,
        },
      ],
      stoichiometric_coefficients: [-1, 1],
      reaction_rate_params: { k: 0.01, reaction_orders: [1, 0.5] },
      operation_conditions: {
        initial_temperature: 300,
        initial_pressure: 101325,
        final_temperature: 450,
        final_pressure: 101325,
      },
      volume: 3,
    });
    expect(requestBodiesFor("/api/reactor/pfr/recycle-profile/chart")).toContainEqual({
      components: [
        {
          state: "liquid",
          component_name: "Water",
          flow_rate_inlet: 1.2,
          molar_concentration_inlet: 5000,
        },
        {
          state: "liquid",
          component_name: "Ethanol",
          flow_rate_inlet: 0,
          molar_concentration_inlet: 0,
        },
      ],
      stoichiometric_coefficients: [-1, 1],
      reaction_rate_params: { k: 0.01, reaction_orders: [1, 0.5] },
      operation_conditions: {
        initial_temperature: 300,
        initial_pressure: 101325,
        final_temperature: 450,
        final_pressure: 101325,
      },
      volume: 3,
      recycle_ratios: [0, 0.25, 0.5, 1, 2, 5, 10],
    });
    expect(requestBodiesFor("/api/reactor/pfr/spatial-profile")).toContainEqual({
      components: [
        {
          state: "liquid",
          component_name: "Water",
          flow_rate_inlet: 1.2,
          molar_concentration_inlet: 5000,
        },
        {
          state: "liquid",
          component_name: "Ethanol",
          flow_rate_inlet: 0,
          molar_concentration_inlet: 0,
        },
      ],
      stoichiometric_coefficients: [-1, 1],
      reaction_rate_params: { k: 0.01, reaction_orders: [1, 0.5] },
      operation_conditions: {
        initial_temperature: 300,
        initial_pressure: 101325,
        final_temperature: 450,
        final_pressure: 101325,
      },
      volume: 3,
      recycling_ratio: 0,
      axial_positions: [0, 0.1, 0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1],
    });
    expect(requestBodiesFor("/api/reactor/pfr/profile/chart")).toContainEqual({
      components: [
        {
          state: "liquid",
          component_name: "Water",
          flow_rate_inlet: 1.2,
          molar_concentration_inlet: 5000,
        },
        {
          state: "liquid",
          component_name: "Ethanol",
          flow_rate_inlet: 0,
          molar_concentration_inlet: 0,
        },
      ],
      stoichiometric_coefficients: [-1, 1],
      reaction_rate_params: { k: 0.01, reaction_orders: [1, 0.5] },
      operation_conditions: {
        initial_temperature: 300,
        initial_pressure: 101325,
        final_temperature: 450,
        final_pressure: 101325,
      },
      volume: 3,
      recycling_ratio: 0,
      axial_positions: [0, 0.1, 0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1],
    });

    selectReactorTab("Levenspiel");
    const levenspielChart = await screen.findByTestId("levenspiel-chart");
    expect(levenspielChart).toBeInTheDocument();
    expect(within(levenspielChart).getByText(/Comparação Levenspiel CSTR vs PFR/i)).toBeInTheDocument();
    expect(within(levenspielChart).getByText(/CSTR operacional/i)).toBeInTheDocument();
    expect(within(levenspielChart).getByText(/PFR operacional/i)).toBeInTheDocument();

    selectReactorTab("Arrhenius");
    expect(await screen.findByRole("button", { name: /Como funciona - Arrhenius/i })).toBeInTheDocument();
    const arrheniusPlot = await screen.findByTestId("arrhenius-plot");
    expect(within(arrheniusPlot).getByTestId("chart-series-legend")).toHaveTextContent(
      /Curva de Arrhenius/i,
    );
    expect(within(arrheniusPlot).getByTestId("chart-series-legend")).toHaveTextContent(
      /Ponto de referência/i,
    );
    expect(
      Array.from(arrheniusPlot.querySelectorAll("svg text")).some((node) =>
        node.textContent?.includes("Ponto de referência"),
      ),
    ).toBe(false);

    selectReactorTab("CSTR");
  }, 10000);

  it("shows a loading state while the comparative Levenspiel chart is being fetched", async () => {
    const requests = mockReactorRequests({ delayLevenspiel: true });
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    await expectCardValueMath(cstrCard, /^Volume$/i);

    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));
    await expectCardValueMath(pfrCard, /^Volume$/i);

    selectReactorTab("Levenspiel");

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Gerando gráfico comparativo/i);
    });

    expect(screen.queryByTestId("levenspiel-chart")).not.toBeInTheDocument();

    requests.resolveLevenspiel(
      Response.json({
        id: "reactor-levenspiel-chart",
        title: "Comparação Levenspiel CSTR vs PFR",
        subtitle: "Volume necessário em função da conversão para a mesma cinética sem reciclo.",
        axes: {
          x: {
            scale: "linear",
            label: "Conversão",
            units: "adimensional",
            domain: { min: 0, max: 0.9 },
            ticks: [0, 0.3, 0.6, 0.9],
            major_ticks: [0, 0.3, 0.6, 0.9],
          },
          y: {
            scale: "linear",
            label: "Volume",
            units: "m³",
            domain: { min: 0, max: 12 },
            ticks: [0, 4, 8, 12],
            major_ticks: [0, 4, 8, 12],
          },
        },
        series: [
          {
            id: "cstr-volume",
            name: "CSTR",
            kind: "line",
            color: "#2563eb",
            points: [
              { x: 0.2, y: 2 },
              { x: 0.5, y: 6 },
              { x: 0.8, y: 9.6 },
            ],
          },
          {
            id: "pfr-volume",
            name: "PFR",
            kind: "line",
            color: "#dc2626",
            points: [
              { x: 0.2, y: 1.6 },
              { x: 0.5, y: 4.8 },
              { x: 0.8, y: 8.1 },
            ],
          },
        ],
        markers: [
          { id: "cstr-operating-point", x: 0.8, y: 9.6, label: "CSTR operacional", color: "#2563eb" },
          { id: "pfr-operating-point", x: 0.8, y: 8.1, label: "PFR operacional", color: "#dc2626" },
        ],
        annotations: [],
        metadata: { version: "1.0", units: { x: "adimensional", y: "m³" } },
      }),
    );

    const levenspielChart = await screen.findByTestId("levenspiel-chart");
    expect(levenspielChart).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  }, 10000);

  it("shows a loading state while the PFR profile is being fetched", async () => {
    const requests = mockReactorRequests({ delayPfr: true });
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));
    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await waitFor(() => {
      expect(within(pfrCard).getByRole("status")).toHaveTextContent(/Calculando PFR/i);
    });

    const submitButton = within(pfrCard).getByRole("button", { name: /Calcular PFR/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton.querySelector("svg")).not.toBeNull();

    requests.resolvePfr(
      Response.json({
        volume: { value: 3.0, units: "meter ** 3" },
        reaction_rate: { value: 200, units: "mole / meter ** 3 / second" },
        taxa_de_reacao: { value: 200, units: "mole / meter ** 3 / second" },
        outlet_concentrations: {
          Water: { value: 3.2, units: "mole / meter ** 3" },
          Ethanol: { value: 0.91, units: "mole / meter ** 3" },
        },
        concentracoes_de_saida: {
          Water: { value: 3.2, units: "mole / meter ** 3" },
          Ethanol: { value: 0.91, units: "mole / meter ** 3" },
        },
        dilution_factor: { value: 0, units: "dimensionless" },
        fator_de_diluicao: { value: 0, units: "dimensionless" },
        "molar_rate_inlet_(limitant)": { value: 6000, units: "mole / second" },
        "vazao_molar_entrada_(limitante)": { value: 6000, units: "mole / second" },
        flow_rate_outlet: { value: 1.2, units: "meter ** 3 / second" },
        vazao_de_saida: { value: 1.2, units: "meter ** 3 / second" },
        residence_time: { value: 8, units: "second" },
        tempo_de_residencia: { value: 8, units: "second" },
        conversion: 0.182478,
        conversao: 0.182478,
      }),
    );

    expect(await within(pfrCard).findByTestId("pfr-profile-chart")).toBeInTheDocument();
    expect(within(pfrCard).queryByRole("status")).toBeNull();
  });

  it("renders PFR outlet concentrations in mol/m³ without frontend unit conversion", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));
    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    await waitFor(() => {
      expect(within(pfrCard).getByLabelText(/Volume do reator/i)).toHaveValue(3);
    });
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    await screen.findByTestId("pfr-profile-chart");
    expect(within(pfrCard).getByText("Concentração (mol/m³)")).toBeInTheDocument();
    expect(requestBodiesFor("/api/reactor/pfr/spatial-profile")).toContainEqual(
      expect.objectContaining({
        components: [
          expect.objectContaining({ component_name: "Water", molar_concentration_inlet: 5000 }),
          expect.objectContaining({ component_name: "Ethanol", molar_concentration_inlet: 0 }),
        ],
      }),
    );
    expect(requestBodiesFor("/api/reactor/pfr/profile/chart")).toContainEqual(
      expect.objectContaining({
        components: [
          expect.objectContaining({ component_name: "Water", molar_concentration_inlet: 5000 }),
          expect.objectContaining({ component_name: "Ethanol", molar_concentration_inlet: 0 }),
        ],
      }),
    );
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
    await waitFor(() => {
      expect(within(cstrCard).getByLabelText(/Volume do reator/i)).toHaveValue(3);
    });

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    await expectCardValueMath(cstrCard, /^Volume$/i);

    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    selectReactorTab("CSTR");

    const cstrChartCard = await screen.findByTestId("reactor-cstr-card");

    fireEvent.change(within(cstrChartCard).getByLabelText(/Volume do reator/i), {
      target: { value: "2.5" },
    });

    expectCardRowAbsent(cstrChartCard, /^Volume$/i);
  });

  it("ignores delayed CSTR responses after the user edits the form", async () => {
    const reactorRequests = mockReactorRequests({ delayCstr: true });
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    await waitFor(() => {
      expect(within(cstrCard).getByLabelText(/Volume do reator/i)).toHaveValue(3);
    });
    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    fireEvent.change(within(cstrCard).getByLabelText(/Volume do reator/i), {
      target: { value: "2.5" },
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

  it("keeps the latest CSTR result when repeated submits resolve out of order", async () => {
    const reactorRequests = mockReactorRequests({ delayCstr: true });
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    await waitFor(() => {
      expect(within(cstrCard).getByLabelText(/Volume do reator/i)).toHaveValue(3);
    });

    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));
    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));

    reactorRequests.resolveCstr(
      Response.json({
        volume: { value: 9.87, units: "m³" },
        conversion: 0.65,
        limiting_reagent: "A",
      }),
      "newest",
    );

    await expectCardValueMath(cstrCard, /^Volume$/i, "9,87");

    reactorRequests.resolveCstr(
      Response.json({
        volume: { value: 1.23, units: "m³" },
        conversion: 0.24,
        limiting_reagent: "A",
      }),
      "oldest",
    );

    await waitFor(() => {
      const volumeRow = getCardRowContaining(cstrCard, /^Volume$/i);
      expect(volumeRow?.querySelector("td:nth-child(2)")?.textContent ?? "").toContain("9,87");
      expect(volumeRow?.querySelector("td:nth-child(2)")?.textContent ?? "").not.toContain("1,23");
    });
  });

  it("keeps the latest PFR result when repeated submits resolve out of order", async () => {
    const reactorRequests = mockReactorRequests({ delayPfr: true });
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));
    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    await waitFor(() => {
      expect(within(pfrCard).getByLabelText(/Volume do reator/i)).toHaveValue(3);
    });

    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));
    fireEvent.click(within(pfrCard).getByText(/Calcular PFR/i));

    reactorRequests.resolvePfr(
      Response.json({
        volume: { value: 9.87, units: "m³" },
        reaction_rate: { value: 200, units: "mole / meter ** 3 / second" },
        conversion: 0.65,
        conversao: 0.65,
      }),
      "newest",
    );

    await expectCardValueMath(pfrCard, /^Volume$/i, "9,87");
    expect(await within(pfrCard).findByTestId("pfr-profile-chart")).toBeInTheDocument();

    reactorRequests.resolvePfr(
      Response.json({
        volume: { value: 1.23, units: "m³" },
        reaction_rate: { value: 120, units: "mole / meter ** 3 / second" },
        conversion: 0.24,
        conversao: 0.24,
      }),
      "oldest",
    );

    await waitFor(() => {
      const volumeRow = getCardRowContaining(pfrCard, /^Volume$/i);
      expect(volumeRow?.querySelector("td:nth-child(2)")?.textContent ?? "").toContain("9,87");
      expect(volumeRow?.querySelector("td:nth-child(2)")?.textContent ?? "").not.toContain("1,23");
    });
  });

  it("does not serialize a blank extra component row as zero-valued chemistry data", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));

    const cstrCard = screen.getByTestId("reactor-cstr-card");
    await waitFor(() => {
      expect(within(cstrCard).getByLabelText(/Volume do reator/i)).toHaveValue(3);
    });
    fireEvent.click(within(cstrCard).getByText(/Adicionar componente/i));
    fireEvent.click(within(cstrCard).getByText(/Calcular CSTR/i));

    await expectCardValueMath(cstrCard, /^Volume$/i);
    expect(requestBodiesFor("/api/reactor/cstr")).toContainEqual({
      input_type: "volume_and_kinetics",
      volume: 3,
        components: [
          {
            state: "liquid",
            component_name: "Water",
            flow_rate_inlet: 1.2,
            molar_concentration_inlet: 5000,
          },
          {
            state: "liquid",
            component_name: "Ethanol",
          flow_rate_inlet: 0,
          molar_concentration_inlet: 0,
        },
      ],
      stoichiometric_coefficients: [-1, 1],
      reaction_rate_params: { k: 0.01, reaction_orders: [1, 0.5] },
      operation_conditions: {
        initial_temperature: 300,
        initial_pressure: 101325,
        final_temperature: 450,
        final_pressure: 101325,
      },
    });
  });

  it("allows negative stoichiometric coefficients on the PFR form", async () => {
    mockReactorRequests();
    renderReactorPage();

    expect(await screen.findByText(/Cálculos de Reator/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Carregar exemplo/i));
    selectReactorTab("PFR");

    const pfrCard = await screen.findByTestId("reactor-pfr-card");
    const stoichiometricCoefficient = within(pfrCard).getAllByLabelText(
      /Coef\. estequiométrico/i,
      { selector: "input" },
    )[0];

    fireEvent.change(stoichiometricCoefficient, { target: { value: "-2" } });
    fireEvent.blur(stoichiometricCoefficient);

    expect(stoichiometricCoefficient).toHaveValue(-2);
    expect(within(pfrCard).queryByRole("alert")).not.toBeInTheDocument();
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
