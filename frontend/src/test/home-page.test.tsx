import { render, screen } from "@testing-library/react";
import { HomePage } from "@/features/shell/home-page";

describe("HomePage IA", () => {
  it("prioritizes the two primary entry actions", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("button", { name: "Iniciar uma simulação" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Seguir uma trilha" })
    ).toBeInTheDocument();
  });

  it("surfaces docência and recursos blocks", () => {
    render(<HomePage />);

    expect(screen.getByText("Recursos de Apoio")).toBeInTheDocument();
    expect(screen.getByText("Para Docência")).toBeInTheDocument();
  });
});
