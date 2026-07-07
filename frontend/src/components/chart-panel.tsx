import type { ReactNode } from "react";

export function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 min-h-80">{children}</div>
    </section>
  );
}
