import { REGIME_COLOR, REGIME_LABEL, classifyRegime } from "@/components/viz/velocity-profile";

export function RegimeRuler({ reynolds }: { reynolds: number }) {
  const regime = classifyRegime(reynolds);

  return (
    <section className="mt-3 rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-800">Regime do escoamento</h3>
        <span
          className="rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${REGIME_COLOR[regime]}20`,
            borderColor: `${REGIME_COLOR[regime]}50`,
            color: REGIME_COLOR[regime],
          }}
        >
          {REGIME_LABEL[regime]}
        </span>
      </div>

      <div className="space-y-2">
        <div
          className="h-3 w-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #2563EB 0%, #2563EB 57.5%, #D97706 57.5%, #D97706 77%, #DC2626 77%, #DC2626 100%)",
          }}
          aria-hidden="true"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Laminar &lt; 2300</span>
          <span>Transição 2300-3999</span>
          <span>Turbulento &gt;= 4000</span>
        </div>
      </div>
    </section>
  );
}
