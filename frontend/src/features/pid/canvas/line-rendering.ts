import type { LineStyle } from "../domain/line-style";

export interface LineStyleAttributes {
  strokeWidth: number;
  strokeDasharray?: string;
  stroke: string;
}

export function lineStyleAttributes(lineStyle: LineStyle): LineStyleAttributes {
  switch (lineStyle) {
    case "solid-thick":
      return { strokeWidth: 3, stroke: "#475569" };
    case "solid-thin":
      return { strokeWidth: 1.5, stroke: "#475569" };
    case "pneumatic":
      return { strokeWidth: 1.5, strokeDasharray: "12 4", stroke: "#64748b" };
    case "dashed":
      return { strokeWidth: 1.5, strokeDasharray: "8 4", stroke: "#64748b" };
    case "hydraulic":
      return { strokeWidth: 1.5, strokeDasharray: "20 4 4 4", stroke: "#64748b" };
    case "capillary":
      return { strokeWidth: 1, strokeDasharray: "2 4", stroke: "#64748b" };
    case "guided-wave":
      return { strokeWidth: 1.5, stroke: "#64748b" };
    case "unguided-wave":
      return { strokeWidth: 1.5, stroke: "#64748b" };
    case "digital":
      return { strokeWidth: 1.5, strokeDasharray: "2 8", stroke: "#64748b" };
    case "mechanical":
      return { strokeWidth: 1.5, strokeDasharray: "4 4", stroke: "#64748b" };
    case "undefined":
      return { strokeWidth: 1.5, strokeDasharray: "16 6", stroke: "#64748b" };
  }
}

export function isSinusoidal(lineStyle: LineStyle): boolean {
  return lineStyle === "guided-wave" || lineStyle === "unguided-wave";
}
