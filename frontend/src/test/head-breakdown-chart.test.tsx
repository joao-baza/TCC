import { render, screen } from "@testing-library/react";

import { HeadBreakdownChart } from "@/components/viz/head-breakdown-chart";

describe("HeadBreakdownChart", () => {
  it("renders the head decomposition title, total, and all provided terms", () => {
    const { container } = render(
      <HeadBreakdownChart
        totalHead={20}
        terms={[
          { label: "ΔP/(ρg)", value: 10 },
          { label: "Δz", value: 5 },
          { label: "ΔV²/(2g)", value: 4 },
          { label: "-h_f", value: -1 },
        ]}
      />,
    );

    const table = screen.getByRole("table", { name: "Decomposição" });
    expect(screen.getByText("Decomposição")).toBeInTheDocument();
    expect(screen.getByText("H total = 20 m")).toBeInTheDocument();
    expect(table).toHaveTextContent("ΔP/(ρg)");
    expect(table).toHaveTextContent("Δz");
    expect(table).toHaveTextContent("ΔV2/(2g)");
    expect(table).toHaveTextContent("h_{f}");
    expect(table).toHaveTextContent("50%");
    expect(table).toHaveTextContent("25%");
    expect(table).toHaveTextContent("20%");
    expect(table).toHaveTextContent("5%");
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(12);
    expect(table.closest("section")).toHaveClass(
      "mx-auto",
      "w-full",
      "max-w-[760px]",
    );
  });
});
