import { mapFlowExampleToFormInputs } from "@/features/flow/example";

describe("mapFlowExampleToFormInputs", () => {
  it("maps the hydraulic diameter example into the form state", () => {
    const mapped = mapFlowExampleToFormInputs({
      reynolds: {
        characteristic_diameter: 13.843,
        velocity: 3.923,
        density: 0.65688,
        dynamic_viscosity: 0.0000111963,
      },
      friction: {
        method: "SwameeJain",
        roughness_source: "composition",
        composition: "Aço galvanizado",
        diameter_source: "custom",
        custom_diameter: 13.843,
      },
      hydraulic_diameter: {
        shape: "circularCap",
        diameter: 0.125,
        height: 0.08333,
      },
    });

    expect(mapped.hydraulicDiameter).toEqual({
      shape: "circularCap",
      parameters: {
        diameter: "0.125",
        height: "0.08333",
      },
    });
  });
});
