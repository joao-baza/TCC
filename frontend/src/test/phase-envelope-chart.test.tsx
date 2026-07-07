import { fireEvent, render, screen } from "@testing-library/react";

import { PhaseEnvelopeChart } from "@/components/viz/phase-envelope-chart";

describe("PhaseEnvelopeChart", () => {
  it("renders a saturation dome with readable numeric axes", () => {
    const { container } = render(
      <PhaseEnvelopeChart
        fluid="Water"
        critical={{ temperature: 647.1, pressure: 22064000, density: 322 }}
        triple={{ temperature: 273.16, pressure: 611.657 }}
        points={[
          {
            temperature: 273.2,
            pressure: 611.7,
            liquid_entropy: 1000,
            vapor_entropy: 7000,
            liquid_enthalpy: 100,
            vapor_enthalpy: 2500,
          },
          {
            temperature: 500,
            pressure: 2500000,
            liquid_entropy: 2500,
            vapor_entropy: 6200,
            liquid_enthalpy: 800,
            vapor_enthalpy: 2900,
          },
          {
            temperature: 647,
            pressure: 22000000,
            liquid_entropy: 3900,
            vapor_entropy: 4200,
            liquid_enthalpy: 1800,
            vapor_enthalpy: 2000,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: /^Envelope de fase$/i })).toBeInTheDocument();
    expect(screen.getByText(/Water/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - Envelope de Fase/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Envelope de Fase/i }));
    expect(screen.getByText(/regiões de líquido comprimido, coexistência líquido-vapor/i)).toBeInTheDocument();
    expect(screen.getByText(/O que você pode extrair daqui/i)).toBeInTheDocument();
    expect(screen.getByText(/Ponto tríplice, ponto crítico/i)).toBeInTheDocument();
    expect(screen.getByText(/NIST\/ASME Steam Properties Users/i)).toBeInTheDocument();
    expect(screen.getByText(/^Ponto tríplice$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Ponto crítico$/i)).toBeInTheDocument();
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/Entropia/i);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/Temperatura \(K\)/i);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
