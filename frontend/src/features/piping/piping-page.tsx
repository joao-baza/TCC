import { useEffect, useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";

import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PropertyTable, type PropertyRow } from "@/components/property-table";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { toSelectOption, type SelectOption } from "@/lib/select-option";
import { pipingTabs } from "@/features/piping/piping-tabs";

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

type QuantityValue = {
  value: number;
  units: string;
};

type DetailValue = QuantityValue | string | number | null | undefined;

type DetailRecord = Record<string, DetailValue | Record<string, DetailValue>>;

type CompositionDetails = {
  name: string;
  description: string;
  applications: string;
  specifications: DetailRecord;
};

type FittingDetails = {
  name: string;
  description: string;
  usage: string;
  specifications: DetailRecord;
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400";

function isQuantityValue(value: unknown): value is QuantityValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "units" in value
  );
}

function formatLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function detailValueToRow(label: string, value: DetailValue): PropertyRow {
  if (isQuantityValue(value)) {
    return {
      label,
      value: value.value,
      units: value.units,
    };
  }

  if (typeof value === "number" || typeof value === "string") {
    return { label, value };
  }

  return { label, value: "—" };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha ao processar a solicitação.";
}

function buildDetailRows(details: DetailRecord | null | undefined): PropertyRow[] {
  if (!details) {
    return [];
  }

  return Object.entries(details).flatMap(([key, value]) => {
    if (isQuantityValue(value) || typeof value === "number" || typeof value === "string") {
      return [detailValueToRow(formatLabel(key), value)];
    }

    if (typeof value === "object" && value !== null) {
      return Object.entries(value as Record<string, DetailValue>).map(([nestedKey, nestedValue]) =>
        detailValueToRow(formatLabel(nestedKey), nestedValue),
      );
    }

    return [detailValueToRow(formatLabel(key), value)];
  });
}

function buildCompositionRows(details: CompositionDetails): PropertyRow[] {
  return [
    detailValueToRow("Nome", details.name),
    detailValueToRow("Descrição", details.description),
    detailValueToRow("Aplicações", details.applications),
    ...buildDetailRows(details.specifications),
  ];
}

function buildFittingRows(details: FittingDetails): PropertyRow[] {
  return [
    detailValueToRow("Nome", details.name),
    detailValueToRow("Descrição", details.description),
    detailValueToRow("Uso", details.usage),
    ...buildDetailRows(details.specifications),
  ];
}

type PipingPageContext = {
  compositions: SelectOption[];
  schedules: Schedule[];
  fittings: SelectOption[];
  diameters: DiameterOption[];
  selectedComposition: string;
  selectedSchedule: string;
  selectedDiameter: string;
  selectedFitting: string;
  compositionDetails: CompositionDetails | null;
  diameterDetails: DetailRecord | null;
  fittingDetails: FittingDetails | null;
  catalogError: string | null;
  setSelectedComposition: (value: string) => void;
  setSelectedSchedule: (value: string) => void;
  setSelectedDiameter: (value: string) => void;
  setSelectedFitting: (value: string) => void;
};

function usePipingPageContext() {
  return useOutletContext<PipingPageContext>();
}

export function PipingPage() {
  const [compositions, setCompositions] = useState<SelectOption[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [fittings, setFittings] = useState<SelectOption[]>([]);
  const [diameters, setDiameters] = useState<DiameterOption[]>([]);

  const [selectedComposition, setSelectedComposition] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [selectedDiameter, setSelectedDiameter] = useState("");
  const [selectedFitting, setSelectedFitting] = useState("");

  const [compositionDetails, setCompositionDetails] =
    useState<CompositionDetails | null>(null);
  const [diameterDetails, setDiameterDetails] = useState<DetailRecord | null>(null);
  const [fittingDetails, setFittingDetails] = useState<FittingDetails | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCatalog() {
      setCatalogError(null);

      try {
        const [compositionResponse, scheduleResponse, fittingResponse] =
          await Promise.all([
            apiClient.get<Array<string | SelectOption>>("/piping/compositions"),
            apiClient.get<ScheduleResponse[]>("/piping/schedules"),
            apiClient.get<Array<string | SelectOption>>("/piping/fittings"),
          ]);

        if (ignore) {
          return;
        }

        setCompositions(compositionResponse.map(toSelectOption));
        setSchedules(
          scheduleResponse.map((schedule) =>
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
        setFittings(fittingResponse.map(toSelectOption));
      } catch (error) {
        if (ignore) {
          return;
        }

        setCatalogError(
          error instanceof Error ? error.message : "Falha ao carregar o catálogo.",
        );
      }
    }

    void loadCatalog();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setCompositionDetails(null);

    if (!selectedComposition) {
      return;
    }

    let ignore = false;

    async function loadComposition() {
      try {
        const encodedName = encodeURIComponent(selectedComposition);
        const response = await apiClient.get<CompositionDetails>(
          `/piping/composition/${encodedName}`,
        );

        if (!ignore) {
          setCompositionDetails(response);
        }
      } catch (error) {
        if (!ignore) {
          setCompositionDetails(null);
          notify.error(`Erro ao carregar detalhes da composição: ${getErrorMessage(error)}`);
        }
      }
    }

    void loadComposition();

    return () => {
      ignore = true;
    };
  }, [selectedComposition]);

  useEffect(() => {
    setDiameters([]);
    setSelectedDiameter("");
    setDiameterDetails(null);

    if (!selectedSchedule) {
      return;
    }

    let ignore = false;

    async function loadDiameters() {
      try {
        const encodedSchedule = encodeURIComponent(selectedSchedule);
        const response = await apiClient.get<Record<string, DiameterOption>>(
          `/piping/schedule/${encodedSchedule}/diameters`,
        );

        if (!ignore) {
          setDiameters(Object.values(response));
        }
      } catch (error) {
        if (!ignore) {
          setDiameters([]);
          setSelectedDiameter("");
          setDiameterDetails(null);
          notify.error(`Erro ao carregar diâmetros do schedule: ${getErrorMessage(error)}`);
        }
      }
    }

    void loadDiameters();

    return () => {
      ignore = true;
    };
  }, [selectedSchedule]);

  useEffect(() => {
    if (!selectedSchedule || !selectedDiameter) {
      setDiameterDetails(null);
      return;
    }

    let ignore = false;

    async function loadDiameterDetails() {
      try {
        const encodedSchedule = encodeURIComponent(selectedSchedule);
        const response = await apiClient.get<DetailRecord>(
          `/piping/schedule/${encodedSchedule}/diameter/${selectedDiameter}`,
        );

        if (!ignore) {
          setDiameterDetails(response);
        }
      } catch (error) {
        if (!ignore) {
          setDiameterDetails(null);
          notify.error(`Erro ao carregar detalhes do diâmetro: ${getErrorMessage(error)}`);
        }
      }
    }

    void loadDiameterDetails();

    return () => {
      ignore = true;
    };
  }, [selectedSchedule, selectedDiameter]);

  useEffect(() => {
    setFittingDetails(null);

    if (!selectedFitting) {
      return;
    }

    let ignore = false;

    async function loadFittingDetails() {
      try {
        const encodedName = encodeURIComponent(selectedFitting);
        const response = await apiClient.get<FittingDetails>(
          `/piping/fitting/${encodedName}`,
        );

        if (!ignore) {
          setFittingDetails(response);
        }
      } catch (error) {
        if (!ignore) {
          setFittingDetails(null);
          notify.error(`Erro ao carregar detalhes da conexão: ${getErrorMessage(error)}`);
        }
      }
    }

    void loadFittingDetails();

    return () => {
      ignore = true;
    };
  }, [selectedFitting]);

  const context: PipingPageContext = {
    compositions,
    schedules,
    fittings,
    diameters,
    selectedComposition,
    selectedSchedule,
    selectedDiameter,
    selectedFitting,
    compositionDetails,
    diameterDetails,
    fittingDetails,
    catalogError,
    setSelectedComposition,
    setSelectedSchedule,
    setSelectedDiameter,
    setSelectedFitting,
  };

  return (
    <ModuleTabsLayout
      title="Tubulações e Acessórios"
      subtitle={
        <>
          <p>
            Consulte materiais, schedules, diâmetros nominais e conexões usadas nos módulos
            hidráulicos da aplicação.
          </p>
          {catalogError ? <p className="text-destructive">{catalogError}</p> : null}
        </>
      }
      tabs={pipingTabs}
    >
      <Outlet context={context} />
    </ModuleTabsLayout>
  );
}

function PipingCompositionsTab() {
  const {
    compositions,
    selectedComposition,
    setSelectedComposition,
    compositionDetails,
  } = usePipingPageContext();

  return (
    <Card>
      <CardHeader title="Composições" />
      <CardContent className="space-y-4">
        <Combobox
          label="Composição"
          options={compositions}
          value={selectedComposition}
          onValueChange={setSelectedComposition}
          placeholder="Selecione uma composição"
        />

        {compositionDetails ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Resultado
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <PropertyTable rows={buildCompositionRows(compositionDetails)} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PipingSchedulesDiametersTab() {
  const {
    schedules,
    diameters,
    selectedSchedule,
    selectedDiameter,
    setSelectedSchedule,
    setSelectedDiameter,
    diameterDetails,
  } = usePipingPageContext();

  return (
    <Card>
      <CardHeader title="Schedules e Diâmetros" />
      <CardContent className="space-y-4">
        <Combobox
          label="Schedule"
          options={schedules.map((schedule) => ({
            value: schedule.name,
            label: schedule.label,
          }))}
          value={selectedSchedule}
          onValueChange={setSelectedSchedule}
          placeholder="Selecione um schedule"
        />

        {selectedSchedule ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-muted-foreground">
            {schedules.find((schedule) => schedule.name === selectedSchedule)?.description}
          </p>
        ) : null}

        <Combobox
          label="Diâmetro nominal"
          options={diameters.map((diameter) => ({
            value: String(diameter.nominal_diameter),
            label: `${diameter.nominal_diameter} ${diameter.units}`,
          }))}
          value={selectedDiameter}
          onValueChange={setSelectedDiameter}
          placeholder="Selecione um diâmetro"
          disabled={!selectedSchedule}
        />

        {diameterDetails ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Resultado
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <PropertyTable rows={buildDetailRows(diameterDetails)} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PipingConnectionsTab() {
  const { fittings, selectedFitting, setSelectedFitting, fittingDetails } = usePipingPageContext();

  return (
    <Card>
      <CardHeader title="Conexões" />
      <CardContent className="space-y-4">
        <Combobox
          label="Conexão"
          options={fittings}
          value={selectedFitting}
          onValueChange={setSelectedFitting}
          placeholder="Selecione uma conexão"
        />

        {fittingDetails ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Resultado
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <PropertyTable rows={buildFittingRows(fittingDetails)} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { PipingCompositionsTab, PipingConnectionsTab, PipingSchedulesDiametersTab };
