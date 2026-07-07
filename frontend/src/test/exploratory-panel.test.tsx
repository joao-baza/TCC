import { fireEvent, render, screen } from "@testing-library/react";

import { ExploratoryPanel } from "@/features/exploratory/exploratory-panel";
import { sizingExploratory } from "@/features/exploratory/templates";

describe("ExploratoryPanel", () => {
  it("starts with only the selector; after choosing a template it shows sliders, steps, and scenarios", () => {
    const state = {
      applyFields: vi.fn(),
      changeField: vi.fn(),
      describeScenario: vi.fn(() => "Q=0.01 m3/s, v=1.5 m/s"),
    };

    render(<ExploratoryPanel config={sizingExploratory} state={state} />);

    expect(screen.getByLabelText(/Modo Exploratório/i)).toBeInTheDocument();
    expect(screen.queryByText("Roteiro de exploração")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Modo Exploratório/i), {
      target: { value: "process-line" },
    });

    expect(state.applyFields).toHaveBeenCalledWith({
      "flow-rate": "0.01",
      velocity: "1.5",
    });
    expect(screen.getByText("Roteiro de exploração")).toBeInTheDocument();
    expect(screen.getByText("Vazao")).toBeInTheDocument();
    expect(screen.getByText("Comparação de cenários")).toBeInTheDocument();
  });
});
