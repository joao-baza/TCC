import { HowItWorks, TheoryRef } from "@/components/how-it-works";

type Point = {
  x: number;
  y: number;
};

type TernaryGuideLine = {
  start: Point;
  end: Point;
};

type TernaryStreamPoint = {
  label: string;
  summary: string;
  x: number;
  y: number;
  color: string;
};

type TernaryDiagramProps = {
  title: string;
  subtitle?: string | null;
  componentLabels: string[];
  boundary: Point[];
  guideLines: TernaryGuideLine[];
  streams: TernaryStreamPoint[];
};

const width = 760;
const height = 420;
const padding = { top: 34, right: 34, bottom: 48, left: 34 };

function scaleX(value: number) {
  return padding.left + (value * (width - padding.left - padding.right));
}

function scaleY(value: number) {
  return height - padding.bottom - (value * (height - padding.top - padding.bottom));
}

function buildTrianglePath(points: Point[]) {
  if (points.length < 3) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.x)} ${scaleY(point.y)}`)
    .join(" ")
    .concat(" Z");
}

export function TernaryDiagram({
  title,
  subtitle,
  componentLabels,
  boundary,
  guideLines,
  streams,
}: TernaryDiagramProps) {
  const vertexLabels = [
    {
      label: componentLabels[0] ?? "Componente A",
      anchor: "end" as const,
      x: boundary[0] ? scaleX(boundary[0].x) - 12 : padding.left,
      y: boundary[0] ? scaleY(boundary[0].y) + 4 : padding.top,
    },
    {
      label: componentLabels[1] ?? "Componente B",
      anchor: "start" as const,
      x: boundary[1] ? scaleX(boundary[1].x) + 12 : width - padding.right,
      y: boundary[1] ? scaleY(boundary[1].y) + 4 : padding.top,
    },
    {
      label: componentLabels[2] ?? "Componente C",
      anchor: "middle" as const,
      x: boundary[2] ? scaleX(boundary[2].x) : width / 2,
      y: boundary[2] ? scaleY(boundary[2].y) - 12 : padding.top,
    },
  ];

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="ternary-diagram"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>
      </div>

      <HowItWorks title="Como funciona - Diagrama Ternário">
        <p>
          O backend normaliza a composição dos três componentes, projeta a corrente no plano
          ternário e devolve a geometria pronta para renderização.
        </p>
        <p>
          A leitura continua igual: cada vértice representa um componente puro, cada lado uma
          mistura binária, e o interior a composição ternária da corrente atual.
        </p>
        <TheoryRef>
          Ref.: Seader, Henley e Roper, Separation Process Principles, 4a ed., Wiley; DeVoe,
          Thermodynamics and Chemistry, diagramas ternários.
        </TheoryRef>
      </HowItWorks>

      <svg
        aria-label={title}
        className="block w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <rect fill="#f8fafc" height={height} width={width} />

        <path
          d={buildTrianglePath(boundary)}
          fill="rgba(14, 165, 233, 0.03)"
          stroke="#94a3b8"
          strokeWidth="2"
        />

        {vertexLabels.map((vertex, index) => (
          <g key={vertex.label}>
            <circle cx={vertex.x} cy={vertex.y} fill="#0f172a" r="2.8" />
            <text
              fill="#0f172a"
              fontSize="12"
              fontWeight="700"
              paintOrder="stroke"
              stroke="#f8fafc"
              strokeWidth="3"
              textAnchor={vertex.anchor}
              x={vertex.x}
              y={vertex.y - (index === 2 ? 2 : 0)}
            >
              {vertex.label}
            </text>
          </g>
        ))}

        {guideLines.map((guideLine, index) => (
          <line
            key={index}
            stroke="#cbd5e1"
            strokeDasharray="5 6"
            strokeWidth="1.2"
            x1={scaleX(guideLine.start.x)}
            x2={scaleX(guideLine.end.x)}
            y1={scaleY(guideLine.start.y)}
            y2={scaleY(guideLine.end.y)}
          />
        ))}

        {streams.map((stream, index) => (
          <g key={stream.label}>
            <circle cx={scaleX(stream.x)} cy={scaleY(stream.y)} fill={stream.color} r="6" />
            <circle
              cx={scaleX(stream.x)}
              cy={scaleY(stream.y)}
              fill="none"
              r="8"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              fill="#0f172a"
              fontSize="12"
              fontWeight="600"
              paintOrder="stroke"
              stroke="#f8fafc"
              strokeWidth="3"
              x={scaleX(stream.x) + 10}
              y={scaleY(stream.y) - 10 - index * 2}
            >
              {stream.label}
            </text>
            <text
              fill="#475569"
              fontSize="11"
              paintOrder="stroke"
              stroke="#f8fafc"
              strokeWidth="3"
              x={scaleX(stream.x) + 10}
              y={scaleY(stream.y) + 6 - index * 2}
            >
              {stream.summary}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
