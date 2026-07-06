import { render, screen } from "@testing-library/react";

import { ResultTableSection } from "@/components/result-table-section";

describe("ResultTableSection", () => {
  it("renders the title and property table when rows are present", () => {
    render(
      <ResultTableSection
        title="Resultado"
        emptyLabel="Sem resultado"
        rows={[{ label: "Diâmetro", value: 12.3, units: "millimeter" }]}
      />,
    );

    expect(screen.getByText("Resultado")).toBeInTheDocument();
    expect(screen.getByText("Diâmetro")).toBeInTheDocument();
    expect(screen.queryByText("Sem resultado")).not.toBeInTheDocument();
  });

  it("renders the empty label when no rows are available", () => {
    render(
      <ResultTableSection title="Resultado" emptyLabel="Sem resultado" rows={[]} />,
    );

    expect(screen.getByText("Resultado")).toBeInTheDocument();
    expect(screen.getByText("Sem resultado")).toBeInTheDocument();
    expect(screen.queryByText("Diâmetro")).not.toBeInTheDocument();
  });
});
