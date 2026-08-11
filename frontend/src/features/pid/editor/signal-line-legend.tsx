import type { CSSProperties } from "react";
import { Maximize2, Minus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { lineStyleAttributes } from "../canvas/line-rendering";
import { renderSignalLinePattern, signalLineLegendItems } from "../canvas/signal-line-pattern";
import type { LineStyle } from "../domain/line-style";

const titleId = "pid-signal-line-legend-title";

export function SignalLineLegend({
  placement = "toolbar",
  selectedEdgeId,
  minimized,
  onApplyLineStyle,
  onClose,
  onMinimize,
  onRestore,
}: {
  readonly placement?: "toolbar" | "canvas";
  readonly selectedEdgeId: string | null;
  readonly minimized: boolean;
  readonly onApplyLineStyle: (lineStyle: LineStyle) => void;
  readonly onClose: () => void;
  readonly onMinimize: () => void;
  readonly onRestore: () => void;
}) {
  const canApply = selectedEdgeId !== null;
  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      className={placement === "canvas"
        ? "pid-canvas-signal-legend"
        : "absolute right-0 top-full z-50 mt-1 w-[min(44rem,calc(100vw-2rem))] rounded border bg-white text-slate-900 shadow-lg"}
    >
      <header className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div>
          <h2 id={titleId} className="text-sm font-semibold">Sinais utilizados nos fluxogramas de processo</h2>
          <p className="text-xs text-slate-600">{canApply ? "Selecione um padrão para a aresta ativa." : "Referência de padrões de sinais."}</p>
        </div>
        <div className="inline-flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={minimized ? "Restaurar legenda de sinais" : "Minimizar legenda de sinais"}
            onClick={minimized ? onRestore : onMinimize}
          >
            {minimized ? <Maximize2 className="size-4" /> : <Minus className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Fechar legenda de sinais" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </header>
      {!minimized && (
        <ul role="list" className="grid max-h-[28rem] grid-cols-1 overflow-auto p-2 sm:grid-cols-2">
          {signalLineLegendItems.map((item) => (
            <li key={item.style} role="listitem" className="p-1">
              {canApply ? (
                <button
                  type="button"
                  aria-label={`Aplicar ${item.label}`}
                  onClick={() => onApplyLineStyle(item.style)}
                  className="grid min-h-16 w-full grid-cols-[11rem_1fr] items-center gap-3 rounded border border-transparent p-2 text-left hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <SignalLinePreview lineStyle={item.style} />
                  <span>
                    <span className="block text-xs font-medium">{item.label}</span>
                    <span className="block text-[11px] leading-snug text-slate-600">{item.description}</span>
                  </span>
                </button>
              ) : (
                <div className="grid min-h-16 grid-cols-[11rem_1fr] items-center gap-3 rounded p-2">
                  <SignalLinePreview lineStyle={item.style} />
                  <span>
                    <span className="block text-xs font-medium">{item.label}</span>
                    <span className="block text-[11px] leading-snug text-slate-600">{item.description}</span>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SignalLinePreview({ lineStyle }: { readonly lineStyle: LineStyle }) {
  const attrs = lineStyleAttributes(lineStyle);
  const edgeStrokeStyle = {
    "--xy-edge-stroke": attrs.stroke,
    "--xy-edge-stroke-selected": "#2563eb",
  } as CSSProperties;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 176 36"
      className="h-9 w-44 overflow-visible"
      style={edgeStrokeStyle}
    >
      {renderSignalLinePattern({
        id: `legend-${lineStyle}`,
        points: [{ x: 8, y: 18 }, { x: 168, y: 18 }],
        lineStyle,
        selected: false,
        stroke: attrs.stroke,
        strokeWidth: attrs.strokeWidth,
      })}
    </svg>
  );
}
