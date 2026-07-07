import { formatTableNumberText } from "@/lib/table-number";

type NpshGaugeProps = {
  available: number;
  required?: number;
};

const width = 760;
const height = 160;
const padding = { top: 24, right: 28, bottom: 44, left: 72 };

function toFixedLabel(value: number) {
  return formatTableNumberText(value);
}

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function getStatus(required: number | undefined, available: number) {
  if (required === undefined) {
    return {
      label: "Informe NPSHr para checar margem",
      message: "NPSHr ausente",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (available >= required + 0.5) {
    return {
      label: "Margem segura (NPSHd ≥ NPSHr + 0,5 m) ✓",
      message: "Margem segura para evitar cavitação.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "Risco de cavitação — NPSHd insuficiente ✗",
    message: "NPSHd abaixo da margem segura; há risco de cavitação.",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  };
}

export function NpshGauge({ available, required }: NpshGaugeProps) {
  const status = getStatus(required, available);
  const safeThreshold = required != null ? required + 0.5 : null;
  const maxValue = Math.max(available, required ?? 0, safeThreshold ?? 0, 1);
  const barStart = padding.left;
  const barEnd = width - padding.right;
  const availableX = scale(available, 0, maxValue, barStart, barEnd);
  const requiredX = required != null ? scale(required, 0, maxValue, barStart, barEnd) : null;
  const safeX = safeThreshold != null ? scale(safeThreshold, 0, maxValue, barStart, barEnd) : null;

  return (
    <section className="mx-auto mt-3 w-full max-w-[760px] rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Margem de NPSH</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>NPSHd = {toFixedLabel(available)}</span>
            {required !== undefined ? <span>NPSHr = {toFixedLabel(required)}</span> : null}
          </div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg
          aria-label="Gauge de margem de NPSH"
          className="block h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <rect fill="#f8fafc" height={height} width={width} />
          <rect
            fill="#e2e8f0"
            height={20}
            rx={10}
            ry={10}
            width={barEnd - barStart}
            x={barStart}
            y={64}
          />
          {safeX != null ? (
            <rect
              fill="rgba(16, 185, 129, 0.18)"
              height={20}
              rx={10}
              ry={10}
              width={barEnd - safeX}
              x={safeX}
              y={64}
            />
          ) : null}
          <rect
            fill={status.className.includes("emerald") ? "#10b981" : status.className.includes("rose") ? "#fb7185" : "#f59e0b"}
            height={20}
            rx={10}
            ry={10}
            width={availableX - barStart}
            x={barStart}
            y={64}
          />

          <line
            stroke="#475569"
            strokeWidth="2"
            x1={barStart}
            x2={barEnd}
            y1={74}
            y2={74}
          />

          <line
            stroke="#1d4ed8"
            strokeWidth="3"
            x1={availableX}
            x2={availableX}
            y1={48}
            y2={96}
          />
          {requiredX != null ? (
            <line
              stroke="#b45309"
              strokeDasharray="5 5"
              strokeWidth="3"
              x1={requiredX}
              x2={requiredX}
              y1={44}
              y2={100}
            />
          ) : null}
          {safeX != null ? (
            <line
              stroke="#16a34a"
              strokeDasharray="4 4"
              strokeWidth="2"
              x1={safeX}
              x2={safeX}
              y1={42}
              y2={102}
            />
          ) : null}

          <text fill="#1d4ed8" fontSize="12" fontWeight="600" textAnchor="middle" x={availableX} y={38}>
            NPSHd
          </text>
          {requiredX != null ? (
            <text fill="#b45309" fontSize="12" fontWeight="600" textAnchor="middle" x={requiredX} y={24}>
              NPSHr
            </text>
          ) : null}
          {safeX != null ? (
            <text fill="#166534" fontSize="12" fontWeight="600" textAnchor="middle" x={safeX} y={116}>
              Margem segura
            </text>
          ) : null}
        </svg>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Disponível
          </span>
          <div className="mt-1 text-sm text-slate-900">{toFixedLabel(available)} m de NPSH disponível</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Requerido
          </span>
          <div className="mt-1 text-sm text-slate-900">
            {required != null ? `${toFixedLabel(required)} m de NPSH requerido` : "NPSHr não informado"}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Limite seguro
          </span>
          <div className="mt-1 text-sm text-slate-900">
            {safeThreshold != null ? `NPSHr + 0,5 = ${toFixedLabel(safeThreshold)} m` : "Sem limite calculado"}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{status.message}</p>
    </section>
  );
}
