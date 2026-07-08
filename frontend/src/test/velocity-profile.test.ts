import { createElement } from "react";
import { render, screen } from "@testing-library/react";

import {
  VelocityProfileChart,
  type VelocityProfileModel,
} from "@/components/viz/velocity-profile";

const profileModel: VelocityProfileModel = {
  title: "Perfil de Velocidade - Duto Circular",
  regime: "turbulent",
  color: "#DC2626",
  label: "Turbulento",
  reynolds: 189000,
  diameter_mm: 126,
  velocity: 1.5,
  arrows: [
    { x1: 55, y1: 22, x2: 275, y2: 22, tip: "275,22" },
    { x1: 55, y1: 70, x2: 315, y2: 70, tip: "315,70" },
  ],
};

describe("VelocityProfileChart", () => {
  it("renders the backend-owned velocity profile model", () => {
    render(createElement(VelocityProfileChart, { model: profileModel }));

    expect(screen.getByText("Perfil de Velocidade - Duto Circular")).toBeInTheDocument();
    expect(screen.getByText(/Turbulento - Re/i)).toBeInTheDocument();
    expect(screen.getByText(/D = 126 mm - V = 1,5 m\/s/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Perfil de velocidade Turbulento/i })).toBeInTheDocument();
  });
});
