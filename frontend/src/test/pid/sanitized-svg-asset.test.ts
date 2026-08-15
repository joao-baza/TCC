import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isSanitizedPidSvgAsset,
  loadSanitizedPidSvgAsset,
  sanitizePidSvgAsset,
  sanitizedPidSvgDataUrl,
} from "@/features/pid/catalog/sanitized-svg-asset";

const safeSvg = '<svg viewBox="0 0 16 12"><path d="M0 0 L16 12" fill="none" stroke="currentColor"/></svg>';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ativos SVG sanitizados", () => {
  it("aceita clip paths locais usados pelas hachuras e rejeita referências externas", () => {
    const source = '<svg viewBox="0 0 16 12"><title>Tubo</title><defs><clipPath id="pipe-interior"><rect x="0" y="2" width="16" height="8"/></clipPath></defs><g class="fitting-symbol" data-fitting-family="valve"><path class="fitting-hachures" d="M0 12 L12 0" fill="none" stroke="#111111" clip-path="url(#pipe-interior)" vector-effect="non-scaling-stroke"/></g></svg>';

    expect(sanitizePidSvgAsset(source).markup).toContain('clip-path="url(#pipe-interior)"');
    expect(() => sanitizePidSvgAsset(source.replace("url(#pipe-interior)", "url(https://evil.test/clip.svg#x)")))
      .toThrow(/referência svg/i);
  });

  it("preserva rótulos técnicos estáticos dos stencils Draw.io", () => {
    const asset = sanitizePidSvgAsset(
      '<svg viewBox="0 0 96 86"><text x="48" y="43" fill="currentColor" font-size="12" text-anchor="middle" dominant-baseline="auto">FI</text></svg>',
    );

    expect(asset.markup).toContain(">FI</text>");
    expect(() => sanitizePidSvgAsset('<svg viewBox="0 0 10 10"><text><script>alert(1)</script></text></svg>')).toThrow();
  });

  it("gera data URL somente para instâncias produzidas pelo sanitizador", () => {
    const asset = sanitizePidSvgAsset(safeSvg);
    const forged = Object.freeze({ viewBox: "0 0 16 12", markup: "<script>alert(1)</script>" });

    expect(isSanitizedPidSvgAsset(asset)).toBe(true);
    expect(isSanitizedPidSvgAsset(forged)).toBe(false);
    expect(decodeURIComponent(sanitizedPidSvgDataUrl(asset))).toContain(asset.markup);
    expect(() => sanitizedPidSvgDataUrl(forged)).toThrow(/não foi sanitizado/i);
  });

  it("compartilha uma única busca pendente para o mesmo ativo", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => safeSvg });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      loadSanitizedPidSvgAsset("/pid/symbols/cache-coverage.svg"),
      loadSanitizedPidSvgAsset("/pid/symbols/cache-coverage.svg"),
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(first).toBe(second);
    expect(isSanitizedPidSvgAsset(first)).toBe(true);
  });

  it("remove falhas do cache para permitir uma nova tentativa segura", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, text: async () => "" })
      .mockResolvedValueOnce({ ok: true, text: async () => safeSvg });
    vi.stubGlobal("fetch", fetchMock);
    const url = "/pid/symbols/retry-coverage.svg";

    await expect(loadSanitizedPidSvgAsset(url)).rejects.toThrow(/não foi possível carregar/i);
    await expect(loadSanitizedPidSvgAsset(url)).resolves.toSatisfy(isSanitizedPidSvgAsset);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
