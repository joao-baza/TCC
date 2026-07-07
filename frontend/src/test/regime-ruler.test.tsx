import { render, screen } from "@testing-library/react";

import { RegimeRuler } from "@/components/viz/regime-ruler";

describe("RegimeRuler", () => {
  it("classifies Reynolds boundaries and representative flow cases", () => {
    const { rerender } = render(<RegimeRuler reynolds={1000} />);
    expect(screen.getByText("Laminar")).toBeInTheDocument();

    rerender(<RegimeRuler reynolds={2299} />);
    expect(screen.getByText("Laminar")).toBeInTheDocument();

    rerender(<RegimeRuler reynolds={2300} />);
    expect(screen.getByText("Transição")).toBeInTheDocument();

    rerender(<RegimeRuler reynolds={3000} />);
    expect(screen.getByText("Transição")).toBeInTheDocument();

    rerender(<RegimeRuler reynolds={3999} />);
    expect(screen.getByText("Transição")).toBeInTheDocument();

    rerender(<RegimeRuler reynolds={4000} />);
    expect(screen.getByText("Turbulento")).toBeInTheDocument();
    expect(screen.getByText("Turbulento >= 4000")).toBeInTheDocument();

    rerender(<RegimeRuler reynolds={50000} />);
    expect(screen.getByText("Turbulento")).toBeInTheDocument();
  });
});
