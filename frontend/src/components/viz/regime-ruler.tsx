import { REGIME_COLOR, REGIME_LABEL, classifyRegime } from "@/components/viz/velocity-profile";
import { formatTableNumberText } from "@/lib/table-number";
import { formatAxisTick } from "@/components/viz/chart-axis-utils";

const scaleMin = 100;
const laminarMax = 2300;
const transitionMax = 4000;
const scaleMax = 10000;

const rulerTicks = [100, 500, 1000, 2300, 4000, 6000, 8000, 10000];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function scaleValue(value: number, start: number, end: number) {
  const safeValue = clamp(value, scaleMin, scaleMax);
  return start + ((safeValue - scaleMin) / (scaleMax - scaleMin)) * (end - start);
}

export function RegimeRuler({ reynolds }: { reynolds: number }) {
  const regime = classifyRegime(reynolds);
  const markerX = scaleValue(reynolds, 40, 720);
  const isBelowScale = reynolds < scaleMin;
  const isAboveScale = reynolds > scaleMax;
  const markerLabel = `Re = ${formatTableNumberText(reynolds)}`;
  const markerStatus = isBelowScale
    ? "abaixo da escala"
    : isAboveScale
      ? "acima da escala"
      : REGIME_LABEL[regime];

  return (
    <section className="mx-auto mt-3 w-full max-w-[760px] rounded-xl border border-slate-200 p-3">
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

      <p className="mb-3 text-xs text-muted-foreground">
        Escala linear de Reynolds de 100 a 10.000. O marcador mostra a posição atual.
      </p>

      <svg
        aria-label="Régua do regime do escoamento"
        className="block h-auto w-full"
        role="img"
        viewBox="0 0 760 170"
      >
        <title>Régua do regime do escoamento</title>
        <desc>
          Escala linear de Reynolds com zonas laminar, transição e turbulento. Marcador na
          posição atual.
        </desc>
        <rect x="0" y="0" width="760" height="170" fill="#f8fafc" rx="16" />

        <g aria-hidden="true">
          {rulerTicks.map((tick) => {
            const x = scaleValue(tick, 40, 720);

            return (
              <line
                key={`grid-${tick}`}
                x1={x}
                x2={x}
                y1={28}
                y2={100}
                stroke="#e2e8f0"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
            );
          })}
        </g>

        <rect x="40" y="48" width={scaleValue(laminarMax, 40, 720) - 40} height="28" rx="14" fill="#2563eb" />
        <rect
          x={scaleValue(laminarMax, 40, 720)}
          y="48"
          width={scaleValue(transitionMax, 40, 720) - scaleValue(laminarMax, 40, 720)}
          height="28"
          rx="0"
          fill="#d97706"
        />
        <rect
          x={scaleValue(transitionMax, 40, 720)}
          y="48"
          width={720 - scaleValue(transitionMax, 40, 720)}
          height="28"
          rx="14"
          fill="#dc2626"
        />

        <line x1="40" x2="720" y1="48" y2="48" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="40" x2="720" y1="76" y2="76" stroke="#cbd5e1" strokeWidth="1.5" />

        {rulerTicks.map((tick) => {
          const x = scaleValue(tick, 40, 720);

          return (
            <g key={`tick-${tick}`}>
              <line x1={x} x2={x} y1="80" y2="92" stroke="#64748b" strokeWidth="1.5" />
              <text
                x={x}
                y="110"
                fill="#64748b"
                fontSize="11"
                textAnchor="middle"
              >
                {formatAxisTick(tick)}
              </text>
            </g>
          );
        })}

        <text x="58" y="66" fill="#eff6ff" fontSize="13" fontWeight="600">
          Laminar
        </text>
        <text x={scaleValue(laminarMax, 40, 720) + 16} y="66" fill="#fff7ed" fontSize="13" fontWeight="600">
          Transição
        </text>
        <text x={scaleValue(transitionMax, 40, 720) + 16} y="66" fill="#fef2f2" fontSize="13" fontWeight="600">
          Turbulento
        </text>

        <line
          x1={markerX}
          x2={markerX}
          y1="38"
          y2="96"
          stroke="#0f172a"
          strokeWidth="2.5"
        />
        <circle cx={markerX} cy="52" r="7" fill="#0f172a" />
        <circle cx={markerX} cy="52" r="3.5" fill="#fff" />
        <text
          x={markerX}
          y="24"
          fill="#0f172a"
          fontSize="12"
          fontWeight="600"
          textAnchor={isBelowScale ? "start" : isAboveScale ? "end" : "middle"}
        >
          {markerLabel}
        </text>
        <text
          x={markerX}
          y="38"
          fill="#475569"
          fontSize="11"
          textAnchor={isBelowScale ? "start" : isAboveScale ? "end" : "middle"}
        >
          {markerStatus}
        </text>
      </svg>
    </section>
  );
}
