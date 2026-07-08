import { render, screen, within } from "@testing-library/react";

import { MoodyChart } from "@/components/viz/moody-chart";

describe("MoodyChart", () => {
  it("renders the operational point context and chart output for a valid point", () => {
    const { container } = render(
      <MoodyChart reynolds={50000} frictionFactor={0.0215} roughness={0.045} />,
    );

    expect(screen.getByRole("img", { name: /Diagrama de Moody/i })).toBeInTheDocument();
    expect(screen.getByText(/Curva laminar/i)).toBeInTheDocument();
    expect(screen.getByText(/Legenda das curvas/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Como funciona - Ponto operacional no Diagrama de Moody/i }),
    ).toBeInTheDocument();
    const legend = screen.getByTestId("chart-series-legend");
    const legendItems = within(legend).getAllByRole("listitem");
    expect(legendItems).toHaveLength(16);
    expect(new Set(legendItems.map((item) => item.style.borderColor)).size).toBe(16);
    expect(screen.getByText("Curva laminar")).toBeInTheDocument();
    expect(screen.getByText("ε/D (operacional) = 0,045")).toBeInTheDocument();
    expect(screen.getAllByText("0,005").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0,01").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("path").length).toBeGreaterThan(10);
    expect(container.querySelector("[data-chart-semantic='transition-band']")).not.toBeNull();
    expect(container.querySelector("[data-chart-semantic='laminar-curve']")).not.toBeNull();
    expect(container.querySelector("[data-chart-semantic='operating-point']")).not.toBeNull();
    expect(container.querySelectorAll("[data-chart-semantic='roughness-curve']").length).toBeGreaterThan(1);
    expect(container.querySelector("[data-chart-semantic='operating-point']")).toHaveAttribute(
      "fill",
      "#dc2626",
    );
    expect(container.querySelector("path[stroke='#dc2626']")).not.toBeNull();
    expect(container.querySelectorAll("line[stroke='#dc2626']").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('[data-axis-tick="x"]')[0]).toHaveTextContent("10^3");
    expect(container.querySelectorAll('[data-axis-tick="y"]').length).toBeGreaterThanOrEqual(5);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders a safe fallback for invalid input", () => {
    const { container } = render(
      <MoodyChart reynolds={Number.NaN} frictionFactor={0.0215} roughness={0.045} />,
    );

    expect(screen.getByText("Ponto operacional indisponível")).toBeInTheDocument();
    expect(screen.getByText("Revise os parâmetros para exibir o gráfico.")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});
