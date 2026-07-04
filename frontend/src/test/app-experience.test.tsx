import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppExperience } from "@/features/shell/app-experience";

describe("AppExperience", () => {
  it("starts from home and reaches the simulations hub through the new primary CTA", async () => {
    const user = userEvent.setup();
    render(<AppExperience />);

    await user.click(screen.getByRole("button", { name: "Iniciar uma simulação" }));

    expect(
      await screen.findByRole("heading", { name: "Simulações em Destaque" })
    ).toBeInTheDocument();
  });

  it("surfaces the highlighted flow entry from the simulations hub", async () => {
    const user = userEvent.setup();
    render(<AppExperience />);

    await user.click(screen.getByRole("button", { name: "Iniciar uma simulação" }));

    expect(
      await screen.findByRole("heading", { name: "Simulações em Destaque" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Abrir módulo de Escoamento" })
    ).toBeInTheDocument();
  });
});
