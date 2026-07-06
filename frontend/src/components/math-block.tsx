import { BlockMath } from "@/lib/katex";

export function MathBlock({ expression }: { expression: string }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-border bg-background p-4 shadow-sm">
      <BlockMath math={expression} />
    </div>
  );
}
