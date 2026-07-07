import { InlineMath } from "@/lib/katex";
import { formatUnitLatex } from "@/lib/units";

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

  if (units != null && (/[^\x00-\x7F]/.test(units) || /\s/.test(units))) {
    return <span>{units}</span>;
  }

  return <InlineMath math={latex} />;
}
