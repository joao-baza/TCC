import type { PropertyRecord, ValueWithUnits } from "@/lib/api";

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

export function PropertyTable({ data }: { data: PropertyRecord }) {
  const rows = Object.entries(data).flatMap(([key, value]) => {
    if (isValueWithUnits(value) || typeof value !== "object" || value === null) {
      return [[key, value] as const];
    }

    return Object.entries(value).map(([nestedKey, nestedValue]) => [
      `${key} ${nestedKey}`,
      nestedValue
    ]) as Array<readonly [string, unknown]>;
  });

  return (
    <table className="property-table">
      <thead>
        <tr>
          <th>Propriedade</th>
          <th>Valor</th>
          <th>Unidade</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([key, value]) => {
          if (isValueWithUnits(value)) {
            return (
              <tr key={key}>
                <td>{formatLabel(key)}</td>
                <td>{formatValue(value.value)}</td>
                <td>{value.units}</td>
              </tr>
            );
          }

          return (
            <tr key={key}>
              <td>{formatLabel(key)}</td>
              <td>{formatValue(isPrimitiveValue(value) ? value : String(value))}</td>
              <td>-</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ValueWithUnitsTable({
  label,
  data
}: {
  label: string;
  data: ValueWithUnits;
}) {
  return <PropertyTable data={{ [label]: data }} />;
}
