import { render, screen } from "@testing-library/react";

import { VariablesTable } from "@/components/variables-table";

describe("VariablesTable", () => {
  it("renders math-like symbols with KaTeX and keeps plain labels as text", () => {
    const { container } = render(
      <VariablesTable
        rows={[
          { symbol: "\\rho", description: "Massa específica do fluido", unit: "kg/m³" },
          { symbol: "DN (Diametro Nominal)", description: "Identificador textual", unit: "-" },
        ]}
      />,
    );

    const rows = container.querySelectorAll("tbody tr");
    const mathCell = rows[0]?.querySelector("td");
    const textCell = rows[1]?.querySelector("td");

    expect(mathCell?.querySelector(".katex")).not.toBeNull();
    expect(textCell?.querySelector(".katex")).toBeNull();
    expect(screen.getByText("DN (Diametro Nominal)")).toBeInTheDocument();
  });

  it("renders literal units when the unit string is already human readable", () => {
    const { container } = render(
      <VariablesTable
        rows={[
          {
            symbol: "A",
            description: "Area",
            unit: "meter ** 2",
          },
        ]}
      />,
    );

    const unitCell = container.querySelector("tbody td:last-child");

    expect(unitCell?.querySelector(".katex")).toBeNull();
    expect(unitCell).toHaveTextContent("meter ** 2");
  });
});
