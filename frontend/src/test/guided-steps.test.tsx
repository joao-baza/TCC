import { fireEvent, render, screen } from "@testing-library/react";

import { GuidedSteps } from "@/features/exploratory/guided-steps";
import { sizingExploratory } from "@/features/exploratory/templates";

const template = sizingExploratory.templates[0];

describe("GuidedSteps", () => {
  it("renders the 4 numbered steps and the activity", () => {
    render(<GuidedSteps steps={template.steps} activity={template.activity} />);

    expect(screen.getByText("Roteiro de exploração")).toBeInTheDocument();
    expect(screen.getByText("Atividade")).toBeInTheDocument();
    expect(screen.getByText(/Observe o diametro teorico calculado/i)).toBeInTheDocument();
    expect(screen.getByText(/maior vazao que ainda permite um DN comercial/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Passo \d/i })).toHaveLength(4);
  });

  it("collapses and expands a step when its header is clicked", () => {
    render(<GuidedSteps steps={template.steps} activity={template.activity} />);

    const firstHeader = screen.getByRole("button", { name: /Passo 1/i });

    expect(screen.getByText(/Observe o diametro teorico calculado/i)).toBeVisible();

    fireEvent.click(firstHeader);
    expect(screen.queryByText(/Observe o diametro teorico calculado/i)).not.toBeInTheDocument();

    fireEvent.click(firstHeader);
    expect(screen.getByText(/Observe o diametro teorico calculado/i)).toBeInTheDocument();
  });
});
