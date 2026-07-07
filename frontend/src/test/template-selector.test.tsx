import { fireEvent, render, screen } from "@testing-library/react";

import { sizingExploratory } from "@/features/exploratory/templates";
import { TemplateSelector } from "@/features/exploratory/template-selector";

describe("TemplateSelector", () => {
  it("filters templates by name and emits the selected key", () => {
    const onSelect = vi.fn();

    render(
      <TemplateSelector
        templates={sizingExploratory.templates}
        activeKey={null}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByRole("combobox", { name: /Modo Exploratório/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "suc" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("suction-line");
  });
});
