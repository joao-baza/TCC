export interface SanitizedPidSvgAsset {
  readonly viewBox: string;
  readonly markup: string;
}

export interface PidAssetFetchResponse {
  readonly ok: boolean;
  text(): Promise<string>;
}

export type PidAssetFetcher = (url: string) => Promise<PidAssetFetchResponse>;

const trustedAssets = new WeakSet<object>();
const browserAssetCache = new Map<string, Promise<SanitizedPidSvgAsset>>();
const allowedElements = new Set(["g", "path", "line", "circle", "rect", "polygon", "polyline", "ellipse"]);
const allowedAttributes = new Set([
  "cx", "cy", "d", "fill", "fill-opacity", "fill-rule", "height", "opacity", "points", "r", "rx", "ry",
  "stroke", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "stroke-opacity", "stroke-width", "transform",
  "width", "x", "x1", "x2", "y", "y1", "y2",
]);
const safePaint = /^(?:none|currentColor|#[0-9a-fA-F]{3,8})$/;
const safeNumberList = /^[-+\d.eE, ()]+$/;

export function sanitizePidSvgAsset(source: string): SanitizedPidSvgAsset {
  if (typeof source !== "string" || source.length > 1_000_000) throw new Error("Ativo SVG fora do limite permitido.");
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source)) throw new Error("Declaração XML não permitida em ativo SVG.");
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  if (parsed.querySelector("parsererror") || parsed.documentElement.localName !== "svg") throw new Error("Ativo SVG inválido.");
  const root = parsed.documentElement;
  const viewBox = canonicalViewBox(root.getAttribute("viewBox"));
  const markup = Array.from(root.childNodes).map(serializeSanitizedNode).join("");
  const asset = Object.freeze({ viewBox, markup });
  trustedAssets.add(asset);
  return asset;
}

export function isSanitizedPidSvgAsset(asset: unknown): asset is SanitizedPidSvgAsset {
  return typeof asset === "object" && asset !== null && trustedAssets.has(asset);
}

export async function loadSanitizedPidSvgAsset(
  url: string,
  fetcher?: PidAssetFetcher,
): Promise<SanitizedPidSvgAsset> {
  if (fetcher) return fetchAndSanitize(url, fetcher);
  const cached = browserAssetCache.get(url);
  if (cached) return cached;
  const pending = fetchAndSanitize(url, (assetUrl) => fetch(assetUrl)).catch((error) => {
    browserAssetCache.delete(url);
    throw error;
  });
  browserAssetCache.set(url, pending);
  return pending;
}

export function sanitizedPidSvgDataUrl(asset: SanitizedPidSvgAsset): string {
  if (!isSanitizedPidSvgAsset(asset)) throw new Error("O ativo SVG não foi sanitizado pelo catálogo confiável.");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeAttribute(asset.viewBox)}">${asset.markup}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function fetchAndSanitize(url: string, fetcher: PidAssetFetcher): Promise<SanitizedPidSvgAsset> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Não foi possível carregar o ativo ${url}.`);
  return sanitizePidSvgAsset(await response.text());
}

function serializeSanitizedNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent?.trim()) throw new Error("Texto não permitido em ativo SVG.");
    return "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) throw new Error("Conteúdo não permitido em ativo SVG.");
  const element = node as Element;
  const name = element.localName;
  if (!allowedElements.has(name)) throw new Error(`Elemento SVG não permitido: ${name}.`);
  const attributes = Array.from(element.attributes).sort((left, right) => compare(left.name, right.name));
  for (const item of attributes) validateSanitizedAttribute(item.name, item.value);
  const serializedAttributes = attributes.map((item) => ` ${item.name}="${escapeAttribute(item.value)}"`).join("");
  const children = Array.from(element.childNodes).map(serializeSanitizedNode).join("");
  return `<${name}${serializedAttributes}>${children}</${name}>`;
}

function validateSanitizedAttribute(name: string, value: string): void {
  if (!allowedAttributes.has(name)) throw new Error(`Atributo SVG não permitido: ${name}.`);
  if ((name === "fill" || name === "stroke") && !safePaint.test(value)) throw new Error(`Valor SVG não permitido em ${name}.`);
  if (name === "transform" && !/^(?:(?:translate|rotate|scale|matrix)\([-+\d.eE, ]+\)\s*)+$/.test(value)) throw new Error("Transformação SVG não permitida.");
  if (name !== "d" && name !== "fill" && name !== "stroke" && name !== "fill-rule" && name !== "stroke-linecap" && name !== "stroke-linejoin" && name !== "transform" && !safeNumberList.test(value)) throw new Error(`Valor SVG não permitido em ${name}.`);
  if (name === "d" && !/^[MmZzLlHhVvCcSsQqTtAa0-9+\-.,\sEe]+$/.test(value)) throw new Error("Path SVG não permitido.");
  if ((name === "fill-rule" || name === "stroke-linecap" || name === "stroke-linejoin") && !/^(?:nonzero|evenodd|butt|round|square|miter|bevel)$/.test(value)) throw new Error(`Valor SVG não permitido em ${name}.`);
}

function canonicalViewBox(value: string | null): string {
  const parts = value?.trim().split(/\s+/).map(Number) ?? [];
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part)) || parts[2] <= 0 || parts[3] <= 0) throw new Error("viewBox SVG inválido.");
  return parts.map(canonicalNumber).join(" ");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function canonicalNumber(value: number): string { return String(Object.is(value, -0) ? 0 : Math.round(value * 1_000_000) / 1_000_000); }
function compare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
