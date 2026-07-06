import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import { MultiCombobox, type MultiComboboxOption } from "@/components/ui/multi-combobox";

function MultiComboboxHarness({ options }: { options: MultiComboboxOption[] }) {
  const [value, setValue] = useState<string[]>([]);

  return (
    <MultiCombobox
      label="Propriedades do fluido"
      options={options}
      value={value}
      onValueChange={setValue}
      placeholder="Selecione propriedades"
    />
  );
}

describe("MultiCombobox", () => {
  it("adds chips and removes one chip", () => {
    render(
      <MultiComboboxHarness
        options={[
          { value: "D", label: "Density" },
          { value: "V", label: "Viscosity" },
          { value: "Z", label: "Compressibility factor" },
        ]}
      />,
    );

    const input = screen.getByRole("combobox", { name: /propriedades do fluido/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "den" } });
    fireEvent.click(screen.getByRole("option", { name: "Density" }));

    expect(screen.getByRole("button", { name: /remover density/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remover density/i }));

    expect(screen.queryByRole("button", { name: /remover density/i })).not.toBeInTheDocument();
  });
});
