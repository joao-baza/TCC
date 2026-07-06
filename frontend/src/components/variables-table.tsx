export type VariableRow = {
  symbol: string;
  description: string;
  unit?: string;
};

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
            <td className="py-1 pr-4 font-mono">{row.symbol}</td>
            <td className="py-1 pr-4">{row.description}</td>
            <td className="py-1">{row.unit ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
