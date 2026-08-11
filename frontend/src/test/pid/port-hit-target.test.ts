import { describe, expect, it } from "vitest";

import {
  getPidCanvasInteractionGeometry,
  getPidPortHitTargetGeometry,
} from "@/features/pid/canvas/port-hit-target";
import { getPidNodeGeometry, getPidPortAnchorGeometry } from "@/features/pid/domain/geometry";
import type { PidNode, PidPort } from "@/features/pid/domain/model";

const node: PidNode = {
  id: "20000000-0000-4000-8000-000000000001",
  symbolKey: "drawio.pid.valves.ball-valve",
  catalogVersion: "local-v1",
  x: 10,
  y: 20,
  width: 40,
  height: 40,
  rotation: 0,
  tag: "XV-1",
  label: "Válvula",
  properties: {},
};

const ports: PidPort[] = Array.from({ length: 3 }, (_, index) => ({
  id: `30000000-0000-4000-8000-00000000000${index + 1}`,
  nodeId: node.id,
  templateKey: `input-${index}`,
  direction: "input",
  connectionClass: "process",
  capacity: 1,
}));

describe("alvos das portas P&ID", () => {
  it("mantém cada centro sobre a âncora canônica do símbolo", () => {
    const canonical = getPidNodeGeometry(node);
    const interaction = getPidCanvasInteractionGeometry(canonical, ports);

    ports.forEach((port, index) => {
      const anchor = getPidPortAnchorGeometry(canonical, port, index, ports);
      const target = getPidPortHitTargetGeometry(interaction, canonical, anchor, port, index, ports);

      expect({ x: target.x, y: target.y }).toEqual({
        x: interaction.canonicalRect.x + anchor.x,
        y: interaction.canonicalRect.y + anchor.y,
      });
    });
  });

  it("reduz áreas adjacentes sem deslocar o handle medido pela linha", () => {
    const canonical = getPidNodeGeometry(node);
    const interaction = getPidCanvasInteractionGeometry(canonical, ports);
    const targets = ports.map((port, index) => getPidPortHitTargetGeometry(
      interaction,
      canonical,
      getPidPortAnchorGeometry(canonical, port, index, ports),
      port,
      index,
      ports,
    ));

    expect(targets.every(({ targetSize }) => targetSize === 8)).toBe(true);
    expect(targets.every(({ interactionSize }) => interactionSize < 44 && interactionSize >= 8)).toBe(true);
    for (let index = 1; index < targets.length; index += 1) {
      expect(targets[index].interactionRect.y).toBeGreaterThanOrEqual(
        targets[index - 1].interactionRect.y + targets[index - 1].interactionRect.height,
      );
    }
  });
});
