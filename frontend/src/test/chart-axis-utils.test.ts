import { createElement } from "react";
import { render, screen } from "@testing-library/react";

import {
  buildAxisTicks,
  expandNumericDomain,
  placeSafeLabel,
} from "@/components/viz/chart-axis-utils";
import { NumericChartGrid } from "@/components/viz/chart-grid";

function overlaps(
  box: { x: number; y: number; width: number; height: number },
  other: { x: number; y: number; width: number; height: number },
) {
  return !(
    box.x + box.width <= other.x ||
    other.x + other.width <= box.x ||
    box.y + box.height <= other.y ||
    other.y + other.height <= box.y
  );
}

describe("chart axis utilities", () => {
  it("expands flat domains with a non-zero span and keeps tick endpoints", () => {
    const domain = expandNumericDomain([12, 12, 12]);
    const ticks = buildAxisTicks(domain.min, domain.max, 5);

    expect(domain.max).toBeGreaterThan(domain.min);
    expect(domain.min).toBeLessThan(12);
    expect(domain.max).toBeGreaterThan(12);
    expect(ticks[0]).toBe(domain.min);
    expect(ticks[ticks.length - 1]).toBe(domain.max);
    expect(ticks.length).toBeGreaterThan(2);
  });

  it("moves labels away from overlapping boxes", () => {
    const size = { width: 32, height: 12 };
    const placement = placeSafeLabel({
      anchor: { x: 42, y: 24, anchor: "start" },
      size,
      plot: { x: 0, y: 0, width: 120, height: 80 },
      avoid: [{ x: 40, y: 16, width: 24, height: 20 }],
    });

    expect(overlaps({ x: placement.x, y: placement.y, ...size }, { x: 40, y: 16, width: 24, height: 20 })).toBe(false);
    expect(placement.x).not.toBe(42);
    expect(placement.anchor).toBe("start");
  });

  it("renders tick labels and axis labels in the numeric grid", () => {
    const { container } = render(
      createElement(NumericChartGrid, {
        width: 360,
        height: 220,
        padding: { top: 20, right: 20, bottom: 32, left: 44 },
        xDomain: [0, 10],
        yDomain: [0, 5],
        xLabel: "Flow",
        yLabel: "Head",
      }),
    );

    expect(container.querySelectorAll("[data-axis-tick]").length).toBeGreaterThanOrEqual(8);
    expect(screen.getByText("Flow")).toHaveAttribute("data-chart-label", "x");
    expect(screen.getByText("Head")).toHaveAttribute("data-chart-label", "y");
  });
});
