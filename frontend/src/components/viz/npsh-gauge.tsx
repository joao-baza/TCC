import { HowItWorks } from "@/components/how-it-works";
import { formatTableNumberText } from "@/lib/table-number";

type GaugeValue = {
  value: number;
  units: string;
};

type GaugeStatus = {
  tone: "safe" | "risk" | "missing";
  label: string;
  message: string;
};

type GaugeAxis = {
  scale: "linear";
  label: string;
  units?: string;
  domain: {
    min: number;
    max: number;
  };
  ticks: number[];
  major_ticks: number[];
};

type GaugeMarker = {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string;
};

export type NpshGaugeModel = {
  id: string;
  title: string;
  available: GaugeValue;
  required: GaugeValue | null;
  safe_threshold: GaugeValue | null;
  status: GaugeStatus;
  axis: GaugeAxis;
  markers: GaugeMarker[];
};

type NpshGaugeProps = {
  model: NpshGaugeModel;
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

function statusClassName(tone: GaugeStatus["tone"]) {
  if (tone === "safe") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "risk") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusFill(tone: GaugeStatus["tone"]) {
  if (tone === "safe") {
    return "#10b981";
  }

  if (tone === "risk") {
    return "#fb7185";
  }

  return "#f59e0b";
}

export function NpshGauge({ model }: NpshGaugeProps) {
  const barStart = padding.left;
  const barEnd = width - padding.right;
  const domainMin = model.axis.domain.min;
  const domainMax = model.axis.domain.max;
  const projectX = (value: number) => scale(value, domainMin, domainMax, barStart, barEnd);
  const markerById = new Map(model.markers.map((marker) => [marker.id, marker]));
  const availableMarker = markerById.get("available");
  const requiredMarker = markerById.get("required");
  const safeMarker = markerById.get("safe-threshold");
  const availableX = projectX(availableMarker?.x ?? model.available.value);
  const requiredX = requiredMarker ? projectX(requiredMarker.x) : null;
  const safeX = safeMarker ? projectX(safeMarker.x) : null;
  const domainStartX = projectX(domainMin);

  return (
    <section className="mx-auto mt-3 w-full max-w-[760px] rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-800">{model.title}</h3>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClassName(model.status.tone)}`}>
          {model.status.label}
        </span>
      </div>

      <div
        className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
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
            fill={statusFill(model.status.tone)}
            height={20}
            rx={10}
            ry={10}
            width={Math.max(0, availableX - domainStartX)}
            x={domainStartX}
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

          {model.axis.ticks.map((tick) => {
            const tickX = projectX(tick);
            return (
              <g key={tick}>
                <line stroke="#94a3b8" strokeWidth="1" x1={tickX} x2={tickX} y1={86} y2={92} />
                <text fill="#64748b" fontSize="10" textAnchor="middle" x={tickX} y={108}>
                  {toFixedLabel(tick)}
                </text>
              </g>
            );
          })}

          <line
            stroke={availableMarker?.color ?? "#1d4ed8"}
            strokeWidth="3"
            x1={availableX}
            x2={availableX}
            y1={48}
            y2={96}
          />
          {requiredX != null ? (
            <line
              stroke={requiredMarker?.color ?? "#b45309"}
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
              stroke={safeMarker?.color ?? "#16a34a"}
              strokeDasharray="4 4"
              strokeWidth="2"
              x1={safeX}
              x2={safeX}
              y1={42}
              y2={102}
            />
          ) : null}

          <text
            fill={availableMarker?.color ?? "#1d4ed8"}
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            x={availableX}
            y={38}
          >
            {availableMarker?.label ?? "NPSHd"}
          </text>
          {requiredX != null ? (
            <text
              fill={requiredMarker?.color ?? "#b45309"}
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              x={requiredX}
              y={24}
            >
              {requiredMarker?.label ?? "NPSHr"}
            </text>
          ) : null}
          {safeX != null ? (
            <text
              fill={safeMarker?.color ?? "#166534"}
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              x={safeX}
              y={126}
            >
              {safeMarker?.label ?? "Margem segura"}
            </text>
          ) : null}
        </svg>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <HowItWorks title="How it works - Margem de NPSH">
          <p className="text-sm text-slate-700">
            O gráfico compara o NPSH disponível na sucção com o NPSH requerido pela bomba para
            mostrar a folga contra cavitação.
          </p>
          <p className="text-sm text-slate-700">
            A linha azul marca o NPSHd calculado. A linha tracejada laranja marca o NPSHr informado.
            Quando houver limite seguro, a linha verde mostra a referência de NPSHr + 0,5 m.
          </p>
          <p className="text-sm text-slate-700">
            Se o NPSHd ficar à direita do limite seguro, a operação está com folga. Se ficar abaixo,
            o risco de cavitação aumenta.
          </p>
        </HowItWorks>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{model.status.message}</p>
    </section>
  );
}
