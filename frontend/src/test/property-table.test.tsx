import { render, screen } from "@testing-library/react";

import { PropertyTable, ValueWithUnitsTable } from "@/components/property-table";

describe("PropertyTable", () => {
  it("renders a property label and its formatted value for rows", () => {
    render(
      <PropertyTable rows={[{ label: "Diametro", value: 126.16, units: "millimeter" }]} />,
    );

    expect(screen.getByText("Diametro")).toBeInTheDocument();
    expect(screen.getByText("126.16 mm")).toBeInTheDocument();
  });

  it("preserves the legacy data contract with semantic row tokens", () => {
    const { container } = render(
      <ValueWithUnitsTable label="Diametro" data={{ value: 126.16, units: "millimeter" }} />,
    );

    const row = container.querySelector("tbody tr");
    const valueCell = screen.getByText("126.1600");
    const unitCell = screen.getByText("millimeter");

    expect(row).toHaveClass("border-border");
    expect(valueCell).toHaveClass("text-foreground");
    expect(unitCell).toHaveClass("text-foreground");
  });
});
