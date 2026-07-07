import { render, screen } from "@testing-library/react";

import { PfrRecycleDaChart } from "@/components/viz/pfr-recycle-da-chart";

describe("PfrRecycleDaChart", () => {
  it("renders families of Damkohler curves for conversion versus recycle ratio", () => {
    const { container } = render(<PfrRecycleDaChart />);

    expect(screen.getByText(/Conversão X vs razão de reciclo R/i)).toBeInTheDocument();
    expect(screen.getByText(/Famílias de Damköhler/i)).toBeInTheDocument();

    const xLabels = Array.from(container.querySelectorAll('[data-chart-label="x"]')).map(
      (node) => node.textContent,
    );
    const yLabels = Array.from(container.querySelectorAll('[data-chart-label="y"]')).map(
      (node) => node.textContent,
    );

    expect(xLabels).toEqual(expect.arrayContaining(["Razão de reciclo R"]));
    expect(yLabels).toEqual(expect.arrayContaining(["Conversão X"]));
    expect(screen.getAllByText(/Da = /i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("pfr-recycle-da-chart")).toBeInTheDocument();
  });
});
