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

export class CatalogValidationError extends TypeError {
  readonly path: readonly (string | number)[];

  constructor(message: string, path: readonly (string | number)[]) {
    super(message);
    this.name = "CatalogValidationError";
    this.path = Object.freeze([...path]);
  }
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
  if (!Array.isArray(input)) throw invalidCatalog("O catálogo deve ser uma lista.", []);

  const keys = new Set<string>();
  input.forEach((candidate) => validateSymbol(candidate, keys));
  const symbols = Object.freeze(input.map(toIndexedSymbol).sort(compareIndexedSymbols));

  return Object.freeze({
    search(query: string, filters: CatalogSearchFilters): readonly CatalogSymbol[] {
      const normalizedCategory = filters.category === undefined
        ? undefined
        : normalizeCatalogText(filters.category);
      if (query.trim() === "") {
        return Object.freeze(filterCompatible(symbols, filters, normalizedCategory).map(({ symbol }) => symbol));
      }

      const normalizedQuery = normalizeCatalogText(query);

      const matches = filterCompatible(symbols, filters, normalizedCategory)
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

function filterCompatible(
  symbols: readonly IndexedSymbol[],
  filters: CatalogSearchFilters,
  normalizedCategory: string | undefined,
): IndexedSymbol[] {
  return symbols.filter(({ symbol }) => isCompatible(symbol, filters, normalizedCategory));
}

function compareIndexedSymbols(left: IndexedSymbol, right: IndexedSymbol): number {
  return compareKeys(left.symbol.key, right.symbol.key);
}

function compareKeys(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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
  if (!symbol || typeof symbol !== "object") throw invalidCatalog("Símbolo de catálogo inválido.", []);
  if (typeof symbol.key !== "string" || normalizeCatalogText(symbol.key) === "") {
    throw invalidCatalog("Símbolo sem chave válida.", ["key"]);
  }
  if (keys.has(symbol.key)) throw invalidCatalog(`Chave duplicada no catálogo: ${symbol.key}`, ["key"]);
  keys.add(symbol.key);
  if (typeof symbol.name !== "string" || normalizeCatalogText(symbol.name) === "") {
    throw invalidCatalog(`Símbolo ${symbol.key} sem nome ou aliases válidos.`, ["name"]);
  }
  if (!Array.isArray(symbol.aliases) || symbol.aliases.length === 0
    || symbol.aliases.some((alias) => typeof alias !== "string" || normalizeCatalogText(alias) === "")) {
    throw invalidCatalog(`Símbolo ${symbol.key} sem nome ou aliases válidos.`, ["aliases"]);
  }
  if (!Array.isArray(symbol.standards) || symbol.standards.length === 0 || symbol.standards.some((value) => !standards.has(value))) {
    throw invalidCatalog(`Símbolo ${symbol.key} sem normas válidas.`, ["standards"]);
  }
  if (typeof symbol.catalogVersion !== "string" || symbol.catalogVersion.trim() === "") {
    throw invalidCatalog(`Símbolo ${symbol.key} sem versão de catálogo válida.`, ["catalogVersion"]);
  }
  if (!symbol.defaultSize || !Number.isFinite(symbol.defaultSize.width) || !Number.isFinite(symbol.defaultSize.height)
    || symbol.defaultSize.width <= 0 || symbol.defaultSize.height <= 0) {
    throw invalidCatalog(`Símbolo ${symbol.key} sem tamanho padrão positivo.`, ["defaultSize"]);
  }
  if (!Array.isArray(symbol.portTemplates) || symbol.portTemplates.length === 0) {
    throw invalidCatalog(`Símbolo ${symbol.key} precisa de pelo menos uma porta.`, ["portTemplates"]);
  }
  const portKeys = new Set<string>();
  for (const [index, port] of symbol.portTemplates.entries()) {
    if (!port) throw invalidCatalog(`Símbolo ${symbol.key} possui porta inválida.`, ["portTemplates", index]);
    const normalizedPortKey = typeof port.key === "string" ? normalizeCatalogText(port.key) : "";
    if (normalizedPortKey === "") {
      throw invalidCatalog(`Símbolo ${symbol.key} possui porta inválida.`, ["portTemplates", index, "key"]);
    }
    if (!directions.has(port.direction)) {
      throw invalidCatalog(`Símbolo ${symbol.key} possui porta inválida.`, ["portTemplates", index, "direction"]);
    }
    if (!connectionClasses.has(port.connectionClass)) {
      throw invalidCatalog(`Símbolo ${symbol.key} possui porta inválida.`, ["portTemplates", index, "connectionClass"]);
    }
    if (!Number.isInteger(port.capacity) || port.capacity <= 0) {
      throw invalidCatalog(`Símbolo ${symbol.key} possui porta inválida.`, ["portTemplates", index, "capacity"]);
    }
    if (portKeys.has(normalizedPortKey)) {
      throw invalidCatalog(`Símbolo ${symbol.key} possui porta duplicada: ${port.key}.`, ["portTemplates", index, "key"]);
    }
    portKeys.add(normalizedPortKey);
  }
  if (typeof symbol.category !== "string" || normalizeCatalogText(symbol.category) === "") {
    throw invalidCatalog(`Símbolo ${symbol.key} possui metadados de catálogo inválidos.`, ["category"]);
  }
  if (typeof symbol.assetUrl !== "string" || !symbol.assetUrl.startsWith("/pid/symbols/")) {
    throw invalidCatalog(`Símbolo ${symbol.key} possui metadados de catálogo inválidos.`, ["assetUrl"]);
  }
  if (!isValidViewBox(symbol.viewBox)) throw invalidCatalog(`Símbolo ${symbol.key} possui viewBox inválido.`, ["viewBox"]);
  if (!symbol.source || symbol.source.sourceKind !== "project") {
    throw invalidCatalog(`Símbolo ${symbol.key} possui proveniência inválida.`, ["source", "sourceKind"]);
  }
  if (!isNonBlankString(symbol.source.sourceName)) {
    throw invalidCatalog(`Símbolo ${symbol.key} possui proveniência inválida.`, ["source", "sourceName"]);
  }
  if (!isNonBlankString(symbol.source.license?.name)) {
    throw invalidCatalog(`Símbolo ${symbol.key} possui proveniência inválida.`, ["source", "license", "name"]);
  }
  if (!isNonBlankString(symbol.source.license?.reference)) {
    throw invalidCatalog(`Símbolo ${symbol.key} possui proveniência inválida.`, ["source", "license", "reference"]);
  }
  if (!isNonBlankString(symbol.source.attribution)) {
    throw invalidCatalog(`Símbolo ${symbol.key} possui proveniência inválida.`, ["source", "attribution"]);
  }
}

function invalidCatalog(message: string, path: readonly (string | number)[]): CatalogValidationError {
  return new CatalogValidationError(message, path);
}

function isValidViewBox(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 4) return false;
  const numbers = parts.map(Number);
  return numbers.every(Number.isFinite) && numbers[2] > 0 && numbers[3] > 0;
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}
