type SvgPrimitiveType = "circle" | "line" | "path" | "polygon" | "rect" | "text";

type SvgPrimitive = {
  type: SvgPrimitiveType;
  attrs: Record<string, string | number>;
  text?: string | null;
};

export type HydraulicDiameterPreviewModel = {
  title: string;
  description: string;
  summary: string;
  view_box: string;
  elements: SvgPrimitive[];
  chips: Array<{
    label: string;
    value: string;
  }>;
};

type HydraulicDiameterPreviewProps = {
  preview: HydraulicDiameterPreviewModel | null;
  placeholderText?: string;
};

const previewFrameClassName = "mt-3 rounded-xl border border-slate-200 p-3";
const previewCanvasClassName =
  "mx-auto mt-3 w-full max-w-[340px] rounded-xl border border-slate-200 bg-slate-50 p-5";
const previewSvgClassName = "block h-[180px] w-full";

function placeholder(message: string) {
  return (
    <section className={previewFrameClassName}>
      <h3 className="text-sm font-medium text-slate-800">Pré-visualização geométrica</h3>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </section>
  );
}

function renderSvgPrimitive(element: SvgPrimitive, index: number) {
  const key = `${element.type}-${index}`;

  if (element.type === "circle") {
    return <circle key={key} {...element.attrs} />;
  }

  if (element.type === "line") {
    return <line key={key} {...element.attrs} />;
  }

  if (element.type === "path") {
    return <path key={key} {...element.attrs} />;
  }

  if (element.type === "polygon") {
    return <polygon key={key} {...element.attrs} />;
  }

  if (element.type === "rect") {
    return <rect key={key} {...element.attrs} />;
  }

  return (
    <text key={key} {...element.attrs}>
      {element.text}
    </text>
  );
}

export function HydraulicDiameterPreview({
  preview,
  placeholderText = "Selecione uma forma geométrica para ver o esboço proporcional.",
}: HydraulicDiameterPreviewProps) {
  if (!preview) {
    return placeholder(placeholderText);
  }

  return (
    <section className={previewFrameClassName}>
      <h3 className="text-sm font-medium text-slate-800">Pré-visualização geométrica</h3>
      <p className="mt-1 text-xs text-muted-foreground">{preview.summary}</p>
      <div className={previewCanvasClassName}>
        <svg className={previewSvgClassName} role="img" viewBox={preview.view_box}>
          <title>{preview.title}</title>
          <desc>{preview.description}</desc>
          {preview.elements.map(renderSvgPrimitive)}
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
