import type { PropertyRow } from "@/components/property-table";
import { PropertyTable } from "@/components/property-table";

type ResultTableSectionProps = {
  title: string;
  emptyLabel: string;
  rows: PropertyRow[];
};

export function ResultTableSection({
  title,
  emptyLabel,
  rows,
}: ResultTableSectionProps) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {rows.length > 0 ? (
        <div className="mt-3">
          <PropertyTable rows={rows} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">{emptyLabel}</p>
      )}
    </section>
  );
}
