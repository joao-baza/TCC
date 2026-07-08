import { render, screen } from "@testing-library/react";

import { ChartModelRenderer } from "@/components/viz/chart-model-renderer";
import type { ChartModel } from "@/types/chart-model";

const massBalanceChart: ChartModel = {
  id: "mass-balance",
  title: "Mass balance overview",
  subtitle: "Precomputed backend payload",
  approximation_notice: "Uses backend-provided teaching approximation.",
  axes: {
    x: {
      scale: "linear",
      label: "Stream index",
      units: "index",
      domain: { min: 1, max: 3 },
      ticks: [1, 2, 3],
      major_ticks: [1, 2, 3],
    },
    flow: {
      scale: "linear",
      label: "Flow rate",
      units: "kg/h",
      domain: { min: 0, max: 100 },
      ticks: [0, 50, 100],
      major_ticks: [0, 50, 100],
    },
    composition: {
      scale: "log",
      label: "Composition",
      units: "fraction",
      domain: { min: 0.001, max: 1 },
      ticks: [0.001, 0.01, 0.1, 1],
      major_ticks: [0.001, 0.01, 0.1, 1],
      tick_format: "scientific",
    },
  },
  series: [
    {
      id: "flow-band",
      name: "Flow band",
      kind: "band",
      color: "#cbd5e1",
      points: [
        { x: 1, y: 40 },
        { x: 2, y: 70 },
        { x: 3, y: 90 },
      ],
    },
    {
      id: "flow-area",
      name: "Flow area",
      kind: "area",
      color: "#93c5fd",
      points: [
        { x: 1, y: 20 },
        { x: 2, y: 45 },
        { x: 3, y: 60 },
      ],
    },
    {
      id: "flow-line",
      name: "Flow line",
      kind: "line",
      color: "#2563eb",
      points: [
        { x: 1, y: 15 },
        { x: 2, y: 55 },
        { x: 3, y: 80 },
      ],
    },
    {
      id: "flow-points",
      name: "Flow points",
      kind: "scatter",
      color: "#0f172a",
      points: [
        { x: 1.5, y: 35 },
        { x: 2.5, y: 65 },
      ],
    },
  ],
  markers: [{ id: "feed", x: 1, y: 100, label: "Fresh feed", color: "#dc2626" }],
  annotations: [{ id: "note", text: "Backend annotation", x: 2.5, y: 0.1, tone: "info" }],
  metadata: {
    version: "1.0",
    units: {
      x: "index",
      flow: "kg/h",
      composition: "fraction",
    },
  },
};

const operatingPointChart: ChartModel = {
  id: "operating-point-chart",
  title: "Operating profile",
  subtitle: "Guide lines around the active point",
  axes: {
    x: {
      scale: "linear",
      label: "Flow",
      units: "m³/s",
      domain: { min: 0, max: 10 },
      ticks: [0, 5, 10],
      major_ticks: [0, 5, 10],
    },
    y: {
      scale: "linear",
      label: "Head",
      units: "m",
      domain: { min: 0, max: 20 },
      ticks: [0, 10, 20],
      major_ticks: [0, 10, 20],
    },
  },
  series: [
    {
      id: "curve",
      name: "Curve",
      kind: "line",
      color: "#2563eb",
      points: [
        { x: 0, y: 4 },
        { x: 5, y: 12 },
        { x: 10, y: 18 },
      ],
    },
  ],
  markers: [
    {
      id: "operating-point",
      x: 5,
      y: 12,
      label: "Operating point",
      color: "#dc2626",
    },
  ],
  metadata: { version: "1.0" },
};

const pointGuideChart: ChartModel = {
  ...operatingPointChart,
  id: "point-guide-chart",
  title: "Point guide chart",
  subtitle: "Triple and critical markers",
  markers: [
    { id: "triple-point", x: 3, y: 6, label: "Triple point", color: "#0f766e" },
    { id: "critical-point", x: 7, y: 14, label: "Critical point", color: "#b45309" },
  ],
};

const stackedBarChart: ChartModel = {
  id: "stacked-bar-chart",
  title: "Composição mássica das correntes",
  subtitle:
    "Cada barra representa a vazão da corrente, segmentada pela contribuição mássica dos componentes.",
  axes: {
    x: {
      scale: "linear",
      label: "Corrente",
      units: "índice",
      domain: { min: 1, max: 3 },
      ticks: [1, 2, 3],
      major_ticks: [1, 2, 3],
    },
    flow: {
      scale: "linear",
      label: "Vazão mássica da corrente",
      units: "kg/h",
      domain: { min: 0, max: 100 },
      ticks: [0, 50, 100],
      major_ticks: [0, 50, 100],
    },
  },
  series: [
    {
      id: "component-a",
      name: "Contribuição de A",
      kind: "bar",
      color: "#2563eb",
      points: [
        { x: 1, y: 80 },
        { x: 2, y: 10.8 },
        { x: 3, y: 4 },
      ],
    },
    {
      id: "component-b",
      name: "Contribuição de B",
      kind: "bar",
      color: "#16a34a",
      points: [
        { x: 1, y: 20 },
        { x: 2, y: 3 },
        { x: 3, y: 2 },
      ],
    },
  ],
  metadata: { version: "1.0", units: { x: "índice", flow: "kg/h" } },
};

describe("ChartModelRenderer", () => {
  it("renders backend-owned axes, series, markers, and notices without recomputing them", () => {
    const { container } = render(
      <ChartModelRenderer model={massBalanceChart} yAxisKey="flow" />,
    );

    expect(
      screen.getByRole("heading", { name: "Mass balance overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Precomputed backend payload")).toBeInTheDocument();
    expect(screen.getByText("Uses backend-provided teaching approximation.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /mass balance overview/i })).toBeInTheDocument();
    expect(screen.getByText("Stream index (index)")).toHaveAttribute("data-chart-label", "x");
    expect(screen.getByText("Flow rate (kg/h)")).toHaveAttribute("data-chart-label", "y");
    expect(screen.getByText("Fresh feed")).toBeInTheDocument();
    expect(screen.getByText("Backend annotation")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(container.querySelector('[data-series-kind="line"]')).toBeTruthy();
    expect(container.querySelector('[data-series-kind="area"]')).toBeTruthy();
    expect(container.querySelector('[data-series-kind="band"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-series-kind="scatter-point"]').length).toBe(2);
  });

  it("can render a non-default y axis key while keeping the configured axis labels accessible", () => {
    const { container } = render(
      <ChartModelRenderer
        model={massBalanceChart}
        xAxisKey="x"
        yAxisKey="composition"
      />,
    );

    const yTicks = Array.from(container.querySelectorAll('text[data-axis-tick="y"]')).map(
      (tick) => tick.textContent,
    );

    expect(screen.getByText("Composition (fraction)")).toHaveAttribute("data-chart-label", "y");
    expect(yTicks).toEqual(["1 × 10^-3", "1 × 10^-2", "1 × 10^-1", "1 × 10^0"]);
  });

  it("draws operating-point guide lines to both axes when the backend marks an active point", () => {
    const { container } = render(<ChartModelRenderer model={operatingPointChart} />);

    expect(screen.getByText("Operating point")).toBeInTheDocument();
    expect(container.querySelectorAll("line[stroke-dasharray='6 4']")).toHaveLength(2);
    expect(container.querySelector("circle[fill='#dc2626']")).toBeTruthy();
  });

  it("draws guide lines for triple and critical markers using their own colors", () => {
    const { container } = render(<ChartModelRenderer model={pointGuideChart} />);

    expect(screen.getByText("Triple point")).toBeInTheDocument();
    expect(screen.getByText("Critical point")).toBeInTheDocument();
    expect(container.querySelectorAll("line[stroke-dasharray='6 4']")).toHaveLength(4);
    expect(container.querySelector("circle[fill='#0f766e']")).toBeTruthy();
    expect(container.querySelector("circle[fill='#b45309']")).toBeTruthy();
    expect(container.querySelector("text[fill='#0f766e']")).toBeTruthy();
    expect(container.querySelector("text[fill='#b45309']")).toBeTruthy();
  });

  it("skips invalid log-scale points and preserves detached annotations as textual notes", () => {
    const { container } = render(
      <ChartModelRenderer
        model={{
          ...massBalanceChart,
          axes: {
            ...massBalanceChart.axes,
            y: {
              scale: "log",
              label: "Relative flow",
              units: "fraction",
              domain: { min: 0.001, max: 1 },
              ticks: [0.001, 0.01, 0.1, 1],
              major_ticks: [0.001, 0.01, 0.1, 1],
            },
          },
          series: [
            {
              id: "valid-log-series",
              name: "Valid log line",
              kind: "line",
              color: "#2563eb",
              points: [
                { x: 1, y: 0.01 },
                { x: 2, y: 0.1 },
              ],
            },
            {
              id: "invalid-log-series",
              name: "Invalid log line",
              kind: "line",
              color: "#dc2626",
              points: [
                { x: 1, y: 0.01 },
                { x: 2, y: 0 },
              ],
            },
          ],
          markers: [{ id: "invalid-marker", x: 1.5, y: 0, label: "Should be skipped" }],
          annotations: [
            { id: "inline-note", text: "Inline note", x: 2, y: 0.1, tone: "info" },
            { id: "detached-note", text: "Detached note" },
          ],
        }}
      />,
    );

    expect(screen.getByText("Inline note")).toBeInTheDocument();
    expect(screen.getByText("Detached note")).toBeInTheDocument();
    expect(screen.queryByText("Should be skipped")).not.toBeInTheDocument();

    const linePaths = Array.from(container.querySelectorAll('[data-series-kind="line"] path')).map(
      (path) => path.getAttribute("d"),
    );
    expect(linePaths).toContain("M 88 220 L 410 124");
    expect(linePaths).toContain("M 88 220");
  });

  it("honors scientific tick formatting when the backend requests it", () => {
    const { container } = render(
      <ChartModelRenderer
        model={{
          ...massBalanceChart,
          axes: {
            ...massBalanceChart.axes,
            composition: {
              ...massBalanceChart.axes.composition,
              ticks: [0.001, 0.01, 1],
              major_ticks: [0.001, 0.01, 1],
              tick_format: "scientific",
            },
          },
        }}
        yAxisKey="composition"
      />,
    );

    const yTicks = Array.from(container.querySelectorAll('text[data-axis-tick="y"]')).map(
      (tick) => tick.textContent,
    );

    expect(yTicks).toEqual(["1 × 10^-3", "1 × 10^-2", "1 × 10^0"]);
  });

  it("can restrict rendering to a selected subset of series ids", () => {
    const { container } = render(
      <ChartModelRenderer
        model={massBalanceChart}
        yAxisKey="flow"
        seriesIds={["flow-line"]}
      />,
    );

    expect(container.querySelector('[data-series-id="flow-line"]')).toBeTruthy();
    expect(container.querySelector('[data-series-id="flow-area"]')).toBeNull();
    expect(container.querySelector('[data-series-id="flow-band"]')).toBeNull();
    expect(container.querySelector('[data-series-id="flow-points"]')).toBeNull();
  });

  it("renders stacked bars for component series that share the same x value", () => {
    const { container } = render(
      <ChartModelRenderer model={stackedBarChart} yAxisKey="flow" />,
    );

    expect(
      screen.getByRole("heading", { name: "Composição mássica das correntes" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cada barra representa a vazão da corrente/i)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="chart-stacked-bar-segment"]')).toHaveLength(6);
  });
});
