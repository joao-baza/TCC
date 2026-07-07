import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RemoveButton } from "@/components/remove-button";
import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { TernaryDiagram } from "@/components/viz/ternary-diagram";
import { ProcessSankey } from "@/components/viz/process-sankey";
import { RecyclePurgeMap } from "@/components/viz/recycle-purge-map";
import { StreamGraph } from "@/components/viz/stream-graph";
import { StreamTable } from "@/components/viz/stream-table";
import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import type { Scenario } from "@/features/exploratory/types";
import { balanceExploratory } from "@/features/exploratory/templates";
import { BalanceHowItWorks } from "@/features/balance/didactics";
import { balanceWorkedExample } from "@/features/balance/presets";
import { balanceTabs } from "@/features/balance/balance-tabs";
import { apiClient } from "@/lib/api";
import {
  formatMassBalanceMetricLabel,
  formatMassBalanceYieldLabel,
  getMassBalanceMetrics,
  getMassBalanceResults,
  getMassBalanceStreamCompositions,
  getMassBalanceStreamFlow,
  getMassBalanceYields,
  type MassBalanceResultsResponse,
  type MassBalanceYieldResponse,
} from "@/lib/mass-balance";
import { notify } from "@/lib/notify";
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

function formatMetricLabel(key: string) {
  return formatMassBalanceMetricLabel(key);
}

function formatYieldLabel(key: string) {
  return formatMassBalanceYieldLabel(key);
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

function applyExploratoryOverrides(example: MassBalanceExample, fields: Record<string, string>) {
  const mapped = mapExampleState(example);
  const splitFraction = fields["split-fraction"];
  const feedMainFraction = fields["feed-main-fraction"];
  const mainComponent = mapped.components[0];
  const secondaryComponent = mapped.components[1];

  if (splitFraction && mapped.splits[0]) {
    mapped.splits[0] = { ...mapped.splits[0], fraction: splitFraction };
  }

  if (feedMainFraction && mapped.streams[0] && mainComponent) {
    mapped.streams[0] = {
      ...mapped.streams[0],
      compositions: {
        ...mapped.streams[0].compositions,
        [mainComponent]: feedMainFraction,
        ...(secondaryComponent
          ? {
              [secondaryComponent]: String((1 - Number(feedMainFraction)).toFixed(2)).replace(
                /\.?0+$/,
                "",
              ),
            }
          : {}),
      },
    };
  }

  return mapped;
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
  const [balanceResult, setBalanceResult] = useState<BalanceResultsResponse | null>(null);
  const [yieldResult, setYieldResult] = useState<YieldResponse | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const balanceSessionRef = useRef(0);
  const pathnameTab = pathname.startsWith("/balance/")
    ? pathname.slice("/balance/".length).split("/")[0] || "components"
    : "components";
  const activeTab = balanceTabs.some((tab) => tab.to === pathnameTab)
    ? pathnameTab
    : "components";

  useEffect(() => {
    if (pathname === "/balance") {
      navigate("components", { replace: true });
    }
  }, [navigate, pathname]);

  const payload = useMemo(
    () => buildPayload(components, streams, reactions, splits),
    [components, reactions, splits, streams],
  );

  const streamGraphData = useMemo(() => {
    if (!balanceResult) {
      return [];
    }

    const results = getMassBalanceResults(balanceResult);

    return Object.entries(results).map(([streamName, result]) => {
      const sourceStream = streams.find((stream) => stream.name === streamName);
      return {
        name: streamName,
        direction: sourceStream?.direction === -1 ? "Saída" : "Entrada",
        flowRate: getMassBalanceStreamFlow(result),
        compositions: getMassBalanceStreamCompositions(result),
      };
    });
  }, [balanceResult, streams]);

  const recyclePurgeMapData = useMemo(
    () =>
      splits.map((split) => ({
        parentStream: split.parent_stream,
        recycleStream: split.recycle_stream,
        purgeStream: split.purge_stream,
        fraction: Number(split.fraction),
      })),
    [splits],
  );

  function clearDerived() {
    balanceSessionRef.current += 1;
    setResultError(null);
    setYieldError(null);
    setBalanceResult(null);
    setYieldResult(null);
  }

  function applyMappedExample(nextState: ReturnType<typeof mapExampleState>) {
    setComponents(nextState.components);
    setStreams(nextState.streams);
    setReactions(nextState.reactions);
    setSplits(nextState.splits);
  }

  function loadExample() {
    clearDerived();
    setPageError(null);
    applyMappedExample(mapExampleState(balanceWorkedExample));
    notify.success("Exemplo carregado com sucesso.");
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
    setResultError(null);
    setBalanceResult(null);

    try {
      const response = await apiClient.post<BalanceResultsResponse>("/mass-balance/calculate", {
        ...payload,
        reactions: payload.reactions.length ? payload.reactions : null,
        splits: payload.splits.length ? payload.splits : null,
      });

      if (sessionId !== balanceSessionRef.current) {
        return;
      }

      setBalanceResult(response);
    } catch (error) {
      if (sessionId !== balanceSessionRef.current) {
        return;
      }

      const message = getErrorMessage(error);
      setResultError(message);
      notify.error(`Erro ao calcular balanço de massa: ${message}`);
    }
  }

  async function calculateYields() {
    const sessionId = balanceSessionRef.current;
    setYieldError(null);
    setYieldResult(null);

    try {
      const response = await apiClient.post<YieldResponse>("/mass-balance/yields", {
        ...payload,
        reactions: payload.reactions.length ? payload.reactions : null,
        splits: payload.splits.length ? payload.splits : null,
      });

      if (sessionId !== balanceSessionRef.current) {
        return;
      }

      setYieldResult(response);
    } catch (error) {
      if (sessionId !== balanceSessionRef.current) {
        return;
      }

      const message = getErrorMessage(error);
      setYieldError(message);
      notify.error(`Erro ao calcular rendimentos: ${message}`);
    }
  }

  async function generatePlot() {
    if (!balanceResult) {
      await calculateMassBalance();
    }
  }

  function applyExploratoryFields(fields: Record<string, string>) {
    clearDerived();
    applyMappedExample(applyExploratoryOverrides(balanceWorkedExample, fields));
  }

  function changeExploratoryField(field: string, value: string) {
    clearDerived();

    if (field === "split-fraction") {
      setSplits((current) =>
        current.map((split, index) => (index === 0 ? { ...split, fraction: value } : split)),
      );
      return;
    }

    if (field === "feed-main-fraction") {
      const mainComponent = components[0];
      const secondaryComponent = components[1];
      if (!mainComponent) {
        return;
      }

      setStreams((current) =>
        current.map((stream, index) =>
          index === 0
            ? {
                ...stream,
                compositions: {
                  ...stream.compositions,
                  [mainComponent]: value,
                  ...(secondaryComponent
                    ? {
                        [secondaryComponent]: String((1 - Number(value)).toFixed(2)).replace(
                          /\.?0+$/,
                          "",
                        ),
                      }
                    : {}),
                },
              }
            : stream,
        ),
      );
    }
  }

  function describeScenario() {
    return `R=${splits[0]?.fraction || "—"} · ${components[0] || "A"}=${streams[0]?.compositions[components[0]] || "—"}`;
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
      action={
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={loadExample}>
            Carregar exemplo
          </Button>
          <Button type="button" variant="outline" onClick={addStream}>
            Adicionar Corrente
          </Button>
          <Button type="button" variant="outline" onClick={addReaction}>
            Adicionar Reação
          </Button>
          <Button type="button" variant="outline" onClick={addSplit}>
            Adicionar Split
          </Button>
        </div>
      }
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

      {activeTab === "actions" ? (
        <Card>
          <CardHeader title="Ações" />
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use o exemplo para carregar um caso com alimentação, reação e reciclo.</p>
            <p>Depois execute cálculo, rendimentos e o gráfico local com o mesmo conjunto de dados.</p>
            <BalanceHowItWorks />
            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="button" onClick={() => void calculateMassBalance()}>
                Calcular Balanço de Massa
              </Button>
              <Button type="button" variant="outline" onClick={() => void calculateYields()}>
                Calcular Rendimentos
              </Button>
              <Button type="button" variant="outline" onClick={() => void generatePlot()}>
                Gerar Gráfico de Correntes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "streams" ? (
        <Card>
          <CardHeader title="Correntes" />
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
              <p className="text-sm text-muted-foreground">
                Nenhuma corrente configurada. Use o exemplo ou adicione manualmente.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "reactions" ? (
        <Card>
          <CardHeader title="Reações" />
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
              <p className="text-sm text-muted-foreground">
                Adicione uma reação para informar estequiometria e conversão.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "splits-recycle" ? (
        <Card>
          <CardHeader title="Splits / Reciclo" />
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
                    <label className="block text-sm font-medium text-slate-800">
                      Corrente pai
                      <input
                        className={inputClassName}
                        value={split.parent_stream}
                        onChange={(event) => {
                          clearDerived();
                          setSplits((current) =>
                            current.map((item, index) =>
                              index === splitIndex ? { ...item, parent_stream: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-800">
                      Corrente de reciclo
                      <input
                        className={inputClassName}
                        value={split.recycle_stream}
                        onChange={(event) => {
                          clearDerived();
                          setSplits((current) =>
                            current.map((item, index) =>
                              index === splitIndex ? { ...item, recycle_stream: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-800">
                      Corrente de purga
                      <input
                        className={inputClassName}
                        value={split.purge_stream}
                        onChange={(event) => {
                          clearDerived();
                          setSplits((current) =>
                            current.map((item, index) =>
                              index === splitIndex ? { ...item, purge_stream: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                    </label>
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
              <p className="text-sm text-muted-foreground">
                Adicione um split para modelar reciclo e purga.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "exploratory" ? (
        <>
          <ExploratoryPanel
            config={balanceExploratory}
            state={{
              applyFields: applyExploratoryFields,
              changeField: changeExploratoryField,
              describeScenario,
            }}
            onScenariosChange={setSavedScenarios}
          >
            {() =>
              balanceResult ? (
                <div className="space-y-6">
                  <StreamGraph streams={streamGraphData} scenarios={savedScenarios} />
                  <ProcessSankey streams={streamGraphData} />
                  <TernaryDiagram components={components} streams={streamGraphData} />
                </div>
              ) : null
            }
          </ExploratoryPanel>

          <div className="grid gap-6 xl:grid-cols-2">
            <RecyclePurgeMap splits={recyclePurgeMapData} />
            <StreamTable streams={streamGraphData} />
          </div>
        </>
      ) : null}

      {activeTab === "results" ? (
        <Card>
          <CardHeader title="Resultados do Balanço" />
          <CardContent className="space-y-4">
            {resultError ? <p className="text-sm text-red-600">{resultError}</p> : null}
            {Object.keys(getMassBalanceMetrics(balanceResult)).length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {Object.entries(getMassBalanceMetrics(balanceResult)).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {formatMetricLabel(key)}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {key.includes("ratio") ? formatNumber(value) : `${formatNumber(value)} u. cons.`}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {balanceResult ? (
              <div className="grid gap-4">
                {Object.entries(getMassBalanceResults(balanceResult)).map(([streamName, result]) => (
                  <div key={streamName} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-slate-900">{streamName}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatNumber(getMassBalanceStreamFlow(result))} u. cons.
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {Object.entries(getMassBalanceStreamCompositions(result)).map(
                        ([component, value]) => (
                          <div key={`${streamName}-${component}`} className="rounded-xl border bg-white p-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              {component}
                            </dt>
                            <dd className="mt-1 text-sm text-slate-900">{value.toFixed(4)}</dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Execute o cálculo para visualizar vazões e composições fechadas.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "yields" ? (
        <Card>
          <CardHeader title="Rendimentos" />
          <CardContent className="space-y-4">
            {yieldError ? <p className="text-sm text-red-600">{yieldError}</p> : null}
            {yieldResult ? (
              <div className="grid gap-3">
                {Object.entries(getMassBalanceYields(yieldResult)).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {formatYieldLabel(key)}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">{value.toFixed(2)}%</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Execute o cálculo de rendimentos para comparar produtos e reagentes.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </ModuleTabsLayout>
  );
}
