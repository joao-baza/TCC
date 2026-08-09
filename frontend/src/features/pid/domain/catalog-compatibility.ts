import type { PidStandard } from "./model";

/** Free-form documents may use every approved catalog asset; normative standards opt in explicitly. */
export function isCatalogSymbolCompatible(standard: PidStandard, supported: readonly PidStandard[]): boolean {
  return standard === "free" || supported.includes(standard);
}
