import { render, screen } from "@testing-library/react";

import { HydraulicDiameterPreview } from "@/components/viz/hydraulic-diameter-preview";

describe("HydraulicDiameterPreview", () => {
  function getNumericAttr(node: Element | null | undefined, name: string) {
    if (!node) {
      return null;
    }

    const value = node?.getAttribute(name);
    return value == null ? null : Number(value);
  }

  it("renders the triangular preview with the apex on top and edge-aligned labels", () => {
    const { container } = render(
      <HydraulicDiameterPreview
        shape="triangular"
        parameters={{ side_a: "0.1", side_b: "0.1", side_c: "0.1" }}
      />,
    );

    const previewSvg = screen.getByRole("img", { name: /Seção triangular/i });
    const polygon = previewSvg.querySelector("polygon[fill=\"#0F5E9C\"]");
    expect(polygon).not.toBeNull();

    const points = polygon?.getAttribute("points")?.trim().split(/\s+/).map((point) => {
      const [x, y] = point.split(",").map(Number);
      return { x, y };
    });

    expect(points).toHaveLength(3);
    const apexY = Math.min(...(points ?? []).map((point) => point.y));
    expect(apexY).toBeLessThan((points?.[0].y ?? Number.POSITIVE_INFINITY) + 1);
    expect(apexY).toBeLessThan((points?.[1].y ?? Number.POSITIVE_INFINITY) + 1);
    expect(apexY).toBeLessThan((points?.[2].y ?? Number.POSITIVE_INFINITY) + 1);

    const labels = Array.from(container.querySelectorAll("text")).map((node) => ({
      text: node.textContent,
      transform: node.getAttribute("transform"),
    }));

    expect(labels.find((item) => item.text === "a")?.transform).toMatch(/rotate\(/);
    expect(labels.find((item) => item.text === "b")?.transform).toMatch(/rotate\(/);
    expect(labels.find((item) => item.text === "c")?.transform).toMatch(/rotate\(/);
  });

  it("keeps the circular radius guide and label closer to the circle boundary", () => {
    render(<HydraulicDiameterPreview shape="circular" parameters={{ diameter: "0.1" }} />);

    const previewSvg = screen.getByRole("img", { name: /Seção circular/i });
    const radiusLine = Array.from(previewSvg.querySelectorAll("line")).find(
      (line) => line.getAttribute("x1") === "160" && line.getAttribute("y1") === "92",
    );
    const radiusLabel = Array.from(previewSvg.querySelectorAll("text")).find((node) => node.textContent === "R");

    expect(getNumericAttr(radiusLine, "x2")).toBeCloseTo(216.2, 1);
    expect(getNumericAttr(radiusLabel, "x")).toBeCloseTo(218.2, 1);
    expect((getNumericAttr(radiusLabel, "x") ?? 0) - (getNumericAttr(radiusLine, "x2") ?? 0)).toBeGreaterThan(0);
    expect((getNumericAttr(radiusLabel, "x") ?? 0) - (getNumericAttr(radiusLine, "x2") ?? 0)).toBeLessThan(5);
  });

  it("renders a fully filled circular cap when the fluid height reaches the diameter", () => {
    const { container } = render(<HydraulicDiameterPreview shape="circularCap" parameters={{ diameter: "0.1", height: "0.1" }} />);

    const previewSvg = screen.getByRole("img", { name: /Canal circular/i });
    const radiusLine = Array.from(previewSvg.querySelectorAll("line")).find(
      (line) => line.getAttribute("x1") === "160" && line.getAttribute("y1") === "96",
    );
    const radiusLabel = Array.from(previewSvg.querySelectorAll("text")).find((node) => node.textContent === "R");

    expect(previewSvg.querySelector("circle[fill=\"#0F5E9C\"]")).not.toBeNull();
    expect(container.querySelector("path[fill=\"#0F5E9C\"]")).toBeNull();
    expect(getNumericAttr(radiusLine, "x2")).toBeCloseTo(216.2, 1);
    expect(getNumericAttr(radiusLabel, "x")).toBeCloseTo(218.2, 1);
  });
});
