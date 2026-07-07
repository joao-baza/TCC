type HeadBreakdownTerm = {
  label: string;
  value: number;
};

type HeadBreakdownChartProps = {
  totalHead: number;
  terms: HeadBreakdownTerm[];
};

export function HeadBreakdownChart({
  totalHead,
  terms,
}: HeadBreakdownChartProps) {
  return (
    <section className="mt-3 rounded-xl border border-slate-200 p-3">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-slate-800">Decomposição</h3>
        <p className="text-xs text-muted-foreground">H = {totalHead.toFixed(3)} m</p>
      </div>

      <ul className="space-y-1 text-sm text-slate-700">
        {terms.map((term, index) => (
          <li key={index} className="flex items-center justify-between gap-3">
            <span>{term.label}</span>
            <span>{term.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
