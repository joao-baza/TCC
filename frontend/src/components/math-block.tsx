import { BlockMath } from "@/lib/katex";

export function MathBlock({ expression }: { expression: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white p-4">
      <BlockMath math={expression} />
    </div>
  );
}
