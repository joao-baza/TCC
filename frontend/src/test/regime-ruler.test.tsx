import { render, screen } from "@testing-library/react";

import { RegimeRuler } from "@/components/viz/regime-ruler";

describe("RegimeRuler", () => {
  it("classifies Reynolds boundaries and representative flow cases", () => {
    const { rerender } = render(<RegimeRuler reynolds={1000} />);
    expect(screen.getAllByText("Laminar").length).toBeGreaterThan(0);
    expect(screen.getByText(/Re = 1000/i)).toBeInTheDocument();

    rerender(<RegimeRuler reynolds={2299} />);
    expect(screen.getAllByText("Laminar").length).toBeGreaterThan(0);

    rerender(<RegimeRuler reynolds={2300} />);
    expect(screen.getAllByText("Transição").length).toBeGreaterThan(0);

    rerender(<RegimeRuler reynolds={3000} />);
    expect(screen.getAllByText("Transição").length).toBeGreaterThan(0);

    rerender(<RegimeRuler reynolds={3999} />);
    expect(screen.getAllByText("Transição").length).toBeGreaterThan(0);

    rerender(<RegimeRuler reynolds={4000} />);
    expect(screen.getAllByText("Turbulento").length).toBeGreaterThan(0);

    rerender(<RegimeRuler reynolds={50000} />);
    expect(screen.getAllByText("Turbulento").length).toBeGreaterThan(0);
    expect(screen.getByText(/acima da escala/i)).toBeInTheDocument();
    expect(screen.getByText(/Re = 50000/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Régua do regime do escoamento/i })).toBeInTheDocument();
  });
});
