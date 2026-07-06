import type { Scenario } from "@/features/exploratory/types";

export function ScenarioComparison({
  scenarios,
  onSave,
  onClear,
}: {
  scenarios: Scenario[];
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-primary">
          Comparação de cenários
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Salvar cenário
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/20 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {scenarios.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Salve até 3 cenários para comparar lado a lado.
          </p>
        ) : (
          scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5"
            >
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ background: scenario.color }}
              />
              <span className="flex-1 text-sm text-slate-800">{scenario.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
