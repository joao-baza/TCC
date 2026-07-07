type TernaryStream = {
  name: string;
  direction?: string;
  compositions: Record<string, number>;
};

type TernaryDiagramProps = {
  components: string[];
  streams: TernaryStream[];
  title?: string;
};

type Point = {
  x: number;
  y: number;
};

const width = 760;
const height = 420;
const padding = { top: 34, right: 34, bottom: 48, left: 34 };

function formatNumber(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function safePoint(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function buildTrianglePath(left: Point, right: Point, top: Point) {
  return `M ${left.x} ${left.y} L ${right.x} ${right.y} L ${top.x} ${top.y} Z`;
}

function formatCompositionSummary(compositions: Array<[string, number]>) {
  return compositions.map(([component, value]) => `${component}: ${formatNumber(value)}`).join(" · ");
}

export function TernaryDiagram({
  components,
  streams,
  title = "Diagrama ternário",
}: TernaryDiagramProps) {
  const selectedComponents = components.slice(0, 3);
  const [componentA, componentB, componentC] = selectedComponents;

  if (selectedComponents.length < 3 || !componentA || !componentB || !componentC) {
    return (
      <section
        className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
        data-testid="ternary-diagram"
      >
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Configure ao menos 3 componentes para exibir o diagrama.
          </p>
        </div>
      </section>
    );
  }

  const left = { x: padding.left + 32, y: height - padding.bottom - 20 };
  const right = { x: width - padding.right - 32, y: height - padding.bottom - 20 };
  const top = { x: width / 2, y: padding.top + 6 };
  const triangleHeight = left.y - top.y;
  const triangleWidth = right.x - left.x;

  const projectedStreams = streams
    .map((stream) => {
      const raw = [
        safePoint(Number(stream.compositions[componentA] ?? 0)),
        safePoint(Number(stream.compositions[componentB] ?? 0)),
        safePoint(Number(stream.compositions[componentC] ?? 0)),
      ];
      const total = raw.reduce((sum, value) => sum + value, 0);
      if (!(total > 0)) {
        return null;
      }

      const [a, b, c] = raw.map((value) => value / total);
      return {
        ...stream,
        point: {
          x: left.x + triangleWidth * (b + c / 2),
          y: left.y - triangleHeight * c,
        },
        summary: formatCompositionSummary([
          [componentA, a],
          [componentB, b],
          [componentC, c],
        ]),
      };
    })
    .filter((stream): stream is NonNullable<typeof stream> => stream !== null);

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="ternary-diagram"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Projeção normalizada dos 3 primeiros componentes do caso atual.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">{projectedStreams.length} ponto(s)</p>
      </div>

      <svg
        aria-label={title}
        className="block w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <rect fill="#f8fafc" height={height} width={width} />

        <path
          d={buildTrianglePath(left, right, top)}
          fill="rgba(14, 165, 233, 0.03)"
          stroke="#94a3b8"
          strokeWidth="2"
        />

        <line
          stroke="#cbd5e1"
          strokeDasharray="5 6"
          strokeWidth="1.2"
          x1={left.x + triangleWidth * 0.25}
          x2={left.x + triangleWidth * 0.75}
          y1={left.y - triangleHeight * 0.25}
          y2={left.y - triangleHeight * 0.25}
        />
        <line
          stroke="#cbd5e1"
          strokeDasharray="5 6"
          strokeWidth="1.2"
          x1={left.x + triangleWidth * 0.125}
          x2={left.x + triangleWidth * 0.625}
          y1={left.y - triangleHeight * 0.5}
          y2={left.y - triangleHeight * 0.5}
        />
        <line
          stroke="#cbd5e1"
          strokeDasharray="5 6"
          strokeWidth="1.2"
          x1={left.x + triangleWidth * 0.375}
          x2={left.x + triangleWidth * 0.875}
          y1={left.y - triangleHeight * 0.75}
          y2={left.y - triangleHeight * 0.75}
        />

        {projectedStreams.map((stream, index) => (
          <g key={stream.name}>
            <circle
              cx={stream.point.x}
              cy={stream.point.y}
              fill={stream.direction?.toLowerCase().includes("sa") ? "#059669" : "#2563eb"}
              r="6"
            />
            <circle
              cx={stream.point.x}
              cy={stream.point.y}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              r="8"
            />
            <text
              fill="#0f172a"
              fontSize="12"
              fontWeight="600"
              x={stream.point.x + 10}
              y={stream.point.y - 10 - index * 2}
            >
              {stream.name}
            </text>
            <text
              fill="#475569"
              fontSize="11"
              x={stream.point.x + 10}
              y={stream.point.y + 6 - index * 2}
            >
              {stream.summary}
            </text>
          </g>
        ))}

        <text fill="#0f172a" fontSize="13" fontWeight="600" textAnchor="middle" x={left.x} y={left.y + 24}>
          {componentA}
        </text>
        <text fill="#0f172a" fontSize="13" fontWeight="600" textAnchor="middle" x={right.x} y={right.y + 24}>
          {componentB}
        </text>
        <text fill="#0f172a" fontSize="13" fontWeight="600" textAnchor="middle" x={top.x} y={top.y - 12}>
          {componentC}
        </text>

        <text fill="#475569" fontSize="12" textAnchor="middle" x={left.x - 6} y={left.y + 42}>
          100%
        </text>
        <text fill="#475569" fontSize="12" textAnchor="middle" x={right.x + 6} y={right.y + 42}>
          100%
        </text>
        <text fill="#475569" fontSize="12" textAnchor="middle" x={top.x} y={top.y - 28}>
          100%
        </text>
      </svg>

      <div className="grid gap-3 md:grid-cols-3">
        {selectedComponents.map((component) => (
          <div key={component} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {component}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
