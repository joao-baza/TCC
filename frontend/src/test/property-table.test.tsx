import { render, screen } from "@testing-library/react";

import { PropertyTable } from "@/components/property-table";

describe("PropertyTable", () => {
  it("renders a property label and its formatted value", () => {
    render(
      <PropertyTable rows={[{ label: "Diametro", value: 126.16, units: "millimeter" }]} />,
    );

    expect(screen.getByText("Diametro")).toBeInTheDocument();
    expect(screen.getByText("126.16 mm")).toBeInTheDocument();
  });

  it("uses semantic border and foreground tokens for rows", () => {
    const { container } = render(
      <PropertyTable rows={[{ label: "Diametro", value: 126.16, units: "millimeter" }]} />,
    );

    const row = container.querySelector("tbody tr");
    const valueCell = screen.getByText("126.16 mm");

    expect(row).toHaveClass("border-border");
    expect(valueCell).toHaveClass("text-foreground");
  });
});
