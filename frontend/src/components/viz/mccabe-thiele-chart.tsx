import { NumericChartGrid } from "@/components/viz/chart-grid";
import { formatTableNumberText } from "@/lib/table-number";
import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { MathBlock } from "@/components/math-block";
import { VariablesTable } from "@/components/variables-table";

type EquilibriumPoint = {
  liquid_fraction: number;
  vapor_fraction: number;
  temperature: number;
};

type McCabeThieleChartProps = {
  fluid1: string;
  fluid2: string;
  equilibriumPoints: EquilibriumPoint[];
  distillateComposition: number;
  bottomsComposition: number;
  feedComposition: number;
  refluxRatio: number;
  qValue: number;
  maxStages?: number;
  title?: string;
};

type Point = {
  x: number;
  y: number;
};

type LinearEquation = {
  slope: number;
  intercept: number;
  evaluate: (x: number) => number;
};

const width = 820;
const height = 460;
const padding = { top: 28, right: 28, bottom: 54, left: 72 };

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildPath(points: Point[]) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildLinePath(line: Array<Point | null>) {
  return buildPath(line.filter((point): point is Point => point != null));
}

function formatComposition(value: number) {
  return formatTableNumberText(clamp01(value));
}

function sortEquilibriumPoints(points: EquilibriumPoint[]) {
  return [...points]
    .filter((point) => Number.isFinite(point.liquid_fraction) && Number.isFinite(point.vapor_fraction))
    .sort((left, right) => left.liquid_fraction - right.liquid_fraction);
}

function interpolateXForY(points: EquilibriumPoint[], y: number) {
  if (points.length === 0) {
    return null;
  }

  const cleanPoints = sortEquilibriumPoints(points);
  const first = cleanPoints[0];
  const last = cleanPoints[cleanPoints.length - 1];

  if (y <= first.vapor_fraction) {
    return first.liquid_fraction;
  }

  if (y >= last.vapor_fraction) {
    return last.liquid_fraction;
  }

  for (let index = 0; index < cleanPoints.length - 1; index += 1) {
    const left = cleanPoints[index];
    const right = cleanPoints[index + 1];
    const minY = Math.min(left.vapor_fraction, right.vapor_fraction);
    const maxY = Math.max(left.vapor_fraction, right.vapor_fraction);

    if (y < minY || y > maxY) {
      continue;
    }

    const span = right.vapor_fraction - left.vapor_fraction;
    const ratio = span === 0 ? 0 : (y - left.vapor_fraction) / span;
    return left.liquid_fraction + (right.liquid_fraction - left.liquid_fraction) * ratio;
  }

  return last.liquid_fraction;
}

function createLine(slope: number, intercept: number): LinearEquation {
  return {
    slope,
    intercept,
    evaluate(x: number) {
      return slope * x + intercept;
    },
  };
}

function lineIntersection(
  first: LinearEquation,
  second: LinearEquation,
) {
  const slopeDelta = first.slope - second.slope;
  if (Math.abs(slopeDelta) < 1e-9) {
    return null;
  }

  const x = (second.intercept - first.intercept) / slopeDelta;
  const y = first.evaluate(x);

  return { x, y };
}

export function McCabeThieleChart({
  fluid1,
  fluid2,
  equilibriumPoints,
  distillateComposition,
  bottomsComposition,
  feedComposition,
  refluxRatio,
  qValue,
  maxStages = 10,
  title = "McCabe-Thiele",
}: McCabeThieleChartProps) {
  const cleanPoints = sortEquilibriumPoints(equilibriumPoints);
  const compositionDomain = { min: 0, max: 1 };
  const equilibriumPathPoints = cleanPoints.map((point) => ({
    x: scale(clamp01(point.liquid_fraction), 0, 1, padding.left, width - padding.right),
    y: scale(clamp01(point.vapor_fraction), 0, 1, height - padding.bottom, padding.top),
  }));
  const diagonalPoints = [
    { x: scale(0, 0, 1, padding.left, width - padding.right), y: scale(0, 0, 1, height - padding.bottom, padding.top) },
    { x: scale(1, 0, 1, padding.left, width - padding.right), y: scale(1, 0, 1, height - padding.bottom, padding.top) },
  ];

  const distillate = clamp01(distillateComposition);
  const bottoms = clamp01(bottomsComposition);
  const feed = clamp01(feedComposition);
  const reflux = Math.max(refluxRatio, 0);
  const q = qValue;

  const rectifyingSlope = reflux / (reflux + 1);
  const rectifyingIntercept = distillate / (reflux + 1);
  const rectifyingLine = createLine(rectifyingSlope, rectifyingIntercept);

  let qLine: LinearEquation | null = null;
  let qLinePath: Point[] = [];
  if (Math.abs(q - 1) >= 1e-9) {
    const qSlope = q / (q - 1);
    const qIntercept = -feed / (q - 1);
    qLine = createLine(qSlope, qIntercept);
    qLinePath = [
      { x: 0, y: qLine.evaluate(0) },
      { x: 1, y: qLine.evaluate(1) },
    ];
  }

  const feedIntersection =
    qLine != null ? lineIntersection(rectifyingLine, qLine) : { x: feed, y: rectifyingLine.evaluate(feed) };
  const feedSwitchX = clamp01(feedIntersection?.x ?? feed);

  const strippingLineBase =
    feedIntersection != null
      ? createLine(
          Math.abs(feedIntersection.x - bottoms) < 1e-9
            ? 1
            : (feedIntersection.y - bottoms) / (feedIntersection.x - bottoms),
          bottoms -
            ((Math.abs(feedIntersection.x - bottoms) < 1e-9
              ? 1
              : (feedIntersection.y - bottoms) / (feedIntersection.x - bottoms)) *
              bottoms),
        )
      : null;

  const strippingLine =
    strippingLineBase ??
    createLine(1, 0);

  const stageSegments: Array<{ from: Point; to: Point }> = [];
  const stageMarkers: Point[] = [];
  let currentX = distillate;
  let currentY = distillate;
  let stageCount = 0;

  for (let index = 0; index < maxStages; index += 1) {
    const xEquilibrium = interpolateXForY(cleanPoints, currentY);
    if (xEquilibrium == null) {
      break;
    }

    const horizontalEnd = { x: clamp01(xEquilibrium), y: clamp01(currentY) };
    stageSegments.push({
      from: { x: clamp01(currentX), y: clamp01(currentY) },
      to: horizontalEnd,
    });
    stageMarkers.push(horizontalEnd);

    if (horizontalEnd.x <= bottoms + 1e-3) {
      break;
    }

    const useRectifying = horizontalEnd.x >= feedSwitchX || feedIntersection == null;
    const operatingLine = useRectifying ? rectifyingLine : strippingLine;
    const nextY = clamp01(operatingLine.evaluate(horizontalEnd.x));
    const verticalEnd = { x: horizontalEnd.x, y: nextY };
    stageSegments.push({
      from: horizontalEnd,
      to: verticalEnd,
    });
    stageMarkers.push(verticalEnd);

    currentX = verticalEnd.x;
    currentY = verticalEnd.y;
    stageCount += 1;

    if (currentX <= bottoms + 1e-3 || currentY <= bottoms + 1e-3) {
      break;
    }
  }

  const rectifyingLinePoints = [
    { x: 0, y: rectifyingLine.evaluate(0) },
    { x: 1, y: rectifyingLine.evaluate(1) },
  ];
  const strippingLinePoints = [
    { x: 0, y: strippingLine.evaluate(0) },
    { x: 1, y: strippingLine.evaluate(1) },
  ];

  const qLineVertical = Math.abs(q - 1) < 1e-9 ? feed : null;

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="mccabe-thiele-chart"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Construção didática de equilíbrio líquido-vapor para {fluid1} / {fluid2}.
          </p>
        </div>
        <div className="text-sm font-medium text-slate-700">
          <div>N teórico ≈ {formatTableNumberText(stageCount)}</div>
          <div>q = {formatTableNumberText(q)} · R = {formatTableNumberText(reflux)}</div>
        </div>
      </div>

      <HowItWorks title="Como funciona - McCabe-Thiele">
        <p>
          O método transforma o equilíbrio líquido-vapor em um caminho gráfico por estágios
          teóricos. O objetivo é estimar quantos pratos seriam necessários para atingir a
          especificação de topo e fundo.
        </p>
        <p>
          <code>xD</code> é a composição do destilado, <code>xB</code> é a composição do fundo,
          <code>zF</code> é a composição da alimentação, <code>R</code> é a razão de refluxo e
          <code>q</code> descreve o estado térmico da corrente de alimentação.
        </p>
        <MathBlock expression={"y = \\dfrac{R}{R+1}x + \\dfrac{x_D}{R+1}"} />
        <MathBlock expression={"y = \\dfrac{q}{q-1}x - \\dfrac{z_F}{q-1}"} />
        <VariablesTable
          rows={[
            { symbol: "x_D", description: "Composição de destilado (topo)", unit: "fração molar" },
            { symbol: "x_B", description: "Composição de fundo (bottoms)", unit: "fração molar" },
            { symbol: "z_F", description: "Composição da alimentação", unit: "fração molar" },
            { symbol: "R", description: "Razão de refluxo", unit: "adimensional" },
            { symbol: "q", description: "Estado térmico da alimentação", unit: "adimensional" },
          ]}
        />
        <p>
          Interpretação de <code>q</code>: 1 indica líquido saturado; 0 indica vapor saturado;
          entre 0 e 1 a alimentação está parcialmente vaporizada; acima de 1 a corrente está
          sub-resfriada.
        </p>
        <div className="space-y-1">
          <p className="font-medium text-slate-800">O que você pode extrair daqui:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Número de estágios teóricos necessários para a separação.</li>
            <li>Ponto de alimentação mais compatível com a linha q e com a mudança de seção.</li>
            <li>Impacto do refluxo na inclinação da linha operatória e no esforço de separação.</li>
            <li>Regiões de pinch e aproximação do limite de separação.</li>
          </ul>
        </div>
        <p className="text-sm text-slate-800">
          Finalidade: ligar especificação de produto, estado da alimentação e compromisso entre
          energia e número de estágios.
        </p>
        <TheoryRef>Ref.: Seader, Henley e Roper, Separation Process Principles, 4a ed., Wiley; University of Utah, Distillation design notes.</TheoryRef>
      </HowItWorks>

      <div
        className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <NumericChartGrid
          xDomain={[compositionDomain.min, compositionDomain.max]}
          yDomain={[compositionDomain.min, compositionDomain.max]}
          width={width}
          height={height}
          padding={padding}
          xLabel="x (líquido, fração molar)"
          yLabel="y (vapor, fração molar)"
        />

        <svg
          aria-label={title}
          className="absolute inset-0 block h-full w-full overflow-hidden"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <path
            d={buildPath(diagonalPoints)}
            fill="none"
            stroke="#94a3b8"
            strokeDasharray="5 5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d={buildPath(equilibriumPathPoints)}
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          <path
            d={buildLinePath(
              rectifyingLinePoints.map((point) => ({
                x: scale(point.x, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right),
                y: scale(point.y, compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top),
              })),
            )}
            fill="none"
            stroke="#1d4ed8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <path
            d={buildLinePath(
              strippingLinePoints.map((point) => ({
                x: scale(point.x, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right),
                y: scale(point.y, compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top),
              })),
            )}
            fill="none"
            stroke="#b45309"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />

          {qLineVertical != null ? (
            <line
              stroke="#7c3aed"
              strokeDasharray="5 5"
              strokeWidth="2"
              x1={scale(qLineVertical, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right)}
              x2={scale(qLineVertical, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right)}
              y1={padding.top}
              y2={height - padding.bottom}
            />
          ) : qLinePath.length > 0 ? (
            <path
              d={buildLinePath(
                qLinePath.map((point) => ({
                  x: scale(clamp01(point.x), compositionDomain.min, compositionDomain.max, padding.left, width - padding.right),
                  y: scale(clamp01(point.y), compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top),
                })),
              )}
              fill="none"
              stroke="#7c3aed"
              strokeDasharray="5 5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          ) : null}

          {equilibriumPathPoints.map((point, index) => (
            <circle key={`eq-${index}`} cx={point.x} cy={point.y} fill="#0f766e" r="3.25" />
          ))}

          {stageSegments.map((segment, index) => (
            <line
              key={`stage-${index}`}
              stroke={index % 2 === 0 ? "#1d4ed8" : "#b45309"}
              strokeWidth="2"
              x1={scale(segment.from.x, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right)}
              x2={scale(segment.to.x, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right)}
              y1={scale(segment.from.y, compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top)}
              y2={scale(segment.to.y, compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top)}
            />
          ))}

          {stageMarkers.map((point, index) => (
            <circle
              key={`marker-${index}`}
              cx={scale(point.x, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right)}
              cy={scale(point.y, compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top)}
              fill={index % 2 === 0 ? "#1d4ed8" : "#b45309"}
              r="4"
            />
          ))}

          <circle
            cx={scale(distillate, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right)}
            cy={scale(distillate, compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top)}
            fill="#16a34a"
            r="6"
          />
          <circle
            cx={scale(bottoms, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right)}
            cy={scale(bottoms, compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top)}
            fill="#dc2626"
            r="6"
          />
          <circle
            cx={scale(feed, compositionDomain.min, compositionDomain.max, padding.left, width - padding.right)}
            cy={scale(feed, compositionDomain.min, compositionDomain.max, height - padding.bottom, padding.top)}
            fill="#7c3aed"
            r="6"
          />
        </svg>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span data-chart-label="callout" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          xD = {formatComposition(distillate)}
        </span>
        <span data-chart-label="callout" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          xB = {formatComposition(bottoms)}
        </span>
        <span data-chart-label="callout" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          zF = {formatComposition(feed)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Diagonal y = x
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Curva de equilíbrio
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Linha de enriquecimento
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Linha de esgotamento
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Linha q
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Componente leve</p>
          <p className="mt-1 text-sm text-slate-900">{fluid1}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Componente pesado</p>
          <p className="mt-1 text-sm text-slate-900">{fluid2}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Linha de operação</p>
          <p className="mt-1 text-sm text-slate-900">
            xD={formatComposition(distillate)} · xB={formatComposition(bottoms)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Alimentação</p>
          <p className="mt-1 text-sm text-slate-900">
            zF={formatComposition(feed)} · q={formatTableNumberText(q)}
          </p>
        </div>
      </div>
    </section>
  );
}
