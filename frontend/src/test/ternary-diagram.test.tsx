import { fireEvent, render, screen } from "@testing-library/react";

import { TernaryDiagram } from "@/components/viz/ternary-diagram";

describe("TernaryDiagram", () => {
  it("explains the ternary projection and its extraction purpose", () => {
    const { container } = render(
      <TernaryDiagram
        components={["A", "B", "C"]}
        streams={[
          {
            name: "Corrente 1",
            direction: "alimentação",
            compositions: { A: 0.2, B: 0.3, C: 0.5 },
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: /^Diagrama ternário$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - Diagrama Ternário/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona - Diagrama Ternário/i }));
    expect(screen.getByText(/Cada vértice corresponde a um componente puro/i)).toBeInTheDocument();
    expect(screen.getByText(/O que você pode extrair daqui/i)).toBeInTheDocument();
    expect(screen.getByText(/Qual componente domina a mistura/i)).toBeInTheDocument();
    expect(screen.getByText(/Seader, Henley e Roper/i)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
