import { render, screen } from "@testing-library/react";

import { PfrRecycleDaChart } from "@/components/viz/pfr-recycle-da-chart";

describe("PfrRecycleDaChart", () => {
  it("renders the recycle profile for the current solved PFR case", () => {
    const { container } = render(
      <PfrRecycleDaChart
        points={[
          { recyclingRatio: 0, conversion: 0.00000049 },
          { recyclingRatio: 2, conversion: 0.00000162 },
          { recyclingRatio: 10, conversion: 0.00000188 },
        ]}
        volume={0.4369597326850339}
      />,
    );

    expect(screen.getByText(/Conversão do caso atual vs razão de reciclo/i)).toBeInTheDocument();
    expect(screen.getByText(/Base do perfil: V =/i)).toBeInTheDocument();

    const xLabels = Array.from(container.querySelectorAll('[data-chart-label="x"]')).map(
      (node) => node.textContent,
    );
    const yLabels = Array.from(container.querySelectorAll('[data-chart-label="y"]')).map(
      (node) => node.textContent,
    );

    expect(xLabels).toEqual(expect.arrayContaining(["Razão de reciclo - R"]));
    expect(yLabels).toEqual(expect.arrayContaining(["Conversão - X"]));
    expect(screen.queryByText(/Da = /i)).toBeNull();
    expect(screen.getByTestId("pfr-recycle-da-chart")).toBeInTheDocument();
  });

  it("renders only the backend-calculated curve without sampled recycle cards", () => {
    render(
      <PfrRecycleDaChart
        points={[
          { recyclingRatio: 0, conversion: 0.8 },
          { recyclingRatio: 0.25, conversion: 0.76 },
          { recyclingRatio: 0.5, conversion: 0.74 },
          { recyclingRatio: 1, conversion: 0.71 },
        ]}
      />,
    );

    expect(screen.queryByTestId("pfr-recycle-profile-point")).toBeNull();
    expect(screen.queryByTestId("pfr-recycle-da-legend")).toBeNull();
  });
});
