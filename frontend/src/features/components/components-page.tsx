import { useEffect, useRef, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PropertyTable } from "@/components/property-table";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import {
  CriticalPropertiesHowItWorks,
  MixturePropertiesHowItWorks,
  PurePropertiesHowItWorks,
} from "@/features/components/didactics";
import { PhaseEnvelopeChart } from "@/components/viz/phase-envelope-chart";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";

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
  value: string;
};

type PropertyResultRow = {
  key: string;
  label: string;
  value: string;
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
  "Quality (vapor fraction)": "Titulo (fração de vapor)",
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
    return `${quantity.value} ${quantity.units}`;
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

function formatCriticalProperties(result: CriticalPropertiesResponse): CriticalPropertyRow[] {
  const criticalLabels: Record<string, string> = {
    critical_temperature: "Critical Temperature",
    critical_pressure: "Critical Pressure",
    critical_density: "Critical Density",
    triple_point_temperature: "Triple Point Temperature",
    triple_point_pressure: "Triple Point Pressure",
  };

  return Object.entries(result).flatMap(([key, value]) => {
    if (key.endsWith("_units")) {
      return [];
    }

    const unitsKey = `${key}_units`;
    const units = typeof result[unitsKey] === "string" ? ` ${result[unitsKey]}` : "";

    return [
      {
        key,
        label: criticalLabels[key] ?? key,
        value: `${formatValue(value)}${units}`,
      },
    ];
  });
}

function buildPropertyRows(
  propertyKeys: string[],
  propertyMap: Record<string, QuantityResult>,
  propertyNames: PropertyNamesResponse,
) {
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
      },
    ];
  });
}

function buildComponentOptions(components: string[]) {
  return components.map((component) => ({
    value: component,
    label: component,
  }));
}

function buildPropertyOptions(propertyNames: PropertyNamesResponse) {
  return Object.entries(propertyNames).map(([key, label]) => ({
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

function getSelectedValues(event: React.ChangeEvent<HTMLSelectElement>) {
  return Array.from(event.currentTarget.selectedOptions, (option) => option.value);
}

export function ComponentsPage() {
  const [components, setComponents] = useState<string[]>([]);
  const [propertyNames, setPropertyNames] = useState<PropertyNamesResponse>({});
  const [mixturePropertyNames, setMixturePropertyNames] = useState<PropertyNamesResponse>({});
  const [pageError, setPageError] = useState<string | null>(null);

  const [criticalFluid, setCriticalFluid] = useState("");
  const [criticalResult, setCriticalResult] = useState<CriticalPropertiesResponse | null>(null);
  const [saturationEnvelope, setSaturationEnvelope] =
    useState<SaturationEnvelopeResponse | null>(null);
  const [isLoadingEnvelope, setIsLoadingEnvelope] = useState(false);
  const criticalSessionRef = useRef(0);

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
    setCriticalResult(null);
    setSaturationEnvelope(null);
    setPropertyResult({});
    setMixtureResult(null);
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
          apiClient.get<string[]>("/components/list"),
          apiClient.get<PropertyNamesResponse>("/components/property-names"),
          apiClient.get<PropertyNamesResponse>("/components/property-mixture-names"),
        ]);

        if (ignore) {
          return;
        }

        setComponents(componentResponse);
        setPropertyNames(propertyNamesResponse);
        setMixturePropertyNames(mixtureNamesResponse);
        setPropertyForm((current) => ({
          ...current,
          fluid: componentResponse[0] ?? "",
          propertyNames: Object.keys(propertyNamesResponse).slice(0, 1),
        }));
        setCriticalFluid(componentResponse[0] ?? "");
        setMixtureRows([
          { id: 1, component: componentResponse[0] ?? "", fraction: "" },
          { id: 2, component: componentResponse[1] ?? componentResponse[0] ?? "", fraction: "" },
        ]);
        setMixtureForm((current) => ({
          ...current,
          propertyNames: Object.keys(mixtureNamesResponse),
        }));
        setStateForm((current) => ({
          ...current,
          fluid: componentResponse[0] ?? "",
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

  function handlePropertyNamesChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const selectedValues = getSelectedValues(event);
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

  function handleMixturePropertiesChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const selectedValues = getSelectedValues(event);
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
  const mixtureComposition = mixtureRows
    .filter((row) => row.component && row.fraction !== "")
    .map((row) => ({
      component: row.component,
      fraction: Number(row.fraction),
    }));
  return (
    <section className="space-y-8 p-6 md:p-8">
      <Card>
        <CardHeader>
          <h1 className="text-3xl font-semibold">Propriedades de Componentes</h1>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Consulte propriedades críticas, propriedades de fluidos puros e
          propriedades de misturas usando os serviços já expostos pela API.
          {pageError ? <p className="mt-3 text-red-600">{pageError}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Propriedades Críticas</h2>
          </CardHeader>
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
              <dl className="mt-6 grid gap-3">
                {formatCriticalProperties(criticalResult).map(({ key, label, value }) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm text-slate-900">{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Fluido Puro</h2>
          </CardHeader>
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
              <dl className="mt-6 grid gap-3">
                {propertyRows.map(({ key, label, value }) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Propriedades por Estado</h2>
          </CardHeader>
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
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Resultado
                </p>
                <PropertyTable
                  rows={[
                    {
                      label: getStateVariableLabel(stateForm.output),
                      value: stateResult.value,
                      units: stateResult.units,
                    },
                  ]}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Misturas</h2>
          </CardHeader>
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
                <dl className="mt-6 grid gap-3">
                  {mixturePropertyRows.map(({ key, label, value }) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Envelope de Fase</h2>
        </CardHeader>
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
        </CardContent>
      </Card>
    </section>
  );
}
