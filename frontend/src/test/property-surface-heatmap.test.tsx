import { fireEvent, render, screen } from "@testing-library/react";

import { PropertySurfaceHeatmap } from "@/components/viz/property-surface-heatmap";

describe("PropertySurfaceHeatmap", () => {
  it("describes what can be extracted from the property surface", () => {
    const { container } = render(
      <PropertySurfaceHeatmap
        fluid="Water"
        propertyLabel="Entalpia"
        propertyUnits="kJ/kg"
        temperatures={[300, 350, 400]}
        pressures={[100000, 500000]}
        values={[
          [100, 120, 140],
          [200, 230, 260],
        ]}
        valueMin={100}
        valueMax={260}
      />,
    );

    expect(screen.getByRole("heading", { name: /^Superfície T-P$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - Superfície T-P/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Superfície T-P/i }));
    expect(screen.getByText(/A cor de cada célula representa o valor interpolado/i)).toBeInTheDocument();
    expect(screen.getByText(/Faixas de alta sensibilidade da propriedade/i)).toBeInTheDocument();
    expect(screen.getByText(/NIST\/ASME Steam Properties Users/i)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
