import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

const notifyMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  notify: notifyMock,
}));

const fetchMock = vi.fn<typeof fetch>();

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
  expect(row?.querySelector("td:last-child")?.textContent?.trim()).toBe(expected);
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

function mockFlowRequests(options?: {
  reynoldsError?: string;
  frictionError?: string;
  hydraulicError?: string;
  compositionError?: string;
  delayReynolds?: boolean;
}) {
  let resolveReynolds: ((response: Response) => void) | undefined;

  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/flow/friction-factor/methods") && method === "GET") {
      return Response.json(["ColebrookWhite", "SwameeJain", "Haaland"]);
    }

    if (url.endsWith("/api/flow/hydraulic-diameter/shapes") && method === "GET") {
      return Response.json(["circular", "rectangular", "annular", "triangular", "circularCap"]);
    }

    if (url.endsWith("/api/piping/compositions") && method === "GET") {
      return Response.json(["Aço comercial"]);
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

    if (url.endsWith("/api/flow/friction-factor") && method === "POST") {
      if (options?.frictionError) {
        return new Response(JSON.stringify({ detail: options.frictionError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return Response.json({ value: 0.0215, units: "dimensionless" });
    }

    if (url.endsWith("/api/flow/hydraulic-diameter") && method === "POST") {
      if (options?.hydraulicError) {
        return new Response(JSON.stringify({ detail: options.hydraulicError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return Response.json({ value: 66.67, units: "millimeter" });
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

  it("loads the worked example into the Reynolds form", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    expect(notifyMock.success).toHaveBeenCalledWith("Exemplo carregado com sucesso.");
    expect(screen.getByLabelText(/Diâmetro característico/i)).toHaveValue(100);
    expect(screen.getByLabelText(/Velocidade média/i)).toHaveValue(1.5);
    expect(screen.getByLabelText(/Densidade/i)).toHaveValue(998);
    expect(screen.getByLabelText(/Viscosidade dinâmica/i)).toHaveValue(0.001);
  });

  it("shows the exploratory panel and applies the water PVC template fields", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("region", { name: /Painel Exploratório/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Modo Exploratório/i), {
      target: { value: "water-pvc-dn100" },
    });

    expect(screen.getByLabelText(/Diâmetro característico/i)).toHaveValue(100);
    expect(screen.getByLabelText(/Velocidade média/i)).toHaveValue(1.5);
    expect(screen.getByLabelText(/Densidade/i)).toHaveValue(998);
    expect(screen.getByLabelText(/Viscosidade dinâmica/i)).toHaveValue(0.001);
  });

  it("hides stale Reynolds and friction outputs after dependent input edits", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Densidade/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Viscosidade dinâmica/i), {
      target: { value: "0.001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Reynolds/i }));

    await expectTableValueMath(/^Número de Reynolds$/i);
    expectTableUnitText(/^Número de Reynolds$/i, "dimensionless");

    fireEvent.change(screen.getByLabelText(/Rugosidade/i), {
      target: { value: "0.045" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro da linha/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular fator de atrito/i }));

    await expectTableValueMath(/^Fator de atrito$/i);
    expectTableUnitText(/^Fator de atrito$/i, "dimensionless");
    expect(screen.getByText(/Ponto operacional/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.8" },
    });

    const reynoldsRow = getRowContaining(/^Número de Reynolds$/i);
    const frictionRow = getRowContaining(/^Fator de atrito$/i);
    expect(reynoldsRow).toBeDefined();
    expect(frictionRow).toBeDefined();
    expect(reynoldsRow?.querySelector("td:nth-child(2)")?.textContent ?? "").toContain("—");
    expect(frictionRow?.querySelector("td:nth-child(2)")?.textContent ?? "").toContain("—");
    expect(screen.queryByText(/Regime do escoamento/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ponto operacional/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Número de Reynolds/i)).toHaveValue(null);
  });

  it("ignores delayed Reynolds responses after the user edits the form", async () => {
    const flowRequests = mockFlowRequests({ delayReynolds: true });
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Densidade/i), {
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

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "rectangular" },
    });
    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Altura/i), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    await expectTableValueMath(/^Diâmetro hidráulico$/i);
    expectTableUnitText(/^Diâmetro hidráulico$/i, "millimeter");

    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "120" },
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

    fireEvent.change(screen.getByLabelText(/Densidade/i), {
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

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "rectangular" },
    });
    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "100" },
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

    fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Densidade/i), {
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

    fireEvent.change(screen.getByLabelText(/Número de Reynolds/i), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText(/Rugosidade/i), {
      target: { value: "0.045" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro da linha/i), {
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

    fireEvent.change(screen.getByLabelText(/Número de Reynolds/i), {
      target: { value: "50000" },
    });
    fireEvent.click(screen.getByLabelText(/Usar composição/i));
    fireEvent.change(screen.getByLabelText(/Material da tubulação/i), {
      target: { value: "Aço comercial" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro da linha/i), {
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

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "rectangular" },
    });
    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Altura/i), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular diâmetro hidráulico: Falha no backend hidráulico",
      );
    });
  });

  it("renders the Moody chart from direct Reynolds input in the friction form", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Número de Reynolds/i), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText(/Rugosidade/i), {
      target: { value: "0.045" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro da linha/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular fator de atrito/i }));

    await expectTableValueMath(/^Fator de atrito$/i);
    expect(screen.getByText(/Ponto operacional/i)).toBeInTheDocument();
  });

  it("shows saved exploratory scenarios in the Moody chart legend", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Modo Exploratório/i), {
      target: { value: "water-pvc-dn100" },
    });

    fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Densidade/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Viscosidade dinâmica/i), {
      target: { value: "0.001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Reynolds/i }));
    await expectTableValueMath(/^Número de Reynolds$/i);
    expectTableUnitText(/^Número de Reynolds$/i, "dimensionless");

    fireEvent.change(screen.getByLabelText(/Rugosidade/i), {
      target: { value: "0.045" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro da linha/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular fator de atrito/i }));

    await expectTableValueMath(/^Fator de atrito$/i);
    expectTableUnitText(/^Fator de atrito$/i, "dimensionless");
    fireEvent.click(screen.getByRole("button", { name: /Salvar cenário/i }));

    expect(await screen.findByText(/Cenários salvos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/D=100 mm, v=1.5 m\/s/i)).toHaveLength(2);
  });

  it("calculates Reynolds, friction factor, and hydraulic diameter", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Diâmetro característico/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Velocidade média/i), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/Densidade/i), {
      target: { value: "998" },
    });
    fireEvent.change(screen.getByLabelText(/Viscosidade dinâmica/i), {
      target: { value: "0.001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular Reynolds/i }));

    await expectTableValueMath(/^Número de Reynolds$/i);
    expectTableUnitText(/^Número de Reynolds$/i, "dimensionless");
    expect(screen.getByLabelText(/Número de Reynolds/i)).toHaveValue(50000);
    expect(screen.getByText(/Regime do escoamento/i)).toBeInTheDocument();
    expect(screen.getByText(/^Turbulento$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Usar composição/i));
    fireEvent.change(screen.getByLabelText(/Material da tubulação/i), {
      target: { value: "Aço comercial" },
    });
    fireEvent.click(screen.getByLabelText(/Usar schedule/i));
    fireEvent.change(screen.getByLabelText(/^Schedule$/i), {
      target: { value: "SCH40" },
    });
    fireEvent.focus(screen.getByRole("combobox", { name: /Diâmetro da linha/i }));
    expect(await screen.findByRole("option", { name: /50 mm/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Diâmetro da linha/i), {
      target: { value: "60.3" },
    });
    fireEvent.change(screen.getByLabelText(/Método de cálculo/i), {
      target: { value: "SwameeJain" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular fator de atrito/i }));

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
    expect(screen.getByText(/Ponto operacional/i)).toBeInTheDocument();
    expect(screen.queryByText(/e\/D = 0.0009/i)).not.toBeInTheDocument();

    fireEvent.focus(screen.getByRole("combobox", { name: /Forma geométrica/i }));
    expect(await screen.findByRole("option", { name: /Triangular/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "rectangular" },
    });
    fireEvent.change(screen.getByLabelText(/Largura/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Altura/i), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    await expectTableValueMath(/^Diâmetro hidráulico$/i);
    expectTableUnitText(/^Diâmetro hidráulico$/i, "millimeter");
  });

  it("supports triangular geometry in the hydraulic diameter form", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "triangular" },
    });
    fireEvent.change(screen.getByLabelText(/Lado A/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/Lado B/i), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText(/Lado C/i), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    await expectTableValueMath(/^Diâmetro hidráulico$/i);
    expectTableUnitText(/^Diâmetro hidráulico$/i, "millimeter");
    expect(requestBodiesFor("/api/flow/hydraulic-diameter")).toContainEqual({
      shape: "triangular",
      side_a: 3,
      side_b: 4,
      side_c: 5,
    });
  });

  it("supports circular cap geometry in the hydraulic diameter form", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    fireEvent.focus(screen.getByRole("combobox", { name: /Forma geométrica/i }));
    expect(await screen.findByRole("option", { name: /Circular Cap/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "circularCap" },
    });
    fireEvent.change(screen.getByLabelText(/^Diâmetro$/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/^Altura$/i), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    await expectTableValueMath(/^Diâmetro hidráulico$/i);
    expectTableUnitText(/^Diâmetro hidráulico$/i, "millimeter");
    expect(requestBodiesFor("/api/flow/hydraulic-diameter")).toContainEqual({
      shape: "circularCap",
      diameter: 10,
      height: 4,
    });
  });

  it("blocks annular geometry when the inner diameter is not smaller than the outer diameter", async () => {
    mockFlowRequests();
    renderFlowPage();

    expect(
      await screen.findByRole("heading", { name: /Escoamento Interno/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "annular" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro externo/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/Diâmetro interno/i), {
      target: { value: "10" },
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

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "triangular" },
    });
    fireEvent.change(screen.getByLabelText(/Lado A/i), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/Lado B/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/Lado C/i), {
      target: { value: "6" },
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

    fireEvent.change(screen.getByLabelText(/Forma geométrica/i), {
      target: { value: "circularCap" },
    });
    fireEvent.change(screen.getByLabelText(/^Diâmetro$/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/^Altura$/i), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular diâmetro hidráulico/i }));

    expect(await screen.findByText(/altura não pode ser maior que o diâmetro/i)).toBeInTheDocument();
    expect(requestBodiesFor("/api/flow/hydraulic-diameter")).toHaveLength(0);
  });
});
