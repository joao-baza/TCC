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
    expect(screen.getByText("H = 18.200 m")).toBeInTheDocument();
    expect(screen.getByText("ΔP/(ρg)")).toBeInTheDocument();
    expect(screen.getByText("Δz")).toBeInTheDocument();
    expect(screen.getByText("ΔV²/(2g)")).toBeInTheDocument();
    expect(screen.getByText("-h_f")).toBeInTheDocument();
    expect(screen.getByText("12.4")).toBeInTheDocument();
    expect(screen.getByText("5.1")).toBeInTheDocument();
    expect(screen.getByText("1.3")).toBeInTheDocument();
    expect(screen.getByText("-0.6")).toBeInTheDocument();
  });
});
