import { fireEvent, render, screen } from "@testing-library/react";

import { TernaryDiagram } from "@/components/viz/ternary-diagram";

describe("TernaryDiagram", () => {
  it("explains the ternary projection and its extraction purpose", () => {
    const { container } = render(
      <TernaryDiagram
        title="Diagrama ternário"
        subtitle="Projeção normalizada dos 3 componentes."
        componentLabels={["Water", "Ethanol", "Methanol"]}
        boundary={[
          { x: 0.5, y: 0.866 },
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ]}
        guideLines={[
          { start: { x: 0.2, y: 0.2 }, end: { x: 0.5, y: 0.866 } },
          { start: { x: 0.3, y: 0.3 }, end: { x: 0.7, y: 0.3 } },
        ]}
        streams={[
          {
            label: "Corrente 1",
            summary: "A=0,2 | B=0,3 | C=0,5",
            x: 0.42,
            y: 0.28,
            color: "#dc2626",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: /^Diagrama ternário$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Diagrama Ternário/i }));
    expect(
      screen.getByText(
        /O backend normaliza a composição dos três componentes, projeta a corrente no plano ternário/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /A leitura continua igual: cada vértice representa um componente puro, cada lado uma mistura binária/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Water")).toBeInTheDocument();
    expect(screen.getByText("Ethanol")).toBeInTheDocument();
    expect(screen.getByText("Methanol")).toBeInTheDocument();
    expect(
      screen.getByText(/Seader, Henley e Roper, Separation Process Principles/i),
    ).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
