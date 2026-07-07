import { render, screen } from "@testing-library/react";

import { NumberField } from "@/components/number-field";
import { Combobox } from "@/components/ui/combobox";

describe("theme surfaces", () => {
  it("uses token-based neutral surfaces for inputs", () => {
    render(<NumberField id="flow-rate" label="Vazao" value="12" onChange={() => undefined} />);

    const input = screen.getByRole("spinbutton", { name: /vazao/i });

    expect(input).toHaveClass("border-border");
    expect(input).toHaveClass("bg-background");
    expect(input).toHaveClass("focus:border-primary");
  });

  it("renders combobox fields with the neutral palette", () => {
    render(
      <Combobox
        label="Componente"
        options={[{ value: "a", label: "A" }]}
        value="a"
        onValueChange={() => undefined}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveClass("border-border");
    expect(screen.getByRole("combobox")).toHaveClass("bg-background");
  });
});
