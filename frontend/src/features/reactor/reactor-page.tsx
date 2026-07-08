import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2Icon } from "lucide-react";

import { NumberField } from "@/components/number-field";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RemoveButton } from "@/components/remove-button";
import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import type { PropertyRow } from "@/components/property-table";
import { ResultTableSection } from "@/components/result-table-section";
import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";
import { ChartSeriesLegend } from "@/components/viz/chart-series-legend";
import { PfrProfileChart } from "@/components/viz/pfr-profile-chart";
import {
  ArrheniusHowItWorks,
  CstrHowItWorks,
  PfrHowItWorks,
} from "@/features/reactor/didactics";
import {
  buildPfrSpatialProfilePayload,
  normalizePfrSpatialProfileResponse,
  type PfrSpatialProfileResponse,
  type PfrSpatialStation,
} from "@/features/reactor/pfr-spatial-profile";
import { reactorWorkedExample } from "@/features/reactor/presets";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { selectOptionValue, toSelectOption, type SelectOption } from "@/lib/select-option";
import { reactorTabs } from "@/features/reactor/reactor-tabs";
import type { ChartModel } from "@/types/chart-model";

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

const reactorResultKeyGroups: ReadonlyArray<ReadonlyArray<string>> = [
  ["volume"],
  ["reaction_rate", "taxa_de_reacao"],
  ["outlet_concentrations", "concentracoes_de_saida"],
  ["dilution_factor", "fator_de_diluicao"],
  ["molar_rate_inlet_(limitant)", "vazao_molar_entrada_(limitante)"],
  ["flow_rate_outlet", "vazao_de_saida"],
  ["residence_time", "tempo_de_residencia"],
  ["conversion", "conversao"],
  [
    "dilution_factor_(1+e * P0*T)",
    "fator_de_diluicao_(1+e * P0*T)",
    "fator_de_diluicao_(1+e * P0*T/P*T0)",
  ],
] as const;

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400";

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

function isQuantityWithUnits(value: unknown): value is { value: number; units: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "units" in value &&
    typeof (value as { value?: unknown }).value === "number" &&
    typeof (value as { units?: unknown }).units === "string"
  );
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

function formatResultRow(
  value: ReactorResultValue,
): Pick<PropertyRow, "value" | "units" | "unitMode"> {
  if (isQuantityWithUnits(value)) {
    return { value: value.value, units: value.units, unitMode: "latex" };
  }

  if (typeof value === "number" || typeof value === "string") {
    return { value };
  }

  return { value: "—" };
}

function buildConcentrationRows(label: string, value: unknown): PropertyRow[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }

  return Object.entries(value as Record<string, ReactorResultValue>).map(([key, nestedValue]) => ({
    label: `${label} [${key}]`,
    ...formatResultRow(nestedValue),
  }));
}

function buildReactorResultRows(result: ReactorResult): PropertyRow[] {
  const consumedKeys = new Set<string>();
  const rows: PropertyRow[] = [];

  for (const [key, value] of Object.entries(result)) {
    if (consumedKeys.has(key)) {
      continue;
    }

    const matchingGroup = reactorResultKeyGroups.find((group) => group.includes(key));
    if (matchingGroup) {
      matchingGroup.forEach((groupKey) => consumedKeys.add(groupKey));

      const primaryKey = matchingGroup[0];
      const primaryValue = result[primaryKey] ?? value;

      if (primaryKey === "outlet_concentrations") {
        const children = buildConcentrationRows(formatLabel(primaryKey), primaryValue);

        if (children.length > 0) {
          rows.push(...children);
          continue;
        }
      }

      rows.push({
        label: formatLabel(primaryKey),
        ...formatResultRow(primaryValue),
      });
      continue;
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const children = buildConcentrationRows(formatLabel(key), value);

      if (children.length > 0) {
        rows.push(...children);
        continue;
      }
    }

    rows.push({
      label: formatLabel(key),
      ...formatResultRow(value),
    });
  }

  return rows;
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

function buildPfrRecycleProfilePayload(form: ReactorFormState, volume: number) {
  const indexes = activeComponentIndexes(form);

  return {
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
    volume,
    recycle_ratios: [0, 0.25, 0.5, 1, 2, 5, 10],
  };
}

function buildLevenspielChartPayload(
  form: ReactorFormState,
  plot: PlotFormState,
  cstrConversion: number,
  pfrConversion: number,
) {
  const indexes = activeComponentIndexes(form);

  return {
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
      k: Number(plot.rateConstant || form.rateConstant),
      reaction_orders: indexes.map((index) => Number(form.reactionOrders[index])),
    },
    operation_conditions: {
      initial_temperature: Number(form.initialTemperature),
      initial_pressure: Number(form.initialPressure),
      final_temperature: Number(form.finalTemperature),
      final_pressure: Number(form.finalPressure),
    },
    recycling_ratio: Number(form.recyclingRatio) || 0,
    max_conversion: Math.min(Math.max(Number(plot.maxConversion || 0.95), 0.1), 0.95),
    cstr_conversion: clampConversion(cstrConversion),
    pfr_conversion: clampConversion(pfrConversion),
  };
}

function buildArrheniusChartPayload(plot: PlotFormState) {
  const referenceTemperature = Number(plot.referenceTemperature);

  return {
    activation_energy: Number(plot.activationEnergy),
    reference_temperature: referenceTemperature,
    reference_rate_constant: Number(plot.rateConstant),
    min_temperature: referenceTemperature * 0.8,
    max_temperature: referenceTemperature * 1.2,
  };
}

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
  extraContent,
  statusContent,
  submitLoading = false,
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
  extraContent?: ReactNode;
  statusContent?: ReactNode;
  submitLoading?: boolean;
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
                rule="nonneg"
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
                    <RemoveButton
                      label={`Remover componente ${index + 1}`}
                      onClick={() => onRemoveComponent(index)}
                    />
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
                      unit="m³/s"
                      value={component.flow_rate_inlet}
                      onChange={(value) => onComponentChange(index, "flow_rate_inlet", value)}
                    />
                    <NumberField
                      id={`${title}-concentration-${index}`}
                      label="Concentração molar"
                      min="0"
                      unit="mol/m³"
                      value={component.molar_concentration_inlet}
                      onChange={(value) =>
                        onComponentChange(index, "molar_concentration_inlet", value)
                      }
                    />
                    <NumberField
                      id={`${title}-stoich-${index}`}
                      label="Coef. estequiométrico"
                      rule="number"
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

          <Button type="submit" loading={submitLoading}>
            {submitLabel}
          </Button>
        </form>

        {statusContent ? <div className="mt-2">{statusContent}</div> : null}
        {error ? (
          <p className="sr-only" role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}

        <ResultTableSection
          title={`Resultado ${title}`}
          emptyLabel={`Execute o cálculo para visualizar ${title.toLowerCase()}.`}
          rows={result ? buildReactorResultRows(result) : []}
          error={error}
          showTitleWhenEmpty={false}
        />

        {extraContent ?? null}
      </CardContent>
    </Card>
  );
}

function LevenspielTabContent({
  chartModel,
  hasResults,
  comparableForms,
  loading,
}: {
  chartModel: ChartModel | null;
  hasResults: boolean;
  comparableForms: boolean;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {!hasResults ? (
          <div className="flex min-h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            Calcule CSTR e PFR para gerar o diagrama comparativo.
          </div>
        ) : !comparableForms ? (
          <div className="flex min-h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
            Alinhe conversão, cinética e alimentação entre CSTR e PFR para gerar o diagrama.
          </div>
        ) : loading ? (
          <div
            role="status"
            className="flex min-h-48 items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600"
          >
            <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
            <span>Gerando gráfico comparativo...</span>
          </div>
        ) : !chartModel ? (
          <div className="flex min-h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            Defina dados válidos de conversão, vazão e cinética para gerar o diagrama comparativo.
          </div>
        ) : (
          <div data-testid="levenspiel-chart">
            <ChartModelRenderer model={chartModel} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReactorPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [componentOptions, setComponentOptions] = useState<SelectOption[]>([]);
  const [cstrTypes, setCstrTypes] = useState<ReactorCalculationType[]>([]);
  const [pfrTypes, setPfrTypes] = useState<ReactorCalculationType[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  const [cstrForm, setCstrForm] = useState<ReactorFormState>(createFormState);
  const [pfrForm, setPfrForm] = useState<ReactorFormState>(createFormState);
  const [plotForm, setPlotForm] = useState<PlotFormState>(createPlotFormState);

  const [cstrResult, setCstrResult] = useState<ReactorResult | null>(null);
  const [pfrResult, setPfrResult] = useState<ReactorResult | null>(null);
  const [levenspielChart, setLevenspielChart] = useState<ChartModel | null>(null);
  const [levenspielLoading, setLevenspielLoading] = useState(false);
  const [pfrSpatialProfile, setPfrSpatialProfile] = useState<PfrSpatialStation[]>([]);
  const [pfrProfileChart, setPfrProfileChart] = useState<ChartModel | null>(null);
  const [pfrRecycleChart, setPfrRecycleChart] = useState<ChartModel | null>(null);
  const [pfrLoading, setPfrLoading] = useState(false);
  const [arrheniusChart, setArrheniusChart] = useState<ChartModel | null>(null);
  const [pendingExampleAutoRunId, setPendingExampleAutoRunId] = useState<number | null>(null);
  const [cstrError, setCstrError] = useState<string | null>(null);
  const [pfrError, setPfrError] = useState<string | null>(null);
  const [pfrSpatialProfileError, setPfrSpatialProfileError] = useState<string | null>(null);
  const [pfrRecycleProfileError, setPfrRecycleProfileError] = useState<string | null>(null);
  const [arrheniusError, setArrheniusError] = useState<string | null>(null);
  const cstrSessionRef = useRef(0);
  const pfrSessionRef = useRef(0);
  const activeTab = pathname.startsWith("/reactor/")
    ? pathname.slice("/reactor/".length).split("/")[0] || "cstr"
    : "cstr";

  useEffect(() => {
    if (pathname === "/reactor") {
      navigate("cstr", { replace: true });
    }
  }, [navigate, pathname]);

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
          inputType: resolveExampleInputType(
            cstrResponse.map(toSelectOption),
            current.inputType,
          ),
        }));
        setPfrForm((current) => ({
          ...current,
          inputType: resolveExampleInputType(
            pfrResponse.map(toSelectOption),
            current.inputType,
          ),
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
    setLevenspielChart(null);
    setPfrSpatialProfile([]);
    setPfrProfileChart(null);
    setPfrRecycleChart(null);
    setPfrLoading(false);
    setCstrError(null);
    setPfrError(null);
    setPfrSpatialProfileError(null);
    setPfrRecycleProfileError(null);
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

  function resolveExampleInputType(
    options: ReactorCalculationType[],
    preferredInputType: ReactorFormState["inputType"],
  ) {
    const preferredOption = options.find(
      (option) => selectOptionValue(option) === preferredInputType,
    );

    return selectOptionValue(preferredOption ?? options[0] ?? preferredInputType);
  }

  function loadExample() {
    clearDerived();

    setCstrForm((current) => ({
      ...current,
      ...reactorWorkedExample.cstr,
      inputType: resolveExampleInputType(cstrTypes, reactorWorkedExample.cstr.inputType),
      components: reactorWorkedExample.cstr.components.map((component) => ({ ...component })),
      stoichiometricCoefficients: [...reactorWorkedExample.cstr.stoichiometricCoefficients],
      reactionOrders: [...reactorWorkedExample.cstr.reactionOrders],
    }));
    setPfrForm((current) => ({
      ...current,
      ...reactorWorkedExample.pfr,
      inputType: resolveExampleInputType(pfrTypes, reactorWorkedExample.pfr.inputType),
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
    setPendingExampleAutoRunId(Date.now());
    notify.success("Exemplo carregado com sucesso.");
  }

  async function submitCstrCalculation() {
    const sessionId = cstrSessionRef.current + 1;
    cstrSessionRef.current = sessionId;
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

  async function submitPfrCalculation() {
    const sessionId = pfrSessionRef.current + 1;
    pfrSessionRef.current = sessionId;
    setPfrError(null);
    setPfrLoading(true);
    setPfrSpatialProfile([]);
    setPfrProfileChart(null);
    setPfrRecycleChart(null);
    setPfrSpatialProfileError(null);
    setPfrRecycleProfileError(null);

    try {
      const response = await apiClient.post<ReactorResult>(
        "/reactor/pfr",
        buildReactorPayload(pfrForm),
      );

      if (sessionId !== pfrSessionRef.current) {
        return;
      }

      setPfrResult(response);

      const volume = extractQuantityValue(getResultValue(response, "volume"));
      if (!(volume != null && Number.isFinite(volume) && volume > 0)) {
        setPfrSpatialProfile([]);
        setPfrProfileChart(null);
        setPfrRecycleChart(null);
        return;
      }

      const [spatialProfileResult, profileChartResult, recycleChartResult] = await Promise.allSettled([
        apiClient.post<PfrSpatialProfileResponse>(
          "/reactor/pfr/spatial-profile",
          buildPfrSpatialProfilePayload(pfrForm, volume),
        ),
        apiClient.post<ChartModel>(
          "/reactor/pfr/profile/chart",
          buildPfrSpatialProfilePayload(pfrForm, volume),
        ),
        apiClient.post<ChartModel>(
          "/reactor/pfr/recycle-profile/chart",
          buildPfrRecycleProfilePayload(pfrForm, volume),
        ),
      ]);

      if (sessionId !== pfrSessionRef.current) {
        return;
      }

      if (spatialProfileResult.status === "fulfilled") {
        setPfrSpatialProfile(normalizePfrSpatialProfileResponse(spatialProfileResult.value));
        setPfrSpatialProfileError(null);
      } else {
        setPfrSpatialProfile([]);
        setPfrSpatialProfileError(getErrorMessage(spatialProfileResult.reason));
      }

      if (profileChartResult.status === "fulfilled") {
        setPfrProfileChart(profileChartResult.value);
      } else {
        setPfrProfileChart(null);
      }

      if (recycleChartResult.status === "fulfilled") {
        setPfrRecycleChart(recycleChartResult.value);
        setPfrRecycleProfileError(null);
      } else {
        setPfrRecycleChart(null);
        setPfrRecycleProfileError(getErrorMessage(recycleChartResult.reason));
      }
    } catch (error) {
      if (sessionId !== pfrSessionRef.current) {
        return;
      }

      setPfrResult(null);
      setPfrSpatialProfile([]);
      setPfrProfileChart(null);
      setPfrRecycleChart(null);
      setPfrSpatialProfileError(null);
      const message = getErrorMessage(error);
      setPfrError(message);
      notify.error(`Erro ao calcular PFR: ${message}`);
    } finally {
      if (sessionId === pfrSessionRef.current) {
        setPfrLoading(false);
      }
    }
  }

  async function handleCstrSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitCstrCalculation();
  }

  async function handlePfrSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitPfrCalculation();
  }

  useEffect(() => {
    if (pendingExampleAutoRunId == null) {
      return;
    }

    setPendingExampleAutoRunId(null);
    void Promise.allSettled([submitCstrCalculation(), submitPfrCalculation()]);
  }, [cstrForm, pendingExampleAutoRunId, pfrForm]);

  const comparableForms = formsSharePlotBasis(cstrForm, pfrForm);

  useEffect(() => {
    if (!cstrResult || !pfrResult || !comparableForms) {
      setLevenspielLoading(false);
      setLevenspielChart(null);
      return;
    }

    const cstrConversion = extractQuantityValue(getResultValue(cstrResult, "conversion", "conversao"));
    const pfrConversion = extractQuantityValue(getResultValue(pfrResult, "conversion", "conversao"));
    if (cstrConversion == null || pfrConversion == null) {
      setLevenspielLoading(false);
      setLevenspielChart(null);
      return;
    }

    const resolvedCstrConversion = cstrConversion;
    const resolvedPfrConversion = pfrConversion;

    let ignore = false;

    async function loadLevenspielChart() {
      setLevenspielLoading(true);
      setLevenspielChart(null);

      try {
        const response = await apiClient.post<ChartModel>(
          "/reactor/levenspiel/chart",
          buildLevenspielChartPayload(
            pfrForm,
            plotForm,
            resolvedCstrConversion,
            resolvedPfrConversion,
          ),
        );

        if (!ignore) {
          setLevenspielChart(response);
          setLevenspielLoading(false);
        }
      } catch {
        if (!ignore) {
          setLevenspielChart(null);
          setLevenspielLoading(false);
        }
      }
    }

    void loadLevenspielChart();

    return () => {
      ignore = true;
    };
  }, [cstrResult, pfrResult, comparableForms, pfrForm, plotForm]);

  useEffect(() => {
    const payload = buildArrheniusChartPayload(plotForm);
    if (
      !(payload.activation_energy > 0) ||
      !(payload.reference_temperature > 0) ||
      !(payload.reference_rate_constant > 0)
    ) {
      setArrheniusChart(null);
      setArrheniusError(null);
      return;
    }

    let ignore = false;

    async function loadArrheniusChart() {
      try {
        const response = await apiClient.post<ChartModel>("/reactor/arrhenius/chart", payload);

        if (!ignore) {
          setArrheniusChart(response);
          setArrheniusError(null);
        }
      } catch (error) {
        if (!ignore) {
          setArrheniusChart(null);
          setArrheniusError(getErrorMessage(error));
        }
      }
    }

    void loadArrheniusChart();

    return () => {
      ignore = true;
    };
  }, [plotForm]);

  return (
    <ModuleTabsLayout
      title="Cálculos de Reator"
      subtitle={
        <>
          <p className="max-w-3xl">
            Compare os modelos CSTR e PFR no mesmo fluxo de cálculo. Os resultados numéricos,
            curvas didáticas e pontos operacionais agora vêm dos endpoints de visualização do backend.
          </p>
          {pageError ? (
            <p className="text-red-600" role="alert" aria-live="assertive">
              {pageError}
            </p>
          ) : null}
        </>
      }
      action={
        <Button type="button" variant="outline" onClick={loadExample}>
          Carregar exemplo
        </Button>
      }
      tabs={reactorTabs}
    >
      {activeTab === "cstr" ? (
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
      ) : null}

      {activeTab === "pfr" ? (
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
          submitLoading={pfrLoading}
          showRecyclingRatio
          submitLabel="Calcular PFR"
          title="PFR"
          statusContent={
            pfrLoading ? (
              <div
                aria-live="polite"
                className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900"
                role="status"
              >
                <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
                <span>Calculando PFR...</span>
              </div>
            ) : null
          }
          extraContent={
            pfrResult ? (
              <div className="space-y-6">
                {pfrSpatialProfileError ? (
                  <p className="text-sm text-red-600" role="alert" aria-live="assertive">
                    {pfrSpatialProfileError}
                  </p>
                ) : null}
                {pfrSpatialProfile.length > 0 && pfrProfileChart ? (
                  <PfrProfileChart model={pfrProfileChart} stations={pfrSpatialProfile} />
                ) : null}
                <div data-testid="pfr-recycle-da-chart" className="space-y-2">
                  {pfrRecycleProfileError ? (
                    <p className="text-sm text-red-600" role="alert" aria-live="assertive">
                      {pfrRecycleProfileError}
                    </p>
                  ) : null}
                  {pfrRecycleChart ? <ChartModelRenderer model={pfrRecycleChart} /> : null}
                </div>
              </div>
            ) : null
          }
        />
      ) : null}

      {activeTab === "levenspiel" ? (
        <LevenspielTabContent
          chartModel={levenspielChart}
          hasResults={Boolean(cstrResult && pfrResult)}
          comparableForms={comparableForms}
          loading={levenspielLoading}
        />
      ) : null}

      {activeTab === "arrhenius" ? (
        <Card>
          <CardHeader title="Arrhenius" />
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Visualizacao semilog da dependencia de k com a temperatura de referencia.
            </p>
            <ArrheniusHowItWorks />
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

            {arrheniusError ? (
              <p className="text-sm text-red-600" role="alert" aria-live="assertive">
                {arrheniusError}
              </p>
            ) : null}
            {arrheniusChart ? (
              <div className="space-y-3" data-testid="arrhenius-plot">
                <ChartModelRenderer
                  hiddenMarkerLabelIds={["reference-point"]}
                  model={arrheniusChart}
                />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Legenda do gráfico
                  </p>
                  <ChartSeriesLegend
                    items={[
                      {
                        id: arrheniusChart.series[0]?.id ?? "arrhenius-curve",
                        label: arrheniusChart.series[0]?.name ?? "Curva de Arrhenius",
                        color: arrheniusChart.series[0]?.color ?? "#0f766e",
                      },
                      {
                        id: arrheniusChart.markers?.[0]?.id ?? "reference-point",
                        label: arrheniusChart.markers?.[0]?.label ?? "Ponto de referência",
                        color: arrheniusChart.markers?.[0]?.color ?? "#dc2626",
                      },
                    ]}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

    </ModuleTabsLayout>
  );
}
