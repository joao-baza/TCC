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

async function expectRowUnitMath(text: string | RegExp) {
  await waitFor(() => {
    const row = getRowContaining(text);
    const unitCell = row?.querySelector("td:nth-child(3)");

    expect(unitCell?.querySelector(".katex")).not.toBeNull();
  });
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
  success: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  notify: notifyMock,
}));

const fetchMock = vi.fn<typeof fetch>();

const binaryChartModel = {
  id: "components-binary-vle-chart",
  title: "Diagrama T-x-y binário",
  subtitle: "Acetone / Water a 101325 Pa",
  axes: {
    x: {
      scale: "linear",
      label: "Fração molar de Acetone",
      units: "adimensional",
      domain: { min: 0, max: 1 },
      ticks: [0, 0.25, 0.5, 0.75, 1],
      major_ticks: [0, 0.25, 0.5, 0.75, 1],
    },
    y: {
      scale: "linear",
      label: "Temperatura",
      units: "K",
      domain: { min: 350, max: 375 },
      ticks: [350, 356.25, 362.5, 368.75, 375],
      major_ticks: [350, 356.25, 362.5, 368.75, 375],
    },
  },
  series: [
    {
      id: "bubble-curve",
      name: "Curva de bolha",
      kind: "line",
      color: "#0f766e",
      points: [{ x: 0, y: 351.2 }, { x: 0.5, y: 363.4 }, { x: 1, y: 373.2 }],
    },
    {
      id: "dew-curve",
      name: "Curva de orvalho",
      kind: "line",
      color: "#b45309",
      points: [{ x: 0, y: 351.2 }, { x: 0.4, y: 359.1 }, { x: 1, y: 373.2 }],
    },
  ],
  markers: [],
  annotations: [],
  metadata: { version: "1.0", units: { x: "adimensional", y: "K" } },
};

const mccabeChartModel = {
  id: "components-mccabe-thiele-chart",
  title: "McCabe-Thiele",
  subtitle: "Acetone / Water",
  axes: {
    x: {
      scale: "linear",
      label: "x (líquido)",
      units: "fração molar",
      domain: { min: 0, max: 1 },
      ticks: [0, 0.25, 0.5, 0.75, 1],
      major_ticks: [0, 0.25, 0.5, 0.75, 1],
    },
    y: {
      scale: "linear",
      label: "y (vapor)",
      units: "fração molar",
      domain: { min: 0, max: 1 },
      ticks: [0, 0.25, 0.5, 0.75, 1],
      major_ticks: [0, 0.25, 0.5, 0.75, 1],
    },
  },
  series: [
    {
      id: "diagonal",
      name: "Diagonal",
      kind: "line",
      color: "#94a3b8",
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    },
    {
      id: "equilibrium-curve",
      name: "Curva de equilíbrio",
      kind: "line",
      color: "#2563eb",
      points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.7 }, { x: 1, y: 1 }],
    },
    {
      id: "rectifying-line",
      name: "Linha de enriquecimento",
      kind: "line",
      color: "#0f766e",
      points: [{ x: 0, y: 0.95 }, { x: 1, y: 0.95 }],
    },
    {
      id: "stripping-line",
      name: "Linha de esgotamento",
      kind: "line",
      color: "#b45309",
      points: [{ x: 0, y: 0.05 }, { x: 1, y: 0.05 }],
    },
    {
      id: "q-line",
      name: "Linha q",
      kind: "line",
      color: "#7c3aed",
      points: [{ x: 0.7, y: 0 }, { x: 0.7, y: 1 }],
    },
    {
      id: "stage-steps",
      name: "Estágios",
      kind: "line",
      color: "#dc2626",
      points: [{ x: 0.95, y: 0.95 }, { x: 0.6, y: 0.95 }, { x: 0.6, y: 0.78 }],
    },
  ],
  markers: [
    { id: "xD", x: 0.95, y: 0.95, label: "xD", color: "#0f172a" },
    { id: "xB", x: 0.05, y: 0.05, label: "xB", color: "#0f172a" },
    { id: "zF", x: 0.7, y: 0.7, label: "zF", color: "#475569" },
  ],
  annotations: [],
  metadata: { version: "1.0", units: { x: "fração molar", y: "fração molar" } },
};

const phaseEnvelopeChartModel = {
  id: "components-phase-envelope-chart",
  title: "Envelope de fase",
  subtitle: "R1234ze(E)",
  axes: {
    x: {
      scale: "linear",
      label: "Entropia",
      units: "J/(kg·K)",
      domain: { min: 100, max: 6200 },
      ticks: [100, 1625, 3150, 4675, 6200],
      major_ticks: [100, 1625, 3150, 4675, 6200],
    },
    y: {
      scale: "linear",
      label: "Temperatura",
      units: "K",
      domain: { min: 273.16, max: 647.1 },
      ticks: [273.16, 366.64, 460.13, 553.61, 647.1],
      major_ticks: [273.16, 366.64, 460.13, 553.61, 647.1],
    },
  },
  series: [
    {
      id: "two-phase-region",
      name: "Região bifásica",
      kind: "band",
      color: "#93c5fd",
      points: [{ x: 100, y: 300 }, { x: 1200, y: 450 }, { x: 2000, y: 600 }, { x: 6200, y: 600 }, { x: 4200, y: 450 }, { x: 1100, y: 300 }],
    },
    {
      id: "liquid-curve",
      name: "Curva de líquido saturado",
      kind: "line",
      color: "#0f766e",
      points: [{ x: 100, y: 300 }, { x: 1200, y: 450 }, { x: 2000, y: 600 }],
    },
    {
      id: "vapor-curve",
      name: "Curva de vapor saturado",
      kind: "line",
      color: "#b45309",
      points: [{ x: 1100, y: 300 }, { x: 4200, y: 450 }, { x: 6200, y: 600 }],
    },
  ],
  markers: [
    { id: "triple-point", x: 100, y: 273.16, color: "#0f766e" },
    { id: "critical-point", x: 6200, y: 647.1, color: "#b45309" },
  ],
  annotations: [],
  metadata: { version: "1.0", units: { x: "J/(kg·K)", y: "K" } },
};

const vaporPressureChartModel = {
  id: "components-vapor-pressure-chart",
  title: "Curva de pressão de vapor",
  subtitle: "Relação P_sat(T) para R1234ze(E).",
  axes: {
    x: {
      scale: "linear",
      label: "Temperatura",
      units: "K",
      domain: { min: 273.16, max: 647.1 },
      ticks: [273.16, 366.64, 460.13, 553.61, 647.1],
      major_ticks: [273.16, 366.64, 460.13, 553.61, 647.1],
    },
    y: {
      scale: "log",
      label: "Pressão de saturação",
      units: "Pa",
      domain: { min: 611.657, max: 22064000 },
      ticks: [1000, 10000, 100000, 1000000, 10000000],
      major_ticks: [1000, 10000, 100000, 1000000, 10000000],
    },
  },
  series: [
    {
      id: "vapor-pressure-curve",
      name: "Pressão de vapor",
      kind: "line",
      color: "#0f766e",
      points: [
        { x: 300, y: 3537 },
        { x: 450, y: 93000 },
        { x: 600, y: 12300000 },
      ],
    },
  ],
  markers: [
    { id: "triple-point", x: 273.16, y: 611.657, color: "#b45309" },
    { id: "critical-point", x: 647.1, y: 22064000, color: "#1d4ed8" },
  ],
  annotations: [],
  metadata: { version: "1.0", units: { x: "K", y: "Pa" } },
};

const ternaryChartPayload = {
  id: "components-ternary-diagram-chart",
  title: "Diagrama ternário",
  component_labels: ["Water", "Ethanol", "Methanol"],
  boundary: [{ x: 66, y: 352 }, { x: 694, y: 352 }, { x: 380, y: 40 }],
  guide_lines: [
    { start: { x: 144, y: 274 }, end: { x: 536, y: 274 } },
    { start: { x: 105, y: 196 }, end: { x: 458, y: 196 } },
    { start: { x: 223, y: 118 }, end: { x: 615, y: 118 } },
  ],
  streams: [
    {
      label: "Corrente atual",
      summary: "Water: 0.7 · Ethanol: 0.2 · Methanol: 0.1",
      x: 286,
      y: 321,
      color: "#2563eb",
    },
  ],
};

const propertySurfaceChartPayload = {
  id: "components-property-surface-chart",
  title: "Superfície T-P",
  subtitle: "Water · Massa específica",
  fluid: "Water",
  property_label: "Massa específica",
  property_units: "kg/m³",
  x_axis: {
    scale: "linear",
    label: "Temperatura",
    units: "K",
    domain: { min: 300, max: 400 },
    ticks: [300, 325, 350, 375, 400],
    major_ticks: [300, 325, 350, 375, 400],
  },
  y_axis: {
    scale: "linear",
    label: "Pressão",
    units: "Pa",
    domain: { min: 101325, max: 500000 },
    ticks: [101325, 201000, 300675, 400337.5, 500000],
    major_ticks: [101325, 201000, 300675, 400337.5, 500000],
  },
  cells: [
    { x: 300, y: 101325, width: 50, height: 132891.6667, value: 997, fill: "hsl(232 58% 94%)", tooltip: "300 K · 101.325 kPa · Massa específica = 997 kg/m³" },
    { x: 350, y: 101325, width: 50, height: 132891.6667, value: 992, fill: "hsl(180 70% 60%)", tooltip: "350 K · 101.325 kPa · Massa específica = 992 kg/m³" },
    { x: 400, y: 101325, width: 50, height: 132891.6667, value: 989, fill: "hsl(120 74% 56%)", tooltip: "400 K · 101.325 kPa · Massa específica = 989 kg/m³" },
  ],
  legend_stops: [
    { offset: 0, color: "#0f766e", value: 951 },
    { offset: 0.33, color: "#2563eb", value: 966.18 },
    { offset: 0.66, color: "#d97706", value: 981.36 },
    { offset: 1, color: "#b91c1c", value: 997 },
  ],
  value_min: 951,
  value_max: 997,
};

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
      return Response.json([
        "Air",
        "Water",
        "Ethanol",
        "Methanol",
        "Acetone",
        "R1234ze(E)",
        "Propane",
      ]);
    }

    if (url.endsWith("/api/components/property-names") && method === "GET") {
      return Response.json({
        C: "Specific heat [J/(kg·K)]",
        D: "Massa específica [kg/m³]",
        V: "Viscosity [Pa·s]",
        Z: "Compressibility factor [-]",
        M: "Molar mass [kg/mol]",
      });
    }

    if (url.endsWith("/api/components/property-mixture-names") && method === "GET") {
      return Response.json({
        D: "Massa específica [kg/m³]",
        M: "Molar mass [kg/mol]",
        V: "Viscosity [Pa·s]",
        C: "Calor específico [J/(kg·K)]",
      });
    }

    if (url.endsWith("/api/components/example") && method === "GET") {
      return Response.json({
        pure_fluid: {
          fluid: "Air",
          property_names: ["C", "D", "V", "Z", "M"],
          temperature: 353.15,
          pressure: 101325,
        },
        mixtures: {
          fluid_fractions: {
            Water: 0.7,
            Ethanol: 0.29,
            Methanol: 0.01,
          },
          temperature: 303.15,
          pressure: 101325,
          properties: ["D", "M", "V", "C"],
        },
        ternary_diagram: {
          component_a: "Water",
          component_b: "Ethanol",
          component_c: "Methanol",
          fraction_a: 0.7,
          fraction_b: 0.29,
          fraction_c: 0.1,
        },
        binary_vle: {
          fluid1: "Acetone",
          fluid2: "Water",
          pressure: 101325,
          sample_count: 30,
        },
        mccabe_thiele: {
          distillate_composition: 0.95,
          bottoms_composition: 0.05,
          feed_composition: 0.7,
          reflux_ratio: 3,
          q_value: 1,
          max_stages: 10,
        },
        property_surface: {
          fluid: "Ethanol",
          property_name: "C",
          temperature_min: 263.15,
          temperature_max: 383.15,
          pressure_min: 50662.5,
          pressure_max: 101326,
          temperature_samples: 20,
          pressure_samples: 20,
        },
        phase_envelope: {
          fluid: "R1234ze(E)",
          sample_count: 40,
        },
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

    if (url.endsWith("/api/components/ternary-diagram/chart") && method === "POST") {
      return Response.json(ternaryChartPayload);
    }

    if (url.endsWith("/api/components/binary-vle/chart") && method === "POST") {
      return Response.json(binaryChartModel);
    }

    if (url.endsWith("/api/components/mccabe-thiele/chart") && method === "POST") {
      return Response.json(mccabeChartModel);
    }

    if (url.endsWith("/api/components/property-surface/chart") && method === "POST") {
      return Response.json(propertySurfaceChartPayload);
    }

    if (url.endsWith("/api/components/phase-envelope/chart") && method === "POST") {
      return Response.json(phaseEnvelopeChartModel);
    }

    if (url.endsWith("/api/components/vapor-pressure/chart") && method === "POST") {
      return Response.json(vaporPressureChartModel);
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
          density: { value: 812.5, units: "kilogram / meter ** 3" },
          molecular_weight: { value: 0.018, units: "kilogram / mole" },
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
  await waitFor(() => {
    expect(screen.queryAllByRole("option", { hidden: true }).length).toBeGreaterThan(0);
  }, { timeout: 3000 });

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

async function openComponentsTab(name: RegExp) {
  fireEvent.click(screen.getByRole("tab", { name }));
  await waitFor(() => {
    expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  });
}

describe("ComponentsPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    notifyMock.error.mockReset();
    notifyMock.success.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders mixture properties using semantic response keys", async () => {
    const mixtureRequests: Array<Record<string, unknown>> = [];

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

    if (url.endsWith("/api/components/list") && method === "GET") {
      return Response.json([
        "Air",
        "Water",
        "Ethanol",
        "Methanol",
        "Acetone",
        "R1234ze(E)",
        "Propane",
      ]);
    }

    if (url.endsWith("/api/components/property-names") && method === "GET") {
      return Response.json({
        C: "Specific heat [J/(kg·K)]",
        D: "Massa específica [kg/m³]",
        V: "Viscosity [Pa·s]",
        Z: "Compressibility factor [-]",
        M: "Molar mass [kg/mol]",
      });
    }

    if (url.endsWith("/api/components/property-mixture-names") && method === "GET") {
      return Response.json({
        D: "Massa específica [kg/m³]",
        M: "Massa molar [kg/mol]",
        V: "Viscosity [Pa·s]",
        C: "Calor específico [J/(kg·K)]",
      });
    }

    if (url.endsWith("/api/components/example") && method === "GET") {
      return Response.json({
        pure_fluid: {
          fluid: "Air",
          property_names: ["C", "D", "V", "Z", "M"],
          temperature: 353.15,
          pressure: 101325,
        },
        mixtures: {
          fluid_fractions: {
            Water: 0.7,
            Ethanol: 0.29,
            Methanol: 0.01,
          },
          temperature: 303.15,
          pressure: 101325,
          properties: ["D", "M", "V", "C"],
        },
        ternary_diagram: {
          component_a: "Water",
          component_b: "Ethanol",
          component_c: "Methanol",
          fraction_a: 0.7,
          fraction_b: 0.29,
          fraction_c: 0.1,
        },
        binary_vle: {
          fluid1: "Acetone",
          fluid2: "Water",
          pressure: 101325,
          sample_count: 30,
        },
        mccabe_thiele: {
          distillate_composition: 0.95,
          bottoms_composition: 0.05,
          feed_composition: 0.7,
          reflux_ratio: 3,
          q_value: 1,
          max_stages: 10,
        },
        property_surface: {
          fluid: "Ethanol",
          property_name: "C",
          temperature_min: 263.15,
          temperature_max: 383.15,
          pressure_min: 50662.5,
          pressure_max: 101326,
          temperature_samples: 20,
          pressure_samples: 20,
        },
        phase_envelope: {
          fluid: "R1234ze(E)",
          sample_count: 40,
        },
      });
    }

      if (url.endsWith("/api/components/mixture-properties") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        mixtureRequests.push(body);

        return Response.json({
          properties: {
            density: { value: 812.5, units: "kilogram / meter ** 3" },
            molecular_weight: { value: 0.018, units: "kilogram / mole" },
          },
        });
      }

      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    const router = createMemoryRouter(await getRoutes(), {
      initialEntries: ["/components/mixtures"],
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 2, name: /^Misturas$/i })).toBeInTheDocument();

    await openComponentsTab(/Misturas/i);
    await selectComboboxOption(/Mistura componente 1/i, "wat", "Water");
    fireEvent.change(screen.getByLabelText(/Fração molar 1/i), {
      target: { value: "0.7" },
    });
    await selectComboboxOption(/Mistura componente 2/i, "eth", "Ethanol");
    fireEvent.change(screen.getByLabelText(/Fração molar 2/i), {
      target: { value: "0.3" },
    });
    fireEvent.change(screen.getByLabelText(/Temperatura da mistura/i), {
      target: { value: "303.15" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão da mistura/i), {
      target: { value: "101325" },
    });
    await selectComboboxOption(/Propriedades da mistura/i, "mass", /Massa específica/i);
    await selectComboboxOption(/Propriedades da mistura/i, "mol", /Massa molar/i);
    fireEvent.click(screen.getByRole("button", { name: /Calcular mistura/i }));

    expect(mixtureRequests).toEqual([
      {
        fluid_fractions: {
          Water: 0.7,
          Ethanol: 0.3,
        },
        temperature: 303.15,
        pressure: 101325,
        properties: ["D", "M"],
      },
    ]);

    expect(await screen.findByText(/Composição da mistura/i)).toBeInTheDocument();
    expect(screen.getByText(/Water: 0.7/i)).toBeInTheDocument();
    expect(screen.getByText(/Ethanol: 0.3/i)).toBeInTheDocument();
    await expectRowValueMath(/Massa específica/i, "812,5");
    await expectRowValueMath(/Massa molar/i, "0,018");
  }, 10000);

  it("loads a representative example across the component module and auto-calculates derived tabs", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await openComponentsTab(/Propriedades Críticas/i);
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await openComponentsTab(/Fluido Puro/i);
    expect(screen.getByLabelText(/Temperatura do fluido/i)).toHaveValue(353.15);
    expect(screen.getByLabelText(/Pressão do fluido/i)).toHaveValue(101325);
    expect(screen.getByRole("button", { name: /Remover Calor específico/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remover Massa específica/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remover Viscosidade/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Remover Fator de compressibilidade/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remover Massa molar/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /^Fluido$/i })).toHaveValue("Etanol");
      expect(screen.getByRole("combobox", { name: /^Propriedade$/i })).toHaveValue(
        "Calor específico [J/(kg·K)]",
      );
      expect(screen.getByLabelText(/Temperatura mínima/i)).toHaveValue(263.15);
      expect(screen.getByLabelText(/Temperatura máxima/i)).toHaveValue(383.15);
      expect(screen.getByLabelText(/Pressão mínima/i)).toHaveValue(50662.5);
      expect(screen.getByLabelText(/Pressão máxima/i)).toHaveValue(101326);
      expect(screen.getByLabelText(/Amostras T/i)).toHaveValue(20);
      expect(screen.getByLabelText(/Amostras P/i)).toHaveValue(20);
    });
    const propertySurface = await screen.findByTestId("property-surface-heatmap");
    expect(within(propertySurface).getByRole("img", { name: /Superfície T-P/i })).toBeInTheDocument();

    await openComponentsTab(/Misturas/i);
    expect(screen.getByLabelText(/Mistura componente 1/i)).toHaveValue("Água");
    expect(screen.getByLabelText(/Mistura componente 2/i)).toHaveValue("Etanol");
    expect(screen.getByLabelText(/Mistura componente 3/i)).toHaveValue("Methanol");
    expect(screen.getByLabelText(/Fração molar 1/i)).toHaveValue(0.7);
    expect(screen.getByLabelText(/Fração molar 2/i)).toHaveValue(0.29);
    expect(screen.getByLabelText(/Fração molar 3/i)).toHaveValue(0.01);
    expect(screen.getByLabelText(/Componente A/i)).toHaveValue("Água");
    expect(screen.getByLabelText(/Componente B/i)).toHaveValue("Etanol");
    expect(screen.getByLabelText(/Componente C/i)).toHaveValue("Methanol");
    expect(screen.getByLabelText(/Fração A/i)).toHaveValue(0.7);
    expect(screen.getByLabelText(/Fração B/i)).toHaveValue(0.29);
    expect(screen.getByLabelText(/Fração C/i)).toHaveValue(0.1);
    expect(screen.getByLabelText(/Nome da corrente/i)).toHaveValue("Corrente atual");
    const ternaryDiagram = screen.getByTestId("ternary-diagram");
    expect(within(ternaryDiagram).getByText("Water")).toBeInTheDocument();
    expect(within(ternaryDiagram).getByText("Ethanol")).toBeInTheDocument();
    expect(within(ternaryDiagram).getByText("Methanol")).toBeInTheDocument();
    expect(await screen.findByText(/Composição da mistura/i)).toBeInTheDocument();
    await expectRowValueMath(/Massa específica/i, "812,5");

    await openComponentsTab(/Equilíbrio Binário/i);
    expect(screen.getByLabelText(/Componente 1/i)).toHaveValue("Acetone");
    expect(screen.getByLabelText(/Componente 2/i)).toHaveValue("Água");
    expect(screen.getByLabelText(/Pressão \(Pa\)/i)).toHaveValue(101325);
    expect(screen.getByLabelText(/Amostras por curva/i)).toHaveValue(30);
    expect(screen.getByLabelText(/^xD$/i)).toHaveValue(0.95);
    expect(screen.getByLabelText(/^xB$/i)).toHaveValue(0.05);
    expect(screen.getByLabelText(/^zF$/i)).toHaveValue(0.7);
    expect(screen.getByLabelText(/Refluxo/i)).toHaveValue(3);
    expect(screen.getByLabelText(/^q$/i)).toHaveValue(1);
    expect(screen.getByLabelText(/Máx\. estágios/i)).toHaveValue(10);

    await openComponentsTab(/Envelope de Fase/i);
    expect(screen.getByLabelText(/Fluido do envelope/i)).toHaveValue("R1234ze(E)");
    expect(screen.getByLabelText(/Quantidade de pontos/i)).toHaveValue(40);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls
          .filter(([, init]) => init?.method === "POST")
          .map(([url]) => String(url))
          .sort(),
      ).toEqual([
        "/api/components/binary-vle/chart",
        "/api/components/mccabe-thiele/chart",
        "/api/components/mixture-properties",
        "/api/components/phase-envelope/chart",
        "/api/components/property",
        "/api/components/property",
        "/api/components/property",
        "/api/components/property",
        "/api/components/property",
        "/api/components/property-surface/chart",
        "/api/components/saturation-envelope",
        "/api/components/ternary-diagram/chart",
        "/api/components/vapor-pressure/chart",
      ].sort());
    });
  });

  it("exposes temperature and pressure units in the component forms", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await openComponentsTab(/Fluido Puro/i);
    expect(screen.getByLabelText(/Temperatura do fluido \(K\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pressão do fluido \(Pa\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Temperatura mínima \(K\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Temperatura máxima \(K\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pressão mínima \(Pa\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pressão máxima \(Pa\)/i)).toBeInTheDocument();

    await openComponentsTab(/Misturas/i);
    expect(screen.getByLabelText(/Temperatura da mistura \(K\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pressão da mistura \(Pa\)/i)).toBeInTheDocument();
  });

  it("keeps the worked example button disabled until the derived processing finishes", async () => {
    const componentsRequests = mockComponentsRequests({ delayMixture: true });

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await openComponentsTab(/Propriedades Críticas/i);

    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Carregar exemplo/i })).toBeDisabled();
    });

    componentsRequests.resolveMixture(
      Response.json({
        properties: {
          density: { value: 812.5, units: "kilogram / meter ** 3" },
          molecular_weight: { value: 0.018, units: "kilogram / mole" },
        },
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Carregar exemplo/i })).not.toBeDisabled();
    });
    expect(notifyMock.success).toHaveBeenCalledWith("Exemplo carregado com sucesso.");
  });

  it("generates the binary T-x-y / y-x diagram from the selected pure components", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await openComponentsTab(/Equilíbrio Binário/i);
    await selectComboboxOption(/^Componente 1$/i, "ace", "Acetone");
    await selectComboboxOption(/^Componente 2$/i, "wat", "Water");
    fireEvent.change(screen.getByLabelText(/Pressão \(Pa\)/i), {
      target: { value: "101325" },
    });
    fireEvent.change(screen.getByLabelText(/Amostras por curva/i), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gerar diagrama/i }));

    const binaryChart = await screen.findByRole("img", { name: /Diagrama T-x-y binário/i });
    expect(binaryChart).toBeInTheDocument();
    expect(screen.getAllByText(/Fração molar de Acetone \(adimensional\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Temperatura \(K\)/i).length).toBeGreaterThan(0);
  });

  it("generates the McCabe-Thiele diagram from the binary equilibrium data", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await openComponentsTab(/Equilíbrio Binário/i);
    await selectComboboxOption(/^Componente 1$/i, "ace", "Acetone");
    await selectComboboxOption(/^Componente 2$/i, "wat", "Water");
    fireEvent.change(screen.getByLabelText(/Pressão \(Pa\)/i), {
      target: { value: "101325" },
    });
    fireEvent.change(screen.getByLabelText(/Amostras por curva/i), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gerar diagrama/i }));

    const binaryChart = await screen.findByRole("img", { name: /Diagrama T-x-y binário/i });
    expect(binaryChart).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^xD$/i), {
      target: { value: "0.95" },
    });
    fireEvent.change(screen.getByLabelText(/^xB$/i), {
      target: { value: "0.05" },
    });
    fireEvent.change(screen.getByLabelText(/^zF$/i), {
      target: { value: "0.7" },
    });
    fireEvent.change(screen.getByLabelText(/Refluxo/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/^q$/i), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/Máx\. estágios/i), {
      target: { value: "10" },
    });
    expect(screen.queryByRole("img", { name: /McCabe-Thiele/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Gerar McCabe-Thiele/i }));

    const mccabeChart = await screen.findByRole("img", { name: /McCabe-Thiele/i });
    expect(mccabeChart).toBeInTheDocument();
    expect(screen.getAllByText(/x \(líquido\) \(fração molar\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/y \(vapor\) \(fração molar\)/i).length).toBeGreaterThan(0);
    expect(screen.getByText("y = x")).toBeInTheDocument();
    expect(screen.getByText("Curva de equilíbrio")).toBeInTheDocument();
    expect(screen.getByText("Linha de enriquecimento")).toBeInTheDocument();
    expect(screen.getByText("Linha de esgotamento")).toBeInTheDocument();
    expect(screen.getByText("Linha q")).toBeInTheDocument();
    expect(screen.getByText("xD = 0,95").closest("li")).toHaveStyle({
      borderColor: "rgb(15, 23, 42)",
      color: "rgb(15, 23, 42)",
    });
    expect(screen.getByText("xB = 0,05").closest("li")).toHaveStyle({
      borderColor: "rgb(22, 163, 74)",
      color: "rgb(22, 163, 74)",
    });
    expect(screen.getByText("zF = 0,7").closest("li")).toHaveStyle({
      borderColor: "rgb(71, 85, 105)",
      color: "rgb(71, 85, 105)",
    });
    expect(screen.getAllByText(/^xD$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^xB$/i).length).toBeGreaterThan(0);
  });

  it("redirects the legacy McCabe-Thiele path to the binary equilibrium tab", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), {
      initialEntries: ["/components/mccabe-thiele"],
    });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/components/binary-vle");
    });
    expect(screen.queryByRole("tab", { name: /McCabe-Thiele/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Carregar exemplo/i }));
    await openComponentsTab(/Equilíbrio Binário/i);
    await waitFor(() => {
      expect(screen.getByLabelText(/Componente 1/i)).toHaveValue("Acetone");
      expect(screen.getByLabelText(/^xD$/i)).toHaveValue(0.95);
    });
  });

  it("generates the property surface heatmap from the selected fluid and property", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await openComponentsTab(/Fluido Puro/i);
    await selectComboboxOption(/^Fluido$/i, "wat", "Water");
    await selectComboboxOption(/^Propriedade$/i, "mass", /Massa específica/i);
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
    expect(within(surface).getByRole("img", { name: /Superfície T-P de Massa específica para Water/i })).toBeInTheDocument();
    expect(within(surface).getAllByText(/Water/i).length).toBeGreaterThan(0);
    expect(within(surface).getAllByText(/Massa específica/i).length).toBeGreaterThan(0);
  });

  it("clears calculated outputs when dependent component inputs change", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await openComponentsTab(/Propriedades Críticas/i);
    await selectComboboxOption(/Fluido crítico/i, "wat", "Water");
    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));
    await selectComboboxOption(/Fluido crítico/i, "eth", "Ethanol");

    await openComponentsTab(/Fluido Puro/i);
    await selectComboboxOption(/Fluido puro/i, "wat", "Water");
    await selectComboboxOption(/Propriedades do fluido/i, "mass", /Massa específica/i);
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

    await openComponentsTab(/Misturas/i);
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

  it("ignores delayed mixture responses after the mixture inputs change", async () => {
    const componentsRequests = mockComponentsRequests({ delayMixture: true });

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await openComponentsTab(/Misturas/i);
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
    await selectComboboxOption(/Propriedades da mistura/i, "mass", /Massa específica/i);
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
    expect(getRowContaining(/^Massa específica$/i)).toBeUndefined();
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

  it("renders compound units with KaTeX in critical properties and pure fluid results", async () => {
    mockComponentsRequests();

    const router = createMemoryRouter(await getRoutes(), { initialEntries: ["/components"] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Propriedades de Componentes/i }),
    ).toBeInTheDocument();

    await openComponentsTab(/Propriedades Críticas/i);
    await selectComboboxOption(/Fluido crítico/i, "wat", "Water");
    fireEvent.click(screen.getByRole("button", { name: /Obter propriedades críticas/i }));

    await expectRowUnitMath(/Massa específica crítica/i);

    await openComponentsTab(/Fluido Puro/i);
    await selectComboboxOption(/Fluido puro/i, "wat", "Water");
    await selectComboboxOption(/Propriedades do fluido/i, "mass", /Massa específica/i);
    fireEvent.change(screen.getByLabelText(/Temperatura do fluido/i), {
      target: { value: "298.15" },
    });
    fireEvent.change(screen.getByLabelText(/Pressão do fluido/i), {
      target: { value: "101325" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Calcular propriedades$/i }));

    await expectRowUnitMath(/^Massa específica$/i);
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

    await openComponentsTab(/Fluido Puro/i);
    await selectComboboxOption(/Fluido puro/i, "wat", "Water");
    await selectComboboxOption(/Propriedades do fluido/i, "mass", /Massa específica/i);
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

    await openComponentsTab(/Fluido Puro/i);
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

    await openComponentsTab(/Misturas/i);
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

    await openComponentsTab(/Misturas/i);
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

    await openComponentsTab(/Misturas/i);
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
