import { render, screen } from "@testing-library/react";

import { LevenspielChart } from "@/components/viz/levenspiel-chart";

describe("LevenspielChart", () => {
  it("plots sorted conversion points and the operational markers for CSTR and PFR", () => {
    render(
      <LevenspielChart
        points={[
          { conversion: 0.8, cstrVolume: 1.23, pfrVolume: 0.91 },
          { conversion: 0.2, cstrVolume: 0.18, pfrVolume: 0.12 },
          { conversion: 0.5, cstrVolume: 0.62, pfrVolume: 0.41 },
        ]}
        cstrOperatingPoint={{ conversion: 0.8, volume: 1.23 }}
        pfrOperatingPoint={{ conversion: 0.8, volume: 0.91 }}
        maxConversion={0.97}
      />,
    );

    expect(screen.getByText(/Diagrama de Levenspiel/i)).toBeInTheDocument();
    expect(screen.getByText(/X máx = 0.97/i)).toBeInTheDocument();
    expect(screen.getByText(/CSTR operacional/i)).toBeInTheDocument();
    expect(screen.getByText(/PFR operacional/i)).toBeInTheDocument();
    expect(screen.getByText(/V = 1.23 m³/i)).toBeInTheDocument();
    expect(screen.getByText(/V = 0.91 m³/i)).toBeInTheDocument();
  });
});
