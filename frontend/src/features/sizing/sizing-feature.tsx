"use client";

import { useEffect, useState } from "react";
import { ValueWithUnitsTable } from "@/components/property-table";
import type { EngineeringApi, ScheduleSummary, ValueWithUnits } from "@/lib/api";
import {
  DashboardHero,
  DidacticList,
  FlowBackdrop,
  SurfaceCard,
  TableFrame
} from "@/features/shell/shell-ui";

type SizingFeatureProps = {
  api: EngineeringApi;
};

export function SizingFeature({ api }: SizingFeatureProps) {
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [flowRate, setFlowRate] = useState("");
  const [velocity, setVelocity] = useState("");
  const [calculatedDiameter, setCalculatedDiameter] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [calculatedResult, setCalculatedResult] = useState<ValueWithUnits | null>(null);
  const [realDiameterResult, setRealDiameterResult] = useState<ValueWithUnits | null>(null);

  useEffect(() => {
    async function loadSchedules() {
      setSchedules(await api.getSchedules());
    }

    void loadSchedules();
  }, [api]);

  async function handleCalculatedDiameterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await api.calculateDiameter(flowRate, velocity);
    setCalculatedResult(result);
    setCalculatedDiameter(result.value.toFixed(2));
  }

  async function handleRealDiameterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRealDiameterResult(await api.getRealDiameter(calculatedDiameter, selectedSchedule));
  }

  const scheduleCount = schedules.length;

  return (
    <div className="module-page" id="sizing-content">
      <DashboardHero
        actions={<span className="flow-signal">Q = V × A · A = πD²/4</span>}
        description="Ferramenta para transformar vazão e velocidade em um diâmetro teórico, depois conectar a leitura ao diâmetro comercial real."
        eyebrow="Hidráulica & escoamento"
        metrics={[
          { label: "Schedules", value: String(scheduleCount), detail: "opções para ajustar o tubo real." },
          { label: "Entrada", value: "Q + V", detail: "vazão e velocidade como base do cálculo." },
          { label: "Saída", value: "D", detail: "primeiro teórico, depois comercial." }
        ]}
        note="O fluxo de trabalho foi organizado para que o estudante veja primeiro a fórmula e depois o encaixe com schedule."
        title="Dimensionamento de tubo com cálculo guiado e leitura comercial."
        visual={<FlowBackdrop />}
      />

      <div className="module-page-grid">
        <div className="module-stack">
          <SurfaceCard
            eyebrow="Cálculo teórico"
            title="Calcular diâmetro"
            description="A combinação entre vazão e velocidade entrega o diâmetro teórico da linha."
          >
            <form className="form-grid" id="calculated-diameter-form" onSubmit={handleCalculatedDiameterSubmit}>
              <div className="input-grid">
                <div className="field">
                  <label className="field-label" htmlFor="flow-rate">
                    Vazão (m³/s)
                  </label>
                  <input
                    className="field-control"
                    id="flow-rate"
                    onChange={(event) => setFlowRate(event.target.value)}
                    step="0.0000000001"
                    type="number"
                    value={flowRate}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="velocity">
                    Velocidade (m/s)
                  </label>
                  <input
                    className="field-control"
                    id="velocity"
                    onChange={(event) => setVelocity(event.target.value)}
                    step="0.0000000001"
                    type="number"
                    value={velocity}
                  />
                </div>
              </div>
              <button className="action-button action-button--primary" type="submit">
                Calcular Diâmetro
              </button>
            </form>

            {calculatedResult ? (
              <TableFrame description="O valor teórico ajuda a orientar a escolha do tubo comercial." title="Diâmetro Calculado">
                <ValueWithUnitsTable data={calculatedResult} label="diâmetro calculado" />
              </TableFrame>
            ) : null}
          </SurfaceCard>

          <SurfaceCard
            eyebrow="Cálculo comercial"
            title="Encontrar diâmetro real"
            description="Depois de obter o diâmetro teórico, escolha um schedule para chegar ao valor comercial."
          >
            <form className="form-grid" id="real-diameter-form" onSubmit={handleRealDiameterSubmit}>
              <div className="input-grid">
                <div className="field">
                  <label className="field-label" htmlFor="calculated-diameter">
                    Diâmetro calculado (mm)
                  </label>
                  <input
                    className="field-control"
                    id="calculated-diameter"
                    onChange={(event) => setCalculatedDiameter(event.target.value)}
                    step="0.0000000001"
                    type="number"
                    value={calculatedDiameter}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="real-diameter-schedule">
                    Schedule
                  </label>
                  <select
                    className="field-control"
                    id="real-diameter-schedule"
                    onChange={(event) => setSelectedSchedule(event.target.value)}
                    value={selectedSchedule}
                  >
                    <option value="">Selecione um schedule</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.name} value={schedule.name}>
                        {schedule.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="action-button action-button--primary" type="submit">
                Encontrar Diâmetro Real
              </button>
            </form>

            {realDiameterResult ? (
              <TableFrame description="O valor real fecha o ciclo entre teoria e padronização industrial." title="Diâmetro Real">
                <ValueWithUnitsTable data={realDiameterResult} label="diâmetro real" />
              </TableFrame>
            ) : null}
          </SurfaceCard>
        </div>

        <div className="module-stack">
          <SurfaceCard eyebrow="Leitura rápida" title="Como estudar este módulo">
            <DidacticList
              items={[
                {
                  title: "Comece pelas grandezas",
                  detail: "Vazão e velocidade são as entradas que controlam a área necessária."
                },
                {
                  title: "Observe o valor teórico",
                  detail: "Ele mostra a dimensão física do problema sem ainda considerar o catálogo comercial."
                },
                {
                  title: "Feche com o schedule",
                  detail: "O diâmetro real aproxima a solução da prática de projeto e de especificação."
                }
              ]}
              title="Roteiro de leitura"
            />
          </SurfaceCard>

          <SurfaceCard eyebrow="Indicadores" title="Resumo de uso">
            <div className="home-stat-band">
              <div className="home-stat">
                <div className="home-stat-value">Q</div>
                <div className="home-stat-label">vazão</div>
                <div className="home-stat-detail">Quantifica o volume transportado por unidade de tempo.</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-value">V</div>
                <div className="home-stat-label">velocidade</div>
                <div className="home-stat-detail">Define a rapidez desejada do escoamento na seção.</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-value">D</div>
                <div className="home-stat-label">diâmetro</div>
                <div className="home-stat-detail">Mostra o resultado em leitura teórica e comercial.</div>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
