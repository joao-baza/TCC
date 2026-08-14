import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  renderProcessPipingPattern,
  renderStaticProcessPipingPattern,
} from "@/features/pid/canvas/process-piping-pattern";

const route = [
  { x: 0, y: 0 },
  { x: 80, y: 0 },
  { x: 80, y: 80 },
  { x: 160, y: 80 },
];

describe("linhas paralelas de processo", () => {
  it("desenha duas linhas contínuas e paralelas nos trechos ortogonais", () => {
    const { container } = render(<svg>{renderProcessPipingPattern({
      id: "edge-1",
      points: route,
      selected: false,
    })}</svg>);

    const lines = [...container.querySelectorAll<SVGPathElement>("[data-process-line-parallel]")];
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.getAttribute("d"))).toEqual([
      "M 0 -4 L 84 -4 L 84 76 L 160 76",
      "M 0 4 L 76 4 L 76 84 L 160 84",
    ]);
    expect(lines.every((line) => line.getAttribute("stroke-width") === "2")).toBe(true);
    expect(lines.every((line) => line.getAttribute("stroke") === "#1F2937")).toBe(true);
    expect(container.querySelector("image")).toBeNull();
    expect(container.querySelector("pattern")).toBeNull();
    expect(container.querySelector("defs")).toBeNull();
  });

  it("permite definir a espessura e a distância entre as linhas", () => {
    const { container } = render(<svg>{renderProcessPipingPattern({
      id: "edge-configured",
      points: route,
      selected: false,
      strokeWidth: 4,
      parallelGap: 12,
    })}</svg>);

    const lines = [...container.querySelectorAll<SVGPathElement>("[data-process-line-parallel]")];
    expect(lines.every((line) => line.getAttribute("stroke-width") === "4")).toBe(true);
    expect(lines.map((line) => line.getAttribute("d"))).toEqual([
      "M 0 -6 L 86 -6 L 86 74 L 160 74",
      "M 0 6 L 74 6 L 74 86 L 160 86",
    ]);
  });

  it("mantém o destaque visual da seleção sobre as duas linhas", () => {
    const { container } = render(<svg>{renderProcessPipingPattern({
      id: "edge-selected",
      points: [{ x: 0, y: 0 }, { x: 160, y: 0 }],
      selected: true,
    })}</svg>);

    expect(container.querySelector('[data-process-line-selection="edge-selected"]')).toHaveAttribute("stroke-width", "18");
    expect(container.querySelectorAll("[data-process-line-parallel]")).toHaveLength(2);
  });

  it("exporta as duas linhas sem referência ao asset SVG", () => {
    const staticMarkup = renderStaticProcessPipingPattern({
      id: "edge-static",
      points: route,
      selected: false,
      strokeWidth: 3,
      parallelGap: 10,
    });

    expect(staticMarkup.match(/data-process-line-parallel=/g)).toHaveLength(2);
    expect(staticMarkup).toContain('stroke-width="3"');
    expect(staticMarkup).not.toContain("<image");
    expect(staticMarkup).not.toContain("<pattern");
    expect(staticMarkup).not.toContain("data-process-line-asset");
  });
});
