import { formatTableNumberText } from "@/lib/table-number";

type StreamDatum = {
  name: string;
  direction: string;
  flowRate: number;
  compositions: Record<string, number>;
};

function formatFlow(value: number) {
  return `${formatTableNumberText(value)} u. cons.`;
}

function formatCompositionSummary(compositions: Record<string, number>) {
  return Object.entries(compositions)
    .slice(0, 2)
    .map(([component, value]) => `${component}: ${formatTableNumberText(value)}`)
    .join(" · ");
}

export function StreamGraph({
  streams,
}: {
  streams: StreamDatum[];
}) {
  const sortedStreams = [...streams].sort((left, right) => right.flowRate - left.flowRate);
  const maxFlow = Math.max(...sortedStreams.map((stream) => stream.flowRate), 1);

  return (
    <div
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="stream-graph"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Gráfico de Correntes</h3>
          <p className="text-sm text-muted-foreground">
            Visual local para comparar vazões e composições das correntes fechadas.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedStreams.map((stream) => (
          <div key={stream.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{stream.name}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {stream.direction}
                </p>
              </div>
              <p className="text-sm font-medium text-slate-900">{formatFlow(stream.flowRate)}</p>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: `${(stream.flowRate / maxFlow) * 100}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-slate-700">
              {formatCompositionSummary(stream.compositions)}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
