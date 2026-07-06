import { render, screen } from "@testing-library/react";

import { PropertyTable, ValueWithUnitsTable } from "@/components/property-table";
import { formatTableNumber } from "@/lib/table-number";

function getRowContaining(text: string | RegExp) {
  return screen
    .getAllByText(text)
    .find((node) => node.closest("tr"))
    ?.closest("tr");
}

function expectRowValueMath(label: string | RegExp, expected?: string) {
  const row = getRowContaining(label);
  const valueCell = row?.querySelector("td:nth-child(2)");

  expect(valueCell?.querySelector(".katex")).not.toBeNull();

  if (expected) {
    expect(valueCell).toHaveTextContent(expected);
  }
}

describe("PropertyTable", () => {
  it("formats table numbers without collapsing small values to zero", () => {
    expect(formatTableNumber(0)).toBe("\\text{0}");
    expect(formatTableNumber(0.0001)).toBe("\\text{0,0001}");
    expect(formatTableNumber(0.00008949025483876957)).toBe("\\text{8,94903} \\times 10^{-5}");
    expect(formatTableNumber(100000)).toBe("\\text{1} \\times 10^{5}");
    expect(formatTableNumber(1234567)).toBe("\\text{1,23457} \\times 10^{6}");
  });

  it("renders a property label and its formatted value for rows", () => {
    render(
      <PropertyTable rows={[{ label: "Diametro", value: 126.16, units: "millimeter" }]} />,
    );

    expect(screen.getByText("Diametro")).toBeInTheDocument();
    expectRowValueMath("Diametro", "126,16");
  });

  it("preserves provided textual row labels verbatim", () => {
    render(
      <PropertyTable
        rows={[
          { label: "Número de Reynolds", value: 50000, units: "dimensionless" },
          { label: "Fator de atrito", value: 0.0215, units: "dimensionless" },
          { label: "Diâmetro hidráulico", value: 66.67, units: "millimeter" },
          { label: "Perda de carga", value: 12.5, units: "pascal" },
        ]}
      />,
    );

    expect(screen.getByText("Número de Reynolds")).toBeInTheDocument();
    expect(screen.getByText("Fator de atrito")).toBeInTheDocument();
    expect(screen.getByText("Diâmetro hidráulico")).toBeInTheDocument();
    expect(screen.getByText("Perda de carga")).toBeInTheDocument();
    expect(screen.queryByText("NúMero De Reynolds")).not.toBeInTheDocument();
    expect(screen.queryByText("Fator De Atrito")).not.toBeInTheDocument();
    expect(screen.queryByText("Diâmetro Hidráulico")).not.toBeInTheDocument();
  });

  it("renders small and large numeric rows with scientific notation when needed", () => {
    render(
      <PropertyTable
        rows={[
          {
            label: "Pequeno",
            value: 0.00008949025483876957,
            units: "millimeter",
          },
          {
            label: "Grande",
            value: 1234567,
            units: "pascal",
          },
        ]}
      />,
    );

    expect(screen.getByText("Pequeno")).toBeInTheDocument();
    expect(screen.getByText("Grande")).toBeInTheDocument();

    const smallRow = getRowContaining("Pequeno");
    const largeRow = getRowContaining("Grande");

    expect(smallRow?.querySelector(".katex")).not.toBeNull();
    expect(largeRow?.querySelector(".katex")).not.toBeNull();
    expect(smallRow).toHaveTextContent("8,94903");
    expect(smallRow).toHaveTextContent("10");
    expect(smallRow).toHaveTextContent("millimeter");
    expect(largeRow).toHaveTextContent("1,23457");
    expect(largeRow).toHaveTextContent("10");
    expect(largeRow).toHaveTextContent("pascal");
  });

  it("preserves the legacy data contract with semantic row tokens", () => {
    const { container } = render(
      <ValueWithUnitsTable label="Diametro" data={{ value: 126.16, units: "millimeter" }} />,
    );

    const row = container.querySelector("tbody tr");
    const valueCell = row?.querySelector("td:nth-child(2)");
    const unitCell = container.querySelector("tbody tr td:last-child");

    expect(row).toHaveClass("border-border");
    expect(valueCell).toHaveTextContent("126,16");
    expect(valueCell?.querySelector(".katex")).not.toBeNull();
    expect(unitCell).toHaveTextContent("millimeter");
    expect(unitCell).toHaveClass("text-foreground");
  });
});
