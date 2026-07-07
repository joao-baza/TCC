import { formatTableNumberText } from "@/lib/table-number";

type ProcessSankeyStream = {
  name: string;
  direction: string;
  flowRate: number;
  compositions: Record<string, number>;
};

type ProcessSankeyProps = {
  streams: ProcessSankeyStream[];
  title?: string;
};

type Point = {
  x: number;
  y: number;
};

const width = 1020;

function toFixedLabel(value: number) {
  return formatTableNumberText(value);
}

function formatCompositionSummary(compositions: Record<string, number>) {
  return Object.entries(compositions)
    .slice(0, 2)
    .map(([component, value]) => `${component}: ${formatTableNumberText(value)}`)
    .join(" · ");
}

function isInput(direction: string) {
  return direction.toLowerCase().includes("entrada") || direction.toLowerCase().includes("input");
}

function buildFlowPath(start: Point, end: Point) {
  const midX = start.x + (end.x - start.x) * 0.45;
  return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
}

export function ProcessSankey({ streams, title = "Sankey de massa e energia" }: ProcessSankeyProps) {
  const sortedStreams = [...streams].sort((left, right) => right.flowRate - left.flowRate);
  const inputs = sortedStreams.filter((stream) => isInput(stream.direction));
  const outputs = sortedStreams.filter((stream) => !isInput(stream.direction));
  const maxFlow = Math.max(...sortedStreams.map((stream) => stream.flowRate), 1);

  const rowGap = 62;
  const topPadding = 68;
  const processHeight = Math.max(inputs.length, outputs.length) * rowGap + 24;
  const height = Math.max(processHeight + topPadding * 2, 240);
  const centerX = width / 2;
  const leftX = 120;
  const rightX = width - 120;
  const processLeft = centerX - 86;
  const processRight = centerX + 86;
  const processTop = (height - processHeight) / 2;
  const processBottom = processTop + processHeight;

  const inputPoints = inputs.map((stream, index) => ({
    stream,
    start: { x: leftX + 14, y: processTop + 44 + index * rowGap },
    end: { x: processLeft, y: processTop + 44 + index * rowGap },
  }));

  const outputPoints = outputs.map((stream, index) => ({
    stream,
    start: { x: processRight, y: processTop + 44 + index * rowGap },
    end: { x: rightX - 14, y: processTop + 44 + index * rowGap },
  }));

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="process-sankey"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Fluxos proporcionais em entradas, saídas, reciclos e purgas.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">{sortedStreams.length} correntes</p>
      </div>

      <svg
        aria-label={title}
        className="block w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <rect fill="#f8fafc" height={height} width={width} />

        <rect
          fill="#ffffff"
          height={processHeight}
          rx="24"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          width={172}
          x={processLeft}
          y={processTop}
        />
        <text
          fill="#0f172a"
          fontSize="15"
          fontWeight="600"
          paintOrder="stroke"
          stroke="#f8fafc"
          strokeWidth="3"
          textAnchor="middle"
          x={centerX}
          y={processTop + processHeight / 2 - 2}
        >
          Processo
        </text>
        <text
          fill="#64748b"
          fontSize="12"
          paintOrder="stroke"
          stroke="#f8fafc"
          strokeWidth="3"
          textAnchor="middle"
          x={centerX}
          y={processTop + processHeight / 2 + 18}
        >
          Balanceamento
        </text>

        <line
          stroke="#cbd5e1"
          strokeWidth="1.5"
          x1={processLeft}
          x2={processRight}
          y1={processTop}
          y2={processTop}
        />
        <line
          stroke="#cbd5e1"
          strokeWidth="1.5"
          x1={processLeft}
          x2={processRight}
          y1={processBottom}
          y2={processBottom}
        />

        {inputPoints.map(({ stream, start, end }) => {
          const thickness = Math.max(8, (stream.flowRate / maxFlow) * 28);
          return (
            <g key={`input-${stream.name}`}>
              <path
                d={buildFlowPath(start, end)}
                fill="none"
                stroke="rgba(37, 99, 235, 0.7)"
                strokeLinecap="round"
                strokeWidth={thickness}
              />
              <circle cx={start.x} cy={start.y} fill="#2563eb" r={6} />
              <circle cx={end.x} cy={end.y} fill="#2563eb" r={4.5} />
              <text
                fill="#0f172a"
                fontSize="13"
                fontWeight="600"
                paintOrder="stroke"
                stroke="#f8fafc"
                strokeWidth="3"
                x={24}
                y={start.y - 2}
              >
                {stream.name}
              </text>
              <text
                fill="#64748b"
                fontSize="11"
                paintOrder="stroke"
                stroke="#f8fafc"
                strokeWidth="3"
                x={24}
                y={start.y + 14}
              >
                {stream.direction} · {toFixedLabel(stream.flowRate)}
              </text>
              <text
                fill="#475569"
                fontSize="11"
                paintOrder="stroke"
                stroke="#f8fafc"
                strokeWidth="3"
                x={24}
                y={start.y + 28}
              >
                {formatCompositionSummary(stream.compositions)}
              </text>
            </g>
          );
        })}

        {outputPoints.map(({ stream, start, end }) => {
          const thickness = Math.max(8, (stream.flowRate / maxFlow) * 28);
          return (
            <g key={`output-${stream.name}`}>
              <path
                d={buildFlowPath(start, end)}
                fill="none"
                stroke="rgba(5, 150, 105, 0.72)"
                strokeLinecap="round"
                strokeWidth={thickness}
              />
              <circle cx={start.x} cy={start.y} fill="#059669" r={6} />
              <circle cx={end.x} cy={end.y} fill="#059669" r={4.5} />
              <text
                fill="#0f172a"
                fontSize="13"
                fontWeight="600"
                paintOrder="stroke"
                stroke="#f8fafc"
                strokeWidth="3"
                textAnchor="end"
                x={width - 24}
                y={start.y - 2}
              >
                {stream.name}
              </text>
              <text
                fill="#64748b"
                fontSize="11"
                paintOrder="stroke"
                stroke="#f8fafc"
                strokeWidth="3"
                textAnchor="end"
                x={width - 24}
                y={start.y + 14}
              >
                {stream.direction} · {toFixedLabel(stream.flowRate)}
              </text>
              <text
                fill="#475569"
                fontSize="11"
                paintOrder="stroke"
                stroke="#f8fafc"
                strokeWidth="3"
                textAnchor="end"
                x={width - 24}
                y={start.y + 28}
              >
                {formatCompositionSummary(stream.compositions)}
              </text>
            </g>
          );
        })}

        <text fill="#64748b" fontSize="12" x={processLeft} y={processTop - 14}>
          Entradas
        </text>
        <text fill="#64748b" fontSize="12" textAnchor="end" x={processRight} y={processTop - 14}>
          Saídas
        </text>
      </svg>
    </section>
  );
}
