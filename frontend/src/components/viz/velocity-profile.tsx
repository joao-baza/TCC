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

const transitionStreamlines = [
  "M16 38 C55 28 86 54 126 39 C164 25 189 62 228 42 C271 24 306 56 376 38",
  "M16 68 C48 84 84 48 120 70 C157 94 192 43 232 69 C270 94 322 49 376 70",
  "M16 101 C55 82 88 112 130 96 C169 81 202 113 244 95 C293 74 331 110 376 97",
] as const;

const turbulentStreamlines = [
  "M12 34 C34 24 57 55 82 39 C105 25 126 65 105 72 C82 80 72 49 98 35 C126 24 148 50 176 42 C205 33 224 24 244 37 C266 53 239 70 257 79 C280 91 306 54 330 41 C354 28 376 58 388 46",
  "M12 52 C34 75 56 38 78 60 C97 82 121 46 143 66 C167 90 136 102 158 110 C181 116 202 91 191 77 C178 61 208 44 234 58 C258 71 244 97 269 103 C296 110 308 77 336 79 C364 82 377 104 388 91",
  "M12 76 C31 52 58 96 82 78 C104 61 128 103 110 111 C88 116 67 99 87 87 C109 73 138 96 164 84 C191 71 193 40 219 30 C246 24 271 56 249 65 C226 73 221 98 246 111 C273 116 296 94 322 101 C350 110 373 90 388 108",
  "M12 98 C38 116 59 84 90 104 C119 116 143 108 170 112 C201 116 224 99 245 83 C269 65 285 35 312 44 C338 54 321 78 345 87 C370 96 381 60 388 65",
  "M12 112 C31 98 49 107 66 114 C88 116 104 100 128 88 C151 77 170 86 185 99 C201 113 224 110 244 101 C269 90 283 105 304 112 C332 116 356 105 379 112 C383 113 386 112 388 110",
] as const;

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
        <defs>
          <marker
            id={`velocity-profile-tip-${model.regime}`}
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path d="M0 0L8 4L0 8Z" fill={model.color} />
          </marker>
        </defs>
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
        {model.regime === "laminar"
          ? model.arrows.map((arrow, index) => (
              <g data-regime-flow="laminar-vector" key={index}>
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
            ))
          : (model.regime === "transition" ? transitionStreamlines : turbulentStreamlines).map(
              (path, index) => (
                <path
                  data-regime-flow={
                    model.regime === "transition"
                      ? "transition-streamline"
                      : "turbulent-streamline"
                  }
                  d={path}
                  fill="none"
                  key={path}
                  markerEnd={`url(#velocity-profile-tip-${model.regime})`}
                  opacity={model.regime === "turbulent" && index % 2 === 1 ? 0.78 : 1}
                  stroke={model.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={
                    model.regime === "transition" ? 2.5 : index % 2 === 1 ? 2.1 : 2.5
                  }
                />
              ),
            )}
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
