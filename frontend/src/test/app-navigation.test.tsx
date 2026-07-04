import { render, screen } from "@testing-library/react";
import { AppShell } from "@/features/shell/app-shell";

describe("AppShell", () => {
  it("exposes the new top-level product sections", () => {
    render(<AppShell />);

    expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Início" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Simulações" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trilhas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Recursos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docência" })).toBeInTheDocument();
  });

  it("marks Início as the current route entry by default", () => {
    render(<AppShell />);

    expect(screen.getByRole("link", { current: "page", name: "Início" })).toBeInTheDocument();
  });
});
