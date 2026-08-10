import type { PidStandard } from "./model";

/** Free-form documents accept only catalog assets explicitly published as free. */
export function isCatalogSymbolCompatible(standard: PidStandard, supported: readonly PidStandard[]): boolean {
  return supported.includes(standard);
}
