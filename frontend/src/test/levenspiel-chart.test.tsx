import { render, screen } from "@testing-library/react";

import { LevenspielChart } from "@/components/viz/levenspiel-chart";

function pathContainsPoint(pathData: string | null, x: number, y: number, epsilon = 0.01) {
  if (!pathData) {
    return false;
  }

  const coordinates = Array.from(pathData.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g), (
    match,
  ) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));

  return coordinates.some((point) => Math.abs(point.x - x) <= epsilon && Math.abs(point.y - y) <= epsilon);
}

describe("LevenspielChart", () => {
  it("plots sorted conversion points and the operational markers for CSTR and PFR", () => {
    const { container } = render(
      <LevenspielChart
        points={[
          { conversion: 0.8, cstrVolume: 1.23, pfrVolume: 0.91 },
          { conversion: 0.2, cstrVolume: 0.18, pfrVolume: 0.12 },
          { conversion: 0.5, cstrVolume: 0.62, pfrVolume: 0.41 },
        ]}
        cstrOperatingPoint={{ conversion: 0.8, volume: 1.23 }}
        pfrOperatingPoint={{ conversion: 0.8, volume: 0.91 }}
        maxConversion={0.97}
      />,
    );

    expect(screen.getByText(/Diagrama de Levenspiel/i)).toBeInTheDocument();
    expect(screen.getByText(/X máx = 0,97/i)).toBeInTheDocument();
    expect(screen.getByText(/CSTR operacional/i)).toBeInTheDocument();
    expect(screen.getByText(/PFR operacional/i)).toBeInTheDocument();
    expect(screen.getByText(/V = 1,23 m³/i)).toBeInTheDocument();
    expect(screen.getByText(/V = 0,91 m³/i)).toBeInTheDocument();

    expect(container.querySelectorAll('[data-axis-tick="x"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-axis-tick="y"]').length).toBeGreaterThan(0);
    expect(screen.getByText("Conversão - X")).toBeInTheDocument();
    expect(screen.getByText("Volume - V")).toBeInTheDocument();

    const circles = Array.from(container.querySelectorAll("circle"));
    expect(circles.at(-2)?.getAttribute("fill")).toBe("#2563eb");
    expect(circles.at(-1)?.getAttribute("fill")).toBe("#dc2626");
  });

  it("scales the volume axis to the plotted maximum instead of forcing 1", () => {
    const { container } = render(
      <LevenspielChart
        points={[
          { conversion: 0.2, cstrVolume: 0.08, pfrVolume: 0.05 },
          { conversion: 0.5, cstrVolume: 0.18, pfrVolume: 0.11 },
          { conversion: 0.7, cstrVolume: 0.16, pfrVolume: 0.12 },
        ]}
        cstrOperatingPoint={{ conversion: 0.8, volume: 0.18 }}
        pfrOperatingPoint={{ conversion: 0.8, volume: 0.12 }}
        maxConversion={0.95}
      />,
    );

    const yTicks = Array.from(container.querySelectorAll('text[data-axis-tick="y"]')).map(
      (tick) => tick.textContent,
    );

    expect(yTicks).toContain("0,2");
    expect(yTicks).toHaveLength(5);
    expect(yTicks).not.toContain("1");
  });

  it("connects the generated series points without routing the path through operational markers", () => {
    const { container } = render(
      <LevenspielChart
        points={[
          { conversion: 0.2, cstrVolume: 0.25, pfrVolume: 0.16 },
          { conversion: 0.5, cstrVolume: 1.0, pfrVolume: 0.69 },
          { conversion: 0.7, cstrVolume: 2.33, pfrVolume: 1.22 },
        ]}
        cstrOperatingPoint={{ conversion: 0.8, volume: 4.0 }}
        pfrOperatingPoint={{ conversion: 0.8, volume: 1.61 }}
        maxConversion={0.95}
      />,
    );

    const [cstrPath, pfrPath] = Array.from(container.querySelectorAll("path"));
    const generatedX = 56 + (0.7 / 0.95) * 640;
    const originX = 56;
    const originY = 360 - 42;
    const generatedCstrY = 24 + (360 - 24 - 42) - (2.33 / 4.0) * (360 - 24 - 42);
    const generatedPfrY = 24 + (360 - 24 - 42) - (1.22 / 4.0) * (360 - 24 - 42);
    const markerX = 56 + (0.8 / 0.95) * 640;
    const markerCstrY = 24;
    const markerPfrY = 24 + (360 - 24 - 42) - (1.61 / 4.0) * (360 - 24 - 42);

    expect(container.querySelectorAll('text[data-axis-tick="x"]')).toHaveLength(6);
    expect(container.querySelectorAll('text[data-axis-tick="y"]')).toHaveLength(6);
    expect(pathContainsPoint(cstrPath?.getAttribute("d"), originX, originY)).toBe(true);
    expect(pathContainsPoint(pfrPath?.getAttribute("d"), originX, originY)).toBe(true);
    expect(pathContainsPoint(cstrPath?.getAttribute("d"), generatedX, generatedCstrY)).toBe(true);
    expect(pathContainsPoint(pfrPath?.getAttribute("d"), generatedX, generatedPfrY)).toBe(true);
    expect(pathContainsPoint(cstrPath?.getAttribute("d"), markerX, markerCstrY)).toBe(false);
    expect(pathContainsPoint(pfrPath?.getAttribute("d"), markerX, markerPfrY)).toBe(false);
  });
});
