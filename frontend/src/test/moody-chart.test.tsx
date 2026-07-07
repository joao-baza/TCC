import { render, screen } from "@testing-library/react";

import { MoodyChart } from "@/components/viz/moody-chart";

describe("MoodyChart", () => {
  it("renders the operational point context and chart output for a valid point", () => {
    const { container } = render(
      <MoodyChart reynolds={50000} frictionFactor={0.0215} roughness={0.045} />,
    );

    expect(screen.getByRole("heading", { name: /Ponto operacional/i })).toBeInTheDocument();
    expect(screen.getByText("Re = 50000")).toBeInTheDocument();
    expect(screen.getByText("f = 0,0215")).toBeInTheDocument();
    expect(screen.getAllByText("e/D = 0,045").length).toBeGreaterThan(0);
    expect(screen.getByText(/Curva laminar/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Faixa de transição/i).length).toBeGreaterThan(1);
    expect(screen.getAllByText("0,005").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0,01").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("path").length).toBeGreaterThan(10);
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
