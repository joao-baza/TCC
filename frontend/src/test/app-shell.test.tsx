import { render, screen } from "@testing-library/react";
import { AppShell } from "@/features/shell/app-shell";

describe("AppShell IA", () => {
  it("renders top-level product sections", () => {
    render(<AppShell />);

    expect(screen.getByRole("link", { name: "Início" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Simulações" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trilhas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Recursos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docência" })).toBeInTheDocument();
  });
});
