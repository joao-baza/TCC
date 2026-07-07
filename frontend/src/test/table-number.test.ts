import { formatTableNumber, formatTableNumberText } from "@/lib/table-number";

describe("table-number", () => {
  it("preserves zero", () => {
    expect(formatTableNumber(0)).toBe("\\text{0}");
    expect(formatTableNumber(-0)).toBe("\\text{0}");
  });

  it("formats small values with scientific notation and a capped mantissa", () => {
    expect(formatTableNumber(0.00008949025483876957)).toBe("\\text{8,94903} \\times 10^{-5}");
    expect(formatTableNumber(-0.00008949025483876957)).toBe("\\text{-8,94903} \\times 10^{-5}");
  });

  it("formats large values with scientific notation", () => {
    expect(formatTableNumber(100000)).toBe("\\text{1} \\times 10^{5}");
    expect(formatTableNumber(1234567)).toBe("\\text{1,23457} \\times 10^{6}");
  });

  it("keeps ordinary table values in fixed-point format", () => {
    expect(formatTableNumber(126.16)).toBe("\\text{126,16}");
    expect(formatTableNumber(0.0001)).toBe("\\text{1} \\times 10^{-4}");
    expect(formatTableNumber(99999.99)).toBe("\\text{99999,99}");
  });

  it("formats plain text values with comma decimals and scientific notation", () => {
    expect(formatTableNumberText(126.16)).toBe("126,16");
    expect(formatTableNumberText(0.00008949025483876957)).toBe("8,94903 × 10^-5");
    expect(formatTableNumberText(1234567)).toBe("1,23457 × 10^6");
  });
});
