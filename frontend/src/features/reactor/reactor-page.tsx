import { useEffect, useRef, useState } from "react";
import { Trash2Icon } from "lucide-react";

import { NumberField } from "@/components/number-field";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PropertyRow } from "@/components/property-table";
import { ResultTableSection } from "@/components/result-table-section";
import { LevenspielChart } from "@/components/viz/levenspiel-chart";
import { ArrheniusPlot } from "@/components/viz/arrhenius-plot";
import { PfrProfileChart } from "@/components/viz/pfr-profile-chart";
import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import type { Scenario } from "@/features/exploratory/types";
import { reactorExploratory } from "@/features/exploratory/templates";
import { CstrHowItWorks, PfrHowItWorks } from "@/features/reactor/didactics";
import { reactorWorkedExample } from "@/features/reactor/presets";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { selectOptionValue, toSelectOption, type SelectOption } from "@/lib/select-option";

type ReactorCalculationType = SelectOption;

type ReactorComponentState = {
  state: "liquid" | "gaseous";
  component_name: string;
  flow_rate_inlet: string;
  molar_concentration_inlet: string;
};

type ReactorFormState = {
  inputType: string;
  conversion: string;
  volume: string;
  residenceTime: string;
  recyclingRatio: string;
  rateConstant: string;
  initialTemperature: string;
  initialPressure: string;
  finalTemperature: string;
  finalPressure: string;
  components: ReactorComponentState[];
  stoichiometricCoefficients: string[];
  reactionOrders: string[];
};

type ReactorResultValue =
  | string
  | number
  | null
  | undefined
  | { value: number; units: string };

type ReactorResult = Record<string, ReactorResultValue>;

type PlotFormState = {
  rateConstant: string;
  maxConversion: string;
  activationEnergy: string;
  referenceTemperature: string;
};

type LevenspielPoint = {
  conversion: number;
  cstrVolume: number;
  pfrVolume: number;
};

type ReactorComparableBasis = {
  components: Array<{
    state: ReactorComponentState["state"];
    componentName: string;
    flowRate: string;
    concentration: string;
  }>;
  reactionOrders: string[];
  stoichiometricCoefficients: string[];
  rateConstant: string;
  operationConditions: {
    initialTemperature: string;
    initialPressure: string;
    finalTemperature: string;
    finalPressure: string;
  };
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400";

const removeButtonClassName =
  "border-destructive/40 bg-background text-destructive shadow-sm hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive";

function createEmptyComponent(componentName = ""): ReactorComponentState {
  return {
    state: "liquid",
    component_name: componentName,
    flow_rate_inlet: "",
    molar_concentration_inlet: "",
  };
}

function createFormState(): ReactorFormState {
  return {
    inputType: "conversion_and_kinetics",
    conversion: "",
    volume: "",
    residenceTime: "",
    recyclingRatio: "0",
    rateConstant: "",
    initialTemperature: "298.15",
    initialPressure: "101325",
    finalTemperature: "298.15",
    finalPressure: "101325",
    components: [createEmptyComponent(), createEmptyComponent()],
    stoichiometricCoefficients: ["", ""],
    reactionOrders: ["", ""],
  };
}

function createPlotFormState(): PlotFormState {
  return {
    rateConstant: reactorWorkedExample.plot.rateConstant,
    maxConversion: reactorWorkedExample.plot.maxConversion,
    activationEnergy: reactorWorkedExample.plot.activationEnergy,
    referenceTemperature: reactorWorkedExample.plot.referenceTemperature,
  };
}

function formatLabel(key: string) {
  const translatedLabels: Record<string, string> = {
    volume: "Volume",
    conversion: "Conversão",
    conversao: "Conversão",
    "molar_rate_inlet_(limitant)": "Taxa molar na entrada (limitante)",
    "vazao_molar_entrada_(limitante)": "Vazão molar de entrada (limitante)",
    flow_rate_outlet: "Vazão de saída",
    vazao_de_saida: "Vazão de saída",
    reaction_rate: "Taxa de reação",
    taxa_de_reacao: "Taxa de reação",
    outlet_concentrations: "Concentrações na saída",
    concentracoes_de_saida: "Concentrações na saída",
    "dilution_factor_(1+e * P0*T)": "Fator de diluição (1 + ε·P0·T)",
    "fator_de_diluicao_(1+e * P0*T)": "Fator de diluição (1 + ε·P0·T)",
    "fator_de_diluicao_(1+e * P0*T/P*T0)": "Fator de diluição (1 + ε·P0·T / P·T0)",
    residence_time: "Tempo de residência",
    tempo_de_residencia: "Tempo de residência",
    dilution_factor: "Fator de diluição",
    fator_de_diluicao: "Fator de diluição",
  };

  if (key in translatedLabels) {
    return translatedLabels[key];
  }

  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getResultValue(result: ReactorResult, ...keys: string[]) {
  for (const key of keys) {
    if (key in result) {
      return result[key];
    }
  }

  return undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha ao processar a solicitação.";
}

function formatResultRow(value: ReactorResultValue): Pick<PropertyRow, "value" | "units"> {
  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "units" in value
  ) {
    return { value: value.value, units: value.units };
  }

  if (typeof value === "number" || typeof value === "string") {
    return { value };
  }

  return { value: "—" };
}

function extractQuantityValue(value: ReactorResultValue) {
  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof value.value === "number"
  ) {
    return value.value;
  }

  return typeof value === "number" ? value : null;
}

function clampConversion(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 0.99);
}

function normalizeScalar(value: string) {
  return value.trim();
}

function isBlankComponentRow(component: ReactorComponentState) {
  return (
    normalizeScalar(component.component_name) === "" &&
    normalizeScalar(component.flow_rate_inlet) === "" &&
    normalizeScalar(component.molar_concentration_inlet) === ""
  );
}

function activeComponentIndexes(form: ReactorFormState) {
  return form.components.flatMap((component, index) => (isBlankComponentRow(component) ? [] : [index]));
}

function buildComparableBasis(form: ReactorFormState): ReactorComparableBasis | null {
  const indexes = activeComponentIndexes(form);
  if (indexes.length === 0) {
    return null;
  }

  return {
    components: indexes.map((index) => ({
      state: form.components[index].state,
      componentName: normalizeScalar(form.components[index].component_name),
      flowRate: normalizeScalar(form.components[index].flow_rate_inlet),
      concentration: normalizeScalar(form.components[index].molar_concentration_inlet),
    })),
    reactionOrders: indexes.map((index) => normalizeScalar(form.reactionOrders[index] ?? "")),
    stoichiometricCoefficients: indexes.map((index) =>
      normalizeScalar(form.stoichiometricCoefficients[index] ?? ""),
    ),
    rateConstant: normalizeScalar(form.rateConstant),
    operationConditions: {
      initialTemperature: normalizeScalar(form.initialTemperature),
      initialPressure: normalizeScalar(form.initialPressure),
      finalTemperature: normalizeScalar(form.finalTemperature),
      finalPressure: normalizeScalar(form.finalPressure),
    },
  };
}

function formsSharePlotBasis(cstrForm: ReactorFormState, pfrForm: ReactorFormState) {
  const cstrBasis = buildComparableBasis(cstrForm);
  const pfrBasis = buildComparableBasis(pfrForm);

  if (!cstrBasis || !pfrBasis) {
    return false;
  }

  return JSON.stringify(cstrBasis) === JSON.stringify(pfrBasis);
}

function buildPlotPoints(form: ReactorFormState, plot: PlotFormState) {
  const feed = form.components[0];
  const flowRate = Number(feed?.flow_rate_inlet);
  const concentration = Number(feed?.molar_concentration_inlet);
  const order = Number(form.reactionOrders[0] || 1);
  const safeOrder = Number.isFinite(order) ? Math.max(order, 0) : 1;
  const rateConstant = Number(plot.rateConstant || form.rateConstant);
  const maxConversion = Math.min(Math.max(Number(plot.maxConversion || 0.95), 0.1), 0.95);

  if (!(flowRate > 0) || !(concentration > 0) || !(rateConstant > 0)) {
    return { maxConversion, points: [] as LevenspielPoint[] };
  }

  const sampleCount = 10;
  const points: LevenspielPoint[] = [];

  function rateAt(conversion: number) {
    const remaining = Math.max(1 - conversion, 0.001);
    const rate = rateConstant * concentration * remaining ** safeOrder;
    return Math.max(rate, 0.0001);
  }

  function cstrVolumeAt(conversion: number) {
    return Number(((flowRate * conversion) / rateAt(conversion)).toFixed(2));
  }

  function pfrVolumeAt(conversion: number) {
    let integral = 0;
    const segments = 30;

    for (let index = 0; index < segments; index += 1) {
      const x0 = (conversion * index) / segments;
      const x1 = (conversion * (index + 1)) / segments;
      integral += ((1 / rateAt(x0) + 1 / rateAt(x1)) * (x1 - x0)) / 2;
    }

    return Number((flowRate * integral).toFixed(2));
  }

  for (let index = 1; index <= sampleCount; index += 1) {
    const conversion = Number(((maxConversion * index) / sampleCount).toFixed(2));
    points.push({
      conversion,
      cstrVolume: cstrVolumeAt(conversion),
      pfrVolume: pfrVolumeAt(conversion),
    });
  }

  return { maxConversion, points };
}

function extractNestedQuantityValue(value: unknown) {
  if (typeof value === "object" && value !== null && "value" in value) {
    const rawValue = (value as { value?: unknown }).value;
    return typeof rawValue === "number" ? rawValue : null;
  }

  return typeof value === "number" ? value : null;
}

function buildPfrProfileSeries(form: ReactorFormState, result: ReactorResult) {
  const outletConcentrations = getResultValue(
    result,
    "outlet_concentrations",
    "concentracoes_de_saida",
  );
  if (typeof outletConcentrations !== "object" || outletConcentrations === null) {
    return [];
  }

  const palette = ["#0f766e", "#2563eb", "#7c3aed", "#b45309"];

  return activeComponentIndexes(form)
    .map((index, seriesIndex) => {
      const component = form.components[index];
      const start = Number(component.molar_concentration_inlet);
      const end = extractNestedQuantityValue(
        (outletConcentrations as Record<string, unknown>)[component.component_name],
      );

      if (!Number.isFinite(start) || end == null || !Number.isFinite(end)) {
        return null;
      }

      return {
        label: component.component_name,
        start,
        end,
        color: palette[seriesIndex % palette.length],
      };
    })
    .filter((series): series is { label: string; start: number; end: number; color: string } => Boolean(series));
}

function buildReactorPayload(form: ReactorFormState) {
  const indexes = activeComponentIndexes(form);
  const payload: Record<string, unknown> = {
    input_type: form.inputType,
    components: indexes.map((index) => ({
      state: form.components[index].state,
      component_name: form.components[index].component_name,
      flow_rate_inlet: Number(form.components[index].flow_rate_inlet),
      molar_concentration_inlet: Number(form.components[index].molar_concentration_inlet),
    })),
    stoichiometric_coefficients: indexes.map((index) =>
      Number(form.stoichiometricCoefficients[index]),
    ),
    reaction_rate_params: {
      k: Number(form.rateConstant),
      reaction_orders: indexes.map((index) => Number(form.reactionOrders[index])),
    },
    operation_conditions: {
      initial_temperature: Number(form.initialTemperature),
      initial_pressure: Number(form.initialPressure),
      final_temperature: Number(form.finalTemperature),
      final_pressure: Number(form.finalPressure),
    },
  };

  if (form.inputType === "conversion_and_kinetics") {
    payload.conversion = Number(form.conversion);
  }

  if (form.inputType === "volume_and_kinetics") {
    payload.volume = Number(form.volume);
  }

  if (form.inputType === "residence_time_and_kinetics") {
    payload.residence_time = Number(form.residenceTime);
  }

  if (Number(form.recyclingRatio) > 0) {
    payload.recycling_ratio = Number(form.recyclingRatio);
  }

  return payload;
}

type ExploratoryBinding = {
  group: "cstr" | "pfr" | "plot";
  key: string;
};

const exploratoryFieldBindings: Record<string, ExploratoryBinding> = {
  "cstr-conversion": { group: "cstr", key: "conversion" },
  "cstr-rate-constant": { group: "cstr", key: "rateConstant" },
  "pfr-conversion": { group: "pfr", key: "conversion" },
  "pfr-rate-constant": { group: "pfr", key: "rateConstant" },
  "plot-rate-constant": { group: "plot", key: "rateConstant" },
  "plot-max-conversion": { group: "plot", key: "maxConversion" },
};

function ReactorFormCard({
  title,
  calculationTypes,
  componentOptions,
  form,
  submitLabel,
  showRecyclingRatio,
  result,
  error,
  onInputTypeChange,
  onAddComponent,
  onComponentChange,
  onRemoveComponent,
  onStoichiometricChange,
  onReactionOrderChange,
  onFieldChange,
  onSubmit,
}: {
  title: string;
  calculationTypes: ReactorCalculationType[];
  componentOptions: SelectOption[];
  form: ReactorFormState;
  submitLabel: string;
  showRecyclingRatio: boolean;
  result: ReactorResult | null;
  error: string | null;
  onInputTypeChange: (value: string) => void;
  onAddComponent: () => void;
  onComponentChange: (
    index: number,
    field: keyof ReactorComponentState,
    value: string,
  ) => void;
  onRemoveComponent: (index: number) => void;
  onStoichiometricChange: (index: number, value: string) => void;
  onReactionOrderChange: (index: number, value: string) => void;
  onFieldChange: (field: keyof ReactorFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const didactic = title === "CSTR" ? <CstrHowItWorks /> : <PfrHowItWorks />;

  return (
    <Card data-testid={`reactor-${title.toLowerCase()}-card`}>
      <CardHeader title={title} />
      <CardContent className="space-y-6">
        {didactic}

        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Combobox
              label={`Tipo de cálculo ${title}`}
              options={calculationTypes}
              value={form.inputType}
              onValueChange={onInputTypeChange}
              placeholder="Selecione um tipo"
            />

            {showRecyclingRatio ? (
              <NumberField
                id={`${title}-recycling-ratio`}
                label="Razão de reciclo"
                min="0"
                value={form.recyclingRatio}
                onChange={(value) => onFieldChange("recyclingRatio", value)}
              />
            ) : null}

            {form.inputType === "conversion_and_kinetics" ? (
              <NumberField
                id={`${title}-conversion`}
                label="Conversão (0-1)"
                max="0.99999"
                min="0"
                value={form.conversion}
                onChange={(value) => onFieldChange("conversion", value)}
              />
            ) : null}

            {form.inputType === "volume_and_kinetics" ? (
              <NumberField
                id={`${title}-volume`}
                label="Volume do reator"
                min="0"
                unit="m³"
                value={form.volume}
                onChange={(value) => onFieldChange("volume", value)}
              />
            ) : null}

            {form.inputType === "residence_time_and_kinetics" ? (
              <NumberField
                id={`${title}-residence-time`}
                label="Tempo de residência"
                min="0"
                unit="s"
                value={form.residenceTime}
                onChange={(value) => onFieldChange("residenceTime", value)}
              />
            ) : null}

            <NumberField
              id={`${title}-rate-constant`}
              label="Constante de velocidade"
              min="0"
              value={form.rateConstant}
              onChange={(value) => onFieldChange("rateConstant", value)}
            />
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <NumberField
              id={`${title}-initial-temperature`}
              label="Temperatura inicial"
              min="0"
              unit="K"
              value={form.initialTemperature}
              onChange={(value) => onFieldChange("initialTemperature", value)}
            />
            <NumberField
              id={`${title}-initial-pressure`}
              label="Pressão inicial"
              min="0"
              unit="Pa"
              value={form.initialPressure}
              onChange={(value) => onFieldChange("initialPressure", value)}
            />
            <NumberField
              id={`${title}-final-temperature`}
              label="Temperatura final"
              min="0"
              unit="K"
              value={form.finalTemperature}
              onChange={(value) => onFieldChange("finalTemperature", value)}
            />
            <NumberField
              id={`${title}-final-pressure`}
              label="Pressão final"
              min="0"
              unit="Pa"
              value={form.finalPressure}
              onChange={(value) => onFieldChange("finalPressure", value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Componentes, estequiometria e ordem
              </h3>
              <Button type="button" variant="outline" onClick={onAddComponent}>
                Adicionar componente
              </Button>
            </div>

            <div className="space-y-4">
              {form.components.map((component, index) => (
                <div
                  key={`${title}-component-${index}`}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Componente {index + 1}
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={removeButtonClassName}
                      aria-label={`Remover componente ${index + 1}`}
                      onClick={() => onRemoveComponent(index)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Combobox
                      label="Componente"
                      options={componentOptions}
                      value={component.component_name}
                      onValueChange={(value) => onComponentChange(index, "component_name", value)}
                      placeholder="Selecione um componente"
                    />

                    <Combobox
                      label="Estado"
                      options={[
                        { value: "liquid", label: "Líquido" },
                        { value: "gaseous", label: "Gasoso" },
                      ]}
                      value={component.state}
                      onValueChange={(value) => onComponentChange(index, "state", value)}
                    />

                    <NumberField
                      id={`${title}-flow-${index}`}
                      label="Vazão de entrada"
                      min="0"
                      value={component.flow_rate_inlet}
                      onChange={(value) => onComponentChange(index, "flow_rate_inlet", value)}
                    />
                    <NumberField
                      id={`${title}-concentration-${index}`}
                      label="Concentração molar"
                      min="0"
                      value={component.molar_concentration_inlet}
                      onChange={(value) =>
                        onComponentChange(index, "molar_concentration_inlet", value)
                      }
                    />
                    <NumberField
                      id={`${title}-stoich-${index}`}
                      label="Coef. estequiométrico"
                      min=""
                      value={form.stoichiometricCoefficients[index] ?? ""}
                      onChange={(value) => onStoichiometricChange(index, value)}
                    />
                    <NumberField
                      id={`${title}-order-${index}`}
                      label="Ordem de reação"
                      min=""
                      value={form.reactionOrders[index] ?? ""}
                      onChange={(value) => onReactionOrderChange(index, value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit">{submitLabel}</Button>
        </form>

        <ResultTableSection
          title={`Resultado ${title}`}
          emptyLabel={`Execute o cálculo para visualizar ${title.toLowerCase()}.`}
          rows={
            result
              ? Object.entries(result).map(([key, value]) => ({
                  label: formatLabel(key),
                  ...formatResultRow(value),
                }))
              : []
          }
          error={error}
          showTitleWhenEmpty={false}
        />
      </CardContent>
    </Card>
  );
}

export function ReactorPage() {
  const [componentOptions, setComponentOptions] = useState<SelectOption[]>([]);
  const [cstrTypes, setCstrTypes] = useState<ReactorCalculationType[]>([]);
  const [pfrTypes, setPfrTypes] = useState<ReactorCalculationType[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  const [cstrForm, setCstrForm] = useState<ReactorFormState>(createFormState);
  const [pfrForm, setPfrForm] = useState<ReactorFormState>(createFormState);
  const [plotForm, setPlotForm] = useState<PlotFormState>(createPlotFormState);

  const [cstrResult, setCstrResult] = useState<ReactorResult | null>(null);
  const [pfrResult, setPfrResult] = useState<ReactorResult | null>(null);
  const [cstrError, setCstrError] = useState<string | null>(null);
  const [pfrError, setPfrError] = useState<string | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const cstrSessionRef = useRef(0);
  const pfrSessionRef = useRef(0);

  useEffect(() => {
    let ignore = false;

    async function loadPageData() {
      setPageError(null);

      try {
        const [cstrResponse, pfrResponse, componentResponse] = await Promise.all([
          apiClient.get<Array<string | SelectOption>>("/reactor/cstr/calculation-types"),
          apiClient.get<Array<string | SelectOption>>("/reactor/pfr/calculation-types"),
          apiClient.get<Array<string | SelectOption>>("/components/list"),
        ]);

        if (ignore) {
          return;
        }

        setCstrTypes(cstrResponse.map(toSelectOption));
        setPfrTypes(pfrResponse.map(toSelectOption));
        setComponentOptions(componentResponse.map(toSelectOption));

        setCstrForm((current) => ({
          ...current,
          inputType: selectOptionValue(cstrResponse[0] ?? current.inputType),
        }));
        setPfrForm((current) => ({
          ...current,
          inputType: selectOptionValue(pfrResponse[0] ?? current.inputType),
        }));
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

  function updateForm(
    setter: React.Dispatch<React.SetStateAction<ReactorFormState>>,
    updater: (current: ReactorFormState) => ReactorFormState,
  ) {
    clearDerived();
    setter((current) => updater(current));
  }

  function clearDerived() {
    cstrSessionRef.current += 1;
    pfrSessionRef.current += 1;
    setCstrResult(null);
    setPfrResult(null);
    setCstrError(null);
    setPfrError(null);
  }

  function updateComponent(
    setter: React.Dispatch<React.SetStateAction<ReactorFormState>>,
    index: number,
    field: keyof ReactorComponentState,
    value: string,
  ) {
    updateForm(setter, (current) => ({
      ...current,
      components: current.components.map((component, componentIndex) =>
        componentIndex === index ? { ...component, [field]: value } : component,
      ),
    }));
  }

  function updateArrayValue(
    setter: React.Dispatch<React.SetStateAction<ReactorFormState>>,
    key: "stoichiometricCoefficients" | "reactionOrders",
    index: number,
    value: string,
  ) {
    updateForm(setter, (current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  }

  function addComponent(setter: React.Dispatch<React.SetStateAction<ReactorFormState>>) {
    updateForm(setter, (current) => ({
      ...current,
      components: [...current.components, createEmptyComponent()],
      stoichiometricCoefficients: [...current.stoichiometricCoefficients, ""],
      reactionOrders: [...current.reactionOrders, ""],
    }));
  }

  function removeComponent(setter: React.Dispatch<React.SetStateAction<ReactorFormState>>, index: number) {
    updateForm(setter, (current) => ({
      ...current,
      components: current.components.filter((_, componentIndex) => componentIndex !== index),
      stoichiometricCoefficients: current.stoichiometricCoefficients.filter(
        (_, componentIndex) => componentIndex !== index,
      ),
      reactionOrders: current.reactionOrders.filter((_, componentIndex) => componentIndex !== index),
    }));
  }

  function loadExample() {
    clearDerived();

    setCstrForm((current) => ({
      ...current,
      ...reactorWorkedExample.cstr,
      inputType: selectOptionValue(cstrTypes[0] ?? reactorWorkedExample.cstr.inputType),
      components: reactorWorkedExample.cstr.components.map((component) => ({ ...component })),
      stoichiometricCoefficients: [...reactorWorkedExample.cstr.stoichiometricCoefficients],
      reactionOrders: [...reactorWorkedExample.cstr.reactionOrders],
    }));
    setPfrForm((current) => ({
      ...current,
      ...reactorWorkedExample.pfr,
      inputType: selectOptionValue(pfrTypes[0] ?? reactorWorkedExample.pfr.inputType),
      components: reactorWorkedExample.pfr.components.map((component) => ({ ...component })),
      stoichiometricCoefficients: [...reactorWorkedExample.pfr.stoichiometricCoefficients],
      reactionOrders: [...reactorWorkedExample.pfr.reactionOrders],
    }));
    setPlotForm({
      rateConstant: reactorWorkedExample.plot.rateConstant,
      maxConversion: reactorWorkedExample.plot.maxConversion,
      activationEnergy: reactorWorkedExample.plot.activationEnergy,
      referenceTemperature: reactorWorkedExample.plot.referenceTemperature,
    });
    notify.success("Exemplo carregado com sucesso.");
  }

  async function handleCstrSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = cstrSessionRef.current;
    setCstrError(null);

    try {
      const response = await apiClient.post<ReactorResult>(
        "/reactor/cstr",
        buildReactorPayload(cstrForm),
      );

      if (sessionId !== cstrSessionRef.current) {
        return;
      }

      setCstrResult(response);
    } catch (error) {
      if (sessionId !== cstrSessionRef.current) {
        return;
      }

      setCstrResult(null);
      const message = getErrorMessage(error);
      setCstrError(message);
      notify.error(`Erro ao calcular CSTR: ${message}`);
    }
  }

  async function handlePfrSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = pfrSessionRef.current;
    setPfrError(null);

    try {
      const response = await apiClient.post<ReactorResult>(
        "/reactor/pfr",
        buildReactorPayload(pfrForm),
      );

      if (sessionId !== pfrSessionRef.current) {
        return;
      }

      setPfrResult(response);
    } catch (error) {
      if (sessionId !== pfrSessionRef.current) {
        return;
      }

      setPfrResult(null);
      const message = getErrorMessage(error);
      setPfrError(message);
      notify.error(`Erro ao calcular PFR: ${message}`);
    }
  }

  function applyExploratoryFields(fields: Record<string, string>) {
    clearDerived();
    setCstrForm((current) => ({
      ...current,
      conversion: fields["cstr-conversion"] ?? current.conversion,
      rateConstant: fields["cstr-rate-constant"] ?? current.rateConstant,
    }));
    setPfrForm((current) => ({
      ...current,
      conversion: fields["pfr-conversion"] ?? current.conversion,
      rateConstant: fields["pfr-rate-constant"] ?? current.rateConstant,
      recyclingRatio: "0",
    }));
    setPlotForm((current) => ({
      rateConstant: fields["plot-rate-constant"] ?? current.rateConstant,
      maxConversion: fields["plot-max-conversion"] ?? current.maxConversion,
      activationEnergy: current.activationEnergy,
      referenceTemperature: current.referenceTemperature,
    }));
  }

  function changeExploratoryField(field: string, value: string) {
    const binding = exploratoryFieldBindings[field];

    if (!binding) {
      return;
    }

    if (binding.group === "cstr") {
      setCstrForm((current) => ({ ...current, [binding.key]: value }));
      return;
    }

    if (binding.group === "pfr") {
      setPfrForm((current) => ({ ...current, [binding.key]: value, recyclingRatio: "0" }));
      return;
    }

    setPlotForm((current) => ({ ...current, [binding.key]: value }));
  }

  function describeScenario() {
    return `X=${pfrForm.conversion || "—"} · k=${plotForm.rateConstant || pfrForm.rateConstant || "—"}`;
  }

  const chartData = buildPlotPoints(pfrForm, plotForm);
  const comparableForms = formsSharePlotBasis(cstrForm, pfrForm);
  const cstrOperatingPoint =
    cstrResult && extractQuantityValue(cstrResult.volume) !== null
      ? {
          conversion: clampConversion(Number(cstrForm.conversion)),
          volume: extractQuantityValue(cstrResult.volume) ?? 0,
        }
      : null;
  const pfrOperatingPoint =
    pfrResult && extractQuantityValue(pfrResult.volume) !== null
      ? {
          conversion: clampConversion(Number(pfrForm.conversion)),
          volume: extractQuantityValue(pfrResult.volume) ?? 0,
        }
      : null;
  const pfrProfileSeries = pfrResult ? buildPfrProfileSeries(pfrForm, pfrResult) : [];

  return (
    <section className="space-y-8 overflow-x-hidden p-6 md:p-8">
      <Card>
        <CardHeader
          level={1}
          subtitle={
            <>
              <p className="max-w-3xl">
                Compare os modelos CSTR e PFR no mesmo fluxo de cálculo. O diagrama
                local funciona como uma aproximação didática reativa no frontend,
                enquanto os resultados numéricos continuam vindo dos serviços já
                expostos pela API do projeto.
              </p>
              {pageError ? <p className="text-red-600">{pageError}</p> : null}
            </>
          }
          title="Cálculos de Reator"
          variant="hero"
          action={
            <Button type="button" variant="outline" onClick={loadExample}>
              Carregar exemplo
            </Button>
          }
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReactorFormCard
          calculationTypes={cstrTypes}
          componentOptions={componentOptions}
          error={cstrError}
          form={cstrForm}
          onAddComponent={() => addComponent(setCstrForm)}
          onComponentChange={(index, field, value) =>
            updateComponent(setCstrForm, index, field, value)
          }
          onRemoveComponent={(index) => removeComponent(setCstrForm, index)}
          onFieldChange={(field, value) =>
            updateForm(setCstrForm, (current) => ({ ...current, [field]: value }))
          }
          onInputTypeChange={(value) =>
            updateForm(setCstrForm, (current) => ({ ...current, inputType: value }))
          }
          onReactionOrderChange={(index, value) =>
            updateArrayValue(setCstrForm, "reactionOrders", index, value)
          }
          onStoichiometricChange={(index, value) =>
            updateArrayValue(setCstrForm, "stoichiometricCoefficients", index, value)
          }
          onSubmit={handleCstrSubmit}
          result={cstrResult}
          showRecyclingRatio={false}
          submitLabel="Calcular CSTR"
          title="CSTR"
        />

        <ReactorFormCard
          calculationTypes={pfrTypes}
          componentOptions={componentOptions}
          error={pfrError}
          form={pfrForm}
          onAddComponent={() => addComponent(setPfrForm)}
          onComponentChange={(index, field, value) =>
            updateComponent(setPfrForm, index, field, value)
          }
          onRemoveComponent={(index) => removeComponent(setPfrForm, index)}
          onFieldChange={(field, value) =>
            updateForm(setPfrForm, (current) => ({ ...current, [field]: value }))
          }
          onInputTypeChange={(value) =>
            updateForm(setPfrForm, (current) => ({ ...current, inputType: value }))
          }
          onReactionOrderChange={(index, value) =>
            updateArrayValue(setPfrForm, "reactionOrders", index, value)
          }
          onStoichiometricChange={(index, value) =>
            updateArrayValue(setPfrForm, "stoichiometricCoefficients", index, value)
          }
          onSubmit={handlePfrSubmit}
          result={pfrResult}
          showRecyclingRatio
          submitLabel="Calcular PFR"
          title="PFR"
        />
      </div>

      <ExploratoryPanel
        config={reactorExploratory}
        state={{
          applyFields: applyExploratoryFields,
          changeField: changeExploratoryField,
          describeScenario,
        }}
        onScenariosChange={setSavedScenarios}
      >
        {() =>
          comparableForms && cstrOperatingPoint && pfrOperatingPoint && chartData.points.length > 0 ? (
            <div className="mt-4">
              <LevenspielChart
                cstrOperatingPoint={cstrOperatingPoint}
                maxConversion={chartData.maxConversion}
                pfrOperatingPoint={pfrOperatingPoint}
                points={chartData.points}
                scenarios={savedScenarios}
              />
            </div>
          ) : null
        }
      </ExploratoryPanel>

      {pfrResult && pfrProfileSeries.length > 0 ? (
        <PfrProfileChart
          concentrationSeries={pfrProfileSeries}
          temperature={{
            inlet: Number(pfrForm.initialTemperature),
            outlet: Number(pfrForm.finalTemperature),
          }}
        />
      ) : null}

      <Card>
        <CardHeader title="Arrhenius" />
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Visualizacao semilog da dependencia de k com a temperatura de referencia.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField
              id="arrhenius-activation-energy"
              label="Energia de ativacao"
              unit="J/mol"
              value={plotForm.activationEnergy}
              onChange={(value) =>
                setPlotForm((current) => ({ ...current, activationEnergy: value }))
              }
            />
            <NumberField
              id="arrhenius-reference-temperature"
              label="Temperatura de referencia"
              unit="K"
              value={plotForm.referenceTemperature}
              onChange={(value) =>
                setPlotForm((current) => ({ ...current, referenceTemperature: value }))
              }
            />
          </div>

          <ArrheniusPlot
            activationEnergy={Number(plotForm.activationEnergy)}
            maxTemperature={Number(plotForm.referenceTemperature) * 1.2}
            minTemperature={Number(plotForm.referenceTemperature) * 0.8}
            referenceRateConstant={Number(plotForm.rateConstant)}
            referenceTemperature={Number(plotForm.referenceTemperature)}
          />
        </CardContent>
      </Card>

      {cstrOperatingPoint && pfrOperatingPoint && !comparableForms ? (
        <div className="flex min-h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
          Alinhe conversão, cinética e alimentação entre CSTR e PFR para gerar o
          diagrama comparativo no frontend.
        </div>
      ) : null}

      {!cstrOperatingPoint || !pfrOperatingPoint ? (
        <div className="flex min-h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          Calcule CSTR e PFR para gerar o diagrama comparativo no frontend.
        </div>
      ) : null}
    </section>
  );
}
