import { render, screen } from "@testing-library/react";

import { StreamGraph } from "@/components/viz/stream-graph";

describe("StreamGraph", () => {
  it("renders streams sorted by flow rate with direction and composition summaries", () => {
    render(
      <StreamGraph
        streams={[
          {
            name: "Product",
            direction: "Saída",
            flowRate: 40,
            compositions: { A: 0.1, B: 0.05, C: 0.65, D: 0.2 },
          },
          {
            name: "Fresh_Feed",
            direction: "Entrada",
            flowRate: 100,
            compositions: { A: 0.8, B: 0.2, C: 0, D: 0 },
          },
        ]}
      />,
    );

    expect(screen.getByText(/Gráfico de Correntes/i)).toBeInTheDocument();
    expect(screen.getByText(/Fresh_Feed/i)).toBeInTheDocument();
    expect(screen.getByText(/Product/i)).toBeInTheDocument();
    expect(screen.getByText(/Entrada/i)).toBeInTheDocument();
    expect(screen.getByText(/Saída/i)).toBeInTheDocument();
    expect(screen.getByText(/100 unidades consistentes/i)).toBeInTheDocument();
    expect(screen.getByText(/40 unidades consistentes/i)).toBeInTheDocument();
    expect(screen.getByText(/u\. cons\. = unidades consistentes/i)).toBeInTheDocument();
    expect(screen.getByText(/A: 0,8 · B: 0,2/i)).toBeInTheDocument();
    expect(screen.getByText(/A: 0,1 · B: 0,05/i)).toBeInTheDocument();
  });
});
