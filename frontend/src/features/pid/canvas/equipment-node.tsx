import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { CatalogSymbol } from "../catalog/catalog-symbol";
import type { PidNode, PidPort, PortDirection } from "../domain/model";

export type EquipmentNodeData = Record<string, unknown> & {
  readonly equipment: PidNode;
  readonly ports: readonly PidPort[];
  readonly symbol?: CatalogSymbol;
  readonly editable: boolean;
};

export type EquipmentFlowNode = Node<EquipmentNodeData, "equipment">;

const directionLabel: Record<PortDirection, string> = {
  input: "entrada",
  output: "saída",
  bidirectional: "bidirecional",
};

function EquipmentNodeComponent({ data, selected, isConnectable }: NodeProps<EquipmentFlowNode>) {
  const { equipment, ports, symbol, editable } = data;
  const title = [equipment.label || symbol?.name || "Equipamento", equipment.tag].filter(Boolean).join(" ");

  return (
    <div
      className={`relative h-full w-full rounded-lg border bg-white p-2 shadow-sm outline-none transition ${
        selected ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-300"
      }`}
      data-selected={selected ? "true" : "false"}
      aria-selected={selected}
    >
      <div
        className="flex h-full min-h-0 flex-col items-center justify-center gap-1"
        style={{ transform: `rotate(${equipment.rotation}deg)` }}
      >
        {symbol ? (
          <img
            src={symbol.assetUrl}
            alt=""
            draggable={false}
            className="min-h-0 max-h-full max-w-full flex-1 object-contain"
          />
        ) : (
          <div className="flex min-h-10 w-full items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-center text-[10px] text-slate-500">
            Símbolo indisponível
          </div>
        )}
        <span className="max-w-full truncate text-[10px] font-semibold text-slate-800">{title}</span>
      </div>

      {ports.map((port, index) => {
        const geometry = getPortHandleGeometry(port, index, ports);
        const portText = `Porta de ${directionLabel[port.direction]} ${port.templateKey}`;
        const style = normalizedPortStyle(geometry);
        if (!editable) {
          return (
            <span
              key={port.id}
              className="absolute block size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-700 bg-white"
              style={style}
              title={portText}
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
            position={geometry.position}
            isConnectable={isConnectable}
            aria-label={`Criar conexão pela porta de ${directionLabel[port.direction]} ${port.templateKey}`}
            title={portText}
            className="!size-11 !border-slate-700 !bg-transparent after:absolute after:left-1/2 after:top-1/2 after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-white focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-blue-600"
            style={{ ...style, width: 44, height: 44 }}
          />
        );
      })}
    </div>
  );
}

export function getPortHandleGeometry(
  port: PidPort,
  index: number,
  ports: readonly PidPort[],
): { position: Position; x: number; y: number } {
  const side = sideForDirection(port.direction);
  const sameSide = ports.filter((candidate) => sideForDirection(candidate.direction) === side);
  const sideIndex = sameSide.findIndex((candidate) => candidate === ports[index]);
  const offset = (sideIndex + 1) / (sameSide.length + 1);
  if (port.direction === "input") return { position: Position.Left, x: 0, y: offset };
  if (port.direction === "output") return { position: Position.Right, x: 1, y: offset };
  return { position: Position.Bottom, x: offset, y: 1 };
}

function normalizedPortStyle(
  geometry: { position: Position; x: number; y: number },
): { left?: string; right?: string; top?: string; bottom?: string } {
  if (geometry.position === Position.Left) return { left: "0%", top: `${geometry.y * 100}%` };
  if (geometry.position === Position.Right) return { right: "0%", top: `${geometry.y * 100}%` };
  return { left: `${geometry.x * 100}%`, bottom: "0%" };
}

function sideForDirection(direction: PortDirection): Position {
  if (direction === "input") return Position.Left;
  if (direction === "output") return Position.Right;
  return Position.Bottom;
}

export const EquipmentNode = memo(EquipmentNodeComponent);
