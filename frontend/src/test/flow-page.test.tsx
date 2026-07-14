import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";
import { abbreviateUnit } from "@/lib/units";
import type { ChartModel } from "@/types/chart-model";

const notifyMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  notify: notifyMock,
}));

const fetchMock = vi.fn<typeof fetch>();

const moodyChartResponse: ChartModel = {
  id: "moody-chart",
  title: "Diagrama de Moody",
  subtitle: "Curvas calculadas no backend",
  approximation_notice: "Payload bruto do backend.",
  axes: {
    x: {
      scale: "log",
      label: "Número de Reynolds",
      units: "dimensionless",
      domain: { min: 1000, max: 1_000_000 },
      ticks: [1000, 10000, 100000, 1000000],
      major_ticks: [1000, 10000, 100000, 1000000],
    },
    y: {
      scale: "linear",
      label: "Fator de atrito",
      units: "dimensionless",
      domain: { min: 0.01, max: 0.08 },
      ticks: [0.02, 0.04, 0.06, 0.08],
      major_ticks: [0.02, 0.04, 0.06, 0.08],
    },
  },
  series: [
    {
      id: "moody-band",
      name: "Faixa de referência",
      kind: "band",
      color: "#cbd5e1",
      points: [
        { x: 1000, y: 0.07 },
        { x: 10000, y: 0.05 },
        { x: 1000000, y: 0.03 },
      ],
    },
  ],
  markers: [
    { id: "operating-point", x: 50000, y: 0.0215, label: "Ponto operacional", color: "#dc2626" },
  ],
  annotations: [{ id: "backend-note", text: "Curva de rugosidade backend", tone: "info" }],
  metadata: {
    version: "1.0",
    units: {
      x: "dimensionless",
      y: "dimensionless",
    },
  },
};

const regimeVisualizationResponse = {
  title: "Regime do escoamento",
  description: "Escala linear de Reynolds de 100 a 10.000. O marcador mostra a posição atual.",
  domain: { min: 100, max: 10_000 },
  segments: [
    { regime: "laminar", label: "Laminar", color: "#2563EB", x: 40, width: 151.52 },
    { regime: "transition", label: "Transição", color: "#D97706", x: 191.52, width: 116.77 },
    { regime: "turbulent", label: "Turbulento", color: "#DC2626", x: 308.29, width: 411.71 },
  ],
  ticks: [
    { value: 100, label: "100", x: 40 },
    { value: 500, label: "500", x: 67.47 },
    { value: 1000, label: "1000", x: 101.82 },
    { value: 2300, label: "2300", x: 191.52 },
    { value: 4000, label: "4000", x: 308.29 },
    { value: 6000, label: "6000", x: 445.66 },
    { value: 8000, label: "8000", x: 583.03 },
    { value: 10000, label: "10000", x: 720 },
  ],
  marker: {
    x: 720,
    label: "Re = 50000",
    status: "acima da escala",
    regime: "turbulent",
    regime_label: "Turbulento",
    color: "#DC2626",
    text_anchor: "end",
  },
};

const hydraulicPreviewResponse = {
  title: "Canal circular",
  description: "Representação proporcional do canal circular com fluido.",
  summary: "Segmento circular preenchido, com D, h e R destacados.",
  view_box: "0 0 320 220",
  elements: [
    {
      type: "path",
      attrs: {
        d: "M 106.86 128.4 A 76 76 0 0 0 213.14 128.4 L 106.86 128.4 Z",
        fill: "#0F5E9C",
        stroke: "#0F172A",
        strokeWidth: "2.5",
        "data-preview-id": "backend-cap-fill",
      },
    },
    {
      type: "text",
      attrs: { x: 216.72, y: 39.28, fill: "#334155", fontSize: "12" },
      text: "R",
    },
  ],
  chips: [
    { label: "D", value: "0,1" },
    { label: "h", value: "0,03" },
    { label: "R", value: "0,05" },
  ],
};

function requestBodiesFor(pathSuffix: string, method = "POST") {
  return fetchMock.mock.calls
    .filter(([input, init]) => {
      const url = String(input);
      const requestMethod = init?.method ?? "GET";
      return url.endsWith(pathSuffix) && requestMethod === method;
    })
    .map(([, init]) => JSON.parse(String(init?.body ?? "{}")));
}

function getRowContaining(text: string | RegExp) {
  return screen
    .queryAllByText(text)
    .find((node) => node.closest("tr"))
    ?.closest("tr");
}

function expectTableUnitText(label: string | RegExp, expected: string) {
  const row = getRowContaining(label);
  const unitCell = row?.querySelector("td:last-child");
  const unitText =
    unitCell?.querySelector(".katex-html")?.textContent?.trim() ??
    unitCell?.textContent?.trim() ??
    "";
  const renderedExpected = expected === "dimensionless" ? "-" : abbreviateUnit(expected);

  expect(unitText).toBe(renderedExpected);
}

function expectFieldUnit(label: string, unit: string) {
  const matches = screen.queryAllByText((_, element) => {
    if (element?.tagName !== "LABEL") {
      return false;
    }

    const text = element.textContent ?? "";
    return text.includes(label) && text.includes(`(${unit})`);
  });

  expect(matches.length).toBeGreaterThan(0);
}

async function expectTableValueMath(label: string | RegExp, expected?: string) {
  await waitFor(() => {
    const row = getRowContaining(label);
    const valueCell = row?.querySelector("td:nth-child(2)");

    expect(valueCell?.querySelector(".katex")).not.toBeNull();

    if (expected) {
      expect(valueCell).toHaveTextContent(expected);
    }
  });
}

async function openFlowTab(name: string | RegExp) {
  fireEvent.click(screen.getByText(name, { selector: 'a[role="tab"]' }));
  await waitFor(() => {
    expect(screen.getByText(name, { selector: 'a[role="tab"]' })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
}

function mockFlowRequests(options?: {
  reynoldsError?: string;
  frictionError?: string;
  hydraulicError?: string;
  compositionError?: string;
  delayReynolds?: boolean;
}) {
  let resolveReynolds: ((response: Response) => void) | undefined;
  const exampleResponse = {
    reynolds: {
      characteristic_diameter: 13.843,
      velocity: 3.923,
      density: 0.65688,
      dynamic_viscosity: 0.0000111963,
    },
    friction: {
      method: "SwameeJain",
      roughness_source: "composition",
      composition: "Aço galvanizado",
      diameter_source: "custom",
      custom_diameter: 13.843,
    },
    hydraulic_diameter: {
      shape: "circularCap",
      diameter: 0.125,
      height: 0.08333,
    },
  } as const;

  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/flow/friction-factor/methods") && method === "GET") {
      return Response.json(["ColebrookWhite", "SwameeJain", "Haaland"]);
    }

    if (url.endsWith("/api/flow/example") && method === "GET") {
      return Response.json(exampleResponse);
    }

    if (url.endsWith("/api/flow/hydraulic-diameter/shapes") && method === "GET") {
      return Response.json(["circular", "rectangular", "annular", "triangular", "circularCap"]);
    }

    if (url.endsWith("/api/piping/compositions") && method === "GET") {
      return Response.json(["Aço comercial", "Aço galvanizado"]);
    }

    if (url.endsWith("/api/piping/schedules") && method === "GET") {
      return Response.json([{ name: "SCH40", diameters: [50], description: "Schedule padrão." }]);
    }

    if (
      url.endsWith("/api/piping/composition/A%C3%A7o%20comercial") &&
      method === "GET"
    ) {
      if (options?.compositionError) {
        return new Response(JSON.stringify({ detail: options.compositionError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        name: "Aço comercial",
        description: "Tubulação de aço carbono padrão.",
        applications: "Transporte industrial.",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
        },
      });
    }

    if (
      url.endsWith("/api/piping/composition/A%C3%A7o%20galvanizado") &&
      method === "GET"
    ) {
      return Response.json({
        name: "Aço galvanizado",
        description: "Tubulação galvanizada.",
        applications: "Instalações hidráulicas.",
        specifications: {
          roughness: { value: 0.15, units: "millimeter" },
        },
      });
    }

    if (url.endsWith("/api/piping/schedule/SCH40/diameters") && method === "GET") {
      return Response.json({
        50: { nominal_diameter: 50, external_diameter: 60.3, units: "mm" },
      });
    }

    if (url.endsWith("/api/flow/reynolds") && method === "POST") {
      if (options?.delayReynolds) {
        return new Promise<Response>((resolve) => {
          resolveReynolds = resolve;
        });
      }

      if (options?.reynoldsError) {
        return new Response(JSON.stringify({ detail: options.reynoldsError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return Response.json({ value: 50000, units: "dimensionless" });
    }

    if (url.endsWith("/api/flow/reynolds/regime-visualization") && method === "POST") {
      return Response.json(regimeVisualizationResponse);
    }

    if (url.endsWith("/api/flow/friction-factor") && method === "POST") {
      if (options?.frictionError) {
        return new Response(JSON.stringify({ detail: options.frictionError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return Response.json({ value: 0.0215, units: "dimensionless" });
    }

    if (url.endsWith("/api/flow/moody/chart") && method === "POST") {
      return Response.json(moodyChartResponse);
    }

    if (url.endsWith("/api/flow/hydraulic-diameter") && method === "POST") {
      if (options?.hydraulicError) {
        return new Response(JSON.stringify({ detail: options.hydraulicError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return Response.json({ value: 0.06667, units: "meter" });
    }

    if (url.endsWith("/api/flow/hydraulic-diameter/preview") && method === "POST") {
      return Response.json(hydraulicPreviewResponse);
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveReynolds(response: Response) {
      resolveReynolds?.(response);
    },
  };
}

function renderFlowPage() {
  const router = createMemoryRouter(routes, { initialEntries: ["/flow"] });
  render(<RouterProvider router={router} />);
}

describe("FlowPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    notifyMock.success.mockReset();
    notifyMock.error.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the worked example and auto-calculates derived results across the flow tabs", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Como funciona - Número de Reynolds/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/flow/example",
        expect.objectContaining({ method: "GET" }),
      );
      expect(notifyMock.success).toHaveBeenCalledWith("Exemplo carregado com sucesso.");
      expect(screen.getByLabelText(/Diâmetro característico/i)).toHaveValue(13.843);
      expect(screen.getByLabelText(/Velocidade média/i)).toHaveValue(3.923);
      expect(screen.getByLabelText(/Massa específica/i)).toHaveValue(0.65688);
      expect(screen.getByLabelText(/Viscosidade dinâmica/i)).toHaveValue(0.0000111963);
    });

    await expectTableValueMath(/^Número de Reynolds$/i);
    await waitFor(() => {
      expect(requestBodiesFor("/api/flow/reynolds")).toContainEqual({
        characteristic_diameter: 13.843,
        velocity: 3.923,
        density: 0.65688,
        dynamic_viscosity: 0.0000111963,
      });
      expect(requestBodiesFor("/api/flow/reynolds/regime-visualization")).toContainEqual({
        reynolds: 50000,
      });
    });
    expect(screen.getByText(/acima da escala/i)).toBeInTheDocument();

    await openFlowTab(/Fator de Atrito/i);
    await expectTableValueMath(/^Fator de atrito$/i);
    expect(screen.getByLabelText(/Método de cálculo/i)).toHaveValue("SwameeJain");
    expect(screen.getByLabelText(/Usar material da tubulação/i)).toBeChecked();
    expect(screen.getByRole("combobox", { name: /^Material da tubulação$/i })).toHaveValue(
      "Aço galvanizado",
    );
    expect(screen.queryByLabelText(/Rugosidade/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Diâmetro da tubulação/i)).toHaveValue(13.843);
    await waitFor(() => {
      expect(requestBodiesFor("/api/flow/friction-factor")).toContainEqual({
        roughness: 0.15,
        diameter: 13.843,
        reynolds: 50000,
        method: "SwameeJain",
      });
      expect(requestBodiesFor("/api/flow/moody/chart")).toContainEqual({
        roughness: 0.15,
        diameter: 13.843,
        reynolds: 50000,
        method: "SwameeJain",
        friction_factor: 0.0215,
      });
    });
    expect(
      await screen.findByText((_, element) => {
        return (
          element?.tagName === "BUTTON" &&
          (element.textContent ?? "").includes("Como funciona - Ponto operacional no Diagrama de Moody")
        );
      }),
    ).toBeInTheDocument();

    await openFlowTab(/Diâmetro Hidráulico/i);
    await expectTableValueMath(/^Diâmetro hidráulico$/i);
    expect(screen.getByRole("combobox", { name: /Forma geométrica/i })).toHaveValue("Canal circular");
    expect(screen.getByDisplayValue("0.125")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0.08333")).toBeInTheDocument();
    await waitFor(() => {
      expect(requestBodiesFor("/api/flow/hydraulic-diameter/preview")).toContainEqual({
        shape: "circularCap",
        diameter: 0.125,
        height: 0.08333,
      });
    });
    expect(screen.getByText(/D = 0,1/i)).toBeInTheDocument();
    expect(screen.getByText(/h = 0,03/i)).toBeInTheDocument();
  });

  it("hides stale Reynolds and friction outputs after dependent input edits", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Como funciona - Número de Reynolds/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Massa específica/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Viscosidade dinâmica/i), {
      target: { value: "0.001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Reynolds/i }));

    await expectTableValueMath(/^Número de Reynolds$/i);
    expectTableUnitText(/^Número de Reynolds$/i, "dimensionless");
    await waitFor(() => {
      expect(requestBodiesFor("/api/flow/reynolds/regime-visualization")).toContainEqual({
        reynolds: 50000,
      });
    });
    expect(screen.getByText(/acima da escala/i)).toBeInTheDocument();

    await openFlowTab(/Fator de Atrito/i);
    fireEvent.change(screen.getByLabelText(/Rugosidade/i), {
      target: { value: "0.045" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro da tubulação/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular fator de atrito/i }));

    await expectTableValueMath(/^Fator de atrito$/i);
    expectTableUnitText(/^Fator de atrito$/i, "dimensionless");
    expect(
      await screen.findByRole("button", { name: /Como funciona - Ponto operacional no Diagrama de Moody/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("chart-series-legend")).toBeInTheDocument();

    await openFlowTab(/Número de Reynolds/i);
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.8" },
    });

    const reynoldsRow = getRowContaining(/^Número de Reynolds$/i);
    await openFlowTab(/Fator de Atrito/i);
    const frictionRow = getRowContaining(/^Fator de atrito$/i);
    expect(reynoldsRow).toBeDefined();
    expect(frictionRow).toBeDefined();
    expect(reynoldsRow?.querySelector("td:nth-child(2)")?.textContent ?? "").toContain("—");
    expect(frictionRow?.querySelector("td:nth-child(2)")?.textContent ?? "").toContain("—");
    expect(screen.queryByText(/Regime do escoamento/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Como funciona - Ponto operacional no Diagrama de Moody/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Número de Reynolds/i)).toHaveValue(null);
  });

  it("ignores delayed Reynolds responses after the user edits the form", async () => {
    const flowRequests = mockFlowRequests({ delayReynolds: true });
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Como funciona - Número de Reynolds/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Massa específica/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Viscosidade dinâmica/i), {
      target: { value: "0.001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Reynolds/i }));
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.8" },
    });

    flowRequests.resolveReynolds(Response.json({ value: 50000, units: "dimensionless" }));

    await waitFor(() => {
      const reynoldsRow = getRowContaining(/^Número de Reynolds$/i);
      expect(reynoldsRow).toBeDefined();
      expect(reynoldsRow?.querySelector("td:nth-child(2)")?.textContent ?? "").toContain("—");
      expect(screen.queryByText(/Regime do escoamento/i)).not.toBeInTheDocument();
    });
  });

  it("clears stale hydraulic result after geometry edits", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Fator de Atrito/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Fator de Atrito/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Diâmetro Hidráulico/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Diâmetro Hidráulico/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "rectangular" },
    });
    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Altura/i), {
      target: { value: "0.05" },
    });
    expect(screen.getByRole("heading", { name: /Pré-visualização geométrica/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(requestBodiesFor("/api/flow/hydraulic-diameter/preview")).toContainEqual({
        shape: "rectangular",
        width: 0.1,
        height: 0.05,
      });
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    await expectTableValueMath(/^Diâmetro hidráulico$/i);
    expectTableUnitText(/^Diâmetro hidráulico$/i, "meter");

    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "0.12" },
    });

    const hydraulicRow = getRowContaining(/^Diâmetro hidráulico$/i);
    expect(hydraulicRow).toBeDefined();
    expect(hydraulicRow?.querySelector("td:nth-child(2)")?.textContent ?? "").toContain("—");
  });

  it("blocks Reynolds submission when diameter or velocity is missing", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Como funciona - Número de Reynolds/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Massa específica/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Viscosidade dinâmica/i), {
      target: { value: "0.001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Reynolds/i }));

    expect(
      await screen.findByText(/informe o diâmetro característico e a velocidade/i),
    ).toBeInTheDocument();
    expect(requestBodiesFor("/api/flow/reynolds")).toHaveLength(0);
  });

  it("blocks friction factor submission when schedule diameter is incomplete", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Fator de Atrito/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Fator de Atrito/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Número de Reynolds/i), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.change(screen.getByLabelText(/Rugosidade/i), {
      target: { value: "0.045" },
    });
    fireEvent.click(screen.getByLabelText(/Usar schedule/i));
    fireEvent.change(screen.getByLabelText(/^Schedule$/i), {
      target: { value: "SCH40" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular fator de atrito/i }));

    expect(await screen.findByText(/selecione schedule e diâmetro/i)).toBeInTheDocument();
    expect(requestBodiesFor("/api/flow/friction-factor")).toHaveLength(0);
  });

  it("blocks hydraulic diameter submission when shape parameters are incomplete", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Diâmetro Hidráulico/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Diâmetro Hidráulico/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "rectangular" },
    });
    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "0.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    expect(
      await screen.findByText(/preencha todos os parâmetros da forma selecionada/i),
    ).toBeInTheDocument();
    expect(requestBodiesFor("/api/flow/hydraulic-diameter")).toHaveLength(0);
  });

  it("shows an error notification when Reynolds calculation fails", async () => {
    mockFlowRequests({ reynoldsError: "Falha no backend de Reynolds" });
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Como funciona - Número de Reynolds/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Massa específica/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Viscosidade dinâmica/i), {
      target: { value: "0.001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Reynolds/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular Reynolds: Falha no backend de Reynolds",
      );
    });
  });

  it("shows an error notification when friction factor calculation fails", async () => {
    mockFlowRequests({ frictionError: "Falha no backend de atrito" });
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Fator de Atrito/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Fator de Atrito/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Número de Reynolds/i), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText(/Rugosidade/i), {
      target: { value: "0.045" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro da tubulação/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular fator de atrito/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular fator de atrito: Falha no backend de atrito",
      );
    });
  });

  it("shows a dedicated error notification when composition roughness lookup fails", async () => {
    mockFlowRequests({ compositionError: "Falha no backend da composição" });
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Fator de Atrito/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Fator de Atrito/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Número de Reynolds/i), {
      target: { value: "50000" },
    });
    fireEvent.click(screen.getByLabelText(/Usar material da tubulação/i));
    fireEvent.change(screen.getByRole("combobox", { name: /^Material da tubulação$/i }), {
      target: { value: "Aço comercial" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro da tubulação/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular fator de atrito/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao carregar material: Não foi possível obter a rugosidade da composição",
      );
    });
    expect(requestBodiesFor("/api/flow/friction-factor")).toHaveLength(0);
  });

  it("shows an error notification when hydraulic diameter calculation fails", async () => {
    mockFlowRequests({ hydraulicError: "Falha no backend hidráulico" });
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Diâmetro Hidráulico/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Diâmetro Hidráulico/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "rectangular" },
    });
    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Altura/i), {
      target: { value: "0.05" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular diâmetro hidráulico: Falha no backend hidráulico",
      );
    });
  });

  it("renders the backend Moody chart from direct Reynolds input in the friction form", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Fator de Atrito/i);

    fireEvent.change(screen.getByLabelText(/Número de Reynolds/i), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText(/Rugosidade/i), {
      target: { value: "0.045" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro da tubulação/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular fator de atrito/i }));

    await expectTableValueMath(/^Fator de atrito$/i);
    expect(requestBodiesFor("/api/flow/moody/chart")).toContainEqual({
      roughness: 0.045,
      diameter: 50,
      reynolds: 50000,
      method: "SwameeJain",
      friction_factor: 0.0215,
    });
    expect(screen.getByText(/Legenda das curvas/i)).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Como funciona - Ponto operacional no Diagrama de Moody/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("chart-series-legend")).toBeInTheDocument();
  });

  it("calculates Reynolds, friction factor, and hydraulic diameter", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /^Escoamento Interno$/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Massa específica/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Viscosidade dinâmica/i), {
      target: { value: "0.001" },
    });
    fireEvent.click(screen.getByText(/Calcular Reynolds/i, { selector: "button" }));

    await expectTableValueMath(/^Número de Reynolds$/i);
    expectTableUnitText(/^Número de Reynolds$/i, "dimensionless");
    await waitFor(() => {
      expect(screen.getAllByText(/^Turbulento$/i).length).toBeGreaterThan(0);
    });
    expect(requestBodiesFor("/api/flow/reynolds/regime-visualization")).toContainEqual({
      reynolds: 50000,
    });

    await openFlowTab(/Fator de Atrito/i);
    fireEvent.click(screen.getByLabelText(/Usar material da tubulação/i));
    fireEvent.change(screen.getByRole("combobox", { name: /^Material da tubulação$/i }), {
      target: { value: "Aço comercial" },
    });
    fireEvent.click(screen.getByLabelText(/Usar schedule/i));
    fireEvent.change(screen.getByLabelText(/^Schedule$/i), {
      target: { value: "SCH40" },
    });
    fireEvent.focus(screen.getByLabelText(/Diâmetro da tubulação/i));
    expect(await screen.findByText(/50 mm/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Diâmetro da tubulação/i), {
      target: { value: "60.3" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.click(screen.getByText(/Calcular fator de atrito/i, { selector: "button" }));

    await expectTableValueMath(/^Fator de atrito$/i);
    expectTableUnitText(/^Fator de atrito$/i, "dimensionless");
    expect(requestBodiesFor("/api/flow/friction-factor")).toContainEqual(
      expect.objectContaining({
        diameter: 60.3,
        method: "SwameeJain",
        reynolds: 50000,
        roughness: 0.045,
      }),
    );
    expect(requestBodiesFor("/api/flow/moody/chart")).toContainEqual(
      expect.objectContaining({
        diameter: 60.3,
        method: "SwameeJain",
        reynolds: 50000,
        roughness: 0.045,
        friction_factor: 0.0215,
      }),
    );
    expect(screen.getByText(/Legenda das curvas/i)).toBeInTheDocument();
    expect(
      await screen.findByText((_, element) => {
        return (
          element?.tagName === "BUTTON" &&
          (element.textContent ?? "").includes("Como funciona - Ponto operacional no Diagrama de Moody")
        );
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("chart-series-legend")).toBeInTheDocument();
    expect(screen.queryByText(/e\/D = 0.0009/i)).not.toBeInTheDocument();

    await openFlowTab(/Diâmetro Hidráulico/i);
    fireEvent.focus(screen.getByLabelText(/Forma geométrica/i));
    expect(await screen.findByText(/Triangular/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "rectangular" },
    });
    expectFieldUnit("Largura", "m");
    expectFieldUnit("Altura", "m");
    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Altura/i), {
      target: { value: "0.05" },
    });
    await waitFor(() => {
      expect(requestBodiesFor("/api/flow/hydraulic-diameter/preview")).toContainEqual({
        shape: "rectangular",
        width: 0.1,
        height: 0.05,
      });
    });
    fireEvent.click(screen.getByText(/Calcular diâmetro hidráulico/i, { selector: "button" }));

    await expectTableValueMath(/^Diâmetro hidráulico$/i);
    expectTableUnitText(/^Diâmetro hidráulico$/i, "meter");
  });

  it("supports triangular geometry in the hydraulic diameter form", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Diâmetro Hidráulico/i);

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "triangular" },
    });
    expectFieldUnit("Lado A", "m");
    expectFieldUnit("Lado B", "m");
    expectFieldUnit("Lado C", "m");
    fireEvent.change(screen.getByLabelText(/Lado A/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Lado B/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Lado C/i), {
      target: { value: "0.1" },
    });
    expect(screen.getByRole("heading", { name: /Pré-visualização geométrica/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(requestBodiesFor("/api/flow/hydraulic-diameter/preview")).toContainEqual({
        shape: "triangular",
        side_a: 0.1,
        side_b: 0.1,
        side_c: 0.1,
      });
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    await expectTableValueMath(/^Diâmetro hidráulico$/i);
    expectTableUnitText(/^Diâmetro hidráulico$/i, "meter");
    expect(requestBodiesFor("/api/flow/hydraulic-diameter")).toContainEqual({
      shape: "triangular",
      side_a: 0.1,
      side_b: 0.1,
      side_c: 0.1,
    });
  });

  it("supports circular cap geometry in the hydraulic diameter form", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Diâmetro Hidráulico/i);

    fireEvent.focus(screen.getByRole("combobox", { name: /Forma geométrica/i }));
    expect(await screen.findByRole("option", { name: /Canal circular/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "circularCap" },
    });
    expectFieldUnit("Diâmetro", "m");
    expectFieldUnit("Altura", "m");
    fireEvent.change(screen.getByLabelText(/Diâmetro/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Altura/i), {
      target: { value: "0.03" },
    });
    expect(screen.getByRole("heading", { name: /Pré-visualização geométrica/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(requestBodiesFor("/api/flow/hydraulic-diameter/preview")).toContainEqual({
        shape: "circularCap",
        diameter: 0.1,
        height: 0.03,
      });
    });
    expect(screen.getByText(/D = 0,1/i)).toBeInTheDocument();
    expect(screen.getByText(/h = 0,03/i)).toBeInTheDocument();

    const previewSvg = screen.getByRole("img", { name: /Canal circular/i });
    const filledPath = previewSvg.querySelector('path[data-preview-id="backend-cap-fill"]');
    expect(filledPath).not.toBeNull();
    expect(filledPath?.getAttribute("d")).toBe(
      "M 106.86 128.4 A 76 76 0 0 0 213.14 128.4 L 106.86 128.4 Z",
    );

    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    await expectTableValueMath(/^Diâmetro hidráulico$/i);
    expectTableUnitText(/^Diâmetro hidráulico$/i, "meter");
    expect(requestBodiesFor("/api/flow/hydraulic-diameter")).toContainEqual({
      shape: "circularCap",
      diameter: 0.1,
      height: 0.03,
    });
  });

  it("blocks annular geometry when the inner diameter is not smaller than the outer diameter", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Diâmetro Hidráulico/i);

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "annular" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro externo/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "0.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    expect(
      await screen.findByText(/diâmetro interno deve ser menor que o externo/i),
    ).toBeInTheDocument();
    expect(requestBodiesFor("/api/flow/hydraulic-diameter")).toHaveLength(0);
  });

  it("blocks triangular geometry when the sides do not satisfy the triangle inequality", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Diâmetro Hidráulico/i);

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "triangular" },
    });
    fireEvent.change(screen.getByLabelText(/Lado A/i), {
      target: { value: "0.2" },
    });
    fireEvent.change(screen.getByLabelText(/Lado B/i), {
      target: { value: "0.3" },
    });
    fireEvent.change(screen.getByLabelText(/Lado C/i), {
      target: { value: "0.6" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    expect(
      await screen.findByText(/não formam um triângulo válido/i),
    ).toBeInTheDocument();
    expect(requestBodiesFor("/api/flow/hydraulic-diameter")).toHaveLength(0);
  });

  it("blocks circular cap geometry when the height exceeds the diameter", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();
    await openFlowTab(/Diâmetro Hidráulico/i);

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "circularCap" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Altura/i), {
      target: { value: "0.12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    expect(await screen.findByText(/altura não pode ser maior que o diâmetro/i)).toBeInTheDocument();
    expect(requestBodiesFor("/api/flow/hydraulic-diameter")).toHaveLength(0);
  });
});
