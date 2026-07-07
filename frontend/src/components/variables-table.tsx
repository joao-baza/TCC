import { InlineMath } from "@/lib/katex";
import { UnitMath } from "@/components/unit-math";

export type VariableRow = {
  symbol: string;
  description: string;
  unit?: string;
};

function renderSymbol(symbol: string) {
  const looksLikeMath =
    /\\|[_^{}\\/]/.test(symbol) ||
    (!/\s/.test(symbol) && /^[A-Za-z0-9]+$/.test(symbol) && symbol.length <= 4);

  if (!looksLikeMath) {
    return symbol;
  }

  return <InlineMath math={symbol} />;
}

export function VariablesTable({
  headers = ["Simbolo", "Variavel", "Unidade"],
  rows,
}: {
  headers?: string[];
  rows: VariableRow[];
}) {
  return (
    <table className="my-3 w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          {headers.map((header) => (
            <th key={header} className="border-b border-border py-1 pr-4 font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.symbol} className="border-b border-border last:border-0">
            <td className="py-1 pr-4 font-mono">{renderSymbol(row.symbol)}</td>
            <td className="py-1 pr-4">{row.description}</td>
            <td className="py-1">
              <UnitMath units={row.unit} mode="text" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
