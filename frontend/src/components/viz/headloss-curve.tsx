import { NumericChartGrid } from "@/components/viz/chart-grid";
import { expandNumericDomain } from "@/components/viz/chart-axis-utils";
import { HowItWorks, TheoryRef } from "@/components/how-it-works";

type HeadlossCurvePoint = {
  flowRate: number;
  headloss: number;
};

type HeadlossCurveProps = {
  points: HeadlossCurvePoint[];
  operationalPoint: HeadlossCurvePoint;
};

const width = 760;
const height = 360;
const padding = { top: 28, right: 28, bottom: 44, left: 104 };

function scaleValue(value: number, min: number, max: number, start: number, end: number) {
  if (min === max) {
    return (start + end) / 2;
  }

  return start + ((value - min) / (max - min)) * (end - start);
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function HeadlossCurve({ points, operationalPoint }: HeadlossCurveProps) {
  const sortedPoints = [...points].sort((left, right) => left.flowRate - right.flowRate);
  const allPoints = [...sortedPoints, operationalPoint];
  const flowDomain = expandNumericDomain(allPoints.map((point) => point.flowRate));
  const headlossDomain = expandNumericDomain(allPoints.map((point) => point.headloss));

  const plottedPoints = sortedPoints.map((point) => ({
    ...point,
    x: scaleValue(point.flowRate, flowDomain.min, flowDomain.max, padding.left, width - padding.right),
    y: scaleValue(point.headloss, headlossDomain.min, headlossDomain.max, height - padding.bottom, padding.top),
  }));

  const pathData = plottedPoints.length > 1 ? buildPath(plottedPoints) : "";
  const operationalX = scaleValue(
    operationalPoint.flowRate,
    flowDomain.min,
    flowDomain.max,
    padding.left,
    width - padding.right,
  );
  const operationalY = scaleValue(
    operationalPoint.headloss,
    headlossDomain.min,
    headlossDomain.max,
    height - padding.bottom,
    padding.top,
  );

  return (
    <section className="mx-auto mt-3 w-full max-w-[760px] rounded-xl border border-slate-200 p-3">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-slate-800">Perda de Carga × Vazão</h3>
      </div>

      <HowItWorks title="Como funciona - Perda de Carga">
        <p>
          Este gráfico ajuda a visualizar como a perda de carga cresce com a vazão e onde o sistema
          começa a exigir mais da bomba.
        </p>
        <p>
          A curva usa o método selecionado no formulário e o ponto vermelho marca a condição atual
          de operação.
        </p>
        <div className="space-y-1">
          <p className="font-medium text-slate-800">O que você pode extrair daqui:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Vazão em que a perda de carga começa a crescer de forma mais sensível.</li>
            <li>Comparação visual entre a condição atual e outras vazões possíveis.</li>
            <li>Impacto agregado do método, do diâmetro e dos acessórios no sistema.</li>
            <li>Base para estimar a altura que a bomba precisa fornecer ao circuito.</li>
          </ul>
        </div>
        <TheoryRef>Ref.: White, Mecânica dos Fluidos, 8a ed., McGraw-Hill, 2018.</TheoryRef>
      </HowItWorks>

      <div className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" style={{ aspectRatio: `${width} / ${height}` }}>
        <NumericChartGrid
          xDomain={[flowDomain.min, flowDomain.max]}
          yDomain={[headlossDomain.min, headlossDomain.max]}
          width={width}
          height={height}
          padding={padding}
          xLabel="Vazão volumétrica (m³/s)"
          yLabel="Perda de carga acumulada (m)"
        />

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 block h-full w-full"
          role="img"
          aria-label="Curva de perda de carga"
          preserveAspectRatio="xMidYMid meet"
        >
          {pathData ? <path d={pathData} fill="none" stroke="#2563EB" strokeWidth="2.5" /> : null}
          {plottedPoints.map((point) => (
            <circle key={`${point.flowRate}-${point.headloss}`} cx={point.x} cy={point.y} r="3" fill="#2563EB" />
          ))}
          <circle cx={operationalX} cy={operationalY} r="5" fill="#DC2626" />
        </svg>
      </div>

    </section>
  );
}
