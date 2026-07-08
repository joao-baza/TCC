import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";
import type { ChartModel } from "@/types/chart-model";

const notifyMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  notify: notifyMock,
}));

const fetchMock = vi.fn<typeof fetch>();

const headlossChartModel: ChartModel = {
  id: "pump-headloss-chart",
  title: "Perda de Carga × Vazão",
  subtitle: "Curva do sistema ",
  axes: {
    x: {
      scale: "linear",
      label: "Vazão",
      units: "m³/s",
      domain: { min: 0, max: 0.01 },
      ticks: [0, 0.005, 0.01],
      major_ticks: [0, 0.005, 0.01],
    },
    y: {
      scale: "linear",
      label: "Perda de carga",
      units: "m",
      domain: { min: 0, max: 10 },
      ticks: [0, 5, 10],
      major_ticks: [0, 5, 10],
    },
  },
  series: [
    {
      id: "system-curve",
      name: "Curva do sistema",
      kind: "line",
      color: "#2563eb",
      points: [
        { x: 0, y: 0 },
        { x: 0.005, y: 4.25 },
        { x: 0.01, y: 8.6 },
      ],
    },
  ],
  markers: [
    {
      id: "operating-point",
      x: 0.005,
      y: 4.25,
      label: "Ponto operacional",
      color: "#dc2626",
    },
  ],
  metadata: { version: "1.0" },
};

const efficiencyMapModel = {
  id: "pump-efficiency-map",
  title: "Eficiência e BEP",
  subtitle: "Mapa didático resolvido no backend",
  approximation_notice: "BEP, malha relativa de eficiência e cavitação aproximada calculados no backend.",
  x_axis: {
    scale: "linear",
    label: "Vazão volumétrica (Q)",
    units: "m³/s",
    domain: { min: 0, max: 0.011 },
    ticks: [0, 0.0055, 0.011],
    major_ticks: [0, 0.0055, 0.011],
  },
  y_axis: {
    scale: "linear",
    label: "Altura manométrica (H)",
    units: "m",
    domain: { min: 0, max: 9.5 },
    ticks: [0, 4.75, 9.5],
    major_ticks: [0, 4.75, 9.5],
  },
  cells: Array.from({ length: 70 }, (_, index) => ({
    x: (index % 10) * 0.0011,
    y: Math.floor(index / 10) * 1.357,
    width: 0.0011,
    height: 1.357,
    efficiency: 0.5,
    fill: "hsl(180 60% 50%)",
    tooltip: "Eficiência relativa ≈ 50%",
  })),
  system_curve: [
    { x: 0, y: 0 },
    { x: 0.005, y: 4.25 },
    { x: 0.01, y: 8.6 },
  ],
  cavitation_band: [
    { x: 0, y: 0 },
    { x: 0.0037, y: 0 },
    { x: 0.0037, y: 2.85 },
    { x: 0, y: 2.85 },
  ],
  markers: [
    { id: "best-efficiency-point", x: 0.005, y: 4.25, label: "BEP", color: "#16a34a" },
    { id: "operating-point", x: 0.005, y: 4.25, label: "Operação", color: "#dc2626" },
  ],
} as const;

const npshGaugeModel = {
  id: "pump-npsh-gauge",
  title: "Margem de NPSH",
  available: { value: 6.8, units: "meter" },
  required: { value: 3, units: "meter" },
  safe_threshold: { value: 3.5, units: "meter" },
  status: {
    tone: "safe",
    label: "Margem segura (NPSHd ≥ NPSHr + 0,5 m) ✓",
    message: "Margem segura para evitar cavitação.",
  },
  axis: {
    scale: "linear",
    label: "NPSH",
    units: "m",
    domain: { min: 0, max: 6.8 },
    ticks: [0, 1.7, 3.4, 5.1, 6.8],
    major_ticks: [0, 1.7, 3.4, 5.1, 6.8],
  },
  markers: [
    { id: "available", x: 6.8, y: 0, label: "NPSHd", color: "#1d4ed8" },
    { id: "required", x: 3, y: 0, label: "NPSHr", color: "#b45309" },
    { id: "safe-threshold", x: 3.5, y: 0, label: "Margem segura", color: "#16a34a" },
  ],
} as const;

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
    .queryAllByText(text, { selector: "td:first-child" })
    .find((node) => node.closest("tr"))
    ?.closest("tr");
}

function getVisibleTextInputs(label: string | RegExp) {
  return screen
    .getAllByLabelText(label)
    .filter(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement && element.type === "text",
    );
}

async function openPumpTab(name: string | RegExp) {
  fireEvent.click(screen.getByRole("tab", { name }));
  await waitFor(() => {
    expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  });
}

function mockPumpRequests(options?: {
  headlossError?: string;
  frictionFactorError?: string;
  npshError?: string;
  npshGaugeError?: string;
  headError?: string;
  delayHeadloss?: boolean;
}) {
  let resolveHeadloss: ((response: Response) => void) | undefined;
  let rejectHeadloss: ((reason?: unknown) => void) | undefined;

  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/pump/headloss/methods") && method === "GET") {
      return Response.json(["Darcy-Weisbach", "Hazen-Williams"]);
    }

    if (url.endsWith("/api/pump/example") && method === "GET") {
      return Response.json({
        headloss: {
          method: "Darcy-Weisbach",
          pipe_length: 100,
          diameter: 125,
          flow_rate: 0.04,
          velocity: 3.259493234522017,
          reynolds: 3186.1046722863807,
          friction_factor: 0.04495094389484752,
          friction_method: "SwameeJain",
          composition: "Aço galvanizado",
          fittings: [
            { fitting: "Cotovelo 45°", quantity: 5 },
            { fitting: "Saída de tanque", quantity: 1 },
            { fitting: "Válvula esfera", quantity: 2 },
          ],
        },
        npsh: {
          manometric_pressure: 0,
          atmospheric_pressure: 1.033,
          vapor_pressure: 0.023,
          density: 1000,
          friction_factor: 10,
          pump_inlet_velocity: 1.5,
          gauge_elevation: 3,
          required: 3,
        },
        head: {
          pressure1: 101325,
          pressure2: 101325,
          elevation1: 0,
          elevation2: 5,
          velocity1: 0,
          velocity2: 3,
          density: 1000,
          friction_factor: 2.55887,
        },
      });
    }

    if (url.endsWith("/api/piping/fittings") && method === "GET") {
      return Response.json([
        "Cotovelo 90° raio longo",
        "Válvula gaveta",
        "Cotovelo 45°",
        "Saída de tanque",
        "Válvula esfera",
      ]);
    }

    if (
      url.endsWith("/api/piping/fitting/V%C3%A1lvula%20de%20esfera") &&
      method === "GET"
    ) {
      return Response.json({
        name: "Válvula esfera",
        description: "Válvula com esfera pivotante.",
        usage: "Fechamento rápido com baixa perda de carga.",
        specifications: {
          equivalentLength: { value: 3, units: "dimensionless" },
        },
      });
    }

    if (url.endsWith("/api/piping/compositions") && method === "GET") {
      return Response.json(["Aço comercial", "Aço galvanizado", "PVC", "Madeira"]);
    }

    if (url.endsWith("/api/piping/composition/A%C3%A7o%20galvanizado") && method === "GET") {
      return Response.json({
        name: "Aço galvanizado",
        specifications: {
          roughness: { value: 0.16, units: "millimeter" },
          roughness_coefficient: { value: 120, units: "dimensionless" },
        },
      });
    }

    if (url.endsWith("/api/flow/friction-factor/methods") && method === "GET") {
      return Response.json(["ColebrookWhite", "SwameeJain"]);
    }

    if (
      url.endsWith("/api/piping/composition/A%C3%A7o%20comercial") &&
      method === "GET"
    ) {
      return Response.json({
        name: "Aço comercial",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
          roughness_coefficient: { value: 130, units: "dimensionless" },
        },
      });
    }

    if (url.endsWith("/api/piping/composition/PVC") && method === "GET") {
      return Response.json({
        name: "PVC",
        specifications: {
          roughness: { value: 0.0015, units: "millimeter" },
          roughness_coefficient: { value: 140, units: "dimensionless" },
        },
      });
    }

    if (url.endsWith("/api/piping/composition/Madeira") && method === "GET") {
      return Response.json({
        name: "Madeira",
        specifications: {
          roughness: { value: 0.12, units: "millimeter" },
        },
      });
    }

    if (url.endsWith("/api/flow/friction-factor") && method === "POST") {
      if (options?.frictionFactorError) {
        return new Response(JSON.stringify({ detail: options.frictionFactorError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({ value: 0.0215, units: "dimensionless" });
    }

    if (url.endsWith("/api/pump/headloss") && method === "POST") {
      if (options?.delayHeadloss) {
        return new Promise<Response>((resolve, reject) => {
          resolveHeadloss = resolve;
          rejectHeadloss = reject;
        });
      }

      if (options?.headlossError) {
        return new Response(JSON.stringify({ detail: options.headlossError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return Response.json({ value: 4.25, units: "meter" });
    }

    if (url.endsWith("/api/pump/headloss/chart") && method === "POST") {
      return Response.json(headlossChartModel);
    }

    if (url.endsWith("/api/pump/efficiency-map/chart") && method === "POST") {
      return Response.json(efficiencyMapModel);
    }

    if (url.endsWith("/api/pump/npsh-available") && method === "POST") {
      if (options?.npshError) {
        return new Response(JSON.stringify({ detail: options.npshError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return Response.json({
        head_loss: { value: 6.8, units: "meter" },
      });
    }

    if (url.endsWith("/api/pump/npsh-gauge/chart") && method === "POST") {
      if (options?.npshGaugeError) {
        return new Response(JSON.stringify({ detail: options.npshGaugeError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return Response.json(npshGaugeModel);
    }

    if (url.endsWith("/api/pump/head") && method === "POST") {
      if (options?.headError) {
        return new Response(JSON.stringify({ detail: options.headError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return Response.json({ value: 18.2, units: "meter" });
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveHeadloss(response: Response) {
      resolveHeadloss?.(response);
    },
    rejectHeadloss(reason?: unknown) {
      rejectHeadloss?.(reason);
    },
  };
}

function renderPumpPage() {
  const router = createMemoryRouter(routes, { initialEntries: ["/pump"] });
  render(<RouterProvider router={router} />);
}

describe("PumpPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    notifyMock.success.mockReset();
    notifyMock.error.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the didactic accordion titles for headloss, NPSH, and head", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(await screen.findByText(/Como funciona - Perda de Carga/i)).toBeInTheDocument();

    await openPumpTab(/NPSH Disponível/i);
    expect(await screen.findByText(/Como funciona - NPSH Disponivel/i)).toBeInTheDocument();

    await openPumpTab(/Altura Manométrica/i);
    expect(
      await screen.findByText(/Como funciona - Altura Manometrica/i),
    ).toBeInTheDocument();
  });

  it("does not expose a pressure profile tab in the pump module", async () => {
    mockPumpRequests();
    renderPumpPage();

    await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i });

    expect(document.querySelector('a[href="/pump/pressure-profile"]')).toBeNull();
  });

  it("loads the pump worked example and auto-calculates all derived tabs", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    await waitFor(() => {
      expect(notifyMock.success).toHaveBeenCalledWith("Exemplo carregado com sucesso.");
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Comprimento da linha/i)).toHaveValue(100);
      expect(screen.getByLabelText(/Diâmetro interno/i)).toHaveValue(125);
      expect(document.getElementById("headloss-flow-rate")).toHaveValue(0.04);
      expect(screen.getByLabelText(/Velocidade na linha/i)).toHaveValue(3.259493234522017);
      expect(screen.getByLabelText(/Número de Reynolds/i)).toHaveValue(3186.1046722863807);
      expect(screen.getByLabelText(/Material da tubulação/i)).toHaveValue("Aço galvanizado");
      expect(getVisibleTextInputs(/Conexão/i)).toHaveLength(3);
      expect(getVisibleTextInputs(/Conexão/i)[0]).toHaveValue("Cotovelo 45°");
      expect(getVisibleTextInputs(/Conexão/i)[1]).toHaveValue("Saída de tanque");
      expect(getVisibleTextInputs(/Conexão/i)[2]).toHaveValue("Válvula esfera");
    });

    fireEvent.click(screen.getByLabelText(/Usar fator informado/i));
    await waitFor(() => {
      expect(screen.getByLabelText(/Fator de atrito/i)).toHaveValue(0.04495094389484752);
    });

    await waitFor(() => {
      expect(requestBodiesFor("/api/pump/headloss")).toContainEqual({
        pipe_length: 100,
        diameter: 125,
        flow_rate: 0.04,
        velocity: 3.259493234522017,
        method: "Darcy-Weisbach",
        friction_factor: 0.0215,
        fittings: [
          { fitting: "Cotovelo 45°", quantity: 5 },
          { fitting: "Saída de tanque", quantity: 1 },
          { fitting: "Válvula esfera", quantity: 2 },
        ],
      });
      expect(requestBodiesFor("/api/pump/headloss/chart")).toHaveLength(1);
      expect(requestBodiesFor("/api/pump/efficiency-map/chart")).toHaveLength(1);
      expect(requestBodiesFor("/api/pump/npsh-available")).toContainEqual({
        manometric_pressure: 0,
        atmospheric_pressure: 1.033,
        vapor_pressure: 0.023,
        density: 1000,
        friction_factor: 10,
        pump_inlet_velocity: 1.5,
        gauge_elevation: 3,
        required: 3,
      });
      expect(requestBodiesFor("/api/pump/npsh-gauge/chart")).toHaveLength(1);
      expect(requestBodiesFor("/api/pump/head")).toContainEqual({
        pressure1: 101325,
        pressure2: 101325,
        elevation1: 0,
        elevation2: 5,
        velocity1: 0,
        velocity2: 3,
        density: 1000,
        friction_factor: 2.55887,
      });
    });

    await waitFor(() => {
      expect(getRowContaining(/^Perda de carga$/i)).toBeTruthy();
    });

    await openPumpTab(/NPSH Disponível/i);
    await waitFor(() => {
      expect(screen.getByLabelText(/Pressão atmosférica/i)).toHaveValue(1.033);
      expect(screen.getByLabelText(/NPSHr opcional/i)).toHaveValue(3);
      expect(screen.getByRole("heading", { name: /^Margem de NPSH$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /How it works - Margem de NPSH/i })).toBeInTheDocument();
    });

    await openPumpTab(/Altura Manométrica/i);
    await waitFor(() => {
      expect(screen.getByLabelText(/Pressão 1/i)).toHaveValue(101325);
      expect(screen.getByLabelText(/Perda de carga total/i)).toHaveValue(4.25);
      expect(getRowContaining(/^Altura manométrica$/i)).toBeTruthy();
    });
  });

  it("surfaces an error when the friction-factor lookup fails during headloss calculation", async () => {
    mockPumpRequests({ frictionFactorError: "Falha no backend do fator de atrito" });
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    fireEvent.click(screen.getByLabelText(/Usar material/i));
    fireEvent.change(screen.getByLabelText(/Material da tubulação/i), {
      target: { value: "Aço comercial" },
    });
    fireEvent.change(screen.getByLabelText(/Método de perda de carga/i), {
      target: { value: "Darcy-Weisbach" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular perda de carga: Falha no backend do fator de atrito",
      );
    });
  });

  it("clears the headloss output when the calculation method changes", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Método de perda de carga/i), {
      target: { value: "Darcy-Weisbach" },
    });
    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.005" },
    });
    fireEvent.change(screen.getByLabelText(/Fator de atrito/i), {
      target: { value: "0.02" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(requestBodiesFor("/api/pump/headloss")).toContainEqual({
        pipe_length: 25,
        diameter: 50,
        flow_rate: 0.005,
        velocity: expect.any(Number),
        method: "Darcy-Weisbach",
        friction_factor: 0.02,
      });
    });

    fireEvent.change(screen.getByLabelText(/Método de perda de carga/i), {
      target: { value: "Hazen-Williams" },
    });

    expect(screen.queryByLabelText(/Fator de atrito/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Coeficiente de rugosidade/i)).toBeInTheDocument();
  });

  it("calculates head loss, NPSH available, and pump head while rendering the pump visuals", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Método de perda de carga/i), {
      target: { value: "Darcy-Weisbach" },
    });
    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.005" },
    });
    fireEvent.change(screen.getByLabelText(/Fator de atrito/i), {
      target: { value: "0.02" },
    });
    fireEvent.change(screen.getAllByLabelText(/Conexão/i)[0], {
      target: { value: "Cotovelo 90° raio longo" },
    });
    fireEvent.change(screen.getAllByLabelText(/Quantidade/i)[0], {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(requestBodiesFor("/api/pump/headloss")).toContainEqual({
        pipe_length: 25,
        diameter: 50,
        flow_rate: 0.005,
        velocity: expect.any(Number),
        method: "Darcy-Weisbach",
        friction_factor: 0.02,
        fittings: [{ fitting: "Cotovelo 90° raio longo", quantity: 2 }],
      });
      expect(requestBodiesFor("/api/pump/headloss/chart")).toContainEqual({
        pipe_length: 25,
        diameter: 50,
        flow_rate: 0.005,
        velocity: expect.any(Number),
        method: "Darcy-Weisbach",
        friction_factor: 0.02,
        fittings: [{ fitting: "Cotovelo 90° raio longo", quantity: 2 }],
      });
      expect(requestBodiesFor("/api/pump/efficiency-map/chart")).toContainEqual({
        pipe_length: 25,
        diameter: 50,
        flow_rate: 0.005,
        velocity: expect.any(Number),
        method: "Darcy-Weisbach",
        friction_factor: 0.02,
        fittings: [{ fitting: "Cotovelo 90° raio longo", quantity: 2 }],
      });
    });
    expect(screen.getAllByText("Curva do sistema").length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByText("Ponto operacional")).toBeInTheDocument();
    expect(screen.getByText(/Mapa didático resolvido no backend/i)).toBeInTheDocument();
    expect(screen.getByText(/Faixa de cavitacao aproximada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Perda de Carga × Vazão/i).textContent).not.toContain(
      "Ponto operacional",
    );

    await openPumpTab(/NPSH Disponível/i);
    fireEvent.change(screen.getByLabelText(/Pressão manométrica/i), {
      target: { value: "1.2" },
    });
    await openPumpTab(/NPSH Disponível/i);

    fireEvent.change(screen.getByLabelText(/Pressão atmosférica/i), {
      target: { value: "1.0" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão de vapor/i), {
      target: { value: "0.03" },
    });
    fireEvent.change(screen.getAllByLabelText(/Massa específica/i)[0], {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Perda de carga na sucção/i), {
      target: { value: "2.1" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade na sucção/i), {
      target: { value: "1.4" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação do manômetro/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/NPSHr opcional/i), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByText(/Calcular NPSH disponível/i, { selector: "button" }));

    await waitFor(() => {
      expect(requestBodiesFor("/api/pump/npsh-gauge/chart")).toContainEqual({
        manometric_pressure: 1.2,
        atmospheric_pressure: 1,
        vapor_pressure: 0.03,
        density: 998,
        friction_factor: 2.1,
        pump_inlet_velocity: 1.4,
        gauge_elevation: 3,
        required: 3,
      });
    });
    expect(await screen.findByRole("heading", { name: /^Margem de NPSH$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Margem de NPSH$/i })).toBeInTheDocument();
    expect(screen.queryByText(/NPSHd = 6,8/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/NPSHr = 3/i)).not.toBeInTheDocument();
    expect(
      screen.getByText((_, element) => {
        return (
          element?.tagName === "BUTTON" &&
          (element.textContent ?? "").includes("How it works - Margem de NPSH")
        );
      }),
    ).toBeInTheDocument();

    await openPumpTab(/Altura Manométrica/i);
    fireEvent.change(screen.getByLabelText(/Pressão 1/i), {
      target: { value: "101325" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão 2/i), {
      target: { value: "180000" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação 1/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação 2/i), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade 1/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade 2/i), {
      target: { value: "2.1" },
    });
    fireEvent.change(screen.getByLabelText(/Massa específica do fluido/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Perda de carga total/i), {
      target: { value: "4.25" },
    });
    fireEvent.click(screen.getByText(/Calcular altura manométrica/i, { selector: "button" }));

    await waitFor(() => {
      expect(getRowContaining(/Altura manométrica/i)).toHaveTextContent("18,2");
    });
    const headTable = await screen.findByRole("table", { name: "Decomposição" });
    expect(headTable).toHaveTextContent("ΔP/(ρg)");
    expect(headTable).toHaveTextContent("h_{f}");
    expect(headTable).toHaveTextContent("%");
  });

  it("clears stale pump results after dependent input edits", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.005" },
    });
    fireEvent.change(screen.getByLabelText(/Fator de atrito/i), {
      target: { value: "0.02" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(requestBodiesFor("/api/pump/headloss")).toContainEqual({
        pipe_length: 25,
        diameter: 50,
        flow_rate: 0.005,
        velocity: expect.any(Number),
        method: "Darcy-Weisbach",
        friction_factor: 0.02,
      });
    });

    fireEvent.change(screen.getByRole("spinbutton", { name: /Vazão/i }), {
      target: { value: "0.006" },
    });

    expect(requestBodiesFor("/api/pump/headloss")).toHaveLength(1);

    await openPumpTab(/NPSH Disponível/i);
    fireEvent.change(screen.getByLabelText(/Pressão atmosférica/i), {
      target: { value: "1.0" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão de vapor/i), {
      target: { value: "0.03" },
    });
    fireEvent.change(screen.getAllByLabelText(/Massa específica/i)[0], {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Perda de carga na sucção/i), {
      target: { value: "2.1" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade na sucção/i), {
      target: { value: "1.4" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação do manômetro/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/NPSHr opcional/i), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByText(/Calcular NPSH disponível/i, { selector: "button" }));

    expect(await screen.findByRole("heading", { name: /^Margem de NPSH$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Margem de NPSH$/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/NPSHr opcional/i), {
      target: { value: "4" },
    });

    expect(screen.queryByText(/NPSHd = 6,8/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Margem de NPSH$/i })).not.toBeInTheDocument();

    await openPumpTab(/Altura Manométrica/i);
    fireEvent.change(screen.getByLabelText(/Pressão 1/i), {
      target: { value: "101325" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão 2/i), {
      target: { value: "180000" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação 1/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação 2/i), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade 1/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade 2/i), {
      target: { value: "2.1" },
    });
    fireEvent.change(screen.getByLabelText(/Massa específica do fluido/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Perda de carga total/i), {
      target: { value: "4.25" },
    });
    fireEvent.click(screen.getByText(/Calcular altura manométrica/i, { selector: "button" }));

    await waitFor(() => {
      expect(getRowContaining(/Altura manométrica/i)).toHaveTextContent("18,2");
    });
    const staleHeadTable = await screen.findByRole("table", { name: "Decomposição" });
    expect(staleHeadTable).toHaveTextContent("h_{f}");

    fireEvent.change(screen.getByLabelText(/Perda de carga total/i), {
      target: { value: "5" },
    });

    expect(getRowContaining(/Altura manométrica/i)).toHaveTextContent("—");
    expect(getRowContaining(/Altura manométrica/i)).not.toHaveTextContent("18,2");
    expect(screen.queryByText(/Decomposição/i)).not.toBeInTheDocument();
  });

  it("renders the manometric head decomposition table with the expected terms", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    await openPumpTab(/Altura Manométrica/i);
    fireEvent.change(screen.getByLabelText(/Pressão 1/i), {
      target: { value: "101325" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão 2/i), {
      target: { value: "101325" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação 1/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação 2/i), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade 1/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade 2/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/Massa específica do fluido/i), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText(/Perda de carga total/i), {
      target: { value: "2.55887" },
    });
    fireEvent.click(screen.getByText(/Calcular altura manométrica/i, { selector: "button" }));

    const headTable = await screen.findByRole("table", { name: "Decomposição" });
    await waitFor(() => {
      expect(headTable).toHaveTextContent("ΔP/(ρg)");
      expect(headTable).toHaveTextContent("Δz");
      expect(headTable).toHaveTextContent("ΔV2/(2g)");
      expect(headTable).toHaveTextContent("h_{f}");
    });
  });

  it("ignores delayed headloss responses after the user edits the form", async () => {
    const pumpRequests = mockPumpRequests({ delayHeadloss: true });
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.005" },
    });
    fireEvent.change(screen.getByLabelText(/Fator de atrito/i), {
      target: { value: "0.02" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.006" },
    });

    pumpRequests.resolveHeadloss(Response.json({ value: 4.25, units: "meter" }));

    await waitFor(() => {
      expect(screen.queryByText(/h_f = 4,25 m/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Perda de Carga × Vazão/i)).not.toBeInTheDocument();
    });
    expect(requestBodiesFor("/api/pump/headloss/chart")).toHaveLength(0);
    expect(requestBodiesFor("/api/pump/efficiency-map/chart")).toHaveLength(0);
  });

  it("ignores delayed headloss errors after the user edits the form", async () => {
    const pumpRequests = mockPumpRequests({ delayHeadloss: true });
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.005" },
    });
    fireEvent.change(screen.getByLabelText(/Fator de atrito/i), {
      target: { value: "0.02" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.006" },
    });

    pumpRequests.rejectHeadloss(new Error("Falha antiga de perda de carga"));

    await waitFor(() => {
      expect(notifyMock.error).not.toHaveBeenCalledWith(
        expect.stringContaining("Falha antiga de perda de carga"),
      );
    });
    expect(screen.queryByText(/Falha antiga de perda de carga/i)).not.toBeInTheDocument();
    expect(requestBodiesFor("/api/pump/headloss/chart")).toHaveLength(0);
    expect(requestBodiesFor("/api/pump/efficiency-map/chart")).toHaveLength(0);
  });

  it("calculates Darcy-Weisbach head loss using composition roughness and multiple fittings", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.01" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade na linha/i), {
      target: { value: "1.27" },
    });
    fireEvent.click(screen.getByLabelText(/Usar material/i));
    fireEvent.change(screen.getByLabelText(/Material da tubulação/i), {
      target: { value: "Aço comercial" },
    });
    fireEvent.change(screen.getByLabelText(/Número de Reynolds/i), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText(/Método do fator de atrito/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.change(screen.getAllByLabelText(/Conexão/i)[0], {
      target: { value: "Cotovelo 90° raio longo" },
    });
    fireEvent.change(screen.getAllByLabelText(/Quantidade/i)[0], {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByText(/Adicionar conexão/i, { selector: "button" }));
    fireEvent.change(screen.getAllByLabelText(/Conexão/i)[1], {
      target: { value: "Válvula gaveta" },
    });
    fireEvent.change(screen.getAllByLabelText(/Quantidade/i)[1], {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(requestBodiesFor("/api/flow/friction-factor")).toContainEqual({
        roughness: 0.045,
        diameter: 100,
        reynolds: 50000,
        method: "SwameeJain",
      });
      expect(requestBodiesFor("/api/pump/headloss")).toContainEqual({
        pipe_length: 100,
        diameter: 100,
        flow_rate: 0.009974556675147595,
        velocity: 1.27,
        method: "Darcy-Weisbach",
        friction_factor: 0.0215,
        fittings: [
          { fitting: "Cotovelo 90° raio longo", quantity: 2 },
          { fitting: "Válvula gaveta", quantity: 1 },
        ],
      });
    });
  });

  it("removes an accessory row before submitting headloss", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.01" },
    });
    fireEvent.change(screen.getByLabelText(/Fator de atrito/i), {
      target: { value: "0.02" },
    });
    fireEvent.change(screen.getAllByLabelText(/Conexão/i)[0], {
      target: { value: "Cotovelo 90° raio longo" },
    });
    fireEvent.change(screen.getAllByLabelText(/Quantidade/i)[0], {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByText(/Adicionar conexão/i, { selector: "button" }));
    fireEvent.change(screen.getAllByLabelText(/Conexão/i)[1], {
      target: { value: "Válvula gaveta" },
    });
    fireEvent.change(screen.getAllByLabelText(/Quantidade/i)[1], {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByLabelText(/Remover conexão 2/i));
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(requestBodiesFor("/api/pump/headloss")[0]).toMatchObject({
        pipe_length: 100,
        diameter: 100,
        flow_rate: 0.01,
        method: "Darcy-Weisbach",
        friction_factor: 0.02,
        fittings: [{ fitting: "Cotovelo 90° raio longo", quantity: 2 }],
        velocity: expect.any(Number),
      });
    });
  });

  it("derives velocity from flow rate and diameter before sending the headloss request", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Método de perda de carga/i), {
      target: { value: "Darcy-Weisbach" },
    });
    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.01" },
    });
    fireEvent.change(screen.getByLabelText(/Fator de atrito/i), {
      target: { value: "0.02" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(requestBodiesFor("/api/pump/headloss")).toHaveLength(1);
    });
    const headlossBodies = requestBodiesFor("/api/pump/headloss");
    expect(headlossBodies).toHaveLength(1);
    expect(headlossBodies[0]).toMatchObject({
      pipe_length: 12,
      diameter: 100,
      flow_rate: 0.01,
      friction_factor: 0.02,
    });
    expect(headlossBodies[0].velocity).toBeCloseTo(1.2732395447, 6);
  });

  it("calculates Hazen-Williams head loss using the composition roughness coefficient when available", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Método de perda de carga/i), {
      target: { value: "Hazen-Williams" },
    });
    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.01" },
    });
    fireEvent.click(screen.getByLabelText(/Usar material/i));
    fireEvent.change(screen.getByLabelText(/Material da tubulação/i), {
      target: { value: "PVC" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(requestBodiesFor("/api/pump/headloss")).toContainEqual({
        pipe_length: 100,
        diameter: 100,
        flow_rate: 0.01,
        velocity: 1.2732395447351625,
        method: "Hazen-Williams",
        roughness_coefficient: 140,
      });
    });
    expect(requestBodiesFor("/api/flow/friction-factor")).toHaveLength(0);
  });

  it("warns immediately when the selected material lacks a roughness coefficient for Hazen-Williams", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Método de perda de carga/i), {
      target: { value: "Hazen-Williams" },
    });
    fireEvent.click(screen.getByLabelText(/Usar material/i));
    const materialSelect = await screen.findByLabelText(/Material da tubulação/i);
    fireEvent.change(materialSelect, {
      target: { value: "Madeira" },
    });

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Dados incompletos: Coeficiente de rugosidade (C) não encontrado para este material",
      );
    });
    expect(requestBodiesFor("/api/pump/headloss")).toHaveLength(0);
  });

  it("blocks Hazen-Williams submission when the selected material lacks a roughness coefficient", async () => {
    mockPumpRequests();
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Método de perda de carga/i), {
      target: { value: "Hazen-Williams" },
    });
    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.01" },
    });
    fireEvent.click(screen.getByLabelText(/Usar material/i));
    fireEvent.change(await screen.findByLabelText(/Material da tubulação/i), {
      target: { value: "Madeira" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Dados incompletos: Coeficiente de rugosidade (C) não encontrado para este material",
      );
    });
    expect(requestBodiesFor("/api/pump/headloss")).toHaveLength(0);
  });

  it("shows an error notification when head loss calculation fails", async () => {
    mockPumpRequests({ headlossError: "Falha no backend de perda de carga" });
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Comprimento da linha/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Vazão/i), {
      target: { value: "0.005" },
    });
    fireEvent.change(screen.getByLabelText(/Fator de atrito/i), {
      target: { value: "0.02" },
    });
    fireEvent.click(screen.getByText(/Calcular perda de carga/i, { selector: "button" }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular perda de carga: Falha no backend de perda de carga",
      );
    });
  });

  it("shows an error notification when NPSH calculation fails", async () => {
    mockPumpRequests({ npshError: "Falha no backend de NPSH" });
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    await openPumpTab(/NPSH Disponível/i);

    fireEvent.change(screen.getByLabelText(/Pressão manométrica/i), {
      target: { value: "1.2" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão atmosférica/i), {
      target: { value: "1.0" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão de vapor/i), {
      target: { value: "0.03" },
    });
    fireEvent.change(screen.getAllByLabelText(/Massa específica/i)[0], {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Perda de carga na sucção/i), {
      target: { value: "2.1" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade na sucção/i), {
      target: { value: "1.4" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação do manômetro/i), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByText(/Calcular NPSH disponível/i, { selector: "button" }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular NPSH disponível: Falha no backend de NPSH",
      );
    });
  });

  it("shows an error notification when pump head calculation fails", async () => {
    mockPumpRequests({ headError: "Falha no backend de altura" });
    renderPumpPage();

    expect(
      await screen.findByRole("heading", { name: /Perda de Carga e Bombas/i }),
    ).toBeInTheDocument();

    await openPumpTab(/Altura Manométrica/i);

    fireEvent.change(screen.getByLabelText(/Pressão 1/i), {
      target: { value: "101325" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão 2/i), {
      target: { value: "180000" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação 1/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Elevação 2/i), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade 1/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade 2/i), {
      target: { value: "2.1" },
    });
    fireEvent.change(screen.getByLabelText(/Massa específica do fluido/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Perda de carga total/i), {
      target: { value: "4.25" },
    });
    fireEvent.click(screen.getByText(/Calcular altura manométrica/i, { selector: "button" }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular altura manométrica: Falha no backend de altura",
      );
    });
  });

});
