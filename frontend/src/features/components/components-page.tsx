import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { ResultTableSection } from "@/components/result-table-section";
import {
  CriticalPropertiesHowItWorks,
  MixturePropertiesHowItWorks,
  PurePropertiesHowItWorks,
} from "@/features/components/didactics";
import { BinaryVleChart } from "@/components/viz/binary-vle-chart";
import { McCabeThieleChart } from "@/components/viz/mccabe-thiele-chart";
import { PhaseEnvelopeChart } from "@/components/viz/phase-envelope-chart";
import { PropertySurfaceHeatmap } from "@/components/viz/property-surface-heatmap";
import { TernaryDiagram } from "@/components/viz/ternary-diagram";
import { VaporPressureCurve } from "@/components/viz/vapor-pressure-curve";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { toSelectOption, type SelectOption } from "@/lib/select-option";
import type { PropertyRow } from "@/components/property-table";
import { componentsTabs } from "@/features/components/components-tabs";
import type { AxisModel, ChartModel } from "@/types/chart-model";

type QuantityResult = {
  value: number;
  units: string;
};

type CriticalPropertiesResponse = Record<string, number | string>;
type PropertyNamesResponse = Record<string, string>;
type MixturePropertiesResponse = {
  properties: Record<string, QuantityResult>;
};

type StatePropertyResponse = QuantityResult;

type CriticalPropertyRow = {
  key: string;
  label: string;
  value: number | string;
  units?: string;
};

type PropertyResultRow = {
  key: string;
  label: string;
  value: number | string;
  units?: string;
};

type MixtureRow = {
  id: number;
  component: string;
  fraction: string;
};

type SaturationEnvelopePoint = {
  temperature: number;
  pressure: number;
  liquid_entropy: number;
  vapor_entropy: number;
  liquid_enthalpy: number;
  vapor_enthalpy: number;
};

type SaturationEnvelopeResponse = {
  fluid: string;
  critical: {
    temperature: number;
    pressure: number;
    density: number;
  };
  triple: {
    temperature: number;
    pressure: number;
  };
  points: SaturationEnvelopePoint[];
};

type TernaryChartResponse = {
  id: string;
  title: string;
  subtitle?: string | null;
  component_labels: string[];
  boundary: Array<{ x: number; y: number }>;
  guide_lines: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>;
  streams: Array<{ label: string; summary: string; x: number; y: number; color: string }>;
};

type PropertySurfaceChartResponse = {
  id: string;
  title: string;
  subtitle?: string | null;
  fluid: string;
  property_label: string;
  property_units: string;
  x_axis: AxisModel;
  y_axis: AxisModel;
  cells: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    value?: number | null;
    fill: string;
    tooltip: string;
  }>;
  legend_stops: Array<{ offset: number; color: string; value: number }>;
  value_min: number;
  value_max: number;
};

type TernaryFormState = {
  componentA: string;
  componentB: string;
  componentC: string;
  fractionA: string;
  fractionB: string;
  fractionC: string;
  streamName: string;
};

type PropertyFormState = {
  fluid: string;
  propertyNames: string[];
  temperature: string;
  pressure: string;
};

type MixtureFormState = {
  temperature: string;
  pressure: string;
  propertyNames: string[];
};

type StateFormState = {
  fluid: string;
  input1: string;
  value1: string;
  input2: string;
  value2: string;
  output: string;
};

type BinaryVleFormState = {
  fluid1: string;
  fluid2: string;
  pressure: string;
  sampleCount: string;
};

type MccabeFormState = {
  distillateComposition: string;
  bottomsComposition: string;
  feedComposition: string;
  refluxRatio: string;
  qValue: string;
  maxStages: string;
};

type PropertySurfaceFormState = {
  fluid: string;
  propertyName: string;
  temperatureMin: string;
  temperatureMax: string;
  pressureMin: string;
  pressureMax: string;
  temperatureSamples: string;
  pressureSamples: string;
};

type PhaseEnvelopeFormState = {
  fluid: string;
  sampleCount: string;
};

type ComponentsExampleResponse = {
  pure_fluid: {
    fluid: string;
    property_names: string[];
    temperature: number;
    pressure: number;
  };
  mixtures: {
    fluid_fractions: Record<string, number>;
    temperature: number;
    pressure: number;
    properties: string[];
  };
  ternary_diagram: {
    component_a: string;
    component_b: string;
    component_c: string;
    fraction_a: number;
    fraction_b: number;
    fraction_c: number;
  };
  binary_vle: {
    fluid1: string;
    fluid2: string;
    pressure: number;
    sample_count: number;
  };
  mccabe_thiele: {
    distillate_composition: number;
    bottoms_composition: number;
    feed_composition: number;
    reflux_ratio: number;
    q_value: number;
    max_stages: number;
  };
  property_surface: {
    fluid: string;
    property_name: string;
    temperature_min: number;
    temperature_max: number;
    pressure_min: number;
    pressure_max: number;
    temperature_samples: number;
    pressure_samples: number;
  };
  phase_envelope: {
    fluid: string;
    sample_count: number;
  };
};

type PropertyFormSnapshot = PropertyFormState;
type MixtureFormSnapshot = MixtureFormState;
type BinaryVleFormSnapshot = BinaryVleFormState;
type MccabeFormSnapshot = MccabeFormState;
type PropertySurfaceFormSnapshot = PropertySurfaceFormState;
type PhaseEnvelopeFormSnapshot = PhaseEnvelopeFormState;
type MixtureRowSnapshot = MixtureRow[];
type ExampleAutoRunSnapshot = {
  propertyForm: PropertyFormSnapshot;
  mixtureRows: MixtureRowSnapshot;
  mixtureForm: MixtureFormSnapshot;
  propertySurfaceForm: PropertySurfaceFormSnapshot;
  phaseEnvelopeForm: PhaseEnvelopeFormSnapshot;
  propertySessionId: number;
  mixtureSessionId: number;
  propertySurfaceSessionId: number;
  envelopeSessionId: number;
};
type ExampleBinaryAutoRunSnapshot = {
  binaryVleForm: BinaryVleFormSnapshot;
  mccabeForm: MccabeFormSnapshot;
};

const propertySurfaceKeys = new Set(["D", "C", "V", "L", "H", "S", "U", "A", "Z"]);

const propertyLabelsPt: Record<string, string> = {
  Density: "Massa específica",
  "Specific heat": "Calor específico",
  Viscosity: "Viscosidade",
  "Thermal conductivity": "Condutividade térmica",
  Enthalpy: "Entalpia",
  Entropy: "Entropia",
  "Molar mass": "Massa molar",
  "Surface tension": "Tensão superficial",
  Pressure: "Pressão",
  Temperature: "Temperatura",
  "Quality (vapor fraction)": "Título (fração de vapor)",
  "Internal energy": "Energia interna",
  "Speed of sound": "Velocidade do som",
  "Compressibility factor": "Fator de compressibilidade",
  "Bubble point temperature": "Temperatura do ponto de bolha",
  "Dew point temperature": "Temperatura do ponto de orvalho",
  "Bubble point pressure": "Pressão do ponto de bolha",
  "Dew point pressure": "Pressão do ponto de orvalho",
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400";

const stateVariableOptions = [
  { value: "P", label: "Pressão" },
  { value: "T", label: "Temperatura" },
  { value: "H", label: "Entalpia" },
  { value: "S", label: "Entropia" },
  { value: "Q", label: "Título" },
  { value: "D", label: "Massa específica" },
  { value: "U", label: "Energia interna" },
  { value: "Z", label: "Fator de compressibilidade" },
] as const;

const defaultStateVariables = {
  input1: "P",
  input2: "Q",
  output: "H",
};

const stateVariableComboboxOptions = stateVariableOptions.map((option) => ({
  value: option.value,
  label: `${option.label} (${option.value})`,
}));

function formatValue(value: unknown) {
  if (typeof value === "object" && value !== null && "value" in value && "units" in value) {
    const quantity = value as QuantityResult;
    return quantity.value;
  }

  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  return "—";
}

function translatePropertyLabel(description: string) {
  const bracketIndex = description.indexOf("[");
  const name = (bracketIndex >= 0 ? description.slice(0, bracketIndex) : description).trim();
  const units = bracketIndex >= 0 ? description.slice(bracketIndex) : "";
  const translated = propertyLabelsPt[name] ?? name;
  return units ? `${translated} ${units}` : translated;
}

function translatePropertyBaseLabel(description: string) {
  const bracketIndex = description.indexOf("[");
  const name = (bracketIndex >= 0 ? description.slice(0, bracketIndex) : description).trim();
  return propertyLabelsPt[name] ?? name;
}

function formatCriticalProperties(result: CriticalPropertiesResponse): PropertyRow[] {
  const criticalLabels: Record<string, string> = {
    critical_temperature: "Temperatura crítica",
    critical_pressure: "Pressão crítica",
    critical_density: "Massa específica crítica",
    triple_point_temperature: "Temperatura do ponto triplo",
    triple_point_pressure: "Pressão do ponto triplo",
  };

  return Object.entries(result).flatMap(([key, value]) => {
    if (key.endsWith("_units")) {
      return [];
    }

    const unitsKey = `${key}_units`;
    const units = typeof result[unitsKey] === "string" ? result[unitsKey] : undefined;

    return [
      {
        key,
        label: criticalLabels[key] ?? key,
        value: typeof value === "number" ? value : String(value),
        units,
      },
    ];
  });
}

function buildPropertyRows(
  propertyKeys: string[],
  propertyMap: Record<string, QuantityResult>,
  propertyNames: PropertyNamesResponse,
  resolveResultKey: (propertyKey: string) => string = (propertyKey) => propertyKey,
): PropertyRow[] {
  return propertyKeys.flatMap((propertyKey) => {
    const result = propertyMap[resolveResultKey(propertyKey)] ?? propertyMap[propertyKey];
    if (!result) {
      return [];
    }

    return [
      {
        key: propertyKey,
        label: translatePropertyLabel(propertyNames[propertyKey] ?? propertyKey),
        value: formatValue(result),
        units: result.units,
      },
    ];
  });
}

function buildComponentOptions(components: SelectOption[]) {
  return components;
}

function resolveMixturePropertyResultKey(propertyKey: string) {
  const mixtureKeyMap: Record<string, string> = {
    D: "density",
    C: "specific_heat",
    V: "viscosity",
    L: "thermal_conductivity",
    H: "enthalpy",
    S: "entropy",
    M: "molecular_weight",
    I: "surface_tension",
    P: "pressure",
    T: "temperature",
  };

  return mixtureKeyMap[propertyKey] ?? propertyKey;
}

function buildPropertyOptions(propertyNames: PropertyNamesResponse) {
  return Object.entries(propertyNames).map(([key, label]) => ({
    value: key,
    label: translatePropertyLabel(label),
  }));
}

function buildSurfacePropertyOptions(propertyNames: PropertyNamesResponse) {
  return Object.entries(propertyNames)
    .filter(([key]) => propertySurfaceKeys.has(key))
    .map(([key, label]) => ({
      value: key,
      label: translatePropertyLabel(label),
    }));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha ao processar a solicitação.";
}

function getStateVariableLabel(value: string) {
  return stateVariableOptions.find((option) => option.value === value)?.label ?? value;
}

type ComponentsPageContextValue = {
  components: SelectOption[];
  propertyNames: PropertyNamesResponse;
  mixturePropertyNames: PropertyNamesResponse;
  pageError: string | null;
  criticalFluid: string;
  criticalResult: CriticalPropertiesResponse | null;
  handleCriticalSubmit: React.FormEventHandler<HTMLFormElement>;
  handleCriticalFluidChange: (value: string) => void;
  propertyForm: PropertyFormState;
  propertyResult: Record<string, QuantityResult>;
  handlePropertySubmit: React.FormEventHandler<HTMLFormElement>;
  handlePropertyFluidChange: (value: string) => void;
  handlePropertyNamesChange: (selectedValues: string[]) => void;
  handlePropertyTemperatureChange: (value: string) => void;
  handlePropertyPressureChange: (value: string) => void;
  stateForm: StateFormState;
  stateResult: StatePropertyResponse | null;
  handleStateSubmit: React.FormEventHandler<HTMLFormElement>;
  handleStateFormChange: (field: keyof StateFormState, value: string) => void;
  mixtureRows: MixtureRow[];
  mixtureForm: MixtureFormState;
  mixtureResult: MixturePropertiesResponse | null;
  addMixtureRow: () => void;
  updateMixtureRow: (id: number, field: "component" | "fraction", value: string) => void;
  removeMixtureRow: (id: number) => void;
  handleMixtureTemperatureChange: (value: string) => void;
  handleMixturePressureChange: (value: string) => void;
  handleMixturePropertiesChange: (selectedValues: string[]) => void;
  handleMixtureSubmit: React.FormEventHandler<HTMLFormElement>;
  ternaryForm: TernaryFormState;
  ternaryChart: TernaryChartResponse | null;
  handleTernaryFieldChange: (field: keyof TernaryFormState, value: string) => void;
  binaryVleForm: BinaryVleFormState;
  binaryVleChart: ChartModel | null;
  isLoadingBinaryVle: boolean;
  handleBinaryVleSubmit: () => void;
  handleBinaryVleFieldChange: (field: keyof BinaryVleFormState, value: string) => void;
  mccabeForm: MccabeFormState;
  handleMccabeFieldChange: (field: keyof MccabeFormState, value: string) => void;
  mccabeRequested: boolean;
  mccabeChart: ChartModel | null;
  handleMcCabeGenerate: () => void;
  propertySurfaceForm: PropertySurfaceFormState;
  propertySurfaceChart: PropertySurfaceChartResponse | null;
  isLoadingPropertySurface: boolean;
  handlePropertySurfaceSubmit: React.FormEventHandler<HTMLFormElement>;
  handlePropertySurfaceFieldChange: (
    field: keyof PropertySurfaceFormState,
    value: string,
  ) => void;
  phaseEnvelopeForm: PhaseEnvelopeFormState;
  saturationEnvelope: SaturationEnvelopeResponse | null;
  phaseEnvelopeChart: ChartModel | null;
  vaporPressureChart: ChartModel | null;
  isLoadingEnvelope: boolean;
  handleSaturationEnvelopeSubmit: () => void;
  handlePhaseEnvelopeFieldChange: (field: keyof PhaseEnvelopeFormState, value: string) => void;
};

const ComponentsPageContext = createContext<ComponentsPageContextValue | null>(null);

function useComponentsPageContext() {
  const context = useContext(ComponentsPageContext);
  if (!context) {
    throw new Error("ComponentsPageContext is missing.");
  }

  return context;
}

export function ComponentsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [components, setComponents] = useState<SelectOption[]>([]);
  const [propertyNames, setPropertyNames] = useState<PropertyNamesResponse>({});
  const [mixturePropertyNames, setMixturePropertyNames] = useState<PropertyNamesResponse>({});
  const [pageError, setPageError] = useState<string | null>(null);

  const [criticalFluid, setCriticalFluid] = useState("");
  const [criticalResult, setCriticalResult] = useState<CriticalPropertiesResponse | null>(null);
  const [saturationEnvelope, setSaturationEnvelope] =
    useState<SaturationEnvelopeResponse | null>(null);
  const [isLoadingEnvelope, setIsLoadingEnvelope] = useState(false);
  const [phaseEnvelopeForm, setPhaseEnvelopeForm] = useState<PhaseEnvelopeFormState>({
    fluid: "",
    sampleCount: "",
  });
  const [binaryVleForm, setBinaryVleForm] = useState({
    fluid1: "",
    fluid2: "",
    pressure: "",
    sampleCount: "",
  });
  const [binaryVleChart, setBinaryVleChart] = useState<ChartModel | null>(null);
  const [isLoadingBinaryVle, setIsLoadingBinaryVle] = useState(false);
  const [mccabeForm, setMccabeForm] = useState({
    distillateComposition: "",
    bottomsComposition: "",
    feedComposition: "",
    refluxRatio: "",
    qValue: "",
    maxStages: "",
  });
  const [mccabeRequested, setMccabeRequested] = useState(false);
  const [propertySurfaceForm, setPropertySurfaceForm] = useState({
    fluid: "",
    propertyName: "",
    temperatureMin: "",
    temperatureMax: "",
    pressureMin: "",
    pressureMax: "",
    temperatureSamples: "",
    pressureSamples: "",
  });
  const [propertySurfaceChart, setPropertySurfaceChart] =
    useState<PropertySurfaceChartResponse | null>(null);
  const [isLoadingPropertySurface, setIsLoadingPropertySurface] = useState(false);
  const [ternaryForm, setTernaryForm] = useState<TernaryFormState>({
    componentA: "",
    componentB: "",
    componentC: "",
    fractionA: "",
    fractionB: "",
    fractionC: "",
    streamName: "",
  });
  const [ternaryChart, setTernaryChart] = useState<TernaryChartResponse | null>(null);
  const [mccabeChart, setMccabeChart] = useState<ChartModel | null>(null);
  const [phaseEnvelopeChart, setPhaseEnvelopeChart] = useState<ChartModel | null>(null);
  const [vaporPressureChart, setVaporPressureChart] = useState<ChartModel | null>(null);
  const criticalSessionRef = useRef(0);
  const propertySurfaceSessionRef = useRef(0);

  useEffect(() => {
    if (pathname === "/components") {
      navigate("critical-properties", { replace: true });
    }
  }, [navigate, pathname]);

  const [propertyForm, setPropertyForm] = useState({
    fluid: "",
    propertyNames: [] as string[],
    temperature: "",
    pressure: "",
  });
  const [propertyResult, setPropertyResult] = useState<Record<string, QuantityResult>>({});
  const propertySessionRef = useRef(0);

  const [nextMixtureRowId, setNextMixtureRowId] = useState(3);
  const [mixtureRows, setMixtureRows] = useState<MixtureRow[]>([
    { id: 1, component: "", fraction: "" },
    { id: 2, component: "", fraction: "" },
  ]);
  const [mixtureForm, setMixtureForm] = useState({
    temperature: "",
    pressure: "",
    propertyNames: [] as string[],
  });
  const [mixtureResult, setMixtureResult] = useState<MixturePropertiesResponse | null>(null);
  const mixtureSessionRef = useRef(0);

  const [stateForm, setStateForm] = useState({
    fluid: "",
    input1: defaultStateVariables.input1,
    value1: "",
    input2: defaultStateVariables.input2,
    value2: "",
    output: defaultStateVariables.output,
  });
  const [stateResult, setStateResult] = useState<StatePropertyResponse | null>(null);
  const stateSessionRef = useRef(0);
  const envelopeSessionRef = useRef(0);
  const [isLoadingExampleRequest, setIsLoadingExampleRequest] = useState(false);
  const [exampleAutoRun, setExampleAutoRun] = useState<ExampleAutoRunSnapshot | null>(null);
  const [exampleBinaryAutoRun, setExampleBinaryAutoRun] =
    useState<ExampleBinaryAutoRunSnapshot | null>(null);
  const isLoadingExample =
    isLoadingExampleRequest || exampleAutoRun != null || exampleBinaryAutoRun != null;

  async function runPropertyLookup(
    formState: PropertyFormSnapshot,
    sessionId: number = propertySessionRef.current,
  ) {
    const responses = await Promise.all(
      formState.propertyNames.map(async (propertyName) => {
        const response = await apiClient.post<QuantityResult>("/components/property", {
          fluid: formState.fluid,
          property_name: propertyName,
          temperature: Number(formState.temperature),
          pressure: Number(formState.pressure),
        });

        return [propertyName, response] as const;
      }),
    );

    if (sessionId !== propertySessionRef.current) {
      return null;
    }

    const nextResult = Object.fromEntries(responses);
    setPropertyResult(nextResult);
    return nextResult;
  }

  async function runMixtureLookup(
    rows: MixtureRowSnapshot,
    formState: MixtureFormSnapshot,
    sessionId: number = mixtureSessionRef.current,
  ) {
    const fluidFractions = Object.fromEntries(
      rows
        .filter((row) => row.component && row.fraction !== "")
        .map((row) => [row.component, Number(row.fraction)]),
    );

    const response = await apiClient.post<MixturePropertiesResponse>(
      "/components/mixture-properties",
      {
        fluid_fractions: fluidFractions,
        temperature: Number(formState.temperature),
        pressure: Number(formState.pressure),
        properties: formState.propertyNames,
      },
    );

    if (sessionId !== mixtureSessionRef.current) {
      return null;
    }

    setMixtureResult(response);
    return response;
  }

  async function runBinaryVleLookup(formState: BinaryVleFormSnapshot) {
    const response = await apiClient.post<ChartModel>("/components/binary-vle/chart", {
      fluid1: formState.fluid1,
      fluid2: formState.fluid2,
      pressure: Number(formState.pressure),
      sample_count: Number(formState.sampleCount),
    });

    setBinaryVleChart(response);
    return response;
  }

  async function runMccabeLookup(
    binaryFormState: BinaryVleFormSnapshot,
    mccabeFormState: MccabeFormSnapshot,
  ) {
    const response = await apiClient.post<ChartModel>("/components/mccabe-thiele/chart", {
      fluid1: binaryFormState.fluid1,
      fluid2: binaryFormState.fluid2,
      pressure: Number(binaryFormState.pressure),
      sample_count: Number(binaryFormState.sampleCount),
      distillate_composition: Number(mccabeFormState.distillateComposition),
      bottoms_composition: Number(mccabeFormState.bottomsComposition),
      feed_composition: Number(mccabeFormState.feedComposition),
      reflux_ratio: Number(mccabeFormState.refluxRatio),
      q_value: Number(mccabeFormState.qValue),
      max_stages: Number(mccabeFormState.maxStages),
    });

    setMccabeChart(response);
    setMccabeRequested(true);
    return response;
  }

  async function runPropertySurfaceLookup(
    formState: PropertySurfaceFormSnapshot,
    sessionId: number = propertySurfaceSessionRef.current,
  ) {
    const response = await apiClient.post<PropertySurfaceChartResponse>("/components/property-surface/chart", {
      fluid: formState.fluid,
      property_name: formState.propertyName,
      temperature_min: Number(formState.temperatureMin),
      temperature_max: Number(formState.temperatureMax),
      pressure_min: Number(formState.pressureMin),
      pressure_max: Number(formState.pressureMax),
      temperature_samples: Number(formState.temperatureSamples),
      pressure_samples: Number(formState.pressureSamples),
    });

    if (sessionId !== propertySurfaceSessionRef.current) {
      return null;
    }

    setPropertySurfaceChart(response);
    return response;
  }

  async function runEnvelopeLookup(
    formState: PhaseEnvelopeFormSnapshot,
    sessionId: number = envelopeSessionRef.current,
  ) {
    const payload = {
      fluid: formState.fluid,
      sample_count: Number(formState.sampleCount),
    };
    const [response, chartResponse, vaporPressureResponse] = await Promise.all([
      apiClient.post<SaturationEnvelopeResponse>("/components/saturation-envelope", payload),
      apiClient.post<ChartModel>("/components/phase-envelope/chart", payload),
      apiClient.post<ChartModel>("/components/vapor-pressure/chart", payload),
    ]);

    if (sessionId !== envelopeSessionRef.current) {
      return null;
    }

    setSaturationEnvelope(response);
    setPhaseEnvelopeChart(chartResponse);
    setVaporPressureChart(vaporPressureResponse);
    return { response, chartResponse, vaporPressureResponse };
  }

  function clearDerivedResults() {
    criticalSessionRef.current += 1;
    propertySessionRef.current += 1;
    mixtureSessionRef.current += 1;
    propertySurfaceSessionRef.current += 1;
    setMccabeRequested(false);
    setTernaryChart(null);
    setCriticalResult(null);
    setBinaryVleChart(null);
    setMccabeChart(null);
    setIsLoadingBinaryVle(false);
    setIsLoadingPropertySurface(false);
    setPropertyResult({});
    setMixtureResult(null);
    setPropertySurfaceChart(null);
  }

  function clearEnvelopeResult() {
    envelopeSessionRef.current += 1;
    setSaturationEnvelope(null);
    setPhaseEnvelopeChart(null);
    setVaporPressureChart(null);
    setIsLoadingEnvelope(false);
  }

  function clearStateResult() {
    stateSessionRef.current += 1;
    setStateResult(null);
  }

  useEffect(() => {
    let ignore = false;

    async function loadPageData() {
      setPageError(null);
      try {
        const [componentResponse, propertyNamesResponse, mixtureNamesResponse] = await Promise.all([
          apiClient.get<Array<string | SelectOption>>("/components/list"),
          apiClient.get<PropertyNamesResponse>("/components/property-names"),
          apiClient.get<PropertyNamesResponse>("/components/property-mixture-names"),
        ]);

        if (ignore) {
          return;
        }

        setComponents(componentResponse.map(toSelectOption));
        setPropertyNames(propertyNamesResponse);
        setMixturePropertyNames(mixtureNamesResponse);
        setNextMixtureRowId(3);
      } catch (error) {
        if (!ignore) {
          setPageError(error instanceof Error ? error.message : "Falha ao carregar o módulo.");
        }
      }
    }

    void loadPageData();

    return () => {
      ignore = true;
    };
  }, []);

  function loadExample() {
    void (async () => {
      setIsLoadingExampleRequest(true);
      try {
        const response = await apiClient.get<ComponentsExampleResponse>("/components/example");

        clearDerivedResults();
        clearStateResult();
        clearEnvelopeResult();

        const nextPropertyForm = {
          fluid: response.pure_fluid.fluid,
          propertyNames: response.pure_fluid.property_names,
          temperature: String(response.pure_fluid.temperature),
          pressure: String(response.pure_fluid.pressure),
        };
        const nextMixtureRows = Object.entries(response.mixtures.fluid_fractions).map(
          ([component, fraction], index) => ({
            id: index + 1,
            component,
            fraction: String(fraction),
          }),
        );
        const nextMixtureForm = {
          temperature: String(response.mixtures.temperature),
          pressure: String(response.mixtures.pressure),
          propertyNames: response.mixtures.properties,
        };
        const nextBinaryVleForm = {
          fluid1: response.binary_vle.fluid1,
          fluid2: response.binary_vle.fluid2,
          pressure: String(response.binary_vle.pressure),
          sampleCount: String(response.binary_vle.sample_count),
        };
        const nextMccabeForm = {
          distillateComposition: String(response.mccabe_thiele.distillate_composition),
          bottomsComposition: String(response.mccabe_thiele.bottoms_composition),
          feedComposition: String(response.mccabe_thiele.feed_composition),
          refluxRatio: String(response.mccabe_thiele.reflux_ratio),
          qValue: String(response.mccabe_thiele.q_value),
          maxStages: String(response.mccabe_thiele.max_stages),
        };
        const nextPropertySurfaceForm = {
          fluid: response.property_surface.fluid,
          propertyName: response.property_surface.property_name,
          temperatureMin: String(response.property_surface.temperature_min),
          temperatureMax: String(response.property_surface.temperature_max),
          pressureMin: String(response.property_surface.pressure_min),
          pressureMax: String(response.property_surface.pressure_max),
          temperatureSamples: String(response.property_surface.temperature_samples),
          pressureSamples: String(response.property_surface.pressure_samples),
        };
        const nextPhaseEnvelopeForm = {
          fluid: response.phase_envelope.fluid,
          sampleCount: String(response.phase_envelope.sample_count),
        };
        const propertySessionId = propertySessionRef.current;
        const mixtureSessionId = mixtureSessionRef.current;
        const propertySurfaceSessionId = propertySurfaceSessionRef.current;
        const envelopeSessionId = envelopeSessionRef.current;

        setCriticalFluid(response.pure_fluid.fluid);
        setPropertyForm(nextPropertyForm);
        setMixtureRows(nextMixtureRows);
        setNextMixtureRowId(
          Object.keys(response.mixtures.fluid_fractions).length + 1,
        );
        setMixtureForm(nextMixtureForm);
        setTernaryForm({
          componentA: response.ternary_diagram.component_a,
          componentB: response.ternary_diagram.component_b,
          componentC: response.ternary_diagram.component_c,
          fractionA: String(response.ternary_diagram.fraction_a),
          fractionB: String(response.ternary_diagram.fraction_b),
          fractionC: String(response.ternary_diagram.fraction_c),
          streamName: "Corrente atual",
        });
        setBinaryVleForm(nextBinaryVleForm);
        setMccabeRequested(false);
        setMccabeForm(nextMccabeForm);
        setPropertySurfaceForm(nextPropertySurfaceForm);
        setPhaseEnvelopeForm(nextPhaseEnvelopeForm);

        setExampleAutoRun({
          propertyForm: nextPropertyForm,
          mixtureRows: nextMixtureRows,
          mixtureForm: nextMixtureForm,
          propertySurfaceForm: nextPropertySurfaceForm,
          phaseEnvelopeForm: nextPhaseEnvelopeForm,
          propertySessionId,
          mixtureSessionId,
          propertySurfaceSessionId,
          envelopeSessionId,
        });
        setExampleBinaryAutoRun({
          binaryVleForm: nextBinaryVleForm,
          mccabeForm: nextMccabeForm,
        });
      } catch (error) {
        notify.error(`Erro ao carregar exemplo: ${getErrorMessage(error)}`);
      } finally {
        setIsLoadingExampleRequest(false);
      }
    })();
  }

  useEffect(() => {
    if (!exampleAutoRun) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await Promise.all([
          runPropertyLookup(exampleAutoRun.propertyForm, exampleAutoRun.propertySessionId),
          runMixtureLookup(
            exampleAutoRun.mixtureRows,
            exampleAutoRun.mixtureForm,
            exampleAutoRun.mixtureSessionId,
          ),
          runPropertySurfaceLookup(
            exampleAutoRun.propertySurfaceForm,
            exampleAutoRun.propertySurfaceSessionId,
          ),
          runEnvelopeLookup(
            exampleAutoRun.phaseEnvelopeForm,
            exampleAutoRun.envelopeSessionId,
          ),
        ]);
      } catch (error) {
        if (!cancelled) {
          notify.error(`Erro ao carregar exemplo: ${getErrorMessage(error)}`);
        }
      } finally {
        if (!cancelled) {
          setExampleAutoRun(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exampleAutoRun]);

  useEffect(() => {
    if (!exampleBinaryAutoRun) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await runBinaryVleLookup(exampleBinaryAutoRun.binaryVleForm);
        await runMccabeLookup(
          exampleBinaryAutoRun.binaryVleForm,
          exampleBinaryAutoRun.mccabeForm,
        );

        if (!cancelled) {
          notify.success("Exemplo carregado com sucesso.");
        }
      } catch (error) {
        if (!cancelled) {
          notify.error(`Erro ao carregar exemplo: ${getErrorMessage(error)}`);
        }
      } finally {
        if (!cancelled) {
          setExampleBinaryAutoRun(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exampleBinaryAutoRun]);

  useEffect(() => {
    const ternaryComponents = [
      ternaryForm.componentA,
      ternaryForm.componentB,
      ternaryForm.componentC,
    ];
    const ternaryFractions = [
      Number(ternaryForm.fractionA),
      Number(ternaryForm.fractionB),
      Number(ternaryForm.fractionC),
    ];
    const ternaryDistinctComponents = new Set(ternaryComponents).size === 3;
    const ternaryReady =
      ternaryComponents.every((component) => component.trim()) &&
      ternaryDistinctComponents &&
      ternaryFractions.every((fraction) => Number.isFinite(fraction));

    if (!ternaryReady) {
      setTernaryChart(null);
      return;
    }

    let ignore = false;
    void (async () => {
      try {
        const response = await apiClient.post<TernaryChartResponse>("/components/ternary-diagram/chart", {
          component_a: ternaryForm.componentA,
          component_b: ternaryForm.componentB,
          component_c: ternaryForm.componentC,
          fraction_a: ternaryFractions[0],
          fraction_b: ternaryFractions[1],
          fraction_c: ternaryFractions[2],
          stream_name: ternaryForm.streamName.trim() || "Corrente atual",
        });

        if (!ignore) {
          setTernaryChart(response);
        }
      } catch (error) {
        if (!ignore) {
          setTernaryChart(null);
          notify.error(`Erro ao projetar diagrama ternário: ${getErrorMessage(error)}`);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [ternaryForm]);

  async function handleCriticalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = criticalSessionRef.current;

    if (!criticalFluid) {
      notify.error("Selecione um fluido");
      return;
    }

    try {
      const response = await apiClient.post<CriticalPropertiesResponse>(
        "/components/critical-properties",
        { fluid: criticalFluid },
      );
      if (sessionId !== criticalSessionRef.current) {
        return;
      }

      setCriticalResult(response);
    } catch (error) {
      if (sessionId !== criticalSessionRef.current) {
        return;
      }

      notify.error(`Erro ao obter propriedades críticas: ${getErrorMessage(error)}`);
    }
  }

  function handleCriticalFluidChange(value: string) {
    clearDerivedResults();
    setCriticalFluid(value);
  }

  function handleTernaryFieldChange(field: keyof TernaryFormState, value: string) {
    setTernaryForm((current) => ({ ...current, [field]: value }));
  }

  function handleBinaryVleFieldChange(field: keyof BinaryVleFormState, value: string) {
    setBinaryVleChart(null);
    setMccabeChart(null);
    setMccabeRequested(false);
    setBinaryVleForm((current) => ({ ...current, [field]: value }));
  }

  function handlePropertySurfaceFieldChange(field: keyof PropertySurfaceFormState, value: string) {
    clearDerivedResults();
    setPropertySurfaceForm((current) => ({ ...current, [field]: value }));
  }

  function handlePhaseEnvelopeFieldChange(field: keyof PhaseEnvelopeFormState, value: string) {
    clearEnvelopeResult();
    setPhaseEnvelopeForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaturationEnvelopeSubmit() {
    const sessionId = envelopeSessionRef.current;

    if (!phaseEnvelopeForm.fluid || !phaseEnvelopeForm.sampleCount.trim()) {
      notify.error("Selecione um fluido e informe a quantidade de pontos");
      return;
    }

    setIsLoadingEnvelope(true);

    try {
      const payload = {
        fluid: phaseEnvelopeForm.fluid,
        sample_count: Number(phaseEnvelopeForm.sampleCount),
      };
      const [response, chartResponse, vaporPressureResponse] = await Promise.all([
        apiClient.post<SaturationEnvelopeResponse>("/components/saturation-envelope", payload),
        apiClient.post<ChartModel>("/components/phase-envelope/chart", payload),
        apiClient.post<ChartModel>("/components/vapor-pressure/chart", payload),
      ]);

      if (sessionId !== envelopeSessionRef.current) {
        return;
      }

      setSaturationEnvelope(response);
      setPhaseEnvelopeChart(chartResponse);
      setVaporPressureChart(vaporPressureResponse);
    } catch (error) {
      if (sessionId !== envelopeSessionRef.current) {
        return;
      }

      notify.error(`Erro ao obter envelope de fase: ${getErrorMessage(error)}`);
    } finally {
      if (sessionId === envelopeSessionRef.current) {
        setIsLoadingEnvelope(false);
      }
    }
  }

  async function handleBinaryVleSubmit() {
    if (
      !binaryVleForm.fluid1 ||
      !binaryVleForm.fluid2 ||
      !binaryVleForm.pressure.trim() ||
      !binaryVleForm.sampleCount.trim()
    ) {
      notify.error("Selecione dois fluidos e informe pressão e quantidade de pontos");
      return;
    }

    setIsLoadingBinaryVle(true);
    setBinaryVleChart(null);
    setMccabeChart(null);
    setMccabeRequested(false);

    try {
      await runBinaryVleLookup(binaryVleForm);
    } catch (error) {
      notify.error(`Erro ao obter diagrama binário: ${getErrorMessage(error)}`);
    } finally {
      setIsLoadingBinaryVle(false);
    }
  }

  function handleMccabeFieldChange(field: keyof MccabeFormState, value: string) {
    setMccabeChart(null);
    setMccabeForm((current) => ({ ...current, [field]: value }));
  }

  function handleMcCabeGenerate() {
    if (!binaryVleChart) {
      notify.error("Gere primeiro o diagrama T-x-y / y-x");
      return;
    }

    const distillateComposition = Number(mccabeForm.distillateComposition);
    const bottomsComposition = Number(mccabeForm.bottomsComposition);
    const feedComposition = Number(mccabeForm.feedComposition);
    const refluxRatio = Number(mccabeForm.refluxRatio);
    const qValue = Number(mccabeForm.qValue);
    const maxStages = Number(mccabeForm.maxStages);

    if (
      !mccabeForm.distillateComposition.trim() ||
      !mccabeForm.bottomsComposition.trim() ||
      !mccabeForm.feedComposition.trim() ||
      !mccabeForm.refluxRatio.trim() ||
      !mccabeForm.qValue.trim() ||
      !mccabeForm.maxStages.trim() ||
      [distillateComposition, bottomsComposition, feedComposition, refluxRatio, qValue, maxStages].some(
        (value) => !Number.isFinite(value),
      ) ||
      maxStages < 1
    ) {
      notify.error("Preencha os campos do McCabe-Thiele");
      return;
    }

    void (async () => {
      try {
        await runMccabeLookup(binaryVleForm, mccabeForm);
      } catch (error) {
        notify.error(`Erro ao gerar McCabe-Thiele: ${getErrorMessage(error)}`);
      }
    })();
  }

  async function handlePropertySurfaceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = propertySurfaceSessionRef.current;

    if (
      !propertySurfaceForm.fluid ||
      !propertySurfaceForm.propertyName ||
      !propertySurfaceForm.temperatureMin.trim() ||
      !propertySurfaceForm.temperatureMax.trim() ||
      !propertySurfaceForm.pressureMin.trim() ||
      !propertySurfaceForm.pressureMax.trim()
    ) {
      notify.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsLoadingPropertySurface(true);

    try {
      await runPropertySurfaceLookup(propertySurfaceForm, sessionId);
    } catch (error) {
      if (sessionId !== propertySurfaceSessionRef.current) {
        return;
      }

      notify.error(`Erro ao obter superfície de propriedades: ${getErrorMessage(error)}`);
    } finally {
      if (sessionId === propertySurfaceSessionRef.current) {
        setIsLoadingPropertySurface(false);
      }
    }
  }

  async function handlePropertySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = propertySessionRef.current;

    if (
      !propertyForm.fluid ||
      propertyForm.propertyNames.length === 0 ||
      !propertyForm.temperature.trim() ||
      !propertyForm.pressure.trim()
    ) {
      notify.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      await runPropertyLookup(propertyForm, sessionId);
    } catch (error) {
      if (sessionId !== propertySessionRef.current) {
        return;
      }

      notify.error(`Erro ao obter propriedade: ${getErrorMessage(error)}`);
    }
  }

  function addMixtureRow() {
    clearDerivedResults();
    setMixtureRows((current) => [...current, { id: nextMixtureRowId, component: "", fraction: "" }]);
    setNextMixtureRowId((current) => current + 1);
  }

  function updateMixtureRow(id: number, field: "component" | "fraction", value: string) {
    clearDerivedResults();
    setMixtureRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function removeMixtureRow(id: number) {
    clearDerivedResults();
    setMixtureRows((current) => current.filter((row) => row.id !== id));
  }

  function handlePropertyFluidChange(value: string) {
    clearDerivedResults();
    setPropertyForm((current) => ({ ...current, fluid: value }));
  }

  function handlePropertyNamesChange(selectedValues: string[]) {
    clearDerivedResults();
    setPropertyForm((current) => ({
      ...current,
      propertyNames: selectedValues,
    }));
  }

  function handlePropertyTemperatureChange(value: string) {
    clearDerivedResults();
    setPropertyForm((current) => ({ ...current, temperature: value }));
  }

  function handlePropertyPressureChange(value: string) {
    clearDerivedResults();
    setPropertyForm((current) => ({ ...current, pressure: value }));
  }

  function handleMixtureTemperatureChange(value: string) {
    clearDerivedResults();
    setMixtureForm((current) => ({ ...current, temperature: value }));
  }

  function handleMixturePressureChange(value: string) {
    clearDerivedResults();
    setMixtureForm((current) => ({ ...current, pressure: value }));
  }

  function handleMixturePropertiesChange(selectedValues: string[]) {
    clearDerivedResults();
    setMixtureForm((current) => ({
      ...current,
      propertyNames: selectedValues,
    }));
  }

  async function handleMixtureSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = mixtureSessionRef.current;

    if (!mixtureForm.temperature.trim() || !mixtureForm.pressure.trim()) {
      notify.error("Informe temperatura e pressão");
      return;
    }

    const fluidFractions = Object.fromEntries(
      mixtureRows
        .filter((row) => row.component && row.fraction !== "")
        .map((row) => [row.component, Number(row.fraction)]),
    );

    if (Object.keys(fluidFractions).length === 0) {
      notify.error("Adicione pelo menos uma fração de fluido");
      return;
    }

    const totalFraction = Object.values(fluidFractions).reduce((sum, fraction) => sum + fraction, 0);
    if (Math.abs(totalFraction - 1) > 1e-6) {
      notify.error("As frações molares devem somar 1,0");
      return;
    }

    try {
      await runMixtureLookup(mixtureRows, mixtureForm, sessionId);
    } catch (error) {
      if (sessionId !== mixtureSessionRef.current) {
        return;
      }

      notify.error(`Erro ao calcular propriedades da mistura: ${getErrorMessage(error)}`);
    }
  }

  function handleStateFormChange(field: keyof StateFormState, value: string) {
    clearStateResult();
    setStateForm((current) => ({ ...current, [field]: value }));
  }

  async function handleStateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = stateSessionRef.current;

    if (
      !stateForm.fluid ||
      !stateForm.value1.trim() ||
      !stateForm.value2.trim() ||
      !stateForm.input1 ||
      !stateForm.input2 ||
      !stateForm.output
    ) {
      notify.error("Preencha fluido, variáveis e valores.");
      return;
    }

    try {
      const response = await apiClient.post<StatePropertyResponse>("/components/props-by-state", {
        fluid: stateForm.fluid,
        input1: stateForm.input1,
        value1: Number(stateForm.value1),
        input2: stateForm.input2,
        value2: Number(stateForm.value2),
        output: stateForm.output,
      });

      if (sessionId !== stateSessionRef.current) {
        return;
      }

      setStateResult(response);
    } catch (error) {
      if (sessionId !== stateSessionRef.current) {
        return;
      }

      notify.error(`Erro ao obter propriedade por estado: ${getErrorMessage(error)}`);
    }
  }

  const activeTabPath = pathname.startsWith("/components/")
    ? pathname.slice("/components/".length).split("/")[0] || "critical-properties"
    : "critical-properties";
  const normalizedActiveTabPath =
    activeTabPath === "ternary-diagram"
      ? "mixtures"
      : activeTabPath === "property-surface"
        ? "pure-fluid"
        : activeTabPath === "mccabe-thiele"
          ? "binary-vle"
          : activeTabPath;
  const activeTab = componentsTabs.some((tab) => tab.to === normalizedActiveTabPath)
    ? normalizedActiveTabPath
    : "critical-properties";

  useEffect(() => {
    if (pathname === "/components/ternary-diagram") {
      navigate("/components/mixtures", { replace: true });
    } else if (pathname === "/components/property-surface") {
      navigate("/components/pure-fluid", { replace: true });
    } else if (pathname === "/components/mccabe-thiele") {
      navigate("/components/binary-vle", { replace: true });
    }
  }, [navigate, pathname]);

  const contextValue: ComponentsPageContextValue = {
    components,
    propertyNames,
    mixturePropertyNames,
    pageError,
    criticalFluid,
    criticalResult,
    handleCriticalSubmit,
    handleCriticalFluidChange,
    propertyForm,
    propertyResult,
    handlePropertySubmit,
    handlePropertyFluidChange,
    handlePropertyNamesChange,
    handlePropertyTemperatureChange,
    handlePropertyPressureChange,
    stateForm,
    stateResult,
    handleStateSubmit,
    handleStateFormChange,
    mixtureRows,
    mixtureForm,
    mixtureResult,
    addMixtureRow,
    updateMixtureRow,
    removeMixtureRow,
    handleMixtureTemperatureChange,
    handleMixturePressureChange,
    handleMixturePropertiesChange,
    handleMixtureSubmit,
    ternaryForm,
    ternaryChart,
    handleTernaryFieldChange,
    binaryVleForm,
    binaryVleChart,
    isLoadingBinaryVle,
    handleBinaryVleSubmit,
    handleBinaryVleFieldChange,
    mccabeForm,
    handleMccabeFieldChange,
    mccabeRequested,
    mccabeChart,
    handleMcCabeGenerate,
    propertySurfaceForm,
    propertySurfaceChart,
    isLoadingPropertySurface,
    handlePropertySurfaceSubmit,
    handlePropertySurfaceFieldChange,
    phaseEnvelopeForm,
    saturationEnvelope,
    phaseEnvelopeChart,
    vaporPressureChart,
    isLoadingEnvelope,
    handleSaturationEnvelopeSubmit,
    handlePhaseEnvelopeFieldChange,
  };

  return (
    <ComponentsPageContext.Provider value={contextValue}>
      <ModuleTabsLayout
        title="Propriedades de Componentes"
      subtitle={
        <>
          <p>
            Consulte propriedades críticas, fluidos puros, misturas e equilíbrio binário usando os
            serviços já expostos pela API.
          </p>
          {pageError ? <p className="text-red-600">{pageError}</p> : null}
        </>
      }
      action={
        <Button
          type="button"
          variant="outline"
          onClick={loadExample}
          loading={isLoadingExample}
        >
          Carregar exemplo
        </Button>
      }
      tabs={componentsTabs}
    >
      {renderComponentsTab(activeTab)}
      </ModuleTabsLayout>
    </ComponentsPageContext.Provider>
  );
}

function renderComponentsTab(activeTab: string) {
  switch (activeTab) {
    case "pure-fluid":
      return (
        <div className="space-y-4">
          <ComponentsPureFluidTab />
          <ComponentsPropertySurfaceTab />
        </div>
      );
    case "mixtures":
      return (
        <div className="space-y-4">
          <ComponentsMixturesTab />
          <ComponentsTernaryDiagramTab />
        </div>
      );
    case "binary-vle":
      return <ComponentsBinaryVleTab />;
    case "phase-envelope":
      return <ComponentsPhaseEnvelopeTab />;
    case "critical-properties":
    default:
      return <ComponentsCriticalPropertiesTab />;
  }
}

function ComponentsCriticalPropertiesTab() {
  const { components, criticalFluid, criticalResult, handleCriticalFluidChange, handleCriticalSubmit } =
    useComponentsPageContext();
  const componentOptions = buildComponentOptions(components);

  return (
    <Card>
      <CardHeader title="Propriedades Críticas" />
      <CardContent>
        <CriticalPropertiesHowItWorks />
        <form className="space-y-4" onSubmit={handleCriticalSubmit}>
          <Combobox
            label="Fluido crítico"
            options={componentOptions}
            value={criticalFluid}
            onValueChange={handleCriticalFluidChange}
            placeholder="Selecione um fluido"
          />
          <Button type="submit">Obter propriedades críticas</Button>
        </form>

        {criticalResult ? (
          <ResultTableSection
            title="Resultado"
            emptyLabel="Obtenha propriedades críticas para visualizar os resultados."
            rows={formatCriticalProperties(criticalResult)}
            showTitleWhenEmpty={false}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ComponentsPureFluidTab() {
  const {
    components,
    propertyForm,
    propertyNames,
    propertyResult,
    handlePropertyFluidChange,
    handlePropertyNamesChange,
    handlePropertyPressureChange,
    handlePropertySubmit,
    handlePropertyTemperatureChange,
  } = useComponentsPageContext();
  const componentOptions = buildComponentOptions(components);
  const propertyOptions = buildPropertyOptions(propertyNames);
  const propertyRows = buildPropertyRows(propertyForm.propertyNames, propertyResult, propertyNames);

  return (
    <Card>
      <CardHeader title="Fluido Puro" />
      <CardContent>
        <PurePropertiesHowItWorks />
        <form className="space-y-4" onSubmit={handlePropertySubmit}>
          <Combobox
            label="Fluido puro"
            options={componentOptions}
            value={propertyForm.fluid}
            onValueChange={handlePropertyFluidChange}
            placeholder="Selecione um fluido"
          />
          <MultiCombobox
            label="Propriedades do fluido"
            options={propertyOptions}
            value={propertyForm.propertyNames}
            onValueChange={handlePropertyNamesChange}
            placeholder="Selecione propriedades"
          />
          <label className="block text-sm font-medium text-slate-800" htmlFor="property-temperature">
            Temperatura do fluido (K)
            <input
              id="property-temperature"
              className={inputClassName}
              type="number"
              step="any"
              value={propertyForm.temperature}
              onChange={(event) => handlePropertyTemperatureChange(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="property-pressure">
            Pressão do fluido (Pa)
            <input
              id="property-pressure"
              className={inputClassName}
              type="number"
              step="any"
              value={propertyForm.pressure}
              onChange={(event) => handlePropertyPressureChange(event.target.value)}
            />
          </label>
          <Button type="submit">Calcular propriedades</Button>
        </form>

        {propertyRows.length > 0 ? (
          <ResultTableSection
            title="Resultado"
            emptyLabel="Calcule propriedades para visualizar os resultados."
            rows={propertyRows}
            showTitleWhenEmpty={false}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ComponentsMixturesTab() {
  const {
    components,
    mixtureForm,
    mixturePropertyNames,
    mixtureResult,
    mixtureRows,
    addMixtureRow,
    handleMixturePressureChange,
    handleMixturePropertiesChange,
    handleMixtureTemperatureChange,
    handleMixtureSubmit,
    removeMixtureRow,
    updateMixtureRow,
  } = useComponentsPageContext();
  const componentOptions = buildComponentOptions(components);
  const mixturePropertyOptions = buildPropertyOptions(mixturePropertyNames);
  const mixturePropertyRows = buildPropertyRows(
    mixtureForm.propertyNames,
    mixtureResult?.properties ?? {},
    mixturePropertyNames,
    resolveMixturePropertyResultKey,
  );
  const mixtureComposition = mixtureRows
    .filter((row) => row.component && row.fraction !== "")
    .map((row) => ({
      component: row.component,
      fraction: Number(row.fraction),
    }));

  return (
    <Card>
      <CardHeader title="Misturas" />
      <CardContent>
        <MixturePropertiesHowItWorks />
        <form className="space-y-4" onSubmit={handleMixtureSubmit}>
          <div className="space-y-3">
            {mixtureRows.map((row, index) => (
              <div key={row.id} className="rounded-xl border border-slate-200 p-3">
                <Combobox
                  label={`Mistura componente ${index + 1}`}
                  options={componentOptions}
                  value={row.component}
                  onValueChange={(value) => updateMixtureRow(row.id, "component", value)}
                  placeholder="Selecione um fluido"
                />
                <label
                  className="mt-3 block text-sm font-medium text-slate-800"
                  htmlFor={`mixture-fraction-${row.id}`}
                >
                  Fração molar {index + 1}
                  <input
                    id={`mixture-fraction-${row.id}`}
                    className={inputClassName}
                    type="number"
                    step="any"
                    value={row.fraction}
                    onChange={(event) => updateMixtureRow(row.id, "fraction", event.target.value)}
                  />
                </label>
                {mixtureRows.length > 2 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    onClick={() => removeMixtureRow(row.id)}
                  >
                    Remover fluido
                  </Button>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addMixtureRow}>
              Adicionar fluido
            </Button>
          </div>

          <label className="block text-sm font-medium text-slate-800" htmlFor="mixture-temperature">
            Temperatura da mistura (K)
            <input
              id="mixture-temperature"
              className={inputClassName}
              type="number"
              step="any"
              value={mixtureForm.temperature}
              onChange={(event) => handleMixtureTemperatureChange(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="mixture-pressure">
            Pressão da mistura (Pa)
            <input
              id="mixture-pressure"
              className={inputClassName}
              type="number"
              step="any"
              value={mixtureForm.pressure}
              onChange={(event) => handleMixturePressureChange(event.target.value)}
            />
          </label>
          <MultiCombobox
            label="Propriedades da mistura"
            options={mixturePropertyOptions}
            value={mixtureForm.propertyNames}
            onValueChange={handleMixturePropertiesChange}
            placeholder="Selecione propriedades"
          />
          <Button type="submit">Calcular mistura</Button>
        </form>

        {mixturePropertyRows.length > 0 ? (
          <>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Composição da mistura
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {mixtureComposition.map(({ component, fraction }) => (
                  <span
                    key={`${component}-${fraction}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                  >
                    {component}: {fraction}
                  </span>
                ))}
              </div>
            </div>
            <ResultTableSection
              title="Resultado"
              emptyLabel="Calcule a mistura para visualizar os resultados."
              rows={mixturePropertyRows}
              showTitleWhenEmpty={false}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ComponentsTernaryDiagramTab() {
  const { components, ternaryForm, ternaryChart, handleTernaryFieldChange } = useComponentsPageContext();
  const componentOptions = buildComponentOptions(components);
  const ternaryComponents = [ternaryForm.componentA, ternaryForm.componentB, ternaryForm.componentC];
  const ternaryFractions = [
    Number(ternaryForm.fractionA),
    Number(ternaryForm.fractionB),
    Number(ternaryForm.fractionC),
  ];
  const ternaryDistinctComponents = new Set(ternaryComponents).size === 3;
  const ternaryReady =
    ternaryComponents.every((component) => component.trim()) &&
    ternaryDistinctComponents &&
    ternaryFractions.every((fraction) => Number.isFinite(fraction));

  return (
    <Card>
      <CardHeader title="Diagrama Ternário" />
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Projeção de uma corrente de três componentes. Útil para misturas e separações
          multicomponentes sem adicionar um módulo novo.
        </p>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Combobox
            label="Componente A"
            options={componentOptions}
            value={ternaryForm.componentA}
            onValueChange={(value) => handleTernaryFieldChange("componentA", value)}
            placeholder="Selecione um fluido"
          />
          <Combobox
            label="Componente B"
            options={componentOptions}
            value={ternaryForm.componentB}
            onValueChange={(value) => handleTernaryFieldChange("componentB", value)}
            placeholder="Selecione um fluido"
          />
          <Combobox
            label="Componente C"
            options={componentOptions}
            value={ternaryForm.componentC}
            onValueChange={(value) => handleTernaryFieldChange("componentC", value)}
            placeholder="Selecione um fluido"
          />
          <label className="block text-sm font-medium text-slate-800" htmlFor="ternary-fraction-a">
            Fração A
            <input
              id="ternary-fraction-a"
              className={inputClassName}
              type="number"
              min="0"
              max="1"
              step="any"
              value={ternaryForm.fractionA}
              onChange={(event) => handleTernaryFieldChange("fractionA", event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="ternary-fraction-b">
            Fração B
            <input
              id="ternary-fraction-b"
              className={inputClassName}
              type="number"
              min="0"
              max="1"
              step="any"
              value={ternaryForm.fractionB}
              onChange={(event) => handleTernaryFieldChange("fractionB", event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="ternary-fraction-c">
            Fração C
            <input
              id="ternary-fraction-c"
              className={inputClassName}
              type="number"
              min="0"
              max="1"
              step="any"
              value={ternaryForm.fractionC}
              onChange={(event) => handleTernaryFieldChange("fractionC", event.target.value)}
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-800" htmlFor="ternary-name">
          Nome da corrente
          <input
            id="ternary-name"
            className={inputClassName}
            type="text"
            value={ternaryForm.streamName}
            onChange={(event) => handleTernaryFieldChange("streamName", event.target.value)}
          />
        </label>

        {ternaryReady ? (
          <TernaryDiagram
            title={ternaryChart?.title ?? "Diagrama ternário"}
            subtitle={ternaryChart?.subtitle}
            componentLabels={ternaryChart?.component_labels ?? []}
            boundary={ternaryChart?.boundary ?? []}
            guideLines={ternaryChart?.guide_lines ?? []}
            streams={ternaryChart?.streams ?? []}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecione três componentes distintos e valores numéricos para visualizar o triângulo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ComponentsBinaryVleTab() {
  const {
    binaryVleForm,
    binaryVleChart,
    components,
    handleBinaryVleFieldChange,
    isLoadingBinaryVle,
    handleBinaryVleSubmit,
  } = useComponentsPageContext();
  const componentOptions = buildComponentOptions(components);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Equilíbrio Binário" />
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Visualização binária ideal de Raoult para dois fluidos. Útil para leitura de equilíbrio
            líquido-vapor sem criar um módulo completo de destilação.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <Combobox
              label="Componente 1"
              options={componentOptions}
              value={binaryVleForm.fluid1}
              onValueChange={(value) => handleBinaryVleFieldChange("fluid1", value)}
              placeholder="Selecione um fluido"
            />
            <Combobox
              label="Componente 2"
              options={componentOptions}
              value={binaryVleForm.fluid2}
              onValueChange={(value) => handleBinaryVleFieldChange("fluid2", value)}
              placeholder="Selecione um fluido"
            />
            <label className="block text-sm font-medium text-slate-800" htmlFor="binary-vle-pressure">
              Pressão (Pa)
              <input
                id="binary-vle-pressure"
                className={inputClassName}
                type="number"
                step="any"
                value={binaryVleForm.pressure}
                onChange={(event) => handleBinaryVleFieldChange("pressure", event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <label className="block text-sm font-medium text-slate-800" htmlFor="binary-vle-samples">
              Amostras por curva
              <input
                id="binary-vle-samples"
                className={inputClassName}
                type="number"
                min="5"
                max="60"
                step="1"
                value={binaryVleForm.sampleCount}
                onChange={(event) => handleBinaryVleFieldChange("sampleCount", event.target.value)}
              />
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={isLoadingBinaryVle}
                onClick={() => void handleBinaryVleSubmit()}
              >
                {isLoadingBinaryVle ? "Gerando..." : "Gerar diagrama"}
              </Button>
            </div>
          </div>

          {binaryVleChart ? (
            <BinaryVleChart model={binaryVleChart} />
          ) : (
            <p className="text-sm text-muted-foreground">
              O diagrama aparecerá após a geração das curvas.
            </p>
          )}
        </CardContent>
      </Card>

      <ComponentsMcCabeThieleCard />
    </div>
  );
}

function ComponentsMcCabeThieleCard() {
  const {
    binaryVleChart,
    handleMcCabeGenerate,
    handleMccabeFieldChange,
    mccabeForm,
    mccabeChart,
    mccabeRequested,
  } = useComponentsPageContext();

  return (
    <Card>
      <CardHeader title="McCabe-Thiele" />
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Construção didática de estágios teóricos usando o equilíbrio binário gerado acima, na
          mesma aba. O objetivo aqui é visualizar a lógica do método sem criar um módulo completo
          de destilação.
        </p>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <label className="block text-sm font-medium text-slate-800" htmlFor="mccabe-distillate">
            xD
            <input
              id="mccabe-distillate"
              className={inputClassName}
              type="number"
              min="0"
              max="1"
              step="any"
              value={mccabeForm.distillateComposition}
              onChange={(event) =>
                handleMccabeFieldChange("distillateComposition", event.target.value)
              }
            />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="mccabe-bottoms">
            xB
            <input
              id="mccabe-bottoms"
              className={inputClassName}
              type="number"
              min="0"
              max="1"
              step="any"
              value={mccabeForm.bottomsComposition}
              onChange={(event) => handleMccabeFieldChange("bottomsComposition", event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="mccabe-feed">
            zF
            <input
              id="mccabe-feed"
              className={inputClassName}
              type="number"
              min="0"
              max="1"
              step="any"
              value={mccabeForm.feedComposition}
              onChange={(event) => handleMccabeFieldChange("feedComposition", event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="mccabe-reflux">
            Refluxo
            <input
              id="mccabe-reflux"
              className={inputClassName}
              type="number"
              min="0"
              step="any"
              value={mccabeForm.refluxRatio}
              onChange={(event) => handleMccabeFieldChange("refluxRatio", event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="mccabe-q">
            q
            <input
              id="mccabe-q"
              className={inputClassName}
              type="number"
              step="any"
              value={mccabeForm.qValue}
              onChange={(event) => handleMccabeFieldChange("qValue", event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="mccabe-max-stages">
            Máx. estágios
            <input
              id="mccabe-max-stages"
              className={inputClassName}
              type="number"
              min="1"
              max="30"
              step="1"
              value={mccabeForm.maxStages}
              onChange={(event) => handleMccabeFieldChange("maxStages", event.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={!binaryVleChart}
            onClick={handleMcCabeGenerate}
          >
            {mccabeRequested ? "Atualizar McCabe-Thiele" : "Gerar McCabe-Thiele"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {binaryVleChart
              ? "O equilíbrio binário acima é a base do traçado dos estágios."
              : "Gere primeiro o equilíbrio binário para liberar este gráfico."}
          </p>
        </div>

        {mccabeRequested && mccabeChart ? (
          <McCabeThieleChart model={mccabeChart} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Preencha os campos acima e clique em Gerar McCabe-Thiele para montar o diagrama.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ComponentsPropertySurfaceTab() {
  const {
    components,
    propertyNames,
    propertySurfaceForm,
    propertySurfaceChart,
    handlePropertySurfaceFieldChange,
    handlePropertySurfaceSubmit,
    isLoadingPropertySurface,
  } = useComponentsPageContext();
  const componentOptions = buildComponentOptions(components);
  const surfacePropertyOptions = buildSurfacePropertyOptions(propertyNames);

  return (
    <Card>
      <CardHeader title="Superfície T-P" />
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Mapa T-P para uma propriedade termodinâmica do CoolProp. Útil para ver variações de
          massa específica, entalpia, entropia e outras propriedades sem montar um módulo completo.
        </p>

        <form className="space-y-4" onSubmit={handlePropertySurfaceSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Combobox
              label="Fluido"
              options={componentOptions}
              value={propertySurfaceForm.fluid}
              onValueChange={(value) => handlePropertySurfaceFieldChange("fluid", value)}
              placeholder="Selecione um fluido"
            />
            <Combobox
              label="Propriedade"
              options={surfacePropertyOptions}
              value={propertySurfaceForm.propertyName}
              onValueChange={(value) => handlePropertySurfaceFieldChange("propertyName", value)}
              placeholder="Selecione uma propriedade"
            />
            <label className="block text-sm font-medium text-slate-800" htmlFor="surface-temp-min">
              Temperatura mínima (K)
              <input
                id="surface-temp-min"
                className={inputClassName}
                type="number"
                step="any"
                value={propertySurfaceForm.temperatureMin}
                onChange={(event) =>
                  handlePropertySurfaceFieldChange("temperatureMin", event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-medium text-slate-800" htmlFor="surface-temp-max">
              Temperatura máxima (K)
              <input
                id="surface-temp-max"
                className={inputClassName}
                type="number"
                step="any"
                value={propertySurfaceForm.temperatureMax}
                onChange={(event) =>
                  handlePropertySurfaceFieldChange("temperatureMax", event.target.value)
                }
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px_180px]">
            <label className="block text-sm font-medium text-slate-800" htmlFor="surface-pressure-min">
              Pressão mínima (Pa)
              <input
                id="surface-pressure-min"
                className={inputClassName}
                type="number"
                step="any"
                value={propertySurfaceForm.pressureMin}
                onChange={(event) =>
                  handlePropertySurfaceFieldChange("pressureMin", event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-medium text-slate-800" htmlFor="surface-pressure-max">
              Pressão máxima (Pa)
              <input
                id="surface-pressure-max"
                className={inputClassName}
                type="number"
                step="any"
                value={propertySurfaceForm.pressureMax}
                onChange={(event) =>
                  handlePropertySurfaceFieldChange("pressureMax", event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-medium text-slate-800" htmlFor="surface-temp-samples">
              Amostras T
              <input
                id="surface-temp-samples"
                className={inputClassName}
                type="number"
                min="4"
                max="40"
                step="1"
                value={propertySurfaceForm.temperatureSamples}
                onChange={(event) =>
                  handlePropertySurfaceFieldChange("temperatureSamples", event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-medium text-slate-800" htmlFor="surface-pressure-samples">
              Amostras P
              <input
                id="surface-pressure-samples"
                className={inputClassName}
                type="number"
                min="4"
                max="40"
                step="1"
                value={propertySurfaceForm.pressureSamples}
                onChange={(event) =>
                  handlePropertySurfaceFieldChange("pressureSamples", event.target.value)
                }
              />
            </label>
          </div>

          <Button type="submit" disabled={isLoadingPropertySurface}>
            {isLoadingPropertySurface ? "Gerando..." : "Gerar superfície"}
          </Button>
        </form>

        {propertySurfaceChart ? (
          <PropertySurfaceHeatmap
            title={propertySurfaceChart.title}
            subtitle={propertySurfaceChart.subtitle}
            fluid={propertySurfaceChart.fluid}
            propertyLabel={translatePropertyBaseLabel(propertySurfaceChart.property_label)}
            propertyUnits={propertySurfaceChart.property_units}
            xAxis={propertySurfaceChart.x_axis}
            yAxis={propertySurfaceChart.y_axis}
            cells={propertySurfaceChart.cells}
            legendStops={propertySurfaceChart.legend_stops}
            valueMin={propertySurfaceChart.value_min}
            valueMax={propertySurfaceChart.value_max}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            A superfície aparecerá após a geração do mapa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ComponentsPhaseEnvelopeTab() {
  const {
    components,
    phaseEnvelopeForm,
    handlePhaseEnvelopeFieldChange,
    isLoadingEnvelope,
    handleSaturationEnvelopeSubmit,
    saturationEnvelope,
    phaseEnvelopeChart,
    vaporPressureChart,
  } = useComponentsPageContext();
  const componentOptions = buildComponentOptions(components);

  return (
    <Card>
      <CardHeader title="Envelope de Fase" />
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Gere o domo de saturação T-s do fluido selecionado usando o ponto tríplice e o ponto
          crítico da base termodinâmica.
        </p>
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <Combobox
            label="Fluido do envelope"
            options={componentOptions}
            value={phaseEnvelopeForm.fluid}
            onValueChange={(value) => handlePhaseEnvelopeFieldChange("fluid", value)}
            placeholder="Selecione um fluido"
          />
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="phase-envelope-samples"
          >
            Quantidade de pontos
            <input
              id="phase-envelope-samples"
              className={inputClassName}
              type="number"
              min="10"
              max="200"
              step="1"
              value={phaseEnvelopeForm.sampleCount}
              onChange={(event) =>
                handlePhaseEnvelopeFieldChange("sampleCount", event.target.value)
              }
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={!phaseEnvelopeForm.fluid || !phaseEnvelopeForm.sampleCount.trim() || isLoadingEnvelope}
            onClick={() => void handleSaturationEnvelopeSubmit()}
          >
            {isLoadingEnvelope ? "Traçando..." : "Traçar envelope"}
          </Button>
          {!phaseEnvelopeForm.fluid ? (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-muted-foreground">
              Selecione um fluido acima.
            </span>
          ) : null}
        </div>

        {phaseEnvelopeChart && saturationEnvelope ? (
          <PhaseEnvelopeChart
            critical={saturationEnvelope.critical}
            model={phaseEnvelopeChart}
            triple={saturationEnvelope.triple}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            O gráfico aparecerá após a geração do envelope.
          </p>
        )}

        {saturationEnvelope && vaporPressureChart ? (
          <VaporPressureCurve
            critical={saturationEnvelope.critical}
            fluid={saturationEnvelope.fluid}
            model={vaporPressureChart}
            triple={saturationEnvelope.triple}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
