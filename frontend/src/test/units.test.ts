import { abbreviateUnit, formatNumber, formatQuantity } from "@/lib/units";

describe("units", () => {
  it("abbreviates known units", () => {
    expect(abbreviateUnit("millimeter")).toBe("mm");
    expect(abbreviateUnit("meter")).toBe("m");
    expect(abbreviateUnit("desconhecida")).toBe("desconhecida");
  });

  it("formats numbers and quantities with pt-BR decimals and at most two places", () => {
    expect(formatNumber(126.16)).toBe("126,16");
    expect(formatNumber(9.600000000000001)).toBe("9,6");
    expect(formatQuantity(126.16, "millimeter")).toBe("126,16 mm");
    expect(formatQuantity(150, "millimeter")).toBe("150 mm");
    expect(formatQuantity(150)).toBe("150");
  });
});
