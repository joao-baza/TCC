import type { LineStyle } from "../domain/line-style";

export interface LineStyleAttributes {
  strokeWidth: number;
  strokeDasharray?: string;
  stroke: string;
}

export function lineStyleAttributes(lineStyle: LineStyle): LineStyleAttributes {
  switch (lineStyle) {
    case "supply-impulse":
      return { strokeWidth: 1.5, strokeDasharray: "16 6", stroke: "#475569" };
    case "pneumatic-signal":
    case "hydraulic-signal":
    case "guided-electromagnetic-sonic":
    case "software-link":
    case "binary-pneumatic-signal":
    case "undefined-signal":
    case "electric-signal":
    case "capillary-tube":
    case "unguided-electromagnetic-sonic":
    case "mechanical-link":
    case "binary-electric-signal":
      return { strokeWidth: 1.5, strokeDasharray: "16 6", stroke: "#64748b" };
  }
}

export function isSinusoidal(_lineStyle: LineStyle): boolean {
  return false;
}
