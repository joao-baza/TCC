import { render, screen } from "@testing-library/react";
import { AppShell } from "@/features/shell/app-shell";

describe("AppShell", () => {
  it("exposes the main navigation landmark for the new IA", () => {
    render(<AppShell />);

    expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument();
  });

  it("wires the new IA destinations into navigation links", () => {
    render(<AppShell />);

    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "#home-content");
    expect(screen.getByRole("link", { name: "Simulações" })).toHaveAttribute(
      "href",
      "#simulations-content"
    );
    expect(screen.getByRole("link", { name: "Trilhas" })).toHaveAttribute("href", "#trails-content");
    expect(screen.getByRole("link", { name: "Recursos" })).toHaveAttribute(
      "href",
      "#resources-content"
    );
    expect(screen.getByRole("link", { name: "Docência" })).toHaveAttribute(
      "href",
      "#teaching-content"
    );
  });
});
