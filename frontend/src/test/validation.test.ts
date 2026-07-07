import { validateNumber } from "@/lib/validation";

describe("validateNumber", () => {
  it("accepts empty values because required validation is separate", () => {
    expect(validateNumber("positive", "", "Vazao")).toBeNull();
  });

  it("rejects zero and negative values for positive fields", () => {
    expect(validateNumber("positive", "0", "Vazao")).toBe(
      "Vazao deve ser um numero positivo (> 0).",
    );
    expect(validateNumber("positive", "5", "Vazao")).toBeNull();
  });

  it("accepts zero but rejects negative values for non-negative fields", () => {
    expect(validateNumber("nonneg", "0", "Cota")).toBeNull();
    expect(validateNumber("nonneg", "-1", "Cota")).toBe("Cota deve ser >= 0.");
  });

  it("rejects non-numeric values", () => {
    expect(validateNumber("number", "abc", "X")).toBe("X deve ser um numero valido.");
  });
});
