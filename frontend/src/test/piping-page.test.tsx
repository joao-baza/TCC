import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";
import { abbreviateUnit } from "@/lib/units";

const fetchMock = vi.fn<typeof fetch>();
const notifyMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/notify", () => ({
  notify: notifyMock,
}));

function mockPipingRequests(options?: {
  compositionError?: string;
  scheduleDiametersError?: string;
  diameterDetailsError?: string;
  fittingError?: string;
  delayComposition?: boolean;
  delayDiameterDetails?: boolean;
}) {
  let resolveComposition: ((response: Response) => void) | undefined;
  let resolveDiameterDetails: ((response: Response) => void) | undefined;

  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/piping/compositions") && method === "GET") {
      return Response.json(["Aço comercial", "Aço galvanizado"]);
    }

    if (url.endsWith("/api/piping/schedules") && method === "GET") {
      return Response.json([
        { name: "SCH40", diameters: [25], description: "Schedule padrão." },
      ]);
    }

    if (url.endsWith("/api/piping/fittings") && method === "GET") {
      return Response.json(["Cotovelo 90° raio longo", "Válvula esfera"]);
    }

    if (url.endsWith("/api/piping/example") && method === "GET") {
      return Response.json({
        composition: "Aço galvanizado",
        schedule: "SCH40",
        diameter: 125,
        fitting: "Válvula esfera",
      });
    }

    if (
      url.endsWith("/api/piping/composition/A%C3%A7o%20comercial") &&
      method === "GET"
    ) {
      if (options?.delayComposition) {
        return new Promise<Response>((resolve) => {
          resolveComposition = resolve;
        });
      }

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
          roughness_coefficient: { value: 130, units: "dimensionless" },
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
        applications: "Sistemas de água potável, sprinklers e irrigação.",
        specifications: {
          roughness: { value: 0.15, units: "millimeter" },
          roughness_coefficient: { value: 120, units: "dimensionless" },
        },
      });
    }

    if (url.endsWith("/api/piping/schedule/SCH40/diameters") && method === "GET") {
      if (options?.scheduleDiametersError) {
        return new Response(JSON.stringify({ detail: options.scheduleDiametersError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        25: {
          nominal_diameter: 25,
          external_diameter: 33.4,
          units: "mm",
        },
        125: {
          nominal_diameter: 125,
          external_diameter: 141.3,
          units: "mm",
        },
      });
    }

    if (
      url.endsWith("/api/piping/schedule/SCH40/diameter/25") &&
      method === "GET"
    ) {
      if (options?.delayDiameterDetails) {
        return new Promise<Response>((resolve) => {
          resolveDiameterDetails = resolve;
        });
      }

      if (options?.diameterDetailsError) {
        return new Response(JSON.stringify({ detail: options.diameterDetailsError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        external_diameter: { value: 33.4, units: "millimeter" },
        thickness: { value: 3.38, units: "millimeter" },
        weight: { value: 2.5, units: "kilogram / meter" },
        max_pressure: { value: 1013250, units: "pascal" },
      });
    }

    if (
      url.endsWith("/api/piping/schedule/SCH40/diameter/125") &&
      method === "GET"
    ) {
      return Response.json({
        external_diameter: { value: 141.3, units: "millimeter" },
        thickness: { value: 6.55, units: "millimeter" },
        weight: { value: 21.77, units: "kilogram / meter" },
        max_pressure: { value: 835000, units: "pascal" },
      });
    }

    if (
      url.endsWith("/api/piping/fitting/Cotovelo%2090%C2%B0%20raio%20longo") &&
      method === "GET"
    ) {
      if (options?.fittingError) {
        return new Response(JSON.stringify({ detail: options.fittingError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        name: "Cotovelo 90° raio longo",
        description: "Cotovelo de grande raio.",
        usage: "Mudança de direção com menor perda.",
        specifications: {
          equivalentLength: { value: 30, units: "dimensionless" },
        },
      });
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

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveComposition(response: Response) {
      resolveComposition?.(response);
    },
    resolveDiameterDetails(response: Response) {
      resolveDiameterDetails?.(response);
    },
  };
}

function getRowContaining(text: string | RegExp) {
  return screen
    .getAllByText(text)
    .find((node) => node.closest("tr"))
    ?.closest("tr");
}

async function openPipingTab(name: string | RegExp) {
  fireEvent.click(screen.getByRole("tab", { name }));
  await waitFor(() => {
    expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  });
}

async function selectOption(label: string | RegExp, optionName: string | RegExp) {
  fireEvent.focus(screen.getByLabelText(label));
  expect(await screen.findByRole("option", { name: optionName })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: optionName }));
  await waitFor(() => {
    expect(screen.queryByRole("option", { name: optionName })).not.toBeInTheDocument();
  });
}

function closeCombobox(label: string | RegExp) {
  const input = screen.getByLabelText(label);
  fireEvent.keyDown(input, { key: "Escape", code: "Escape" });
  fireEvent.blur(input);
}

function expectTableUnitText(
  table: HTMLElement,
  rowLabel: string | RegExp,
  expected: string | RegExp,
) {
  const row = within(table)
    .getAllByText(rowLabel)
    .find((node) => node.closest("tr"))
    ?.closest("tr");
  const unitCell = row?.querySelector("td:last-child");
  const unitText =
    unitCell?.querySelector(".katex-html")?.textContent?.trim() ??
    unitCell?.textContent?.trim() ??
    "";

  if (expected instanceof RegExp) {
    expect(unitText).toMatch(expected);
    return;
  }

  const renderedExpected = expected === "dimensionless" ? "-" : abbreviateUnit(expected);
  expect(unitText).toBe(renderedExpected);
}

function expectTableValueText(
  table: HTMLElement,
  rowLabel: string | RegExp,
  expected: string | RegExp,
) {
  const row = within(table)
    .getAllByText(rowLabel)
    .find((node) => node.closest("tr"))
    ?.closest("tr");
  const valueCell = row?.querySelector("td:nth-child(2)");
  const valueText = valueCell?.textContent ?? "";

  expect(valueCell?.querySelector(".katex")).not.toBeNull();

  if (expected instanceof RegExp) {
    expect(valueText).toContain(expected.source.replace(/^\^|\$$/g, ""));
    return;
  }

  expect(valueText).toContain(expected);
}

describe("PipingPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    notifyMock.error.mockReset();
    notifyMock.success.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads catalog data and displays composition, diameter, and fitting details", async () => {
    mockPipingRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Tubulações e Acessórios/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Como funciona - Composições/i }),
    ).toBeInTheDocument();

    await selectOption(/Composição/i, "Aço comercial");
    await waitFor(() => {
      expect(getRowContaining(/^Roughness$/i)).toBeDefined();
    });

    const compositionTable = getRowContaining(/^Roughness$/i)?.closest("table");
    expect(compositionTable).toBeDefined();
    expect(within(compositionTable as HTMLElement).getByText(/^Nome$/i)).toBeInTheDocument();
    expect(compositionTable).toHaveTextContent(/Tubulação de aço carbono padrão/i);
    expect(within(compositionTable as HTMLElement).getByText(/^Roughness$/i)).toBeInTheDocument();
    expect(
      within(compositionTable as HTMLElement).getByText(/^Roughness Coefficient$/i),
    ).toBeInTheDocument();
    expectTableValueText(compositionTable as HTMLElement, /^Roughness$/i, /^0,045$/i);
    expectTableValueText(
      compositionTable as HTMLElement,
      /^Roughness Coefficient$/i,
      /^130$/i,
    );
    expectTableUnitText(compositionTable as HTMLElement, /^Roughness$/i, /mm/i);
    expectTableUnitText(
      compositionTable as HTMLElement,
      /^Roughness Coefficient$/i,
      /^(?:-|dimensionless)$/i,
    );

    fireEvent.change(screen.getByLabelText(/Composição/i), {
      target: { value: "" },
    });
    closeCombobox(/Composição/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await openPipingTab(/Schedules e Diâmetros/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Schedules e Diâmetros/i }),
    ).toBeInTheDocument();
    await selectOption(/^Schedule$/i, "SCH40");
    await selectOption(/Diâmetro nominal/i, /^25 mm$/i);
    await waitFor(() => {
      expect(getRowContaining(/^External Diameter$/i)).toBeDefined();
    });

    const diameterTable = getRowContaining(/^External Diameter$/i)?.closest("table");
    expect(diameterTable).toBeDefined();
    expect(
      within(diameterTable as HTMLElement).getByText(/^External Diameter$/i),
    ).toBeInTheDocument();
    expectTableValueText(diameterTable as HTMLElement, /^External Diameter$/i, /^33,4$/i);
    expectTableValueText(diameterTable as HTMLElement, /^Thickness$/i, /^3,38$/i);
    expectTableValueText(diameterTable as HTMLElement, /^Weight$/i, /^2,5$/i);
    expectTableValueText(diameterTable as HTMLElement, /^Max Pressure$/i, /^1,01325$/i);
    expectTableUnitText(diameterTable as HTMLElement, /^External Diameter$/i, /mm/i);
    expectTableUnitText(diameterTable as HTMLElement, /^Thickness$/i, /mm/i);
    expectTableUnitText(diameterTable as HTMLElement, /^Weight$/i, /(?:kilogram \/ meter|kg\/m)/i);
    expectTableUnitText(diameterTable as HTMLElement, /^Max Pressure$/i, /Pa/i);

    await openPipingTab(/Conexões/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Conexões/i }),
    ).toBeInTheDocument();
    await selectOption(/Conexão/i, "Cotovelo 90° raio longo");
    await waitFor(() => {
      expect(getRowContaining(/^Equivalent Length$/i)).toBeDefined();
    });

    const fittingTable = getRowContaining(/^Equivalent Length$/i)?.closest("table");
    expect(fittingTable).toBeDefined();
    expect(fittingTable).toHaveTextContent(/Mudança de direção com menor perda/i);
    expectTableValueText(fittingTable as HTMLElement, /^Equivalent Length$/i, /^30$/i);
    expectTableUnitText(
      fittingTable as HTMLElement,
      /^Equivalent Length$/i,
      /^(?:-|dimensionless)$/i,
    );
  }, 10000);

  it("loads a representative example across the piping module", async () => {
    mockPipingRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Tubulações e Acessórios/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Como funciona - Composições/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Composição/i)).toHaveValue("Aço galvanizado");
    });

    await openPipingTab(/Schedules e Diâmetros/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Schedules e Diâmetros/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Schedule$/i)).toHaveValue("SCH40");
    await waitFor(() => {
      expect(screen.getByLabelText(/Diâmetro nominal/i)).toHaveValue("125 mm");
      expect(getRowContaining(/^External Diameter$/i)).toBeDefined();
    });

    await openPipingTab(/Conexões/i);
    expect(
      screen.getByRole("button", { name: /Como funciona - Conexões/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Conexão/i)).toHaveValue("Válvula esfera");
  });

  it("clears stale detail panels immediately when the selected composition, schedule, or fitting changes", async () => {
    mockPipingRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Tubulações e Acessórios/i }),
    ).toBeInTheDocument();

    await selectOption(/Composição/i, "Aço comercial");
    await waitFor(() => {
      expect(getRowContaining(/^Roughness$/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Composição/i), {
      target: { value: "" },
    });
    closeCombobox(/Composição/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await openPipingTab(/Schedules e Diâmetros/i);
    await selectOption(/^Schedule$/i, "SCH40");
    await selectOption(/Diâmetro nominal/i, /^25 mm$/i);
    await waitFor(() => {
      expect(getRowContaining(/^External Diameter$/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/^Schedule$/i), {
      target: { value: "" },
    });
    closeCombobox(/^Schedule$/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await openPipingTab(/Conexões/i);
    await selectOption(/Conexão/i, "Cotovelo 90° raio longo");
    await waitFor(() => {
      expect(getRowContaining(/^Equivalent Length$/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Conexão/i), {
      target: { value: "" },
    });
    closeCombobox(/Conexão/i);
    fireEvent.blur(screen.getByLabelText(/Conexão/i));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("ignores delayed composition details after the selection changes", async () => {
    const pipingRequests = mockPipingRequests({ delayComposition: true });

    const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Tubulações e Acessórios/i }),
    ).toBeInTheDocument();

    await selectOption(/Composição/i, "Aço comercial");
    fireEvent.change(screen.getByLabelText(/Composição/i), {
      target: { value: "" },
    });

    pipingRequests.resolveComposition(
      Response.json({
        name: "Aço comercial",
        description: "Tubulação de aço carbono padrão.",
        applications: "Transporte industrial.",
        specifications: {
          roughness: { value: 0.045, units: "millimeter" },
          roughness_coefficient: { value: 130, units: "dimensionless" },
        },
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  it("ignores delayed diameter details after the schedule changes", async () => {
    const pipingRequests = mockPipingRequests({ delayDiameterDetails: true });

    const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Tubulações e Acessórios/i }),
    ).toBeInTheDocument();

    await openPipingTab(/Schedules e Diâmetros/i);
    await selectOption(/^Schedule$/i, "SCH40");
    await selectOption(/Diâmetro nominal/i, /^25 mm$/i);

    fireEvent.change(screen.getByLabelText(/^Schedule$/i), {
      target: { value: "" },
    });

    pipingRequests.resolveDiameterDetails(
      Response.json({
        external_diameter: { value: 33.4, units: "millimeter" },
        thickness: { value: 3.38, units: "millimeter" },
        weight: { value: 2.5, units: "kilogram / meter" },
        max_pressure: { value: 1013250, units: "pascal" },
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  it("shows an error notification when composition details lookup fails", async () => {
    mockPipingRequests({ compositionError: "Falha no backend da composição" });

    const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Tubulações e Acessórios/i }),
    ).toBeInTheDocument();

    await selectOption(/Composição/i, "Aço comercial");

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao carregar detalhes da composição: Falha no backend da composição",
      );
    });
  });

  it("shows an error notification when schedule diameters lookup fails", async () => {
    mockPipingRequests({ scheduleDiametersError: "Falha no backend dos diâmetros" });

    const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Tubulações e Acessórios/i }),
    ).toBeInTheDocument();

    await openPipingTab(/Schedules e Diâmetros/i);
    await selectOption(/^Schedule$/i, "SCH40");

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao carregar diâmetros do schedule: Falha no backend dos diâmetros",
      );
    });
  });

  it("shows an error notification when fitting details lookup fails", async () => {
    mockPipingRequests({ fittingError: "Falha no backend da conexão" });

    const router = createMemoryRouter(routes, { initialEntries: ["/piping"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Tubulações e Acessórios/i }),
    ).toBeInTheDocument();

    await openPipingTab(/Conexões/i);
    await selectOption(/Conexão/i, "Cotovelo 90° raio longo");

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao carregar detalhes da conexão: Falha no backend da conexão",
      );
    });
  });
});
