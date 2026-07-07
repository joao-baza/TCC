import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { NumberField } from "@/components/number-field";
import type { PropertyRow } from "@/components/property-table";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { ResultTableSection } from "@/components/result-table-section";
import { HydraulicDiameterPreview } from "@/components/viz/hydraulic-diameter-preview";
import { MoodyChart } from "@/components/viz/moody-chart";
import { RegimeRuler } from "@/components/viz/regime-ruler";
import {
  FrictionFactorHowItWorks,
  HydraulicDiameterHowItWorks,
  ReynoldsHowItWorks,
} from "@/features/flow/didactics";
import {
  mapFlowExampleToFormInputs,
  type FlowExamplePayload,
} from "@/features/flow/example";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { selectOptionValue, toSelectOption, type SelectOption } from "@/lib/select-option";
import { flowTabs } from "@/features/flow/flow-tabs";

type Schedule = {
  name: string;
  label: string;
  diameters: number[];
  description: string;
};

type ScheduleResponse = {
  value?: string;
  label?: string;
  name?: string;
  diameters?: number[];
  description?: string;
} | string;

type DiameterOption = {
  nominal_diameter: number;
  external_diameter: number;
  units: string;
};

type QuantityResult = {
  value: number;
  units: string;
};

type CompositionDetails = {
  specifications: {
    roughness?: QuantityResult;
  };
};

const supportedShapes = [
  "circular",
  "rectangular",
  "annular",
  "triangular",
  "circularCap",
] as const;

const shapeFieldMap: Record<(typeof supportedShapes)[number], string[]> = {
  circular: ["diameter"],
  rectangular: ["width", "height"],
  annular: ["outer_diameter", "inner_diameter"],
  triangular: ["side_a", "side_b", "side_c"],
  circularCap: ["diameter", "height"],
};

type Shape = (typeof supportedShapes)[number];

type FrictionContext = {
  relativeRoughness: number;
  reynolds: number;
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400";

function isSupportedShape(shape: string): shape is Shape {
  return supportedShapes.includes(shape as Shape);
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

type HydraulicShapeFieldProps = {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
};

function HydraulicShapeField({ id, label, value, onChange }: HydraulicShapeFieldProps) {
  return (
    <NumberField
      id={id}
      label={label}
      unit="m"
      rule="nonneg"
      value={value ?? ""}
      onChange={onChange}
    />
  );
}

export function FlowPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<SelectOption[]>([]);
  const [shapes, setShapes] = useState<SelectOption[]>([]);
  const [compositions, setCompositions] = useState<SelectOption[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [diameters, setDiameters] = useState<DiameterOption[]>([]);

  const [reynoldsForm, setReynoldsForm] = useState({
    characteristicDiameter: "",
    velocity: "",
    density: "",
    dynamicViscosity: "",
    kinematicViscosity: "",
  });
  const [reynoldsResult, setReynoldsResult] = useState<QuantityResult | null>(null);
  const [reynoldsNumber, setReynoldsNumber] = useState("");
  const [reynoldsError, setReynoldsError] = useState<string | null>(null);
  const reynoldsSessionRef = useRef(0);

  const [roughnessSource, setRoughnessSource] = useState<"custom" | "composition">(
    "custom",
  );
  const [diameterSource, setDiameterSource] = useState<"custom" | "schedule">("custom");
  const [frictionForm, setFrictionForm] = useState({
    method: "",
    customRoughness: "",
    composition: "",
    customDiameter: "",
    schedule: "",
    scheduleDiameter: "",
  });
  const [frictionResult, setFrictionResult] = useState<QuantityResult | null>(null);
  const [frictionContext, setFrictionContext] = useState<FrictionContext | null>(null);
  const [frictionError, setFrictionError] = useState<string | null>(null);
  const frictionSessionRef = useRef(0);

  const [shape, setShape] = useState<Shape | "">("");
  const [shapeParams, setShapeParams] = useState<Record<string, string>>({});
  const [hydraulicResult, setHydraulicResult] = useState<QuantityResult | null>(null);
  const [hydraulicError, setHydraulicError] = useState<string | null>(null);
  const hydraulicSessionRef = useRef(0);

  const [pageError, setPageError] = useState<string | null>(null);
  const activeTab = useMemo(() => {
    if (!pathname.startsWith("/flow")) {
      return "reynolds";
    }

    const tab = pathname.slice("/flow/".length).split("/")[0];
    return tab || "reynolds";
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/flow") {
      navigate("reynolds", { replace: true });
    }
  }, [navigate, pathname]);

  useEffect(() => {
    let ignore = false;

    async function loadPageData() {
      setPageError(null);
      try {
        const [methodResponse, shapeResponse, compositionResponse, scheduleResponse] =
          await Promise.all([
            apiClient.get<Array<string | SelectOption>>("/flow/friction-factor/methods"),
            apiClient.get<Array<string | SelectOption>>("/flow/hydraulic-diameter/shapes"),
            apiClient.get<Array<string | SelectOption>>("/piping/compositions"),
            apiClient.get<ScheduleResponse[]>("/piping/schedules"),
          ]);

        if (ignore) {
          return;
        }

        setMethods(methodResponse.map(toSelectOption));
        setShapes(shapeResponse.map(toSelectOption).filter((option) => isSupportedShape(option.value)));
        setCompositions(compositionResponse.map(toSelectOption));
        setSchedules(
          scheduleResponse.map((schedule) => {
            if (typeof schedule === "string") {
              return {
                name: schedule,
                label: schedule,
                diameters: [],
                description: "",
              };
            }

            return {
              name: schedule.name ?? schedule.value ?? "",
              label: schedule.label ?? schedule.name ?? schedule.value ?? "",
              diameters: schedule.diameters ?? [],
              description: schedule.description ?? "",
            };
          }),
        );
        setFrictionForm((current) => ({
          ...current,
          method: selectOptionValue(methodResponse[0] ?? ""),
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

  useEffect(() => {
    if (diameterSource !== "schedule" || !frictionForm.schedule) {
      setDiameters([]);
      return;
    }

    let ignore = false;

    async function loadScheduleDiameters() {
      const encoded = encodeURIComponent(frictionForm.schedule);
      const response = await apiClient.get<Record<string, DiameterOption>>(
        `/piping/schedule/${encoded}/diameters`,
      );

      if (!ignore) {
        setDiameters(Object.values(response));
      }
    }

    void loadScheduleDiameters();

    return () => {
      ignore = true;
    };
  }, [diameterSource, frictionForm.schedule]);

  function clearFrictionDerived() {
    frictionSessionRef.current += 1;
    setFrictionResult(null);
    setFrictionContext(null);
    setFrictionError(null);
  }

  function clearHydraulicDerived() {
    hydraulicSessionRef.current += 1;
    setHydraulicResult(null);
    setHydraulicError(null);
  }

  function clearReynoldsDerived() {
    reynoldsSessionRef.current += 1;
    setReynoldsResult(null);
    setReynoldsNumber("");
    setReynoldsError(null);
    clearFrictionDerived();
  }

  function setReynoldsField<K extends keyof typeof reynoldsForm>(
    field: K,
    value: (typeof reynoldsForm)[K],
  ) {
    setReynoldsForm((current) => ({ ...current, [field]: value }));
    clearReynoldsDerived();
  }

  function setFrictionField<K extends keyof typeof frictionForm>(
    field: K,
    value: (typeof frictionForm)[K],
  ) {
    setFrictionForm((current) => ({ ...current, [field]: value }));
    clearFrictionDerived();
  }

  async function loadExample() {
    try {
      const example = await apiClient.get<FlowExamplePayload>("/flow/example");
      const mapped = mapFlowExampleToFormInputs(example);

      setReynoldsForm((current) => ({
        ...current,
        ...mapped.reynolds,
        kinematicViscosity: "",
      }));
      setFrictionForm((current) => ({
        ...current,
        ...mapped.friction,
        customRoughness: "",
        schedule: "",
        scheduleDiameter: "",
      }));
      setShape(mapped.hydraulicDiameter.shape as Shape);
      setShapeParams(mapped.hydraulicDiameter.parameters);
      setRoughnessSource(mapped.roughnessSource);
      setDiameterSource(mapped.diameterSource);
      clearReynoldsDerived();
      clearHydraulicDerived();
      notify.success("Exemplo carregado com sucesso.");
    } catch (error) {
      notify.error(`Erro ao carregar exemplo: ${getErrorMessage(error)}`);
    }
  }

  async function handleReynoldsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = reynoldsSessionRef.current;

    if (!reynoldsForm.characteristicDiameter || !reynoldsForm.velocity) {
      setReynoldsError("Informe o diâmetro característico e a velocidade.");
      return;
    }

    if (
      (!reynoldsForm.density || !reynoldsForm.dynamicViscosity) &&
      !reynoldsForm.kinematicViscosity
    ) {
      setReynoldsError(
        "Informe densidade e viscosidade dinâmica, ou viscosidade cinemática.",
      );
      return;
    }

    const payload: Record<string, number> = {
      characteristic_diameter: Number(reynoldsForm.characteristicDiameter),
      velocity: Number(reynoldsForm.velocity),
    };

    if (reynoldsForm.kinematicViscosity) {
      payload.kinematic_viscosity = Number(reynoldsForm.kinematicViscosity);
    } else {
      payload.density = Number(reynoldsForm.density);
      payload.dynamic_viscosity = Number(reynoldsForm.dynamicViscosity);
    }

    try {
      const response = await apiClient.post<QuantityResult>("/flow/reynolds", payload);
      if (sessionId !== reynoldsSessionRef.current) {
        return;
      }

      setReynoldsResult(response);
      setReynoldsNumber(String(response.value));
    } catch (error) {
      if (sessionId !== reynoldsSessionRef.current) {
        return;
      }

      notify.error(`Erro ao calcular Reynolds: ${getErrorMessage(error)}`);
    }
  }

  async function handleFrictionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = frictionSessionRef.current;

    if (roughnessSource === "custom" && !frictionForm.customRoughness) {
      setFrictionError("Informe um valor de rugosidade personalizado.");
      return;
    }

    if (roughnessSource === "composition" && !frictionForm.composition) {
      setFrictionError("Selecione uma composição de material.");
      return;
    }

    if (diameterSource === "custom" && !frictionForm.customDiameter) {
      setFrictionError("Informe um valor de diâmetro personalizado.");
      return;
    }

    if (diameterSource === "schedule" && (!frictionForm.schedule || !frictionForm.scheduleDiameter)) {
      setFrictionError("Selecione schedule e diâmetro.");
      return;
    }

    if (!reynoldsNumber || !frictionForm.method) {
      setFrictionError("Preencha todos os campos obrigatórios.");
      return;
    }

    let roughness = Number(frictionForm.customRoughness);
    if (roughnessSource === "composition" && frictionForm.composition) {
      try {
        const encoded = encodeURIComponent(frictionForm.composition);
        const compositionDetails = await apiClient.get<CompositionDetails>(
          `/piping/composition/${encoded}`,
        );
        if (sessionId !== frictionSessionRef.current) {
          return;
        }

        roughness = Number(compositionDetails.specifications.roughness?.value ?? 0);
      } catch {
        if (sessionId !== frictionSessionRef.current) {
          return;
        }

        notify.error("Erro ao carregar material: Não foi possível obter a rugosidade da composição");
        return;
      }
    }

    const diameter =
      diameterSource === "schedule"
        ? Number(frictionForm.scheduleDiameter)
        : Number(frictionForm.customDiameter);
    const appliedReynolds = Number(reynoldsNumber);
    const relativeRoughness = diameter > 0 ? roughness / diameter : Number.NaN;

    try {
      const response = await apiClient.post<QuantityResult>("/flow/friction-factor", {
        roughness,
        diameter,
        reynolds: appliedReynolds,
        method: frictionForm.method,
      });

      if (sessionId !== frictionSessionRef.current) {
        return;
      }

      setFrictionResult(response);
      setFrictionContext({ relativeRoughness, reynolds: appliedReynolds });
    } catch (error) {
      if (sessionId !== frictionSessionRef.current) {
        return;
      }

      notify.error(`Erro ao calcular fator de atrito: ${getErrorMessage(error)}`);
    }
  }

  async function handleHydraulicSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = hydraulicSessionRef.current;

    if (!shape) {
      setHydraulicError("Selecione uma forma.");
      return;
    }

    const requiredShapeFields = shapeFieldMap[shape];
    const hasMissingParams = requiredShapeFields.some((field) => !shapeParams[field]);
    if (hasMissingParams) {
      setHydraulicError("Preencha todos os parâmetros da forma selecionada.");
      return;
    }

    const payload = Object.fromEntries(
      Object.entries(shapeParams).map(([key, value]) => [key, Number(value)]),
    );

    if (
      shape === "annular" &&
      payload.outer_diameter != null &&
      payload.inner_diameter != null &&
      payload.inner_diameter >= payload.outer_diameter
    ) {
      setHydraulicError("O diâmetro interno deve ser menor que o externo.");
      return;
    }

    if (
      shape === "triangular" &&
      payload.side_a != null &&
      payload.side_b != null &&
      payload.side_c != null &&
      (payload.side_a + payload.side_b <= payload.side_c ||
        payload.side_a + payload.side_c <= payload.side_b ||
        payload.side_b + payload.side_c <= payload.side_a)
    ) {
      setHydraulicError(
        "Os lados não formam um triângulo válido (desigualdade triangular).",
      );
      return;
    }

    if (
      shape === "circularCap" &&
      payload.diameter != null &&
      payload.height != null &&
      payload.height > payload.diameter
    ) {
      setHydraulicError("A altura não pode ser maior que o diâmetro.");
      return;
    }

    try {
      const response = await apiClient.post<QuantityResult>("/flow/hydraulic-diameter", {
        shape,
        ...payload,
      });
      if (sessionId !== hydraulicSessionRef.current) {
        return;
      }

      setHydraulicResult(response);
    } catch (error) {
      if (sessionId !== hydraulicSessionRef.current) {
        return;
      }

      notify.error(`Erro ao calcular diâmetro hidráulico: ${getErrorMessage(error)}`);
    }
  }

  return (
    <ModuleTabsLayout
      title="Escoamento Interno"
      subtitle={
        <>
          <p>
            Cálculo de Reynolds, fator de atrito e diâmetro hidráulico para apoiar a análise de
            escoamento em dutos e geometrias não circulares.
          </p>
          {pageError ? <p className="text-red-600">{pageError}</p> : null}
        </>
      }
      action={
        <Button type="button" variant="outline" onClick={loadExample}>
          Carregar exemplo
        </Button>
      }
      tabs={flowTabs}
    >
      {activeTab === "reynolds" ? (
        <Card>
          <CardHeader title="Número de Reynolds" />
          <CardContent className="space-y-4">
            <ReynoldsHowItWorks />

            <form className="space-y-4" onSubmit={handleReynoldsSubmit}>
              <NumberField
                id="characteristic-diameter"
                label="Diâmetro característico"
                unit="mm"
                value={reynoldsForm.characteristicDiameter}
                onChange={(value) => setReynoldsField("characteristicDiameter", value)}
              />
              <NumberField
                id="reynolds-velocity"
                label="Velocidade média"
                unit="m/s"
                value={reynoldsForm.velocity}
                onChange={(value) => setReynoldsField("velocity", value)}
              />
              <NumberField
                id="density"
                label="Densidade"
                unit="kg/m³"
                value={reynoldsForm.density}
                onChange={(value) => setReynoldsField("density", value)}
              />
              <NumberField
                id="dynamic-viscosity"
                label="Viscosidade dinâmica"
                unit="Pa.s"
                value={reynoldsForm.dynamicViscosity}
                onChange={(value) => setReynoldsField("dynamicViscosity", value)}
              />
              <NumberField
                id="kinematic-viscosity"
                label="Viscosidade cinemática"
                unit="m²/s"
                value={reynoldsForm.kinematicViscosity}
                onChange={(value) => setReynoldsField("kinematicViscosity", value)}
                rule="number"
              />

              <Button type="submit">Calcular Reynolds</Button>
            </form>
            {reynoldsError ? <p className="text-sm text-red-600">{reynoldsError}</p> : null}

            <ResultTableSection
              title="Resultado"
              emptyLabel="Sem resultado."
              rows={buildResultRows("Número de Reynolds", reynoldsResult)}
            />
            {reynoldsResult ? <RegimeRuler reynolds={reynoldsResult.value} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "friction-factor" ? (
        <Card>
          <CardHeader title="Fator de Atrito" />
          <CardContent>
            <FrictionFactorHowItWorks />
            <form className="space-y-4" onSubmit={handleFrictionSubmit}>
              <label className="block text-sm font-medium text-slate-800" htmlFor="reynolds-number">
                Número de Reynolds
                <input
                  id="reynolds-number"
                  className={inputClassName}
                  type="number"
                  step="any"
                  value={reynoldsNumber}
                  onChange={(event) => {
                    setReynoldsNumber(event.target.value);
                    clearFrictionDerived();
                  }}
                />
              </label>

              <Combobox
                label="Método de cálculo"
                options={methods}
                value={frictionForm.method}
                onValueChange={(value) => setFrictionField("method", value)}
                placeholder="Selecione um método"
              />

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-800">Rugosidade</legend>
                <label className="flex items-center gap-2 text-sm" htmlFor="roughness-custom">
                  <input
                    id="roughness-custom"
                    type="radio"
                    name="roughness-source"
                    checked={roughnessSource === "custom"}
                    onChange={() => {
                      setRoughnessSource("custom");
                      clearFrictionDerived();
                    }}
                  />
                  Valor customizado
                </label>
                <label className="flex items-center gap-2 text-sm" htmlFor="roughness-composition">
                  <input
                    id="roughness-composition"
                    type="radio"
                    name="roughness-source"
                    checked={roughnessSource === "composition"}
                    onChange={() => {
                      setRoughnessSource("composition");
                      clearFrictionDerived();
                    }}
                  />
                  Usar composição
                </label>
              </fieldset>

              {roughnessSource === "custom" ? (
                <label className="block text-sm font-medium text-slate-800" htmlFor="custom-roughness">
                  Rugosidade
                  <input
                    id="custom-roughness"
                    className={inputClassName}
                    type="number"
                    step="any"
                    value={frictionForm.customRoughness}
                    onChange={(event) => setFrictionField("customRoughness", event.target.value)}
                  />
                </label>
              ) : (
                <Combobox
                  label="Material da tubulação"
                  options={compositions}
                  value={frictionForm.composition}
                  onValueChange={(value) => setFrictionField("composition", value)}
                  placeholder="Selecione uma composição"
                />
              )}

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-800">Diâmetro</legend>
                <label className="flex items-center gap-2 text-sm" htmlFor="diameter-custom">
                  <input
                    id="diameter-custom"
                    type="radio"
                    name="diameter-source"
                    checked={diameterSource === "custom"}
                    onChange={() => {
                      setDiameterSource("custom");
                      clearFrictionDerived();
                    }}
                  />
                  Valor customizado
                </label>
                <label className="flex items-center gap-2 text-sm" htmlFor="diameter-schedule">
                  <input
                    id="diameter-schedule"
                    type="radio"
                    name="diameter-source"
                    checked={diameterSource === "schedule"}
                    onChange={() => {
                      setDiameterSource("schedule");
                      clearFrictionDerived();
                    }}
                  />
                  Usar schedule
                </label>
              </fieldset>

              {diameterSource === "custom" ? (
                <label className="block text-sm font-medium text-slate-800" htmlFor="custom-diameter">
                  Diâmetro da linha
                  <input
                    id="custom-diameter"
                    className={inputClassName}
                    type="number"
                    step="any"
                    value={frictionForm.customDiameter}
                    onChange={(event) => setFrictionField("customDiameter", event.target.value)}
                  />
                </label>
              ) : (
                <>
                  <Combobox
                    label="Schedule"
                    options={schedules.map((schedule) => ({
                      value: schedule.name,
                      label: schedule.label,
                    }))}
                    value={frictionForm.schedule}
                    onValueChange={(value) => {
                      setFrictionForm((current) => ({
                        ...current,
                        schedule: value,
                        scheduleDiameter: "",
                      }));
                      clearFrictionDerived();
                    }}
                    placeholder="Selecione um schedule"
                  />

                  <Combobox
                    label="Diâmetro da linha"
                    options={diameters.map((diameter) => ({
                      value: String(diameter.external_diameter),
                      label: `${diameter.nominal_diameter} mm`,
                    }))}
                    value={frictionForm.scheduleDiameter}
                    onValueChange={(value) => setFrictionField("scheduleDiameter", value)}
                    placeholder="Selecione um diâmetro"
                    disabled={!frictionForm.schedule}
                  />
                </>
              )}

              <Button type="submit">Calcular fator de atrito</Button>
            </form>
            {frictionError ? <p className="mt-3 text-sm text-red-600">{frictionError}</p> : null}

            <ResultTableSection
              title="Resultado"
              emptyLabel="Sem resultado."
              rows={buildResultRows("Fator de atrito", frictionResult)}
            />
            {frictionResult && frictionContext ? (
            <MoodyChart
              reynolds={frictionContext.reynolds}
              frictionFactor={frictionResult.value}
              roughness={frictionContext.relativeRoughness}
            />
          ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "hydraulic-diameter" ? (
        <Card>
          <CardHeader title="Diâmetro Hidráulico" />
          <CardContent>
            <HydraulicDiameterHowItWorks />
            <form className="space-y-4" onSubmit={handleHydraulicSubmit}>
              <Combobox
                label="Forma geométrica"
                options={shapes}
                value={shape}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setShape(value as Shape);
                  setShapeParams({});
                  clearHydraulicDerived();
                }}
                placeholder="Selecione uma forma"
              />

              {shape === "circular" ? (
                <HydraulicShapeField
                  id="shape-diameter"
                  label="Diâmetro"
                  value={shapeParams.diameter}
                  onChange={(value) => {
                    setShapeParams((current) => ({ ...current, diameter: value }));
                    clearHydraulicDerived();
                  }}
                />
              ) : null}

              {shape === "rectangular" ? (
                <>
                  <HydraulicShapeField
                    id="shape-width"
                    label="Largura"
                    value={shapeParams.width}
                    onChange={(value) => {
                      setShapeParams((current) => ({ ...current, width: value }));
                      clearHydraulicDerived();
                    }}
                  />
                  <HydraulicShapeField
                    id="shape-height"
                    label="Altura"
                    value={shapeParams.height}
                    onChange={(value) => {
                      setShapeParams((current) => ({ ...current, height: value }));
                      clearHydraulicDerived();
                    }}
                  />
                </>
              ) : null}

              {shape === "annular" ? (
                <>
                  <HydraulicShapeField
                    id="outer-diameter"
                    label="Diâmetro externo"
                    value={shapeParams.outer_diameter}
                    onChange={(value) => {
                      setShapeParams((current) => ({
                        ...current,
                        outer_diameter: value,
                      }));
                      clearHydraulicDerived();
                    }}
                  />
                  <HydraulicShapeField
                    id="inner-diameter"
                    label="Diâmetro interno"
                    value={shapeParams.inner_diameter}
                    onChange={(value) => {
                      setShapeParams((current) => ({
                        ...current,
                        inner_diameter: value,
                      }));
                      clearHydraulicDerived();
                    }}
                  />
                </>
              ) : null}

              {shape === "triangular" ? (
                <>
                  <HydraulicShapeField
                    id="side-a"
                    label="Lado A"
                    value={shapeParams.side_a}
                    onChange={(value) => {
                      setShapeParams((current) => ({ ...current, side_a: value }));
                      clearHydraulicDerived();
                    }}
                  />
                  <HydraulicShapeField
                    id="side-b"
                    label="Lado B"
                    value={shapeParams.side_b}
                    onChange={(value) => {
                      setShapeParams((current) => ({ ...current, side_b: value }));
                      clearHydraulicDerived();
                    }}
                  />
                  <HydraulicShapeField
                    id="side-c"
                    label="Lado C"
                    value={shapeParams.side_c}
                    onChange={(value) => {
                      setShapeParams((current) => ({ ...current, side_c: value }));
                      clearHydraulicDerived();
                    }}
                  />
                </>
              ) : null}

              {shape === "circularCap" ? (
                <>
                  <HydraulicShapeField
                    id="cap-diameter"
                    label="Diâmetro"
                    value={shapeParams.diameter}
                    onChange={(value) => {
                      setShapeParams((current) => ({ ...current, diameter: value }));
                      clearHydraulicDerived();
                    }}
                  />
                  <HydraulicShapeField
                    id="cap-height"
                    label="Altura"
                    value={shapeParams.height}
                    onChange={(value) => {
                      setShapeParams((current) => ({ ...current, height: value }));
                      clearHydraulicDerived();
                    }}
                  />
                </>
              ) : null}

              <Button type="submit">Calcular diâmetro hidráulico</Button>
            </form>
            <HydraulicDiameterPreview shape={shape} parameters={shapeParams} />
            {hydraulicError ? <p className="mt-3 text-sm text-red-600">{hydraulicError}</p> : null}

            <ResultTableSection
              title="Resultado"
              emptyLabel="Sem resultado."
              rows={buildResultRows("Diâmetro hidráulico", hydraulicResult)}
            />
          </CardContent>
        </Card>
      ) : null}

    </ModuleTabsLayout>
  );
}
