import { NumericChartGrid } from "@/components/viz/chart-grid";
import { HowItWorks, TheoryRef } from "@/components/how-it-works";

type CurvePoint = {
  flowRate: number;
  head: number;
};

type PumpSystemCurveProps = {
  operatingPoint: CurvePoint;
  systemPoints: CurvePoint[];
  title?: string;
};

const width = 820;
const height = 420;
const padding = { top: 28, right: 28, bottom: 48, left: 112 };
const pumpColor = "#0f766e";
const systemColor = "#d97706";
const operatingColor = "#dc2626";

function scale(value: number, min: number, max: number, start: number, end: number) {
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

function buildPumpCurve(operatingPoint: CurvePoint, maxFlowRate: number) {
  const effectiveFlow = Math.max(operatingPoint.flowRate * 1.15, maxFlowRate * 0.85, 0.05);
  const shutoffHead = Math.max(operatingPoint.head * 1.22, operatingPoint.head + 2, 5);
  const coefficient = (shutoffHead - operatingPoint.head) / Math.max(effectiveFlow ** 2, 1e-6);
  const sampleRates = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * maxFlowRate);

  return sampleRates.map((flowRate) => ({
    flowRate,
    head: Math.max(shutoffHead - coefficient * flowRate ** 2, 0),
  }));
}

export function PumpSystemCurve({
  operatingPoint,
  systemPoints,
  title = "Curva da bomba e do sistema",
}: PumpSystemCurveProps) {
  const sortedSystemPoints = [...systemPoints].sort((left, right) => left.flowRate - right.flowRate);
  const dataMaxFlowRate = Math.max(
    operatingPoint.flowRate,
    ...sortedSystemPoints.map((point) => point.flowRate),
    0,
  );
  const domainMaxFlowRate = Math.max(dataMaxFlowRate * 1.15, operatingPoint.flowRate * 1.25, 0.08);
  const pumpPoints = buildPumpCurve(operatingPoint, domainMaxFlowRate);
  const allPoints = [...sortedSystemPoints, ...pumpPoints, operatingPoint];
  const minFlowRate = Math.min(0, ...allPoints.map((point) => point.flowRate));
  const maxHead = Math.max(...allPoints.map((point) => point.head));
  const minHead = Math.min(...allPoints.map((point) => point.head));
  const xDomain: [number, number] = [minFlowRate, domainMaxFlowRate];
  const yDomain: [number, number] = [minHead, maxHead];

  const systemPath = buildPath(
    sortedSystemPoints.map((point) => ({
      x: scale(point.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right),
      y: scale(point.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top),
    })),
  );
  const pumpPath = buildPath(
    pumpPoints.map((point) => ({
      x: scale(point.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right),
      y: scale(point.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top),
    })),
  );

  const operatingX = scale(
    operatingPoint.flowRate,
    xDomain[0],
    xDomain[1],
    padding.left,
    width - padding.right,
  );
  const operatingY = scale(
    operatingPoint.head,
    yDomain[0],
    yDomain[1],
    height - padding.bottom,
    padding.top,
  );

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="pump-system-curve"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            A bomba local usa uma aproximação quadrática para mostrar o ponto de operação.
          </p>
        </div>
      </div>

      <HowItWorks title="Como funciona - Curva da bomba e do sistema">
        <p>
          Este gráfico compara a energia que a bomba consegue fornecer com a energia que o
          sistema exige ao longo da vazão. O eixo horizontal mostra a vazão e o vertical
          mostra a altura manométrica correspondente.
        </p>
        <p>
          O ponto em que as duas curvas se cruzam é o ponto operacional: ali a bomba e a
          instalação entram em equilíbrio. Se a curva do sistema subir, a vazão tende a
          cair; se a resistência do sistema diminuir, a vazão tende a aumentar.
        </p>
        <div className="space-y-1">
          <p className="font-medium text-slate-800">O que você pode extrair daqui:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>O ponto de operação em que bomba e sistema se equilibram.</li>
            <li>Se a instalação está mais restritiva ou mais permissiva para a mesma bomba.</li>
            <li>A tendência de vazão se a resistência da tubulação aumentar ou diminuir.</li>
            <li>Uma leitura rápida da folga entre a condição atual e a região de maior rendimento.</li>
          </ul>
        </div>
        <TheoryRef>Ref.: Fox, McDonald e Pritchard, Introdução à Mecânica dos Fluidos.</TheoryRef>
      </HowItWorks>

      <div className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" style={{ aspectRatio: `${width} / ${height}` }}>
        <NumericChartGrid
          xDomain={xDomain}
          yDomain={yDomain}
          width={width}
          height={height}
          padding={padding}
          xLabel="Vazão volumétrica (Q)"
          yLabel="Altura manométrica (H)"
        />

        <svg
          aria-label={title}
          className="absolute inset-0 block h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <path
            d={pumpPath}
            fill="none"
            stroke={pumpColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.25"
          />
          <path
            d={systemPath}
            fill="none"
            stroke={systemColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.25"
          />

          {pumpPoints.map((point, index) => (
            <circle
              key={`pump-${index}`}
              cx={scale(point.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right)}
              cy={scale(point.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top)}
              fill={pumpColor}
              r="3.75"
            />
          ))}
          {sortedSystemPoints.map((point, index) => (
            <circle
              key={`system-${index}`}
              cx={scale(point.flowRate, xDomain[0], xDomain[1], padding.left, width - padding.right)}
              cy={scale(point.head, yDomain[0], yDomain[1], height - padding.bottom, padding.top)}
              fill={systemColor}
              r="3.75"
            />
          ))}

          <line
            stroke={operatingColor}
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeWidth="2"
            x1={padding.left}
            x2={operatingX}
            y1={operatingY}
            y2={operatingY}
          />
          <line
            stroke={operatingColor}
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeWidth="2"
            x1={operatingX}
            x2={operatingX}
            y1={operatingY}
            y2={height - padding.bottom}
          />
          <circle cx={operatingX} cy={operatingY} fill={operatingColor} r="6" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>
    </section>
  );
}
