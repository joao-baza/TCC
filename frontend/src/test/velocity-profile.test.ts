import { createElement } from "react";
import { render, screen } from "@testing-library/react";

import {
  VelocityProfileChart,
  type VelocityProfileModel,
} from "@/components/viz/velocity-profile";

function buildProfileModel(
  regime: VelocityProfileModel["regime"],
): VelocityProfileModel {
  const metadata = {
    laminar: { color: "#2563EB", label: "Laminar", reynolds: 1_000 },
    transition: { color: "#D97706", label: "Transição", reynolds: 3_000 },
    turbulent: { color: "#DC2626", label: "Turbulento", reynolds: 189_000 },
  }[regime];

  return {
    title: "Perfil de Velocidade - Duto Circular",
    regime,
    ...metadata,
    diameter_mm: 126,
    velocity: 1.5,
    arrows: Array.from({ length: 9 }, (_, index) => ({
      x1: 55,
      y1: 25 + index * 11,
      x2: 180 + index * 10,
      y2: 25 + index * 11,
      tip: `${180 + index * 10},${25 + index * 11}`,
    })),
  };
}

describe("VelocityProfileChart", () => {
  it("renders the backend-owned velocity profile model", () => {
    render(createElement(VelocityProfileChart, { model: buildProfileModel("turbulent") }));

    expect(screen.getByText("Perfil de Velocidade - Duto Circular")).toBeInTheDocument();
    expect(screen.getByText(/Turbulento - Re/i)).toBeInTheDocument();
    expect(screen.getByText(/D = 126 mm - V = 1,5 m\/s/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Perfil de velocidade Turbulento/i })).toBeInTheDocument();
  });

  it("keeps straight backend-owned vectors for laminar flow", () => {
    const { container } = render(
      createElement(VelocityProfileChart, { model: buildProfileModel("laminar") }),
    );

    expect(container.querySelectorAll('[data-regime-flow="laminar-vector"]')).toHaveLength(9);
    expect(container.querySelector('[data-regime-flow="transition-streamline"]')).toBeNull();
    expect(container.querySelector('[data-regime-flow="turbulent-streamline"]')).toBeNull();
  });

  it("renders strongly undulating streamlines for transition flow", () => {
    const { container } = render(
      createElement(VelocityProfileChart, { model: buildProfileModel("transition") }),
    );

    expect(container.querySelectorAll('[data-regime-flow="transition-streamline"]')).toHaveLength(3);
    expect(container.querySelector('[data-regime-flow="laminar-vector"]')).toBeNull();
    expect(container.querySelector('[data-regime-flow="turbulent-streamline"]')).toBeNull();
  });

  it("renders nearly random streamlines with eddies for turbulent flow", () => {
    const { container } = render(
      createElement(VelocityProfileChart, { model: buildProfileModel("turbulent") }),
    );

    expect(container.querySelectorAll('[data-regime-flow="turbulent-streamline"]')).toHaveLength(5);
    expect(container.querySelector('[data-regime-flow="laminar-vector"]')).toBeNull();
    expect(container.querySelector('[data-regime-flow="transition-streamline"]')).toBeNull();
  });
});
