import { memo, useEffect, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { CatalogSymbol } from "../catalog/catalog-symbol";
import { loadSanitizedPidSvgAsset, sanitizedPidSvgDataUrl } from "../catalog/sanitized-svg-asset";
import type { PidNode, PidPort, PortDirection } from "../domain/model";
import type { PidNodeGeometry } from "../domain/geometry";
import type { PidCanvasInteractionGeometry, PidPortHitTargetGeometry } from "./port-hit-target";

export type EquipmentNodeData = Record<string, unknown> & {
  readonly equipment: PidNode;
  readonly ports: readonly PidPort[];
  readonly symbol?: CatalogSymbol;
  readonly editable: boolean;
  readonly geometry: PidNodeGeometry;
  readonly interactionGeometry: PidCanvasInteractionGeometry;
  readonly portGeometries: ReadonlyMap<string, PidPortHitTargetGeometry>;
  readonly onPortKey: (portId: string, key: "Enter" | " " | "Escape") => void;
};

export type EquipmentFlowNode = Node<EquipmentNodeData, "equipment">;

const directionLabel: Record<PortDirection, string> = {
  input: "entrada",
  output: "saída",
  bidirectional: "bidirecional",
};

function EquipmentNodeComponent({ data, selected, isConnectable }: NodeProps<EquipmentFlowNode>) {
  const { equipment, ports, symbol, editable, interactionGeometry, portGeometries, onPortKey } = data;
  const [imageFailed, setImageFailed] = useState(false);
  const [sanitizedAssetUrl, setSanitizedAssetUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setImageFailed(false);
    setSanitizedAssetUrl(null);
    if (!symbol) return () => { active = false; };
    void loadSanitizedPidSvgAsset(symbol.assetUrl).then(
      (asset) => { if (active) setSanitizedAssetUrl(sanitizedPidSvgDataUrl(asset)); },
      () => { /* A ausência da URL sanitizada já mantém o fallback visível. */ },
    );
    return () => { active = false; };
  }, [symbol]);
  const title = [equipment.label || symbol?.name || "Equipamento", equipment.tag].filter(Boolean).join(" ");

  return (
    <div
      className="relative h-full w-full outline-none"
      data-selected={selected ? "true" : "false"}
      aria-selected={selected}
    >
      <div
        data-testid={`equipment-body-${equipment.id}`}
        className={`pid-equipment-node__body absolute flex min-h-0 items-center justify-center outline-offset-2 transition-[outline-color] ${
          selected ? "outline outline-2 outline-blue-600" : "outline outline-2 outline-transparent"
        }`}
        style={{
          left: interactionGeometry.canonicalRect.x,
          top: interactionGeometry.canonicalRect.y,
          width: interactionGeometry.canonicalRect.width,
          height: interactionGeometry.canonicalRect.height,
        }}
      >
        <div
          data-testid={`equipment-artwork-${equipment.id}`}
          className="flex h-full min-h-0 w-full items-center justify-center"
          style={{ transform: `rotate(${equipment.rotation}deg)` }}
        >
          {symbol && sanitizedAssetUrl && !imageFailed ? (
            <img
              src={sanitizedAssetUrl}
              alt=""
              draggable={false}
              className="h-full w-full object-contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex min-h-10 w-full items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-center text-[10px] text-slate-500">
              Símbolo indisponível
            </div>
          )}
        </div>
        <span
          data-testid={`equipment-caption-${equipment.id}`}
          className={`pid-equipment-node__caption pointer-events-none absolute left-1/2 top-full z-10 mt-1 max-w-[12rem] -translate-x-1/2 truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm transition-opacity ${
            selected ? "opacity-100" : "opacity-0"
          }`}
        >
          {title}
        </span>
      </div>

      {ports.map((port, index) => {
        const geometry = portGeometries.get(port.id);
        if (!geometry) return null;
        const portText = `Porta de ${directionLabel[port.direction]} ${port.templateKey}`;
        const style = normalizedPortStyle(geometry);
        if (!editable) {
          return (
            <span
              key={port.id}
              className="absolute block size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-700 bg-white"
              style={style}
              title={portText}
              role="img"
            >
              <span className="sr-only">{portText}</span>
            </span>
          );
        }
        return (
          <Handle
            key={port.id}
            id={port.id}
            type={port.direction === "input" ? "target" : "source"}
            position={geometry.position as Position}
            isConnectable={isConnectable}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " " && event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              onPortKey(port.id, event.key);
            }}
            aria-label={`Criar conexão pela porta de ${directionLabel[port.direction]} ${port.templateKey}`}
            title={portText}
            className="!size-11 !border-slate-700 !bg-transparent after:absolute after:left-1/2 after:top-1/2 after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-white focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-blue-600"
            style={{ ...style, width: geometry.targetSize, height: geometry.targetSize }}
          />
        );
      })}
    </div>
  );
}

function normalizedPortStyle(
  geometry: PidPortHitTargetGeometry,
): { left?: number | string; right?: number | string; top?: number | string; bottom?: number | string } {
  if (geometry.exactAnchor) return { left: geometry.x, top: geometry.y, right: "auto", bottom: "auto" };
  if (geometry.position === Position.Left) return { left: 0, top: geometry.y };
  if (geometry.position === Position.Right) return { right: 0, top: geometry.y };
  if (geometry.position === Position.Top) return { left: geometry.x, top: 0 };
  return { left: geometry.x, bottom: 0 };
}

export const EquipmentNode = memo(EquipmentNodeComponent);
