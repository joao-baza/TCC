import { createElement } from "react";
import { render, screen } from "@testing-library/react";

import {
  buildAxisTicks,
  buildAxisUpperBound,
  expandNumericDomain,
  formatAxisTick,
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
    expect(ticks.length).toBeLessThanOrEqual(5);
  });

  it("keeps reversed domains stable and readable", () => {
    const ticks = buildAxisTicks(9, 1, 5);

    expect(ticks[0]).toBe(1);
    expect(ticks[ticks.length - 1]).toBe(9);
    expect(ticks.length).toBeLessThanOrEqual(5);
  });

  it("keeps neighboring spans within a similar tick density", () => {
    const first = buildAxisTicks(0, 5, 5);
    const second = buildAxisTicks(0, 6, 5);

    expect(Math.abs(first.length - second.length)).toBeLessThanOrEqual(1);
  });

  it("keeps nearby negative spans within a similar tick density", () => {
    const first = buildAxisTicks(-10, -8.75, 5);
    const second = buildAxisTicks(-10, -8.5, 5);

    expect(Math.abs(first.length - second.length)).toBeLessThanOrEqual(1);
  });

  it("rounds axis upper bounds up to readable tick steps", () => {
    expect(buildAxisUpperBound(0.18, 6)).toBe(0.2);
    expect(buildAxisUpperBound(0.97, 6)).toBe(1);
    expect(buildAxisUpperBound(2.33, 6)).toBe(2.5);
  });

  it("formats axis ticks with comma decimals and scientific notation when needed", () => {
    expect(formatAxisTick(12.5)).toBe("12,5");
    expect(formatAxisTick(0.00008949025483876957)).toBe("8,94903 × 10^-5");
    expect(formatAxisTick(1234567)).toBe("1,23457 × 10^6");
  });

  it("moves labels away from overlapping boxes", () => {
    const size = { width: 32, height: 12 };
    const placement = placeSafeLabel({
      anchor: { x: 42, y: 24 },
      size,
      plot: { left: 0, top: 0, right: 120, bottom: 80 },
      avoid: [{ x: 40, y: 16, width: 24, height: 20 }],
    });

    expect(overlaps({ x: placement.x, y: placement.y, ...size }, { x: 40, y: 16, width: 24, height: 20 })).toBe(false);
    expect(["start", "end"]).toContain(placement.anchor);
    expect(placement.y).toBeGreaterThanOrEqual(0);
    expect(placement.y + size.height).toBeLessThanOrEqual(80);
    expect(placement.x).toBe(-10);
  });

  it("keeps cramped labels on the plot edge fallback", () => {
    const placement = placeSafeLabel({
      anchor: { x: 10, y: 12 },
      size: { width: 48, height: 12 },
      plot: { left: 0, top: 0, right: 20, bottom: 40 },
      avoid: [],
    });

    expect(placement.x).toBe(30);
    expect(placement.anchor).toBe("start");
  });

  it("falls back vertically when both horizontal edges are blocked", () => {
    const placement = placeSafeLabel({
      anchor: { x: 10, y: 20 },
      size: { width: 18, height: 12 },
      plot: { left: 0, top: 0, right: 20, bottom: 40 },
      avoid: [
        { x: 30, y: 14, width: 18, height: 12 },
        { x: -12, y: 14, width: 18, height: 12 },
      ],
    });

    expect(overlaps({ x: placement.x, y: placement.y, width: 18, height: 12 }, { x: 30, y: 14, width: 18, height: 12 })).toBe(false);
    expect(overlaps({ x: placement.x, y: placement.y, width: 18, height: 12 }, { x: -12, y: 14, width: 18, height: 12 })).toBe(false);
    expect(placement.anchor).toBe("middle");
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
    expect(screen.getByRole("img", { name: /Numeric chart grid/i })).toBeInTheDocument();
    expect(screen.getByText(/Numeric chart grid/i).tagName.toLowerCase()).toBe("title");
  });
});
