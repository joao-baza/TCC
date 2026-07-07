import type { Scenario } from "@/features/exploratory/types";

export type Regime = "laminar" | "transition" | "turbulent";

export const REGIME_COLOR: Record<Regime, string> = {
  laminar: "#2563EB",
  transition: "#D97706",
  turbulent: "#DC2626",
};

export const REGIME_LABEL: Record<Regime, string> = {
  laminar: "Laminar",
  transition: "Transição",
  turbulent: "Turbulento",
};

export function classifyRegime(reynolds: number): Regime {
  if (reynolds < 2300) {
    return "laminar";
  }

  if (reynolds >= 4000) {
    return "turbulent";
  }

  return "transition";
}

export type ProfileArrow = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tip: string;
};

export type VelocityProfile = {
  reynolds: number;
  regime: Regime;
  color: string;
  label: string;
  arrows: ProfileArrow[];
  diameterMm: number;
  velocity: number;
};

export function buildVelocityProfile(
  velocity: number,
  diameterMm: number,
): VelocityProfile {
  const diameterM = diameterMm / 1000;
  const reynolds = (1000 * velocity * diameterM) / 0.001;
  const regime = classifyRegime(reynolds);
  const isLaminar = regime === "laminar";
  const isTurbulent = regime === "turbulent";

  const ys = [-0.85, -0.65, -0.45, -0.25, 0, 0.25, 0.45, 0.65, 0.85];
  const maxLength = 260;
  const startX = 55;
  const centerY = 70;
  const halfRadius = 48;

  const arrows: ProfileArrow[] = ys.map((y) => {
    let relativeVelocity: number;
    if (isLaminar) {
      relativeVelocity = 1 - y * y;
    } else if (isTurbulent) {
      relativeVelocity = Math.pow(1 - Math.abs(y), 1 / 7);
    } else {
      const transitionFactor = (reynolds - 2300) / 1700;
      relativeVelocity =
        (1 - y * y) * (1 - transitionFactor) +
        Math.pow(1 - Math.abs(y), 1 / 7) * transitionFactor;
    }

    const length = Math.max(14, relativeVelocity * maxLength);
    const plottedY = centerY + y * halfRadius;
    return {
      x1: startX,
      y1: plottedY,
      x2: startX + length,
      y2: plottedY,
      tip: `${startX + length},${plottedY}`,
    };
  });

  return {
    reynolds,
    regime,
    color: REGIME_COLOR[regime],
    label: REGIME_LABEL[regime],
    arrows,
    diameterMm,
    velocity,
  };
}

export function VelocityProfileChart({
  velocity,
  diameterMm,
  scenarios = [],
}: {
  velocity: number;
  diameterMm: number;
  scenarios?: Scenario[];
}) {
  const profile = buildVelocityProfile(velocity, diameterMm);
  const centerY = 70;
  const halfRadius = 48;
  const top = centerY - halfRadius;
  const bottom = centerY + halfRadius;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 p-3">
      <div className="mb-2 text-sm font-medium text-slate-800">
        Perfil de Velocidade - Duto Circular
      </div>
      <svg
        viewBox="0 0 400 140"
        className="w-full"
        style={{ maxHeight: 140 }}
        role="img"
        aria-label={`Perfil de velocidade ${profile.label}`}
      >
        <rect x="0" y={top} width="400" height={halfRadius * 2} fill="rgba(59,130,246,0.06)" />
        <line x1="0" y1={top} x2="400" y2={top} stroke="#1F2937" strokeWidth={3} />
        <line x1="0" y1={bottom} x2="400" y2={bottom} stroke="#1F2937" strokeWidth={3} />
        <text x="6" y={top - 3} fontSize="9" fill="#6B7280">
          parede
        </text>
        <text x="6" y={bottom + 10} fontSize="9" fill="#6B7280">
          parede
        </text>
        {profile.arrows.map((arrow, index) => (
          <g key={index}>
            <line
              x1={arrow.x1}
              y1={arrow.y1}
              x2={arrow.x2}
              y2={arrow.y2}
              stroke={profile.color}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <polygon
              points={`${arrow.x2},${arrow.y2 - 4} ${arrow.x2 + 8},${arrow.y2} ${arrow.x2},${arrow.y2 + 4}`}
              fill={profile.color}
            />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{
            background: `${profile.color}20`,
            color: profile.color,
            borderColor: `${profile.color}50`,
          }}
        >
          {profile.label} - Re ~= {profile.reynolds.toFixed(0)}
        </span>
        <span className="text-xs text-muted-foreground">
          Perfil estimado para agua a 20 C - D = {profile.diameterMm.toFixed(1)} mm - V ={" "}
          {profile.velocity} m/s
        </span>
      </div>

      {scenarios.length > 0 ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            Cenários salvos
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {scenarios.map((scenario) => (
              <span
                key={scenario.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: scenario.color }}
                />
                {scenario.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
