import { DEFAULT_LINE_STYLE, type LineStyle } from "../domain/line-style";
import type { ConnectionClass } from "../domain/model";

export interface LineStyleAttributes {
  strokeWidth: number;
  strokeDasharray?: string;
  stroke: string;
}

const signalStroke = "#64748b";
const signalAttributes: LineStyleAttributes = { strokeWidth: 1.5, stroke: signalStroke };

const lineStyleAttributeMap: Record<LineStyle, LineStyleAttributes> = {
  "supply-impulse": { strokeWidth: 1.5, stroke: "#475569" },
  "pneumatic-signal": signalAttributes,
  "hydraulic-signal": signalAttributes,
  "guided-electromagnetic-sonic": signalAttributes,
  "software-link": signalAttributes,
  "binary-pneumatic-signal": signalAttributes,
  "undefined-signal": signalAttributes,
  "electric-signal": { ...signalAttributes, strokeDasharray: "14 7" },
  "capillary-tube": signalAttributes,
  "unguided-electromagnetic-sonic": signalAttributes,
  "mechanical-link": signalAttributes,
  "binary-electric-signal": { ...signalAttributes, strokeDasharray: "14 7" },
};

export function lineStyleAttributes(lineStyle: LineStyle): LineStyleAttributes {
  return { ...lineStyleAttributeMap[lineStyle] };
}

export function effectiveLineStyle(connectionClass: ConnectionClass, lineStyle: LineStyle): LineStyle {
  return connectionClass === "signal" ? lineStyle : DEFAULT_LINE_STYLE[connectionClass];
}

export function isSinusoidal(_lineStyle: LineStyle): boolean {
  return false;
}
