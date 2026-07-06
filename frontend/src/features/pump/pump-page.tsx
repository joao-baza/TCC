import { useEffect, useRef, useState } from "react";

import { NumberField } from "@/components/number-field";
import type { PropertyRow } from "@/components/property-table";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ResultTableSection } from "@/components/result-table-section";
import { EnergyGradeLineChart } from "@/components/viz/energy-grade-line-chart";
import { HeadBreakdownChart } from "@/components/viz/head-breakdown-chart";
import { HeadlossCurve } from "@/components/viz/headloss-curve";
import { PumpSystemCurve } from "@/components/viz/pump-system-curve";
import { PumpEfficiencyMap } from "@/components/viz/pump-efficiency-map";
import { PressureProfileChart } from "@/components/viz/pressure-profile-chart";
import { NpshGauge } from "@/components/viz/npsh-gauge";
import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import type { Scenario } from "@/features/exploratory/types";
import { pumpExploratory } from "@/features/exploratory/templates";
import {
  HeadHowItWorks,
  HeadlossHowItWorks,
  NpshHowItWorks,
} from "@/features/pump/didactics";
import { pumpWorkedExample } from "@/features/pump/presets";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { selectOptionValue, toSelectOption, type SelectOption } from "@/lib/select-option";

type QuantityResult = {
  value: number;
  units: string;
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

type HeadTerm = {
  label: string;
  value: number;
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

function buildHeadlossCurvePoints(
  method: HeadlossMethod,
  flowRate: number,
  headloss: number,
) {
  if (!(flowRate > 0) || !Number.isFinite(headloss)) {
    return [];
  }

  const exponent = method === "Hazen-Williams" ? 1.852 : 2;
  return [0.5, 0.75, 1, 1.25, 1.5].map((ratio) => ({
    flowRate: Number((flowRate * ratio).toFixed(5)),
    headloss: Number((headloss * ratio ** exponent).toFixed(2)),
  }));
}

function buildHeadTerms(form: HeadFormState): HeadTerm[] {
  const density = Number(form.density);
  const g = 9.80665;
  const pressureTerm =
    density > 0 ? (Number(form.pressure2) - Number(form.pressure1)) / (density * g) : 0;
  const elevationTerm = Number(form.elevation2) - Number(form.elevation1);
  const velocityTerm =
    (Number(form.velocity2) ** 2 - Number(form.velocity1) ** 2) / (2 * g);
  const headlossTerm = Number(form.frictionFactor);

  return [
    { label: "ΔP/(ρg)", value: Number(pressureTerm.toFixed(2)) },
    { label: "Δz", value: Number(elevationTerm.toFixed(2)) },
    { label: "ΔV²/(2g)", value: Number(velocityTerm.toFixed(2)) },
    { label: "-h_f", value: Number((-headlossTerm).toFixed(2)) },
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

  const [headForm, setHeadForm] = useState<HeadFormState>(initialHeadForm);
  const [headResult, setHeadResult] = useState<QuantityResult | null>(null);
  const [headTerms, setHeadTerms] = useState<HeadTerm[]>([]);
  const headlossSessionRef = useRef(0);
  const npshSessionRef = useRef(0);
  const headSessionRef = useRef(0);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);

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

  function applyWorkedExample() {
    headlossSessionRef.current += 1;
    npshSessionRef.current += 1;
    headSessionRef.current += 1;
    setHeadlossForm({
      ...initialHeadlossForm,
      ...pumpWorkedExample.headloss,
      method: pumpWorkedExample.headloss.method as HeadlossMethod,
    });
    setNpshForm({ ...initialNpshForm, ...pumpWorkedExample.npsh });
    setHeadForm({ ...initialHeadForm, ...pumpWorkedExample.head });
    setHeadlossSource("manual");
    setFittingRows([createFittingRow("fitting-0")]);
    setHeadlossResult(null);
    setNpshResult(null);
    setHeadResult(null);
    setHeadTerms([]);
    notify.success("Exemplo carregado com sucesso.");
  }

  function clearHeadlossDerived() {
    headlossSessionRef.current += 1;
    setHeadlossResult(null);
  }

  function clearNpshDerived() {
    npshSessionRef.current += 1;
    setNpshResult(null);
  }

  function clearHeadDerived() {
    headSessionRef.current += 1;
    setHeadResult(null);
    setHeadTerms([]);
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

  function addFittingRow() {
    setFittingRows((current) => [...current, createFittingRow()]);
    clearHeadlossDerived();
  }

  function loadExploratoryFields(fields: Record<string, string>) {
    setHeadlossForm((current) => ({
      ...current,
      method: "Darcy-Weisbach",
      pipeLength: fields["pipe-length"] ?? current.pipeLength,
      diameter: fields["headloss-diameter"] ?? current.diameter,
      flowRate: fields["headloss-flow-rate"] ?? current.flowRate,
      frictionFactor: fields["headloss-friction-factor"] ?? current.frictionFactor,
      velocity: fields["headloss-velocity"] ?? current.velocity,
      composition: "",
      reynolds: "",
      frictionMethod: current.frictionMethod,
    }));
    setNpshForm((current) => ({
      ...current,
      atmosphericPressure: fields["atmospheric-pressure"] ?? current.atmosphericPressure,
      vaporPressure: fields["vapor-pressure"] ?? current.vaporPressure,
      density: fields["specific-mass"] ?? current.density,
      frictionFactor: fields["npsh-friction-factor"] ?? current.frictionFactor,
      pumpInletVelocity: fields["pump-inlet-velocity"] ?? current.pumpInletVelocity,
      gaugeElevation: fields["gauge-elevation"] ?? current.gaugeElevation,
      required: fields["npsh-required"] ?? current.required,
    }));
    setHeadForm((current) => ({
      ...current,
      pressure1: fields.pressure1 ?? current.pressure1,
      pressure2: fields.pressure2 ?? current.pressure2,
      elevation1: fields.elevation1 ?? current.elevation1,
      elevation2: fields.elevation2 ?? current.elevation2,
      velocity1: fields.velocity1 ?? current.velocity1,
      velocity2: fields.velocity2 ?? current.velocity2,
      density: fields["head-specific-mass"] ?? current.density,
      frictionFactor: fields["head-friction-factor"] ?? current.frictionFactor,
    }));
    setHeadlossSource("manual");
    clearAllDerived();
  }

  function changeExploratoryField(field: string, value: string) {
    if (field === "pipe-length") {
      setHeadlossField("pipeLength", value);
    } else if (field === "headloss-flow-rate") {
      setHeadlossField("flowRate", value);
    } else if (field === "gauge-elevation") {
      setNpshField("gaugeElevation", value);
    }
    clearAllDerived();
  }

  function describeScenario() {
    return `L=${headlossForm.pipeLength || "—"} m, Q=${headlossForm.flowRate || "—"} m3/s`;
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

  async function handleHeadlossSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    } catch (error) {
      const message = `Erro ao calcular perda de carga: ${getErrorMessage(error)}`;
      setPageError(message);
      notify.error(message);
    }
  }

  async function handleNpshSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = npshSessionRef.current;
    setPageError(null);

    try {
      const response = await apiClient.post<{ head_loss: QuantityResult }>(
        "/pump/npsh-available",
        {
          manometric_pressure: Number(npshForm.manometricPressure),
          atmospheric_pressure: Number(npshForm.atmosphericPressure),
          vapor_pressure: Number(npshForm.vaporPressure),
          density: Number(npshForm.density),
          friction_factor: Number(npshForm.frictionFactor),
          pump_inlet_velocity: Number(npshForm.pumpInletVelocity),
          gauge_elevation: Number(npshForm.gaugeElevation),
        },
      );

      if (sessionId !== npshSessionRef.current) {
        return;
      }

      setNpshResult(response.head_loss);
    } catch (error) {
      if (sessionId !== npshSessionRef.current) {
        return;
      }

      const message = `Erro ao calcular NPSH disponível: ${getErrorMessage(error)}`;
      setPageError(message);
      notify.error(message);
    }
  }

  async function handleHeadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      setHeadTerms(buildHeadTerms(headForm));
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

  const curvePoints = buildHeadlossCurvePoints(
    headlossForm.method,
    Number(headlossForm.flowRate),
    headlossResult?.value ?? Number.NaN,
  );
  const resolvedHeadlossFlow = resolveHeadlossFlowVelocity(headlossForm);
  const pressureProfileItems = [
    {
      label: "Tubulacao",
      quantity: Math.max(Number(headlossForm.pipeLength) || 0, 1),
    },
    ...fittingRows
      .filter((row) => row.fitting && Number(row.quantity) > 0)
      .map((row) => ({
        label: row.fitting,
        quantity: Number(row.quantity),
      })),
  ];

  return (
    <section className="space-y-8 overflow-x-hidden p-6 md:p-8">
      <Card>
        <CardHeader
          level={1}
          subtitle={
            <>
              <p>
                Estime perdas por atrito, NPSH disponível e altura manométrica a partir
                dos dados hidráulicos do sistema.
              </p>
              {pageError ? <p className="text-red-600">{pageError}</p> : null}
            </>
          }
          title="Perda de Carga e Bombas"
          variant="hero"
          action={
            <Button type="button" variant="outline" onClick={applyWorkedExample}>
              Carregar exemplo
            </Button>
          }
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
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
                label="Comprimento da linha"
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
                label="Velocidade na linha"
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
                  <div key={row.id} className="grid gap-3 sm:grid-cols-[1fr_140px]">
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
                ))}
              </div>

              <Button type="submit">Calcular perda de carga</Button>
            </form>

            <ResultTableSection
              title="Resultado"
              emptyLabel="Sem resultado."
              rows={buildResultRows("Perda de carga", headlossResult)}
            />

            {headlossResult && curvePoints.length > 0 ? (
              <div className="space-y-4">
                <HeadlossCurve
                  method={headlossForm.method}
                  points={curvePoints}
                  operationalPoint={{
                    flowRate: Number(headlossForm.flowRate),
                    headloss: headlossResult.value,
                  }}
                  scenarios={savedScenarios}
                />
                <PumpSystemCurve
                  operatingPoint={{
                    flowRate: Number(headlossForm.flowRate),
                    head: headlossResult.value,
                  }}
                  systemPoints={curvePoints.map((point) => ({
                    flowRate: point.flowRate,
                    head: point.headloss,
                  }))}
                />
                <PumpEfficiencyMap
                  availableNpsh={npshResult?.value ?? null}
                  operatingPoint={{
                    flowRate: Number(headlossForm.flowRate),
                    head: headlossResult.value,
                  }}
                  requiredNpsh={npshForm.required ? Number(npshForm.required) : null}
                  systemCurve={curvePoints.map((point) => ({
                    flowRate: point.flowRate,
                    head: point.headloss,
                  }))}
                />
                <EnergyGradeLineChart
                  length={Number(headlossForm.pipeLength) || 0}
                  totalHeadLoss={headlossResult.value}
                  velocity={resolvedHeadlossFlow.velocity}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

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

            {npshResult ? (
              <NpshGauge
                available={npshResult.value}
                required={npshForm.required ? Number(npshForm.required) : undefined}
              />
            ) : null}
          </CardContent>
        </Card>

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
              <HeadBreakdownChart totalHead={headResult.value} terms={headTerms} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {headlossResult ? (
        <Card>
          <CardHeader title="Perfil de pressão" />
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Decomposição didática da perda de carga ao longo da linha e dos
              acessórios informados.
            </p>
            <PressureProfileChart
              items={pressureProfileItems}
              length={Number(headlossForm.pipeLength) || 0}
              totalDrop={headlossResult.value}
            />
          </CardContent>
        </Card>
      ) : null}

      <ExploratoryPanel
        config={pumpExploratory}
        state={{
          applyFields: loadExploratoryFields,
          changeField: changeExploratoryField,
          describeScenario,
        }}
        onScenariosChange={setSavedScenarios}
      />
    </section>
  );
}
