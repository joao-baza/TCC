import { render, screen } from "@testing-library/react";

import { ProcessSankey } from "@/components/viz/process-sankey";

describe("ProcessSankey", () => {
  it("renders a process sankey with inputs and outputs", () => {
    const { container } = render(
      <ProcessSankey
        streams={[
          {
            name: "Fresh Feed",
            direction: "Entrada",
            flowRate: 100,
            compositions: { A: 0.8, B: 0.2 },
          },
          {
            name: "Recycle",
            direction: "Entrada",
            flowRate: 60,
            compositions: { A: 0.18, B: 0.82 },
          },
          {
            name: "Product",
            direction: "Saída",
            flowRate: 40,
            compositions: { A: 0.1, B: 0.9 },
          },
        ]}
      />,
    );

    expect(screen.getByText(/Sankey de massa e energia/i)).toBeInTheDocument();
    expect(screen.getByText(/Processo/i)).toBeInTheDocument();
    expect(screen.getByText(/Fresh Feed/i)).toBeInTheDocument();
    expect(screen.getByText(/Recycle/i)).toBeInTheDocument();
    expect(screen.getByText(/Product/i)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
