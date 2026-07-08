import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { formatAxisLabel, scaleRenderableAxisValue } from "@/components/viz/chart-axis-utils";
import { NumericChartGrid } from "@/components/viz/chart-grid";
import type { AxisModel, ChartPointModel, MarkerModel } from "@/types/chart-model";

export type PumpEfficiencyMapModel = {
  id: string;
  title: string;
  subtitle?: string | null;
  approximation_notice?: string | null;
  x_axis: AxisModel;
  y_axis: AxisModel;
  cells: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    efficiency: number;
    fill: string;
    tooltip: string;
  }>;
  system_curve: ChartPointModel[];
  cavitation_band: ChartPointModel[];
  markers: MarkerModel[];
};

type PumpEfficiencyMapProps = {
  model: PumpEfficiencyMapModel;
};

const width = 820;
const height = 420;
const padding = { top: 28, right: 28, bottom: 48, left: 112 };
const pumpCurveColor = "#0f766e";
const bepColor = "#16a34a";
const operatingColor = "#dc2626";
const cavitationColor = "#f97316";

function projectX(value: number, axis: AxisModel) {
  return scaleRenderableAxisValue(value, axis, padding.left, width - padding.right);
}

function projectY(value: number, axis: AxisModel) {
  return scaleRenderableAxisValue(value, axis, height - padding.bottom, padding.top);
}

function buildPath(points: ChartPointModel[], xAxis: AxisModel, yAxis: AxisModel) {
  const projected = points.flatMap((point) => {
    const x = projectX(point.x, xAxis);
    const y = projectY(point.y, yAxis);
    return x == null || y == null ? [] : [{ x, y }];
  });

  if (projected.length === 0) {
    return "";
  }

  return projected.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildClosedPath(points: ChartPointModel[], xAxis: AxisModel, yAxis: AxisModel) {
  const path = buildPath(points, xAxis, yAxis);
  return path ? `${path} Z` : "";
}

export function PumpEfficiencyMap({ model }: PumpEfficiencyMapProps) {
  const operatingPoint = model.markers.find((marker) => marker.id === "operating-point") ?? null;
  const bestEfficiencyPoint =
    model.markers.find((marker) => marker.id === "best-efficiency-point") ?? null;

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pump-efficiency-map"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{model.title}</h3>
          <p className="text-sm text-muted-foreground">
            {model.subtitle ??
              "Mapa sintético para leitura didática da região de melhor eficiência e faixa de cavitação."}
          </p>
        </div>
      </div>

      <HowItWorks title="Como funciona - Eficiência e BEP">
        <p>
          Este mapa ajuda a localizar a região de maior eficiência da bomba e a comparar o ponto
          de operação com o melhor rendimento possível.
        </p>
        <p>
          O backend devolve a malha do campo relativo de eficiência, a curva do sistema, o BEP e
          a faixa aproximada de cavitação já resolvidos para a condição calculada.
        </p>
        <div className="space-y-1">
          <p className="font-medium text-slate-800">O que você pode extrair daqui:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Quão perto a operação está do ponto de melhor eficiência.</li>
            <li>Se o regime atual tende a operar com maior perda interna e menor rendimento.</li>
            <li>Se a bomba está em uma faixa mais estável ou mais suscetível a cavitação.</li>
            <li>Como a condição operacional se desloca quando a curva do sistema muda.</li>
          </ul>
        </div>
        <TheoryRef>Ref.: Karassik et al., Pump Handbook, 4a ed., McGraw-Hill.</TheoryRef>
      </HowItWorks>

      <div
        className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <NumericChartGrid
          width={width}
          height={height}
          padding={padding}
          xAxis={model.x_axis}
          yAxis={model.y_axis}
          xLabel={formatAxisLabel(model.x_axis)}
          yLabel={formatAxisLabel(model.y_axis)}
        />

        <svg
          aria-label={model.title}
          className="absolute inset-0 block h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {model.cells.map((cell, index) => {
            const x = projectX(cell.x, model.x_axis);
            const x2 = projectX(cell.x + cell.width, model.x_axis);
            const y = projectY(cell.y, model.y_axis);
            const y2 = projectY(cell.y + cell.height, model.y_axis);

            if (x == null || x2 == null || y == null || y2 == null) {
              return null;
            }

            return (
              <rect
                key={`cell-${index}`}
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

          {model.cavitation_band.length > 0 ? (
            <path
              d={buildClosedPath(model.cavitation_band, model.x_axis, model.y_axis)}
              fill="rgba(249, 115, 22, 0.24)"
              stroke={cavitationColor}
              strokeOpacity="0.5"
              strokeWidth="1.75"
            />
          ) : null}

          <path
            d={buildPath(model.system_curve, model.x_axis, model.y_axis)}
            fill="none"
            stroke={pumpCurveColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.25"
          />

          {model.system_curve.map((point, index) => {
            const x = projectX(point.x, model.x_axis);
            const y = projectY(point.y, model.y_axis);
            return x == null || y == null ? null : <circle key={`curve-${index}`} cx={x} cy={y} fill={pumpCurveColor} r="3.5" />;
          })}

          {bestEfficiencyPoint ? (() => {
            const x = projectX(bestEfficiencyPoint.x, model.x_axis);
            const y = projectY(bestEfficiencyPoint.y, model.y_axis);
            return x == null || y == null ? null : <circle cx={x} cy={y} fill={bepColor} r="7.5" stroke="#fff" strokeWidth="2" />;
          })() : null}

          {operatingPoint ? (() => {
            const x = projectX(operatingPoint.x, model.x_axis);
            const y = projectY(operatingPoint.y, model.y_axis);
            return x == null || y == null ? null : (
              <>
                <line
                  stroke={operatingColor}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeWidth="2"
                  x1={padding.left}
                  x2={x}
                  y1={y}
                  y2={y}
                />
                <line
                  stroke={operatingColor}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeWidth="2"
                  x1={x}
                  x2={x}
                  y1={y}
                  y2={height - padding.bottom}
                />
                <circle cx={x} cy={y} fill={operatingColor} r="6.5" stroke="#fff" strokeWidth="2" />
              </>
            );
          })() : null}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-medium">
        {[
          { label: "Curva do sistema", color: pumpCurveColor },
          { label: "BEP", color: bepColor },
          { label: "Operacao", color: operatingColor },
          { label: "Faixa de cavitacao aproximada", color: cavitationColor },
        ].map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 shadow-sm"
            style={{ borderColor: item.color, color: item.color }}
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}
