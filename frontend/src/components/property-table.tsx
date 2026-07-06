import type { PropertyRecord, ValueWithUnits } from "@/lib/api";
import { formatQuantity } from "@/lib/units";

export type PropertyRow = {
  label: string;
  value: number | string;
  units?: string;
};

function isValueWithUnits(value: unknown): value is ValueWithUnits {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "units" in value
  );
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: number | string | null) {
  if (value === null) {
    return "—";
  }

  if (typeof value === "number") {
    return value.toFixed(4);
  }

  return value;
}

function isPrimitiveValue(value: unknown): value is number | string | null {
  return (
    value === null || typeof value === "number" || typeof value === "string"
  );
}

type PropertyTableProps =
  | {
      data: PropertyRecord;
      rows?: never;
    }
  | {
      rows: PropertyRow[];
      data?: never;
    };

export function PropertyTable(props: PropertyTableProps) {
  const rows =
    "data" in props
      ? Object.entries(props.data as PropertyRecord).flatMap(([key, value]) => {
          if (
            isValueWithUnits(value) ||
            typeof value !== "object" ||
            value === null
          ) {
            return [[key, value] as const];
          }

          return Object.entries(value).map(([nestedKey, nestedValue]) => [
            `${key} ${nestedKey}`,
            nestedValue,
          ]) as Array<readonly [string, unknown]>;
        })
      : props.rows.map((row) => [row.label, row.value, row.units] as const);

  const isLegacyData = "data" in props;

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border-b border-border py-1 pr-4 text-left font-medium">
            Propriedade
          </th>
          <th className="border-b border-border py-1 pr-4 text-left font-medium">
            Valor
          </th>
          <th className="border-b border-border py-1 pr-4 text-left font-medium">
            Unidade
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([key, value, units]) => {
          if (isLegacyData && isValueWithUnits(value)) {
            return (
              <tr key={key} className="border-b border-border last:border-0">
                <td className="py-2 pr-4 text-muted-foreground">
                  {formatLabel(key)}
                </td>
                <td className="py-2 text-right font-medium tabular-nums text-foreground">
                  {formatValue(value.value)}
                </td>
                <td className="py-2 text-foreground">{value.units}</td>
              </tr>
            );
          }

          const renderedValue =
            typeof value === "number" && !isLegacyData
              ? formatQuantity(value, units)
              : formatValue(isPrimitiveValue(value) ? value : String(value));

          return (
            <tr key={key} className="border-b border-border last:border-0">
              <td className="py-2 pr-4 text-muted-foreground">
                {formatLabel(key)}
              </td>
              <td className="py-2 text-right font-medium tabular-nums text-foreground">
                {renderedValue}
              </td>
              <td className="py-2 text-foreground">
                {isLegacyData ? (isValueWithUnits(value) ? value.units : "-") : units ?? ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ValueWithUnitsTable({
  label,
  data,
}: {
  label: string;
  data: ValueWithUnits;
}) {
  return <PropertyTable data={{ [label]: data }} />;
}
