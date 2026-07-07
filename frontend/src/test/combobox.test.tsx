import { useState } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

function ComboboxHarness({
  options,
  initialValue = "",
}: {
  options: ComboboxOption[];
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);

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

function SwitchingComboboxHarness({ options }: { options: ComboboxOption[] }) {
  const [value, setValue] = useState("water");

  return (
    <div>
      <button type="button" onClick={() => setValue("propane")}>
        Trocar
      </button>
      <Combobox
        label="Fluido"
        placeholder="Selecione um fluido"
        options={options}
        value={value}
        onValueChange={setValue}
      />
    </div>
  );
}

function ControlledComboboxHarness({
  options,
  value,
}: {
  options: ComboboxOption[];
  value: string;
}) {
  return (
    <Combobox
      label="Fluido"
      placeholder="Selecione um fluido"
      options={options}
      value={value}
      onValueChange={() => {}}
    />
  );
}

describe("Combobox", () => {
  it("shows the selected label on the first render", () => {
    render(
      <ComboboxHarness
        initialValue="ethanol"
        options={[
          { value: "water", label: "Water" },
          { value: "ethanol", label: "Ethanol" },
        ]}
      />,
    );

    expect(screen.getByRole("combobox", { name: /fluido/i })).toHaveValue("Ethanol");
  });

  it("syncs the input when the parent changes the selected value", () => {
    const { rerender } = render(
      <ControlledComboboxHarness
        options={[
          { value: "water", label: "Water" },
          { value: "ethanol", label: "Ethanol" },
          { value: "propane", label: "Propane" },
        ]}
        value="water"
      />,
    );

    const input = screen.getByRole("combobox", { name: /fluido/i });

    expect(input).toHaveValue("Water");

    rerender(
      <ControlledComboboxHarness
        options={[
          { value: "water", label: "Water" },
          { value: "ethanol", label: "Ethanol" },
          { value: "propane", label: "Propane" },
        ]}
        value="propane"
      />,
    );

    expect(input).toHaveValue("Propane");
  });

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

  it("filters options and selects a match", async () => {
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
    fireEvent.input(input, { target: { value: "e" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Ethanol" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Water" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("option", { name: "Ethanol" }));

    expect(input).toHaveValue("Ethanol");
  });

  it("selects the first filtered option after keyboard navigation and Enter", async () => {
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
    fireEvent.input(input, { target: { value: "e" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Ethanol" })).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(input).toHaveValue("Water");
    });
  });

  it("shows all options when opening a combobox with an existing selection", () => {
    render(
      <ComboboxHarness
        initialValue="ethanol"
        options={[
          { value: "water", label: "Water" },
          { value: "ethanol", label: "Ethanol" },
          { value: "propane", label: "Propane" },
        ]}
      />,
    );

    const input = screen.getByRole("combobox", { name: /fluido/i });
    fireEvent.focus(input);

    expect(screen.getByRole("option", { name: "Water" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ethanol" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Propane" })).toBeInTheDocument();
  });

  it("does not auto-open on mount when a value is already selected", async () => {
    render(
      <ComboboxHarness
        initialValue="ethanol"
        options={[
          { value: "water", label: "Water" },
          { value: "ethanol", label: "Ethanol" },
          { value: "propane", label: "Propane" },
        ]}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });
});
