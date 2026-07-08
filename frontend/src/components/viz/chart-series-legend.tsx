type ChartSeriesLegendItem = {
  id: string;
  label: string;
  color: string;
};

type ChartSeriesLegendProps = {
  items: ChartSeriesLegendItem[];
};

export function ChartSeriesLegend({ items }: ChartSeriesLegendProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Legenda do gráfico" className="flex flex-wrap gap-2" data-testid="chart-series-legend">
      {items.map((item) => (
        <li
          key={item.id}
          className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm font-medium shadow-sm"
          style={{ borderColor: item.color, color: item.color }}
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
