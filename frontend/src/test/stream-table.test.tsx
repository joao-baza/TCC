import { render, screen, within } from "@testing-library/react";

import { StreamTable } from "@/components/viz/stream-table";

describe("StreamTable", () => {
  it("renders a stream table with directions, flow rates, and composition summaries", () => {
    render(
      <StreamTable
        streams={[
          {
            name: "Fresh Feed",
            direction: "Entrada",
            flowRate: 100,
            compositions: { A: 0.8, B: 0.2 },
          },
          {
            name: "Product",
            direction: "Saída",
            flowRate: 40,
            compositions: { A: 0.1, B: 0.9 },
          },
        ]}
      />,
    );

    expect(screen.getByText(/Tabela de correntes/i)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Tabela de correntes/i })).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Fresh Feed")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Entrada")).toBeInTheDocument();
    expect(within(rows[1]).getByText("100.00 u. cons.")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/A: 0.8000/)).toBeInTheDocument();
    expect(within(rows[2]).getByText("Product")).toBeInTheDocument();
  });

  it("shows an empty state when no streams are available", () => {
    render(<StreamTable streams={[]} />);

    expect(screen.getByText(/Nenhuma corrente calculada/i)).toBeInTheDocument();
  });
});
