import { describe, expect, it } from "vitest";

import { mapPipingExampleToFormInputs } from "@/features/piping/example";

describe("mapPipingExampleToFormInputs", () => {
  it("maps the piping worked example into the form state", () => {
    const mapped = mapPipingExampleToFormInputs({
      composition: "Aço comercial",
      schedule: "SCH40",
      diameter: 25,
      fitting: "Cotovelo 90° raio longo",
    });

    expect(mapped).toEqual({
      composition: "Aço comercial",
      schedule: "SCH40",
      diameter: "25",
      fitting: "Cotovelo 90° raio longo",
    });
  });
});
