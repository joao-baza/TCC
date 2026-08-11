import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import { Handle, Position, useStore, type Node, type NodeProps } from "@xyflow/react";

import type { CatalogSymbol } from "../catalog/catalog-symbol";
import { loadSanitizedPidSvgAsset, sanitizedPidSvgDataUrl } from "../catalog/sanitized-svg-asset";
import type { PidNode, PidPort, PortDirection } from "../domain/model";
import { getPidNodeGeometry, type PidNodeGeometry } from "../domain/geometry";
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
  readonly onElementPatch: (id: string, patch: Record<string, number>) => void;
};

export type EquipmentFlowNode = Node<EquipmentNodeData, "equipment">;

const directionLabel: Record<PortDirection, string> = {
  input: "entrada",
  output: "saída",
  bidirectional: "bidirecional",
};

const MIN_EQUIPMENT_SIZE = 24;

type ResizeDirection = "nw" | "ne" | "se" | "sw";
type TransformDraft = Pick<PidNode, "x" | "y" | "width" | "height" | "rotation">;
type TransformInteraction =
  | {
    readonly kind: "resize";
    readonly direction: ResizeDirection;
    readonly startClientX: number;
    readonly startClientY: number;
    readonly start: TransformDraft;
    readonly zoom: number;
  }
  | {
    readonly kind: "rotate";
    readonly centerX: number;
    readonly centerY: number;
    readonly start: TransformDraft;
  };

function EquipmentNodeComponent({ data, selected, isConnectable }: NodeProps<EquipmentFlowNode>) {
  const { equipment, ports, symbol, editable, geometry, interactionGeometry, portGeometries, onPortKey, onElementPatch } = data;
  const zoom = useStore((store) => store.transform[2]);
  const [imageFailed, setImageFailed] = useState(false);
  const [sanitizedAssetUrl, setSanitizedAssetUrl] = useState<string | null>(null);
  const [transformDraft, setTransformDraft] = useState<TransformDraft | null>(null);
  const transformDraftRef = useRef<TransformDraft | null>(null);
  const interactionRef = useRef<TransformInteraction | null>(null);
  const onElementPatchRef = useRef(onElementPatch);
  onElementPatchRef.current = onElementPatch;
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
  const finishTransform = useCallback(() => {
    const draft = transformDraftRef.current;
    interactionRef.current = null;
    if (!draft) return;
    const patch = diffTransform(equipment, draft);
    transformDraftRef.current = null;
    setTransformDraft(null);
    if (Object.keys(patch).length > 0) onElementPatchRef.current(equipment.id, patch);
  }, [equipment]);
  const handlePointerMove = useCallback((event: PointerEvent) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    if (interaction.kind === "resize") {
      const deltaX = (event.clientX - interaction.startClientX) / interaction.zoom;
      const deltaY = (event.clientY - interaction.startClientY) / interaction.zoom;
      const next = resizeTransform(interaction.start, interaction.direction, deltaX, deltaY);
      transformDraftRef.current = next;
      setTransformDraft(next);
      return;
    }
    const next = {
      ...interaction.start,
      rotation: rotationFromPointer(event.clientX, event.clientY, interaction.centerX, interaction.centerY),
    };
    transformDraftRef.current = next;
    setTransformDraft(next);
  }, []);
  const handlePointerUp = useCallback(() => finishTransform(), [finishTransform]);
  useEffect(() => {
    if (!selected) {
      transformDraftRef.current = null;
      setTransformDraft(null);
    }
  }, [selected]);
  useEffect(() => {
    transformDraftRef.current = null;
    setTransformDraft(null);
  }, [equipment.x, equipment.y, equipment.width, equipment.height, equipment.rotation]);
  useEffect(() => {
    if (!selected || !editable) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [editable, handlePointerMove, handlePointerUp, selected]);
  const label = equipment.label || symbol?.name || "Equipamento";
  const transform = transformDraft ?? equipment;
  const displayedGeometry = transformDraft ? getPidNodeGeometry({ ...equipment, ...transform }) : geometry;
  const bodyLeft = interactionGeometry.canonicalRect.x + (displayedGeometry.bounds.x - geometry.bounds.x);
  const bodyTop = interactionGeometry.canonicalRect.y + (displayedGeometry.bounds.y - geometry.bounds.y);
  const artworkLeft = (displayedGeometry.bounds.width - transform.width) / 2;
  const artworkTop = (displayedGeometry.bounds.height - transform.height) / 2;

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
          left: bodyLeft,
          top: bodyTop,
          width: displayedGeometry.bounds.width,
          height: displayedGeometry.bounds.height,
        }}
      >
        {equipment.tag && (
          <span
            data-testid={`equipment-tag-${equipment.id}`}
            className="pid-equipment-node__tag pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 max-w-[12rem] -translate-x-1/2 truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm"
          >
            {equipment.tag}
          </span>
        )}
        <div
          data-testid={`equipment-artwork-${equipment.id}`}
          className="absolute flex min-h-0 items-center justify-center"
          style={{
            left: artworkLeft,
            top: artworkTop,
            width: transform.width,
            height: transform.height,
            transform: `rotate(${transform.rotation}deg)`,
          }}
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
          data-testid={`equipment-label-${equipment.id}`}
          className={`pid-equipment-node__label pointer-events-none absolute left-1/2 top-full z-10 mt-1 max-w-[12rem] -translate-x-1/2 truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm transition-opacity ${
            selected ? "opacity-100" : "opacity-0"
          }`}
        >
          {label}
        </span>
        {editable && selected && (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <span
              data-testid={`equipment-rotate-${equipment.id}`}
              title="Girar equipamento"
              className="nodrag nopan pointer-events-auto absolute left-1/2 top-[-2rem] flex size-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-blue-700 bg-white text-blue-700 shadow-sm active:cursor-grabbing"
              onPointerDown={(event) => beginRotate(event, transform, zoom, interactionRef)}
            >
              <span className="block size-2 rounded-full border border-current" />
            </span>
            {(["nw", "ne", "se", "sw"] as const).map((direction) => (
              <span
                key={direction}
                data-testid={`equipment-resize-${direction}-${equipment.id}`}
                title="Redimensionar equipamento"
                className={`nodrag nopan pointer-events-auto absolute size-3 rounded-sm border border-blue-700 bg-white shadow-sm ${resizeCursor(direction)}`}
                style={resizeHandleStyle(direction)}
                onPointerDown={(event) => beginResize(event, direction, transform, zoom, interactionRef)}
              />
            ))}
          </div>
        )}
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
            className="!overflow-visible !border-transparent !bg-transparent before:absolute before:left-1/2 before:top-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:content-[''] after:absolute after:left-1/2 after:top-1/2 after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border after:border-slate-700 after:bg-white focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-blue-600"
            style={{ ...style, width: geometry.targetSize, height: geometry.targetSize }}
          />
        );
      })}
    </div>
  );
}

function beginResize(
  event: ReactPointerEvent,
  direction: ResizeDirection,
  start: TransformDraft,
  zoom: number,
  interactionRef: MutableRefObject<TransformInteraction | null>,
) {
  event.preventDefault();
  event.stopPropagation();
  interactionRef.current = {
    kind: "resize",
    direction,
    startClientX: event.clientX,
    startClientY: event.clientY,
    start,
    zoom: zoom || 1,
  };
}

function beginRotate(
  event: ReactPointerEvent<HTMLElement>,
  start: TransformDraft,
  _zoom: number,
  interactionRef: MutableRefObject<TransformInteraction | null>,
) {
  event.preventDefault();
  event.stopPropagation();
  const body = event.currentTarget.closest<HTMLElement>(".pid-equipment-node__body");
  const rect = body?.getBoundingClientRect();
  if (!rect) return;
  interactionRef.current = {
    kind: "rotate",
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    start,
  };
}

function resizeTransform(start: TransformDraft, direction: ResizeDirection, deltaX: number, deltaY: number): TransformDraft {
  let { x, y, width, height } = start;
  if (direction.includes("e")) width = start.width + deltaX;
  if (direction.includes("s")) height = start.height + deltaY;
  if (direction.includes("w")) {
    width = start.width - deltaX;
    x = start.x + deltaX;
  }
  if (direction.includes("n")) {
    height = start.height - deltaY;
    y = start.y + deltaY;
  }
  if (width < MIN_EQUIPMENT_SIZE) {
    if (direction.includes("w")) x = start.x + start.width - MIN_EQUIPMENT_SIZE;
    width = MIN_EQUIPMENT_SIZE;
  }
  if (height < MIN_EQUIPMENT_SIZE) {
    if (direction.includes("n")) y = start.y + start.height - MIN_EQUIPMENT_SIZE;
    height = MIN_EQUIPMENT_SIZE;
  }
  return {
    ...start,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function rotationFromPointer(clientX: number, clientY: number, centerX: number, centerY: number): number {
  const degrees = Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI + 90;
  return normalizeRotation(Math.round(degrees));
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

function diffTransform(equipment: PidNode, draft: TransformDraft): Record<string, number> {
  const patch: Record<string, number> = {};
  if (equipment.x !== draft.x) patch.x = draft.x;
  if (equipment.y !== draft.y) patch.y = draft.y;
  if (equipment.width !== draft.width) patch.width = draft.width;
  if (equipment.height !== draft.height) patch.height = draft.height;
  if (equipment.rotation !== draft.rotation) patch.rotation = draft.rotation;
  return patch;
}

function resizeCursor(direction: ResizeDirection): string {
  return direction === "nw" || direction === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize";
}

function resizeHandleStyle(direction: ResizeDirection): CSSProperties {
  return {
    left: direction.includes("w") ? -6 : undefined,
    right: direction.includes("e") ? -6 : undefined,
    top: direction.includes("n") ? -6 : undefined,
    bottom: direction.includes("s") ? -6 : undefined,
  };
}

function normalizedPortStyle(
  geometry: PidPortHitTargetGeometry,
): { left?: number | string; right?: number | string; top?: number | string; bottom?: number | string; transform?: string } {
  if (geometry.exactAnchor) {
    return {
      left: geometry.x,
      top: geometry.y,
      right: "auto",
      bottom: "auto",
      transform: "translate(-50%, -50%)",
    };
  }
  if (geometry.position === Position.Left) return { left: 0, top: geometry.y };
  if (geometry.position === Position.Right) return { right: 0, top: geometry.y };
  if (geometry.position === Position.Top) return { left: geometry.x, top: 0 };
  return { left: geometry.x, bottom: 0 };
}

export const EquipmentNode = memo(EquipmentNodeComponent);
