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

function formatLabelLatex(label: string) {
  switch (label) {
    case "ΔP/(ρg)":
      return "\\Delta P / (\\rho g)";
    case "Δz":
      return "\\Delta z";
    case "ΔV²/(2g)":
      return "\\Delta V^2 / (2g)";
    case "-h_f":
      return "-h_{f}";
    default:
      return `\\text{${label.replace(/([\\{}#$%&_~^])/g, "\\$1")}}`;
  }
}

function formatPercentageLatex(value: number) {
  return `${formatTableNumber(value)}\\%`;
}

function renderTermRow(term: HeadBreakdownTerm, denominator: number) {
  const percentage = denominator > 0 ? (Math.abs(term.value) / denominator) * 100 : null;

  return (
    <tr key={term.label} className="bg-white">
      <th scope="row" className="px-4 py-3 text-left font-medium text-slate-700">
        <InlineMath math={formatLabelLatex(term.label)} />
      </th>
      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
        <InlineMath math={formatTableNumber(term.value)} />
      </td>
      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
        <InlineMath math={percentage == null ? "\\text{—}" : formatPercentageLatex(percentage)} />
      </td>
    </tr>
  );
}

export function HeadBreakdownChart({
  totalHead,
  terms,
}: HeadBreakdownChartProps) {
  const denominator = Math.abs(totalHead);

  return (
    <section className="mx-auto mt-3 w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Porcentagem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {terms.map((term) => renderTermRow(term, denominator))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
