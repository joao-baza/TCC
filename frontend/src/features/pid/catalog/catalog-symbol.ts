import type { CatalogSymbol as InsertionCatalogSymbol } from "../domain/command-contract";
import { parsePidProperties } from "../domain/schema";
import type { PidStandard } from "../domain/model";
import type { ReadonlyPidProperties } from "../domain/command-contract";
import { getCanonicalPortAnchorLayout } from "../domain/geometry";

export type CatalogSourceKind = "project";

export interface CatalogProvenance {
  readonly sourceKind: CatalogSourceKind;
  readonly sourceName: string;
  readonly license: Readonly<{ name: string; reference: string }>;
  readonly attribution: string;
}

export interface CatalogSymbol extends InsertionCatalogSymbol {
  readonly aliases: readonly string[];
  readonly category: string;
  readonly assetUrl: string;
  readonly viewBox: string;
  readonly source: CatalogProvenance;
}

export type CatalogManifest = readonly CatalogSymbol[];

export class CatalogValidationError extends TypeError {
  readonly code: string;
  readonly path: readonly (string | number)[];

  constructor(code: string, path: readonly (string | number)[], message: string) {
    super(message);
    this.name = "CatalogValidationError";
    this.code = code;
    this.path = Object.freeze([...path]);
  }
}

interface DecodeState { values: number; readonly active: WeakSet<object>; }
const maxDepth = 32;
const maxValues = 20_000;
const maxArrayLength = 2_000;
const maxObjectKeys = 200;
const maxSymbols = 500;
const maxManifestBytes = 1_000_000;
const maxStringLength = 500;
const maxAliases = 64;
const trustedManifests = new WeakSet<object>();
const keyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*)+$/;
const portKeyPattern = /^[a-z][a-z0-9-]*$/;
const assetOrigin = "https://catalog.local";
const standards = new Set<PidStandard>(["free", "isa", "iso"]);
const directions = new Set(["input", "output", "bidirectional"]);
const connectionClasses = new Set(["process", "utility", "signal"]);

/** Decodes unknown manifest data into one immutable, domain-compatible snapshot. */
export function parseCatalogSymbol(value: unknown): CatalogSymbol {
  const state: DecodeState = { values: 0, active: new WeakSet() };
  const root = record(value, [], state, [
    "key", "name", "aliases", "category", "assetUrl", "viewBox", "defaultSize",
    "portTemplates", "standards", "catalogVersion", "source", "tag", "label", "properties",
  ], ["key", "name", "aliases", "category", "assetUrl", "viewBox", "defaultSize", "portTemplates", "standards", "catalogVersion", "source"]);
  const key = string(root, "key", state, ["key"]);
  if (!keyPattern.test(key)) fail("catalog.key.invalid", ["key"], "A key do símbolo deve ser ASCII minúscula e namespaced.");
  const name = nonBlank(string(root, "name", state, ["name"]), ["name"]);
  const aliases = strings(array(root, "aliases", state, ["aliases"]), state, ["aliases"]);
  if (aliases.length === 0 || aliases.length > maxAliases || aliases.some((alias) => alias.trim() === "")) fail("catalog.aliases.invalid", ["aliases"], "aliases válidos são obrigatórios.");
  const category = nonBlank(string(root, "category", state, ["category"]), ["category"]);
  const assetUrl = string(root, "assetUrl", state, ["assetUrl"]);
  validateAsset(assetUrl);
  const viewBox = string(root, "viewBox", state, ["viewBox"]);
  validateViewBox(viewBox);
  const defaultSizeValue = record(read(root, "defaultSize", ["defaultSize"]), ["defaultSize"], state, ["width", "height"], ["width", "height"]);
  const defaultSize = Object.freeze({
    width: positive(number(defaultSizeValue, "width", state, ["defaultSize", "width"]), ["defaultSize", "width"]),
    height: positive(number(defaultSizeValue, "height", state, ["defaultSize", "height"]), ["defaultSize", "height"]),
  });
  const standardsValue = strings(array(root, "standards", state, ["standards"]), state, ["standards"]);
  if (standardsValue.length === 0 || standardsValue.some((standard) => !standards.has(standard as PidStandard)) || new Set(standardsValue).size !== standardsValue.length) {
    fail("catalog.standards.invalid", ["standards"], "As normas do símbolo são inválidas.");
  }
  const symbolStandards = Object.freeze(standardsValue as PidStandard[]);
  const catalogVersion = nonBlank(string(root, "catalogVersion", state, ["catalogVersion"]), ["catalogVersion"], "A versão de catálogo é obrigatória.");
  const sourceValue = record(read(root, "source", ["source"]), ["source"], state, ["sourceKind", "sourceName", "license", "attribution"], ["sourceKind", "sourceName", "license", "attribution"]);
  if (string(sourceValue, "sourceKind", state, ["source", "sourceKind"]) !== "project") fail("catalog.source.kind", ["source", "sourceKind"], "A fonte do catálogo não é suportada.");
  const licenseValue = record(read(sourceValue, "license", ["source", "license"]), ["source", "license"], state, ["name", "reference"], ["name", "reference"]);
  const source = Object.freeze({
    sourceKind: "project" as const,
    sourceName: nonBlank(string(sourceValue, "sourceName", state, ["source", "sourceName"]), ["source", "sourceName"], "A proveniência exige o nome da fonte."),
    license: Object.freeze({
      name: nonBlank(string(licenseValue, "name", state, ["source", "license", "name"]), ["source", "license", "name"], "A proveniência exige a licença."),
      reference: nonBlank(string(licenseValue, "reference", state, ["source", "license", "reference"]), ["source", "license", "reference"], "A proveniência exige a referência da licença."),
    }),
    attribution: nonBlank(string(sourceValue, "attribution", state, ["source", "attribution"]), ["source", "attribution"], "A proveniência exige a atribuição."),
  });
  const parsedPorts = array(root, "portTemplates", state, ["portTemplates"]).map((port, index) => parsePort(port, state, index));
  const portTemplates = Object.freeze(parsedPorts);
  if (portTemplates.length === 0) fail("catalog.ports.empty", ["portTemplates"], "O símbolo precisa de portas.");
  const ports = new Set<string>();
  portTemplates.forEach((port, index) => {
    const normalized = normalizePortIdentity(port.key);
    if (ports.has(normalized)) fail("catalog.port.duplicate", ["portTemplates", index, "key"], "A porta duplicada não é permitida.");
    if (!portKeyPattern.test(port.key)) fail("catalog.port.key", ["portTemplates", index, "key"], "A key da porta deve ser ASCII minúscula canônica.");
    ports.add(normalized);
  });
  const anchors = getCanonicalPortAnchorLayout(defaultSize, portTemplates);
  const distinctAnchors = new Set(anchors.map(({ position, x, y }) => `${position}:${x}:${y}`));
  if (distinctAnchors.size !== anchors.length) {
    fail(
      "catalog.port.geometry",
      ["portTemplates"],
      "A geometria canônica precisa produzir âncoras de porta distintas.",
    );
  }
  const properties = Object.hasOwn(root, "properties") ? parseProperties(read(root, "properties", ["properties"]), state) : undefined;
  return Object.freeze({
    key, name, aliases: Object.freeze([...aliases]), category, assetUrl, viewBox, defaultSize, portTemplates, standards: symbolStandards,
    catalogVersion, source,
    ...(Object.hasOwn(root, "tag") ? { tag: string(root, "tag", state, ["tag"]) } : {}),
    ...(Object.hasOwn(root, "label") ? { label: string(root, "label", state, ["label"]) } : {}),
    ...(properties === undefined ? {} : { properties }),
  });
}

/** Strict descriptor-based manifest decoder for programmatic input. */
/** For inert JSON-like values only; external text must enter through parseCatalogManifestJson. */
export function parseCatalogManifest(value: unknown): CatalogManifest {
  if (isTrustedCatalogManifest(value)) return value;
  const state: DecodeState = { values: 0, active: new WeakSet() };
  const entries = arrayValue(value, [], state);
  if (entries.length > maxSymbols) fail("catalog.manifest.budget", [], "O catálogo excede o limite de símbolos.");
  const keys = new Set<string>();
  const symbols: CatalogSymbol[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const symbol = parseCatalogSymbol(entries[index]);
    if (keys.has(symbol.key)) fail("catalog.key.duplicate", [index, "key"], `Chave duplicada no catálogo: ${symbol.key}`);
    keys.add(symbol.key);
    symbols.push(symbol);
  }
  return Object.freeze(symbols);
}

/** Decodes external text with inert JSON before applying the strict decoder. */
export function parseCatalogManifestJson(text: string): CatalogManifest {
  if (typeof text !== "string") fail("catalog.json.type", [], "O manifesto JSON deve ser texto.");
  if (new TextEncoder().encode(text).byteLength > maxManifestBytes) fail("catalog.json.budget", [], "O manifesto JSON excede o limite de bytes.");
  try { return parseCatalogManifest(JSON.parse(text)); }
  catch (error) { if (error instanceof CatalogValidationError) throw error; fail("catalog.json.invalid", [], "O manifesto JSON é inválido."); }
}

/** Creates a one-time validated immutable bundled manifest. */
export function createTrustedCatalogManifest(value: unknown): CatalogManifest {
  const manifest = parseCatalogManifest(value);
  trustedManifests.add(manifest as object);
  return manifest;
}

export function isTrustedCatalogManifest(value: unknown): value is CatalogManifest {
  return typeof value === "object" && value !== null && trustedManifests.has(value);
}

function parsePort(value: unknown, state: DecodeState, index: number) {
  const path = ["portTemplates", index] as const;
  const source = record(value, path, state, ["key", "direction", "connectionClass", "capacity"], ["key", "direction", "connectionClass", "capacity"]);
  const key = string(source, "key", state, [...path, "key"]);
  const direction = string(source, "direction", state, [...path, "direction"]);
  if (!directions.has(direction)) fail("catalog.port.direction", [...path, "direction"], "A direção da porta é inválida.");
  const connectionClass = string(source, "connectionClass", state, [...path, "connectionClass"]);
  if (!connectionClasses.has(connectionClass)) fail("catalog.port.class", [...path, "connectionClass"], "A classe de conexão é inválida.");
  const capacity = number(source, "capacity", state, [...path, "capacity"]);
  if (!Number.isInteger(capacity) || capacity <= 0) fail("catalog.port.capacity", [...path, "capacity"], "A porta deve ter capacidade inteira positiva.");
  return Object.freeze({ key, direction: direction as "input" | "output" | "bidirectional", connectionClass: connectionClass as "process" | "utility" | "signal", capacity });
}

function parseProperties(value: unknown, state: DecodeState): ReadonlyPidProperties {
  try { return deepFreeze(parsePidProperties(copyJson(value, ["properties"], state, 0))); }
  catch { fail("catalog.properties.invalid", ["properties"], "As propriedades do símbolo são inválidas."); }
}

function copyJson(value: unknown, path: readonly (string | number)[], state: DecodeState, depth: number): unknown {
  consume(state, path); if (depth > maxDepth) fail("catalog.depth", path, "A profundidade máxima do catálogo foi excedida.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return arrayValue(value, path, state).map((item, index) => copyJson(item, [...path, index], state, depth + 1));
  if (typeof value !== "object" || value === null || state.active.has(value)) fail("catalog.cycle", path, "Referências cíclicas não são permitidas.");
  state.active.add(value);
  try {
    const source = record(value, path, state);
    const result: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(source))) result[key] = copyJson(descriptor.value, [...path, key], state, depth + 1);
    return result;
  } finally { state.active.delete(value); }
}

function record(value: unknown, path: readonly (string | number)[], state: DecodeState, allowed?: readonly string[], required: readonly string[] = []): Record<string, unknown> {
  consume(state, path);
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail("catalog.object.plain", path, "O catálogo aceita apenas objetos simples.");
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(value);
    if (keys.length > maxObjectKeys) fail("catalog.object.budget", path, "O objeto do catálogo excede o limite de chaves.");
    for (const key of keys) {
      if (typeof key !== "string") fail("catalog.symbol", [...path, String(key)], "Chaves symbol não são permitidas.");
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable) fail("catalog.non-enumerable", [...path, key], "Campos não enumeráveis não são permitidos.");
      if (!("value" in descriptor)) fail("catalog.accessor", [...path, key], "Accessors não são permitidos.");
      if (allowed && !allowed.includes(key)) fail("catalog.field", [...path, key], "Campo de catálogo não reconhecido.");
    }
    for (const key of required) if (!Object.hasOwn(descriptors, key)) fail("catalog.required", [...path, key], "Campo obrigatório ausente.");
    return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
  } catch (error) { if (error instanceof CatalogValidationError) throw error; fail("catalog.read", path, "Não foi possível ler o catálogo com segurança."); }
}

function array(root: Record<string, unknown>, key: string, state: DecodeState, path: readonly (string | number)[]): unknown[] { return arrayValue(read(root, key, path), path, state); }
function arrayValue(value: unknown, path: readonly (string | number)[], state: DecodeState): unknown[] {
  consume(state, path); try {
    if (!Array.isArray(value)) fail("catalog.array", path, "É esperado um array denso.");
    const descriptors = Object.getOwnPropertyDescriptors(value); const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
    if (!Number.isInteger(length) || length > maxArrayLength) fail("catalog.array.budget", path, "O array excede o limite do catálogo.");
    if (Reflect.ownKeys(value).length !== length + 1) fail("catalog.array.extra", path, "Arrays não podem ter campos extras.");
    const copy: unknown[] = [];
    for (let index = 0; index < length; index += 1) { const descriptor = descriptors[String(index)]; if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail("catalog.array.sparse", [...path, index], "Arrays esparsos ou com accessors não são permitidos."); copy.push(descriptor.value); }
    return copy;
  } catch (error) { if (error instanceof CatalogValidationError) throw error; fail("catalog.read", path, "Não foi possível ler o array com segurança."); }
}
function read(root: Record<string, unknown>, key: string, path: readonly (string | number)[]): unknown { if (!Object.hasOwn(root, key)) fail("catalog.required", path, "Campo obrigatório ausente."); return root[key]; }
function string(root: Record<string, unknown>, key: string, state: DecodeState, path: readonly (string | number)[]): string { consume(state, path); const value = read(root, key, path); if (typeof value !== "string" || value.length > maxStringLength) fail("catalog.string", path, "É esperado texto dentro do limite do catálogo."); return value; }
function number(root: Record<string, unknown>, key: string, state: DecodeState, path: readonly (string | number)[]): number { consume(state, path); const value = read(root, key, path); if (typeof value !== "number" || !Number.isFinite(value)) fail("catalog.number", path, "É esperado número finito para o tamanho ou contrato do catálogo."); return value; }
function strings(value: unknown[], state: DecodeState, path: readonly (string | number)[]): string[] { return value.map((item, index) => { consume(state, [...path, index]); if (typeof item !== "string" || item.length > maxStringLength) fail("catalog.string", [...path, index], "É esperado texto dentro do limite do catálogo."); return item; }); }
function nonBlank(value: string, path: readonly (string | number)[], message = "Texto não vazio é obrigatório."): string { if (value.trim() === "") fail("catalog.blank", path, message); return value; }
function positive(value: number, path: readonly (string | number)[]): number { if (value <= 0) fail("catalog.positive", path, "O valor deve ser positivo."); return value; }
function validateViewBox(value: string): void { const parts = value.trim().split(/\s+/).map(Number); if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part)) || parts[2] <= 0 || parts[3] <= 0) fail("catalog.viewbox", ["viewBox"], "O viewBox é inválido."); }
function validateAsset(value: string): void { try { const url = new URL(value, assetOrigin); if (!value.startsWith("/pid/symbols/") || value.includes("?") || value.includes("#") || /%(?:2f|5c|2e)/iu.test(value) || url.origin !== assetOrigin || !/^\/pid\/symbols\/[a-z0-9][a-z0-9-]*\.svg$/.test(url.pathname)) fail("catalog.asset", ["assetUrl"], "Os metadados do catálogo exigem um asset SVG local canônico."); } catch (error) { if (error instanceof CatalogValidationError) throw error; fail("catalog.asset", ["assetUrl"], "Os metadados do catálogo exigem um asset SVG local canônico."); } }
function normalizePortIdentity(value: string): string { return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(); }
function consume(state: DecodeState, path: readonly (string | number)[]): void { state.values += 1; if (state.values > maxValues) fail("catalog.budget", path, "O catálogo excede o limite de valores."); }
function deepFreeze<T>(value: T): T { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.values(value as Record<string, unknown>).forEach(deepFreeze); Object.freeze(value); } return value; }
function fail(code: string, path: readonly (string | number)[], message: string): never { throw new CatalogValidationError(code, path, message); }
