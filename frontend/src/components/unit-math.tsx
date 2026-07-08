import { InlineMath } from "@/lib/katex";
import { formatUnitLatex } from "@/lib/units";

const UNIT_WORDS = new Set([
  "meter",
  "meters",
  "millimeter",
  "millimeters",
  "kilogram",
  "kilograms",
  "gram",
  "grams",
  "mole",
  "moles",
  "second",
  "seconds",
  "pascal",
  "kelvin",
  "joule",
  "joules",
  "watt",
  "watts",
  "newton",
  "newtons",
  "liter",
  "liters",
  "cubic",
  "square",
  "per",
  "dimensionless",
  "m",
  "kg",
  "mol",
  "s",
  "Pa",
  "K",
]);

function looksLikeUnitExpression(units: string) {
  const trimmed = units.trim();

  if (!trimmed) {
    return false;
  }

  if (!/\s/.test(trimmed)) {
    return true;
  }

  const tokens = trimmed.split(/\s+/);

  return tokens.every((token) => {
    if (/^(?:\*{1,2}|\/|\(|\)|·|×)$/.test(token)) {
      return true;
    }

    if (/^\d+$/.test(token)) {
      return true;
    }

    return UNIT_WORDS.has(token);
  });
}

export function UnitMath({
  units,
  mode = "auto",
}: {
  units?: string | null;
  mode?: "auto" | "latex" | "text";
}) {
  const latex = formatUnitLatex(units);

  if (latex == null) {
    return null;
  }

  if (latex === "-") {
    return <span>-</span>;
  }

  if (mode === "text") {
    return <span>{units}</span>;
  }

  if (mode === "latex") {
    return <InlineMath math={latex} />;
  }

  if (units != null && !looksLikeUnitExpression(units)) {
    return <span>{units}</span>;
  }

  return <InlineMath math={latex} />;
}
