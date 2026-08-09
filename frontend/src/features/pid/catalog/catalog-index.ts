import { isCatalogSymbolCompatible } from "../domain/catalog-compatibility";
import type { PidStandard } from "../domain/model";
import { CatalogValidationError, parseCatalogManifest, type CatalogSourceKind, type CatalogSymbol } from "./catalog-symbol";

export { CatalogValidationError } from "./catalog-symbol";

export interface CatalogSearchFilters {
  readonly standard: PidStandard;
  readonly source?: CatalogSourceKind;
  readonly category?: string;
}

export interface CatalogIndex {
  search(query: string, filters: CatalogSearchFilters): readonly CatalogSymbol[];
}

interface IndexedSymbol {
  readonly symbol: CatalogSymbol;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly category: string;
}

/** NFD, diacritic removal, lowercase, trim and collapsed whitespace. */
export function normalizeCatalogText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

/** Parses every unknown input exactly once, then indexes immutable snapshots. */
export function createCatalogIndex(input: unknown): CatalogIndex {
  const parsed = parseCatalogManifest(input);
  const symbols = Object.freeze(parsed.map((symbol) => Object.freeze({
    symbol,
    name: normalizeCatalogText(symbol.name),
    aliases: Object.freeze(symbol.aliases.map(normalizeCatalogText)),
    category: normalizeCatalogText(symbol.category),
  })).sort((left, right) => compareKey(left.symbol.key, right.symbol.key)));
  const byStandard = new Map<PidStandard, readonly IndexedSymbol[]>([
    ["free", symbols],
    ["isa", Object.freeze(symbols.filter(({ symbol }) => isCatalogSymbolCompatible("isa", symbol.standards)))],
    ["iso", Object.freeze(symbols.filter(({ symbol }) => isCatalogSymbolCompatible("iso", symbol.standards)))],
  ]);

  return Object.freeze({
    search(query: string, filters: CatalogSearchFilters): readonly CatalogSymbol[] {
      const base = byStandard.get(filters.standard) ?? [];
      const category = filters.category === undefined ? undefined : normalizeCatalogText(filters.category);
      const compatible = base.filter((entry) => (filters.source === undefined || entry.symbol.source.sourceKind === filters.source)
        && (category === undefined || entry.category === category));
      if (query.trim() === "") return Object.freeze(compatible.map(({ symbol }) => symbol));
      const normalized = normalizeCatalogText(query);
      return Object.freeze(compatible
        .map((entry) => ({ entry, rank: rank(entry, normalized) }))
        .filter((match): match is { entry: IndexedSymbol; rank: number } => match.rank !== null)
        .sort((left, right) => left.rank - right.rank || compareKey(left.entry.symbol.key, right.entry.symbol.key))
        .map(({ entry }) => entry.symbol));
    },
  });
}

function rank(entry: IndexedSymbol, query: string): number | null {
  if (entry.name === query) return 0;
  if (entry.aliases.some((alias) => alias === query)) return 1;
  if (entry.name.startsWith(query)) return 2;
  if (entry.aliases.some((alias) => alias.startsWith(query))) return 3;
  if (entry.name.includes(query)) return 4;
  if (entry.aliases.some((alias) => alias.includes(query))) return 5;
  return null;
}

function compareKey(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
