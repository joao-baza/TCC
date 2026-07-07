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
    expect(formatTableNumber(0.0001)).toBe("\\text{1} \\times 10^{-4}");
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
    const row = getRowContaining("Diametro");
    expect(row?.querySelector("td:nth-child(3) .katex")).not.toBeNull();
    expect(row).toHaveTextContent("mm");
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
          {
            label: "Limite Inferior",
            value: 0.0001,
            units: "dimensionless",
          },
          {
            label: "Limite Superior",
            value: 100000,
            units: "dimensionless",
          },
        ]}
      />,
    );

    expect(screen.getByText("Pequeno")).toBeInTheDocument();
    expect(screen.getByText("Grande")).toBeInTheDocument();
    expect(screen.getByText("Limite Inferior")).toBeInTheDocument();
    expect(screen.getByText("Limite Superior")).toBeInTheDocument();

    const smallRow = getRowContaining("Pequeno");
    const largeRow = getRowContaining("Grande");
    const lowerBoundaryRow = getRowContaining("Limite Inferior");
    const upperBoundaryRow = getRowContaining("Limite Superior");

    expect(smallRow?.querySelector(".katex")).not.toBeNull();
    expect(largeRow?.querySelector(".katex")).not.toBeNull();
    expect(lowerBoundaryRow?.querySelector(".katex")).not.toBeNull();
    expect(upperBoundaryRow?.querySelector(".katex")).not.toBeNull();
    expect(smallRow).toHaveTextContent("8,94903");
    expect(smallRow).toHaveTextContent("10");
    expect(smallRow).toHaveTextContent("mm");
    expect(largeRow).toHaveTextContent("1,23457");
    expect(largeRow).toHaveTextContent("10");
    expect(largeRow).toHaveTextContent("Pa");
    expect(lowerBoundaryRow).toHaveTextContent("10");
    expect(lowerBoundaryRow).toHaveTextContent("-4");
    expect(lowerBoundaryRow).toHaveTextContent("-");
    expect(upperBoundaryRow).toHaveTextContent("1");
    expect(upperBoundaryRow).toHaveTextContent("10");
    expect(upperBoundaryRow).toHaveTextContent("-");
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
    expect(unitCell).toHaveTextContent("mm");
    expect(unitCell?.querySelector(".katex")).not.toBeNull();
    expect(unitCell).toHaveClass("text-foreground");
    expect(valueCell).toHaveClass("text-center");
    expect(unitCell).toHaveClass("text-center");
  });

  it("renders textual units without forcing them through KaTeX", () => {
    render(
      <PropertyTable rows={[{ label: "Fração molar", value: 0.35, units: "fração molar" }]} />,
    );

    const row = getRowContaining("Fração molar");
    const unitCell = row?.querySelector("td:nth-child(3)");

    expect(unitCell).toHaveTextContent("fração molar");
    expect(unitCell?.querySelector(".katex")).toBeNull();
  });

  it("centers value and unit headers and cells", () => {
    const { container } = render(
      <PropertyTable rows={[{ label: "Diametro", value: 126.16, units: "millimeter" }]} />,
    );

    const headerCells = container.querySelectorAll("thead th");
    const bodyCells = container.querySelectorAll("tbody td");

    expect(headerCells[1]).toHaveClass("text-center");
    expect(headerCells[2]).toHaveClass("text-center");
    expect(bodyCells[1]).toHaveClass("text-center");
    expect(bodyCells[2]).toHaveClass("text-center");
  });
});
