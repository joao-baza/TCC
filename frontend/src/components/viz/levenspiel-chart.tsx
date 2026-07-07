import type { ReactNode } from "react";
import { formatTableNumberText } from "@/lib/table-number";

type LevenspielPoint = {
  conversion: number;
  cstrVolume: number;
  pfrVolume: number;
};

type OperatingPoint = {
  conversion: number;
  volume: number;
};

type ChartPoint = {
  x: number;
  y: number;
};

const width = 720;
const height = 360;
const padding = { top: 24, right: 24, bottom: 42, left: 56 };

function toFixedLabel(value: number) {
  return formatTableNumberText(value);
}

function buildLinePath(points: ChartPoint[]) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function scaleX(value: number, maxConversion: number) {
  const usableWidth = width - padding.left - padding.right;
  return padding.left + (value / maxConversion) * usableWidth;
}

function scaleY(value: number, maxVolume: number) {
  const usableHeight = height - padding.top - padding.bottom;
  return padding.top + usableHeight - (value / maxVolume) * usableHeight;
}

function LegendItem({
  color,
  label,
  detail,
}: {
  color: string;
  label: string;
  detail: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

export function LevenspielChart({
  points,
  cstrOperatingPoint,
  pfrOperatingPoint,
  maxConversion,
}: {
  points: LevenspielPoint[];
  cstrOperatingPoint: OperatingPoint | null;
  pfrOperatingPoint: OperatingPoint | null;
  maxConversion: number;
}) {
  if (!cstrOperatingPoint || !pfrOperatingPoint) {
    return null;
  }

  const sortedPoints = [...points].sort((left, right) => left.conversion - right.conversion);
  const maxVolume = Math.max(
    cstrOperatingPoint.volume,
    pfrOperatingPoint.volume,
    ...sortedPoints.flatMap((point) => [point.cstrVolume, point.pfrVolume]),
    1,
  );

  const cstrPathPoints = sortedPoints.map((point) => ({
    x: scaleX(point.conversion, maxConversion),
    y: scaleY(point.cstrVolume, maxVolume),
  }));
  const pfrPathPoints = sortedPoints.map((point) => ({
    x: scaleX(point.conversion, maxConversion),
    y: scaleY(point.pfrVolume, maxVolume),
  }));

  const cstrMarker = {
    x: scaleX(cstrOperatingPoint.conversion, maxConversion),
    y: scaleY(cstrOperatingPoint.volume, maxVolume),
  };
  const pfrMarker = {
    x: scaleX(pfrOperatingPoint.conversion, maxConversion),
    y: scaleY(pfrOperatingPoint.volume, maxVolume),
  };

  return (
    <div
      aria-label="Diagrama de Levenspiel"
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="levenspiel-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Diagrama de Levenspiel</h3>
          <p className="text-sm text-muted-foreground">
            Aproximação didática local para comparar a demanda volumétrica de CSTR e PFR.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">X máx = {toFixedLabel(maxConversion)}</p>
      </div>

      <svg
        aria-hidden="true"
        className="block w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${width} ${height}`}
      >
        <line
          stroke="#cbd5e1"
          strokeWidth="1.5"
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={height - padding.bottom}
        />
        <line
          stroke="#cbd5e1"
          strokeWidth="1.5"
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
        />

        <text fill="#475569" fontSize="12" x={padding.left - 24} y={padding.top + 4}>
          V
        </text>
        <text
          fill="#475569"
          fontSize="12"
          textAnchor="end"
          x={width - padding.right}
          y={height - 12}
        >
          Conversão X
        </text>

        <path
          d={buildLinePath(cstrPathPoints)}
          fill="none"
          stroke="#0f766e"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d={buildLinePath(pfrPathPoints)}
          fill="none"
          stroke="#b45309"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        {cstrPathPoints.map((point, index) => (
          <circle key={`cstr-point-${index}`} cx={point.x} cy={point.y} fill="#0f766e" r="4" />
        ))}
        {pfrPathPoints.map((point, index) => (
          <circle key={`pfr-point-${index}`} cx={point.x} cy={point.y} fill="#b45309" r="4" />
        ))}

        <line
          stroke="#0f766e"
          strokeDasharray="6 6"
          strokeWidth="2"
          x1={cstrMarker.x}
          x2={cstrMarker.x}
          y1={cstrMarker.y}
          y2={height - padding.bottom}
        />
        <line
          stroke="#b45309"
          strokeDasharray="6 6"
          strokeWidth="2"
          x1={pfrMarker.x}
          x2={pfrMarker.x}
          y1={pfrMarker.y}
          y2={height - padding.bottom}
        />
        <circle cx={cstrMarker.x} cy={cstrMarker.y} fill="#0f766e" r="6" />
        <circle cx={pfrMarker.x} cy={pfrMarker.y} fill="#b45309" r="6" />
      </svg>

      <div className="grid gap-3 md:grid-cols-2">
        <LegendItem
          color="#0f766e"
          label="CSTR operacional"
          detail={
            <>
              X = {toFixedLabel(cstrOperatingPoint.conversion)} · V ={" "}
              {toFixedLabel(cstrOperatingPoint.volume)} m³
            </>
          }
        />
        <LegendItem
          color="#b45309"
          label="PFR operacional"
          detail={
            <>
              X = {toFixedLabel(pfrOperatingPoint.conversion)} · V ={" "}
              {toFixedLabel(pfrOperatingPoint.volume)} m³
            </>
          }
        />
      </div>

    </div>
  );
}
