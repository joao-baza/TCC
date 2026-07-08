import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { formatAxisLabel, scaleRenderableAxisValue } from "@/components/viz/chart-axis-utils";
import { NumericChartGrid } from "@/components/viz/chart-grid";
import type { AxisModel } from "@/types/chart-model";

type PropertySurfaceCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  value?: number | null;
  fill: string;
  tooltip: string;
};

type PropertySurfaceLegendStop = {
  offset: number;
  color: string;
  value: number;
};

type PropertySurfaceHeatmapProps = {
  title: string;
  subtitle?: string | null;
  fluid: string;
  propertyLabel: string;
  propertyUnits: string;
  xAxis: AxisModel;
  yAxis: AxisModel;
  cells: PropertySurfaceCell[];
  legendStops: PropertySurfaceLegendStop[];
  valueMin: number;
  valueMax: number;
};

const width = 820;
const height = 460;
const padding = { top: 28, right: 28, bottom: 70, left: 88 };

function projectX(value: number, axis: AxisModel) {
  return scaleRenderableAxisValue(value, axis, padding.left, width - padding.right);
}

function projectY(value: number, axis: AxisModel) {
  return scaleRenderableAxisValue(value, axis, height - padding.bottom, padding.top);
}

function buildLegendGradient(stops: PropertySurfaceLegendStop[]) {
  const gradientStops = stops.map((stop) => `${stop.color} ${stop.offset * 100}%`).join(", ");

  return `linear-gradient(90deg, ${gradientStops})`;
}

export function PropertySurfaceHeatmap({
  title,
  subtitle,
  fluid,
  propertyLabel,
  propertyUnits,
  xAxis,
  yAxis,
  cells,
  legendStops,
  valueMin,
  valueMax,
}: PropertySurfaceHeatmapProps) {
  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="property-surface-heatmap"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {subtitle ?? `Mapa T-P de ${propertyLabel.toLowerCase()} para ${fluid}.`}
          </p>
        </div>
        <div className="text-sm font-medium text-slate-700">
          <div>{propertyLabel}</div>
          <div>{propertyUnits}</div>
        </div>
      </div>

      <HowItWorks title="Como funciona - Superfície T-P">
        <p>
          O backend monta a malha temperatura-pressão, calcula os valores válidos, define o
          domínio dos eixos e devolve as cores das células já prontas para a renderização.
        </p>
        <p>
          A interface só desenha a grade e os retângulos recebidos, preservando a leitura rápida
          da sensibilidade da propriedade ao longo do plano T-P.
        </p>
        <TheoryRef>
          Ref.: NIST/ASME Steam Properties Users&apos; Guide; Cambridge, Thermodynamics with
          Chemical Engineering Applications.
        </TheoryRef>
      </HowItWorks>

      <div
        className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <NumericChartGrid
          width={width}
          height={height}
          padding={padding}
          xAxis={xAxis}
          yAxis={yAxis}
          xLabel={formatAxisLabel(xAxis)}
          yLabel={formatAxisLabel(yAxis)}
        />

        <svg
          aria-label={`${title} de ${propertyLabel} para ${fluid}`}
          className="absolute inset-0 block h-full w-full overflow-hidden"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id="property-surface-legend" x1="0%" x2="100%" y1="0%" y2="0%">
              {legendStops.map((stop) => (
                <stop key={stop.offset} offset={`${stop.offset * 100}%`} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>

          {cells.map((cell, index) => {
            const x = projectX(cell.x, xAxis);
            const x2 = projectX(cell.x + cell.width, xAxis);
            const y = projectY(cell.y, yAxis);
            const y2 = projectY(cell.y + cell.height, yAxis);

            if (x == null || x2 == null || y == null || y2 == null) {
              return null;
            }

            return (
              <rect
                key={index}
                fill={cell.fill}
                height={Math.abs(y2 - y)}
                stroke="#ffffff"
                strokeWidth="1"
                width={Math.abs(x2 - x)}
                x={Math.min(x, x2)}
                y={Math.min(y, y2)}
              >
                <title>{cell.tooltip}</title>
              </rect>
            );
          })}
        </svg>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="h-3 overflow-hidden rounded-full border border-slate-200 bg-white">
          <div className="h-full w-full" style={{ background: buildLegendGradient(legendStops) }} />
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>
            {valueMin} {propertyUnits}
          </span>
          <span>
            {valueMax} {propertyUnits}
          </span>
        </div>
      </div>
    </section>
  );
}
