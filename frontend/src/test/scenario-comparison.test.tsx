import { fireEvent, render, screen } from "@testing-library/react";

import { ScenarioComparison } from "@/features/exploratory/scenario-comparison";
import type { Scenario } from "@/features/exploratory/types";

const scenarios: Scenario[] = [
  { id: "a", name: "Q=0.01 m3/s, v=1.5 m/s", color: "#2563EB" },
  { id: "b", name: "Q=0.02 m3/s, v=2 m/s", color: "#D97706" },
];

describe("ScenarioComparison", () => {
  it("renders scenarios and triggers save/clear", () => {
    const onSave = vi.fn();
    const onClear = vi.fn();

    render(
      <ScenarioComparison scenarios={scenarios} onSave={onSave} onClear={onClear} />,
    );

    expect(screen.getByText("Comparação de cenários")).toBeInTheDocument();
    expect(screen.getByText("Q=0.01 m3/s, v=1.5 m/s")).toBeInTheDocument();
    expect(screen.getByText("Q=0.02 m3/s, v=2 m/s")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Salvar cenário/i }));
    expect(onSave).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Limpar/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
