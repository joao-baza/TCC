import { normalizeChartColors } from "@/components/viz/chart-color-utils";
import type { ChartModel } from "@/types/chart-model";

describe("normalizeChartColors", () => {
  it("reassigns duplicate series and marker colors to keep the chart palette unique", () => {
    const model: ChartModel = {
      id: "duplicate-colors",
      title: "Duplicate colors",
      axes: {
        x: {
          scale: "linear",
          label: "x",
          units: "adimensional",
          domain: { min: 0, max: 1 },
          ticks: [0, 1],
          major_ticks: [0, 1],
        },
        y: {
          scale: "linear",
          label: "y",
          units: "adimensional",
          domain: { min: 0, max: 1 },
          ticks: [0, 1],
          major_ticks: [0, 1],
        },
      },
      series: [
        {
          id: "a",
          name: "A",
          kind: "line",
          color: "#2563eb",
          points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        },
        {
          id: "b",
          name: "B",
          kind: "line",
          color: "#2563eb",
          points: [{ x: 0, y: 1 }, { x: 1, y: 0 }],
        },
      ],
      markers: [
        { id: "m1", x: 0.2, y: 0.2, label: "M1", color: "#2563eb" },
        { id: "m2", x: 0.8, y: 0.8, label: "M2" },
      ],
      metadata: { version: "1.0" },
    };

    const normalized = normalizeChartColors(model);
    const colors = [
      normalized.series[0].color,
      normalized.series[1].color,
      normalized.markers[0].color,
      normalized.markers[1].color,
    ];

    expect(new Set(colors).size).toBe(colors.length);
    expect(normalized.series[0].color).toBe("#2563eb");
  });
});
