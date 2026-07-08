export type RegimeKey = "laminar" | "transition" | "turbulent";

export type RegimeRulerModel = {
  title: string;
  description: string;
  domain: {
    min: number;
    max: number;
  };
  segments: Array<{
    regime: RegimeKey;
    label: string;
    color: string;
    x: number;
    width: number;
  }>;
  ticks: Array<{
    value: number;
    label: string;
    x: number;
  }>;
  marker: {
    x: number;
    label: string;
    status: string;
    regime: RegimeKey;
    regime_label: string;
    color: string;
    text_anchor: "start" | "middle" | "end";
  };
};

export function RegimeRuler({ model }: { model: RegimeRulerModel }) {
  return (
    <section className="mx-auto mt-3 w-full max-w-[760px] rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-800">{model.title}</h3>
        <span
          className="rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${model.marker.color}20`,
            borderColor: `${model.marker.color}50`,
            color: model.marker.color,
          }}
        >
          {model.marker.regime_label}
        </span>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">{model.description}</p>

      <svg
        aria-label="Régua do regime do escoamento"
        className="block h-auto w-full"
        role="img"
        viewBox="0 0 760 170"
      >
        <title>Régua do regime do escoamento</title>
        <desc>
          Escala linear de Reynolds com zonas laminar, transição e turbulento. Marcador na
          posição atual.
        </desc>
        <rect x="0" y="0" width="760" height="170" fill="#f8fafc" rx="16" />

        <g aria-hidden="true">
          {model.ticks.map((tick) => (
            <line
              key={`grid-${tick.value}`}
              x1={tick.x}
              x2={tick.x}
              y1={28}
              y2={100}
              stroke="#e2e8f0"
              strokeDasharray="3 4"
              strokeWidth="1"
            />
          ))}
        </g>

        {model.segments.map((segment, index) => (
          <rect
            key={segment.regime}
            x={segment.x}
            y="48"
            width={segment.width}
            height="28"
            rx={index === 1 ? "0" : "14"}
            fill={segment.color}
          />
        ))}

        <line x1="40" x2="720" y1="48" y2="48" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="40" x2="720" y1="76" y2="76" stroke="#cbd5e1" strokeWidth="1.5" />

        {model.ticks.map((tick) => (
          <g key={`tick-${tick.value}`}>
            <line x1={tick.x} x2={tick.x} y1="80" y2="92" stroke="#64748b" strokeWidth="1.5" />
            <text
              x={tick.x}
              y="110"
              fill="#64748b"
              fontSize="11"
              textAnchor="middle"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {model.segments.map((segment) => (
          <text
            key={`label-${segment.regime}`}
            x={segment.x + 16}
            y="66"
            fill={segment.regime === "laminar" ? "#eff6ff" : segment.regime === "transition" ? "#fff7ed" : "#fef2f2"}
            fontSize="13"
            fontWeight="600"
          >
            {segment.label}
          </text>
        ))}

        <line
          x1={model.marker.x}
          x2={model.marker.x}
          y1="38"
          y2="96"
          stroke="#0f172a"
          strokeWidth="2.5"
        />
        <circle cx={model.marker.x} cy="52" r="7" fill="#0f172a" />
        <circle cx={model.marker.x} cy="52" r="3.5" fill="#fff" />
        <text
          x={model.marker.x}
          y="24"
          fill="#0f172a"
          fontSize="12"
          fontWeight="600"
          textAnchor={model.marker.text_anchor}
        >
          {model.marker.label}
        </text>
        <text
          x={model.marker.x}
          y="38"
          fill="#475569"
          fontSize="11"
          textAnchor={model.marker.text_anchor}
        >
          {model.marker.status}
        </text>
      </svg>
    </section>
  );
}
