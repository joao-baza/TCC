import { useEffect, useRef, useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";

import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { NumberField } from "@/components/number-field";
import type { PropertyRow } from "@/components/property-table";
import { VelocityProfileChart } from "@/components/viz/velocity-profile";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ResultTableSection } from "@/components/result-table-section";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { validateNumber } from "@/lib/validation";
import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import type { Scenario } from "@/features/exploratory/types";
import { sizingExploratory } from "@/features/exploratory/templates";
import {
  DiameterHowItWorks,
  RealDiameterHowItWorks,
} from "@/features/sizing/didactics";
import { sizingExample } from "@/features/sizing/presets";
import { sizingTabs } from "@/features/sizing/sizing-tabs";

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

type QuantityResult = { value: number; units: string };

function buildResultRows(label: string, result: QuantityResult): PropertyRow[] {
  return [
    {
      label,
      value: result.value,
      units: result.units,
    },
  ];
}

type SizingPageContext = {
  schedules: Schedule[];
  scheduleError: string | null;
  flowRate: string;
  velocity: string;
  schedule: string;
  calculatedDiameterInput: string;
  calculatedResult: QuantityResult | null;
  realDiameterResult: QuantityResult | null;
  isCalculating: boolean;
  isResolvingRealDiameter: boolean;
  savedScenarios: Scenario[];
  loadExample: () => void;
  clearCalculatedForm: () => void;
  setFlowRate: (value: string) => void;
  setVelocity: (value: string) => void;
  setSchedule: (value: string) => void;
  selectSchedule: (value: string) => void;
  setCalculatedDiameterInput: (value: string) => void;
  runCalculatedDiameter: (flow: string, vel: string, selectedSchedule?: string) => Promise<QuantityResult | null>;
  runRealDiameter: (calculatedDiameter: string, selectedSchedule: string) => Promise<void>;
  applyExploratoryFields: (fields: Record<string, string>) => void;
  changeExploratoryField: (field: string, value: string) => void;
  describeScenario: () => string;
  setSavedScenarios: (value: Scenario[]) => void;
};

function useSizingPageContext() {
  return useOutletContext<SizingPageContext>();
}

export function SizingPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [flowRate, setFlowRate] = useState("");
  const [velocity, setVelocity] = useState("");
  const [schedule, setSchedule] = useState("");
  const [calculatedDiameterInput, setCalculatedDiameterInput] = useState("");

  const [calculatedResult, setCalculatedResult] = useState<QuantityResult | null>(null);
  const [realDiameterResult, setRealDiameterResult] = useState<QuantityResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isResolvingRealDiameter, setIsResolvingRealDiameter] = useState(false);
  const calculatedDiameterSessionRef = useRef(0);
  const realDiameterSessionRef = useRef(0);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);

  useEffect(() => {
    let ignore = false;

    async function loadSchedules() {
      setScheduleError(null);

      try {
        const response = await apiClient.get<ScheduleResponse[]>("/piping/schedules");

        if (ignore) {
          return;
        }

        setSchedules(
          response.map((schedule) =>
            typeof schedule === "string"
              ? {
                  name: schedule,
                  label: schedule,
                  diameters: [],
                  description: "",
                }
              : {
                  name: schedule.name ?? schedule.value ?? "",
                  label: schedule.label ?? schedule.name ?? schedule.value ?? "",
                  diameters: schedule.diameters ?? [],
                  description: schedule.description ?? "",
                },
          ),
        );
      } catch (error) {
        if (ignore) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Falha ao carregar os schedules.";
        setScheduleError(message);
        notify.error(message);
      }
    }

    void loadSchedules();

    return () => {
      ignore = true;
    };
  }, []);

  function loadExample() {
    setFlowRate(sizingExample.flowRate);
    setVelocity(sizingExample.velocity);
    notify.success("Exemplo carregado com sucesso.");
  }

  function clearCalculatedForm() {
    calculatedDiameterSessionRef.current += 1;
    realDiameterSessionRef.current += 1;
    setFlowRate("");
    setVelocity("");
    setCalculatedResult(null);
    setRealDiameterResult(null);
  }

  async function runCalculatedDiameter(
    flow: string,
    vel: string,
    selectedSchedule = schedule,
  ): Promise<QuantityResult | null> {
    const sessionId = calculatedDiameterSessionRef.current;

    for (const [rule, raw, label] of [
      ["positive", flow, "Vazão"],
      ["positive", vel, "Velocidade"],
    ] as const) {
      const message = raw.trim() === "" ? `Informe ${label.toLowerCase()}.` : validateNumber(rule, raw, label);
      if (message) {
        notify.error(message);
        return null;
      }
    }

    setRealDiameterResult(null);
    setIsCalculating(true);

    try {
      const result = await apiClient.post<QuantityResult>(
        "/sizing/calculated-diameter",
        {
          flow_rate: Number(flow),
          velocity: Number(vel),
        },
      );

      if (sessionId !== calculatedDiameterSessionRef.current) {
        return null;
      }

      setCalculatedResult(result);
      setCalculatedDiameterInput(result.value.toFixed(2));

      if (selectedSchedule) {
        await runRealDiameter(result.value.toFixed(2), selectedSchedule);
      }

      return result;
    } catch (error) {
      if (sessionId !== calculatedDiameterSessionRef.current) {
        return null;
      }

      setCalculatedResult(null);
      const message =
        error instanceof Error ? error.message : "Falha ao calcular o diâmetro.";
      notify.error(message);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }

  async function runRealDiameter(calculatedDiameter: string, selectedSchedule: string) {
    const sessionId = realDiameterSessionRef.current;

    if (!calculatedDiameter.trim() || !selectedSchedule) {
      notify.error("Informe o diâmetro calculado e selecione um schedule.");
      return;
    }

    setIsResolvingRealDiameter(true);

    try {
      const result = await apiClient.post<QuantityResult>("/sizing/real-diameter", {
        calculated_diameter: Number(calculatedDiameter),
        schedule: selectedSchedule,
      });

      if (sessionId !== realDiameterSessionRef.current) {
        return;
      }

      setRealDiameterResult(result);
    } catch (error) {
      if (sessionId !== realDiameterSessionRef.current) {
        return;
      }

      setRealDiameterResult(null);
      const message =
        error instanceof Error ? error.message : "Falha ao obter o diâmetro real.";
      notify.error(message);
    } finally {
      setIsResolvingRealDiameter(false);
    }
  }

  function selectSchedule(nextSchedule: string) {
    realDiameterSessionRef.current += 1;
    setSchedule(nextSchedule);
    setRealDiameterResult(null);
    if (calculatedDiameterInput.trim() && nextSchedule) {
      void runRealDiameter(calculatedDiameterInput, nextSchedule);
    }
  }

  function applyExploratoryFields(fields: Record<string, string>) {
    if (fields["flow-rate"] !== undefined) {
      setFlowRate(fields["flow-rate"]);
    }
    if (fields.velocity !== undefined) {
      setVelocity(fields.velocity);
    }
  }

  function changeExploratoryField(field: string, value: string) {
    if (field === "flow-rate") {
      calculatedDiameterSessionRef.current += 1;
      realDiameterSessionRef.current += 1;
      setFlowRate(value);
      void runCalculatedDiameter(value, velocity, schedule);
    } else if (field === "velocity") {
      calculatedDiameterSessionRef.current += 1;
      realDiameterSessionRef.current += 1;
      setVelocity(value);
      void runCalculatedDiameter(flowRate, value, schedule);
    }
  }

  function describeScenario() {
    return `Q=${flowRate || "—"} m3/s, v=${velocity || "—"} m/s`;
  }

  const context: SizingPageContext = {
    schedules,
    scheduleError,
    flowRate,
    velocity,
    schedule,
    calculatedDiameterInput,
    calculatedResult,
    realDiameterResult,
    isCalculating,
    isResolvingRealDiameter,
    savedScenarios,
    loadExample,
    clearCalculatedForm,
    setFlowRate,
    setVelocity,
    setSchedule,
    selectSchedule,
    setCalculatedDiameterInput,
    runCalculatedDiameter,
    runRealDiameter,
    applyExploratoryFields,
    changeExploratoryField,
    describeScenario,
    setSavedScenarios,
  };

  return (
    <ModuleTabsLayout
      title="Dimensionamento de Tubulação"
      subtitle={
        <p>
          Calcule o diâmetro hidráulico a partir da vazão e da velocidade de projeto e, em
          seguida, selecione o próximo diâmetro comercial do schedule adotado.
        </p>
      }
      action={
        <Button type="button" variant="outline" onClick={loadExample}>
          Carregar exemplo
        </Button>
      }
      tabs={sizingTabs}
    >
      <Outlet context={context} />
    </ModuleTabsLayout>
  );
}

function SizingCalculatedDiameterTab() {
  const {
    flowRate,
    velocity,
    setFlowRate,
    setVelocity,
    runCalculatedDiameter,
    isCalculating,
    clearCalculatedForm,
    calculatedResult,
  } = useSizingPageContext();

  return (
    <Card>
      <CardHeader title="Diâmetro Calculado" />
      <CardContent className="space-y-4">
        <DiameterHowItWorks />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runCalculatedDiameter(flowRate, velocity);
          }}
        >
          <NumberField
            id="flow-rate"
            label="Vazão"
            unit="m³/s"
            rule="positive"
            value={flowRate}
            onChange={setFlowRate}
            placeholder="ex: 0.01"
          />
          <NumberField
            id="design-velocity"
            label="Velocidade de projeto"
            unit="m/s"
            rule="positive"
            value={velocity}
            onChange={setVelocity}
            placeholder="ex: 1.5"
          />

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isCalculating}>
              {isCalculating ? "Calculando..." : "Calcular diâmetro"}
            </Button>
            <Button type="button" variant="link" onClick={clearCalculatedForm}>
              Limpar campos
            </Button>
          </div>
        </form>

        {calculatedResult ? (
          <ResultTableSection
            title="Resultado"
            emptyLabel="Sem resultado."
            rows={buildResultRows("Diâmetro calculado", calculatedResult)}
            children={
              <VelocityProfileChart velocity={Number(velocity)} diameterMm={calculatedResult.value} />
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function SizingRealDiameterTab() {
  const {
    schedules,
    scheduleError,
    schedule,
    calculatedDiameterInput,
    setCalculatedDiameterInput,
    realDiameterResult,
    runRealDiameter,
    isResolvingRealDiameter,
    selectSchedule,
  } = useSizingPageContext();

  return (
    <Card>
      <CardHeader title="Diâmetro Real" />
      <CardContent className="space-y-4">
        <RealDiameterHowItWorks />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runRealDiameter(calculatedDiameterInput, schedule);
          }}
        >
          <NumberField
            id="calculated-diameter"
            label="Diâmetro calculado"
            unit="mm"
            rule="positive"
            value={calculatedDiameterInput}
            onChange={setCalculatedDiameterInput}
            placeholder="ex: 126.16"
          />

          <Combobox
            label="Schedule"
            options={schedules.map((item) => ({
              value: item.name,
              label: item.label,
            }))}
            value={schedule}
            onValueChange={selectSchedule}
            placeholder="Selecione um schedule"
            disabled={schedules.length === 0}
          />

          {scheduleError ? <p className="text-sm text-destructive">{scheduleError}</p> : null}

          <Button type="submit" disabled={isResolvingRealDiameter || schedules.length === 0}>
            {isResolvingRealDiameter ? "Consultando..." : "Obter diâmetro real"}
          </Button>
        </form>

        {realDiameterResult ? (
          <ResultTableSection
            title="Resultado"
            emptyLabel="Sem resultado."
            rows={buildResultRows("Diâmetro real", realDiameterResult)}
          />
        ) : null}

        {schedule ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-muted-foreground">
            {schedules.find((item) => item.name === schedule)?.description ?? "Schedule selecionado."}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SizingExploratoryTab() {
  const {
    calculatedResult,
    velocity,
    savedScenarios,
    applyExploratoryFields,
    changeExploratoryField,
    describeScenario,
    setSavedScenarios,
  } = useSizingPageContext();

  return (
    <ExploratoryPanel
      config={sizingExploratory}
      state={{
        applyFields: applyExploratoryFields,
        changeField: changeExploratoryField,
        describeScenario,
      }}
      onScenariosChange={setSavedScenarios}
    >
      {(scenarios) =>
        calculatedResult ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Perfil ao vivo
            </p>
            <VelocityProfileChart
              velocity={Number(velocity) || 0}
              diameterMm={calculatedResult.value}
              scenarios={savedScenarios}
            />
            {scenarios.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {scenarios.map((scenario) => (
                  <li key={scenario.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: scenario.color }}
                    />
                    {scenario.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null
      }
    </ExploratoryPanel>
  );
}

export { SizingCalculatedDiameterTab, SizingExploratoryTab, SizingRealDiameterTab };
