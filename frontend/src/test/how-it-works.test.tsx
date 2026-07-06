import { fireEvent, render, screen } from "@testing-library/react";

import { HowItWorks } from "@/components/how-it-works";

describe("HowItWorks", () => {
  it("renders the accordion title and expands on click", () => {
    render(
      <HowItWorks title="Como funciona - Calculo de Diametro">
        <p>Conteudo</p>
      </HowItWorks>,
    );

    const trigger = screen.getByRole("button", {
      name: "Como funciona - Calculo de Diametro",
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Conteudo")).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Conteudo")).toBeInTheDocument();
  });
});
