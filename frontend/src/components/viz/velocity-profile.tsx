import { formatTableNumberText } from "@/lib/table-number";

export type VelocityProfileArrow = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tip: string;
};

export type VelocityProfileModel = {
  title: string;
  regime: "laminar" | "transition" | "turbulent";
  color: string;
  label: string;
  reynolds: number;
  arrows: VelocityProfileArrow[];
  diameter_mm: number;
  velocity: number;
};

type VelocityProfileChartProps = {
  model: VelocityProfileModel;
};

export function VelocityProfileChart({ model }: VelocityProfileChartProps) {
  const centerY = 70;
  const halfRadius = 48;
  const top = centerY - halfRadius;
  const bottom = centerY + halfRadius;

  return (
    <div className="mx-auto mt-3 w-full max-w-[760px] rounded-xl border border-slate-200 p-3">
      <div className="mb-2 text-sm font-medium text-slate-800">{model.title}</div>
      <svg
        viewBox="0 0 400 140"
        className="w-full"
        style={{ maxHeight: 140 }}
        role="img"
        aria-label={`Perfil de velocidade ${model.label}`}
      >
        <rect x="0" y={top} width="400" height={halfRadius * 2} fill="rgba(59,130,246,0.06)" />
        <line x1="0" y1={top} x2="400" y2={top} stroke="#1F2937" strokeWidth={3} />
        <line x1="0" y1={bottom} x2="400" y2={bottom} stroke="#1F2937" strokeWidth={3} />
        <text
          x="6"
          y={top - 3}
          fontSize="9"
          fill="#6B7280"
          paintOrder="stroke"
          stroke="#f8fafc"
          strokeWidth="2.5"
        >
          parede
        </text>
        <text
          x="6"
          y={bottom + 10}
          fontSize="9"
          fill="#6B7280"
          paintOrder="stroke"
          stroke="#f8fafc"
          strokeWidth="2.5"
        >
          parede
        </text>
        {model.arrows.map((arrow, index) => (
          <g key={index}>
            <line
              x1={arrow.x1}
              y1={arrow.y1}
              x2={arrow.x2}
              y2={arrow.y2}
              stroke={model.color}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <polygon
              points={`${arrow.x2},${arrow.y2 - 4} ${arrow.x2 + 8},${arrow.y2} ${arrow.x2},${arrow.y2 + 4}`}
              fill={model.color}
            />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{
            background: `${model.color}20`,
            color: model.color,
            borderColor: `${model.color}50`,
          }}
        >
          {model.label} - Re &asymp; {formatTableNumberText(model.reynolds)}
        </span>
        <span className="text-xs text-muted-foreground">
          Perfil estimado para agua a 20 C - D = {formatTableNumberText(model.diameter_mm)} mm - V ={" "}
          {formatTableNumberText(model.velocity)} m/s
        </span>
      </div>
    </div>
  );
}
