import { render, screen } from "@testing-library/react";

import { RegimeRuler, type RegimeRulerModel } from "@/components/viz/regime-ruler";

const rulerModel: RegimeRulerModel = {
  title: "Regime do escoamento",
  description: "Escala linear de Reynolds de 100 a 10.000. O marcador mostra a posição atual.",
  domain: { min: 100, max: 10_000 },
  segments: [
    { regime: "laminar", label: "Laminar", color: "#2563EB", x: 40, width: 151.52 },
    { regime: "transition", label: "Transição", color: "#D97706", x: 191.52, width: 116.77 },
    { regime: "turbulent", label: "Turbulento", color: "#DC2626", x: 308.29, width: 411.71 },
  ],
  ticks: [
    { value: 100, label: "100", x: 40 },
    { value: 2300, label: "2300", x: 191.52 },
    { value: 4000, label: "4000", x: 308.29 },
    { value: 10_000, label: "10000", x: 720 },
  ],
  marker: {
    x: 720,
    label: "Re = 50000",
    status: "acima da escala",
    regime: "turbulent",
    regime_label: "Turbulento",
    color: "#DC2626",
    text_anchor: "end",
  },
};

describe("RegimeRuler", () => {
  it("renders the backend-provided regime ruler without deriving classification", () => {
    render(<RegimeRuler model={rulerModel} />);

    expect(screen.getByRole("heading", { name: /Regime do escoamento/i })).toBeInTheDocument();
    expect(screen.getAllByText("Laminar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Transição").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Turbulento").length).toBeGreaterThan(0);
    expect(screen.getByText(/acima da escala/i)).toBeInTheDocument();
    expect(screen.getByText(/Re = 50000/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Régua do regime do escoamento/i })).toBeInTheDocument();
  });
});
