import {
  balanceExploratory,
  flowExploratory,
  pumpExploratory,
  reactorExploratory,
  sizingExploratory,
} from "@/features/exploratory/templates";

describe("templates exploratorios", () => {
  it("sizing has 2 templates with verbatim slider ranges", () => {
    expect(sizingExploratory.module).toBe("sizing");
    expect(sizingExploratory.templates.map((template) => template.key)).toEqual([
      "process-line",
      "suction-line",
    ]);

    const processLine = sizingExploratory.templates[0];
    expect(processLine.fields).toEqual({ "flow-rate": "0.01", velocity: "1.5" });

    const flowSlider = processLine.sliders.find((slider) => slider.field === "flow-rate");
    expect(flowSlider).toMatchObject({
      min: 0.001,
      max: 0.05,
      step: 0.001,
      default: 0.01,
      unit: "m3/s",
    });
    expect(processLine.steps).toHaveLength(4);
    expect(processLine.activity).toMatch(/DN comercial abaixo de 100 mm/i);
  });

  it("flow has 3 templates and carries roughness in meta", () => {
    expect(flowExploratory.templates.map((template) => template.key)).toEqual([
      "water-pvc-dn100",
      "oil-steel-dn80",
      "air-duct-200",
    ]);
    expect(flowExploratory.templates[1].meta?.roughness).toBe(0.045);
  });

  it("reactor mirrors conversion through linkedFields and extraFields", () => {
    const firstOrder = reactorExploratory.templates[0];
    const conversionSlider = firstOrder.sliders.find(
      (slider) => slider.field === "cstr-conversion",
    );

    expect(conversionSlider?.linkedFields).toEqual(["pfr-conversion"]);
    expect(conversionSlider?.extraFields).toEqual(["plot-max-conversion"]);
    expect(reactorExploratory.templates[1].meta?.reactionOrders).toEqual([2, 0]);
  });

  it("pump has 3 sliders in the standard template", () => {
    expect(pumpExploratory.templates[0].sliders).toHaveLength(3);
  });

  it("balance has 2 templates with 2 sliders each", () => {
    expect(balanceExploratory.templates.map((template) => template.key)).toEqual([
      "simple-separation",
      "recycle-system",
    ]);
    expect(balanceExploratory.templates[0].sliders).toHaveLength(2);
  });
});
