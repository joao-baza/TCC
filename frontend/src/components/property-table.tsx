import type { ReactNode } from "react";

import type { PropertyRecord, ValueWithUnits } from "@/lib/api";
import { InlineMath } from "@/lib/katex";
import { formatTableNumber } from "@/lib/table-number";
import { UnitMath } from "@/components/unit-math";

export type PropertyRow = {
  label: string;
  value: number | string;
  units?: string;
  unitMode?: "auto" | "latex" | "text";
  children?: PropertyRow[];
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

function escapeLatexText(value: string) {
  return value.replace(/([\\{}#$%&_~^])/g, "\\$1");
}

function formatValueLatex(value: number | string | null) {
  if (value === null) {
    return "\\text{-}";
  }

  if (typeof value === "number") {
    return formatTableNumber(value);
  }

  return `\\text{${escapeLatexText(value)}}`;
}

function ValueMath({ value }: { value: number | string | null }) {
  return <InlineMath math={formatValueLatex(value)} />;
}

function isPrimitiveValue(value: unknown): value is number | string | null {
  return (
    value === null || typeof value === "number" || typeof value === "string"
  );
}

function normalizeRowsFromData(data: PropertyRecord): PropertyRow[] {
  return Object.entries(data).flatMap(([key, value]) => {
    if (isValueWithUnits(value)) {
      return [
        {
          label: formatLabel(key),
          value: value.value,
          units: value.units,
        },
      ];
    }

    if (isPrimitiveValue(value)) {
      return [
        {
          label: formatLabel(key),
          value: value ?? "-",
        },
      ];
    }

    if (typeof value === "object" && value !== null) {
      return [
        {
          label: formatLabel(key),
          value: "-",
          children: normalizeRowsFromData(value as PropertyRecord),
        },
      ];
    }

    return [
      {
        label: formatLabel(key),
        value: "-",
      },
    ];
  });
}

function renderRows(rows: PropertyRow[], depth = 0): ReactNode[] {
  return rows.flatMap((row, index) => {
    const key = `${depth}-${index}-${row.label}`;
    const hasUnits = row.units != null;

    return [
      <tr key={key} className="border-b border-border last:border-0">
        <td
          className={[
            "py-2 pr-4 text-muted-foreground",
            depth > 0 ? "pl-6 text-sm" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {row.label}
        </td>
        <td className="py-2 text-center font-medium tabular-nums text-foreground">
          <ValueMath value={isPrimitiveValue(row.value) ? row.value : String(row.value)} />
        </td>
        <td className="py-2 text-center text-foreground">
          {hasUnits ? <UnitMath units={row.units} mode={row.unitMode} /> : "-"}
        </td>
      </tr>,
      ...(row.children?.length ? renderRows(row.children, depth + 1) : []),
    ];
  });
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
  const rows = "data" in props ? normalizeRowsFromData(props.data as PropertyRecord) : props.rows;

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border-b border-border py-1 pr-4 text-left font-medium">
            Propriedade
          </th>
          <th className="border-b border-border py-1 pr-4 text-center font-medium">
            Valor
          </th>
          <th className="border-b border-border py-1 pr-4 text-center font-medium">
            Unidade
          </th>
        </tr>
      </thead>
      <tbody>{renderRows(rows)}</tbody>
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
