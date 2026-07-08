import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { NumberField } from "@/components/number-field";

function Harness() {
  const [value, setValue] = useState("");

  return (
    <NumberField
      id="flow"
      label="Vazao"
      rule="positive"
      value={value}
      onChange={setValue}
    />
  );
}

function NonNegativeHarness() {
  const [value, setValue] = useState("");

  return (
    <NumberField
      id="recycle-ratio"
      label="Razão de reciclo"
      rule="nonneg"
      value={value}
      onChange={setValue}
    />
  );
}

describe("NumberField", () => {
  it("uses token-based neutral surfaces for the input chrome", () => {
    render(
      <NumberField id="flow-rate" label="Vazao" value="12" onChange={() => undefined} />,
    );

    const input = screen.getByRole("spinbutton", { name: /vazao/i });

    expect(input).toHaveClass("border-border");
    expect(input).toHaveClass("bg-background");
    expect(input).toHaveClass("focus:border-primary");
  });

  it("shows an inline error on blur and clears it on focus", () => {
    render(<Harness />);

    const input = screen.getByLabelText("Vazao");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Vazao deve ser um numero positivo (> 0).",
    );
    expect(input).toHaveAttribute("aria-invalid", "true");

    fireEvent.focus(input);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("accepts zero when the field is configured as non-negative", () => {
    render(<NonNegativeHarness />);

    const input = screen.getByLabelText("Razão de reciclo");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});
