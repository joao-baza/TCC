import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RemoveButton } from "@/components/remove-button";
import { MassBalanceNativeChart } from "@/components/viz/mass-balance-native-chart";
import { StreamTable } from "@/components/viz/stream-table";
import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { BalanceHowItWorks } from "@/features/balance/didactics";
import { balanceWorkedExample } from "@/features/balance/presets";
import { balanceTabs } from "@/features/balance/balance-tabs";
import { apiClient } from "@/lib/api";
import {
  formatMassBalanceStreamName,
  MASS_BALANCE_FLOW_UNIT_EXPLANATION,
  MASS_BALANCE_FLOW_UNIT_LABEL,
} from "@/lib/mass-balance-display";
import {
  formatMassBalanceYieldLabel,
  getMassBalanceResults,
  getMassBalanceStreamCompositions,
  getMassBalanceStreamFlow,
  getMassBalanceYields,
  type MassBalanceResultsResponse,
  type MassBalanceYieldResponse,
} from "@/lib/mass-balance";
import { notify } from "@/lib/notify";
import type { ChartModel } from "@/types/chart-model";
import { formatNumber as formatNumericValue } from "@/lib/units";

type StreamForm = {
  name: string;
  direction: 1 | -1;
  flow_rate: string;
  compositions: Record<string, string>;
};

type ReactionForm = {
  key_component: string;
  conversion: string;
  stoichiometry: Record<string, string>;
};

type SplitForm = {
  parent_stream: string;
  recycle_stream: string;
  purge_stream: string;
  fraction: string;
};

type MassBalanceExample = {
  components: string[];
  streams: Array<{
    name: string;
    direction: 1 | -1;
    flow_rate?: number | null;
    compositions: Record<string, number | null>;
  }>;
  reactions?: Array<{
    stoichiometry: Record<string, number>;
    key_component: string;
    conversion: number;
  }>;
  splits?: Array<{
    parent_stream: string;
    recycle_stream: string;
    purge_stream: string;
    fraction: number;
  }>;
};

type BalanceResultsResponse = MassBalanceResultsResponse;

type YieldResponse = MassBalanceYieldResponse;

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function createStream(components: string[]): StreamForm {
  return {
    name: "",
    direction: 1,
    flow_rate: "",
    compositions: Object.fromEntries(components.map((component) => [component, ""])),
  };
}

function createReaction(components: string[]): ReactionForm {
  return {
    key_component: components[0] ?? "",
    conversion: "",
    stoichiometry: Object.fromEntries(components.map((component) => [component, ""])),
  };
}

function createSplit(): SplitForm {
  return {
    parent_stream: "",
    recycle_stream: "",
    purge_stream: "",
    fraction: "",
  };
}

function syncStreamWithComponents(stream: StreamForm, components: string[]): StreamForm {
  return {
    ...stream,
    compositions: Object.fromEntries(
      components.map((component) => [component, stream.compositions[component] ?? ""]),
    ),
  };
}

function syncReactionWithComponents(reaction: ReactionForm, components: string[]): ReactionForm {
  return {
    ...reaction,
    key_component: components.includes(reaction.key_component)
      ? reaction.key_component
      : (components[0] ?? ""),
    stoichiometry: Object.fromEntries(
      components.map((component) => [component, reaction.stoichiometry[component] ?? ""]),
    ),
  };
}

function formatYieldLabel(key: string) {
  return formatMassBalanceYieldLabel(key);
}

function parseYieldRelationKey(key: string) {
  const match = key.match(/^(.+?)(?:_from_|_a_partir_de_)(.+)$/);
  if (!match) {
    return null;
  }

  const [, targetComponent, sourceComponent] = match;
  return { targetComponent, sourceComponent };
}

function formatNumber(value: number, digits = 2) {
  return formatNumericValue(Number(value), digits);
}

function parseOptionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha ao processar a solicitação.";
}

function buildPayload(
  components: string[],
  streams: StreamForm[],
  reactions: ReactionForm[],
  splits: SplitForm[],
) {
  return {
    components,
    streams: streams
      .filter((stream) => stream.name.trim())
      .map((stream) => ({
        name: stream.name.trim(),
        direction: stream.direction,
        flow_rate: parseOptionalNumber(stream.flow_rate),
        compositions: Object.fromEntries(
          components.map((component) => [
            component,
            parseOptionalNumber(stream.compositions[component] ?? ""),
          ]),
        ),
      })),
    reactions: reactions
      .filter(
        (reaction) =>
          reaction.key_component &&
          reaction.conversion.trim() &&
          Object.values(reaction.stoichiometry).some((value) => value.trim()),
      )
      .map((reaction) => ({
        key_component: reaction.key_component,
        conversion: Number(reaction.conversion),
        stoichiometry: Object.fromEntries(
          components
            .map((component) => [
              component,
              reaction.stoichiometry[component]?.trim()
                ? Number(reaction.stoichiometry[component])
                : null,
            ])
            .filter((entry): entry is [string, number] => entry[1] !== null),
        ),
      })),
    splits: splits
      .filter(
        (split) =>
          split.parent_stream.trim() &&
          split.recycle_stream.trim() &&
          split.purge_stream.trim() &&
          split.fraction.trim(),
      )
      .map((split) => ({
        parent_stream: split.parent_stream.trim(),
        recycle_stream: split.recycle_stream.trim(),
        purge_stream: split.purge_stream.trim(),
        fraction: Number(split.fraction),
      })),
  };
}

type MassBalancePayload = ReturnType<typeof buildPayload>;

function mapExampleState(example: MassBalanceExample) {
  return {
    components: [...example.components],
    streams: example.streams.map((stream) => ({
      name: stream.name,
      direction: stream.direction,
      flow_rate:
        stream.flow_rate === null || stream.flow_rate === undefined ? "" : String(stream.flow_rate),
      compositions: Object.fromEntries(
        example.components.map((component) => [
          component,
          stream.compositions[component] === null || stream.compositions[component] === undefined
            ? ""
            : String(stream.compositions[component]),
        ]),
      ),
    })),
    reactions: (example.reactions ?? []).map((reaction) => ({
      key_component: reaction.key_component,
      conversion: String(reaction.conversion),
      stoichiometry: Object.fromEntries(
        example.components.map((component) => [
          component,
          reaction.stoichiometry[component] === undefined
            ? ""
            : String(reaction.stoichiometry[component]),
        ]),
      ),
    })),
    splits: (example.splits ?? []).map((split) => ({
      parent_stream: split.parent_stream,
      recycle_stream: split.recycle_stream,
      purge_stream: split.purge_stream,
      fraction: String(split.fraction),
    })),
  };
}

function EmptyBalanceState({ message }: { message: string }) {
  return (
    <div className="mt-4 flex min-h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
      {message}
    </div>
  );
}

export function BalancePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [newComponent, setNewComponent] = useState("");
  const [components, setComponents] = useState<string[]>([]);
  const [streams, setStreams] = useState<StreamForm[]>([]);
  const [reactions, setReactions] = useState<ReactionForm[]>([]);
  const [splits, setSplits] = useState<SplitForm[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [yieldError, setYieldError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [balanceResult, setBalanceResult] = useState<BalanceResultsResponse | null>(null);
  const [yieldResult, setYieldResult] = useState<YieldResponse | null>(null);
  const [balanceChart, setBalanceChart] = useState<ChartModel | null>(null);
  const streamOptions = useMemo(
    () =>
      streams
        .map((stream) => stream.name.trim())
        .filter(Boolean)
        .map((name) => ({ value: name, label: name })),
    [streams],
  );
  const balanceSessionRef = useRef(0);
  const legacyResultTabs = new Set(["actions", "yields"]);
  const pathnameTab = pathname.startsWith("/balance/")
    ? pathname.slice("/balance/".length).split("/")[0] || "components"
    : "components";
  const activeTab = legacyResultTabs.has(pathnameTab) || balanceTabs.some((tab) => tab.to === pathnameTab)
    ? legacyResultTabs.has(pathnameTab)
      ? "results"
      : pathnameTab
    : "components";

  const streamDirectionLookup = useMemo(
    () =>
      new Map(
        streams
          .filter((stream) => stream.name.trim())
          .map((stream) => [
            stream.name.trim(),
            stream.direction === 1 ? "Entrada" : "Saída",
          ]),
      ),
    [streams],
  );

  const resolvedStreams = useMemo(
    () =>
      Object.entries(getMassBalanceResults(balanceResult)).map(([streamName, result]) => ({
        name: streamName,
        direction: streamDirectionLookup.get(streamName) ?? "—",
        flowRate: getMassBalanceStreamFlow(result),
        compositions: getMassBalanceStreamCompositions(result),
      })),
    [balanceResult, streamDirectionLookup],
  );

  const resolvedComponents = useMemo(() => {
    const componentSet = new Set<string>();

    for (const stream of resolvedStreams) {
      for (const component of Object.keys(stream.compositions)) {
        componentSet.add(component);
      }
    }

    return Array.from(componentSet);
  }, [resolvedStreams]);

  const yieldMatrixComponents = useMemo(() => {
    const matrixComponents = new Set<string>();
    let hasReactionComponents = false;
    for (const reaction of reactions) {
      for (const [component, coefficient] of Object.entries(reaction.stoichiometry)) {
        if (!coefficient.trim()) {
          continue;
        }

        if (Number(coefficient) !== 0) {
          matrixComponents.add(component);
          hasReactionComponents = true;
        }
      }
    }

    for (const key of Object.keys(getMassBalanceYields(yieldResult))) {
      const relation = parseYieldRelationKey(key);
      if (!relation) {
        continue;
      }
      matrixComponents.add(relation.sourceComponent);
      if (!hasReactionComponents) {
        matrixComponents.add(relation.targetComponent);
      }
    }

    if (matrixComponents.size) {
      return components.length
        ? components.filter((component) => matrixComponents.has(component))
        : Array.from(matrixComponents);
    }

    return components;
  }, [components, reactions, yieldResult]);

  const yieldMatrix = useMemo(() => {
    const matrix = new Map<string, Map<string, number>>();

    for (const [key, value] of Object.entries(getMassBalanceYields(yieldResult))) {
      const relation = parseYieldRelationKey(key);
      if (!relation) {
        continue;
      }

      if (!matrix.has(relation.targetComponent)) {
        matrix.set(relation.targetComponent, new Map<string, number>());
      }

      matrix.get(relation.targetComponent)?.set(relation.sourceComponent, value);
    }

    return matrix;
  }, [yieldResult]);

  const pageAction = (
    <Button type="button" onClick={loadExample}>
      Carregar exemplo
    </Button>
  );

  useEffect(() => {
    if (pathname === "/balance") {
      navigate("components", { replace: true });
      return;
    }

    if (pathname === "/balance/actions" || pathname === "/balance/yields") {
      navigate("/balance/results", { replace: true });
    }
  }, [navigate, pathname]);

  const payload = useMemo(
    () => buildPayload(components, streams, reactions, splits),
    [components, reactions, splits, streams],
  );

  function clearDerived() {
    balanceSessionRef.current += 1;
    setResultError(null);
    setYieldError(null);
    setChartError(null);
    setBalanceResult(null);
    setYieldResult(null);
    setBalanceChart(null);
  }

  function applyMappedExample(nextState: ReturnType<typeof mapExampleState>) {
    setComponents(nextState.components);
    setStreams(nextState.streams);
    setReactions(nextState.reactions);
    setSplits(nextState.splits);
  }

  async function runMassBalanceCalculation(
    requestPayload: MassBalancePayload,
    sessionId: number = balanceSessionRef.current,
  ) {
    const response = await apiClient.post<BalanceResultsResponse>("/mass-balance/calculate", {
      ...requestPayload,
      reactions: requestPayload.reactions.length ? requestPayload.reactions : null,
      splits: requestPayload.splits.length ? requestPayload.splits : null,
    });

    if (sessionId !== balanceSessionRef.current) {
      return null;
    }

    setBalanceResult(response);
    return response;
  }

  async function runYieldCalculation(
    requestPayload: MassBalancePayload,
    sessionId: number = balanceSessionRef.current,
  ) {
    const response = await apiClient.post<YieldResponse>("/mass-balance/yields", {
      ...requestPayload,
      reactions: requestPayload.reactions.length ? requestPayload.reactions : null,
      splits: requestPayload.splits.length ? requestPayload.splits : null,
    });

    if (sessionId !== balanceSessionRef.current) {
      return null;
    }

    setYieldResult(response);
    return response;
  }

  async function loadExample() {
    clearDerived();
    setPageError(null);
    const nextState = mapExampleState(balanceWorkedExample);
    const nextPayload = buildPayload(
      nextState.components,
      nextState.streams,
      nextState.reactions,
      nextState.splits,
    );
    const sessionId = balanceSessionRef.current;

    applyMappedExample(nextState);

    try {
      await runMassBalanceCalculation(nextPayload, sessionId);
      await runYieldCalculation(nextPayload, sessionId);
      await loadBalanceChart(sessionId, nextPayload);
      notify.success("Exemplo carregado com sucesso.");
    } catch (error) {
      const message = getErrorMessage(error);
      if (sessionId === balanceSessionRef.current) {
        setPageError(message);
      }
      notify.error(`Erro ao carregar exemplo: ${message}`);
    }
  }

  function addComponentFromInput() {
    const name = newComponent.trim();
    if (!name || components.includes(name)) {
      if (components.includes(name)) {
        notify.error(`O componente ${name} já existe`);
      }
      return;
    }

    clearDerived();
    const nextComponents = [...components, name];
    setComponents(nextComponents);
    setStreams((current) => current.map((stream) => syncStreamWithComponents(stream, nextComponents)));
    setReactions((current) =>
      current.map((reaction) => syncReactionWithComponents(reaction, nextComponents)),
    );
    setNewComponent("");
  }

  function removeComponent(componentName: string) {
    clearDerived();
    const nextComponents = components.filter((component) => component !== componentName);
    setComponents(nextComponents);
    setStreams((current) => current.map((stream) => syncStreamWithComponents(stream, nextComponents)));
    setReactions((current) =>
      current.map((reaction) => syncReactionWithComponents(reaction, nextComponents)),
    );
  }

  function addStream() {
    clearDerived();
    setStreams((current) => [...current, createStream(components)]);
  }

  function addReaction() {
    clearDerived();
    setReactions((current) => [...current, createReaction(components)]);
  }

  function addSplit() {
    clearDerived();
    setSplits((current) => [...current, createSplit()]);
  }

  async function calculateMassBalance() {
    const sessionId = balanceSessionRef.current;
    navigate("/balance/results");
    setResultError(null);
    setYieldError(null);
    setChartError(null);
    setBalanceResult(null);
    setYieldResult(null);
    setBalanceChart(null);

    try {
      const balanceResponse = await runMassBalanceCalculation(payload, sessionId);
      if (sessionId !== balanceSessionRef.current || !balanceResponse) {
        return;
      }

    } catch (error) {
      if (sessionId !== balanceSessionRef.current) {
        return;
      }

      const message = getErrorMessage(error);
      setResultError(message);
      notify.error(`Erro ao calcular balanço de massa: ${message}`);
      return;
    }

    try {
      const yieldResponse = await runYieldCalculation(payload, sessionId);
      if (sessionId !== balanceSessionRef.current || !yieldResponse) {
        return;
      }
    } catch (error) {
      if (sessionId !== balanceSessionRef.current) {
        return;
      }

      const message = getErrorMessage(error);
      setYieldError(message);
      notify.error(`Erro ao calcular rendimentos: ${message}`);
      return;
    }

    await loadBalanceChart(sessionId, payload);
  }

  async function loadBalanceChart(
    sessionId: number,
    requestPayload: MassBalancePayload = payload,
  ) {
    try {
      const response = await apiClient.post<ChartModel>("/mass-balance/chart", {
        ...requestPayload,
        reactions: requestPayload.reactions.length ? requestPayload.reactions : null,
        splits: requestPayload.splits.length ? requestPayload.splits : null,
      });

      if (sessionId !== balanceSessionRef.current) {
        return;
      }

      setBalanceChart(response);
    } catch (error) {
      if (sessionId !== balanceSessionRef.current) {
        return;
      }

      const message = getErrorMessage(error);
      setChartError(message);
      notify.error(`Erro ao gerar gráfico do balanço: ${message}`);
    }
  }

  return (
    <ModuleTabsLayout
      title="Balanço de Massa"
      subtitle={
        <>
          <p>
            Configure componentes, correntes, reações e reciclos no mesmo fluxo do módulo original,
            agora com resultados organizados e visual local de correntes calculadas.
          </p>
          {pageError ? <p className="text-red-600">{pageError}</p> : null}
        </>
      }
      action={pageAction}
      tabs={balanceTabs}
    >
      {activeTab === "components" ? (
        <Card>
          <CardHeader title="Componentes" />
          <CardContent className="space-y-4">
            <label className="block text-sm font-medium text-slate-800" htmlFor="component-name">
              Nome do componente
              <div className="mt-2 flex gap-2">
                <input
                  id="component-name"
                  className={inputClassName}
                  placeholder="Ex.: A"
                  value={newComponent}
                  onChange={(event) => setNewComponent(event.target.value)}
                />
                <Button type="button" onClick={addComponentFromInput}>
                  Adicionar
                </Button>
              </div>
            </label>
            {components.length ? (
              <div className="flex flex-wrap gap-2">
                {components.map((component) => (
                  <div
                    key={component}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-800"
                  >
                    <span>{component}</span>
                    <RemoveButton
                      label={`Remover componente ${component}`}
                      onClick={() => removeComponent(component)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Adicione componentes para habilitar composições e estequiometria.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "streams" ? (
        <Card>
          <CardHeader
            title="Correntes"
            action={
              <Button type="button" onClick={addStream}>
                Adicionar Corrente
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {streams.length ? (
              streams.map((stream, streamIndex) => (
                <div
                  key={`stream-${streamIndex}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Corrente {streamIndex + 1}
                    </h3>
                    <RemoveButton
                      label={`Remover corrente ${streamIndex + 1}`}
                      onClick={() => {
                        clearDerived();
                        setStreams((current) => current.filter((_, index) => index !== streamIndex));
                      }}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block text-sm font-medium text-slate-800">
                      Nome
                      <input
                        className={inputClassName}
                        value={stream.name}
                        onChange={(event) => {
                          clearDerived();
                          setStreams((current) =>
                            current.map((item, index) =>
                              index === streamIndex ? { ...item, name: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                    </label>
                    <Combobox
                      label="Direção"
                      options={[
                        { value: "1", label: "Entrada" },
                        { value: "-1", label: "Saída" },
                      ]}
                      value={String(stream.direction)}
                      onValueChange={(nextDirection) => {
                        if (!nextDirection) {
                          return;
                        }
                        clearDerived();
                        setStreams((current) =>
                          current.map((item, index) =>
                            index === streamIndex
                              ? { ...item, direction: Number(nextDirection) as 1 | -1 }
                              : item,
                          ),
                        );
                      }}
                    />
                    <label className="block text-sm font-medium text-slate-800">
                      Vazão
                      <input
                        className={inputClassName}
                        type="number"
                        step="any"
                        value={stream.flow_rate}
                        onChange={(event) => {
                          clearDerived();
                          setStreams((current) =>
                            current.map((item, index) =>
                              index === streamIndex ? { ...item, flow_rate: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {components.map((component) => (
                      <label
                        key={`${streamIndex}-${component}`}
                        className="block text-sm font-medium text-slate-800"
                      >
                        {component}
                        <input
                          className={inputClassName}
                          type="number"
                          step="any"
                          value={stream.compositions[component] ?? ""}
                          onChange={(event) => {
                            clearDerived();
                            setStreams((current) =>
                              current.map((item, index) =>
                                index === streamIndex
                                  ? {
                                      ...item,
                                      compositions: {
                                        ...item.compositions,
                                        [component]: event.target.value,
                                      },
                                    }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <EmptyBalanceState message="Adicione uma corrente" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "reactions" ? (
        <Card>
          <CardHeader
            title="Reações"
            action={
              <Button type="button" onClick={addReaction}>
                Adicionar Reação
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {reactions.length ? (
              reactions.map((reaction, reactionIndex) => (
                <div
                  key={`reaction-${reactionIndex}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Reação {reactionIndex + 1}
                    </h3>
                    <RemoveButton
                      label={`Remover reação ${reactionIndex + 1}`}
                      onClick={() => {
                        clearDerived();
                        setReactions((current) => current.filter((_, index) => index !== reactionIndex));
                      }}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Combobox
                      label="Componente-chave"
                      options={components.map((component) => ({ value: component, label: component }))}
                      value={reaction.key_component}
                      onValueChange={(nextComponent) => {
                        if (!nextComponent) return;
                        clearDerived();
                        setReactions((current) =>
                          current.map((item, index) =>
                            index === reactionIndex
                              ? { ...item, key_component: nextComponent }
                              : item,
                          ),
                        );
                      }}
                      placeholder="Selecione um componente"
                    />
                    <label className="block text-sm font-medium text-slate-800">
                      Conversão (0-1)
                      <input
                        className={inputClassName}
                        type="number"
                        min="0"
                        max="1"
                        step="any"
                        value={reaction.conversion}
                        onChange={(event) => {
                          clearDerived();
                          setReactions((current) =>
                            current.map((item, index) =>
                              index === reactionIndex ? { ...item, conversion: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {components.map((component) => (
                      <label
                        key={`${reactionIndex}-${component}-stoich`}
                        className="block text-sm font-medium text-slate-800"
                      >
                        {component}
                        <input
                          className={inputClassName}
                          type="number"
                          step="any"
                          value={reaction.stoichiometry[component] ?? ""}
                          onChange={(event) => {
                            clearDerived();
                            setReactions((current) =>
                              current.map((item, index) =>
                                index === reactionIndex
                                  ? {
                                      ...item,
                                      stoichiometry: {
                                        ...item.stoichiometry,
                                        [component]: event.target.value,
                                      },
                                    }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <EmptyBalanceState message="Adicione uma reação" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "splits-recycle" ? (
        <Card>
          <CardHeader
            title="Splits / Reciclo"
            action={
              <Button type="button" onClick={addSplit}>
                Adicionar Split
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {splits.length ? (
              splits.map((split, splitIndex) => (
                <div
                  key={`split-${splitIndex}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Split {splitIndex + 1}
                    </h3>
                    <RemoveButton
                      label={`Remover split ${splitIndex + 1}`}
                      onClick={() => {
                        clearDerived();
                        setSplits((current) => current.filter((_, index) => index !== splitIndex));
                      }}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Combobox
                      label="Corrente pai"
                      options={streamOptions}
                      value={split.parent_stream}
                      placeholder="Selecione uma corrente"
                      emptyText="Nenhuma corrente criada"
                      disabled={!streamOptions.length}
                      onValueChange={(nextValue) => {
                        clearDerived();
                        setSplits((current) =>
                          current.map((item, index) =>
                            index === splitIndex ? { ...item, parent_stream: nextValue } : item,
                          ),
                        );
                      }}
                    />
                    <Combobox
                      label="Corrente de reciclo"
                      options={streamOptions}
                      value={split.recycle_stream}
                      placeholder="Selecione uma corrente"
                      emptyText="Nenhuma corrente criada"
                      disabled={!streamOptions.length}
                      onValueChange={(nextValue) => {
                        clearDerived();
                        setSplits((current) =>
                          current.map((item, index) =>
                            index === splitIndex ? { ...item, recycle_stream: nextValue } : item,
                          ),
                        );
                      }}
                    />
                    <Combobox
                      label="Corrente de purga"
                      options={streamOptions}
                      value={split.purge_stream}
                      placeholder="Selecione uma corrente"
                      emptyText="Nenhuma corrente criada"
                      disabled={!streamOptions.length}
                      onValueChange={(nextValue) => {
                        clearDerived();
                        setSplits((current) =>
                          current.map((item, index) =>
                            index === splitIndex ? { ...item, purge_stream: nextValue } : item,
                          ),
                        );
                      }}
                    />
                    <label className="block text-sm font-medium text-slate-800">
                      Fração de reciclo (0-1)
                      <input
                        className={inputClassName}
                        type="number"
                        min="0"
                        max="1"
                        step="any"
                        value={split.fraction}
                        onChange={(event) => {
                          clearDerived();
                          setSplits((current) =>
                            current.map((item, index) =>
                              index === splitIndex ? { ...item, fraction: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBalanceState message="Adicione um split / reciclo" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "results" ? (
        <Card>
          <CardHeader
            title="Resultados do Balanço"
            action={
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => void calculateMassBalance()}>
                  Calcular Balanço de Massa
                </Button>
              </div>
            }
          />
          <CardContent className="space-y-4">
            <BalanceHowItWorks />
            {resultError ? <p className="text-sm text-red-600">{resultError}</p> : null}
            {chartError ? <p className="text-sm text-red-600">{chartError}</p> : null}
            {yieldError ? <p className="text-sm text-red-600">{yieldError}</p> : null}
            {balanceChart ? (
              <div data-testid="mass-balance-chart">
                <MassBalanceNativeChart
                  chartModel={balanceChart}
                  components={resolvedComponents}
                  streams={resolvedStreams}
                />
              </div>
            ) : null}
            {balanceResult ? (
              <div className="grid gap-4">
                <StreamTable
                  streams={resolvedStreams}
                  title="Tabela de correntes calculadas"
                />
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="text-lg font-semibold text-slate-900">Composição detalhada por corrente</h3>
                    <p className="text-sm text-muted-foreground">
                      Tabela comparativa para leitura numérica das frações resolvidas.
                    </p>
                    <p className="text-xs text-muted-foreground">{MASS_BALANCE_FLOW_UNIT_EXPLANATION}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table
                      aria-label="Composição detalhada por corrente"
                      className="min-w-full divide-y divide-slate-200 text-sm"
                    >
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground" scope="col">
                            Corrente
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground" scope="col">
                            Vazão
                          </th>
                          {resolvedComponents.map((component) => (
                            <th
                              key={`component-header-${component}`}
                              className="px-4 py-3 text-left font-semibold text-muted-foreground"
                              scope="col"
                            >
                              {component}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {resolvedStreams.map((stream) => (
                          <tr key={`resolved-stream-${stream.name}`} className="bg-white">
                            <th className="px-4 py-3 text-left font-semibold text-slate-900" scope="row">
                              {formatMassBalanceStreamName(stream.name)}
                            </th>
                            <td className="px-4 py-3 text-slate-900">
                              {formatNumber(stream.flowRate)} {MASS_BALANCE_FLOW_UNIT_LABEL}
                            </td>
                            {resolvedComponents.map((component) => (
                              <td
                                key={`resolved-stream-${stream.name}-${component}`}
                                className="px-4 py-3 text-slate-700"
                              >
                                {formatNumber(stream.compositions[component] ?? 0, 4)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : (
              <EmptyBalanceState message="Execute o cálculo para visualizar vazões e composições fechadas." />
            )}
            {yieldResult ? (
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Rendimentos</h3>
                  <p className="text-sm text-muted-foreground">
                    O componente produzido aparece no eixo vertical e o componente de referência no eixo horizontal.
                  </p>
                </div>
                <div className="max-h-[28rem] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                  <table
                    aria-label="Matriz de rendimentos"
                    className="min-w-full divide-y divide-slate-200 text-sm"
                  >
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground" scope="col">
                          Produto
                        </th>
                        {yieldMatrixComponents.map((component) => (
                          <th
                            key={`yield-column-${component}`}
                            className="px-4 py-3 text-left font-semibold text-muted-foreground"
                            scope="col"
                          >
                            {component}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {yieldMatrixComponents.map((targetComponent) => (
                        <tr key={`yield-row-${targetComponent}`} className="bg-white">
                          <th className="px-4 py-3 text-left font-semibold text-slate-900" scope="row">
                            {targetComponent}
                          </th>
                          {yieldMatrixComponents.map((sourceComponent) => {
                            const value = yieldMatrix.get(targetComponent)?.get(sourceComponent);
                            return (
                              <td
                                key={`yield-cell-${targetComponent}-${sourceComponent}`}
                                className="px-4 py-3 text-slate-700"
                              >
                                {value === undefined ? "—" : `${value.toFixed(2)}%`}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </ModuleTabsLayout>
  );
}
