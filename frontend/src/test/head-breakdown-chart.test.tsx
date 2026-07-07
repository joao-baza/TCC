import { render, screen } from "@testing-library/react";

import { HeadBreakdownChart } from "@/components/viz/head-breakdown-chart";

describe("HeadBreakdownChart", () => {
  it("renders the head decomposition title, total, and all provided terms", () => {
    render(
      <HeadBreakdownChart
        totalHead={18.2}
        terms={[
          { label: "ΔP/(ρg)", value: 12.4 },
          { label: "Δz", value: 5.1 },
          { label: "ΔV²/(2g)", value: 1.3 },
          { label: "-h_f", value: -0.6 },
        ]}
      />,
    );

    expect(screen.getByText("Decomposição")).toBeInTheDocument();
    expect(screen.getByText("H total = 18,2 m")).toBeInTheDocument();
    expect(screen.getByText("ΔP/(ρg)")).toBeInTheDocument();
    expect(screen.getByText("Δz")).toBeInTheDocument();
    expect(screen.getByText("ΔV²/(2g)")).toBeInTheDocument();
    expect(screen.getByText("-h_f")).toBeInTheDocument();
    expect(screen.getAllByText("12,4").length).toBeGreaterThan(1);
    expect(screen.getAllByText("5,1").length).toBeGreaterThan(1);
    expect(screen.getAllByText("1,3").length).toBeGreaterThan(1);
    expect(screen.getAllByText("-0,6").length).toBeGreaterThan(1);
  });
});
