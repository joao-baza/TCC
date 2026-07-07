const UNIT_ABBREVIATIONS: Record<string, string> = {
  millimeter: "mm",
  millimeters: "mm",
  meter: "m",
  meters: "m",
  kilogram: "kg",
  kilograms: "kg",
  mole: "mol",
  moles: "mol",
  second: "s",
  seconds: "s",
  "meter ** 3 / second": "m³/s",
  "cubic meter / second": "m³/s",
  "meter / second": "m/s",
  pascal: "Pa",
  kelvin: "K",
  dimensionless: "",
};

const UNIT_LATEX_SYMBOLS: Record<string, string> = {
  millimeter: "mm",
  millimeters: "mm",
  meter: "m",
  meters: "m",
  kilogram: "kg",
  kilograms: "kg",
  mole: "mol",
  moles: "mol",
  second: "s",
  seconds: "s",
  pascal: "Pa",
  kelvin: "K",
};

export function abbreviateUnit(units: string): string {
  return UNIT_ABBREVIATIONS[units] ?? units;
}

function normalizeExponent(exponent: string) {
  const trimmed = exponent.trim();
  return trimmed.match(/^-?\d+$/) ? trimmed : "1";
}

export function formatUnitLatex(units?: string | null): string | null {
  if (!units) {
    return null;
  }

  const trimmed = units.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed === "dimensionless") {
    return "-";
  }

  const tokens = trimmed.split(/\s+/);
  const parts: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === "**") {
      if (parts.length > 0) {
        const exponent = normalizeExponent(tokens[index + 1] ?? "1");
        parts[parts.length - 1] = `${parts[parts.length - 1]}^{${exponent}}`;
        index += 1;
      }
      continue;
    }

    if (token === "*") {
      parts.push("\\cdot");
      continue;
    }

    if (token === "/") {
      parts.push("/");
      continue;
    }

    parts.push(UNIT_LATEX_SYMBOLS[token] ?? token);
  }

  return `\\mathrm{${parts.join(" ")}}`;
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(value);
}

export function formatQuantity(value: number, units?: string, digits = 2): string {
  const formattedValue = formatNumber(value, digits);
  const abbreviatedUnit = units ? abbreviateUnit(units) : "";
  return abbreviatedUnit ? `${formattedValue} ${abbreviatedUnit}` : formattedValue;
}
