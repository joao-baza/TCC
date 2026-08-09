import { memo, useEffect, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { CatalogSymbol } from "../catalog/catalog-symbol";
import type { PidNode, PidPort, PortDirection } from "../domain/model";
import type { PidNodeFlowGeometry, PidPortFlowGeometry } from "../domain/geometry";

export type EquipmentNodeData = Record<string, unknown> & {
  readonly equipment: PidNode;
  readonly ports: readonly PidPort[];
  readonly symbol?: CatalogSymbol;
  readonly editable: boolean;
  readonly geometry: PidNodeFlowGeometry;
  readonly portGeometries: ReadonlyMap<string, PidPortFlowGeometry>;
  readonly onPortKey: (portId: string, key: "Enter" | " " | "Escape") => void;
};

export type EquipmentFlowNode = Node<EquipmentNodeData, "equipment">;

const directionLabel: Record<PortDirection, string> = {
  input: "entrada",
  output: "saída",
  bidirectional: "bidirecional",
};

function EquipmentNodeComponent({ data, selected, isConnectable }: NodeProps<EquipmentFlowNode>) {
  const { equipment, ports, symbol, editable, portGeometries, onPortKey } = data;
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [symbol?.assetUrl]);
  const title = [equipment.label || symbol?.name || "Equipamento", equipment.tag].filter(Boolean).join(" ");

  return (
    <div
      className={`relative h-full w-full rounded-lg border bg-white p-2 shadow-sm outline-none transition ${
        selected ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-300"
      }`}
      data-selected={selected ? "true" : "false"}
      aria-selected={selected}
    >
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-1">
        <div
          data-testid={`equipment-artwork-${equipment.id}`}
          className="flex min-h-0 max-h-full max-w-full flex-1 items-center justify-center"
          style={{ transform: `rotate(${equipment.rotation}deg)` }}
        >
          {symbol && !imageFailed ? (
            <img
              src={symbol.assetUrl}
              alt=""
              draggable={false}
              className="min-h-0 max-h-full max-w-full object-contain"
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
          className="max-w-full truncate text-[10px] font-semibold text-slate-800"
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
  geometry: PidPortFlowGeometry,
): { left?: number; right?: number; top?: number; bottom?: number } {
  if (geometry.position === Position.Left) return { left: 0, top: geometry.y };
  if (geometry.position === Position.Right) return { right: 0, top: geometry.y };
  if (geometry.position === Position.Top) return { left: geometry.x, top: 0 };
  return { left: geometry.x, bottom: 0 };
}

export const EquipmentNode = memo(EquipmentNodeComponent);
