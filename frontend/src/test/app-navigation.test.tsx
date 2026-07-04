import { render, screen } from "@testing-library/react";
import { AppShell } from "@/features/shell/app-shell";

describe("AppShell", () => {
  it("exposes the main navigation landmark for the new IA", () => {
    render(<AppShell />);

    expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument();
  });

  it("wires the new IA destinations into navigation links", () => {
    render(<AppShell />);

    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "#home");
    expect(screen.getByRole("link", { name: "Simulações" })).toHaveAttribute("href", "#simulations");
    expect(screen.getByRole("link", { name: "Trilhas" })).toHaveAttribute("href", "#trails");
    expect(screen.getByRole("link", { name: "Recursos" })).toHaveAttribute("href", "#resources");
    expect(screen.getByRole("link", { name: "Docência" })).toHaveAttribute("href", "#teaching");
  });

  it("exposes the simulation modules under secondary grouped navigation", () => {
    render(<AppShell />);

    expect(screen.getByText("Hidráulica & Escoamento")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tubulações" })).toHaveAttribute("href", "#piping");
    expect(screen.getByRole("link", { name: "Dimensionamento" })).toHaveAttribute(
      "href",
      "#sizing"
    );
    expect(screen.getByRole("link", { name: "Escoamento" })).toHaveAttribute("href", "#flow");
    expect(screen.getByRole("link", { name: "Glossário" })).toHaveAttribute("href", "#glossary");
  });
});
