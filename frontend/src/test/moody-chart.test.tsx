import { render, screen } from "@testing-library/react";

import { MoodyChart } from "@/components/viz/moody-chart";

describe("MoodyChart", () => {
  it("renders the operational point context and chart output for a valid point", () => {
    const { container } = render(
      <MoodyChart reynolds={50000} frictionFactor={0.0215} roughness={0.045} />,
    );

    expect(screen.getByText("Ponto operacional")).toBeInTheDocument();
    expect(screen.getByText("Re = 50000")).toBeInTheDocument();
    expect(screen.getByText("f = 0.0215")).toBeInTheDocument();
    expect(screen.getByText("e/D = 0.045")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders saved scenarios as a contextual legend", () => {
    render(
      <MoodyChart
        reynolds={50000}
        frictionFactor={0.0215}
        roughness={0.045}
        scenarios={[
          { id: "flow-1", name: "Cenário base", color: "#2563EB" },
          { id: "flow-2", name: "Cenário viscoso", color: "#D97706" },
        ]}
      />,
    );

    expect(screen.getByText("Cenários salvos")).toBeInTheDocument();
    expect(screen.getByText("Cenário base")).toBeInTheDocument();
    expect(screen.getByText("Cenário viscoso")).toBeInTheDocument();
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
