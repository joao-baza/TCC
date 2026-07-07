import { formatTableNumberText } from "@/lib/table-number";

type RecyclePurgeSplit = {
  parentStream: string;
  recycleStream: string;
  purgeStream: string;
  fraction: number;
};

type RecyclePurgeMapProps = {
  splits: RecyclePurgeSplit[];
  title?: string;
};

const width = 820;
const height = 220;

function scaleFraction(value: number) {
  return Math.max(0, Math.min(1, value));
}

function formatFraction(value: number) {
  return formatTableNumberText(value);
}

function buildCurve(startX: number, startY: number, endX: number, endY: number) {
  const deltaX = endX - startX;
  const controlX = startX + deltaX * 0.5;
  return `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
}

export function RecyclePurgeMap({
  splits,
  title = "Mapa de reciclo e purga",
}: RecyclePurgeMapProps) {
  const sortedSplits = [...splits];

  return (
    <section
      className="mx-auto w-full max-w-[760px] space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="recycle-purge-map"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Diagrama simplificado para acompanhar como a corrente principal se divide entre reciclo
            e purga.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">{sortedSplits.length} split(s)</p>
      </div>

      {sortedSplits.length ? (
        <div className="space-y-4">
          {sortedSplits.map((split, index) => {
            const recycleRatio = scaleFraction(split.fraction);
            const purgeRatio = scaleFraction(1 - recycleRatio);
            const recycleWidth = Math.max(12, recycleRatio * 240);
            const purgeWidth = Math.max(12, purgeRatio * 240);
            const parentX = 410;
            const parentY = 30;
            const splitX = 410;
            const splitY = 92;
            const recycleX = 220;
            const recycleY = 180;
            const purgeX = 600;
            const purgeY = 180;

            return (
              <div key={`${split.parentStream}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Split {index + 1}
                    </p>
                    <p className="text-base font-semibold text-slate-900">{split.parentStream}</p>
                  </div>
                  <p className="text-sm text-slate-700">R = {formatFraction(recycleRatio)}</p>
                </div>

                <svg
                  aria-label={`${title} ${split.parentStream}`}
                  className="block w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  viewBox={`0 0 ${width} ${height}`}
                >
                  <defs>
                    <marker
                      id={`arrow-${index}`}
                      markerHeight="8"
                      markerWidth="8"
                      orient="auto"
                      refX="7"
                      refY="4"
                    >
                      <path d="M 0 0 L 8 4 L 0 8 z" fill="#64748b" />
                    </marker>
                  </defs>

                  <rect fill="#f8fafc" height={height} width={width} />

                  <rect
                    fill="#eff6ff"
                    height="42"
                    rx="16"
                    stroke="#93c5fd"
                    strokeWidth="1.5"
                    width="180"
                    x={parentX - 90}
                    y={parentY}
                  />
                  <text
                    fill="#1e3a8a"
                    fontSize="14"
                    fontWeight="600"
                    paintOrder="stroke"
                    stroke="#f8fafc"
                    strokeWidth="3"
                    textAnchor="middle"
                    x={parentX}
                    y={parentY + 25}
                  >
                    {split.parentStream}
                  </text>

                  <rect
                    fill="#fff7ed"
                    height="42"
                    rx="16"
                    stroke="#fdba74"
                    strokeWidth="1.5"
                    width="180"
                    x={splitX - 90}
                    y={splitY}
                  />
                  <text
                    fill="#9a3412"
                    fontSize="14"
                    fontWeight="600"
                    paintOrder="stroke"
                    stroke="#f8fafc"
                    strokeWidth="3"
                    textAnchor="middle"
                    x={splitX}
                    y={splitY + 25}
                  >
                    Divisão
                  </text>

                  <rect
                    fill="#ecfeff"
                    height="42"
                    rx="16"
                    stroke="#67e8f9"
                    strokeWidth="1.5"
                    width={recycleWidth}
                    x={recycleX - recycleWidth / 2}
                    y={recycleY}
                  />
                  <text
                    fill="#0f766e"
                    fontSize="14"
                    fontWeight="600"
                    paintOrder="stroke"
                    stroke="#f8fafc"
                    strokeWidth="3"
                    textAnchor="middle"
                    x={recycleX}
                    y={recycleY + 25}
                  >
                    {split.recycleStream}
                  </text>

                  <rect
                    fill="#f0fdf4"
                    height="42"
                    rx="16"
                    stroke="#86efac"
                    strokeWidth="1.5"
                    width={purgeWidth}
                    x={purgeX - purgeWidth / 2}
                    y={purgeY}
                  />
                  <text
                    fill="#166534"
                    fontSize="14"
                    fontWeight="600"
                    paintOrder="stroke"
                    stroke="#f8fafc"
                    strokeWidth="3"
                    textAnchor="middle"
                    x={purgeX}
                    y={purgeY + 25}
                  >
                    {split.purgeStream}
                  </text>

                  <path
                    d={buildCurve(parentX, parentY + 42, splitX, splitY)}
                    fill="none"
                    markerEnd={`url(#arrow-${index})`}
                    stroke="#64748b"
                    strokeWidth="2.5"
                  />
                  <path
                    d={buildCurve(splitX - 16, splitY + 42, recycleX, recycleY)}
                    fill="none"
                    markerEnd={`url(#arrow-${index})`}
                    stroke="#0891b2"
                    strokeWidth={Math.max(4, recycleRatio * 10)}
                  />
                  <path
                    d={buildCurve(splitX + 16, splitY + 42, purgeX, purgeY)}
                    fill="none"
                    markerEnd={`url(#arrow-${index})`}
                    stroke="#16a34a"
                    strokeWidth={Math.max(4, purgeRatio * 10)}
                  />

                  <text
                    fill="#475569"
                    fontSize="12"
                    paintOrder="stroke"
                    stroke="#f8fafc"
                    strokeWidth="3"
                    textAnchor="middle"
                    x={splitX - 95}
                    y={126}
                  >
                    Reciclo = {formatFraction(recycleRatio)}
                  </text>
                  <text
                    fill="#475569"
                    fontSize="12"
                    paintOrder="stroke"
                    stroke="#f8fafc"
                    strokeWidth="3"
                    textAnchor="middle"
                    x={splitX + 95}
                    y={126}
                  >
                    Purga = {formatFraction(purgeRatio)}
                  </text>
                </svg>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-muted-foreground">
          Nenhum split configurado.
        </div>
      )}
    </section>
  );
}
