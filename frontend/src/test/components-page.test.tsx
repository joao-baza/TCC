import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

const notifyMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  notify: notifyMock,
}));

const fetchMock = vi.fn<typeof fetch>();

function mockComponentsRequests(options?: {
  criticalError?: string;
  propertyError?: string;
  mixtureError?: string;
  stateError?: string;
  delayMixture?: boolean;
}) {
  let resolveMixture: ((response: Response) => void) | undefined;

  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/components/list") && method === "GET") {
      return Response.json(["Water", "Ethanol", "Propane"]);
    }

    if (url.endsWith("/api/components/property-names") && method === "GET") {
      return Response.json({
        D: "Density [kg/m³]",
        V: "Viscosity [Pa·s]",
      });
    }

    if (url.endsWith("/api/components/property-mixture-names") && method === "GET") {
      return Response.json({
        D: "Density [kg/m³]",
        Z: "Compressibility factor [-]",
      });
    }

    if (url.endsWith("/api/components/critical-properties") && method === "POST") {
      if (options?.criticalError) {
        return new Response(JSON.stringify({ detail: options.criticalError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        critical_temperature: 647.1,
        critical_temperature_units: "kelvin",
        critical_pressure: 22064000,
        critical_pressure_units: "pascal",
        critical_density: 322,
        critical_density_units: "kilogram / meter ** 3",
        triple_point_temperature: 273.16,
        triple_point_temperature_units: "kelvin",
        triple_point_pressure: 611.657,
        triple_point_pressure_units: "pascal",
      });
    }

    if (url.endsWith("/api/components/property") && method === "POST") {
      if (options?.propertyError) {
        return new Response(JSON.stringify({ detail: options.propertyError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      if (body.property_name === "D") {
        return Response.json({ value: 997, units: "kilogram / meter ** 3" });
      }

      if (body.property_name === "V") {
        return Response.json({ value: 0.00089, units: "pascal * second" });
      }
    }

    if (url.endsWith("/api/components/mixture-properties") && method === "POST") {
      if (options?.delayMixture) {
        return new Promise<Response>((resolve) => {
          resolveMixture = resolve;
        });
      }

      if (options?.mixtureError) {
        return new Response(JSON.stringify({ detail: options.mixtureError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json({
        properties: {
          D: { value: 812.5, units: "kilogram / meter ** 3" },
          Z: { value: 0.98, units: "dimensionless" },
        },
      });
    }

    if (url.endsWith("/api/components/props-by-state") && method === "POST") {
      if (options?.stateError) {
        return new Response(JSON.stringify({ detail: options.stateError }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;

      if (
        body.fluid === "Water" &&
        body.input1 === "P" &&
        body.value1 === 10000 &&
        body.input2 === "Q" &&
        body.value2 === 0 &&
        body.output === "H"
      ) {
        return Response.json({ value: 191000, units: "J/kg" });
      }

      return Response.json({ value: 47400, units: "pascal" });
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveMixture(response: Response) {
      resolveMixture?.(response);
    },
  };
}

describe("ComponentsPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    notifyMock.error.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads component catalogs and calculates critical, pure, and mixture properties", async () => {
    const propertyRequests: Array<Record<string, unknown>> = [];
    const mixtureRequests: Array<Record<string, unknown>> = [];
    const stateRequests: Array<Record<string, unknown>> = [];

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/components/list") && method === "GET") {
        return Response.json(["Water", "Ethanol", "Propane"]);
      }

      if (url.endsWith("/api/components/property-names") && method === "GET") {
        return Response.json({
          D: "Density [kg/m³]",
          V: "Viscosity [Pa·s]",
        });
      }

      if (url.endsWith("/api/components/property-mixture-names") && method === "GET") {
        return Response.json({
          D: "Density [kg/m³]",
          Z: "Compressibility factor [-]",
        });
      }

      if (url.endsWith("/api/components/critical-properties") && method === "POST") {
        return Response.json({
          critical_temperature: 647.1,
          critical_temperature_units: "kelvin",
          critical_pressure: 22064000,
          critical_pressure_units: "pascal",
          critical_density: 322,
          critical_density_units: "kilogram / meter ** 3",
          triple_point_temperature: 273.16,
          triple_point_temperature_units: "kelvin",
          triple_point_pressure: 611.657,
          triple_point_pressure_units: "pascal",
        });
      }

      if (url.endsWith("/api/components/property") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        propertyRequests.push(body);

        if (body.property_name === "D") {
          return Response.json({ value: 997, units: "kilogram / meter ** 3" });
        }

        if (body.property_name === "V") {
          return Response.json({ value: 0.00089, units: "pascal * second" });
        }

        throw new Error(`Unhandled property request: ${JSON.stringify(body)}`);
      }

      if (url.endsWith("/api/components/mixture-properties") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        mixtureRequests.push(body);

        return Response.json({
          properties: {
            D: { value: 812.5, units: "kilogram / meter ** 3" },
            Z: { value: 0.98, units: "dimensionless" },
          },
        });
      }

      if (url.endsWith("/api/components/props-by-state") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        stateRequests.push(body);

        return Response.json({ value: 191000, units: "J/kg" });
      }

      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });

    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido crítico/i), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));
    expect(await screen.findByText(/647.1 kelvin/i)).toBeInTheDocument();
    expect(screen.getByText(/Critical Temperature/i)).toBeInTheDocument();
    expect(screen.getByText(/Critical Pressure/i)).toBeInTheDocument();
    expect(screen.getByText(/Triple Point Temperature/i)).toBeInTheDocument();
    expect(screen.getByText(/Triple Point Pressure/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido puro/i), {
      target: { value: "Water" },
    });
    const purePropertiesSelect = screen.getByLabelText(
      /Propriedades do fluido/i,
    ) as HTMLSelectElement;
    Array.from(purePropertiesSelect.options).forEach((option) => {
      option.selected = option.value === "D" || option.value === "V";
    });
    fireEvent.change(purePropertiesSelect);
    fireEvent.change(screen.getByLabelText(/Temperatura do fluido/i), {
      target: { value: "298.15" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão do fluido/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Calcular propriedades$/i }));
    expect(await screen.findByText(/997 kilogram \/ meter \*\* 3/i)).toBeInTheDocument();
    expect(screen.getByText(/0.00089/i)).toBeInTheDocument();
    expect(screen.getByText(/pascal \* second/i)).toBeInTheDocument();
    expect(propertyRequests).toEqual([
      {
        fluid: "Water",
        property_name: "D",
        temperature: 298.15,
        pressure: 101325,
      },
      {
        fluid: "Water",
        property_name: "V",
        temperature: 298.15,
        pressure: 101325,
      },
    ]);

    fireEvent.change(screen.getByLabelText(/Mistura componente 1/i), {
      target: { value: "Water" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    fireEvent.change(screen.getByLabelText(/Mistura componente 2/i), {
      target: { value: "Ethanol" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 2/i), {
      target: { value: "0.2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar fluido/i }));
    fireEvent.change(screen.getByLabelText(/Mistura componente 3/i), {
      target: { value: "Propane" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 3/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Temperatura da mistura/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão da mistura/i), {
      target: { value: "101325" },
    });
    const mixturePropertiesSelect = screen.getByLabelText(
      /Propriedades da mistura/i,
    ) as HTMLSelectElement;
    Array.from(mixturePropertiesSelect.options).forEach((option) => {
      option.selected = option.value === "D" || option.value === "Z";
    });
    fireEvent.change(mixturePropertiesSelect);
    fireEvent.click(screen.getByRole("button", { name: /Calcular mistura/i }));

    expect(await screen.findByText(/Composição da mistura/i)).toBeInTheDocument();
    expect(screen.getByText(/Water: 0.7/i)).toBeInTheDocument();
    expect(screen.getByText(/Ethanol: 0.2/i)).toBeInTheDocument();
    expect(screen.getByText(/Propane: 0.1/i)).toBeInTheDocument();
    expect(await screen.findByText(/812.5 kilogram \/ meter \*\* 3/i)).toBeInTheDocument();
    expect(screen.getByText(/0.98 dimensionless/i)).toBeInTheDocument();
    expect(mixtureRequests).toEqual([
      {
        fluid_fractions: {
          Water: 0.7,
          Ethanol: 0.2,
          Propane: 0.1,
        },
        temperature: 300,
        pressure: 101325,
        properties: ["D", "Z"],
      },
    ]);

    fireEvent.change(screen.getByLabelText(/Fluido de estado/i), {
      target: { value: "Water" },
    });
    fireEvent.change(screen.getByLabelText(/Variável 1/i), {
      target: { value: "P" },
    });
    fireEvent.change(screen.getByLabelText(/Valor 1/i), {
      target: { value: "10000" },
    });
    fireEvent.change(screen.getByLabelText(/Variável 2/i), {
      target: { value: "Q" },
    });
    fireEvent.change(screen.getByLabelText(/Valor 2/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Propriedade de saída/i), {
      target: { value: "H" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular por estado/i }));

    expect(await screen.findByText(/191000 J\/kg/i)).toBeInTheDocument();
    expect(stateRequests).toEqual([
      {
        fluid: "Water",
        input1: "P",
        value1: 10000,
        input2: "Q",
        value2: 0,
        output: "H",
      },
    ]);
  });

  it("shows the didactic accordions for critical, pure, and mixture properties", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/components/list") && method === "GET") {
        return Response.json(["Water", "Ethanol", "Propane"]);
      }

      if (url.endsWith("/api/components/property-names") && method === "GET") {
        return Response.json({
          D: "Density [kg/m³]",
          V: "Viscosity [Pa·s]",
        });
      }

      if (url.endsWith("/api/components/property-mixture-names") && method === "GET") {
        return Response.json({
          D: "Density [kg/m³]",
          Z: "Compressibility factor [-]",
        });
      }

      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Como funciona - Propriedades Críticas/i }),
    );
    expect(
      await screen.findByText(/ponto acima do qual a distinção entre fase líquida e vapor desaparece/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Como funciona - Propriedades do Fluido/i }),
    );
    expect(
      await screen.findByText(/Calcula propriedades termodinâmicas e de transporte de fluidos puros/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Como funciona - Propriedades de Mistura/i }),
    );
    expect(
      await screen.findByText(/frações molares devem somar exatamente 1,0/i),
    ).toBeInTheDocument();
  });

  it("clears calculated outputs when dependent component inputs change", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido crítico/i), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));
    expect(await screen.findByText(/647.1 kelvin/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido crítico/i), {
      target: { value: "Ethanol" },
    });
    expect(screen.queryByText(/647.1 kelvin/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido puro/i), {
      target: { value: "Water" },
    });
    const purePropertiesSelect = screen.getByLabelText(
      /Propriedades do fluido/i,
    ) as HTMLSelectElement;
    Array.from(purePropertiesSelect.options).forEach((option) => {
      option.selected = option.value === "D";
    });
    fireEvent.change(purePropertiesSelect);
    fireEvent.change(screen.getByLabelText(/Temperatura do fluido/i), {
      target: { value: "298.15" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão do fluido/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Calcular propriedades$/i }));
    expect(await screen.findByText(/997 kilogram \/ meter \*\* 3/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Temperatura do fluido/i), {
      target: { value: "300" },
    });
    expect(screen.queryByText(/997 kilogram \/ meter \*\* 3/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Mistura componente 1/i), {
      target: { value: "Water" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    fireEvent.change(screen.getByLabelText(/Mistura componente 2/i), {
      target: { value: "Ethanol" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 2/i), {
      target: { value: "0.3" },
    });
    fireEvent.change(screen.getByLabelText(/Temperatura da mistura/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão da mistura/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular mistura/i }));
    expect(await screen.findByText(/812.5 kilogram \/ meter \*\* 3/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.6" },
    });
    expect(screen.queryByText(/812.5 kilogram \/ meter \*\* 3/i)).not.toBeInTheDocument();
  });

  it("clears the state-property result when a dependent state input changes", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido de estado/i), {
      target: { value: "Water" },
    });
    fireEvent.change(screen.getByLabelText(/Variável 1/i), {
      target: { value: "P" },
    });
    fireEvent.change(screen.getByLabelText(/Valor 1/i), {
      target: { value: "10000" },
    });
    fireEvent.change(screen.getByLabelText(/Variável 2/i), {
      target: { value: "Q" },
    });
    fireEvent.change(screen.getByLabelText(/Valor 2/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Propriedade de saída/i), {
      target: { value: "H" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular por estado/i }));

    expect(await screen.findByText(/191000 J\/kg/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Valor 1/i), {
      target: { value: "12000" },
    });

    expect(screen.queryByText(/191000 J\/kg/i)).not.toBeInTheDocument();
  });

  it("shows an error notification when state-property lookup fails", async () => {
    mockComponentsRequests({ stateError: "Falha no backend por estado" });

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido de estado/i), {
      target: { value: "Water" },
    });
    fireEvent.change(screen.getByLabelText(/Variável 1/i), {
      target: { value: "P" },
    });
    fireEvent.change(screen.getByLabelText(/Valor 1/i), {
      target: { value: "10000" },
    });
    fireEvent.change(screen.getByLabelText(/Variável 2/i), {
      target: { value: "Q" },
    });
    fireEvent.change(screen.getByLabelText(/Valor 2/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Propriedade de saída/i), {
      target: { value: "H" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular por estado/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao obter propriedade por estado: Falha no backend por estado",
      );
    });
  });

  it("rejects the state-property form when required fields are missing", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Calcular por estado/i }));

    expect(notifyMock.error).toHaveBeenCalledWith("Preencha fluido, variáveis e valores.");
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/components/props-by-state")),
    ).toBe(false);
  });

  it("ignores delayed mixture responses after the mixture inputs change", async () => {
    const componentsRequests = mockComponentsRequests({ delayMixture: true });

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Mistura componente 1/i), {
      target: { value: "Water" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    fireEvent.change(screen.getByLabelText(/Mistura componente 2/i), {
      target: { value: "Ethanol" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 2/i), {
      target: { value: "0.3" },
    });
    fireEvent.change(screen.getByLabelText(/Temperatura da mistura/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão da mistura/i), {
      target: { value: "101325" },
    });
    const mixturePropertiesSelect = screen.getByLabelText(
      /Propriedades da mistura/i,
    ) as HTMLSelectElement;
    Array.from(mixturePropertiesSelect.options).forEach((option) => {
      option.selected = option.value === "D";
    });
    fireEvent.change(mixturePropertiesSelect);
    fireEvent.click(screen.getByRole("button", { name: /Calcular mistura/i }));

    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.6" },
    });

    componentsRequests.resolveMixture(
      Response.json({
        properties: {
          D: { value: 812.5, units: "kilogram / meter ** 3" },
        },
      }),
    );

    await waitFor(() => {
      expect(screen.queryByText(/812.5 kilogram \/ meter \*\* 3/i)).not.toBeInTheDocument();
    });
  });

  it("shows an error notification when critical properties lookup fails", async () => {
    mockComponentsRequests({ criticalError: "Falha no backend crítico" });

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido crítico/i), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao obter propriedades críticas: Falha no backend crítico",
      );
    });
  });

  it("rejects the critical properties form when no fluid is selected", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido crítico/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));

    expect(notifyMock.error).toHaveBeenCalledWith("Selecione um fluido");
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/components/critical-properties")),
    ).toBe(false);
  });

  it("shows an error notification when pure property lookup fails", async () => {
    mockComponentsRequests({ propertyError: "Falha no backend puro" });

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido puro/i), {
      target: { value: "Water" },
    });
    const purePropertiesSelect = screen.getByLabelText(
      /Propriedades do fluido/i,
    ) as HTMLSelectElement;
    Array.from(purePropertiesSelect.options).forEach((option) => {
      option.selected = option.value === "D";
    });
    fireEvent.change(purePropertiesSelect);
    fireEvent.change(screen.getByLabelText(/Temperatura do fluido/i), {
      target: { value: "298.15" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão do fluido/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Calcular propriedades$/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao obter propriedade: Falha no backend puro",
      );
    });
  });

  it("rejects the pure property form when required fields are missing", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fluido puro/i), {
      target: { value: "Water" },
    });
    const purePropertiesSelect = screen.getByLabelText(
      /Propriedades do fluido/i,
    ) as HTMLSelectElement;
    Array.from(purePropertiesSelect.options).forEach((option) => {
      option.selected = false;
    });
    fireEvent.change(purePropertiesSelect);
    fireEvent.click(screen.getByRole("button", { name: /^Calcular propriedades$/i }));

    expect(notifyMock.error).toHaveBeenCalledWith("Preencha todos os campos obrigatórios");
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/components/property"))).toBe(false);
  });

  it("shows an error notification when mixture property lookup fails", async () => {
    mockComponentsRequests({ mixtureError: "Falha no backend da mistura" });

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Mistura componente 1/i), {
      target: { value: "Water" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    fireEvent.change(screen.getByLabelText(/Mistura componente 2/i), {
      target: { value: "Ethanol" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 2/i), {
      target: { value: "0.3" },
    });
    fireEvent.change(screen.getByLabelText(/Temperatura da mistura/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão da mistura/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular mistura/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao calcular propriedades da mistura: Falha no backend da mistura",
      );
    });
  });

  it("rejects the mixture form when fractions are missing", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Temperatura da mistura/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão da mistura/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular mistura/i }));

    expect(notifyMock.error).toHaveBeenCalledWith("Adicione pelo menos uma fração de fluido");
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/components/mixture-properties")),
    ).toBe(false);
  });

  it("rejects the mixture form when fractions do not sum to 1", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(routes, { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Mistura componente 1/i), {
      target: { value: "Water" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    fireEvent.change(screen.getByLabelText(/Mistura componente 2/i), {
      target: { value: "Ethanol" },
    });
    fireEvent.change(screen.getByLabelText(/Fração molar 2/i), {
      target: { value: "0.2" },
    });
    fireEvent.change(screen.getByLabelText(/Temperatura da mistura/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão da mistura/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcular mistura/i }));

    expect(notifyMock.error).toHaveBeenCalledWith("As frações molares devem somar 1,0");
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/components/mixture-properties")),
    ).toBe(false);
  });
});
