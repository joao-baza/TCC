import { InlineMath } from "@/lib/katex";
import { formatUnitLatex } from "@/lib/units";

export function UnitMath({ units }: { units?: string | null }) {
  const latex = formatUnitLatex(units);

  if (latex == null) {
    return null;
  }

  if (latex === "-") {
    return <span>-</span>;
  }

  return <InlineMath math={latex} />;
}
