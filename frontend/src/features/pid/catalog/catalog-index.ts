import type { PidStandard } from "../domain/model";
import type { CatalogSourceKind, CatalogSymbol } from "./fixtures/catalog";

export interface CatalogSearchFilters {
  standard: PidStandard;
  source?: CatalogSourceKind;
  category?: string;
}

export interface CatalogIndex {
  search(query: string, filters: CatalogSearchFilters): readonly CatalogSymbol[];
}

interface IndexedSymbol {
  symbol: CatalogSymbol;
  normalizedName: string;
  normalizedAliases: readonly string[];
}

const standards = new Set<PidStandard>(["isa", "iso", "free"]);
const directions = new Set(["input", "output", "bidirectional"]);
const connectionClasses = new Set(["process", "utility", "signal"]);

export function normalizeCatalogText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function createCatalogIndex(input: readonly CatalogSymbol[]): CatalogIndex {
  if (!Array.isArray(input)) throw new TypeError("O catálogo deve ser uma lista.");

  const keys = new Set<string>();
  input.forEach((candidate) => validateSymbol(candidate, keys));
  const symbols = input.map(toIndexedSymbol);

  return Object.freeze({
    search(query: string, filters: CatalogSearchFilters): readonly CatalogSymbol[] {
      const normalizedQuery = normalizeCatalogText(query);
      const normalizedCategory = filters.category === undefined
        ? undefined
        : normalizeCatalogText(filters.category);

      const matches = symbols
        .filter(({ symbol }) => isCompatible(symbol, filters, normalizedCategory))
        .map((entry) => ({ entry, rank: rank(entry, normalizedQuery) }))
        .filter((match) => match.rank !== null)
        .sort((left, right) => {
          const rankOrder = (left.rank ?? 0) - (right.rank ?? 0);
          return rankOrder !== 0
            ? rankOrder
            : left.entry.symbol.key < right.entry.symbol.key ? -1 : left.entry.symbol.key > right.entry.symbol.key ? 1 : 0;
        })
        .map(({ entry }) => entry.symbol);

      return Object.freeze(matches);
    },
  });
}

function isCompatible(
  symbol: CatalogSymbol,
  filters: CatalogSearchFilters,
  normalizedCategory: string | undefined,
): boolean {
  return symbol.standards.includes(filters.standard)
    && (filters.source === undefined || symbol.source.sourceKind === filters.source)
    && (normalizedCategory === undefined || normalizeCatalogText(symbol.category) === normalizedCategory);
}

function rank(entry: IndexedSymbol, query: string): number | null {
  if (query === "") return 0;
  if (entry.normalizedName === query) return 0;
  if (entry.normalizedAliases.some((alias) => alias === query)) return 1;
  if (entry.normalizedName.startsWith(query)) return 2;
  if (entry.normalizedAliases.some((alias) => alias.startsWith(query))) return 3;
  if (entry.normalizedName.includes(query)) return 4;
  if (entry.normalizedAliases.some((alias) => alias.includes(query))) return 5;
  return null;
}

function toIndexedSymbol(symbol: CatalogSymbol): IndexedSymbol {
  const frozen = Object.freeze({
    ...symbol,
    aliases: Object.freeze([...symbol.aliases]),
    standards: Object.freeze([...symbol.standards]) as unknown as PidStandard[],
    defaultSize: Object.freeze({ ...symbol.defaultSize }),
    portTemplates: Object.freeze(symbol.portTemplates.map((port) => Object.freeze({ ...port }))) as CatalogSymbol["portTemplates"],
    source: Object.freeze({ ...symbol.source }),
    properties: symbol.properties === undefined
      ? undefined
      : freezeCatalogValue(symbol.properties) as CatalogSymbol["properties"],
  });
  return Object.freeze({
    symbol: frozen,
    normalizedName: normalizeCatalogText(frozen.name),
    normalizedAliases: Object.freeze(frozen.aliases.map(normalizeCatalogText)),
  });
}

function freezeCatalogValue(value: unknown): unknown {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeCatalogValue));
  if (value !== null && typeof value === "object") {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, freezeCatalogValue(entry)]),
    ));
  }
  return value;
}

function validateSymbol(symbol: CatalogSymbol, keys: Set<string>): void {
  if (!symbol || typeof symbol !== "object") throw new TypeError("Símbolo de catálogo inválido.");
  if (typeof symbol.key !== "string" || normalizeCatalogText(symbol.key) === "") {
    throw new TypeError("Símbolo sem chave válida.");
  }
  if (keys.has(symbol.key)) throw new TypeError(`Chave duplicada no catálogo: ${symbol.key}`);
  keys.add(symbol.key);
  if (typeof symbol.name !== "string" || normalizeCatalogText(symbol.name) === "" || !Array.isArray(symbol.aliases)
    || symbol.aliases.length === 0 || symbol.aliases.some((alias) => typeof alias !== "string" || normalizeCatalogText(alias) === "")) {
    throw new TypeError(`Símbolo ${symbol.key} sem nome ou aliases válidos.`);
  }
  if (!Array.isArray(symbol.standards) || symbol.standards.length === 0 || symbol.standards.some((value) => !standards.has(value))) {
    throw new TypeError(`Símbolo ${symbol.key} sem normas válidas.`);
  }
  if (!symbol.defaultSize || !Number.isFinite(symbol.defaultSize.width) || !Number.isFinite(symbol.defaultSize.height)
    || symbol.defaultSize.width <= 0 || symbol.defaultSize.height <= 0) {
    throw new TypeError(`Símbolo ${symbol.key} sem tamanho padrão positivo.`);
  }
  if (!Array.isArray(symbol.portTemplates) || symbol.portTemplates.length === 0) {
    throw new TypeError(`Símbolo ${symbol.key} precisa de pelo menos uma porta.`);
  }
  for (const port of symbol.portTemplates) {
    if (!port || typeof port.key !== "string" || port.key === "" || !directions.has(port.direction)
      || !connectionClasses.has(port.connectionClass) || !Number.isFinite(port.capacity) || port.capacity <= 0) {
      throw new TypeError(`Símbolo ${symbol.key} possui porta inválida.`);
    }
  }
  if (typeof symbol.category !== "string" || normalizeCatalogText(symbol.category) === ""
    || typeof symbol.assetUrl !== "string" || !symbol.assetUrl.startsWith("/pid/symbols/")
    || !/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?$/.test(symbol.viewBox)
    || !symbol.source || symbol.source.sourceKind !== "project"
    || !symbol.source.license || !symbol.source.attribution) {
    throw new TypeError(`Símbolo ${symbol.key} possui metadados de catálogo inválidos.`);
  }
}
