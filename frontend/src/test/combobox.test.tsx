import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

function ComboboxHarness({ options }: { options: ComboboxOption[] }) {
  const [value, setValue] = useState("");

  return (
    <Combobox
      label="Fluido"
      placeholder="Selecione um fluido"
      options={options}
      value={value}
      onValueChange={setValue}
    />
  );
}

describe("Combobox", () => {
  it("uses token-based neutral surfaces for the field and popover", () => {
    render(
      <ComboboxHarness
        options={[
          { value: "water", label: "Water" },
          { value: "ethanol", label: "Ethanol" },
        ]}
      />,
    );

    const input = screen.getByRole("combobox", { name: /fluido/i });
    fireEvent.focus(input);

    expect(input).toHaveClass("border-border");
    expect(input).toHaveClass("bg-background");
    expect(screen.getByRole("listbox")).toHaveClass("border-border");
    expect(screen.getByRole("listbox")).toHaveClass("bg-background");
  });

  it("filters options and selects a match", () => {
    render(
      <ComboboxHarness
        options={[
          { value: "water", label: "Water" },
          { value: "ethanol", label: "Ethanol" },
          { value: "propane", label: "Propane" },
        ]}
      />,
    );

    const input = screen.getByRole("combobox", { name: /fluido/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "eth" } });

    expect(screen.getByRole("option", { name: "Ethanol" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Water" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Ethanol" }));

    expect(input).toHaveValue("Ethanol");
  });

  it("selects a filtered option with Enter", () => {
    render(
      <ComboboxHarness
        options={[
          { value: "water", label: "Water" },
          { value: "ethanol", label: "Ethanol" },
          { value: "propane", label: "Propane" },
        ]}
      />,
    );

    const input = screen.getByRole("combobox", { name: /fluido/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "eth" } });

    expect(screen.getByRole("option", { name: "Ethanol" })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(input).toHaveValue("Ethanol");
  });
});
