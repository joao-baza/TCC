import { useEffect, useId, useMemo, useState } from "react";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

type ComboboxOption = { value: string; label: string };

type ComboboxMockProps = {
  label: string;
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

function matchesQuery(option: ComboboxOption, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return (
    option.label.toLowerCase().includes(normalizedQuery) ||
    option.value.toLowerCase().includes(normalizedQuery)
  );
}

function matchesText(text: string | null | undefined, matcher: RegExp | string) {
  if (text == null) {
    return false;
  }

  return matcher instanceof RegExp ? matcher.test(text) : text === matcher;
}

function getRowContaining(text: string | RegExp) {
  const matcher =
    text instanceof RegExp
      ? (value: string) => text.test(value)
      : (value: string) => value.includes(text);

  return Array.from(document.querySelectorAll("td"))
    .find((cell) => matcher(cell.textContent ?? ""))
    ?.closest("tr");
}

function expectRowUnitText(text: string | RegExp, expected: string) {
  const row = getRowContaining(text);
  expect(row?.querySelector("td:last-child")).toHaveTextContent(expected);
}

async function expectRowValueMath(text: string | RegExp, expected?: string) {
  await waitFor(() => {
    const row = getRowContaining(text);
    const valueCell = row?.querySelector("td:nth-child(2)");

    expect(valueCell?.querySelector(".katex")).not.toBeNull();

    if (expected) {
      expect(valueCell).toHaveTextContent(expected);
    }
  });
}

function ComboboxMock({ label, options, value, onValueChange, placeholder = "Selecione uma opção" }: ComboboxMockProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (selectedOption) {
      setQuery(selectedOption.label);
    } else {
      setQuery("");
    }
  }, [selectedOption]);

  const visibleOptions = useMemo(
    () => options.filter((option) => matchesQuery(option, query)),
    [options, query],
  );

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        aria-label={label}
        role="combobox"
        value={query}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          if (selectedOption) {
            setQuery("");
          }
        }}
        onChange={(event) => {
          setOpen(true);
          setQuery(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !open || !visibleOptions.length) {
            return;
          }

          event.preventDefault();
          onValueChange(visibleOptions[0].value);
          setOpen(false);
          setQuery(visibleOptions[0].label);
        }}
      />
      {open ? (
        <div role="listbox">
          {visibleOptions.map((option) => (
            <div
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onValueChange(option.value);
                setOpen(false);
                setQuery(option.label);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type MultiComboboxMockProps = {
  label: string;
  options: ComboboxOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
};

function MultiComboboxMock({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Selecione opções",
}: MultiComboboxMockProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visibleOptions = useMemo(
    () => options.filter((option) => !value.includes(option.value) && matchesQuery(option, query)),
    [options, query, value],
  );

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <div>
        {selectedOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={`Remover ${option.label}`}
            onClick={() => onValueChange(value.filter((selected) => selected !== option.value))}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input
        id={inputId}
        aria-label={label}
        role="combobox"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setOpen(true);
          setQuery(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !open || !visibleOptions.length) {
            return;
          }

          event.preventDefault();
          onValueChange([...value, visibleOptions[0].value]);
          setQuery("");
          setOpen(false);
        }}
      />
      {open ? (
        <div role="listbox">
          {visibleOptions.map((option) => (
            <div
              key={option.value}
              role="option"
              onClick={() => {
                onValueChange([...value, option.value]);
                setQuery("");
                setOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

vi.mock("@/components/ui/combobox", () => ({
  Combobox: ComboboxMock,
}));

vi.mock("@/components/ui/multi-combobox", () => ({
  MultiCombobox: MultiComboboxMock,
}));

const getRoutes = (() => {
  let promise: Promise<typeof import("@/app/router").routes> | null = null;

  return () => {
    if (!promise) {
      promise = import("@/app/router").then((module) => module.routes);
    }

    return promise;
  };
})();

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

    if (url.endsWith("/api/components/saturation-envelope") && method === "POST") {
      return Response.json({
        fluid: "Water",
        critical: {
          temperature: 647.1,
          pressure: 22064000,
          density: 322,
        },
        triple: {
          temperature: 273.16,
          pressure: 611.657,
        },
        points: [
          {
            temperature: 300,
            pressure: 3537,
            liquid_entropy: 100,
            vapor_entropy: 1100,
            liquid_enthalpy: 100000,
            vapor_enthalpy: 2500000,
          },
          {
            temperature: 450,
            pressure: 93000,
            liquid_entropy: 1200,
            vapor_entropy: 4200,
            liquid_enthalpy: 550000,
            vapor_enthalpy: 2700000,
          },
          {
            temperature: 600,
            pressure: 12300000,
            liquid_entropy: 2000,
            vapor_entropy: 6200,
            liquid_enthalpy: 1200000,
            vapor_enthalpy: 3000000,
          },
        ],
      });
    }

    if (url.endsWith("/api/components/binary-vle") && method === "POST") {
      return Response.json({
        fluid1: "Water",
        fluid2: "Ethanol",
        pressure: 101325,
        bubble_points: [
          { liquid_fraction: 0, vapor_fraction: 0, temperature: 351.2 },
          { liquid_fraction: 0.5, vapor_fraction: 0.7, temperature: 363.4 },
          { liquid_fraction: 1, vapor_fraction: 1, temperature: 373.2 },
        ],
        dew_points: [
          { liquid_fraction: 0, vapor_fraction: 0, temperature: 351.2 },
          { liquid_fraction: 0.4, vapor_fraction: 0.5, temperature: 359.1 },
          { liquid_fraction: 1, vapor_fraction: 1, temperature: 373.2 },
        ],
      });
    }

    if (url.endsWith("/api/components/property-surface") && method === "POST") {
      return Response.json({
        fluid: "Water",
        property_name: "D",
        property_label: "Density",
        property_units: "kg/m³",
        temperatures: [300, 350, 400],
        pressures: [101325, 250000, 500000],
        values: [
          [997, 992, 989],
          [983, 978, 972],
          [965, 958, 951],
        ],
        value_min: 951,
        value_max: 997,
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

      return Response.json({ value: 191000, units: "J/kg" });
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return {
    resolveMixture(response: Response) {
      resolveMixture?.(response);
    },
  };
}

async function selectComboboxOption(label: RegExp, query: string, optionName: RegExp | string) {
  const input = screen.getByLabelText(label, { selector: "input" });
  fireEvent.click(input);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: query } });
  const listbox = screen
    .queryAllByRole("listbox", { hidden: true })
    .find((candidate) =>
      within(candidate)
        .queryAllByRole("option", { hidden: true })
        .some((option) => matchesText(option.textContent, optionName)),
    );

  if (listbox) {
    fireEvent.click(within(listbox).getByRole("option", { name: optionName, hidden: true }));
  } else {
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  }

  fireEvent.keyDown(input, { key: "Escape", code: "Escape" });
  fireEvent.blur(input);
  fireEvent.click(document.body);
  return input;
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

  it(
    "loads component catalogs and calculates critical, pure, and mixture properties",
    async () => {
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

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });

    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Diagrama Ternário/i })).toBeInTheDocument();

    await selectComboboxOption(/Fluido crítico/i, "wat", "Water");
    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));

    await selectComboboxOption(/Fluido puro/i, "wat", "Water");
    await selectComboboxOption(/Propriedades do fluido/i, "den", /Densidade/i);
    await selectComboboxOption(/Propriedades do fluido/i, "vis", /Viscosidade/i);
    fireEvent.change(screen.getByLabelText(/Temperatura do fluido/i), {
      target: { value: "298.15" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão do fluido/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Calcular propriedades$/i }));
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

    await selectComboboxOption(/Mistura componente 1/i, "wat", "Water");
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    await selectComboboxOption(/Mistura componente 2/i, "eth", "Ethanol");
    fireEvent.change(screen.getByLabelText(/Fração molar 2/i), {
      target: { value: "0.2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar fluido/i }));
    await selectComboboxOption(/Mistura componente 3/i, "pro", "Propane");
    fireEvent.change(screen.getByLabelText(/Fração molar 3/i), {
      target: { value: "0.1" },
    });
    fireEvent.change(screen.getByLabelText(/Temperatura da mistura/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão da mistura/i), {
      target: { value: "101325" },
    });
    await selectComboboxOption(/Propriedades da mistura/i, "den", /Densidade/i);
    await selectComboboxOption(/Propriedades da mistura/i, "comp", /Fator de compressibilidade/i);
    fireEvent.click(screen.getByRole("button", { name: /Calcular mistura/i }));

    expect(await screen.findByText(/Composição da mistura/i)).toBeInTheDocument();
    expect(screen.getByText(/Water: 0.7/i)).toBeInTheDocument();
    expect(screen.getByText(/Ethanol: 0.2/i)).toBeInTheDocument();
    expect(screen.getByText(/Propane: 0.1/i)).toBeInTheDocument();
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

    await selectComboboxOption(/Fluido de estado/i, "wat", "Water");
    await selectComboboxOption(/Variável 1/i, "pre", /Pressão \(P\)/i);
    fireEvent.change(screen.getByLabelText(/Valor 1/i), {
      target: { value: "10000" },
    });
    await selectComboboxOption(/Variável 2/i, "tit", /Título \(Q\)/i);
    fireEvent.change(screen.getByLabelText(/Valor 2/i), {
      target: { value: "0" },
    });
    await selectComboboxOption(/Propriedade de saída/i, "ent", /Entalpia \(H\)/i);
    fireEvent.click(screen.getByRole("button", { name: /Calcular por estado/i }));

    await expectRowValueMath(/^Entalpia$/i);
    expectRowUnitText(/^Entalpia$/i, "J/kg");
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
    },
    10000,
  );

  it("traces the saturation envelope and renders the vapor pressure curve", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Traçar envelope/i }));

    const phaseEnvelope = await screen.findByTestId("phase-envelope-chart");
    const vaporPressure = screen.getByTestId("vapor-pressure-curve");

    expect(phaseEnvelope.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/Entropia/i);
    expect(phaseEnvelope.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/Temperatura \(K\)/i);
    expect(vaporPressure.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/Temperatura \(K\)/i);
    expect(vaporPressure.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/log10\(P\)/i);
  });

  it("generates the binary T-x-y / y-x diagram from the selected pure components", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Gerar diagrama/i }));

    const binaryChart = await screen.findByTestId("binary-vle-chart");
    expect(binaryChart).toBeInTheDocument();
    expect(within(binaryChart).getByRole("img", { name: /Diagrama T-x-y/i })).toBeInTheDocument();
    expect(within(binaryChart).getAllByText(/Water/i).length).toBeGreaterThan(0);
    expect(within(binaryChart).getAllByText(/Ethanol/i).length).toBeGreaterThan(0);
    expect(binaryChart.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/Temperatura \(K\)/i);
  });

  it("generates the McCabe-Thiele diagram from the binary equilibrium data", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/^Componente 1$/i, "wat", "Water");
    await selectComboboxOption(/^Componente 2$/i, "eth", "Ethanol");
    fireEvent.click(screen.getByRole("button", { name: /Gerar diagrama/i }));

    const mccabeChart = await screen.findByTestId("mccabe-thiele-chart");
    expect(within(mccabeChart).getByRole("img", { name: /McCabe-Thiele/i })).toBeInTheDocument();
    expect(within(mccabeChart).getAllByText(/xD/i).length).toBeGreaterThan(0);
    expect(within(mccabeChart).getAllByText(/xB/i).length).toBeGreaterThan(0);
    expect(mccabeChart.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/x\s*\(líquido\)/i);
    expect(mccabeChart.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/y\s*\(vapor\)/i);
  });

  it("generates the property surface heatmap from the selected fluid and property", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/^Fluido$/i, "wat", "Water");
    await selectComboboxOption(/^Propriedade$/i, "den", /Densidade/i);
    fireEvent.change(screen.getByLabelText(/Temperatura mínima/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/Temperatura máxima/i), {
      target: { value: "400" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão mínima/i), {
      target: { value: "101325" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão máxima/i), {
      target: { value: "500000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gerar superfície/i }));

    const surface = await screen.findByTestId("property-surface-heatmap");
    expect(within(surface).getByRole("img", { name: /Superfície de propriedades/i })).toBeInTheDocument();
    expect(within(surface).getAllByText(/Water/i).length).toBeGreaterThan(0);
    expect(within(surface).getAllByText(/Densidade/i).length).toBeGreaterThan(0);
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

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
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

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/Fluido crítico/i, "wat", "Water");
    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));
    await selectComboboxOption(/Fluido crítico/i, "eth", "Ethanol");

    await selectComboboxOption(/Fluido puro/i, "wat", "Water");
    await selectComboboxOption(/Propriedades do fluido/i, "den", /Densidade/i);
    fireEvent.change(screen.getByLabelText(/Temperatura do fluido/i), {
      target: { value: "298.15" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão do fluido/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Calcular propriedades$/i }));

    fireEvent.change(screen.getByLabelText(/Temperatura do fluido/i), {
      target: { value: "300" },
    });

    await selectComboboxOption(/Mistura componente 1/i, "wat", "Water");
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    await selectComboboxOption(/Mistura componente 2/i, "eth", "Ethanol");
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
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.6" },
    });
  });

  it("clears the state-property result when a dependent state input changes", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/Fluido de estado/i, "wat", "Water");
    await selectComboboxOption(/Variável 1/i, "pre", /Pressão \(P\)/i);
    fireEvent.change(screen.getByLabelText(/Valor 1/i), {
      target: { value: "10000" },
    });
    await selectComboboxOption(/Variável 2/i, "tit", /Título \(Q\)/i);
    fireEvent.change(screen.getByLabelText(/Valor 2/i), {
      target: { value: "0" },
    });
    await selectComboboxOption(/Propriedade de saída/i, "ent", /Entalpia \(H\)/i);
    fireEvent.click(screen.getByRole("button", { name: /Calcular por estado/i }));

    await expectRowValueMath(/^Entalpia$/i);
    expectRowUnitText(/^Entalpia$/i, "J/kg");

    fireEvent.change(screen.getByLabelText(/Valor 1/i), {
      target: { value: "12000" },
    });

    expect(getRowContaining(/^Entalpia$/i)).toBeUndefined();
  });

  it("shows an error notification when state-property lookup fails", async () => {
    mockComponentsRequests({ stateError: "Falha no backend por estado" });

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/Fluido de estado/i, "wat", "Water");
    await selectComboboxOption(/Variável 1/i, "pre", /Pressão \(P\)/i);
    fireEvent.change(screen.getByLabelText(/Valor 1/i), {
      target: { value: "10000" },
    });
    await selectComboboxOption(/Variável 2/i, "tit", /Título \(Q\)/i);
    fireEvent.change(screen.getByLabelText(/Valor 2/i), {
      target: { value: "0" },
    });
    await selectComboboxOption(/Propriedade de saída/i, "ent", /Entalpia \(H\)/i);
    fireEvent.click(screen.getByRole("button", { name: /Calcular por estado/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao obter propriedade por estado: Falha no backend por estado",
      );
    });
  });

  it("rejects the state-property form when required fields are missing", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
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

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/Mistura componente 1/i, "wat", "Water");
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    await selectComboboxOption(/Mistura componente 2/i, "eth", "Ethanol");
    fireEvent.change(screen.getByLabelText(/Fração molar 2/i), {
      target: { value: "0.3" },
    });
    fireEvent.change(screen.getByLabelText(/Temperatura da mistura/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão da mistura/i), {
      target: { value: "101325" },
    });
    await selectComboboxOption(/Propriedades da mistura/i, "den", /Densidade/i);
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
    expect(getRowContaining(/^Densidade$/i)).toBeUndefined();
    });
  });

  it("shows an error notification when critical properties lookup fails", async () => {
    mockComponentsRequests({ criticalError: "Falha no backend crítico" });

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/Fluido crítico/i, "wat", "Water");
    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith(
        "Erro ao obter propriedades críticas: Falha no backend crítico",
      );
    });
  });

  it("rejects the critical properties form when no fluid is selected", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/components/list") && method === "GET") {
        return Response.json([]);
      }

      if (url.endsWith("/api/components/property-names") && method === "GET") {
        return Response.json({});
      }

      if (url.endsWith("/api/components/property-mixture-names") && method === "GET") {
        return Response.json({});
      }

      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith("Selecione um fluido");
    });
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/components/critical-properties")),
    ).toBe(false);
  });

  it("shows an error notification when pure property lookup fails", async () => {
    mockComponentsRequests({ propertyError: "Falha no backend puro" });

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/Fluido puro/i, "wat", "Water");
    await selectComboboxOption(/Propriedades do fluido/i, "den", /Densidade/i);
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

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/Fluido puro/i, "wat", "Water");
    fireEvent.click(screen.getByRole("button", { name: /^Calcular propriedades$/i }));

    expect(notifyMock.error).toHaveBeenCalledWith("Preencha todos os campos obrigatórios");
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/components/property"))).toBe(false);
  });

  it("shows an error notification when mixture property lookup fails", async () => {
    mockComponentsRequests({ mixtureError: "Falha no backend da mistura" });

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/Mistura componente 1/i, "wat", "Water");
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    await selectComboboxOption(/Mistura componente 2/i, "eth", "Ethanol");
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

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
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

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await selectComboboxOption(/Mistura componente 1/i, "wat", "Water");
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    await selectComboboxOption(/Mistura componente 2/i, "eth", "Ethanol");
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
