import { useEffect, useRef, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import type { Scenario } from "@/features/exploratory/types";
import { componentsExploratory } from "@/features/components/presets";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { selectOptionValue, toSelectOption, type SelectOption } from "@/lib/select-option";
import type { PropertyRow } from "@/components/property-table";

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

type BinaryVlePoint = {
  liquid_fraction: number;
  vapor_fraction: number;
  temperature: number;
};

type BinaryVleResponse = {
  fluid1: string;
  fluid2: string;
  pressure: number;
  bubble_points: BinaryVlePoint[];
  dew_points: BinaryVlePoint[];
};

type PropertySurfaceResponse = {
  fluid: string;
  property_name: string;
  property_label: string;
  property_units: string;
  temperatures: number[];
  pressures: number[];
  values: Array<Array<number | null>>;
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

const propertySurfaceKeys = new Set(["D", "C", "V", "L", "H", "S", "U", "A", "Z"]);

const propertyLabelsPt: Record<string, string> = {
  Density: "Densidade",
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
  { value: "D", label: "Densidade" },
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
    critical_density: "Densidade crítica",
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
): PropertyRow[] {
  return propertyKeys.flatMap((propertyKey) => {
    const result = propertyMap[propertyKey];
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

export function ComponentsPage() {
  const [components, setComponents] = useState<SelectOption[]>([]);
  const [propertyNames, setPropertyNames] = useState<PropertyNamesResponse>({});
  const [mixturePropertyNames, setMixturePropertyNames] = useState<PropertyNamesResponse>({});
  const [pageError, setPageError] = useState<string | null>(null);

  const [criticalFluid, setCriticalFluid] = useState("");
  const [criticalResult, setCriticalResult] = useState<CriticalPropertiesResponse | null>(null);
  const [saturationEnvelope, setSaturationEnvelope] =
    useState<SaturationEnvelopeResponse | null>(null);
  const [isLoadingEnvelope, setIsLoadingEnvelope] = useState(false);
  const [binaryVleForm, setBinaryVleForm] = useState({
    fluid1: "",
    fluid2: "",
    pressure: "101325",
    sampleCount: "21",
  });
  const [binaryVleResult, setBinaryVleResult] = useState<BinaryVleResponse | null>(null);
  const [isLoadingBinaryVle, setIsLoadingBinaryVle] = useState(false);
  const [mccabeForm, setMccabeForm] = useState({
    distillateComposition: "0.95",
    bottomsComposition: "0.05",
    feedComposition: "0.5",
    refluxRatio: "2.5",
    qValue: "1",
    maxStages: "10",
  });
  const [propertySurfaceForm, setPropertySurfaceForm] = useState({
    fluid: "",
    propertyName: "D",
    temperatureMin: "273.15",
    temperatureMax: "600",
    pressureMin: "100000",
    pressureMax: "5000000",
    temperatureSamples: "12",
    pressureSamples: "10",
  });
  const [propertySurfaceResult, setPropertySurfaceResult] =
    useState<PropertySurfaceResponse | null>(null);
  const [isLoadingPropertySurface, setIsLoadingPropertySurface] = useState(false);
  const [ternaryForm, setTernaryForm] = useState<TernaryFormState>({
    componentA: "",
    componentB: "",
    componentC: "",
    fractionA: "0.33",
    fractionB: "0.33",
    fractionC: "0.34",
    streamName: "Corrente atual",
  });
  const criticalSessionRef = useRef(0);
  const propertySurfaceSessionRef = useRef(0);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);

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

  function clearDerivedResults() {
    criticalSessionRef.current += 1;
    propertySessionRef.current += 1;
    mixtureSessionRef.current += 1;
    propertySurfaceSessionRef.current += 1;
    setCriticalResult(null);
    setSaturationEnvelope(null);
    setBinaryVleResult(null);
    setIsLoadingEnvelope(false);
    setIsLoadingBinaryVle(false);
    setIsLoadingPropertySurface(false);
    setPropertyResult({});
    setMixtureResult(null);
    setPropertySurfaceResult(null);
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

        const getComponentValue = (index: number, fallback = "") =>
          componentResponse[index] ? selectOptionValue(componentResponse[index]) : fallback;

        setComponents(componentResponse.map(toSelectOption));
        setPropertyNames(propertyNamesResponse);
        setMixturePropertyNames(mixtureNamesResponse);
        setPropertyForm((current) => ({
          ...current,
          fluid: getComponentValue(0),
          propertyNames: Object.keys(propertyNamesResponse).slice(0, 1),
        }));
        setCriticalFluid(getComponentValue(0));
        setBinaryVleForm((current) => ({
          ...current,
          fluid1: getComponentValue(0, current.fluid1),
          fluid2: getComponentValue(1, getComponentValue(0, current.fluid2)),
        }));
        setPropertySurfaceForm((current) => ({
          ...current,
          fluid: getComponentValue(0, current.fluid),
          propertyName:
            Object.keys(propertyNamesResponse).find((key) => propertySurfaceKeys.has(key)) ??
            current.propertyName,
        }));
        setTernaryForm((current) => ({
          ...current,
          componentA: getComponentValue(0, current.componentA),
          componentB: getComponentValue(1, getComponentValue(0, current.componentB)),
          componentC: getComponentValue(2, getComponentValue(1, getComponentValue(0, current.componentC))),
        }));
        setMixtureRows([
          { id: 1, component: getComponentValue(0), fraction: "" },
          { id: 2, component: getComponentValue(1, getComponentValue(0)), fraction: "" },
        ]);
        setMixtureForm((current) => ({
          ...current,
          propertyNames: Object.keys(mixtureNamesResponse),
        }));
        setStateForm((current) => ({
          ...current,
          fluid: getComponentValue(0),
        }));
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

  function applyExploratoryFields(fields: Record<string, string>) {
    clearDerivedResults();

    if (fields["surface-fluid"] !== undefined) {
      setPropertySurfaceForm((current) => ({ ...current, fluid: fields["surface-fluid"] }));
      setCriticalFluid(fields["surface-fluid"]);
      setPropertyForm((current) => ({ ...current, fluid: fields["surface-fluid"] }));
      setStateForm((current) => ({ ...current, fluid: fields["surface-fluid"] }));
    }

    if (fields["surface-property"] !== undefined) {
      setPropertySurfaceForm((current) => ({ ...current, propertyName: fields["surface-property"] }));
    }

    if (fields["surface-temperature-min"] !== undefined) {
      setPropertySurfaceForm((current) => ({
        ...current,
        temperatureMin: fields["surface-temperature-min"],
      }));
    }

    if (fields["surface-temperature-max"] !== undefined) {
      setPropertySurfaceForm((current) => ({
        ...current,
        temperatureMax: fields["surface-temperature-max"],
      }));
    }

    if (fields["surface-pressure-min"] !== undefined) {
      setPropertySurfaceForm((current) => ({
        ...current,
        pressureMin: fields["surface-pressure-min"],
      }));
    }

    if (fields["surface-pressure-max"] !== undefined) {
      setPropertySurfaceForm((current) => ({
        ...current,
        pressureMax: fields["surface-pressure-max"],
      }));
    }

    if (fields["surface-temp-samples"] !== undefined) {
      setPropertySurfaceForm((current) => ({
        ...current,
        temperatureSamples: fields["surface-temp-samples"],
      }));
    }

    if (fields["surface-pressure-samples"] !== undefined) {
      setPropertySurfaceForm((current) => ({
        ...current,
        pressureSamples: fields["surface-pressure-samples"],
      }));
    }

    if (fields["binary-fluid-1"] !== undefined || fields["binary-fluid-2"] !== undefined) {
      setBinaryVleForm((current) => ({
        ...current,
        fluid1: fields["binary-fluid-1"] ?? current.fluid1,
        fluid2: fields["binary-fluid-2"] ?? current.fluid2,
      }));
    }

    if (fields["binary-vle-pressure"] !== undefined) {
      setBinaryVleForm((current) => ({
        ...current,
        pressure: fields["binary-vle-pressure"],
      }));
    }

    if (fields["binary-vle-samples"] !== undefined) {
      setBinaryVleForm((current) => ({
        ...current,
        sampleCount: fields["binary-vle-samples"],
      }));
    }

    if (fields["mccabe-distillate"] !== undefined) {
      setMccabeForm((current) => ({
        ...current,
        distillateComposition: fields["mccabe-distillate"],
      }));
    }

    if (fields["mccabe-bottoms"] !== undefined) {
      setMccabeForm((current) => ({
        ...current,
        bottomsComposition: fields["mccabe-bottoms"],
      }));
    }

    if (fields["mccabe-feed"] !== undefined) {
      setMccabeForm((current) => ({
        ...current,
        feedComposition: fields["mccabe-feed"],
      }));
    }

    if (fields["mccabe-reflux"] !== undefined) {
      setMccabeForm((current) => ({
        ...current,
        refluxRatio: fields["mccabe-reflux"],
      }));
    }

    if (fields["mccabe-q"] !== undefined) {
      setMccabeForm((current) => ({
        ...current,
        qValue: fields["mccabe-q"],
      }));
    }

    if (fields["mccabe-max-stages"] !== undefined) {
      setMccabeForm((current) => ({
        ...current,
        maxStages: fields["mccabe-max-stages"],
      }));
    }
  }

  function changeExploratoryField(field: string, value: string) {
    clearDerivedResults();

    if (field === "surface-pressure-max") {
      setPropertySurfaceForm((current) => ({ ...current, pressureMax: value }));
      return;
    }

    if (field === "binary-vle-pressure") {
      setBinaryVleForm((current) => ({ ...current, pressure: value }));
      return;
    }

    if (field === "mccabe-reflux") {
      setMccabeForm((current) => ({ ...current, refluxRatio: value }));
      return;
    }

    if (field === "mccabe-q") {
      setMccabeForm((current) => ({ ...current, qValue: value }));
      return;
    }
  }

  function describeScenario() {
    return `VLE ${binaryVleForm.fluid1 || "—"} / ${binaryVleForm.fluid2 || "—"} · R=${mccabeForm.refluxRatio || "—"} · fluido ${propertySurfaceForm.fluid || "—"}`;
  }

  async function handleSaturationEnvelopeSubmit() {
    if (!criticalFluid) {
      notify.error("Selecione um fluido");
      return;
    }

    setIsLoadingEnvelope(true);

    try {
      const response = await apiClient.post<SaturationEnvelopeResponse>(
        "/components/saturation-envelope",
        {
          fluid: criticalFluid,
        },
      );

      setSaturationEnvelope(response);
    } catch (error) {
      notify.error(`Erro ao obter envelope de fase: ${getErrorMessage(error)}`);
    } finally {
      setIsLoadingEnvelope(false);
    }
  }

  async function handleBinaryVleSubmit() {
    if (!binaryVleForm.fluid1 || !binaryVleForm.fluid2) {
      notify.error("Selecione dois fluidos");
      return;
    }

    setIsLoadingBinaryVle(true);

    try {
      const response = await apiClient.post<BinaryVleResponse>("/components/binary-vle", {
        fluid1: binaryVleForm.fluid1,
        fluid2: binaryVleForm.fluid2,
        pressure: Number(binaryVleForm.pressure),
        sample_count: Number(binaryVleForm.sampleCount),
      });

      setBinaryVleResult(response);
    } catch (error) {
      notify.error(`Erro ao obter diagrama binário: ${getErrorMessage(error)}`);
    } finally {
      setIsLoadingBinaryVle(false);
    }
  }

  function handleMccabeFieldChange(field: keyof typeof mccabeForm, value: string) {
    setMccabeForm((current) => ({ ...current, [field]: value }));
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
      const response = await apiClient.post<PropertySurfaceResponse>("/components/property-surface", {
        fluid: propertySurfaceForm.fluid,
        property_name: propertySurfaceForm.propertyName,
        temperature_min: Number(propertySurfaceForm.temperatureMin),
        temperature_max: Number(propertySurfaceForm.temperatureMax),
        pressure_min: Number(propertySurfaceForm.pressureMin),
        pressure_max: Number(propertySurfaceForm.pressureMax),
        temperature_samples: Number(propertySurfaceForm.temperatureSamples),
        pressure_samples: Number(propertySurfaceForm.pressureSamples),
      });

      if (sessionId !== propertySurfaceSessionRef.current) {
        return;
      }

      setPropertySurfaceResult(response);
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
      const responses = await Promise.all(
        propertyForm.propertyNames.map(async (propertyName) => {
          const response = await apiClient.post<QuantityResult>("/components/property", {
            fluid: propertyForm.fluid,
            property_name: propertyName,
            temperature: Number(propertyForm.temperature),
            pressure: Number(propertyForm.pressure),
          });

          return [propertyName, response] as const;
        }),
      );

      if (sessionId !== propertySessionRef.current) {
        return;
      }

      setPropertyResult(Object.fromEntries(responses));
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
      const response = await apiClient.post<MixturePropertiesResponse>(
        "/components/mixture-properties",
        {
          fluid_fractions: fluidFractions,
          temperature: Number(mixtureForm.temperature),
          pressure: Number(mixtureForm.pressure),
          properties: mixtureForm.propertyNames,
        },
      );
      if (sessionId !== mixtureSessionRef.current) {
        return;
      }

      setMixtureResult(response);
    } catch (error) {
      if (sessionId !== mixtureSessionRef.current) {
        return;
      }

      notify.error(`Erro ao calcular propriedades da mistura: ${getErrorMessage(error)}`);
    }
  }

  function handleStateFormChange(field: keyof typeof stateForm, value: string) {
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

  const propertyRows = buildPropertyRows(propertyForm.propertyNames, propertyResult, propertyNames);
  const mixturePropertyRows = buildPropertyRows(
    mixtureForm.propertyNames,
    mixtureResult?.properties ?? {},
    mixturePropertyNames,
  );
  const componentOptions = buildComponentOptions(components);
  const propertyOptions = buildPropertyOptions(propertyNames);
  const mixturePropertyOptions = buildPropertyOptions(mixturePropertyNames);
  const surfacePropertyOptions = buildSurfacePropertyOptions(propertyNames);
  const mixtureComposition = mixtureRows
    .filter((row) => row.component && row.fraction !== "")
    .map((row) => ({
      component: row.component,
      fraction: Number(row.fraction),
    }));
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
  const mccabeEquilibriumPoints = binaryVleResult?.bubble_points ?? [];
  return (
    <section className="space-y-8 p-6 md:p-8">
      <Card>
        <CardHeader
          level={1}
          subtitle={
            <>
              <p>
                Consulte propriedades críticas, propriedades de fluidos puros e
                propriedades de misturas usando os serviços já expostos pela API.
              </p>
              {pageError ? <p className="text-red-600">{pageError}</p> : null}
            </>
          }
          title="Propriedades de Componentes"
          variant="hero"
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
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
                Temperatura do fluido
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
                Pressão do fluido
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

        <Card>
          <CardHeader title="Propriedades por Estado" />
          <CardContent>
            <form className="space-y-4" onSubmit={handleStateSubmit}>
              <Combobox
                label="Fluido de estado"
                options={componentOptions}
                value={stateForm.fluid}
                onValueChange={(value) => handleStateFormChange("fluid", value)}
                placeholder="Selecione um fluido"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Combobox
                  label="Variável 1"
                  options={stateVariableComboboxOptions}
                  value={stateForm.input1}
                  onValueChange={(value) => handleStateFormChange("input1", value)}
                  placeholder="Selecione uma variável"
                />
                <label className="block text-sm font-medium text-slate-800" htmlFor="state-value1">
                  Valor 1
                  <input
                    id="state-value1"
                    className={inputClassName}
                    type="number"
                    step="any"
                    value={stateForm.value1}
                    onChange={(event) => handleStateFormChange("value1", event.target.value)}
                  />
                </label>
                <Combobox
                  label="Variável 2"
                  options={stateVariableComboboxOptions}
                  value={stateForm.input2}
                  onValueChange={(value) => handleStateFormChange("input2", value)}
                  placeholder="Selecione uma variável"
                />
                <label className="block text-sm font-medium text-slate-800" htmlFor="state-value2">
                  Valor 2
                  <input
                    id="state-value2"
                    className={inputClassName}
                    type="number"
                    step="any"
                    value={stateForm.value2}
                    onChange={(event) => handleStateFormChange("value2", event.target.value)}
                  />
                </label>
              </div>

              <Combobox
                label="Propriedade de saída"
                options={stateVariableComboboxOptions}
                value={stateForm.output}
                onValueChange={(value) => handleStateFormChange("output", value)}
                placeholder="Selecione uma variável"
              />

              <Button type="submit">Calcular por estado</Button>
            </form>

            {stateResult ? (
              <ResultTableSection
                title="Resultado"
                emptyLabel="Calcule por estado para visualizar o resultado."
                rows={[
                  {
                    label: getStateVariableLabel(stateForm.output),
                    value: stateResult.value,
                    units: stateResult.units,
                  },
                ]}
                showTitleWhenEmpty={false}
              />
            ) : null}
          </CardContent>
        </Card>

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
                Temperatura da mistura
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
                Pressão da mistura
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
      </div>

      <ExploratoryPanel
        config={componentsExploratory}
        state={{
          applyFields: applyExploratoryFields,
          changeField: changeExploratoryField,
          describeScenario,
        }}
        onScenariosChange={setSavedScenarios}
      />

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
              onValueChange={(value) =>
                setTernaryForm((current) => ({ ...current, componentA: value }))
              }
              placeholder="Selecione um fluido"
            />
            <Combobox
              label="Componente B"
              options={componentOptions}
              value={ternaryForm.componentB}
              onValueChange={(value) =>
                setTernaryForm((current) => ({ ...current, componentB: value }))
              }
              placeholder="Selecione um fluido"
            />
            <Combobox
              label="Componente C"
              options={componentOptions}
              value={ternaryForm.componentC}
              onValueChange={(value) =>
                setTernaryForm((current) => ({ ...current, componentC: value }))
              }
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
                onChange={(event) =>
                  setTernaryForm((current) => ({ ...current, fractionA: event.target.value }))
                }
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
                onChange={(event) =>
                  setTernaryForm((current) => ({ ...current, fractionB: event.target.value }))
                }
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
                onChange={(event) =>
                  setTernaryForm((current) => ({ ...current, fractionC: event.target.value }))
                }
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
              onChange={(event) =>
                setTernaryForm((current) => ({ ...current, streamName: event.target.value }))
              }
            />
          </label>

          {ternaryReady ? (
            <TernaryDiagram
              components={ternaryComponents}
              streams={[
                {
                  name: ternaryForm.streamName.trim() || "Corrente atual",
                  direction: "alimentação",
                  compositions: {
                    [ternaryForm.componentA]: ternaryFractions[0],
                    [ternaryForm.componentB]: ternaryFractions[1],
                    [ternaryForm.componentC]: ternaryFractions[2],
                  },
                },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione três componentes distintos e valores numéricos para visualizar o triângulo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Diagrama T-x-y / y-x" />
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
              onValueChange={(value) => {
                setBinaryVleResult(null);
                setBinaryVleForm((current) => ({ ...current, fluid1: value }));
              }}
              placeholder="Selecione um fluido"
            />
            <Combobox
              label="Componente 2"
              options={componentOptions}
              value={binaryVleForm.fluid2}
              onValueChange={(value) => {
                setBinaryVleResult(null);
                setBinaryVleForm((current) => ({ ...current, fluid2: value }));
              }}
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
                onChange={(event) => {
                  setBinaryVleResult(null);
                  setBinaryVleForm((current) => ({ ...current, pressure: event.target.value }));
                }}
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
                onChange={(event) => {
                  setBinaryVleResult(null);
                  setBinaryVleForm((current) => ({
                    ...current,
                    sampleCount: event.target.value,
                  }));
                }}
              />
            </label>
            <div className="flex items-end">
              <Button type="button" disabled={isLoadingBinaryVle} onClick={() => void handleBinaryVleSubmit()}>
                {isLoadingBinaryVle ? "Gerando..." : "Gerar diagrama"}
              </Button>
            </div>
          </div>

          {binaryVleResult ? (
            <BinaryVleChart
              fluid1={binaryVleResult.fluid1}
              fluid2={binaryVleResult.fluid2}
              pressure={binaryVleResult.pressure}
              bubblePoints={binaryVleResult.bubble_points}
              dewPoints={binaryVleResult.dew_points}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              O diagrama aparecerá após a geração das curvas.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="McCabe-Thiele" />
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Construção didática de estágios teóricos usando o equilíbrio binário já gerado acima.
            O objetivo aqui é visualizar a lógica do método sem criar um módulo completo de destilação.
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
                onChange={(event) => handleMccabeFieldChange("distillateComposition", event.target.value)}
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

          {binaryVleResult ? (
            <McCabeThieleChart
              fluid1={binaryVleResult.fluid1}
              fluid2={binaryVleResult.fluid2}
              equilibriumPoints={mccabeEquilibriumPoints}
              distillateComposition={Number(mccabeForm.distillateComposition)}
              bottomsComposition={Number(mccabeForm.bottomsComposition)}
              feedComposition={Number(mccabeForm.feedComposition)}
              refluxRatio={Number(mccabeForm.refluxRatio)}
              qValue={Number(mccabeForm.qValue)}
              maxStages={Number(mccabeForm.maxStages)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Gere primeiro o diagrama T-x-y / y-x para reutilizar o equilíbrio binário.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Superfície de Propriedades" />
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mapa T-P para uma propriedade termodinâmica do CoolProp. Útil para ver
            variações de densidade, entalpia, entropia e outras propriedades sem
            montar um módulo completo.
          </p>

          <form className="space-y-4" onSubmit={handlePropertySurfaceSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Combobox
                label="Fluido"
                options={componentOptions}
                value={propertySurfaceForm.fluid}
                onValueChange={(value) => {
                  clearDerivedResults();
                  setPropertySurfaceForm((current) => ({ ...current, fluid: value }));
                }}
                placeholder="Selecione um fluido"
              />
              <Combobox
                label="Propriedade"
                options={surfacePropertyOptions}
                value={propertySurfaceForm.propertyName}
                onValueChange={(value) => {
                  clearDerivedResults();
                  setPropertySurfaceForm((current) => ({ ...current, propertyName: value }));
                }}
                placeholder="Selecione uma propriedade"
              />
              <label className="block text-sm font-medium text-slate-800" htmlFor="surface-temp-min">
                Temperatura mínima
                <input
                  id="surface-temp-min"
                  className={inputClassName}
                  type="number"
                  step="any"
                  value={propertySurfaceForm.temperatureMin}
                  onChange={(event) => {
                    clearDerivedResults();
                    setPropertySurfaceForm((current) => ({
                      ...current,
                      temperatureMin: event.target.value,
                    }));
                  }}
                />
              </label>
              <label className="block text-sm font-medium text-slate-800" htmlFor="surface-temp-max">
                Temperatura máxima
                <input
                  id="surface-temp-max"
                  className={inputClassName}
                  type="number"
                  step="any"
                  value={propertySurfaceForm.temperatureMax}
                  onChange={(event) => {
                    clearDerivedResults();
                    setPropertySurfaceForm((current) => ({
                      ...current,
                      temperatureMax: event.target.value,
                    }));
                  }}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px_180px]">
              <label className="block text-sm font-medium text-slate-800" htmlFor="surface-pressure-min">
                Pressão mínima
                <input
                  id="surface-pressure-min"
                  className={inputClassName}
                  type="number"
                  step="any"
                  value={propertySurfaceForm.pressureMin}
                  onChange={(event) => {
                    clearDerivedResults();
                    setPropertySurfaceForm((current) => ({
                      ...current,
                      pressureMin: event.target.value,
                    }));
                  }}
                />
              </label>
              <label className="block text-sm font-medium text-slate-800" htmlFor="surface-pressure-max">
                Pressão máxima
                <input
                  id="surface-pressure-max"
                  className={inputClassName}
                  type="number"
                  step="any"
                  value={propertySurfaceForm.pressureMax}
                  onChange={(event) => {
                    clearDerivedResults();
                    setPropertySurfaceForm((current) => ({
                      ...current,
                      pressureMax: event.target.value,
                    }));
                  }}
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
                  onChange={(event) => {
                    clearDerivedResults();
                    setPropertySurfaceForm((current) => ({
                      ...current,
                      temperatureSamples: event.target.value,
                    }));
                  }}
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
                  onChange={(event) => {
                    clearDerivedResults();
                    setPropertySurfaceForm((current) => ({
                      ...current,
                      pressureSamples: event.target.value,
                    }));
                  }}
                />
              </label>
            </div>

            <Button type="submit" disabled={isLoadingPropertySurface}>
              {isLoadingPropertySurface ? "Gerando..." : "Gerar superfície"}
            </Button>
          </form>

          {propertySurfaceResult ? (
            <PropertySurfaceHeatmap
              fluid={propertySurfaceResult.fluid}
              propertyLabel={translatePropertyBaseLabel(
                propertyNames[propertySurfaceResult.property_name] ??
                  propertySurfaceResult.property_label,
              )}
              propertyUnits={propertySurfaceResult.property_units}
              temperatures={propertySurfaceResult.temperatures}
              pressures={propertySurfaceResult.pressures}
              values={propertySurfaceResult.values}
              valueMin={propertySurfaceResult.value_min}
              valueMax={propertySurfaceResult.value_max}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              A superfície aparecerá após a geração do mapa.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Envelope de Fase" />
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gere o domo de saturação T-s do fluido selecionado usando o ponto
            tríplice e o ponto crítico da base termodinâmica.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={!criticalFluid || isLoadingEnvelope}
              onClick={() => void handleSaturationEnvelopeSubmit()}
            >
              {isLoadingEnvelope ? "Traçando..." : "Traçar envelope"}
            </Button>
            {criticalFluid ? (
              <span className="text-sm text-muted-foreground">
                Fluido selecionado: {criticalFluid}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Selecione um fluido acima.</span>
            )}
          </div>

          {saturationEnvelope ? (
            <PhaseEnvelopeChart
              critical={saturationEnvelope.critical}
              fluid={saturationEnvelope.fluid}
              points={saturationEnvelope.points}
              triple={saturationEnvelope.triple}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              O gráfico aparecerá após a geração do envelope.
            </p>
          )}

          {saturationEnvelope ? (
            <VaporPressureCurve
              critical={saturationEnvelope.critical}
              fluid={saturationEnvelope.fluid}
              points={saturationEnvelope.points.map((point) => ({
                temperature: point.temperature,
                pressure: point.pressure,
              }))}
              triple={saturationEnvelope.triple}
            />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
