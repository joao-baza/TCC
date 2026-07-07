import { describe, expect, it } from "vitest";

import { mapSizingExampleToFormInputs } from "@/features/sizing/example";

describe("mapSizingExampleToFormInputs", () => {
  it("maps the sizing worked example into the form state", () => {
    const mapped = mapSizingExampleToFormInputs({
      calculated_diameter: {
        flow_rate: 0.0166667,
        velocity: 1.5,
      },
      real_diameter: {
        calculated_diameter: 126.16,
        schedule: "SCH40",
      },
    });

    expect(mapped).toEqual({
      flowRate: "0.0166667",
      velocity: "1.5",
      calculatedDiameterInput: "126.16",
      schedule: "SCH40",
    });
  });
});
