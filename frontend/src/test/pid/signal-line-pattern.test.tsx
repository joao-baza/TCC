import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  renderSignalLinePattern,
  renderStaticSignalLinePattern,
  signalLineLegendItems,
} from "@/features/pid/canvas/signal-line-pattern";
import { LINE_STYLES } from "@/features/pid/domain/line-style";

const route = [{ x: 0, y: 0 }, { x: 160, y: 0 }, { x: 160, y: 80 }];

describe("signal line pattern renderer", () => {
  it("expõe os 12 itens na ordem da legenda", () => {
    expect(signalLineLegendItems.map((item) => item.style)).toEqual([...LINE_STYLES]);
    expect(signalLineLegendItems).toHaveLength(12);
  });

  it.each([
    ["pneumatic-signal", "data-glyph=\"diagonal-pair\""],
    ["hydraulic-signal", "data-glyph=\"hydraulic-l\""],
    ["guided-electromagnetic-sonic", "data-glyph=\"open-circle\""],
    ["software-link", "data-glyph=\"software-circle\""],
    ["binary-pneumatic-signal", "data-glyph=\"binary-cross\""],
    ["undefined-signal", "data-glyph=\"single-diagonal\""],
    ["electric-signal", "stroke-dasharray=\"14 7\""],
    ["capillary-tube", "data-glyph=\"x-mark\""],
    ["unguided-electromagnetic-sonic", "data-glyph=\"wave\""],
    ["mechanical-link", "data-glyph=\"concentric-circle\""],
    ["binary-electric-signal", "data-glyph=\"binary-cross\""],
  ] as const)("renders %s with expected marker", (style, marker) => {
    const markup = renderStaticSignalLinePattern({ id: "edge", points: route, lineStyle: style, selected: false, stroke: "#111827" });
    expect(markup).toContain(marker);
  });

  it("omits crowded glyphs on very short segments", () => {
    const markup = renderStaticSignalLinePattern({
      id: "short",
      points: [{ x: 0, y: 0 }, { x: 8, y: 0 }],
      lineStyle: "pneumatic-signal",
      selected: false,
      stroke: "#111827",
    });
    expect(markup).not.toContain("data-glyph=\"diagonal-pair\"");
  });

  it("cruza as ondas do sinal não-guiado com uma linha-base", () => {
    const { container } = render(
      <svg>
        {renderSignalLinePattern({
          id: "wireless",
          points: route,
          lineStyle: "unguided-electromagnetic-sonic",
          selected: false,
          stroke: "#111827",
          markerEnd: "url(#arrow)",
        })}
      </svg>,
    );

    const pattern = container.querySelector('[data-signal-line-pattern="wireless"]');
    const basePath = pattern?.querySelector(".react-flow__edge-path");

    expect(pattern?.querySelector('[data-glyph="wave"]')).toBeInTheDocument();
    expect(basePath).toHaveAttribute("d", "M 0 0 L 160 0 L 160 80");
    expect(basePath).toHaveAttribute("marker-end", "url(#arrow)");
    expect(pattern?.lastElementChild).toBe(basePath);
    expect(pattern?.querySelector('[data-marker-carrier="wireless"]')).not.toBeInTheDocument();
  });
});
