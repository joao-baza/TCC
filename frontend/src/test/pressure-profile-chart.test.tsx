import { render, screen } from "@testing-library/react";

import { PressureProfileChart } from "@/components/viz/pressure-profile-chart";

describe("PressureProfileChart", () => {
  it("renders the relative pressure profile and segment summaries", () => {
    const { container } = render(
      <PressureProfileChart
        length={100}
        totalDrop={8.2}
        items={[
          { label: "Tubulacao", quantity: 100 },
          { label: "Valvula", quantity: 2 },
          { label: "Curva", quantity: 1 },
        ]}
      />,
    );

    expect(screen.getByText(/Perfil de pressao por trecho e acessorio/i)).toBeInTheDocument();
    expect(screen.getByText("L = 100 m")).toBeInTheDocument();
    expect(screen.getByText("h_f = 8.20 m")).toBeInTheDocument();
    expect(screen.getByText("Tubulacao")).toBeInTheDocument();
    expect(screen.getByText("Valvula")).toBeInTheDocument();
    expect(screen.getByText("Curva")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Comprimento da tubulação (m)")).toHaveAttribute("data-chart-label", "x");
    expect(screen.getByText("Perda acumulada de pressão (m)")).toHaveAttribute("data-chart-label", "y");
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
  });
});
