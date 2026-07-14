import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { NumberField } from "@/components/number-field";
import type { PropertyRow } from "@/components/property-table";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RemoveButton } from "@/components/remove-button";
import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { ResultTableSection } from "@/components/result-table-section";
import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";
import { HeadBreakdownChart } from "@/components/viz/head-breakdown-chart";
import { PumpEfficiencyMap, type PumpEfficiencyMapModel } from "@/components/viz/pump-efficiency-map";
import { NpshGauge, type NpshGaugeModel } from "@/components/viz/npsh-gauge";
import {
  HeadHowItWorks,
  HeadlossHowItWorks,
  NpshHowItWorks,
} from "@/features/pump/didactics";
import {
  mapPumpExampleToFormInputs,
  type PumpExamplePayload,
} from "@/features/pump/example";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { selectOptionValue, toSelectOption, type SelectOption } from "@/lib/select-option";
import { pumpTabs } from "@/features/pump/pump-tabs";
import type { ChartModel } from "@/types/chart-model";

type QuantityResult = {
  value: number;
  units: string;
};

type HeadBreakdownTerm = {
  label: string;
  value: number;
};

type HeadlossMethod = "Darcy-Weisbach" | "Hazen-Williams";

type FittingRow = {
  id: string;
  fitting: string;
  quantity: string;
};

type CompositionDetails = {
  specifications: {
    roughness?: QuantityResult;
    roughness_coefficient?: QuantityResult;
  };
};

type HeadlossFormState = {
  method: HeadlossMethod;
  pipeLength: string;
  diameter: string;
  flowRate: string;
  velocity: string;
  frictionFactor: string;
  roughnessCoefficient: string;
  reynolds: string;
  frictionMethod: string;
  composition: string;
};

type NpshFormState = {
  manometricPressure: string;
  atmosphericPressure: string;
  vaporPressure: string;
  density: string;
  frictionFactor: string;
  pumpInletVelocity: string;
  gaugeElevation: string;
  required: string;
};

type HeadFormState = {
  pressure1: string;
  pressure2: string;
  elevation1: string;
  elevation2: string;
  velocity1: string;
  velocity2: string;
  density: string;
  frictionFactor: string;
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400";

const initialHeadlossForm: HeadlossFormState = {
  method: "Darcy-Weisbach",
  pipeLength: "",
  diameter: "",
  flowRate: "",
  velocity: "",
  frictionFactor: "",
  roughnessCoefficient: "",
  reynolds: "",
  frictionMethod: "",
  composition: "",
};

const initialNpshForm: NpshFormState = {
  manometricPressure: "",
  atmosphericPressure: "",
  vaporPressure: "",
  density: "",
  frictionFactor: "",
  pumpInletVelocity: "",
  gaugeElevation: "",
  required: "",
};

const initialHeadForm: HeadFormState = {
  pressure1: "",
  pressure2: "",
  elevation1: "",
  elevation2: "",
  velocity1: "",
  velocity2: "",
  density: "",
  frictionFactor: "",
};

const standardGravity = 9.80665;

function createFittingRow(id = `fitting-${Date.now()}-${Math.random()}`): FittingRow {
  return { id, fitting: "", quantity: "1" };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha ao processar a solicitação.";
}

function buildResultRows(label: string, result: QuantityResult | null): PropertyRow[] {
  return [
    result
      ? {
          label,
          value: result.value,
          units: result.units,
        }
      : {
          label,
          value: "—",
        },
  ];
}

function buildHeadBreakdownTerms(form: HeadFormState): HeadBreakdownTerm[] {
  const pressure1 = Number(form.pressure1);
  const pressure2 = Number(form.pressure2);
  const elevation1 = Number(form.elevation1);
  const elevation2 = Number(form.elevation2);
  const velocity1 = Number(form.velocity1);
  const velocity2 = Number(form.velocity2);
  const frictionFactor = Number(form.frictionFactor);
  const density = Number(form.density);

  if (
    [
      pressure1,
      pressure2,
      elevation1,
      elevation2,
      velocity1,
      velocity2,
      frictionFactor,
      density,
    ].some((value) => !Number.isFinite(value))
  ) {
    return [];
  }

  return [
    { label: "ΔP/(ρg)", value: (pressure2 - pressure1) / (density * standardGravity) },
    { label: "Δz", value: elevation2 - elevation1 },
    {
      label: "ΔV²/(2g)",
      value: (velocity2 ** 2 - velocity1 ** 2) / (2 * standardGravity),
    },
    { label: "-h_f", value: -frictionFactor },
  ];
}

function pipeAreaFromDiameter(diameterMm: string) {
  const diameter = Number(diameterMm);
  if (!(diameter > 0)) {
    return null;
  }

  const diameterMeters = diameter / 1000;
  return (Math.PI * diameterMeters * diameterMeters) / 4;
}

function syncHeadlossFlowVelocity(
  form: HeadlossFormState,
  source: "diameter" | "flowRate" | "velocity",
) {
  const area = pipeAreaFromDiameter(form.diameter);
  if (!area) {
    return form;
  }

  if (source === "flowRate" && form.flowRate) {
    const flowRate = Number(form.flowRate);
    if (flowRate > 0) {
      return { ...form, velocity: String(flowRate / area) };
    }
  }

  if (source === "velocity" && form.velocity) {
    const velocity = Number(form.velocity);
    if (velocity > 0) {
      return { ...form, flowRate: String(velocity * area) };
    }
  }

  if (source === "diameter") {
    if (form.velocity) {
      const velocity = Number(form.velocity);
      if (velocity > 0) {
        return { ...form, flowRate: String(velocity * area) };
      }
    }

    if (form.flowRate) {
      const flowRate = Number(form.flowRate);
      if (flowRate > 0) {
        return { ...form, velocity: String(flowRate / area) };
      }
    }
  }

  return form;
}

function resolveHeadlossFlowVelocity(form: HeadlossFormState) {
  const area = pipeAreaFromDiameter(form.diameter);
  const hasFlowRate = form.flowRate !== "";
  const hasVelocity = form.velocity !== "";

  if (!area || (!hasFlowRate && !hasVelocity)) {
    return { flowRate: null, velocity: null };
  }

  if (hasFlowRate && hasVelocity) {
    return {
      flowRate: Number(form.flowRate),
      velocity: Number(form.velocity),
    };
  }

  if (hasFlowRate) {
    const flowRate = Number(form.flowRate);
    return {
      flowRate,
      velocity: flowRate / area,
    };
  }

  const velocity = Number(form.velocity);
  return {
    flowRate: velocity * area,
    velocity,
  };
}

export function PumpPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<SelectOption[]>([]);
  const [fittings, setFittings] = useState<SelectOption[]>([]);
  const [compositions, setCompositions] = useState<SelectOption[]>([]);
  const [frictionMethods, setFrictionMethods] = useState<SelectOption[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  const [headlossForm, setHeadlossForm] = useState<HeadlossFormState>(initialHeadlossForm);
  const [headlossSource, setHeadlossSource] = useState<"manual" | "material">("manual");
  const [fittingRows, setFittingRows] = useState<FittingRow[]>([createFittingRow("fitting-0")]);
  const [headlossResult, setHeadlossResult] = useState<QuantityResult | null>(null);
  const [selectedMaterialRoughness, setSelectedMaterialRoughness] = useState<number | null>(null);
  const [selectedMaterialRoughnessCoefficient, setSelectedMaterialRoughnessCoefficient] = useState<
    number | null
  >(null);

  const [npshForm, setNpshForm] = useState<NpshFormState>(initialNpshForm);
  const [npshResult, setNpshResult] = useState<QuantityResult | null>(null);
  const [npshGaugeModel, setNpshGaugeModel] = useState<NpshGaugeModel | null>(null);

  const [headForm, setHeadForm] = useState<HeadFormState>(initialHeadForm);
  const [headResult, setHeadResult] = useState<QuantityResult | null>(null);
  const [headlossChartModel, setHeadlossChartModel] = useState<ChartModel | null>(null);
  const [efficiencyMapModel, setEfficiencyMapModel] = useState<PumpEfficiencyMapModel | null>(null);
  const [pendingExampleAutoRunId, setPendingExampleAutoRunId] = useState<number | null>(null);
  const headlossSessionRef = useRef(0);
  const npshSessionRef = useRef(0);
  const headSessionRef = useRef(0);
  const activeTab = pathname.startsWith("/pump/")
    ? pathname.slice("/pump/".length).split("/")[0] || "headloss"
    : "headloss";

  useEffect(() => {
    if (pathname === "/pump") {
      navigate("headloss", { replace: true });
    }
  }, [navigate, pathname]);

  useEffect(() => {
    let ignore = false;

    async function loadPageData() {
      setPageError(null);

      try {
        const [methodResponse, fittingResponse, compositionResponse, frictionMethodResponse] =
          await Promise.all([
            apiClient.get<Array<string | SelectOption>>("/pump/headloss/methods"),
            apiClient.get<Array<string | SelectOption>>("/piping/fittings"),
            apiClient.get<Array<string | SelectOption>>("/piping/compositions"),
            apiClient.get<Array<string | SelectOption>>("/flow/friction-factor/methods"),
          ]);

        if (ignore) {
          return;
        }

        setMethods(methodResponse.map(toSelectOption));
        setFittings(fittingResponse.map(toSelectOption));
        setCompositions(compositionResponse.map(toSelectOption));
        setFrictionMethods(frictionMethodResponse.map(toSelectOption));
        setHeadlossForm((current) => ({
          ...current,
          method: methodResponse[0]
            ? (selectOptionValue(methodResponse[0]) as HeadlossMethod)
            : "Darcy-Weisbach",
          frictionMethod: selectOptionValue(frictionMethodResponse[0] ?? ""),
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

  async function applyWorkedExample() {
    headlossSessionRef.current += 1;
    npshSessionRef.current += 1;
    headSessionRef.current += 1;
    try {
      const example = await apiClient.get<PumpExamplePayload>("/pump/example");
      const mapped = mapPumpExampleToFormInputs(example);

      setPageError(null);
      clearSelectedMaterialDetails();
      setHeadlossForm({
        ...initialHeadlossForm,
        ...mapped.headloss,
        method: mapped.headloss.method,
      });
      setHeadlossSource("material");
      setFittingRows(
        mapped.fittings.length > 0
          ? mapped.fittings.map((row, index) => ({
              id: `example-fitting-${index}`,
              fitting: row.fitting,
              quantity: row.quantity,
            }))
          : [createFittingRow("fitting-0")],
      );
      setNpshForm({ ...initialNpshForm, ...mapped.npsh });
      setHeadForm({ ...initialHeadForm, ...mapped.head });
      setHeadlossResult(null);
      setNpshResult(null);
      setNpshGaugeModel(null);
      setHeadResult(null);
      setHeadlossChartModel(null);
      setEfficiencyMapModel(null);
      setPendingExampleAutoRunId(Date.now());
      notify.success("Exemplo carregado com sucesso.");
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  }

  function clearHeadlossDerived() {
    headlossSessionRef.current += 1;
    setHeadlossResult(null);
    setHeadlossChartModel(null);
    setEfficiencyMapModel(null);
  }

  function clearNpshDerived() {
    npshSessionRef.current += 1;
    setNpshResult(null);
    setNpshGaugeModel(null);
  }

  function clearHeadDerived() {
    headSessionRef.current += 1;
    setHeadResult(null);
  }

  function clearAllDerived() {
    clearHeadlossDerived();
    clearNpshDerived();
    clearHeadDerived();
  }

  function clearSelectedMaterialDetails() {
    setSelectedMaterialRoughness(null);
    setSelectedMaterialRoughnessCoefficient(null);
  }

  function setHeadlossField<K extends keyof HeadlossFormState>(
    field: K,
    value: HeadlossFormState[K],
  ) {
    setHeadlossForm((current) => {
      const updated = { ...current, [field]: value };

      if (field === "diameter" || field === "flowRate" || field === "velocity") {
        return syncHeadlossFlowVelocity(updated, field);
      }

      return updated;
    });
    if (field === "method") {
      clearHeadlossDerived();
      return;
    }

    clearHeadlossDerived();
  }

  async function handleCompositionChange(value: string) {
    setHeadlossField("composition", value);
    clearSelectedMaterialDetails();

    if (!value) {
      return;
    }

    try {
      const encoded = encodeURIComponent(value);
      const compositionDetails = await apiClient.get<CompositionDetails>(
        `/piping/composition/${encoded}`,
      );
      const roughness = compositionDetails.specifications.roughness?.value ?? null;
      const roughnessCoefficient =
        compositionDetails.specifications.roughness_coefficient?.value ?? null;

      setSelectedMaterialRoughness(typeof roughness === "number" ? roughness : null);
      setSelectedMaterialRoughnessCoefficient(
        typeof roughnessCoefficient === "number" ? roughnessCoefficient : null,
      );

      if (!(roughness != null)) {
        notify.error("Dados incompletos: Rugosidade absoluta não encontrada para este material");
        return;
      }

      if (
        headlossForm.method === "Hazen-Williams" &&
        headlossSource === "material" &&
        roughnessCoefficient == null
      ) {
        notify.error(
          "Dados incompletos: Coeficiente de rugosidade (C) não encontrado para este material",
        );
      }
    } catch (error) {
      const message = getErrorMessage(error);
      notify.error(`Erro ao carregar material: ${message}`);
    }
  }

  function setNpshField<K extends keyof NpshFormState>(field: K, value: NpshFormState[K]) {
    setNpshForm((current) => ({ ...current, [field]: value }));
    clearNpshDerived();
  }

  function setHeadField<K extends keyof HeadFormState>(field: K, value: HeadFormState[K]) {
    setHeadForm((current) => ({ ...current, [field]: value }));
    clearHeadDerived();
  }

  function updateFittingRow(id: string, field: "fitting" | "quantity", value: string) {
    setFittingRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
    clearHeadlossDerived();
  }

  function removeFittingRow(id: string) {
    setFittingRows((current) => current.filter((row) => row.id !== id));
    clearHeadlossDerived();
  }

  function addFittingRow() {
    setFittingRows((current) => [...current, createFittingRow()]);
    clearHeadlossDerived();
  }

  async function resolveHeadlossInput() {
    if (headlossForm.method === "Darcy-Weisbach") {
      if (headlossSource === "manual") {
        return { frictionFactor: Number(headlossForm.frictionFactor) };
      }

      let roughness = selectedMaterialRoughness;
      if (roughness == null) {
        const compositionDetails = await apiClient.get<CompositionDetails>(
          `/piping/composition/${encodeURIComponent(headlossForm.composition)}`,
        );
        roughness = compositionDetails.specifications.roughness?.value ?? null;
        setSelectedMaterialRoughness(typeof roughness === "number" ? roughness : null);
      }

      if (roughness == null) {
        notify.error(
          "Dados incompletos: Selecione um material com rugosidade absoluta",
        );
        return null;
      }

      const frictionFactor = await apiClient.post<QuantityResult>("/flow/friction-factor", {
        roughness,
        diameter: Number(headlossForm.diameter),
        reynolds: Number(headlossForm.reynolds),
        method: headlossForm.frictionMethod,
      });

      return { frictionFactor: frictionFactor.value };
    }

    if (headlossSource === "manual") {
      return { roughnessCoefficient: Number(headlossForm.roughnessCoefficient) };
    }

    let roughnessCoefficient = selectedMaterialRoughnessCoefficient;
    if (roughnessCoefficient == null) {
      const compositionDetails = await apiClient.get<CompositionDetails>(
        `/piping/composition/${encodeURIComponent(headlossForm.composition)}`,
      );
      roughnessCoefficient =
        compositionDetails.specifications.roughness_coefficient?.value ?? null;
      setSelectedMaterialRoughnessCoefficient(
        typeof roughnessCoefficient === "number" ? roughnessCoefficient : null,
      );
    }

    if (roughnessCoefficient == null) {
      notify.error(
        "Dados incompletos: Coeficiente de rugosidade (C) não encontrado para este material",
      );
      return null;
    }

    return {
      roughnessCoefficient,
    };
  }

  async function submitHeadlossCalculation() {
    const sessionId = headlossSessionRef.current;
    setPageError(null);
    try {
      const resolvedFlow = resolveHeadlossFlowVelocity(headlossForm);

      const payload: Record<string, unknown> = {
        pipe_length: Number(headlossForm.pipeLength),
        diameter: Number(headlossForm.diameter),
        method: headlossForm.method,
      };

      if (resolvedFlow.flowRate !== null) {
        payload.flow_rate = resolvedFlow.flowRate;
      }

      if (resolvedFlow.velocity !== null) {
        payload.velocity = resolvedFlow.velocity;
      }

      const resolved = await resolveHeadlossInput();
      if (!resolved) {
        return;
      }
      if ("frictionFactor" in resolved) {
        payload.friction_factor = resolved.frictionFactor;
      }
      if ("roughnessCoefficient" in resolved) {
        payload.roughness_coefficient = resolved.roughnessCoefficient;
      }

      const appliedFittings = fittingRows
        .filter((row) => row.fitting && row.quantity)
        .map((row) => ({
          fitting: row.fitting,
          quantity: Number(row.quantity),
        }));
      if (appliedFittings.length > 0) {
        payload.fittings = appliedFittings;
      }

      if (sessionId !== headlossSessionRef.current) {
        return;
      }

      const response = await apiClient.post<QuantityResult>("/pump/headloss", payload);
      if (sessionId !== headlossSessionRef.current) {
        return;
      }

      setHeadlossResult(response);
      setHeadForm((current) => ({
        ...current,
        frictionFactor: response.value.toFixed(2),
      }));

      const [chartModel, efficiencyMapResponse] = await Promise.all([
        apiClient.post<ChartModel>("/pump/headloss/chart", payload),
        apiClient.post<PumpEfficiencyMapModel>("/pump/efficiency-map/chart", payload),
      ]);
      if (sessionId !== headlossSessionRef.current) {
        return;
      }

      setHeadlossChartModel(chartModel);
      setEfficiencyMapModel(efficiencyMapResponse);
    } catch (error) {
      if (sessionId !== headlossSessionRef.current) {
        return;
      }
      setHeadlossChartModel(null);
      setEfficiencyMapModel(null);
      const message = `Erro ao calcular perda de carga: ${getErrorMessage(error)}`;
      setPageError(message);
      notify.error(message);
    }
  }

  async function submitNpshCalculation() {
    const sessionId = npshSessionRef.current;
    setPageError(null);

    try {
      const payload: Record<string, number> = {
        manometric_pressure: Number(npshForm.manometricPressure),
        atmospheric_pressure: Number(npshForm.atmosphericPressure),
        vapor_pressure: Number(npshForm.vaporPressure),
        density: Number(npshForm.density),
        friction_factor: Number(npshForm.frictionFactor),
        pump_inlet_velocity: Number(npshForm.pumpInletVelocity),
        gauge_elevation: Number(npshForm.gaugeElevation),
      };

      if (npshForm.required !== "") {
        payload.required = Number(npshForm.required);
      }

      const [response, gaugeModel] = await Promise.all([
        apiClient.post<{ head_loss: QuantityResult }>("/pump/npsh-available", payload),
        apiClient.post<NpshGaugeModel>("/pump/npsh-gauge/chart", payload),
      ]);

      if (sessionId !== npshSessionRef.current) {
        return;
      }

      setNpshResult(response.head_loss);
      setNpshGaugeModel(gaugeModel);
    } catch (error) {
      if (sessionId !== npshSessionRef.current) {
        return;
      }

      const message = `Erro ao calcular NPSH disponível: ${getErrorMessage(error)}`;
      setPageError(message);
      notify.error(message);
    }
  }

  async function submitHeadCalculation() {
    const sessionId = headSessionRef.current;
    setPageError(null);

    try {
      const response = await apiClient.post<QuantityResult>("/pump/head", {
        pressure1: Number(headForm.pressure1),
        pressure2: Number(headForm.pressure2),
        elevation1: Number(headForm.elevation1),
        elevation2: Number(headForm.elevation2),
        velocity1: Number(headForm.velocity1),
        velocity2: Number(headForm.velocity2),
        density: Number(headForm.density),
        friction_factor: Number(headForm.frictionFactor),
      });

      if (sessionId !== headSessionRef.current) {
        return;
      }

      setHeadResult(response);
    } catch (error) {
      if (sessionId !== headSessionRef.current) {
        return;
      }

      const message = `Erro ao calcular altura manométrica: ${getErrorMessage(error)}`;
      setPageError(message);
      notify.error(message);
    }
  }

  async function handleHeadlossSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitHeadlossCalculation();
  }

  async function handleNpshSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitNpshCalculation();
  }

  async function handleHeadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitHeadCalculation();
  }

  useEffect(() => {
    if (pendingExampleAutoRunId == null) {
      return;
    }

    setPendingExampleAutoRunId(null);
    void Promise.allSettled([
      submitHeadlossCalculation(),
      submitNpshCalculation(),
      submitHeadCalculation(),
    ]);
  }, [headForm, headlossForm, fittingRows, npshForm, pendingExampleAutoRunId]);

  return (
    <ModuleTabsLayout
      title="Perda de Carga e Bombas"
      subtitle={
        <>
          <p>
            Estime perdas por atrito, NPSH disponível e altura manométrica a partir dos dados
            hidráulicos do sistema.
          </p>
          {pageError ? <p className="text-red-600">{pageError}</p> : null}
        </>
      }
      action={
        <Button type="button" variant="outline" onClick={applyWorkedExample}>
          Carregar exemplo
        </Button>
      }
      tabs={pumpTabs}
    >
      {activeTab === "headloss" ? (
        <Card>
          <CardHeader title="Perda de Carga" />
          <CardContent className="space-y-4">
            <HeadlossHowItWorks />

            <form className="space-y-4" onSubmit={handleHeadlossSubmit}>
              <Combobox
                label="Método de perda de carga"
                options={methods}
                value={headlossForm.method}
                onValueChange={(value) => setHeadlossField("method", value as HeadlossMethod)}
                placeholder="Selecione um método"
              />

              <NumberField
                id="pipe-length"
                label="Comprimento da tubulação"
                unit="m"
                value={headlossForm.pipeLength}
                onChange={(value) => setHeadlossField("pipeLength", value)}
              />
              <NumberField
                id="headloss-diameter"
                label="Diâmetro interno"
                unit="mm"
                value={headlossForm.diameter}
                onChange={(value) => setHeadlossField("diameter", value)}
              />
              <NumberField
                id="headloss-flow-rate"
                label="Vazão"
                unit="m³/s"
                value={headlossForm.flowRate}
                onChange={(value) => setHeadlossField("flowRate", value)}
              />
              <NumberField
                id="headloss-velocity"
                label="Velocidade do escoamento"
                unit="m/s"
                value={headlossForm.velocity}
                onChange={(value) => setHeadlossField("velocity", value)}
              />

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-800">Fonte do atrito</legend>
                <label className="flex items-center gap-2 text-sm" htmlFor="headloss-source-manual">
                  <input
                    id="headloss-source-manual"
                    type="radio"
                    name="headloss-source"
                    checked={headlossSource === "manual"}
                    onChange={() => {
                      setHeadlossSource("manual");
                      clearHeadlossDerived();
                    }}
                  />
                  {headlossForm.method === "Darcy-Weisbach"
                    ? "Usar fator informado"
                    : "Usar coeficiente informado"}
                </label>
                <label className="flex items-center gap-2 text-sm" htmlFor="headloss-source-material">
                  <input
                    id="headloss-source-material"
                    type="radio"
                    name="headloss-source"
                    checked={headlossSource === "material"}
                    onChange={() => {
                      setHeadlossSource("material");
                      clearHeadlossDerived();
                    }}
                  />
                  Usar material
                </label>
              </fieldset>

              {headlossSource === "manual" ? (
                headlossForm.method === "Darcy-Weisbach" ? (
                  <NumberField
                    id="headloss-friction-factor"
                    label="Fator de atrito"
                    value={headlossForm.frictionFactor}
                    onChange={(value) => setHeadlossField("frictionFactor", value)}
                  />
                ) : (
                  <NumberField
                    id="roughness-coefficient"
                    label="Coeficiente de rugosidade"
                    value={headlossForm.roughnessCoefficient}
                    onChange={(value) => setHeadlossField("roughnessCoefficient", value)}
                  />
                )
              ) : (
                <>
                  <Combobox
                    label="Material da tubulação"
                    options={compositions}
                    value={headlossForm.composition}
                    onValueChange={(value) => void handleCompositionChange(value)}
                    placeholder="Selecione um material"
                  />

                  {headlossForm.method === "Darcy-Weisbach" ? (
                    <>
                      <NumberField
                        id="headloss-reynolds"
                        label="Número de Reynolds"
                        rule="number"
                        value={headlossForm.reynolds}
                        onChange={(value) => setHeadlossField("reynolds", value)}
                      />
                      <Combobox
                        label="Método do fator de atrito"
                        options={frictionMethods}
                        value={headlossForm.frictionMethod}
                        onValueChange={(value) => setHeadlossField("frictionMethod", value)}
                        placeholder="Selecione um método"
                      />
                    </>
                  ) : null}
                </>
              )}

              <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">Acessórios</p>
                  <Button type="button" variant="outline" onClick={addFittingRow}>
                    Adicionar conexão
                  </Button>
                </div>

                {fittingRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Conexão {index + 1}
                      </h4>
                      <RemoveButton
                        label={`Remover conexão ${index + 1}`}
                        onClick={() => removeFittingRow(row.id)}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                      <Combobox
                        label="Conexão"
                        options={fittings}
                        value={row.fitting}
                        onValueChange={(value) => updateFittingRow(row.id, "fitting", value)}
                        placeholder="Sem conexão adicional"
                      />

                      <NumberField
                        id={`fitting-quantity-${index}`}
                        label="Quantidade"
                        min="1"
                        step="1"
                        value={row.quantity}
                        onChange={(value) => updateFittingRow(row.id, "quantity", value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button type="submit">Calcular perda de carga</Button>
            </form>

            <ResultTableSection
              title="Resultado"
              emptyLabel="Sem resultado."
              rows={buildResultRows("Perda de carga", headlossResult)}
            />

            {headlossResult && headlossChartModel ? (
              <div className="space-y-4">
                <ChartModelRenderer
                  hiddenMarkerLabelIds={["operating-point"]}
                  footer={
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      {headlossChartModel.series.map((series) => (
                        <span
                          key={series.id}
                          className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 shadow-sm"
                          style={{
                            borderColor: series.color ?? "#2563eb",
                            color: series.color ?? "#2563eb",
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: series.color ?? "#2563eb" }}
                          />
                          {series.name}
                        </span>
                      ))}
                      {headlossChartModel.markers
                        ?.filter((marker) => marker.id === "operating-point")
                        .map((marker) => (
                          <span
                            key={marker.id}
                            className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 shadow-sm"
                            style={{
                              borderColor: marker.color ?? "#dc2626",
                              color: marker.color ?? "#dc2626",
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 rounded-sm"
                              style={{ backgroundColor: marker.color ?? "#dc2626" }}
                            />
                            {marker.label}
                          </span>
                        ))}
                    </div>
                  }
                  panelClassName="mx-auto w-full max-w-[760px]"
                  model={headlossChartModel}
                />
                {efficiencyMapModel ? <PumpEfficiencyMap model={efficiencyMapModel} /> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "npsh-available" ? (
        <Card>
          <CardHeader title="NPSH Disponível" />
          <CardContent className="space-y-4">
            <NpshHowItWorks />

            <form className="space-y-4" onSubmit={handleNpshSubmit}>
              <NumberField
                id="manometric-pressure"
                label="Pressão manométrica"
                unit="kgf/cm²"
                rule="number"
                value={npshForm.manometricPressure}
                onChange={(value) => setNpshField("manometricPressure", value)}
              />
              <NumberField
                id="atmospheric-pressure"
                label="Pressão atmosférica"
                unit="kgf/cm²"
                rule="number"
                value={npshForm.atmosphericPressure}
                onChange={(value) => setNpshField("atmosphericPressure", value)}
              />
              <NumberField
                id="vapor-pressure"
                label="Pressão de vapor"
                unit="kgf/cm²"
                rule="number"
                value={npshForm.vaporPressure}
                onChange={(value) => setNpshField("vaporPressure", value)}
              />
              <NumberField
                id="specific-mass"
                label="Massa específica"
                unit="kg/m³"
                value={npshForm.density}
                onChange={(value) => setNpshField("density", value)}
              />
              <NumberField
                id="npsh-friction-factor"
                label="Perda de carga na sucção"
                unit="m"
                rule="number"
                value={npshForm.frictionFactor}
                onChange={(value) => setNpshField("frictionFactor", value)}
              />
              <NumberField
                id="pump-inlet-velocity"
                label="Velocidade na sucção"
                unit="m/s"
                rule="number"
                value={npshForm.pumpInletVelocity}
                onChange={(value) => setNpshField("pumpInletVelocity", value)}
              />
              <NumberField
                id="gauge-elevation"
                label="Elevação do manômetro"
                unit="m"
                rule="number"
                value={npshForm.gaugeElevation}
                onChange={(value) => setNpshField("gaugeElevation", value)}
              />
              <NumberField
                id="npsh-required"
                label="NPSHr opcional"
                unit="m"
                rule="number"
                value={npshForm.required}
                onChange={(value) => setNpshField("required", value)}
              />
              <Button type="submit">Calcular NPSH disponível</Button>
            </form>

            <ResultTableSection
              title="Resultado"
              emptyLabel="Sem resultado."
              rows={buildResultRows("NPSH disponível", npshResult)}
            />

            {npshResult && npshGaugeModel ? <NpshGauge model={npshGaugeModel} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "manometric-head" ? (
        <Card>
          <CardHeader title="Altura Manométrica" />
          <CardContent className="space-y-4">
            <HeadHowItWorks />

            <form className="space-y-4" onSubmit={handleHeadSubmit}>
              <NumberField
                id="pressure1"
                label="Pressão 1"
                unit="Pa"
                rule="number"
                value={headForm.pressure1}
                onChange={(value) => setHeadField("pressure1", value)}
              />
              <NumberField
                id="pressure2"
                label="Pressão 2"
                unit="Pa"
                rule="number"
                value={headForm.pressure2}
                onChange={(value) => setHeadField("pressure2", value)}
              />
              <NumberField
                id="elevation1"
                label="Elevação 1"
                unit="m"
                rule="number"
                value={headForm.elevation1}
                onChange={(value) => setHeadField("elevation1", value)}
              />
              <NumberField
                id="elevation2"
                label="Elevação 2"
                unit="m"
                rule="number"
                value={headForm.elevation2}
                onChange={(value) => setHeadField("elevation2", value)}
              />
              <NumberField
                id="velocity1"
                label="Velocidade 1"
                unit="m/s"
                rule="number"
                value={headForm.velocity1}
                onChange={(value) => setHeadField("velocity1", value)}
              />
              <NumberField
                id="velocity2"
                label="Velocidade 2"
                unit="m/s"
                rule="number"
                value={headForm.velocity2}
                onChange={(value) => setHeadField("velocity2", value)}
              />
              <NumberField
                id="head-specific-mass"
                label="Massa específica do fluido"
                unit="kg/m³"
                value={headForm.density}
                onChange={(value) => setHeadField("density", value)}
              />
              <NumberField
                id="head-friction-factor"
                label="Perda de carga total"
                unit="m"
                rule="number"
                value={headForm.frictionFactor}
                onChange={(value) => setHeadField("frictionFactor", value)}
              />
              <Button type="submit">Calcular altura manométrica</Button>
            </form>

            <ResultTableSection
              title="Resultado"
              emptyLabel="Sem resultado."
              rows={buildResultRows("Altura manométrica", headResult)}
            />

            {headResult ? (
              <HeadBreakdownChart totalHead={headResult.value} terms={buildHeadBreakdownTerms(headForm)} />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

    </ModuleTabsLayout>
  );
}
