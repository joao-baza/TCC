import { render, screen } from "@testing-library/react";

import { Card, CardHeader } from "@/components/ui/card";

describe("CardHeader", () => {
  it("renders a standardized title, subtitle, and action area", () => {
    render(
      <Card>
        <CardHeader
          title="Cálculos de Reator"
          subtitle="Compare os modelos CSTR e PFR no mesmo fluxo de cálculo."
          action={<button type="button">Carregar exemplo</button>}
        />
      </Card>,
    );

    expect(
      screen.getByRole("heading", { name: /Cálculos de Reator/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Compare os modelos CSTR e PFR no mesmo fluxo de cálculo\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Carregar exemplo/i })).toBeInTheDocument();
  });
});
