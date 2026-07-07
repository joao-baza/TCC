import type { ReactNode } from "react";

import type { PropertyRow } from "@/components/property-table";
import { PropertyTable } from "@/components/property-table";

type ResultTableSectionProps = {
  title: string;
  emptyLabel: string;
  rows: PropertyRow[];
  error?: string | null;
  showTitleWhenEmpty?: boolean;
  children?: ReactNode;
};

export function ResultTableSection({
  title,
  emptyLabel,
  rows,
  error = null,
  showTitleWhenEmpty = true,
  children,
}: ResultTableSectionProps) {
  if (rows.length === 0 && !error && !showTitleWhenEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        {emptyLabel}
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {rows.length > 0 ? (
        <div className="mt-3">
          <PropertyTable rows={rows} />
        </div>
      ) : error ? null : (
        <p className="mt-3 text-sm text-slate-600">{emptyLabel}</p>
      )}
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
