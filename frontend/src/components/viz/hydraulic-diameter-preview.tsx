import { formatTableNumberText } from "@/lib/table-number";

type HydraulicShape = "circular" | "rectangular" | "annular" | "triangular" | "circularCap";

type HydraulicDiameterPreviewProps = {
  shape: HydraulicShape | "";
  parameters: Record<string, string>;
};

type PreviewChip = {
  label: string;
  value: string;
};

const viewWidth = 320;
const viewHeight = 220;
const fluidColor = "#0F5E9C";
const fluidOutline = "#0F172A";
const softOutline = "#94A3B8";
const labelColor = "#334155";
const boxPadding = 32;
const previewFrameClassName = "mt-3 rounded-xl border border-slate-200 p-3";
const previewCanvasClassName =
  "mx-auto mt-3 w-full max-w-[340px] rounded-xl border border-slate-200 bg-slate-50 p-5";
const previewSvgClassName = "block h-[180px] w-full";

function parsePositiveNumber(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatChipValue(value: number | null) {
  return value == null ? "—" : formatTableNumberText(value);
}

function buildTrianglePoints(sideA: number, sideB: number, sideC: number) {
  const x = (sideB ** 2 + sideC ** 2 - sideA ** 2) / (2 * sideC);
  const ySquared = Math.max(sideB ** 2 - x ** 2, 0);
  const y = Math.sqrt(ySquared);

  return [
    { x: 0, y: 0 },
    { x: sideC, y: 0 },
    { x, y },
  ];
}

function fitPoints(points: Array<{ x: number; y: number }>, width: number, height: number) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - boxPadding * 2) / spanX, (height - boxPadding * 2) / spanY);
  const scaledWidth = spanX * scale;
  const scaledHeight = spanY * scale;
  const offsetX = (width - scaledWidth) / 2 - minX * scale;
  const offsetY = (height - scaledHeight) / 2 - minY * scale;

  return points.map((point) => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  }));
}

function flipPointsVertically(points: Array<{ x: number; y: number }>) {
  const maxY = Math.max(...points.map((point) => point.y));
  return points.map((point) => ({
    x: point.x,
    y: maxY - point.y,
  }));
}

function normalizeRotation(angle: number) {
  if (angle > 90) {
    return angle - 180;
  }

  if (angle < -90) {
    return angle + 180;
  }

  return angle;
}

function renderEdgeLabel(
  start: { x: number; y: number },
  end: { x: number; y: number },
  label: string,
) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const rotation = normalizeRotation((Math.atan2(dy, dx) * 180) / Math.PI);
  const offsets: Record<string, { x: number; y: number }> = {
    a: { x: 26, y: -22 },
    b: { x: -26, y: -22 },
    c: { x: 0, y: 24 },
  };
  const offset = offsets[label] ?? { x: 0, y: 0 };
  const labelX = midX + offset.x;
  const labelY = midY + offset.y;

  return (
    <>
      <text
        x={labelX}
        y={labelY}
        fill={labelColor}
        fontSize="12"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${rotation} ${labelX} ${labelY})`}
      >
        {label}
      </text>
    </>
  );
}

function chip(label: string, value: number | null): PreviewChip {
  return {
    label,
    value: formatChipValue(value),
  };
}

function placeholder(message: string) {
  return (
    <section className={previewFrameClassName}>
      <h3 className="text-sm font-medium text-slate-800">Pré-visualização geométrica</h3>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </section>
  );
}

function renderCircular(diameter: number) {
  const radius = diameter / 2;
  const scale = Math.min((viewWidth - boxPadding * 2) / diameter, (viewHeight - boxPadding * 2) / diameter);
  const scaledRadius = radius * scale;
  const cx = viewWidth / 2;
  const cy = 92;
  const radiusGuideRatio = 0.72;
  const radiusLabelGap = 2;

  return {
    svg: (
      <>
        <circle cx={cx} cy={cy} r={scaledRadius} fill={fluidColor} stroke={fluidOutline} strokeWidth="2.5" />
        <line x1={cx - scaledRadius} x2={cx + scaledRadius} y1={cy + scaledRadius + 18} y2={cy + scaledRadius + 18} stroke={softOutline} strokeWidth="1.5" />
        <line x1={cx - scaledRadius} x2={cx - scaledRadius} y1={cy + scaledRadius + 14} y2={cy + scaledRadius + 22} stroke={softOutline} strokeWidth="1.5" />
        <line x1={cx + scaledRadius} x2={cx + scaledRadius} y1={cy + scaledRadius + 14} y2={cy + scaledRadius + 22} stroke={softOutline} strokeWidth="1.5" />
        <text x={cx} y={cy + scaledRadius + 36} fill={labelColor} fontSize="12" textAnchor="middle">
          D
        </text>
        <line
          x1={cx}
          x2={cx + scaledRadius * radiusGuideRatio}
          y1={cy}
          y2={cy - scaledRadius * radiusGuideRatio}
          stroke={softOutline}
          strokeWidth="1.5"
        />
        <circle cx={cx} cy={cy} r="2.5" fill={softOutline} />
        <text
          x={cx + scaledRadius * radiusGuideRatio + radiusLabelGap}
          y={cy - scaledRadius * radiusGuideRatio - 2}
          fill={labelColor}
          fontSize="12"
        >
          R
        </text>
      </>
    ),
    chips: [chip("D", diameter), chip("R", radius)],
  };
}

function renderRectangular(widthValue: number, heightValue: number) {
  const scale = Math.min(
    (viewWidth - boxPadding * 2) / widthValue,
    (viewHeight - boxPadding * 2) / heightValue,
  );
  const rectWidth = widthValue * scale;
  const rectHeight = heightValue * scale;
  const x = (viewWidth - rectWidth) / 2;
  const y = (viewHeight - rectHeight) / 2 - 8;
  const bottom = y + rectHeight;
  const right = x + rectWidth;

  return {
    svg: (
      <>
        <rect x={x} y={y} width={rectWidth} height={rectHeight} rx="6" fill={fluidColor} stroke={fluidOutline} strokeWidth="2.5" />
        <line x1={x} x2={right} y1={bottom + 18} y2={bottom + 18} stroke={softOutline} strokeWidth="1.5" />
        <line x1={x} x2={x} y1={bottom + 14} y2={bottom + 22} stroke={softOutline} strokeWidth="1.5" />
        <line x1={right} x2={right} y1={bottom + 14} y2={bottom + 22} stroke={softOutline} strokeWidth="1.5" />
        <text x={viewWidth / 2} y={bottom + 36} fill={labelColor} fontSize="12" textAnchor="middle">
          a
        </text>
        <line x1={right + 18} x2={right + 18} y1={y} y2={bottom} stroke={softOutline} strokeWidth="1.5" />
        <line x1={right + 14} x2={right + 22} y1={y} y2={y} stroke={softOutline} strokeWidth="1.5" />
        <line x1={right + 14} x2={right + 22} y1={bottom} y2={bottom} stroke={softOutline} strokeWidth="1.5" />
        <text x={right + 28} y={(y + bottom) / 2} fill={labelColor} fontSize="12" dominantBaseline="middle">
          b
        </text>
      </>
    ),
    chips: [chip("a", widthValue), chip("b", heightValue), chip("A = a·b", widthValue * heightValue)],
  };
}

function renderAnnular(outerDiameter: number, innerDiameter: number) {
  const scale = Math.min(
    (viewWidth - boxPadding * 2) / outerDiameter,
    (viewHeight - boxPadding * 2) / outerDiameter,
  );
  const outerRadius = (outerDiameter / 2) * scale;
  const innerRadius = (innerDiameter / 2) * scale;
  const cx = viewWidth / 2;
  const cy = 94;

  return {
    svg: (
      <>
        <circle cx={cx} cy={cy} r={outerRadius} fill={fluidColor} stroke={fluidOutline} strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r={innerRadius} fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
        <line x1={cx - outerRadius} x2={cx + outerRadius} y1={cy + outerRadius + 16} y2={cy + outerRadius + 16} stroke={softOutline} strokeWidth="1.5" />
        <text x={cx} y={cy + outerRadius + 34} fill={labelColor} fontSize="12" textAnchor="middle">
          Dext
        </text>
        <line x1={cx} x2={cx + innerRadius * 0.85} y1={cy} y2={cy} stroke={softOutline} strokeWidth="1.5" />
        <text x={cx + innerRadius * 0.92} y={cy - 4} fill={labelColor} fontSize="12">
          Dint
        </text>
      </>
    ),
    chips: [
      chip("Dext", outerDiameter),
      chip("Dint", innerDiameter),
      chip("Rext", outerDiameter / 2),
      chip("Rint", innerDiameter / 2),
    ],
  };
}

function renderTriangular(sideA: number, sideB: number, sideC: number) {
  const points = buildTrianglePoints(sideA, sideB, sideC);
  const fitted = fitPoints(flipPointsVertically(points), viewWidth, viewHeight - 16);
  const [aPoint, bPoint, cPoint] = fitted;

  return {
    svg: (
      <>
        <polygon points={fitted.map((point) => `${point.x},${point.y}`).join(" ")} fill={fluidColor} stroke={fluidOutline} strokeWidth="2.5" />
        {renderEdgeLabel(bPoint, cPoint, "a")}
        {renderEdgeLabel(aPoint, cPoint, "b")}
        {renderEdgeLabel(aPoint, bPoint, "c")}
      </>
    ),
    chips: [chip("a", sideA), chip("b", sideB), chip("c", sideC)],
  };
}

function renderCircularCap(diameter: number, height: number) {
  const radius = diameter / 2;
  const scale = Math.min(
    (viewWidth - boxPadding * 2) / diameter,
    (viewHeight - boxPadding * 2) / diameter,
  );
  const scaledRadius = radius * scale;
  const scaledHeight = clamp(height * scale, 0, diameter * scale);
  const isFullCircle = height >= diameter;
  const cx = viewWidth / 2;
  const cy = 96;
  const chordY = cy + scaledRadius - scaledHeight;
  const halfChord = Math.sqrt(Math.max(0, 2 * scaledRadius * scaledHeight - scaledHeight * scaledHeight));
  const leftX = cx - halfChord;
  const rightX = cx + halfChord;
  const largeArc = scaledHeight > scaledRadius ? 1 : 0;
  const radiusGuideRatio = 0.72;
  const radiusLabelGap = 2;

  return {
    svg: (
      <>
        {isFullCircle ? (
          <circle cx={cx} cy={cy} r={scaledRadius} fill={fluidColor} stroke={fluidOutline} strokeWidth="2.5" />
        ) : (
          <path
            d={`M ${leftX} ${chordY} A ${scaledRadius} ${scaledRadius} 0 ${largeArc} 0 ${rightX} ${chordY} L ${leftX} ${chordY} Z`}
            fill={fluidColor}
            stroke={fluidOutline}
            strokeWidth="2.5"
          />
        )}
        {!isFullCircle ? <circle cx={cx} cy={cy} r={scaledRadius} fill="none" stroke={fluidOutline} strokeWidth="2.5" /> : null}
        <line x1={cx - scaledRadius} x2={cx + scaledRadius} y1={cy + scaledRadius + 16} y2={cy + scaledRadius + 16} stroke={softOutline} strokeWidth="1.5" />
        <text x={cx} y={cy + scaledRadius + 34} fill={labelColor} fontSize="12" textAnchor="middle">
          D
        </text>
        <line x1={rightX + 18} x2={rightX + 18} y1={chordY} y2={cy + scaledRadius} stroke={softOutline} strokeWidth="1.5" />
        <text x={rightX + 28} y={(chordY + cy + scaledRadius) / 2} fill={labelColor} fontSize="12" dominantBaseline="middle">
          h
        </text>
        <line
          x1={cx}
          x2={cx + scaledRadius * radiusGuideRatio}
          y1={cy}
          y2={cy - scaledRadius * radiusGuideRatio}
          stroke={softOutline}
          strokeWidth="1.5"
        />
        <text
          x={cx + scaledRadius * radiusGuideRatio + radiusLabelGap}
          y={cy - scaledRadius * radiusGuideRatio - 2}
          fill={labelColor}
          fontSize="12"
        >
          R
        </text>
      </>
    ),
    chips: [chip("D", diameter), chip("h", height), chip("R", radius)],
  };
}

export function HydraulicDiameterPreview({ shape, parameters }: HydraulicDiameterPreviewProps) {
  if (!shape) {
    return placeholder("Selecione uma forma geométrica para ver o esboço proporcional.")
  }

  if (shape === "circular") {
    const diameter = parsePositiveNumber(parameters.diameter);
    if (diameter == null) {
      return placeholder("Informe o diâmetro para visualizar a seção circular.");
    }

    const preview = renderCircular(diameter);
    return (
      <section className={previewFrameClassName}>
        <h3 className="text-sm font-medium text-slate-800">Pré-visualização geométrica</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Seção circular preenchida, com D e R destacados.
        </p>
        <div className={previewCanvasClassName}>
          <svg className={previewSvgClassName} role="img" viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
            <title>Seção circular</title>
            <desc>Representação proporcional da seção circular com fluido.</desc>
            {preview.svg}
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {preview.chips.map((item) => (
            <span key={item.label} className="rounded-full border border-slate-200 bg-white px-3 py-1">
              {item.label} = {item.value}
            </span>
          ))}
        </div>
      </section>
    );
  }

  if (shape === "rectangular") {
    const widthValue = parsePositiveNumber(parameters.width);
    const heightValue = parsePositiveNumber(parameters.height);
    if (widthValue == null || heightValue == null) {
      return placeholder("Informe largura e altura para visualizar a seção retangular.");
    }

    const preview = renderRectangular(widthValue, heightValue);
    return (
      <section className={previewFrameClassName}>
        <h3 className="text-sm font-medium text-slate-800">Pré-visualização geométrica</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Seção retangular preenchida, proporcional a a e b.
        </p>
        <div className={previewCanvasClassName}>
          <svg className={previewSvgClassName} role="img" viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
            <title>Seção retangular</title>
            <desc>Representação proporcional da seção retangular com fluido.</desc>
            {preview.svg}
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {preview.chips.map((item) => (
            <span key={item.label} className="rounded-full border border-slate-200 bg-white px-3 py-1">
              {item.label} = {item.value}
            </span>
          ))}
        </div>
      </section>
    );
  }

  if (shape === "annular") {
    const outerDiameter = parsePositiveNumber(parameters.outer_diameter);
    const innerDiameter = parsePositiveNumber(parameters.inner_diameter);
    if (outerDiameter == null || innerDiameter == null || innerDiameter >= outerDiameter) {
      return placeholder("Informe diâmetros externo e interno válidos para visualizar o anel.");
    }

    const preview = renderAnnular(outerDiameter, innerDiameter);
    return (
      <section className={previewFrameClassName}>
        <h3 className="text-sm font-medium text-slate-800">Pré-visualização geométrica</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Geometria anular com a parede preenchida.
        </p>
        <div className={previewCanvasClassName}>
          <svg className={previewSvgClassName} role="img" viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
            <title>Seção anular</title>
            <desc>Representação proporcional da seção anular com fluido.</desc>
            {preview.svg}
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {preview.chips.map((item) => (
            <span key={item.label} className="rounded-full border border-slate-200 bg-white px-3 py-1">
              {item.label} = {item.value}
            </span>
          ))}
        </div>
      </section>
    );
  }

  if (shape === "triangular") {
    const sideA = parsePositiveNumber(parameters.side_a);
    const sideB = parsePositiveNumber(parameters.side_b);
    const sideC = parsePositiveNumber(parameters.side_c);
    if (
      sideA == null ||
      sideB == null ||
      sideC == null ||
      sideA + sideB <= sideC ||
      sideA + sideC <= sideB ||
      sideB + sideC <= sideA
    ) {
      return placeholder("Informe lados válidos para visualizar o triângulo.");
    }

    const preview = renderTriangular(sideA, sideB, sideC);
    return (
      <section className={previewFrameClassName}>
        <h3 className="text-sm font-medium text-slate-800">Pré-visualização geométrica</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Triângulo proporcional aos lados a, b e c, preenchido.
        </p>
        <div className={previewCanvasClassName}>
          <svg className={previewSvgClassName} role="img" viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
            <title>Seção triangular</title>
            <desc>Representação proporcional da seção triangular com fluido.</desc>
            {preview.svg}
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {preview.chips.map((item) => (
            <span key={item.label} className="rounded-full border border-slate-200 bg-white px-3 py-1">
              {item.label} = {item.value}
            </span>
          ))}
        </div>
      </section>
    );
  }

  if (shape === "circularCap") {
    const diameter = parsePositiveNumber(parameters.diameter);
    const height = parsePositiveNumber(parameters.height);
    if (diameter == null || height == null || height > diameter) {
      return placeholder("Informe diâmetro e altura válidos para visualizar o canal circular.");
    }

    const preview = renderCircularCap(diameter, height);
    return (
      <section className={previewFrameClassName}>
        <h3 className="text-sm font-medium text-slate-800">Pré-visualização geométrica</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Segmento circular preenchido, com D, h e R destacados.
        </p>
        <div className={previewCanvasClassName}>
          <svg className={previewSvgClassName} role="img" viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
            <title>Canal circular</title>
            <desc>Representação proporcional do canal circular com fluido.</desc>
            {preview.svg}
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {preview.chips.map((item) => (
            <span key={item.label} className="rounded-full border border-slate-200 bg-white px-3 py-1">
              {item.label} = {item.value}
            </span>
          ))}
        </div>
      </section>
    );
  }

  return placeholder("Selecione uma forma geométrica para ver o esboço proporcional.");
}
