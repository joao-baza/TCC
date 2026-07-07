import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { LevenspielChart } from "@/components/viz/levenspiel-chart";
import { HeatExchangerThermalCharts } from "@/components/viz/heat-exchanger-thermal-charts";
import { exerciseCatalog, type ExerciseCatalogEntry } from "@/features/exercises/catalog";
import { exercisesTabs } from "@/features/exercises/exercises-tabs";
import { apiClient } from "@/lib/api";
import {
  getMassBalanceMetrics,
  getMassBalancePlotImage,
  getMassBalanceResults,
  getMassBalanceStreamCompositions,
  getMassBalanceStreamFlow,
  getMassBalanceYields,
  type MassBalancePlotResponse,
  type MassBalanceResultsResponse,
  type MassBalanceYieldResponse,
} from "@/lib/mass-balance";
import { notify } from "@/lib/notify";
import { selectOptionValue, type SelectOption } from "@/lib/select-option";

type HeatExchangerStep = 0 | 1 | 2;
type ReactorFeedStep = 0 | 1 | 2 | 3 | 4;
type RankineStep = 0 | 1 | 2 | 3 | 4;
type BalanceSimpleStep = 0 | 1;
type BalanceRecycleStep = 0 | 1 | 2;
type BalancePurgeStep = 0 | 1 | 2;
type SeriesReactorsStep = 0 | 1 | 2 | 3 | 4 | 5;

type QuantityResponse = {
  value: number;
  units?: string;
};

type Schedule = {
  name: string;
  diameters: number[];
  description?: string;
};

type ScheduleResponse = {
  value?: string;
  name?: string;
  diameters?: number[];
  description?: string;
} | string;

type BalanceResultsResponse = MassBalanceResultsResponse;

type YieldResponse = MassBalanceYieldResponse;

type ReactorResponse = {
  volume?: { value: number; units?: string };
  residence_time?: { value: number; units?: string };
  conversion?: number;
  conversao?: number;
  tempo_de_residencia?: { value: number; units?: string };
  limiting_reagent?: string;
  reagente_limitante?: string;
};

type ReactorPlotResponse = {
  image_base64: string;
};

type CriticalPropertiesResponse = {
  critical_temperature: number;
  critical_pressure: number;
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function formatNumber(value: number, digits = 2) {
  return value.toFixed(digits);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha ao executar o exercício.";
}

function getReactorQuantity(
  response: ReactorResponse,
  ...keys: Array<"volume" | "residence_time" | "tempo_de_residencia">
) {
  for (const key of keys) {
    const value = response[key];
    if (value && typeof value.value === "number") {
      return value;
    }
  }

  return undefined;
}

function getPhaseLabel(value: number | null) {
  if (value === null || Number.isNaN(value) || value < -10) {
    return "fase única";
  }
  if (value < 0 || value > 1) {
    return "fase única";
  }
  if (value <= 0.01) {
    return "líquido saturado";
  }
  if (value >= 0.99) {
    return "vapor saturado";
  }
  return `bifásico (X = ${formatNumber(value, 3)})`;
}

function getFlowRegime(value: number) {
  if (value < 2300) {
    return "Laminar";
  }
  if (value < 4000) {
    return "Transição";
  }
  return "Turbulento";
}

function paToKgfCm2(value: number) {
  return value / 98066.5;
}

function buildBalancePurgePayload(recycleFraction: number) {
  return {
    components: ["A", "B", "I"],
    streams: [
      {
        name: "Alimentacao_Fresca",
        direction: 1 as const,
        flow_rate: 100,
        compositions: { A: 0.8, B: 0, I: 0.2 },
      },
      {
        name: "Saida_Do_Reator",
        direction: -1 as const,
        flow_rate: null,
        compositions: { A: null, B: null, I: null },
      },
      {
        name: "Reciclo",
        direction: 1 as const,
        flow_rate: null,
        compositions: { A: null, B: null, I: null },
      },
      {
        name: "Purga_Produto",
        direction: -1 as const,
        flow_rate: null,
        compositions: { A: null, B: null, I: null },
      },
    ],
    reactions: [
      {
        stoichiometry: { A: -1, B: 1, I: 0 },
        key_component: "A",
        conversion: 0.7,
      },
    ],
    splits: [
      {
        parent_stream: "Saida_Do_Reator",
        recycle_stream: "Reciclo",
        purge_stream: "Purga_Produto",
        fraction: recycleFraction,
      },
    ],
  };
}

function buildSeriesReactorPayload(conversion: number) {
  return {
    input_type: "conversion_and_kinetics",
    conversion,
    recycling_ratio: 0,
    components: [
      {
        state: "liquid",
        component_name: "A",
        flow_rate_inlet: 0.001,
        molar_concentration_inlet: 2,
      },
      {
        state: "liquid",
        component_name: "B",
        flow_rate_inlet: 0,
        molar_concentration_inlet: 0,
      },
    ],
    stoichiometric_coefficients: [-1, 1],
    reaction_rate_params: {
      k: 0.5,
      reaction_orders: [1, 0],
    },
    operation_conditions: {
      initial_temperature: 298.15,
      initial_pressure: 101325,
      final_temperature: 298.15,
      final_pressure: 101325,
    },
  };
}

function buildSeriesReactorPlotPayload(maxConversion: number) {
  return {
    components: [
      {
        state: "liquid",
        component_name: "A",
        flow_rate_inlet: 0.001,
        molar_concentration_inlet: 2,
      },
      {
        state: "liquid",
        component_name: "B",
        flow_rate_inlet: 0,
        molar_concentration_inlet: 0,
      },
    ],
    stoichiometric_coefficients: [-1, 1],
    reaction_rate_params: {
      k: 0.5,
      reaction_orders: [1, 0],
    },
    operation_conditions: {
      initial_temperature: 298.15,
      initial_pressure: 101325,
      final_temperature: 298.15,
      final_pressure: 101325,
    },
    recycling_ratio: 0,
    max_conversion: maxConversion,
  };
}

function buildSeriesReactorPlotPoints(maxConversion: number) {
  const safeMaxConversion = Math.min(Math.max(maxConversion, 0.1), 0.97);
  const flowRate = 0.001;
  const concentration = 2;
  const rateConstant = 0.5;
  const points: Array<{ conversion: number; cstrVolume: number; pfrVolume: number }> = [];

  function rateAt(conversion: number) {
    const remaining = Math.max(1 - conversion, 0.001);
    return Math.max(rateConstant * concentration * remaining, 0.0001);
  }

  function cstrVolumeAt(conversion: number) {
    return Number(((flowRate * conversion) / rateAt(conversion)).toFixed(5));
  }

  function pfrVolumeAt(conversion: number) {
    let integral = 0;
    const segments = 30;

    for (let index = 0; index < segments; index += 1) {
      const x0 = (conversion * index) / segments;
      const x1 = (conversion * (index + 1)) / segments;
      integral += ((1 / rateAt(x0) + 1 / rateAt(x1)) * (x1 - x0)) / 2;
    }

    return Number((flowRate * integral).toFixed(5));
  }

  for (let index = 1; index <= 10; index += 1) {
    const conversion = Number(((safeMaxConversion * index) / 10).toFixed(2));
    points.push({
      conversion,
      cstrVolume: cstrVolumeAt(conversion),
      pfrVolume: pfrVolumeAt(conversion),
    });
  }

  return {
    maxConversion: safeMaxConversion,
    points,
    cstrOperatingPoint: {
      conversion: 0.5,
      volume: cstrVolumeAt(0.5),
    },
    pfrOperatingPoint: {
      conversion: 0.5,
      volume: pfrVolumeAt(0.5),
    },
  };
}

const initialHeatExchangerForm = {
  fluid: "n-Propane",
  t1: "298.15",
  p1: "101325",
  t2: "353.15",
  p2: "101325",
  mdot: "1.5",
};

const initialReactorFeedForm = {
  fluid: "Water",
  temperature: "353.15",
  pressure: "200000",
  flowrate: "0.002",
  schedule: "",
  nps: "",
  velocity: "2.0",
  material: "",
  length: "50",
  manometricPressure: "0",
  atmosphericPressure: "1.033",
  gaugeElevation: "-0.5",
  suctionVelocity: "2.0",
  suctionLoss: "0.3",
  pressure1: "101325",
  pressure2: "200000",
  elevation1: "0",
  elevation2: "3",
  velocity1: "2.0",
  velocity2: "2.0",
};

const initialRankineForm = {
  temperature1: "773.15",
  pressure1: "3000000",
  pressure2: "10000",
};

const initialBalanceSimpleForm = {
  conversion: "0.8",
};

const initialBalanceRecycleForm = {
  conversion: "0.6",
  recycleFraction: "0.5",
};

const initialBalancePurgeForm = {
  recycleFraction: "0.6",
};

const initialSeriesReactorsForm = {
  intermediateConversion: "0.5",
  finalConversion: "0.9",
};

export function ExercisesPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [selectedExercise, setSelectedExercise] = useState<ExerciseCatalogEntry | null>(null);
  const [fluids, setFluids] = useState<string[]>(["n-Propane"]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [compositions, setCompositions] = useState<string[]>([]);
  const [reactorFeedDiameters, setReactorFeedDiameters] = useState<string[]>([]);
  const [step, setStep] = useState<HeatExchangerStep>(0);
  const [reactorFeedStep, setReactorFeedStep] = useState<ReactorFeedStep>(0);
  const [rankineStep, setRankineStep] = useState<RankineStep>(0);
  const [balanceSimpleStep, setBalanceSimpleStep] = useState<BalanceSimpleStep>(0);
  const [balanceRecycleStep, setBalanceRecycleStep] = useState<BalanceRecycleStep>(0);
  const [balancePurgeStep, setBalancePurgeStep] = useState<BalancePurgeStep>(0);
  const [seriesReactorsStep, setSeriesReactorsStep] = useState<SeriesReactorsStep>(0);
  const [completedExerciseId, setCompletedExerciseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exerciseSessionRef = useRef(0);

  useEffect(() => {
    if (pathname === "/exercises") {
      navigate("catalog", { replace: true });
    }
  }, [navigate, pathname]);

  const [heatExchangerForm, setHeatExchangerForm] = useState(initialHeatExchangerForm);

  const [heatExchangerResults, setHeatExchangerResults] = useState<{
    h1?: number;
    h2?: number;
    q1?: number | null;
    q2?: number | null;
    cp1?: number | null;
    qdot?: number;
  }>({});
  const [reactorFeedForm, setReactorFeedForm] = useState(initialReactorFeedForm);
  const [reactorFeedResults, setReactorFeedResults] = useState<{
    rho?: number;
    mu?: number;
    pvap?: number;
    cp?: number | null;
    k_cond?: number | null;
    Re?: number;
    regime?: string;
    Dmm?: number;
    Di_calc?: number | null;
    flowrate?: number;
    velocity?: number;
    schedule?: string;
    nps?: string;
    headloss_m?: number;
    f?: number;
    npsh_avail?: number;
    head_m?: number;
  }>({});
  const [rankineCritical, setRankineCritical] = useState<CriticalPropertiesResponse | null>(null);
  const [rankineForm, setRankineForm] = useState(initialRankineForm);
  const [rankineResults, setRankineResults] = useState<{
    temperature1?: number;
    pressure1?: number;
    pressure2?: number;
    enthalpy1?: number;
    entropy1?: number;
    enthalpy2?: number;
    quality2?: number | null;
    enthalpy3?: number;
    entropy3?: number;
    saturationTemperature?: number | null;
    enthalpy4?: number;
    efficiency?: number;
    carnotEfficiency?: number | null;
  }>({});
  const [balanceSimpleForm, setBalanceSimpleForm] = useState(initialBalanceSimpleForm);
  const [balanceSimpleResults, setBalanceSimpleResults] = useState<{
    conversion?: number;
    payload?: {
      components: string[];
      streams: Array<{
        name: string;
        direction: 1 | -1;
        flow_rate: number | null;
        compositions: Record<string, number | null>;
      }>;
      reactions: Array<{
        stoichiometry: Record<string, number>;
        key_component: string;
        conversion: number;
      }>;
      splits: null;
    };
    results?: BalanceResultsResponse["results"] | null;
    productFlow?: number;
    productA?: number;
    productB?: number;
    yieldBA?: number;
    plotImage?: string | null;
  }>({});
  const [balanceRecycleForm, setBalanceRecycleForm] = useState(initialBalanceRecycleForm);
  const [balanceRecycleResults, setBalanceRecycleResults] = useState<{
    conversion?: number;
    recycleFraction?: number;
    payload?: {
      components: string[];
      streams: Array<{
        name: string;
        direction: 1 | -1;
        flow_rate: number | null;
        compositions: Record<string, number | null>;
      }>;
      reactions: Array<{
        stoichiometry: Record<string, number>;
        key_component: string;
        conversion: number;
      }>;
      splits: Array<{
        parent_stream: string;
        recycle_stream: string;
        purge_stream: string;
        fraction: number;
      }>;
    };
    results?: BalanceResultsResponse["results"] | null;
    productA?: number;
    productB?: number;
    recycleRatio?: number;
    noRecycleA?: number;
    yieldBA?: number;
    plotImage?: string | null;
  }>({});
  const [balancePurgeForm, setBalancePurgeForm] = useState(initialBalancePurgeForm);
  const [balancePurgeResults, setBalancePurgeResults] = useState<{
    noPurgeInert?: number;
    recycleFraction?: number;
    payload?: ReturnType<typeof buildBalancePurgePayload>;
    results?: BalanceResultsResponse["results"] | null;
    recycleInert?: number;
    purgeInert?: number;
    recycleRatio?: number;
    yieldBA?: number;
    plotImage?: string | null;
  }>({});
  const [seriesReactorsForm, setSeriesReactorsForm] = useState(initialSeriesReactorsForm);
  const [seriesReactorsResults, setSeriesReactorsResults] = useState<{
    chartReady?: boolean;
    intermediateConversion?: number;
    finalConversion?: number;
    pfr1Volume?: number;
    pfr1Residence?: number | null;
    cstr2Volume?: number;
    cstr2Residence?: number | null;
    pfrCstrTotal?: number;
    cstr1Volume?: number;
    cstr1Residence?: number | null;
    pfr2Volume?: number;
    pfr2Residence?: number | null;
    cstrPfrTotal?: number;
    bestConfiguration?: string;
    savedVolume?: number;
    levenspielImage?: string | null;
  }>({});

  function reportExerciseError(caughtError: unknown) {
    const message = getErrorMessage(caughtError);
    setError(message);
    notify.error(`Erro ao executar o exercício: ${message}`);
  }

  function invalidateExerciseSession() {
    exerciseSessionRef.current += 1;
    setLoading(false);
  }

  async function loadBalancePlot(payload:
    | NonNullable<(typeof balanceSimpleResults)["payload"]>
    | NonNullable<(typeof balanceRecycleResults)["payload"]>
    | NonNullable<(typeof balancePurgeResults)["payload"]>) {
    try {
      const response = await apiClient.post<MassBalancePlotResponse>("/mass-balance/plot", payload);
      const imageBase64 = getMassBalancePlotImage(response);
      return imageBase64 ? `data:image/png;base64,${imageBase64}` : null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let active = true;

    void Promise.allSettled([
      apiClient.get<Array<string | SelectOption>>("/components/list"),
      apiClient.get<ScheduleResponse[]>("/piping/schedules"),
      apiClient.get<Array<string | SelectOption>>("/piping/compositions"),
    ]).then(([fluidsResult, schedulesResult, compositionsResult]) => {
      if (!active) {
        return;
      }

      if (fluidsResult.status === "fulfilled" && fluidsResult.value.length > 0) {
        setFluids(fluidsResult.value.map((item) => selectOptionValue(item)));
        setHeatExchangerForm((current) => ({
          ...current,
          fluid:
            fluidsResult.value
              .map((item) => selectOptionValue(item))
              .includes(current.fluid)
              ? current.fluid
              : selectOptionValue(fluidsResult.value[0] ?? "n-Propane"),
        }));
      }

      if (schedulesResult.status === "fulfilled") {
        setSchedules(
          schedulesResult.value.map((schedule) =>
            typeof schedule === "string"
              ? {
                  name: schedule,
                  diameters: [],
                  description: "",
                }
              : {
                  name: schedule.name ?? schedule.value ?? "",
                  diameters: schedule.diameters ?? [],
                  description: schedule.description ?? "",
                },
          ),
        );
      }

      if (compositionsResult.status === "fulfilled") {
        setCompositions(compositionsResult.value.map((item) => selectOptionValue(item)));
      }
    });

    void apiClient
      .post<CriticalPropertiesResponse>("/components/critical-properties", { fluid: "Water" })
      .then((response) => {
        if (active) {
          setRankineCritical(response);
        }
      })
      .catch((caughtError) => {
        if (active) {
          setRankineCritical(null);
          notify.error(`Erro ao carregar propriedades críticas: ${getErrorMessage(caughtError)}`);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedExercise?.id !== "reactor-feed" || !reactorFeedForm.schedule) {
      setReactorFeedDiameters([]);
      return;
    }

    let active = true;
    const encoded = encodeURIComponent(reactorFeedForm.schedule);
    void apiClient
      .get<Record<string, unknown>>(`/piping/schedule/${encoded}/diameters`)
      .then((response) => {
        if (!active) {
          return;
        }

        setReactorFeedDiameters(
          Object.keys(response).sort((left, right) => Number(left) - Number(right)),
        );
      })
      .catch(() => {
        if (active) {
          setReactorFeedDiameters([]);
        }
      });

    return () => {
      active = false;
    };
  }, [reactorFeedForm.schedule, selectedExercise?.id]);

  const currentStepResult = useMemo(() => {
    if (step === 0 && heatExchangerResults.h1 !== undefined) {
      const cpSuffix =
        heatExchangerResults.cp1 == null
          ? ""
          : ` · cp = ${formatNumber(heatExchangerResults.cp1, 1)} J/kg·K`;
      return `h₁ = ${formatNumber(heatExchangerResults.h1, 1)} J/kg · Fase: ${getPhaseLabel(
        heatExchangerResults.q1 ?? null,
      )}${cpSuffix}`;
    }

    if (step === 1 && heatExchangerResults.h2 !== undefined) {
      const phase1 = getPhaseLabel(heatExchangerResults.q1 ?? null);
      const phase2 = getPhaseLabel(heatExchangerResults.q2 ?? null);
      const warning = phase1 === phase2 ? "" : ` ⚠️ Mudança de fase: ${phase1} → ${phase2}`;
      return `h₂ = ${formatNumber(heatExchangerResults.h2, 1)} J/kg · Fase: ${phase2}${warning}`;
    }

    if (step === 2 && heatExchangerResults.qdot !== undefined) {
      return `Q̇ = ${formatNumber(heatExchangerResults.qdot, 2)} kW`;
    }

    return null;
  }, [heatExchangerResults, step]);

  const heatExchangerThermalCharts = useMemo(
    () => ({
      fluid: heatExchangerForm.fluid,
      inletTemperature: Number(heatExchangerForm.t1),
      outletTemperature: Number(heatExchangerForm.t2),
      inletPressure: Number(heatExchangerForm.p1),
      outletPressure: Number(heatExchangerForm.p2),
      inletEnthalpy: heatExchangerResults.h1 ?? null,
      outletEnthalpy: heatExchangerResults.h2 ?? null,
      massFlowRate: Number(heatExchangerForm.mdot),
      heatDuty: heatExchangerResults.qdot ?? null,
      inletQuality: heatExchangerResults.q1 ?? null,
      outletQuality: heatExchangerResults.q2 ?? null,
    }),
    [
      heatExchangerForm.fluid,
      heatExchangerForm.mdot,
      heatExchangerForm.p1,
      heatExchangerForm.p2,
      heatExchangerForm.t1,
      heatExchangerForm.t2,
      heatExchangerResults.h1,
      heatExchangerResults.h2,
      heatExchangerResults.q1,
      heatExchangerResults.q2,
      heatExchangerResults.qdot,
    ],
  );

  const currentReactorFeedResult = useMemo(() => {
    if (reactorFeedStep === 0 && reactorFeedResults.rho !== undefined && reactorFeedResults.mu !== undefined) {
      const cpText =
        reactorFeedResults.cp == null ? "" : ` · cp = ${formatNumber(reactorFeedResults.cp, 1)} J/kg·K`;
      return `ρ = ${formatNumber(reactorFeedResults.rho, 2)} kg/m³ · μ = ${formatNumber(
        reactorFeedResults.mu,
        6,
      )} Pa·s${cpText}`;
    }

    if (
      reactorFeedStep === 1 &&
      reactorFeedResults.Re !== undefined &&
      reactorFeedResults.regime &&
      reactorFeedResults.Dmm !== undefined
    ) {
      const calcText =
        reactorFeedResults.Di_calc == null
          ? ""
          : ` · Di_calc = ${formatNumber(reactorFeedResults.Di_calc, 1)} mm`;
      return `Re = ${formatNumber(reactorFeedResults.Re, 0)} (${reactorFeedResults.regime}) · Di_real = ${formatNumber(
        reactorFeedResults.Dmm,
        2,
      )} mm${calcText}`;
    }

    if (reactorFeedStep === 2 && reactorFeedResults.headloss_m !== undefined && reactorFeedResults.f !== undefined) {
      return `ΔP = ${formatNumber(reactorFeedResults.headloss_m, 3)} m.c.l. · f = ${formatNumber(
        reactorFeedResults.f,
        5,
      )}`;
    }

    if (reactorFeedStep === 3 && reactorFeedResults.npsh_avail !== undefined) {
      return `NPSH_disp = ${formatNumber(reactorFeedResults.npsh_avail, 3)} m`;
    }

    if (reactorFeedStep === 4 && reactorFeedResults.head_m !== undefined) {
      return `H_man = ${formatNumber(reactorFeedResults.head_m, 3)} m`;
    }

    return null;
  }, [reactorFeedResults, reactorFeedStep]);

  const currentBalanceSimpleResult = useMemo(() => {
    if (
      balanceSimpleStep === 0 &&
      balanceSimpleResults.productFlow !== undefined &&
      balanceSimpleResults.productA !== undefined &&
      balanceSimpleResults.productB !== undefined
    ) {
      return `Produto: ${formatNumber(balanceSimpleResults.productFlow, 2)} kg/h · zA = ${formatNumber(
        balanceSimpleResults.productA,
        4,
      )} · zB = ${formatNumber(balanceSimpleResults.productB, 4)}`;
    }

    if (balanceSimpleStep === 1 && balanceSimpleResults.yieldBA !== undefined) {
      return `Rendimento B←A = ${formatNumber(balanceSimpleResults.yieldBA, 1)} %`;
    }

    return null;
  }, [balanceSimpleResults, balanceSimpleStep]);

  const currentBalanceRecycleResult = useMemo(() => {
    if (
      balanceRecycleStep === 0 &&
      balanceRecycleResults.productA !== undefined &&
      balanceRecycleResults.productB !== undefined
    ) {
      const recycleText =
        balanceRecycleResults.recycleRatio === undefined
          ? ""
          : ` · R = ${formatNumber(balanceRecycleResults.recycleRatio, 3)}`;
      return `Produto: zA = ${formatNumber(balanceRecycleResults.productA, 4)} · zB = ${formatNumber(
        balanceRecycleResults.productB,
        4,
      )}${recycleText}`;
    }

    if (
      balanceRecycleStep === 1 &&
      balanceRecycleResults.noRecycleA !== undefined &&
      balanceRecycleResults.productA !== undefined
    ) {
      return `Sem reciclo: zA = ${formatNumber(balanceRecycleResults.noRecycleA, 4)} · Com reciclo: zA = ${formatNumber(
        balanceRecycleResults.productA,
        4,
      )} · Redução de A: ${formatNumber(
        (balanceRecycleResults.noRecycleA - balanceRecycleResults.productA) * 100,
        2,
      )}%`;
    }

    if (balanceRecycleStep === 2 && balanceRecycleResults.yieldBA !== undefined) {
      return `Rendimento B←A (com reciclo) = ${formatNumber(balanceRecycleResults.yieldBA, 1)} %`;
    }

    return null;
  }, [balanceRecycleResults, balanceRecycleStep]);

  const currentBalancePurgeResult = useMemo(() => {
    if (balancePurgeStep === 0 && balancePurgeResults.noPurgeInert !== undefined) {
      return `Sem purga: I no reciclo = ${formatNumber(balancePurgeResults.noPurgeInert, 4)}`;
    }

    if (
      balancePurgeStep === 1 &&
      balancePurgeResults.recycleInert !== undefined &&
      balancePurgeResults.purgeInert !== undefined
    ) {
      const recycleText =
        balancePurgeResults.recycleRatio === undefined
          ? ""
          : ` · R = ${formatNumber(balancePurgeResults.recycleRatio, 3)}`;
      return `I no reciclo = ${formatNumber(balancePurgeResults.recycleInert, 4)} · I na purga = ${formatNumber(
        balancePurgeResults.purgeInert,
        4,
      )}${recycleText}`;
    }

    if (balancePurgeStep === 2 && balancePurgeResults.yieldBA !== undefined) {
      return `Rendimento B←A = ${formatNumber(balancePurgeResults.yieldBA, 1)} %`;
    }

    return null;
  }, [balancePurgeResults, balancePurgeStep]);

  const seriesReactorsChart = useMemo(
    () => buildSeriesReactorPlotPoints(Number(seriesReactorsForm.finalConversion || 0.9)),
    [seriesReactorsForm.finalConversion],
  );

  const currentSeriesReactorsResult = useMemo(() => {
    if (seriesReactorsStep === 0 && seriesReactorsResults.chartReady) {
      return "Gráfico gerado";
    }

    if (seriesReactorsStep === 1 && seriesReactorsResults.pfr1Volume !== undefined) {
      const residenceText =
        seriesReactorsResults.pfr1Residence == null
          ? ""
          : ` · τ = ${formatNumber(seriesReactorsResults.pfr1Residence, 1)} s`;
      return `V_PFR₁ = ${formatNumber(seriesReactorsResults.pfr1Volume, 5)} m³${residenceText}`;
    }

    if (
      seriesReactorsStep === 2 &&
      seriesReactorsResults.cstr2Volume !== undefined &&
      seriesReactorsResults.pfrCstrTotal !== undefined
    ) {
      const residenceText =
        seriesReactorsResults.cstr2Residence == null
          ? ""
          : ` · τ_CSTR₂ = ${formatNumber(seriesReactorsResults.cstr2Residence, 1)} s`;
      return `V_CSTR₂ = ${formatNumber(seriesReactorsResults.cstr2Volume, 5)} m³ · V_total = ${formatNumber(
        seriesReactorsResults.pfrCstrTotal,
        5,
      )} m³${residenceText}`;
    }

    if (seriesReactorsStep === 3 && seriesReactorsResults.cstr1Volume !== undefined) {
      const residenceText =
        seriesReactorsResults.cstr1Residence == null
          ? ""
          : ` · τ = ${formatNumber(seriesReactorsResults.cstr1Residence, 1)} s`;
      return `V_CSTR₁ = ${formatNumber(seriesReactorsResults.cstr1Volume, 5)} m³${residenceText}`;
    }

    if (
      seriesReactorsStep === 4 &&
      seriesReactorsResults.pfr2Volume !== undefined &&
      seriesReactorsResults.cstrPfrTotal !== undefined
    ) {
      const residenceText =
        seriesReactorsResults.pfr2Residence == null
          ? ""
          : ` · τ_PFR₂ = ${formatNumber(seriesReactorsResults.pfr2Residence, 1)} s`;
      return `V_PFR₂ = ${formatNumber(seriesReactorsResults.pfr2Volume, 5)} m³ · V_total = ${formatNumber(
        seriesReactorsResults.cstrPfrTotal,
        5,
      )} m³${residenceText}`;
    }

    if (
      seriesReactorsStep === 5 &&
      seriesReactorsResults.bestConfiguration &&
      seriesReactorsResults.savedVolume !== undefined
    ) {
      return `Melhor: ${seriesReactorsResults.bestConfiguration} (economia de ${formatNumber(
        seriesReactorsResults.savedVolume,
        5,
      )} m³)`;
    }

    return null;
  }, [seriesReactorsResults, seriesReactorsStep]);

  const currentRankineResult = useMemo(() => {
    if (
      rankineStep === 0 &&
      rankineResults.enthalpy1 !== undefined &&
      rankineResults.entropy1 !== undefined
    ) {
      return `h₁ = ${formatNumber(rankineResults.enthalpy1, 1)} J/kg · s₁ = ${formatNumber(
        rankineResults.entropy1,
        2,
      )} J/kg/K`;
    }

    if (rankineStep === 1 && rankineResults.enthalpy2 !== undefined) {
      let qualityText = "";
      if (
        rankineResults.quality2 != null &&
        rankineResults.quality2 >= 0 &&
        rankineResults.quality2 <= 1
      ) {
        qualityText = ` · X₂ = ${formatNumber(rankineResults.quality2, 3)}`;
      }
      return `h₂ = ${formatNumber(rankineResults.enthalpy2, 1)} J/kg${qualityText}`;
    }

    if (
      rankineStep === 2 &&
      rankineResults.enthalpy3 !== undefined &&
      rankineResults.entropy3 !== undefined
    ) {
      const temperatureText =
        rankineResults.saturationTemperature == null
          ? ""
          : ` · T_cond = ${formatNumber(rankineResults.saturationTemperature - 273.15, 1)} °C`;
      return `h₃ = ${formatNumber(rankineResults.enthalpy3, 1)} J/kg · s₃ = ${formatNumber(
        rankineResults.entropy3,
        2,
      )} J/kg/K${temperatureText}`;
    }

    if (rankineStep === 3 && rankineResults.enthalpy4 !== undefined) {
      return `h₄ = ${formatNumber(rankineResults.enthalpy4, 1)} J/kg`;
    }

    if (rankineStep === 4 && rankineResults.efficiency !== undefined) {
      const carnotText =
        rankineResults.carnotEfficiency == null
          ? ""
          : ` · η_Carnot = ${formatNumber(rankineResults.carnotEfficiency, 1)} %`;
      return `η = ${formatNumber(rankineResults.efficiency, 1)} %${carnotText}`;
    }

    return null;
  }, [rankineResults, rankineStep]);

  async function runHeatExchangerStep() {
    const sessionId = exerciseSessionRef.current;
    setLoading(true);
    setError(null);
    let timeoutId: number | null = window.setTimeout(() => {
      setError("Tempo esgotado. Verifique a conexão com a API.");
      setLoading(false);
    }, 30000);

    try {
      if (step === 0) {
        const [enthalpy, quality, heatCapacity] = await Promise.all([
          apiClient.post<QuantityResponse>("/components/property", {
            fluid: heatExchangerForm.fluid,
            property_name: "H",
            temperature: Number(heatExchangerForm.t1),
            pressure: Number(heatExchangerForm.p1),
          }),
          apiClient
            .post<QuantityResponse>("/components/property", {
              fluid: heatExchangerForm.fluid,
              property_name: "Q",
              temperature: Number(heatExchangerForm.t1),
              pressure: Number(heatExchangerForm.p1),
            })
            .catch(() => ({ value: null as number | null })),
          apiClient
            .post<QuantityResponse>("/components/property", {
              fluid: heatExchangerForm.fluid,
              property_name: "C",
              temperature: Number(heatExchangerForm.t1),
              pressure: Number(heatExchangerForm.p1),
            })
            .catch(() => ({ value: null as number | null })),
        ]);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setHeatExchangerResults((current) => ({
          ...current,
          h1: enthalpy.value,
          q1: quality.value,
          cp1: heatCapacity.value,
        }));
      }

      if (step === 1) {
        const [enthalpy, quality] = await Promise.all([
          apiClient.post<QuantityResponse>("/components/property", {
            fluid: heatExchangerForm.fluid,
            property_name: "H",
            temperature: Number(heatExchangerForm.t2),
            pressure: Number(heatExchangerForm.p2),
          }),
          apiClient
            .post<QuantityResponse>("/components/property", {
              fluid: heatExchangerForm.fluid,
              property_name: "Q",
              temperature: Number(heatExchangerForm.t2),
              pressure: Number(heatExchangerForm.p2),
            })
            .catch(() => ({ value: null as number | null })),
        ]);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setHeatExchangerResults((current) => ({
          ...current,
          h2: enthalpy.value,
          q2: quality.value,
        }));
      }

      if (step === 2) {
        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setHeatExchangerResults((current) => ({
          ...current,
          qdot: ((current.h2 ?? 0) - (current.h1 ?? 0)) * Number(heatExchangerForm.mdot) / 1000,
        }));
      }
    } catch (caughtError) {
      reportExerciseError(caughtError);
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (sessionId === exerciseSessionRef.current) {
        setLoading(false);
      }
    }
  }

  async function runReactorFeedStep() {
    const sessionId = exerciseSessionRef.current;
    setLoading(true);
    setError(null);

    try {
      if (reactorFeedStep === 0) {
        const [rho, mu, cp, conductivity, pvap] = await Promise.all([
          apiClient.post<QuantityResponse>("/components/property", {
            fluid: reactorFeedForm.fluid,
            property_name: "D",
            temperature: Number(reactorFeedForm.temperature),
            pressure: Number(reactorFeedForm.pressure),
          }),
          apiClient.post<QuantityResponse>("/components/property", {
            fluid: reactorFeedForm.fluid,
            property_name: "V",
            temperature: Number(reactorFeedForm.temperature),
            pressure: Number(reactorFeedForm.pressure),
          }),
          apiClient
            .post<QuantityResponse>("/components/property", {
              fluid: reactorFeedForm.fluid,
              property_name: "C",
              temperature: Number(reactorFeedForm.temperature),
              pressure: Number(reactorFeedForm.pressure),
            })
            .catch(() => ({ value: null as number | null })),
          apiClient
            .post<QuantityResponse>("/components/property", {
              fluid: reactorFeedForm.fluid,
              property_name: "L",
              temperature: Number(reactorFeedForm.temperature),
              pressure: Number(reactorFeedForm.pressure),
            })
            .catch(() => ({ value: null as number | null })),
          apiClient
            .post<QuantityResponse>("/components/props-by-state", {
              fluid: reactorFeedForm.fluid,
              input1: "T",
              value1: Number(reactorFeedForm.temperature),
              input2: "Q",
              value2: 0,
              output: "P",
            })
            .catch(() => ({ value: 47400 })),
        ]);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setReactorFeedResults((current) => ({
          ...current,
          rho: rho.value,
          mu: mu.value,
          cp: cp.value,
          k_cond: conductivity.value,
          pvap: pvap.value,
        }));
      }

      if (reactorFeedStep === 1) {
        if (!reactorFeedForm.schedule || !reactorFeedForm.nps) {
          throw new Error("Selecione o schedule e o diâmetro nominal.");
        }

        const encodedSchedule = encodeURIComponent(reactorFeedForm.schedule);
        const detail = await apiClient.get<{
          external_diameter: { value: number };
          thickness: { value: number };
        }>(`/piping/schedule/${encodedSchedule}/diameter/${reactorFeedForm.nps}`);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        const Dmm = detail.external_diameter.value - 2 * detail.thickness.value;
        const velocity = Number(reactorFeedForm.velocity);
        const flowrate = Number(reactorFeedForm.flowrate);
        const [reynolds, calculatedDiameter] = await Promise.all([
          apiClient.post<QuantityResponse>("/flow/reynolds", {
            characteristic_diameter: Dmm,
            velocity,
            density: reactorFeedResults.rho,
            dynamic_viscosity: reactorFeedResults.mu,
          }),
          apiClient.post<QuantityResponse>("/sizing/calculated-diameter", {
            flow_rate: flowrate,
            velocity,
          }),
        ]);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setReactorFeedResults((current) => ({
          ...current,
          Dmm,
          flowrate,
          velocity,
          schedule: reactorFeedForm.schedule,
          nps: reactorFeedForm.nps,
          Re: reynolds.value,
          regime: getFlowRegime(reynolds.value),
          Di_calc: calculatedDiameter.value * 1000,
        }));
      }

      if (reactorFeedStep === 2) {
        if (!reactorFeedForm.material) {
          throw new Error("Selecione o material da tubulação.");
        }

        const encoded = encodeURIComponent(reactorFeedForm.material);
        const composition = await apiClient.get<{
          specifications: { roughness?: { value: number } };
        }>(`/piping/composition/${encoded}`);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        const roughness = Number(composition.specifications.roughness?.value ?? 0);

        const friction = await apiClient.post<QuantityResponse>("/flow/friction-factor", {
          roughness,
          diameter: reactorFeedResults.Dmm,
          reynolds: reactorFeedResults.Re,
          method: "ColebrookWhite",
        });
        const headloss = await apiClient.post<QuantityResponse>("/pump/headloss", {
          method: "Darcy-Weisbach",
          pipe_length: Number(reactorFeedForm.length),
          diameter: reactorFeedResults.Dmm,
          friction_factor: friction.value,
          velocity: reactorFeedResults.velocity,
        });

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setReactorFeedResults((current) => ({
          ...current,
          f: friction.value,
          headloss_m: headloss.value,
        }));
      }

      if (reactorFeedStep === 3) {
        const npsh = await apiClient.post<{ head_loss: { value: number } }>("/pump/npsh-available", {
          manometric_pressure: Number(reactorFeedForm.manometricPressure),
          atmospheric_pressure: Number(reactorFeedForm.atmosphericPressure),
          vapor_pressure: paToKgfCm2(reactorFeedResults.pvap ?? 47400),
          density: reactorFeedResults.rho,
          friction_factor: Number(reactorFeedForm.suctionLoss),
          pump_inlet_velocity: Number(reactorFeedForm.suctionVelocity),
          gauge_elevation: Number(reactorFeedForm.gaugeElevation),
        });

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setReactorFeedResults((current) => ({
          ...current,
          npsh_avail: npsh.head_loss.value,
        }));
      }

      if (reactorFeedStep === 4) {
        const head = await apiClient.post<QuantityResponse>("/pump/head", {
          pressure1: Number(reactorFeedForm.pressure1),
          pressure2: Number(reactorFeedForm.pressure2),
          elevation1: Number(reactorFeedForm.elevation1),
          elevation2: Number(reactorFeedForm.elevation2),
          velocity1: Number(reactorFeedForm.velocity1),
          velocity2: Number(reactorFeedForm.velocity2),
          density: reactorFeedResults.rho,
          friction_factor: reactorFeedResults.headloss_m,
        });

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setReactorFeedResults((current) => ({
          ...current,
          head_m: head.value,
        }));
      }
    } catch (caughtError) {
      reportExerciseError(caughtError);
    } finally {
      if (sessionId === exerciseSessionRef.current) {
        setLoading(false);
      }
    }
  }

  async function runRankineStep() {
    const sessionId = exerciseSessionRef.current;
    setLoading(true);
    setError(null);

    try {
      if (rankineStep === 0) {
        const temperature1 = Number(rankineForm.temperature1);
        const pressure1 = Number(rankineForm.pressure1);
        const [enthalpy1, entropy1] = await Promise.all([
          apiClient.post<QuantityResponse>("/components/property", {
            fluid: "Water",
            property_name: "H",
            temperature: temperature1,
            pressure: pressure1,
          }),
          apiClient.post<QuantityResponse>("/components/property", {
            fluid: "Water",
            property_name: "S",
            temperature: temperature1,
            pressure: pressure1,
          }),
        ]);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setRankineResults((current) => ({
          ...current,
          temperature1,
          pressure1,
          enthalpy1: enthalpy1.value,
          entropy1: entropy1.value,
        }));
      }

      if (rankineStep === 1) {
        if (rankineResults.entropy1 === undefined) {
          throw new Error("Calcule o estado 1 antes de prosseguir.");
        }

        const pressure2 = Number(rankineForm.pressure2);
        const [enthalpy2, quality2] = await Promise.all([
          apiClient.post<QuantityResponse>("/components/props-by-state", {
            fluid: "Water",
            input1: "P",
            value1: pressure2,
            input2: "S",
            value2: rankineResults.entropy1,
            output: "H",
          }),
          apiClient
            .post<QuantityResponse>("/components/props-by-state", {
              fluid: "Water",
              input1: "P",
              value1: pressure2,
              input2: "S",
              value2: rankineResults.entropy1,
              output: "Q",
            })
            .catch(() => ({ value: null as number | null })),
        ]);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setRankineResults((current) => ({
          ...current,
          pressure2,
          enthalpy2: enthalpy2.value,
          quality2: quality2.value,
        }));
      }

      if (rankineStep === 2) {
        const pressure2 = rankineResults.pressure2 ?? Number(rankineForm.pressure2);
        const [enthalpy3, entropy3, temperatureSat] = await Promise.all([
          apiClient.post<QuantityResponse>("/components/props-by-state", {
            fluid: "Water",
            input1: "P",
            value1: pressure2,
            input2: "Q",
            value2: 0,
            output: "H",
          }),
          apiClient.post<QuantityResponse>("/components/props-by-state", {
            fluid: "Water",
            input1: "P",
            value1: pressure2,
            input2: "Q",
            value2: 0,
            output: "S",
          }),
          apiClient
            .post<QuantityResponse>("/components/props-by-state", {
              fluid: "Water",
              input1: "P",
              value1: pressure2,
              input2: "Q",
              value2: 0,
              output: "T",
            })
            .catch(() => ({ value: null as number | null })),
        ]);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setRankineResults((current) => ({
          ...current,
          enthalpy3: enthalpy3.value,
          entropy3: entropy3.value,
          saturationTemperature: temperatureSat.value,
        }));
      }

      if (rankineStep === 3) {
        if (rankineResults.entropy3 === undefined) {
          throw new Error("Calcule o estado 3 antes de prosseguir.");
        }

        const pressure1 = rankineResults.pressure1 ?? Number(rankineForm.pressure1);
        const enthalpy4 = await apiClient.post<QuantityResponse>("/components/props-by-state", {
          fluid: "Water",
          input1: "P",
          value1: pressure1,
          input2: "S",
          value2: rankineResults.entropy3,
          output: "H",
        });

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setRankineResults((current) => ({
          ...current,
          enthalpy4: enthalpy4.value,
        }));
      }

      if (rankineStep === 4) {
        const { enthalpy1, enthalpy2, enthalpy3, enthalpy4, temperature1, saturationTemperature } =
          rankineResults;

        if (
          enthalpy1 === undefined ||
          enthalpy2 === undefined ||
          enthalpy3 === undefined ||
          enthalpy4 === undefined
        ) {
          throw new Error("Calcule todos os estados antes da eficiência.");
        }

        const turbineWork = enthalpy1 - enthalpy2;
        const pumpWork = enthalpy4 - enthalpy3;
        const netWork = turbineWork - pumpWork;
        const heatInput = enthalpy1 - enthalpy4;
        const efficiency = (netWork / heatInput) * 100;
        const carnotEfficiency =
          temperature1 && saturationTemperature
            ? (1 - saturationTemperature / temperature1) * 100
            : null;

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setRankineResults((current) => ({
          ...current,
          efficiency,
          carnotEfficiency,
        }));
      }
    } catch (caughtError) {
      reportExerciseError(caughtError);
    } finally {
      if (sessionId === exerciseSessionRef.current) {
        setLoading(false);
      }
    }
  }

  async function runBalanceSimpleStep() {
    const sessionId = exerciseSessionRef.current;
    setLoading(true);
    setError(null);

    try {
      if (balanceSimpleStep === 0) {
        const conversion = Number(balanceSimpleForm.conversion);
        const payload = {
          components: ["A", "B"],
          streams: [
            {
              name: "Alimentacao_Fresca",
              direction: 1 as const,
              flow_rate: 100,
              compositions: { A: 1, B: 0 },
            },
            {
              name: "Produto",
              direction: -1 as const,
              flow_rate: null,
              compositions: { A: null, B: null },
            },
          ],
          reactions: [
            {
              stoichiometry: { A: -1, B: 1 },
              key_component: "A",
              conversion,
            },
          ],
          splits: null,
        };

        const response = await apiClient.post<BalanceResultsResponse>("/mass-balance/calculate", payload);
        const results = getMassBalanceResults(response);
        const product = results.Produto ?? results.Product;

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        if (!product) {
          throw new Error("A resposta do balanço não retornou a corrente Produto.");
        }

        setBalanceSimpleResults({
          conversion,
          payload,
          results,
          productFlow: getMassBalanceStreamFlow(product),
          productA: getMassBalanceStreamCompositions(product).A,
          productB: getMassBalanceStreamCompositions(product).B,
          yieldBA: undefined,
          plotImage: null,
        });
      }

      if (balanceSimpleStep === 1) {
        if (!balanceSimpleResults.payload) {
          throw new Error("Calcule o balanço antes de pedir os rendimentos.");
        }

        const response = await apiClient.post<YieldResponse>(
          "/mass-balance/yields",
          balanceSimpleResults.payload,
        );

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setBalanceSimpleResults((current) => ({
          ...current,
          yieldBA:
            getMassBalanceYields(response).B_a_partir_de_A ??
            getMassBalanceYields(response).B_from_A,
        }));

        const plotImage = await loadBalancePlot(balanceSimpleResults.payload);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setBalanceSimpleResults((current) => ({
          ...current,
          plotImage,
        }));
      }
    } catch (caughtError) {
      reportExerciseError(caughtError);
    } finally {
      if (sessionId === exerciseSessionRef.current) {
        setLoading(false);
      }
    }
  }

  async function runBalanceRecycleStep() {
    const sessionId = exerciseSessionRef.current;
    setLoading(true);
    setError(null);

    try {
      if (balanceRecycleStep === 0) {
        const conversion = Number(balanceRecycleForm.conversion);
        const recycleFraction = Number(balanceRecycleForm.recycleFraction);
        const payload = {
          components: ["A", "B"],
          streams: [
            {
              name: "Alimentacao_Fresca",
              direction: 1 as const,
              flow_rate: 100,
              compositions: { A: 1, B: 0 },
            },
            {
              name: "Saida_Do_Reator",
              direction: -1 as const,
              flow_rate: null,
              compositions: { A: null, B: null },
            },
            {
              name: "Reciclo",
              direction: 1 as const,
              flow_rate: null,
              compositions: { A: null, B: null },
            },
            {
              name: "Produto",
              direction: -1 as const,
              flow_rate: null,
              compositions: { A: null, B: null },
            },
          ],
          reactions: [
            {
              stoichiometry: { A: -1, B: 1 },
              key_component: "A",
              conversion,
            },
          ],
          splits: [
            {
              parent_stream: "Saida_Do_Reator",
              recycle_stream: "Reciclo",
              purge_stream: "Produto",
              fraction: recycleFraction,
            },
          ],
        };

        const response = await apiClient.post<BalanceResultsResponse>("/mass-balance/calculate", payload);
        const results = getMassBalanceResults(response);
        const product = results.Produto ?? results.Product;

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        if (!product) {
          throw new Error("A resposta do balanço não retornou a corrente Produto.");
        }

        setBalanceRecycleResults({
          conversion,
          recycleFraction,
          payload,
          results,
          productA: getMassBalanceStreamCompositions(product).A,
          productB: getMassBalanceStreamCompositions(product).B,
          recycleRatio:
            getMassBalanceMetrics(response).taxa_reciclo ??
            getMassBalanceMetrics(response).recycle_ratio,
          noRecycleA: undefined,
          yieldBA: undefined,
          plotImage: null,
        });
      }

      if (balanceRecycleStep === 1) {
        if (balanceRecycleResults.conversion === undefined || balanceRecycleResults.productA === undefined) {
          throw new Error("Calcule o sistema com reciclo antes da comparação.");
        }

        const response = await apiClient.post<BalanceResultsResponse>("/mass-balance/calculate", {
          components: ["A", "B"],
          streams: [
            {
              name: "Alimentacao_Fresca",
              direction: 1 as const,
              flow_rate: 100,
              compositions: { A: 1, B: 0 },
            },
            {
              name: "Produto_SR",
              direction: -1 as const,
              flow_rate: null,
              compositions: { A: null, B: null },
            },
          ],
          reactions: [
            {
              stoichiometry: { A: -1, B: 1 },
              key_component: "A",
              conversion: balanceRecycleResults.conversion,
            },
          ],
          splits: null,
        });

        const results = getMassBalanceResults(response);
        const product = results.Produto_SR ?? results.Product_SR;

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        if (!product) {
          throw new Error("A resposta da comparação não retornou a corrente Produto_SR.");
        }

        setBalanceRecycleResults((current) => ({
          ...current,
          noRecycleA: getMassBalanceStreamCompositions(product).A,
        }));
      }

      if (balanceRecycleStep === 2) {
        if (!balanceRecycleResults.payload) {
          throw new Error("Calcule o sistema com reciclo antes dos rendimentos.");
        }

        const response = await apiClient.post<YieldResponse>(
          "/mass-balance/yields",
          balanceRecycleResults.payload,
        );

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setBalanceRecycleResults((current) => ({
          ...current,
          yieldBA:
            getMassBalanceYields(response).B_a_partir_de_A ??
            getMassBalanceYields(response).B_from_A,
        }));

        const plotImage = await loadBalancePlot(balanceRecycleResults.payload);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setBalanceRecycleResults((current) => ({
          ...current,
          plotImage,
        }));
      }
    } catch (caughtError) {
      reportExerciseError(caughtError);
    } finally {
      if (sessionId === exerciseSessionRef.current) {
        setLoading(false);
      }
    }
  }

  async function runBalancePurgeStep() {
    const sessionId = exerciseSessionRef.current;
    setLoading(true);
    setError(null);

    try {
      if (balancePurgeStep === 0) {
        const payload = buildBalancePurgePayload(0.999);
        const response = await apiClient.post<BalanceResultsResponse>("/mass-balance/calculate", payload);
        const results = getMassBalanceResults(response);
        const recycle = results.Reciclo ?? results.Recycle;

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        if (!recycle) {
          throw new Error("A resposta sem purga não retornou a corrente Reciclo.");
        }

        setBalancePurgeResults({
          noPurgeInert: getMassBalanceStreamCompositions(recycle).I,
          recycleFraction: undefined,
          payload: undefined,
          results,
          recycleInert: undefined,
          purgeInert: undefined,
          recycleRatio: undefined,
          yieldBA: undefined,
          plotImage: null,
        });
      }

      if (balancePurgeStep === 1) {
        const recycleFraction = Number(balancePurgeForm.recycleFraction);
        const payload = buildBalancePurgePayload(recycleFraction);
        const response = await apiClient.post<BalanceResultsResponse>("/mass-balance/calculate", payload);
        const results = getMassBalanceResults(response);
        const recycle = results.Reciclo ?? results.Recycle;
        const purge = results.Purga_Produto ?? results.Purge_Produto;

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        if (!recycle || !purge) {
          throw new Error("A resposta com purga não retornou as correntes esperadas.");
        }

        setBalancePurgeResults((current) => ({
          ...current,
          recycleFraction,
          payload,
          results,
          recycleInert: getMassBalanceStreamCompositions(recycle).I,
          purgeInert: getMassBalanceStreamCompositions(purge).I,
          recycleRatio:
            getMassBalanceMetrics(response).taxa_reciclo ??
            getMassBalanceMetrics(response).recycle_ratio,
          yieldBA: undefined,
          plotImage: null,
        }));
      }

      if (balancePurgeStep === 2) {
        if (!balancePurgeResults.payload) {
          throw new Error("Calcule o caso com purga antes dos rendimentos.");
        }

        const response = await apiClient.post<YieldResponse>(
          "/mass-balance/yields",
          balancePurgeResults.payload,
        );

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setBalancePurgeResults((current) => ({
          ...current,
          yieldBA:
            getMassBalanceYields(response).B_a_partir_de_A ??
            getMassBalanceYields(response).B_from_A,
        }));

        const plotImage = await loadBalancePlot(balancePurgeResults.payload);

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setBalancePurgeResults((current) => ({
          ...current,
          plotImage,
        }));
      }
    } catch (caughtError) {
      reportExerciseError(caughtError);
    } finally {
      if (sessionId === exerciseSessionRef.current) {
        setLoading(false);
      }
    }
  }

  async function runSeriesReactorsStep() {
    const sessionId = exerciseSessionRef.current;
    setLoading(true);
    setError(null);

    try {
      if (seriesReactorsStep === 0) {
        setSeriesReactorsResults((current) => ({
          ...current,
          chartReady: true,
          levenspielImage: null,
        }));

        const plot = await apiClient.post<ReactorPlotResponse>(
          "/reactor/plot-conversion-vs-volume",
          buildSeriesReactorPlotPayload(0.89),
        );

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setSeriesReactorsResults((current) => ({
          ...current,
          levenspielImage: `data:image/png;base64,${plot.image_base64}`,
        }));
      }

      if (seriesReactorsStep === 1) {
        const intermediateConversion = Number(seriesReactorsForm.intermediateConversion);
        const finalConversion = Number(seriesReactorsForm.finalConversion);
        const response = await apiClient.post<ReactorResponse>(
          "/reactor/pfr",
          buildSeriesReactorPayload(intermediateConversion),
        );

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setSeriesReactorsResults((current) => ({
          ...current,
          intermediateConversion,
          finalConversion,
          pfr1Volume: getReactorQuantity(response, "volume")?.value ?? 0,
          pfr1Residence:
            getReactorQuantity(response, "residence_time", "tempo_de_residencia")?.value ?? null,
        }));
      }

      if (seriesReactorsStep === 2) {
        if (
          seriesReactorsResults.intermediateConversion === undefined ||
          seriesReactorsResults.finalConversion === undefined ||
          seriesReactorsResults.pfr1Volume === undefined
        ) {
          throw new Error("Calcule o primeiro PFR antes de prosseguir.");
        }

        const response = await apiClient.post<ReactorResponse>(
          "/reactor/cstr",
          buildSeriesReactorPayload(seriesReactorsResults.finalConversion),
        );
        const responseVolume = getReactorQuantity(response, "volume")?.value ?? 0;
        const responseResidence =
          getReactorQuantity(response, "residence_time", "tempo_de_residencia")?.value ?? null;
        const cstr2Volume =
          (responseVolume *
            (seriesReactorsResults.finalConversion - seriesReactorsResults.intermediateConversion)) /
          seriesReactorsResults.finalConversion;
        const cstr2Residence =
          responseResidence == null
            ? null
          : (responseResidence *
              (seriesReactorsResults.finalConversion - seriesReactorsResults.intermediateConversion)) /
              seriesReactorsResults.finalConversion;

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setSeriesReactorsResults((current) => ({
          ...current,
          cstr2Volume,
          cstr2Residence,
          pfrCstrTotal: (current.pfr1Volume ?? 0) + cstr2Volume,
        }));
      }

      if (seriesReactorsStep === 3) {
        if (seriesReactorsResults.intermediateConversion === undefined) {
          throw new Error("Defina a conversão intermediária antes de calcular o CSTR.");
        }

        const response = await apiClient.post<ReactorResponse>(
          "/reactor/cstr",
          buildSeriesReactorPayload(seriesReactorsResults.intermediateConversion),
        );
        const responseVolume = getReactorQuantity(response, "volume")?.value ?? 0;
        const responseResidence =
          getReactorQuantity(response, "residence_time", "tempo_de_residencia")?.value ?? null;

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setSeriesReactorsResults((current) => ({
          ...current,
          cstr1Volume: responseVolume,
          cstr1Residence: responseResidence,
        }));
      }

      if (seriesReactorsStep === 4) {
        if (
          seriesReactorsResults.intermediateConversion === undefined ||
          seriesReactorsResults.finalConversion === undefined ||
          seriesReactorsResults.cstr1Volume === undefined
        ) {
          throw new Error("Calcule o CSTR inicial antes de prosseguir.");
        }

        const [finalResponse, intermediateResponse] = await Promise.all([
          apiClient.post<ReactorResponse>(
            "/reactor/pfr",
            buildSeriesReactorPayload(seriesReactorsResults.finalConversion),
          ),
          apiClient.post<ReactorResponse>(
            "/reactor/pfr",
            buildSeriesReactorPayload(seriesReactorsResults.intermediateConversion),
          ),
        ]);
        const finalVolume = getReactorQuantity(finalResponse, "volume")?.value ?? 0;
        const intermediateVolume = getReactorQuantity(intermediateResponse, "volume")?.value ?? 0;
        const finalResidence =
          getReactorQuantity(finalResponse, "residence_time", "tempo_de_residencia")?.value ?? null;
        const intermediateResidence =
          getReactorQuantity(
            intermediateResponse,
            "residence_time",
            "tempo_de_residencia",
          )?.value ?? null;

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        const pfr2Volume = finalVolume - intermediateVolume;
        const pfr2Residence =
          finalResidence == null || intermediateResidence == null
            ? null
            : finalResidence - intermediateResidence;

        setSeriesReactorsResults((current) => ({
          ...current,
          pfr2Volume,
          pfr2Residence,
          cstrPfrTotal: (current.cstr1Volume ?? 0) + pfr2Volume,
        }));
      }

      if (seriesReactorsStep === 5) {
        if (
          seriesReactorsResults.pfrCstrTotal === undefined ||
          seriesReactorsResults.cstrPfrTotal === undefined
        ) {
          throw new Error("Calcule as duas configurações antes da comparação final.");
        }

        const bestConfiguration =
          seriesReactorsResults.pfrCstrTotal < seriesReactorsResults.cstrPfrTotal
            ? "PFR→CSTR"
            : "CSTR→PFR";
        const savedVolume = Math.abs(
          seriesReactorsResults.pfrCstrTotal - seriesReactorsResults.cstrPfrTotal,
        );

        if (sessionId !== exerciseSessionRef.current) {
          return;
        }

        setSeriesReactorsResults((current) => ({
          ...current,
          bestConfiguration,
          savedVolume,
        }));
      }
    } catch (caughtError) {
      reportExerciseError(caughtError);
    } finally {
      if (sessionId === exerciseSessionRef.current) {
        setLoading(false);
      }
    }
  }

  function openExercise(exercise: ExerciseCatalogEntry) {
    if (!exercise.available) {
      return;
    }

    invalidateExerciseSession();
    setSelectedExercise(exercise);
    setStep(0);
    setReactorFeedStep(0);
    setRankineStep(0);
    setBalanceSimpleStep(0);
    setBalanceRecycleStep(0);
    setBalancePurgeStep(0);
    setSeriesReactorsStep(0);
    setCompletedExerciseId(null);
    setError(null);
    setHeatExchangerForm({ ...initialHeatExchangerForm });
    setReactorFeedForm({ ...initialReactorFeedForm });
    setRankineForm({ ...initialRankineForm });
    setBalanceSimpleForm({ ...initialBalanceSimpleForm });
    setBalanceRecycleForm({ ...initialBalanceRecycleForm });
    setBalancePurgeForm({ ...initialBalancePurgeForm });
    setSeriesReactorsForm({ ...initialSeriesReactorsForm });
    setHeatExchangerResults({});
    setReactorFeedResults({});
    setRankineResults({});
    setBalanceSimpleResults({});
    setBalanceRecycleResults({});
    setBalancePurgeResults({});
    setSeriesReactorsResults({});
  }

  function returnToCatalog() {
    invalidateExerciseSession();
    setSelectedExercise(null);
    setStep(0);
    setReactorFeedStep(0);
    setRankineStep(0);
    setBalanceSimpleStep(0);
    setBalanceRecycleStep(0);
    setBalancePurgeStep(0);
    setSeriesReactorsStep(0);
    setCompletedExerciseId(null);
    setError(null);
    setHeatExchangerForm({ ...initialHeatExchangerForm });
    setReactorFeedForm({ ...initialReactorFeedForm });
    setRankineForm({ ...initialRankineForm });
    setBalanceSimpleForm({ ...initialBalanceSimpleForm });
    setBalanceRecycleForm({ ...initialBalanceRecycleForm });
    setBalancePurgeForm({ ...initialBalancePurgeForm });
    setSeriesReactorsForm({ ...initialSeriesReactorsForm });
    setHeatExchangerResults({});
    setReactorFeedResults({});
    setRankineResults({});
    setBalanceSimpleResults({});
    setBalanceRecycleResults({});
    setBalancePurgeResults({});
    setSeriesReactorsResults({});
  }

  function goToNextStep() {
    setStep((current) => (current < 2 ? ((current + 1) as HeatExchangerStep) : current));
    setError(null);
  }

  function goToNextReactorFeedStep() {
    setReactorFeedStep((current) => (current < 4 ? ((current + 1) as ReactorFeedStep) : current));
    setError(null);
  }

  function goToNextRankineStep() {
    setRankineStep((current) => (current < 4 ? ((current + 1) as RankineStep) : current));
    setError(null);
  }

  function goToNextBalanceSimpleStep() {
    setBalanceSimpleStep((current) => (current < 1 ? ((current + 1) as BalanceSimpleStep) : current));
    setError(null);
  }

  function goToNextBalanceRecycleStep() {
    setBalanceRecycleStep((current) => (current < 2 ? ((current + 1) as BalanceRecycleStep) : current));
    setError(null);
  }

  function goToNextBalancePurgeStep() {
    setBalancePurgeStep((current) => (current < 2 ? ((current + 1) as BalancePurgeStep) : current));
    setError(null);
  }

  function goToNextSeriesReactorsStep() {
    setSeriesReactorsStep((current) => (current < 5 ? ((current + 1) as SeriesReactorsStep) : current));
    setError(null);
  }

  function renderBalanceResultsTable(results?: BalanceResultsResponse["results"] | null) {
    if (!results) {
      return null;
    }

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="border px-3 py-2 text-left">Corrente</th>
              <th className="border px-3 py-2">Vazão (kg/h)</th>
              <th className="border px-3 py-2">Composições</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(results).map(([streamName, streamData]) => {
              const compositions = Object.entries(getMassBalanceStreamCompositions(streamData))
                .map(([key, value]) => `${key}=${formatNumber(value, 3)}`)
                .join(" · ");

              return (
                <tr key={streamName}>
                  <td className="border px-3 py-2 font-medium">{streamName}</td>
                  <td className="border px-3 py-2 font-mono">
                    {formatNumber(getMassBalanceStreamFlow(streamData), 2)}
                  </td>
                  <td className="border px-3 py-2 font-mono text-xs">{compositions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderExerciseCompletionMessage() {
    if (!selectedExercise) {
      return null;
    }

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium">
          Você completou todas as etapas de <strong>{selectedExercise.title}</strong>.
        </p>
      </div>
    );
  }

  function renderExerciseTrail(
    labels: string[],
    currentStepIndex: number,
    isCurrentStepComplete: boolean,
  ) {
    return (
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" data-testid="exercise-step-trail">
        {labels.map((label, index) => {
          const state =
            index < currentStepIndex || (index === currentStepIndex && isCurrentStepComplete)
              ? "done"
              : index === currentStepIndex
                ? "active"
                : "pending";

          const stateClasses =
            state === "done"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : state === "active"
                ? "bg-blue-50 border-blue-300 text-blue-800"
                : "bg-slate-50 border-slate-200 text-slate-500 opacity-50";

          return (
            <div
              key={label}
              className={`rounded-xl border p-3 text-xs ${stateClasses}`}
              data-state={state}
              data-testid="exercise-step-card"
            >
              <div className="font-semibold">
                Etapa {index + 1} - {label}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.12em]">
                {state === "done" ? "Concluída" : state === "active" ? "Atual" : "Pendente"}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function getSubmitButtonLabel(primaryLabel: string, isCompleted: boolean) {
    if (loading) {
      return "Calculando...";
    }

    return isCompleted ? "Recalcular" : primaryLabel;
  }

  function renderExerciseCompletionScreen() {
    if (!selectedExercise) {
      return null;
    }

    return (
      <div className="space-y-6 rounded-2xl border bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">✅</div>
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold text-slate-800">Exercício concluído!</h3>
          <p className="text-sm text-slate-500">
            Você completou todas as etapas de <strong>{selectedExercise.title}</strong>.
          </p>
        </div>
        <Button type="button" onClick={returnToCatalog}>
          Voltar aos exercícios
        </Button>
      </div>
    );
  }

  function renderExerciseContextMessage() {
    if (!selectedExercise) {
      return null;
    }

    let message: string | null = null;

    switch (selectedExercise.id) {
      case "heat-exchanger":
        message =
          step === 0
            ? "Entalpia de entrada obtida. Agora precisamos da entalpia na saída para calcular a variação de energia."
            : step === 1
              ? "Entalpia de saída obtida. Com Δh = h₂ − h₁ e a vazão mássica, calculamos a potência do trocador."
              : "Exercício concluído! A potência do trocador depende do fluido, das condições e da vazão. Tente variar a temperatura de saída ou o fluido.";
        break;
      case "reactor-feed":
        message =
          reactorFeedStep === 0
            ? "Densidade e viscosidade obtidas. Com essas propriedades calculamos o regime de escoamento na tubulação."
            : reactorFeedStep === 1
              ? "Regime de escoamento determinado. Com Re e a rugosidade da tubulação, calculamos o fator de atrito e a perda de carga."
              : reactorFeedStep === 2
                ? "Perda de carga obtida. Esse valor (em metros de coluna de líquido) define a energia que a bomba precisa fornecer ao fluido."
                : reactorFeedStep === 3
                  ? "NPSH disponível calculado. Esse valor deve ser maior que o NPSH requerido da bomba (informado pelo fabricante) para evitar cavitação."
                  : "Exercício concluído! A altura manométrica total define a seleção da bomba. Compare H_man com NPSH_disp para garantir operação segura.";
        break;
      case "rankine":
        message =
          rankineStep === 0
            ? "Estado 1 calculado. O vapor entra na turbina e se expande isentropicamente (s₂ = s₁). Usaremos P₂ e S=s₁ para encontrar h₂."
            : rankineStep === 1
              ? "Saída da turbina calculada. Qualidade X₂ < 0,85 indica risco de erosão de pás — em projetos reais exige reaquecimento. O vapor úmido entra no condensador."
              : rankineStep === 2
                ? "Estado 3 calculado. A temperatura de condensação mostrada é a temperatura de saturação do vapor à pressão P₂. A bomba comprime o líquido isentropicamente de P₂ para P₁."
                : rankineStep === 3
                  ? "Estado 4 calculado. Com os 4 pontos do ciclo, podemos calcular a eficiência térmica."
                  : "Ciclo de Rankine concluído! η_Carnot é o limite teórico de Carnot operando entre as mesmas temperaturas. A razão η/η_Carnot mede a qualidade do ciclo real.";
        break;
      case "series-reactors":
        message =
          seriesReactorsStep === 0
            ? "Para reações de ordem positiva, o PFR é sempre mais eficiente que o CSTR isolado. A vantagem do PFR diminui em conversões mais altas."
            : seriesReactorsStep === 1
              ? "Volume do primeiro PFR calculado. Agora calculamos o CSTR que finaliza de X_int até X_final (configuração PFR→CSTR)."
              : seriesReactorsStep === 2
                ? "Configuração PFR→CSTR calculada. Agora calculamos a configuração inversa (CSTR→PFR) para comparar."
                : seriesReactorsStep === 3
                  ? "Primeiro CSTR calculado. Agora calculamos o PFR que completa a reação de X_int até X_final."
                  : seriesReactorsStep === 4
                    ? "Configuração CSTR→PFR calculada. Agora comparamos as duas configurações para escolher a mais eficiente."
                    : "Para reações de ordem positiva, PFR→CSTR geralmente requer menor volume total. A vantagem aumenta com a diferença entre X_int e X_final.";
        break;
      case "balance-simple":
        message =
          balanceSimpleStep === 0
            ? "Sem reciclo, conversão global = conversão por passagem. Todo o A não reagido sai com o produto."
            : "Exercício concluído! No balanço simples, o rendimento de B é igual à conversão. Compare com o balanço com reciclo para ver a diferença.";
        break;
      case "balance-recycle":
        message =
          balanceRecycleStep === 0
            ? "Com reciclo, o A não reagido retorna ao reator, aumentando a conversão global além de X por passagem."
            : balanceRecycleStep === 1
              ? "A diferença mostra quantitativamente o benefício do reciclo. Quanto maior a fração de reciclo f, menor A no produto final (maior conversão global)."
              : "Exercício concluído! O reciclo aumenta o rendimento global sem alterar as condições do reator. O trade-off é maior custo de bombeamento e equipamentos maiores.";
        break;
      case "balance-purge":
        message =
          balancePurgeStep === 0
            ? "Sem purga, I acumula até dominar o circuito. O sistema entra em colapso operacional. A purga drena continuamente I para manter regime estacionário real."
            : balancePurgeStep === 1
              ? "Com purga (f<1), I atinge regime estacionário. Aumentar a purga (diminuir f) reduz I no circuito, mas aumenta a perda de A não reagido."
              : "Exercício concluído! A purga é essencial quando há inertes. O projeto ótimo balanceia controle de acúmulo vs perda de reagente pela purga.";
        break;
      default:
        message = null;
    }

    if (!message) {
      return null;
    }

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        {message}
      </div>
    );
  }

  return (
    <ModuleTabsLayout
      title="Exercícios Integrados"
      subtitle={
        <p className="text-sm text-muted-foreground">
          Resolva exercícios orientados usando os mesmos módulos e fluxos de cálculo da aplicação.
        </p>
      }
      tabs={exercisesTabs}
    >
      <section className="space-y-6">
      {completedExerciseId === selectedExercise?.id ? (
        renderExerciseCompletionScreen()
      ) : selectedExercise?.id === "heat-exchanger" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Runner guiado</p>
                  <h2 className="text-xl font-semibold">{selectedExercise.title}</h2>
                </div>
                <Button type="button" variant="outline" onClick={returnToCatalog}>
                  Voltar aos exercícios
                </Button>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Um trocador de calor opera com <strong>Propano</strong> (<code>n-Propane</code> no
                CoolProp — editável). Determine a potência do trocador para aquecer o fluido da
                temperatura de entrada até a de saída.
              </p>
            </CardHeader>
          </Card>

          {renderExerciseTrail(
            ["Entalpia de entrada (h₁)", "Entalpia de saída (h₂)", "Potência do trocador (Q̇)"],
            step,
            currentStepResult != null,
          )}

          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm text-muted-foreground">Etapa {step + 1} de 3</p>
              <h3 className="text-lg font-semibold">
                {step === 0 && "Etapa 1 — Entalpia de entrada (h₁)"}
                {step === 1 && "Etapa 2 — Entalpia de saída (h₂)"}
                {step === 2 && "Etapa 3 — Potência do trocador (Q̇)"}
              </h3>
              <p className="text-sm text-slate-600">
                {step === 0 && "Obtenha a entalpia do fluido nas condições de entrada do trocador."}
                {step === 1 && "Obtenha a entalpia do fluido nas condições de saída do trocador."}
                {step === 2 && "Calcule a potência trocada a partir de Δh e da vazão mássica."}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 0 ? (
                <form
                  className="grid gap-4 md:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runHeatExchangerStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="exercise-fluid">
                    Fluido
                    <select
                      id="exercise-fluid"
                      value={heatExchangerForm.fluid}
                      onChange={(event) =>
                        setHeatExchangerForm((current) => ({
                          ...current,
                          fluid: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    >
                      {fluids.map((fluid) => (
                        <option key={fluid} value={fluid}>
                          {fluid}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="exercise-t1">
                    Temperatura de entrada T₁ (K)
                    <input
                      id="exercise-t1"
                      type="number"
                      step="0.01"
                      value={heatExchangerForm.t1}
                      onChange={(event) =>
                        setHeatExchangerForm((current) => ({
                          ...current,
                          t1: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="exercise-p1">
                    Pressão de entrada P₁ (Pa)
                    <input
                      id="exercise-p1"
                      type="number"
                      step="1"
                      value={heatExchangerForm.p1}
                      onChange={(event) =>
                        setHeatExchangerForm((current) => ({
                          ...current,
                          p1: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-3">
                    <Button type="submit" disabled={loading}>
                      {getSubmitButtonLabel("Calcular h₁ via CoolProp", Boolean(heatExchangerResults.h1))}
                    </Button>
                  </div>
                </form>
              ) : null}

              {step === 1 ? (
                <form
                  className="grid gap-4 md:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runHeatExchangerStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="exercise-fluid-locked">
                    Fluido
                    <input
                      id="exercise-fluid-locked"
                      value={heatExchangerForm.fluid}
                      readOnly
                      className={`${inputClassName} bg-slate-50`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="exercise-t2">
                    Temperatura de saída T₂ (K)
                    <input
                      id="exercise-t2"
                      type="number"
                      step="0.01"
                      value={heatExchangerForm.t2}
                      onChange={(event) =>
                        setHeatExchangerForm((current) => ({
                          ...current,
                          t2: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="exercise-p2">
                    Pressão de saída P₂ (Pa)
                    <input
                      id="exercise-p2"
                      type="number"
                      step="1"
                      value={heatExchangerForm.p2}
                      onChange={(event) =>
                        setHeatExchangerForm((current) => ({
                          ...current,
                          p2: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-3">
                    <Button type="submit" disabled={loading}>
                      {getSubmitButtonLabel("Calcular h₂ via CoolProp", Boolean(heatExchangerResults.h2))}
                    </Button>
                  </div>
                </form>
              ) : null}

              {step === 2 ? (
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runHeatExchangerStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    <p>h₁ = {formatNumber(heatExchangerResults.h1 ?? 0, 1)} J/kg</p>
                    <p>h₂ = {formatNumber(heatExchangerResults.h2 ?? 0, 1)} J/kg</p>
                    <p className="font-medium">
                      Δh = {formatNumber((heatExchangerResults.h2 ?? 0) - (heatExchangerResults.h1 ?? 0), 1)}{" "}
                      J/kg
                    </p>
                  </div>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="exercise-mdot">
                    Vazão mássica ṁ (kg/s)
                    <input
                      id="exercise-mdot"
                      type="number"
                      step="0.01"
                      value={heatExchangerForm.mdot}
                      onChange={(event) =>
                        setHeatExchangerForm((current) => ({
                          ...current,
                          mdot: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={loading}>
                      {getSubmitButtonLabel("Calcular Q̇", Boolean(heatExchangerResults.qdot))}
                    </Button>
                  </div>
                </form>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {currentStepResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {currentStepResult}
                </div>
              ) : null}

              {renderExerciseContextMessage()}

              {selectedExercise?.id === "heat-exchanger" ? (
                <HeatExchangerThermalCharts {...heatExchangerThermalCharts} />
              ) : null}

              {step === 2 && currentStepResult ? renderExerciseCompletionMessage() : null}

              {step === 2 && currentStepResult ? (
                <Button type="button" variant="outline" onClick={() => setCompletedExerciseId(selectedExercise?.id ?? null)}>
                  Concluir Exercício ✓
                </Button>
              ) : null}

              {currentStepResult && step < 2 ? (
                <Button type="button" variant="outline" onClick={goToNextStep}>
                  Próxima Etapa
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : selectedExercise?.id === "rankine" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Runner guiado</p>
                  <h2 className="text-xl font-semibold">{selectedExercise.title}</h2>
                </div>
                <Button type="button" variant="outline" onClick={returnToCatalog}>
                  Voltar aos exercícios
                </Button>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Um ciclo de Rankine opera com <strong>vapor d'água</strong>. Calcule os estados da
                caldeira, turbina, condensador e bomba para obter a eficiência térmica do ciclo.
              </p>
            </CardHeader>
          </Card>

          {renderExerciseTrail(
            [
              "Estado 1: Vapor superaquecido",
              "Estado 2: Saída da turbina",
              "Estado 3: Saída do condensador",
              "Estado 4: Saída da bomba",
              "Eficiência térmica do ciclo",
            ],
            rankineStep,
            currentRankineResult != null,
          )}

          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm text-muted-foreground">Etapa {rankineStep + 1} de 5</p>
              <h3 className="text-lg font-semibold">
                {rankineStep === 0 && "Etapa 1 — Estado 1: Vapor superaquecido (saída caldeira)"}
                {rankineStep === 1 && "Etapa 2 — Estado 2: Saída da turbina (expansão isentrópica)"}
                {rankineStep === 2 && "Etapa 3 — Estado 3: Saída do condensador (líquido saturado)"}
                {rankineStep === 3 && "Etapa 4 — Estado 4: Saída da bomba (compressão isentrópica)"}
                {rankineStep === 4 && "Etapa 5 — Eficiência térmica do ciclo"}
              </h3>
            </CardHeader>
            <CardContent className="space-y-5">
              {rankineStep === 0 ? (
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runRankineStep();
                  }}
                >
                  {rankineCritical ? (
                    <div className="rounded-xl border bg-slate-50 p-4 text-xs text-slate-700 md:col-span-2">
                      <strong>Água — Ponto crítico:</strong> Tc ={" "}
                      {formatNumber(rankineCritical.critical_temperature - 273.15, 1)} °C · Pc ={" "}
                      {formatNumber(rankineCritical.critical_pressure / 1e6, 2)} MPa
                    </div>
                  ) : null}
                  <label className="block text-sm font-medium text-slate-800" htmlFor="rankine-temperature-1">
                    T₁ (K)
                    <input
                      id="rankine-temperature-1"
                      type="number"
                      step="0.01"
                      value={rankineForm.temperature1}
                      onChange={(event) =>
                        setRankineForm((current) => ({
                          ...current,
                          temperature1: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="rankine-pressure-1">
                    P₁ (Pa)
                    <input
                      id="rankine-pressure-1"
                      type="number"
                      step="1000"
                      value={rankineForm.pressure1}
                      onChange={(event) =>
                        setRankineForm((current) => ({
                          ...current,
                          pressure1: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={loading}>
                      Calcular Estado 1 via CoolProp
                    </Button>
                  </div>
                </form>
              ) : null}

              {rankineStep === 1 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runRankineStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="rankine-pressure-2">
                    P₂ — Pressão do condensador (Pa)
                    <input
                      id="rankine-pressure-2"
                      type="number"
                      step="100"
                      value={rankineForm.pressure2}
                      onChange={(event) =>
                        setRankineForm((current) => ({
                          ...current,
                          pressure2: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    Expansão isentrópica: s₂ = s₁ = {formatNumber(rankineResults.entropy1 ?? 0, 2)} J/kg/K
                  </div>
                  <Button type="submit" disabled={loading}>
                    Calcular h₂ (P+S → H)
                  </Button>
                </form>
              ) : null}

              {rankineStep === 2 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runRankineStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    Estado 3: líquido saturado na pressão do condensador, com qualidade Q = 0.
                  </div>
                  <Button type="submit" disabled={loading}>
                    Calcular Estado 3 (P+Q=0)
                  </Button>
                </form>
              ) : null}

              {rankineStep === 3 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runRankineStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    Compressão isentrópica: s₄ = s₃ = {formatNumber(rankineResults.entropy3 ?? 0, 2)} J/kg/K
                  </div>
                  <Button type="submit" disabled={loading}>
                    Calcular h₄ (P+S → H)
                  </Button>
                </form>
              ) : null}

              {rankineStep === 4 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runRankineStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    <p>h₁ = {formatNumber(rankineResults.enthalpy1 ?? 0, 1)} J/kg</p>
                    <p>h₂ = {formatNumber(rankineResults.enthalpy2 ?? 0, 1)} J/kg</p>
                    <p>h₃ = {formatNumber(rankineResults.enthalpy3 ?? 0, 1)} J/kg</p>
                    <p>h₄ = {formatNumber(rankineResults.enthalpy4 ?? 0, 1)} J/kg</p>
                  </div>
                  <Button type="submit" disabled={loading}>
                    Calcular Eficiência
                  </Button>
                </form>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {currentRankineResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {currentRankineResult}
                </div>
              ) : null}

              {renderExerciseContextMessage()}

              {rankineResults.efficiency !== undefined &&
              rankineResults.enthalpy1 !== undefined &&
              rankineResults.enthalpy2 !== undefined &&
              rankineResults.enthalpy3 !== undefined &&
              rankineResults.enthalpy4 !== undefined ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="border px-3 py-2 text-left">Grandeza</th>
                        <th className="border px-3 py-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border px-3 py-2">W_turbina</td>
                        <td className="border px-3 py-2 font-mono">
                          {formatNumber((rankineResults.enthalpy1 - rankineResults.enthalpy2) / 1000, 2)} kJ/kg
                        </td>
                      </tr>
                      <tr>
                        <td className="border px-3 py-2">W_bomba</td>
                        <td className="border px-3 py-2 font-mono">
                          {formatNumber((rankineResults.enthalpy4 - rankineResults.enthalpy3) / 1000, 2)} kJ/kg
                        </td>
                      </tr>
                      <tr>
                        <td className="border px-3 py-2">W_líquido</td>
                        <td className="border px-3 py-2 font-mono">
                          {formatNumber(
                            (rankineResults.enthalpy1 -
                              rankineResults.enthalpy2 -
                              (rankineResults.enthalpy4 - rankineResults.enthalpy3)) /
                              1000,
                            2,
                          )}{" "}
                          kJ/kg
                        </td>
                      </tr>
                      <tr>
                        <td className="border px-3 py-2">Q_caldeira</td>
                        <td className="border px-3 py-2 font-mono">
                          {formatNumber((rankineResults.enthalpy1 - rankineResults.enthalpy4) / 1000, 2)} kJ/kg
                        </td>
                      </tr>
                      {rankineResults.carnotEfficiency != null ? (
                        <>
                          <tr className="bg-green-50 font-semibold">
                            <td className="border px-3 py-2">η</td>
                            <td className="border px-3 py-2 font-mono">
                              {formatNumber(rankineResults.efficiency, 1)} %
                            </td>
                          </tr>
                          <tr className="bg-yellow-50">
                            <td className="border px-3 py-2">η_Carnot</td>
                            <td className="border px-3 py-2 font-mono">
                              {formatNumber(rankineResults.carnotEfficiency, 1)} %
                            </td>
                          </tr>
                          <tr>
                            <td className="border px-3 py-2 text-xs text-slate-500" colSpan={2}>
                              η/η_Carnot ={" "}
                              {formatNumber(
                                (rankineResults.efficiency / rankineResults.carnotEfficiency) * 100,
                                1,
                              )}{" "}
                              %
                            </td>
                          </tr>
                        </>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {rankineStep === 4 && currentRankineResult ? renderExerciseCompletionMessage() : null}

              {rankineStep === 4 && currentRankineResult ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompletedExerciseId(selectedExercise?.id ?? null)}
                >
                  Concluir Exercício ✓
                </Button>
              ) : null}

              {currentRankineResult && rankineStep < 4 ? (
                <Button type="button" variant="outline" onClick={goToNextRankineStep}>
                  Próxima Etapa
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : selectedExercise?.id === "reactor-feed" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Runner guiado</p>
                  <h2 className="text-xl font-semibold">{selectedExercise.title}</h2>
                </div>
                <Button type="button" variant="outline" onClick={returnToCatalog}>
                  Voltar aos exercícios
                </Button>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Uma linha de alimentação conduz <strong>água a 80 °C</strong> até um reator.
                Dimensione a tubulação e calcule os requisitos da bomba centrífuga.
              </p>
            </CardHeader>
          </Card>

          {renderExerciseTrail(
            [
              "Propriedades do fluido",
              "Número de Reynolds",
              "Perda de carga (Darcy-Weisbach)",
              "NPSH disponível",
              "Altura manométrica total",
            ],
            reactorFeedStep,
            currentReactorFeedResult != null,
          )}

          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm text-muted-foreground">Etapa {reactorFeedStep + 1} de 5</p>
              <h3 className="text-lg font-semibold">
                {reactorFeedStep === 0 && "Etapa 1 — Propriedades do fluido"}
                {reactorFeedStep === 1 && "Etapa 2 — Número de Reynolds"}
                {reactorFeedStep === 2 && "Etapa 3 — Perda de carga (Darcy-Weisbach)"}
                {reactorFeedStep === 3 && "Etapa 4 — NPSH disponível"}
                {reactorFeedStep === 4 && "Etapa 5 — Altura manométrica total"}
              </h3>
            </CardHeader>
            <CardContent className="space-y-5">
              {reactorFeedStep === 0 ? (
                <form
                  className="grid gap-4 md:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runReactorFeedStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-fluid">
                    Fluido
                    <select
                      id="reactor-feed-fluid"
                      value={reactorFeedForm.fluid}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, fluid: event.target.value }))
                      }
                      className={inputClassName}
                    >
                      {fluids.map((fluid) => (
                        <option key={fluid} value={fluid}>
                          {fluid}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-temperature">
                    Temperatura (K)
                    <input
                      id="reactor-feed-temperature"
                      type="number"
                      step="0.01"
                      value={reactorFeedForm.temperature}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({
                          ...current,
                          temperature: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-pressure">
                    Pressão (Pa)
                    <input
                      id="reactor-feed-pressure"
                      type="number"
                      step="1"
                      value={reactorFeedForm.pressure}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({
                          ...current,
                          pressure: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-3">
                    <Button type="submit" disabled={loading}>
                      Consultar CoolProp
                    </Button>
                  </div>
                </form>
              ) : null}

              {reactorFeedStep === 1 ? (
                <form
                  className="grid gap-4 md:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runReactorFeedStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-flowrate">
                    Vazão volumétrica Q (m³/s)
                    <input
                      id="reactor-feed-flowrate"
                      type="number"
                      step="0.0001"
                      value={reactorFeedForm.flowrate}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, flowrate: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-schedule">
                    Schedule
                    <select
                      id="reactor-feed-schedule"
                      value={reactorFeedForm.schedule}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({
                          ...current,
                          schedule: event.target.value,
                          nps: "",
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="">Selecione</option>
                      {schedules.map((schedule) => (
                        <option key={schedule.name} value={schedule.name}>
                          {schedule.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-nps">
                    Diâmetro nominal (DN)
                    <select
                      id="reactor-feed-nps"
                      value={reactorFeedForm.nps}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, nps: event.target.value }))
                      }
                      className={inputClassName}
                    >
                      <option value="">Selecione</option>
                      {reactorFeedDiameters.map((diameter) => (
                        <option key={diameter} value={diameter}>
                          {diameter}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-velocity">
                    Velocidade (m/s)
                    <input
                      id="reactor-feed-velocity"
                      type="number"
                      step="0.1"
                      value={reactorFeedForm.velocity}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, velocity: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-3">
                    <Button type="submit" disabled={loading}>
                      Calcular Reynolds
                    </Button>
                  </div>
                </form>
              ) : null}

              {reactorFeedStep === 2 ? (
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runReactorFeedStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-material">
                    Material da tubulação
                    <select
                      id="reactor-feed-material"
                      value={reactorFeedForm.material}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, material: event.target.value }))
                      }
                      className={inputClassName}
                    >
                      <option value="">Selecione</option>
                      {compositions.map((composition) => (
                        <option key={composition} value={composition}>
                          {composition}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-length">
                    Comprimento L (m)
                    <input
                      id="reactor-feed-length"
                      type="number"
                      step="1"
                      value={reactorFeedForm.length}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, length: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={loading}>
                      Calcular Perda de Carga
                    </Button>
                  </div>
                </form>
              ) : null}

              {reactorFeedStep === 3 ? (
                <form
                  className="grid gap-4 md:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runReactorFeedStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-manometric">
                    Pressão manométrica (kgf/cm²)
                    <input
                      id="reactor-feed-manometric"
                      type="number"
                      step="0.01"
                      value={reactorFeedForm.manometricPressure}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({
                          ...current,
                          manometricPressure: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-atmospheric">
                    Pressão atmosférica (kgf/cm²)
                    <input
                      id="reactor-feed-atmospheric"
                      type="number"
                      step="0.001"
                      value={reactorFeedForm.atmosphericPressure}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({
                          ...current,
                          atmosphericPressure: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-gauge">
                    Cota z_s (m)
                    <input
                      id="reactor-feed-gauge"
                      type="number"
                      step="0.1"
                      value={reactorFeedForm.gaugeElevation}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({
                          ...current,
                          gaugeElevation: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-suction-velocity">
                    v entrada bomba (m/s)
                    <input
                      id="reactor-feed-suction-velocity"
                      type="number"
                      step="0.1"
                      value={reactorFeedForm.suctionVelocity}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({
                          ...current,
                          suctionVelocity: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-suction-loss">
                    Perda de carga na sucção (m)
                    <input
                      id="reactor-feed-suction-loss"
                      type="number"
                      step="0.1"
                      value={reactorFeedForm.suctionLoss}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({
                          ...current,
                          suctionLoss: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    P vapor calculada: {formatNumber(paToKgfCm2(reactorFeedResults.pvap ?? 47400), 4)} kgf/cm²
                  </div>
                  <div className="md:col-span-3">
                    <Button type="submit" disabled={loading}>
                      Calcular NPSH disponível
                    </Button>
                  </div>
                </form>
              ) : null}

              {reactorFeedStep === 4 ? (
                <form
                  className="grid gap-4 md:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runReactorFeedStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-pressure1">
                    P₁ sucção (Pa)
                    <input
                      id="reactor-feed-pressure1"
                      type="number"
                      step="1"
                      value={reactorFeedForm.pressure1}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, pressure1: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-pressure2">
                    P₂ descarga (Pa)
                    <input
                      id="reactor-feed-pressure2"
                      type="number"
                      step="1"
                      value={reactorFeedForm.pressure2}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, pressure2: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-elevation1">
                    z₁ sucção (m)
                    <input
                      id="reactor-feed-elevation1"
                      type="number"
                      step="0.1"
                      value={reactorFeedForm.elevation1}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, elevation1: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-elevation2">
                    z₂ descarga (m)
                    <input
                      id="reactor-feed-elevation2"
                      type="number"
                      step="0.1"
                      value={reactorFeedForm.elevation2}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, elevation2: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-velocity1">
                    v₁ (m/s)
                    <input
                      id="reactor-feed-velocity1"
                      type="number"
                      step="0.1"
                      value={reactorFeedForm.velocity1}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, velocity1: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="reactor-feed-velocity2">
                    v₂ (m/s)
                    <input
                      id="reactor-feed-velocity2"
                      type="number"
                      step="0.1"
                      value={reactorFeedForm.velocity2}
                      onChange={(event) =>
                        setReactorFeedForm((current) => ({ ...current, velocity2: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-3">
                    <Button type="submit" disabled={loading}>
                      Calcular Altura Manométrica
                    </Button>
                  </div>
                </form>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {currentReactorFeedResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {currentReactorFeedResult}
                </div>
              ) : null}

              {renderExerciseContextMessage()}

              {currentReactorFeedResult && reactorFeedStep < 4 ? (
                <Button type="button" variant="outline" onClick={goToNextReactorFeedStep}>
                  Próxima Etapa
                </Button>
              ) : null}

              {reactorFeedStep === 4 && currentReactorFeedResult ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompletedExerciseId(selectedExercise?.id ?? null)}
                >
                  Concluir Exercício ✓
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : selectedExercise?.id === "series-reactors" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Runner guiado</p>
                  <h2 className="text-xl font-semibold">{selectedExercise.title}</h2>
                </div>
                <Button type="button" variant="outline" onClick={returnToCatalog}>
                  Voltar aos exercícios
                </Button>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Reação A→B de <strong>1ª ordem em fase líquida</strong> com <strong>k = 0,5</strong>.
                Compare as sequências <strong>PFR→CSTR</strong> e <strong>CSTR→PFR</strong> para
                decidir qual pede menor volume total para a mesma conversão final.
              </p>
            </CardHeader>
          </Card>

          {renderExerciseTrail(
            [
              "Gráfico de Levenspiel",
              "V_PFR₁",
              "V_CSTR₂ e V_total",
              "V_CSTR₁",
              "V_PFR₂ e V_total",
              "Comparação e decisão",
            ],
            seriesReactorsStep,
            currentSeriesReactorsResult != null,
          )}

          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm text-muted-foreground">Etapa {seriesReactorsStep + 1} de 6</p>
              <h3 className="text-lg font-semibold">
                {seriesReactorsStep === 0 && "Etapa 1 — Gráfico de Levenspiel (X vs V)"}
                {seriesReactorsStep === 1 && "Etapa 2 — V_PFR₁ (0 → X_int)"}
                {seriesReactorsStep === 2 && "Etapa 3 — V_CSTR₂ e V_total (PFR→CSTR)"}
                {seriesReactorsStep === 3 && "Etapa 4 — V_CSTR₁ (0 → X_int)"}
                {seriesReactorsStep === 4 && "Etapa 5 — V_PFR₂ e V_total (CSTR→PFR)"}
                {seriesReactorsStep === 5 && "Etapa 6 — Comparação e decisão"}
              </h3>
            </CardHeader>
            <CardContent className="space-y-5">
              {seriesReactorsStep === 0 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runSeriesReactorsStep();
                  }}
                >
                  <p className="text-sm text-slate-600">
                    Visualize primeiro a diferença volumétrica entre CSTR e PFR isolados para a
                    mesma cinética antes de combinar os reatores em série.
                  </p>
                  <Button type="submit" disabled={loading}>
                    Gerar Gráfico de Levenspiel
                  </Button>
                </form>
              ) : null}

              {seriesReactorsStep === 0 && seriesReactorsResults.chartReady ? (
                <LevenspielChart
                  points={seriesReactorsChart.points}
                  cstrOperatingPoint={seriesReactorsChart.cstrOperatingPoint}
                  pfrOperatingPoint={seriesReactorsChart.pfrOperatingPoint}
                  maxConversion={seriesReactorsChart.maxConversion}
                />
              ) : null}

              {seriesReactorsStep === 0 && seriesReactorsResults.levenspielImage ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <img
                    alt="Diagrama de Levenspiel"
                    src={seriesReactorsResults.levenspielImage}
                    className="h-auto w-full"
                  />
                </div>
              ) : null}

              {seriesReactorsStep === 1 ? (
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runSeriesReactorsStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="series-reactors-xint">
                    X_int
                    <input
                      id="series-reactors-xint"
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="0.85"
                      value={seriesReactorsForm.intermediateConversion}
                      onChange={(event) =>
                        setSeriesReactorsForm((current) => ({
                          ...current,
                          intermediateConversion: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="series-reactors-xfin">
                    X_final
                    <input
                      id="series-reactors-xfin"
                      type="number"
                      step="0.01"
                      min="0.6"
                      max="0.97"
                      value={seriesReactorsForm.finalConversion}
                      onChange={(event) =>
                        setSeriesReactorsForm((current) => ({
                          ...current,
                          finalConversion: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={loading}>
                      Calcular V_PFR₁
                    </Button>
                  </div>
                </form>
              ) : null}

              {seriesReactorsStep === 2 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runSeriesReactorsStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    V_PFR₁ = {formatNumber(seriesReactorsResults.pfr1Volume ?? 0, 5)} m³ (0 →{" "}
                    {formatNumber(seriesReactorsResults.intermediateConversion ?? 0, 2)})
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para a sequência PFR→CSTR, o segundo volume é obtido a partir do CSTR total em
                    X_final, ponderado pelo trecho `X_int → X_final`.
                  </p>
                  <Button type="submit" disabled={loading}>
                    Calcular V_CSTR₂ e V_total
                  </Button>
                </form>
              ) : null}

              {seriesReactorsStep === 3 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runSeriesReactorsStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    Configuração CSTR→PFR · X_int ={" "}
                    {formatNumber(seriesReactorsResults.intermediateConversion ?? 0, 2)}
                  </div>
                  <Button type="submit" disabled={loading}>
                    Calcular V_CSTR₁
                  </Button>
                </form>
              ) : null}

              {seriesReactorsStep === 4 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runSeriesReactorsStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    V_CSTR₁ = {formatNumber(seriesReactorsResults.cstr1Volume ?? 0, 5)} m³ (0 →{" "}
                    {formatNumber(seriesReactorsResults.intermediateConversion ?? 0, 2)})
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para a sequência CSTR→PFR, o segundo PFR é a diferença entre os volumes totais
                    de PFR em `X_final` e `X_int`.
                  </p>
                  <Button type="submit" disabled={loading}>
                    Calcular V_PFR₂ e V_total
                  </Button>
                </form>
              ) : null}

              {seriesReactorsStep === 5 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runSeriesReactorsStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    <p>
                      PFR→CSTR: {formatNumber(seriesReactorsResults.pfrCstrTotal ?? 0, 5)} m³
                    </p>
                    <p className="mt-2">
                      CSTR→PFR: {formatNumber(seriesReactorsResults.cstrPfrTotal ?? 0, 5)} m³
                    </p>
                  </div>
                  <Button type="submit" disabled={loading}>
                    Ver comparação
                  </Button>
                </form>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {currentSeriesReactorsResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {currentSeriesReactorsResult}
                </div>
              ) : null}

              {renderExerciseContextMessage()}

              {seriesReactorsResults.pfrCstrTotal !== undefined &&
              seriesReactorsResults.cstrPfrTotal !== undefined ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="border px-3 py-2 text-left">Configuração</th>
                        <th className="border px-3 py-2">V_total (m³)</th>
                        {(seriesReactorsResults.pfr1Residence != null ||
                          seriesReactorsResults.cstr1Residence != null ||
                          seriesReactorsResults.pfr2Residence != null ||
                          seriesReactorsResults.cstr2Residence != null) ? (
                          <th className="border px-3 py-2">τ_total (s)</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const winner =
                          seriesReactorsResults.pfrCstrTotal < seriesReactorsResults.cstrPfrTotal
                            ? "PFR→CSTR"
                            : "CSTR→PFR";
                        const tauPfrCstr =
                          seriesReactorsResults.pfr1Residence != null &&
                          seriesReactorsResults.cstr2Residence != null
                            ? seriesReactorsResults.pfr1Residence + seriesReactorsResults.cstr2Residence
                            : null;
                        const tauCstrPfr =
                          seriesReactorsResults.cstr1Residence != null &&
                          seriesReactorsResults.pfr2Residence != null
                            ? seriesReactorsResults.cstr1Residence + seriesReactorsResults.pfr2Residence
                            : null;

                        return (
                          <>
                            <tr className={winner === "PFR→CSTR" ? "bg-emerald-50" : ""}>
                              <td className="border px-3 py-2 font-medium">PFR→CSTR</td>
                              <td className="border px-3 py-2 font-mono">
                                {formatNumber(seriesReactorsResults.pfrCstrTotal, 5)}
                              </td>
                              {tauPfrCstr != null ? (
                                <td className="border px-3 py-2 font-mono">{formatNumber(tauPfrCstr, 1)}</td>
                              ) : null}
                            </tr>
                            <tr className={winner === "CSTR→PFR" ? "bg-emerald-50" : ""}>
                              <td className="border px-3 py-2 font-medium">CSTR→PFR</td>
                              <td className="border px-3 py-2 font-mono">
                                {formatNumber(seriesReactorsResults.cstrPfrTotal, 5)}
                              </td>
                              {tauCstrPfr != null ? (
                                <td className="border px-3 py-2 font-mono">{formatNumber(tauCstrPfr, 1)}</td>
                              ) : null}
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                  <div className="border-t bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    Recomendado:{" "}
                    {seriesReactorsResults.pfrCstrTotal < seriesReactorsResults.cstrPfrTotal
                      ? "PFR→CSTR"
                      : "CSTR→PFR"}
                  </div>
                </div>
              ) : null}

              {seriesReactorsStep === 5 && currentSeriesReactorsResult
                ? renderExerciseCompletionMessage()
                : null}

              {seriesReactorsStep === 5 && currentSeriesReactorsResult ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompletedExerciseId(selectedExercise?.id ?? null)}
                >
                  Concluir Exercício ✓
                </Button>
              ) : null}

              {currentSeriesReactorsResult && seriesReactorsStep < 5 ? (
                <Button type="button" variant="outline" onClick={goToNextSeriesReactorsStep}>
                  Próxima Etapa
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : selectedExercise?.id === "balance-simple" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Runner guiado</p>
                  <h2 className="text-xl font-semibold">{selectedExercise.title}</h2>
                </div>
                <Button type="button" variant="outline" onClick={returnToCatalog}>
                  Voltar aos exercícios
                </Button>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Reação <strong>A → B</strong> em regime estacionário. A alimentação contém{" "}
                <strong>100 kg/h de A puro</strong> e não há reciclo, então a conversão global é
                igual à conversão por passagem.
              </p>
            </CardHeader>
          </Card>

          {renderExerciseTrail(["Calcular balanço de massa", "Rendimentos"], balanceSimpleStep, currentBalanceSimpleResult != null)}

          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm text-muted-foreground">Etapa {balanceSimpleStep + 1} de 2</p>
              <h3 className="text-lg font-semibold">
                {balanceSimpleStep === 0 && "Etapa 1 — Calcular balanço de massa"}
                {balanceSimpleStep === 1 && "Etapa 2 — Rendimentos"}
              </h3>
              <p className="text-sm text-slate-600">
                {balanceSimpleStep === 0 &&
                  "Defina a conversão e feche as correntes de alimentação e produto do sistema sem reciclo."}
                {balanceSimpleStep === 1 &&
                  "Calcule o rendimento de B produzido a partir de A consumido para o mesmo caso."}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {balanceSimpleStep === 0 ? (
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runBalanceSimpleStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-medium">Sistema: A → B (sem reciclo)</p>
                    <p className="mt-2">Alimentação fresca: 100 kg/h · zA = 1,0 · zB = 0,0</p>
                  </div>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="balance-simple-conversion">
                    Conversão X (0-1)
                    <input
                      id="balance-simple-conversion"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="0.99"
                      value={balanceSimpleForm.conversion}
                      onChange={(event) =>
                        setBalanceSimpleForm((current) => ({
                          ...current,
                          conversion: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={loading}>
                      Calcular Balanço
                    </Button>
                  </div>
                </form>
              ) : null}

              {balanceSimpleStep === 1 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runBalanceSimpleStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    <p>
                      Conversão adotada:{" "}
                      <strong>{formatNumber(balanceSimpleResults.conversion ?? 0, 2)}</strong>
                    </p>
                    <p className="mt-2">
                      Em um sistema sem reciclo, o rendimento esperado acompanha diretamente a
                      conversão do reagente limitante.
                    </p>
                  </div>
                  <Button type="submit" disabled={loading}>
                    Calcular Rendimentos
                  </Button>
                </form>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {currentBalanceSimpleResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {currentBalanceSimpleResult}
                </div>
              ) : null}

              {renderExerciseContextMessage()}

              {balanceSimpleResults.plotImage ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <img
                    alt="Diagrama de correntes de massa"
                    src={balanceSimpleResults.plotImage}
                    className="h-auto w-full"
                  />
                </div>
              ) : null}

              {renderBalanceResultsTable(balanceSimpleResults.results)}

              {balanceSimpleStep === 1 && currentBalanceSimpleResult
                ? renderExerciseCompletionMessage()
                : null}

              {balanceSimpleStep === 1 && currentBalanceSimpleResult ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompletedExerciseId(selectedExercise?.id ?? null)}
                >
                  Concluir Exercício ✓
                </Button>
              ) : null}

              {currentBalanceSimpleResult && balanceSimpleStep < 1 ? (
                <Button type="button" variant="outline" onClick={goToNextBalanceSimpleStep}>
                  Próxima Etapa
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : selectedExercise?.id === "balance-recycle" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Runner guiado</p>
                  <h2 className="text-xl font-semibold">{selectedExercise.title}</h2>
                </div>
                <Button type="button" variant="outline" onClick={returnToCatalog}>
                  Voltar aos exercícios
                </Button>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Reação <strong>A → B</strong> com reciclo. Parta de uma alimentação fresca de{" "}
                <strong>100 kg/h de A</strong> e observe como o retorno do reagente não convertido
                aumenta a conversão global do sistema.
              </p>
            </CardHeader>
          </Card>

          {renderExerciseTrail(
            ["Calcular balanço com reciclo", "Comparação com e sem reciclo", "Rendimentos"],
            balanceRecycleStep,
            currentBalanceRecycleResult != null,
          )}

          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm text-muted-foreground">Etapa {balanceRecycleStep + 1} de 3</p>
              <h3 className="text-lg font-semibold">
                {balanceRecycleStep === 0 && "Etapa 1 — Calcular balanço com reciclo"}
                {balanceRecycleStep === 1 && "Etapa 2 — Comparação com e sem reciclo"}
                {balanceRecycleStep === 2 && "Etapa 3 — Rendimentos"}
              </h3>
            </CardHeader>
            <CardContent className="space-y-5">
              {balanceRecycleStep === 0 ? (
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runBalanceRecycleStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="balance-recycle-conversion">
                    X por passagem (0-1)
                    <input
                      id="balance-recycle-conversion"
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="0.95"
                      value={balanceRecycleForm.conversion}
                      onChange={(event) =>
                        setBalanceRecycleForm((current) => ({
                          ...current,
                          conversion: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800" htmlFor="balance-recycle-fraction">
                    Fração de reciclo f (0-1)
                    <input
                      id="balance-recycle-fraction"
                      type="number"
                      step="0.05"
                      min="0"
                      max="0.95"
                      value={balanceRecycleForm.recycleFraction}
                      onChange={(event) =>
                        setBalanceRecycleForm((current) => ({
                          ...current,
                          recycleFraction: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={loading}>
                      Calcular Balanço
                    </Button>
                  </div>
                </form>
              ) : null}

              {balanceRecycleStep === 1 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runBalanceRecycleStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    <p>
                      X por passagem = <strong>{formatNumber(balanceRecycleResults.conversion ?? 0, 2)}</strong>
                    </p>
                    <p className="mt-2">
                      A comparação abaixo usa o mesmo reator sem a malha de reciclo para quantificar
                      o ganho de conversão global.
                    </p>
                  </div>
                  <Button type="submit" disabled={loading}>
                    Calcular sistema sem reciclo para comparação
                  </Button>
                </form>
              ) : null}

              {balanceRecycleStep === 2 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runBalanceRecycleStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    <p>
                      O rendimento global de B considera a malha de reciclo já calculada nas etapas
                      anteriores.
                    </p>
                  </div>
                  <Button type="submit" disabled={loading}>
                    Calcular Rendimentos
                  </Button>
                </form>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {currentBalanceRecycleResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {currentBalanceRecycleResult}
                </div>
              ) : null}

              {renderExerciseContextMessage()}

              {balanceRecycleResults.plotImage ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <img
                    alt="Diagrama de correntes de massa"
                    src={balanceRecycleResults.plotImage}
                    className="h-auto w-full"
                  />
                </div>
              ) : null}

              {renderBalanceResultsTable(balanceRecycleResults.results)}

              {balanceRecycleStep === 2 && currentBalanceRecycleResult
                ? renderExerciseCompletionMessage()
                : null}

              {balanceRecycleStep === 2 && currentBalanceRecycleResult ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompletedExerciseId(selectedExercise?.id ?? null)}
                >
                  Concluir Exercício ✓
                </Button>
              ) : null}

              {currentBalanceRecycleResult && balanceRecycleStep < 2 ? (
                <Button type="button" variant="outline" onClick={goToNextBalanceRecycleStep}>
                  Próxima Etapa
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : selectedExercise?.id === "balance-purge" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Runner guiado</p>
                  <h2 className="text-xl font-semibold">{selectedExercise.title}</h2>
                </div>
                <Button type="button" variant="outline" onClick={returnToCatalog}>
                  Voltar aos exercícios
                </Button>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Reação <strong>A → B</strong> com inerte <strong>I</strong>. O feed contém{" "}
                <strong>A = 0,8</strong> e <strong>I = 0,2</strong>; sem purga, o inerte tende a
                se acumular no circuito de reciclo.
              </p>
            </CardHeader>
          </Card>

          {renderExerciseTrail(
            [
              "Sem purga: o problema do acúmulo",
              "Com purga: regime estacionário controlado",
              "Rendimentos com purga",
            ],
            balancePurgeStep,
            currentBalancePurgeResult != null,
          )}

          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm text-muted-foreground">Etapa {balancePurgeStep + 1} de 3</p>
              <h3 className="text-lg font-semibold">
                {balancePurgeStep === 0 && "Etapa 1 — Sem purga: o problema do acúmulo"}
                {balancePurgeStep === 1 && "Etapa 2 — Com purga: regime estacionário controlado"}
                {balancePurgeStep === 2 && "Etapa 3 — Rendimentos com purga"}
              </h3>
            </CardHeader>
            <CardContent className="space-y-5">
              {balancePurgeStep === 0 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runBalancePurgeStep();
                  }}
                >
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
                    <p>
                      <strong>Sistema:</strong> Alimentação fresca: A = 0,8; I = 0,2
                    </p>
                    <p className="mt-2">
                      Reação A → B com conversão por passagem de 0,7 e fração de reciclo
                      praticamente unitária.
                    </p>
                  </div>
                  <Button type="submit" disabled={loading}>
                    Simular sem purga (f = 0,999)
                  </Button>
                </form>
              ) : null}

              {balancePurgeStep === 1 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runBalancePurgeStep();
                  }}
                >
                  <label className="block text-sm font-medium text-slate-800" htmlFor="balance-purge-fraction">
                    Fração de reciclo f (&lt; 1)
                    <input
                      id="balance-purge-fraction"
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="0.95"
                      value={balancePurgeForm.recycleFraction}
                      onChange={(event) =>
                        setBalancePurgeForm((current) => ({
                          ...current,
                          recycleFraction: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    `1 - f` representa a fração drenada pela purga/produto.
                  </p>
                  <Button type="submit" disabled={loading}>
                    Calcular com purga
                  </Button>
                </form>
              ) : null}

              {balancePurgeStep === 2 ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runBalancePurgeStep();
                  }}
                >
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    <p>
                      O rendimento global agora considera as perdas de reagente associadas à purga
                      necessária para controlar o inerte.
                    </p>
                  </div>
                  <Button type="submit" disabled={loading}>
                    Calcular Rendimentos
                  </Button>
                </form>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {currentBalancePurgeResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {currentBalancePurgeResult}
                </div>
              ) : null}

              {renderExerciseContextMessage()}

              {balancePurgeResults.plotImage ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <img
                    alt="Diagrama de correntes de massa"
                    src={balancePurgeResults.plotImage}
                    className="h-auto w-full"
                  />
                </div>
              ) : null}

              {renderBalanceResultsTable(balancePurgeResults.results)}

              {balancePurgeStep === 2 && currentBalancePurgeResult
                ? renderExerciseCompletionMessage()
                : null}

              {balancePurgeStep === 2 && currentBalancePurgeResult ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompletedExerciseId(selectedExercise?.id ?? null)}
                >
                  Concluir Exercício ✓
                </Button>
              ) : null}

              {currentBalancePurgeResult && balancePurgeStep < 2 ? (
                <Button type="button" variant="outline" onClick={goToNextBalancePurgeStep}>
                  Próxima Etapa
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Catálogo legado de exercícios</h2>
            <p className="text-sm text-muted-foreground">
              O runner guiado está sendo migrado exercício por exercício. O primeiro fluxo já está
              disponível.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {exerciseCatalog.map((exercise) => (
              <Card key={exercise.id} className="border-slate-200">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{exercise.title}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {exercise.stepCount} etapas
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{exercise.description}</p>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant={exercise.available ? "default" : "outline"}
                    disabled={!exercise.available}
                    onClick={() => openExercise(exercise)}
                  >
                    Abrir {exercise.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
        </section>
    </ModuleTabsLayout>
  );
}
