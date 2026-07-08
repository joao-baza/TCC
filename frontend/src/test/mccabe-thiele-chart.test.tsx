import { render, screen } from "@testing-library/react";

import { McCabeThieleChart } from "@/components/viz/mccabe-thiele-chart";
import type { ChartModel } from "@/types/chart-model";

const model: ChartModel = {
  id: "mccabe-thiele-chart",
  title: "McCabe-Thiele",
  subtitle: "Curvas calculadas no backend",
  axes: {
    x: {
      scale: "linear",
      label: "x (líquido, fração molar)",
      units: "adimensional",
      domain: { min: 0, max: 1 },
      ticks: [0, 0.25, 0.5, 0.75, 1],
      major_ticks: [0, 0.5, 1],
    },
    y: {
      scale: "linear",
      label: "y (vapor, fração molar)",
      units: "adimensional",
      domain: { min: 0, max: 1 },
      ticks: [0, 0.25, 0.5, 0.75, 1],
      major_ticks: [0, 0.5, 1],
    },
  },
  series: [
    {
      id: "diagonal",
      name: "Diagonal",
      kind: "line",
      color: "#94a3b8",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    },
    {
      id: "equilibrium-curve",
      name: "Curva de equilíbrio",
      kind: "line",
      color: "#2563eb",
      points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.72 },
        { x: 1, y: 1 },
      ],
    },
    {
      id: "rectifying-line",
      name: "Linha de enriquecimento",
      kind: "line",
      color: "#0f766e",
      points: [
        { x: 0, y: 0.95 },
        { x: 1, y: 0.95 },
      ],
    },
    {
      id: "stripping-line",
      name: "Linha de esgotamento",
      kind: "line",
      color: "#b45309",
      points: [
        { x: 0, y: 0.05 },
        { x: 1, y: 0.05 },
      ],
    },
    {
      id: "q-line",
      name: "Linha q",
      kind: "line",
      color: "#7c3aed",
      points: [
        { x: 0.7, y: 0 },
        { x: 0.7, y: 1 },
      ],
    },
    {
      id: "stage-steps",
      name: "Estágios",
      kind: "line",
      color: "#dc2626",
      points: [
        { x: 0.95, y: 0.95 },
        { x: 0.6, y: 0.95 },
        { x: 0.6, y: 0.78 },
      ],
    },
  ],
  markers: [
    { id: "xD", x: 0.95, y: 0.95, label: "xD", color: "#0f766e" },
    { id: "xB", x: 0.05, y: 0.05, label: "xB", color: "#b45309" },
    { id: "zF", x: 0.7, y: 0.7, label: "zF", color: "#475569" },
  ],
  metadata: { version: "1.0" },
};

describe("McCabeThieleChart", () => {
  it("renders the backend-owned McCabe-Thiele model", () => {
    const { container } = render(
      <McCabeThieleChart model={model} />,
    );

    expect(screen.getByRole("heading", { name: /^McCabe-Thiele$/i })).toBeInTheDocument();
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/x\s*\(líquido, fração molar\)/i);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/y\s*\(vapor, fração molar\)/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(screen.getByTestId("chart-series-legend")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - McCabe-Thiele/i })).toBeInTheDocument();
    expect(screen.getByText("y = x").closest("li")).toHaveStyle({
      borderColor: "rgb(148, 163, 184)",
      color: "rgb(148, 163, 184)",
    });
    expect(screen.getByText("Curva de equilíbrio").closest("li")).toHaveStyle({
      borderColor: "rgb(37, 99, 235)",
      color: "rgb(37, 99, 235)",
    });
    expect(screen.getByText("Linha de enriquecimento").closest("li")).toHaveStyle({
      borderColor: "rgb(15, 118, 110)",
      color: "rgb(15, 118, 110)",
    });
    expect(screen.getByText("Linha de esgotamento").closest("li")).toHaveStyle({
      borderColor: "rgb(180, 83, 9)",
      color: "rgb(180, 83, 9)",
    });
    expect(screen.getByText("Linha q").closest("li")).toHaveStyle({
      borderColor: "rgb(71, 85, 105)",
      color: "rgb(71, 85, 105)",
    });
    expect(screen.getByText("xD = 0,95").closest("li")).toHaveStyle({
      borderColor: "rgb(22, 163, 74)",
      color: "rgb(22, 163, 74)",
    });
    expect(screen.getByText("xB = 0,05").closest("li")).toHaveStyle({
      borderColor: "rgb(8, 145, 178)",
      color: "rgb(8, 145, 178)",
    });
    expect(screen.getByText("zF = 0,7").closest("li")).toHaveStyle({
      borderColor: "rgb(71, 85, 105)",
      color: "rgb(71, 85, 105)",
    });

    expect(container.querySelector('[data-series-id="rectifying-line"] path')).toHaveAttribute(
      "stroke-dasharray",
      "6 4",
    );
    expect(container.querySelector('[data-series-id="rectifying-line"] path')).toHaveAttribute(
      "stroke-width",
      "1.5",
    );
    expect(container.querySelector('[data-series-id="stripping-line"] path')).toHaveAttribute(
      "stroke-dasharray",
      "6 4",
    );
    expect(container.querySelector('[data-series-id="stripping-line"] path')).toHaveAttribute(
      "stroke-width",
      "1.5",
    );
    expect(container.querySelector('[data-series-id="q-line"] path')).toHaveAttribute(
      "stroke-dasharray",
      "6 4",
    );
    expect(container.querySelector('[data-series-id="q-line"] path')).toHaveAttribute(
      "stroke-width",
      "1.5",
    );
    expect(container.querySelector('[data-series-id="q-line"] path')).toHaveAttribute(
      "stroke",
      "#475569",
    );
    const xDGuide = container.querySelector('[data-marker-guide-id="xD"]');
    const xBGuide = container.querySelector('[data-marker-guide-id="xB"]');

    expect(xDGuide).not.toBeNull();
    expect(xDGuide).toHaveAttribute("stroke", "#16a34a");
    expect(xDGuide).toHaveAttribute("stroke-dasharray", "5 4");
    expect(xDGuide).toHaveAttribute("stroke-width", "1.4");
    expect(xDGuide).toHaveAttribute("x1", xDGuide?.getAttribute("x2"));

    expect(xBGuide).not.toBeNull();
    expect(xBGuide).toHaveAttribute("stroke", "#0891b2");
    expect(xBGuide).toHaveAttribute("stroke-dasharray", "5 4");
    expect(xBGuide).toHaveAttribute("stroke-width", "1.4");
    expect(xBGuide).toHaveAttribute("x1", xBGuide?.getAttribute("x2"));
    expect(container.querySelector('[data-marker-id="xD"] text')).toBeNull();
    expect(container.querySelector('[data-marker-id="xB"] text')).toBeNull();
    expect(container.querySelector('[data-marker-id="zF"] text')).toBeNull();
  });
});
