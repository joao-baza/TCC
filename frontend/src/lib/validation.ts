export type ValidationRule = "positive" | "nonneg" | "number";

export function validateNumber(
  rule: ValidationRule,
  raw: string,
  label: string,
): string | null {
  if (raw.trim() === "") {
    return null;
  }

  const value = Number(raw);
  if (Number.isNaN(value)) {
    return `${label} deve ser um numero valido.`;
  }

  if (rule === "positive" && !(value > 0)) {
    return `${label} deve ser um numero positivo (> 0).`;
  }

  if (rule === "nonneg" && !(value >= 0)) {
    return `${label} deve ser >= 0.`;
  }

  return null;
}
