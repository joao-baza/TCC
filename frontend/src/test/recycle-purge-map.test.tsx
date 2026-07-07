import { render, screen } from "@testing-library/react";

import { RecyclePurgeMap } from "@/components/viz/recycle-purge-map";

describe("RecyclePurgeMap", () => {
  it("renders a recycle and purge flow map for the configured split", () => {
    const { container } = render(
      <RecyclePurgeMap
        splits={[
          {
            parentStream: "Reactor_Out",
            recycleStream: "Recycle",
            purgeStream: "Purga_Produto",
            fraction: 0.6,
          },
        ]}
      />,
    );

    expect(screen.getByText(/Mapa de reciclo e purga/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Mapa de reciclo e purga/i })).toBeInTheDocument();
    const splitCard = screen.getByText(/Split 1/i).closest("div.rounded-2xl");
    expect(splitCard).not.toBeNull();
    if (!splitCard) {
      return;
    }

    expect(splitCard.querySelector("p.text-base.font-semibold.text-slate-900")?.textContent).toBe(
      "Reactor_Out",
    );
    expect(splitCard.querySelector("svg")).not.toBeNull();
    expect(screen.getByText(/^Recycle$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Purga_Produto$/i)).toBeInTheDocument();
    expect(screen.getByText(/R = 0.60/i)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("shows an empty state when no splits are configured", () => {
    render(<RecyclePurgeMap splits={[]} />);

    expect(screen.getByText(/Nenhum split configurado/i)).toBeInTheDocument();
  });
});
