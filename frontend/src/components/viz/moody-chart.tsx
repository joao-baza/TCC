import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";

import type { Scenario } from "@/features/exploratory/types";

type MoodyChartProps = {
  reynolds: number;
  frictionFactor: number;
  roughness: number;
  scenarios?: Scenario[];
};

function isValidOperationalPoint({
  reynolds,
  frictionFactor,
  roughness,
}: MoodyChartProps) {
  return (
    Number.isFinite(reynolds) &&
    Number.isFinite(frictionFactor) &&
    Number.isFinite(roughness) &&
    reynolds > 0 &&
    frictionFactor > 0 &&
    roughness >= 0 &&
    roughness <= 1
  );
}

export function MoodyChart({
  reynolds,
  frictionFactor,
  roughness,
  scenarios = [],
}: MoodyChartProps) {
  if (!isValidOperationalPoint({ reynolds, frictionFactor, roughness })) {
      return (
        <section className="mt-3 rounded-xl border border-slate-200 p-3">
          <h3 className="text-sm font-medium text-slate-800">
            Ponto operacional indisponível
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Revise os parâmetros para exibir o gráfico.
          </p>
        </section>
      );
  }

  const point = [{ reynolds, frictionFactor, roughness }];

  return (
    <section className="mt-3 rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Ponto operacional</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Re = {reynolds}</span>
            <span>f = {frictionFactor}</span>
          </div>
        </div>
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
          e/D = {roughness}
        </span>
      </div>

      <div className="overflow-x-auto">
        <ScatterChart width={560} height={192} margin={{ top: 12, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="reynolds"
            name="Reynolds"
            tick={{ fontSize: 12, fill: "#64748B" }}
            domain={["dataMin - 5000", "dataMax + 5000"]}
          />
          <YAxis
            type="number"
            dataKey="frictionFactor"
            name="Fator de atrito"
            tick={{ fontSize: 12, fill: "#64748B" }}
            domain={["dataMin - 0.01", "dataMax + 0.01"]}
          />
          <Scatter data={point} fill="#DC2626" />
        </ScatterChart>
      </div>

      {scenarios.length > 0 ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            Cenários salvos
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {scenarios.map((scenario) => (
              <span
                key={scenario.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: scenario.color }}
                />
                {scenario.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
