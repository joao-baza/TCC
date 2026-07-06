import { formatQuantity } from "@/lib/units";

export type PropertyRow = {
  label: string;
  value: number | string;
  units?: string;
};

export function PropertyTable({ rows }: { rows: PropertyRow[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-border last:border-0">
            <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
            <td className="py-2 text-right font-medium tabular-nums text-foreground">
              {typeof row.value === "number"
                ? formatQuantity(row.value, row.units)
                : row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
