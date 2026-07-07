import { InlineMath } from "@/lib/katex";
import { formatTableNumber, formatTableNumberText } from "@/lib/table-number";

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
    <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-800">Decomposição</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          H total = {formatTableNumberText(totalHead)} m
        </p>
      </div>

      <div className="overflow-x-auto">
        <table aria-label="Decomposição" className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-white">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Parcela
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {terms.map((term) => (
              <tr key={term.label} className="bg-white">
                <th scope="row" className="px-4 py-3 text-left font-medium text-slate-700">
                  {term.label}
                </th>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                  <InlineMath math={formatTableNumber(term.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
