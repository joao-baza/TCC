"use client";

import { useEffect, useState } from "react";
import { PropertyTable } from "@/components/property-table";
import type {
  DiameterSummary,
  EngineeringApi,
  PropertyRecord,
  ScheduleSummary
} from "@/lib/api";
import {
  CompactBars,
  DashboardHero,
  DidacticList,
  FlowBackdrop,
  SurfaceCard,
  TableFrame
} from "@/features/shell/shell-ui";

type PipingFeatureProps = {
  api: EngineeringApi;
};

export function PipingFeature({ api }: PipingFeatureProps) {
  const [compositions, setCompositions] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [fittings, setFittings] = useState<string[]>([]);
  const [diameters, setDiameters] = useState<Record<string, DiameterSummary>>({});
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [compositionDetails, setCompositionDetails] = useState<PropertyRecord | null>(null);
  const [diameterDetails, setDiameterDetails] = useState<PropertyRecord | null>(null);
  const [fittingDetails, setFittingDetails] = useState<PropertyRecord | null>(null);
  const [form, setForm] = useState({
    composition: "",
    schedule: "",
    diameter: ""
  });

  useEffect(() => {
    async function loadCatalogs() {
      const [nextCompositions, nextSchedules, nextFittings] = await Promise.all([
        api.getCompositions(),
        api.getSchedules(),
        api.getFittings()
      ]);

      setCompositions(nextCompositions);
      setSchedules(nextSchedules);
      setFittings(nextFittings);
    }

    void loadCatalogs();
  }, [api]);

  async function handleCompositionChange(value: string) {
    setForm((current) => ({ ...current, composition: value }));

    if (!value) {
      setCompositionDetails(null);
      return;
    }

    setCompositionDetails(await api.getCompositionDetails(value));
  }

  async function handleScheduleChange(value: string) {
    setSelectedSchedule(value);
    setForm((current) => ({ ...current, schedule: value, diameter: "" }));

    if (!value) {
      setDiameters({});
      setDiameterDetails(null);
      return;
    }

    setDiameters(await api.getScheduleDiameters(value));
  }

  async function handleDiameterChange(diameter: string) {
    setForm((current) => ({ ...current, diameter }));

    if (!selectedSchedule || !diameter) {
      setDiameterDetails(null);
      return;
    }

    setDiameterDetails(await api.getScheduleDiameterDetails(selectedSchedule, diameter));
  }

  async function handleFittingChange(value: string) {
    if (!value) {
      setFittingDetails(null);
      return;
    }

    setFittingDetails(await api.getFittingDetails(value));
  }

  const compositionCount = compositions.length;
  const scheduleCount = schedules.length;
  const fittingCount = fittings.length;
  const diameterCount = Object.keys(diameters).length;

  return (
    <div className="module-page" id="piping-content">
      <DashboardHero
        actions={
          <>
            <a className="action-link" href="#piping-composition">
              Ir para a seleção
            </a>
          </>
        }
        description="Catálogo de materiais e conexões para apoiar decisões de projeto em aula, monitoria e estudo individual."
        eyebrow="Hidráulica & escoamento"
        metrics={[
          { label: "Composições", value: String(compositionCount), detail: "materiais disponíveis para consulta." },
          { label: "Schedules", value: String(scheduleCount), detail: "faixas de espessura e leitura do tubo." },
          { label: "Conexões", value: String(fittingCount), detail: "elementos de perda localizada e apoio didático." }
        ]}
        note="A leitura da tela segue o fluxo físico: material, schedule, diâmetro e conexões, sempre no mesmo contexto."
        title="Cálculos de tubulação com leitura de catálogo mais clara."
        visual={<FlowBackdrop />}
      />

      <div className="module-page-grid">
        <div className="module-stack">
          <SurfaceCard
            className="module-page"
            eyebrow="Catálogo"
            title="Seleção de Composição"
            description="Escolha o material e observe como a rugosidade aparece no contexto do cálculo."
          >
            <div className="form-grid" id="piping-composition">
              <div className="field">
                <label className="field-label" htmlFor="composition-select">
                  Selecionar composição
                </label>
                <select
                  className="field-control"
                  id="composition-select"
                  onChange={(event) => void handleCompositionChange(event.target.value)}
                  value={form.composition}
                >
                  <option value="">Selecione uma composição</option>
                  {compositions.map((composition) => (
                    <option key={composition} value={composition}>
                      {composition}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {compositionDetails ? (
              <TableFrame
                description="A composição selecionada é exibida com as propriedades relevantes para o cálculo."
                title="Detalhes da Composição"
              >
                <PropertyTable data={compositionDetails} />
              </TableFrame>
            ) : null}
          </SurfaceCard>

          <SurfaceCard
            eyebrow="Schedule"
            title="Schedule & Diâmetro"
            description="O schedule atualiza a leitura do diâmetro nominal e ajuda a comparar alternativas comerciais."
          >
            <div className="form-grid">
              <div className="input-grid">
                <div className="field">
                  <label className="field-label" htmlFor="schedule-select">
                    Selecionar schedule
                  </label>
                  <select
                    className="field-control"
                    id="schedule-select"
                    onChange={(event) => void handleScheduleChange(event.target.value)}
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

                <div className="field">
                  <label className="field-label" htmlFor="diameter-select">
                    Selecionar diâmetro
                  </label>
                  <select
                    className="field-control"
                    disabled={diameterCount === 0}
                    id="diameter-select"
                    onChange={(event) => void handleDiameterChange(event.target.value)}
                    value={form.diameter}
                  >
                    <option value="">Selecione um diâmetro</option>
                    {Object.values(diameters).map((diameter) => (
                      <option key={diameter.nominal_diameter} value={diameter.nominal_diameter}>
                        {diameter.nominal_diameter} {diameter.units}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {diameterDetails ? (
              <TableFrame
                description="Compare o diâmetro nominal com a leitura de catálogo da seção selecionada."
                title="Detalhes do Diâmetro"
              >
                <PropertyTable data={diameterDetails} />
              </TableFrame>
            ) : null}
          </SurfaceCard>

          <SurfaceCard
            eyebrow="Conexões"
            title="Conexões e acessórios"
            description="Use a lista para explicar perdas localizadas e a função das conexões no escoamento."
          >
            <div className="field">
              <label className="field-label" htmlFor="fitting-select">
                Selecionar conexão
              </label>
              <select
                className="field-control"
                id="fitting-select"
                onChange={(event) => void handleFittingChange(event.target.value)}
              >
                <option value="">Selecione uma conexão</option>
                {fittings.map((fitting) => (
                  <option key={fitting} value={fitting}>
                    {fitting}
                  </option>
                ))}
              </select>
            </div>

            {fittingDetails ? (
              <TableFrame
                description="Os dados da conexão ajudam a conectar o catálogo ao problema físico."
                title="Detalhes da Conexão"
              >
                <PropertyTable data={fittingDetails} />
              </TableFrame>
            ) : null}
          </SurfaceCard>
        </div>

        <div className="module-stack">
          <SurfaceCard eyebrow="Leitura rápida" title="Como usar este módulo">
            <DidacticList
              items={[
                {
                  title: "Escolha o material",
                  detail: "A rugosidade influencia a leitura do escoamento e o fator de atrito."
                },
                {
                  title: "Ajuste o schedule",
                  detail: "Compare o diâmetro nominal com a espessura comercial da tubulação."
                },
                {
                  title: "Considere as conexões",
                  detail: "Cada acessório acrescenta contexto físico e ajuda a discutir perdas."
                }
              ]}
              title="Roteiro de aula"
            />
          </SurfaceCard>

          <SurfaceCard eyebrow="Indicadores" title="Estado dos catálogos">
            <CompactBars
              bars={[
                { label: "Composições", value: compositionCount, detail: "itens", tone: "accent" },
                { label: "Schedules", value: scheduleCount, detail: "linhas", tone: "default" },
                { label: "Conexões", value: fittingCount, detail: "tipos", tone: "success" }
              ]}
              description="A barra compacta mostra o volume disponível para consulta na tela atual."
              title="Cobertura do catálogo"
            />
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
