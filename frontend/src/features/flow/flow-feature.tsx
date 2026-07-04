"use client";

import { useEffect, useState } from "react";
import { ActionRail, MetricGrid, ReynoldsScene } from "@/components/engineering-visuals";
import { ValueWithUnitsTable } from "@/components/property-table";
import type { EngineeringApi, PropertyRecord, ScheduleSummary, ValueWithUnits } from "@/lib/api";

type FlowFeatureProps = {
  api: EngineeringApi;
};

type ShapeField = {
  id: string;
  label: string;
};

const SHAPE_FIELDS: Record<string, ShapeField[]> = {
  circular: [{ id: "diameter", label: "Diâmetro (mm)" }],
  rectangular: [
    { id: "width", label: "Largura (mm)" },
    { id: "height", label: "Altura (mm)" }
  ],
  annular: [
    { id: "outer_diameter", label: "Diâmetro Externo (mm)" },
    { id: "inner_diameter", label: "Diâmetro Interno (mm)" }
  ],
  triangular: [
    { id: "side_a", label: "Lado A (mm)" },
    { id: "side_b", label: "Lado B (mm)" },
    { id: "side_c", label: "Lado C (mm)" }
  ],
  circularCap: [
    { id: "diameter", label: "Diâmetro (mm)" },
    { id: "height", label: "Altura da Calota (mm)" }
  ]
};

function isValueWithUnits(value: unknown): value is ValueWithUnits {
  return typeof value === "object" && value !== null && "value" in value && "units" in value;
}

function getRoughnessValue(compositionDetails: PropertyRecord) {
  const specifications = compositionDetails.specifications;

  if (
    typeof specifications !== "object" ||
    specifications === null ||
    !("roughness" in specifications) ||
    !isValueWithUnits(specifications.roughness)
  ) {
    throw new Error("A composição selecionada não informa rugosidade compatível.");
  }

  return specifications.roughness.value;
}

export function FlowFeature({ api }: FlowFeatureProps) {
  const [methods, setMethods] = useState<string[]>([]);
  const [shapes, setShapes] = useState<string[]>([]);
  const [compositions, setCompositions] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [diameters, setDiameters] = useState<Array<{ value: number; label: string }>>([]);
  const [form, setForm] = useState({
    characteristicDiameter: "",
    velocity: "",
    density: "",
    dynamicViscosity: "",
    reynoldsNumber: "",
    composition: "",
    schedule: "",
    flowDiameter: "",
    method: ""
  });
  const [hydraulicForm, setHydraulicForm] = useState<Record<string, string>>({
    shape: "",
    diameter: "",
    width: "",
    height: "",
    outer_diameter: "",
    inner_diameter: "",
    side_a: "",
    side_b: "",
    side_c: ""
  });
  const [reynoldsResult, setReynoldsResult] = useState<ValueWithUnits | null>(null);
  const [frictionResult, setFrictionResult] = useState<ValueWithUnits | null>(null);
  const [hydraulicResult, setHydraulicResult] = useState<ValueWithUnits | null>(null);

  useEffect(() => {
    async function loadOptions() {
      const [nextMethods, nextShapes, nextCompositions, nextSchedules] = await Promise.all([
        api.getFrictionFactorMethods(),
        api.getHydraulicDiameterShapes(),
        api.getCompositions(),
        api.getSchedules()
      ]);

      setMethods(nextMethods);
      setShapes(nextShapes);
      setCompositions(nextCompositions);
      setSchedules(nextSchedules);
    }

    void loadOptions();
  }, [api]);

  async function handleScheduleChange(schedule: string) {
    setForm((current) => ({
      ...current,
      schedule,
      flowDiameter: ""
    }));

    if (!schedule) {
      setDiameters([]);
      return;
    }

    const response = await api.getScheduleDiameters(schedule);
    setDiameters(
      Object.values(response).map((diameterOption) => ({
        value: diameterOption.nominal_diameter,
        label: `${diameterOption.nominal_diameter} mm`
      }))
    );
  }

  async function handleReynoldsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await api.calculateReynolds({
      characteristic_diameter: Number(form.characteristicDiameter),
      velocity: Number(form.velocity),
      density: Number(form.density),
      dynamic_viscosity: Number(form.dynamicViscosity)
    });

    setReynoldsResult(result);
    setForm((current) => ({
      ...current,
      reynoldsNumber: result.value.toFixed(2)
    }));
  }

  async function handleFrictionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const compositionDetails = await api.getCompositionDetails(form.composition);
    const roughness = getRoughnessValue(compositionDetails);

    const result = await api.calculateFrictionFactor(
      roughness,
      form.flowDiameter,
      form.reynoldsNumber,
      form.method
    );

    setFrictionResult(result);
  }

  async function handleHydraulicSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const shape = hydraulicForm.shape;
    const fields = SHAPE_FIELDS[shape] ?? [];
    const params: Record<string, number | string> = { shape };

    for (const field of fields) {
      params[field.id] = Number(hydraulicForm[field.id]);
    }

    setHydraulicResult(await api.calculateHydraulicDiameter(params));
  }

  function handleShapeChange(shape: string) {
    setHydraulicForm({
      shape,
      diameter: "",
      width: "",
      height: "",
      outer_diameter: "",
      inner_diameter: "",
      side_a: "",
      side_b: "",
      side_c: ""
    });
    setHydraulicResult(null);
  }

  const selectedShapeFields = SHAPE_FIELDS[hydraulicForm.shape] ?? [];

  return (
    <div className="feature-shell" id="flow-content">
      <section className="module-hero">
        <div className="module-hero__copy">
          <nav aria-label="Localização" className="module-breadcrumb">
            <a href="#home-content">Início</a>
            <span aria-hidden="true" className="sep">
              ›
            </span>
            <span>Hidráulica &amp; Escoamento</span>
            <span aria-hidden="true" className="sep">
              ›
            </span>
            <span>Escoamento</span>
          </nav>
          <h2>Escoamento com visualização de regime e leitura de resultado</h2>
          <p className="hero-copy">
            Este módulo mostra como Reynolds, fator de atrito e diâmetro hidráulico se conectam em
            uma sequência didática única.
          </p>
        </div>
        <div className="module-hero__aside">
          <ReynoldsScene />
          <MetricGrid
            items={[
              { label: "Métodos", value: `${methods.length || 0}`, hint: "Correlações disponíveis" },
              { label: "Formas", value: `${shapes.length || 0}`, hint: "Geometrias atendidas" },
              { label: "Estados", value: "3 blocos", hint: "Reynolds, atrito e diâmetro" }
            ]}
          />
          <ActionRail
            action="Começar pela seção de Reynolds"
            badge="Sequência didática"
            copy="O layout favorece o entendimento do que cada cálculo representa antes da interpretação."
            title="Ordem sugerida"
          />
        </div>
      </section>

      <div className="feature-grid feature-grid--stack">
        <section className="feature-panel">
          <h3 className="text-lg font-medium mb-3 text-gray-800">Número de Reynolds</h3>
          <form id="reynolds-form" onSubmit={handleReynoldsSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="characteristic-diameter">
                  Diâmetro Característico (mm)
                </label>
                <input className="w-full p-2 border rounded" id="characteristic-diameter" onChange={(e) => setForm((current) => ({ ...current, characteristicDiameter: e.target.value }))} type="number" value={form.characteristicDiameter} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reynolds-velocity">
                  Velocidade (m/s)
                </label>
                <input className="w-full p-2 border rounded" id="reynolds-velocity" onChange={(e) => setForm((current) => ({ ...current, velocity: e.target.value }))} type="number" value={form.velocity} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="density">
                  Densidade (kg/m³)
                </label>
                <input className="w-full p-2 border rounded" id="density" onChange={(e) => setForm((current) => ({ ...current, density: e.target.value }))} type="number" value={form.density} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="dynamic-viscosity">
                  Viscosidade Dinâmica (Pa·s)
                </label>
                <input className="w-full p-2 border rounded" id="dynamic-viscosity" onChange={(e) => setForm((current) => ({ ...current, dynamicViscosity: e.target.value }))} type="number" value={form.dynamicViscosity} />
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 active:scale-95 transition-transform duration-150" type="submit">
              Calcular Número de Reynolds
            </button>
          </form>
          {reynoldsResult ? (
            <div className="result-container">
              <h4 className="font-medium text-gray-700 mb-2">Número de Reynolds</h4>
              <ValueWithUnitsTable data={reynoldsResult} label="número de reynolds" />
            </div>
          ) : null}
        </section>

        <section className="feature-panel">
          <h3 className="text-lg font-medium mb-3 text-gray-800">Fator de Atrito</h3>
          <form id="friction-factor-form" onSubmit={handleFrictionSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="flow-composition-select">
                  Composição do Material
                </label>
                <select className="w-full p-2 border rounded" id="flow-composition-select" onChange={(e) => setForm((current) => ({ ...current, composition: e.target.value }))} value={form.composition}>
                  <option value="">Selecione uma composição</option>
                  {compositions.map((composition) => (
                    <option key={composition} value={composition}>{composition}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="flow-schedule-select">
                  Schedule do Tubo
                </label>
                <select className="w-full p-2 border rounded" id="flow-schedule-select" onChange={(e) => void handleScheduleChange(e.target.value)} value={form.schedule}>
                  <option value="">Selecione um schedule</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.name} value={schedule.name}>{schedule.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="flow-diameter-select">
                  Diâmetro (mm)
                </label>
                <select className="w-full p-2 border rounded" id="flow-diameter-select" onChange={(e) => setForm((current) => ({ ...current, flowDiameter: e.target.value }))} value={form.flowDiameter}>
                  <option value="">Selecione um diâmetro</option>
                  {diameters.map((diameterOption) => (
                    <option key={diameterOption.value} value={diameterOption.value}>{diameterOption.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="friction-factor-method">
                  Método
                </label>
                <select className="w-full p-2 border rounded" id="friction-factor-method" onChange={(e) => setForm((current) => ({ ...current, method: e.target.value }))} value={form.method}>
                  <option value="">Selecione um método</option>
                  {methods.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reynolds-number">
                  Número de Reynolds
                </label>
                <input className="w-full p-2 border rounded" id="reynolds-number" onChange={(e) => setForm((current) => ({ ...current, reynoldsNumber: e.target.value }))} type="number" value={form.reynoldsNumber} />
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 active:scale-95 transition-transform duration-150" type="submit">
              Calcular Fator de Atrito
            </button>
          </form>
          {frictionResult ? (
            <div className="result-container">
              <h4 className="font-medium text-gray-700 mb-2">Fator de Atrito</h4>
              <ValueWithUnitsTable data={frictionResult} label="fator de atrito" />
            </div>
          ) : null}
        </section>

        <section className="feature-panel feature-panel--full">
          <h3 className="text-lg font-medium mb-3 text-gray-800">Diâmetro Hidráulico</h3>
          <form id="hydraulic-diameter-form" onSubmit={handleHydraulicSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="hydraulic-shape">
                  Forma
                </label>
                <select
                  className="w-full p-2 border rounded"
                  id="hydraulic-shape"
                  onChange={(event) => handleShapeChange(event.target.value)}
                  value={hydraulicForm.shape}
                >
                  <option value="">Selecione uma forma</option>
                  {shapes.map((shape) => (
                    <option key={shape} value={shape}>
                      {shape}
                    </option>
                  ))}
                </select>
              </div>

              {selectedShapeFields.map((field) => (
                <div key={field.id} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`hydraulic-${field.id}`}>
                    {field.label}
                  </label>
                  <input
                    className="w-full p-2 border rounded"
                    id={`hydraulic-${field.id}`}
                    onChange={(event) =>
                      setHydraulicForm((current) => ({
                        ...current,
                        [field.id]: event.target.value
                      }))
                    }
                    step="0.0000000001"
                    type="number"
                    value={hydraulicForm[field.id]}
                  />
                </div>
              ))}
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 active:scale-95 transition-transform duration-150" type="submit">
              Calcular Diâmetro Hidráulico
            </button>
          </form>
          {hydraulicResult ? (
            <div className="result-container">
              <h4 className="font-medium text-gray-700 mb-2">Diâmetro Hidráulico</h4>
              <ValueWithUnitsTable data={hydraulicResult} label="diâmetro hidráulico" />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
