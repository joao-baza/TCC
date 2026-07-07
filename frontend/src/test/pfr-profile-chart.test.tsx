import { fireEvent, render, screen } from "@testing-library/react";

import { PfrProfileChart } from "@/components/viz/pfr-profile-chart";

describe("PfrProfileChart", () => {
  it("renders grid-backed concentration and temperature profiles with descriptive axes", () => {
    const { container } = render(
      <PfrProfileChart
        concentrationSeries={[
          { label: "A", start: 1.2, end: 0.2, color: "#0f766e" },
          { label: "B", start: 0.1, end: 0.8, color: "#b45309" },
        ]}
        temperature={{ inlet: 300, outlet: 365 }}
      />,
    );

    expect(screen.getByText(/Perfis de concentração e temperatura no PFR/i)).toBeInTheDocument();
    expect(screen.getByText(/Concentração por componente/i)).toBeInTheDocument();
    expect(screen.getByText(/Programa térmico/i)).toBeInTheDocument();
    expect(container.querySelectorAll("[data-axis-tick]").length).toBeGreaterThan(10);

    const xLabels = Array.from(container.querySelectorAll('[data-chart-label="x"]')).map(
      (node) => node.textContent,
    );
    const yLabels = Array.from(container.querySelectorAll('[data-chart-label="y"]')).map(
      (node) => node.textContent,
    );

    expect(xLabels).toEqual(
      expect.arrayContaining(["Volume relativo do reator (V/V_total)"]),
    );
    expect(yLabels).toEqual(expect.arrayContaining(["Concentração (mol/L)", "Temperatura (K)"]));
    expect(screen.queryByText(/^C$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^T$/)).not.toBeInTheDocument();
  });

  it("keeps concentration axes non-negative and shows a reactor schematic with sampled values", () => {
    const { container } = render(
      <PfrProfileChart
        concentrationSeries={[
          { label: "A", start: 1.2, end: 0.2, color: "#0f766e" },
          { label: "B", start: 0.1, end: 0.8, color: "#b45309" },
        ]}
        temperature={{ inlet: 300, outlet: 365 }}
      />,
    );

    const concentrationTickTexts = Array.from(
      container.querySelectorAll(
        '[data-testid="pfr-profile-chart"] [data-axis-tick="y"]',
      ),
    ).map((node) => node.textContent ?? "");

    expect(concentrationTickTexts[0]).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Perfis no PFR/i }));

    expect(
      screen.getByText(/ao longo do comprimento do reator/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("pfr-reactor-schematic")).toBeInTheDocument();
    expect(screen.getByText(/^V\/V_total 0 \| T: 300 K$/i)).toBeInTheDocument();
  });
});
