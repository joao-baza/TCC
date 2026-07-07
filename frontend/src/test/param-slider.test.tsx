import { fireEvent, render, screen } from "@testing-library/react";

import { ParamSlider } from "@/features/exploratory/param-slider";
import type { SliderConfig } from "@/features/exploratory/types";

const config: SliderConfig = {
  id: "sizing-sl-flow",
  field: "flow-rate",
  label: "Vazao",
  unit: "m3/s",
  min: 0.001,
  max: 0.05,
  step: 0.001,
  default: 0.01,
};

describe("ParamSlider", () => {
  it("shows label, value with unit, and limits", () => {
    render(<ParamSlider config={config} value={0.01} onChange={() => {}} />);

    expect(screen.getByText("Vazao")).toBeInTheDocument();
    expect(screen.getByText("0.01 m3/s")).toBeInTheDocument();
    expect(screen.getByText("0.001 m3/s")).toBeInTheDocument();
    expect(screen.getByText("0.05 m3/s")).toBeInTheDocument();
  });

  it("fires onChange with the new numeric value when moved", () => {
    const onChange = vi.fn();

    render(<ParamSlider config={config} value={0.01} onChange={onChange} />);

    fireEvent.change(screen.getByRole("slider"), {
      target: { value: "0.02" },
    });

    expect(onChange).toHaveBeenCalledWith(0.02);
  });
});
