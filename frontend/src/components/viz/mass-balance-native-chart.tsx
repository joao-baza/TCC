import { ChartSeriesLegend } from "@/components/viz/chart-series-legend";
import type { ChartModel } from "@/types/chart-model";
import { formatNumber as formatNumericValue } from "@/lib/units";
import { formatMassBalanceStreamName, MASS_BALANCE_FLOW_UNIT_LABEL } from "@/lib/mass-balance-display";

type NativeMassBalanceChartStream = {
  name: string;
  flowRate: number;
  compositions: Record<string, number>;
};

type NativeMassBalanceChartProps = {
  chartModel: ChartModel | null;
  components: string[];
  streams: NativeMassBalanceChartStream[];
};

const fallbackPalette = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#0f766e",
];

function formatNumber(value: number, digits = 2) {
  return formatNumericValue(Number(value), digits);
}

function normalizeComponentKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function extractComponentKey(series: ChartModel["series"][number]) {
  const idMatch = series.id.match(/^component-(.+)$/i);
  if (idMatch) {
    return normalizeComponentKey(idMatch[1].replace(/-/g, " "));
  }

  const nameMatch = series.name.match(/(?:de|from)\s+(.+)$/i);
  if (nameMatch) {
    return normalizeComponentKey(nameMatch[1]);
  }

  return normalizeComponentKey(series.name);
}

export function MassBalanceNativeChart({
  chartModel,
  components,
  streams,
}: NativeMassBalanceChartProps) {
  if (!streams.length || !components.length) {
    return null;
  }

  const colorByComponent = new Map<string, string>();
  for (const [index, component] of components.entries()) {
    colorByComponent.set(normalizeComponentKey(component), fallbackPalette[index % fallbackPalette.length]);
  }

  for (const series of chartModel?.series ?? []) {
    if (!series.color) {
      continue;
    }
    colorByComponent.set(extractComponentKey(series), series.color);
  }

  const title = chartModel?.title ?? "Composição mássica das correntes";
  const subtitle =
    chartModel?.subtitle ??
    "Visualização nativa da contribuição mássica de cada componente em cada corrente.";

  const legendItems = components.map((component) => ({
    id: `mass-balance-component-${component}`,
    label: component,
    color:
      colorByComponent.get(normalizeComponentKey(component)) ??
      fallbackPalette[components.indexOf(component) % fallbackPalette.length],
  }));

  const minWidthRem = Math.max(48, 14 + streams.length * 11);

  return (
    <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ChartSeriesLegend items={legendItems} />
      </div>

      <div
        className="max-h-[28rem] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50"
        data-testid="mass-balance-native-chart"
      >
        <table
          aria-label={title}
          className="divide-y divide-slate-200 text-sm"
          style={{ minWidth: `${minWidthRem}rem` }}
        >
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr>
              <th
                className="sticky left-0 z-20 min-w-40 border-r border-slate-200 bg-slate-100 px-4 py-3 text-left font-semibold text-muted-foreground"
                scope="col"
              >
                Componente
              </th>
              {streams.map((stream) => (
                <th
                  key={`native-chart-stream-${stream.name}`}
                  className="min-w-44 px-4 py-3 text-left font-semibold text-muted-foreground"
                  scope="col"
                >
                  <div className="space-y-1">
                    <span className="block text-slate-900">{formatMassBalanceStreamName(stream.name)}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {formatNumber(stream.flowRate)} {MASS_BALANCE_FLOW_UNIT_LABEL}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {components.map((component) => {
              const color =
                colorByComponent.get(normalizeComponentKey(component)) ??
                fallbackPalette[components.indexOf(component) % fallbackPalette.length];

              return (
                <tr key={`native-chart-component-${component}`} className="bg-white">
                  <th
                    className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-4 text-left"
                    scope="row"
                  >
                    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold text-slate-900">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {component}
                    </div>
                  </th>
                  {streams.map((stream) => {
                    const fraction = stream.compositions[component] ?? 0;
                    const percent = Math.max(0, Math.min(100, fraction * 100));
                    const contribution = stream.flowRate * fraction;

                    return (
                      <td key={`native-chart-cell-${component}-${stream.name}`} className="px-4 py-4 align-top">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-slate-900">{formatNumber(contribution)}</span>
                            <span className="text-xs text-muted-foreground">{formatNumber(percent, 1)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percent}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
