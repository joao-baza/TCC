import {
  formatMassBalanceStreamName,
  MASS_BALANCE_FLOW_UNIT_EXPLANATION,
  MASS_BALANCE_FLOW_UNIT_LABEL,
} from "@/lib/mass-balance-display";
import { formatTableNumberText } from "@/lib/table-number";

type StreamTableRow = {
  name: string;
  direction: string;
  flowRate: number;
  compositions: Record<string, number>;
};

type StreamTableProps = {
  streams: StreamTableRow[];
  title?: string;
};

function formatFlow(value: number) {
  return `${formatTableNumberText(value)} ${MASS_BALANCE_FLOW_UNIT_LABEL}`;
}

function formatCompositionSummary(compositions: Record<string, number>) {
  const summary = Object.entries(compositions)
    .slice(0, 3)
    .map(([component, value]) => `${component}: ${formatTableNumberText(value)}`)
    .join(" · ");

  return summary || "-";
}

export function StreamTable({ streams, title = "Tabela de correntes" }: StreamTableProps) {
  const sortedStreams = [...streams].sort((left, right) => right.flowRate - left.flowRate);

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="stream-table"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Resumo textual das correntes fechadas para leitura rápida e comparação.
          </p>
          <p className="text-xs text-muted-foreground">{MASS_BALANCE_FLOW_UNIT_EXPLANATION}</p>
        </div>
        <p className="text-sm font-medium text-slate-700">{sortedStreams.length} correntes</p>
      </div>

      {sortedStreams.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table aria-label={title} className="min-w-full divide-y divide-slate-200 bg-white">
            <thead className="bg-slate-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  scope="col"
                >
                  Corrente
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  scope="col"
                >
                  Sentido
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  scope="col"
                >
                  Vazão
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  scope="col"
                >
                  Composição
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedStreams.map((stream) => (
                <tr key={stream.name} className="bg-white">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900" scope="row">
                    {formatMassBalanceStreamName(stream.name)}
                  </th>
                  <td className="px-4 py-3 text-sm text-slate-700">{stream.direction}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{formatFlow(stream.flowRate)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatCompositionSummary(stream.compositions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-muted-foreground">
          Nenhuma corrente calculada.
        </div>
      )}
    </section>
  );
}
