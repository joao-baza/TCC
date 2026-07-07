import { formatNumber } from "@/lib/units";

const SCIENTIFIC_LOWER_BOUND = 1e-3;
const SCIENTIFIC_UPPER_BOUND = 1e5;
const SCIENTIFIC_MANTISSA_DIGITS = 5;

function formatScientificNumber(value: number) {
  if (Object.is(value, -0) || value === 0) {
    return "\\text{0}";
  }

  const absoluteValue = Math.abs(value);
  let exponent = Math.floor(Math.log10(absoluteValue));
  let mantissa = absoluteValue / 10 ** exponent;

  mantissa = Number(mantissa.toFixed(SCIENTIFIC_MANTISSA_DIGITS));

  if (mantissa >= 10) {
    mantissa /= 10;
    exponent += 1;
  }

  const formattedMantissa = formatNumber(mantissa, SCIENTIFIC_MANTISSA_DIGITS);
  const signedMantissa = value < 0 ? `-${formattedMantissa}` : formattedMantissa;

  return `\\text{${signedMantissa}} \\times 10^{${exponent}}`;
}

function formatScientificNumberText(value: number) {
  if (Object.is(value, -0) || value === 0) {
    return "0";
  }

  const absoluteValue = Math.abs(value);
  let exponent = Math.floor(Math.log10(absoluteValue));
  let mantissa = absoluteValue / 10 ** exponent;

  mantissa = Number(mantissa.toFixed(SCIENTIFIC_MANTISSA_DIGITS));

  if (mantissa >= 10) {
    mantissa /= 10;
    exponent += 1;
  }

  const formattedMantissa = formatNumber(mantissa, SCIENTIFIC_MANTISSA_DIGITS);
  const signedMantissa = value < 0 ? `-${formattedMantissa}` : formattedMantissa;

  return `${signedMantissa} × 10^${exponent}`;
}

export function formatTableNumber(value: number) {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  if (Object.is(value, -0) || value === 0) {
    return "\\text{0}";
  }

  const absoluteValue = Math.abs(value);
  const shouldUseScientificNotation =
    absoluteValue > 0 &&
    (absoluteValue < SCIENTIFIC_LOWER_BOUND || absoluteValue >= SCIENTIFIC_UPPER_BOUND);

  if (shouldUseScientificNotation) {
    return formatScientificNumber(value);
  }

  return `\\text{${formatNumber(value, SCIENTIFIC_MANTISSA_DIGITS)}}`;
}

export function formatTableNumberText(value: number) {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  if (Object.is(value, -0) || value === 0) {
    return "0";
  }

  const absoluteValue = Math.abs(value);
  const shouldUseScientificNotation =
    absoluteValue > 0 &&
    (absoluteValue < SCIENTIFIC_LOWER_BOUND || absoluteValue >= SCIENTIFIC_UPPER_BOUND);

  if (shouldUseScientificNotation) {
    return formatScientificNumberText(value);
  }

  return formatNumber(value, SCIENTIFIC_MANTISSA_DIGITS);
}
