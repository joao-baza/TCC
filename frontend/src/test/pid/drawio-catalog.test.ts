import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseCatalogSymbol } from "@/features/pid/catalog/catalog-symbol";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import { sanitizePidSvgAsset } from "@/features/pid/catalog/sanitized-svg-asset";
import { getCanonicalPortAnchorLayout } from "@/features/pid/domain/geometry";

describe("catálogo Draw.io P&ID", () => {
  it("publica apenas os 547 símbolos livres do Draw.io", () => {
    expect(localCatalog).toHaveLength(547);
    expect(localCatalog.every((symbol) => symbol.standards.length === 1 && symbol.standards[0] === "free"))
      .toBe(true);
    expect(localCatalog.some((symbol) => symbol.key.startsWith("project."))).toBe(false);
    expect(localCatalog.some((symbol) => /\/(pump|tank|valve|instrument)\.svg$/.test(symbol.assetUrl)))
      .toBe(false);
  });

  it("publica todos os 478 stencils do commit fixado", () => {
    const drawio = localCatalog.filter((symbol) => symbol.key.startsWith("drawio.pid."));

    expect(drawio).toHaveLength(478);
    expect(drawio.every((symbol) => symbol.assetUrl.startsWith("/pid/symbols/drawio-"))).toBe(true);
    expect(new Set(drawio.map((symbol) => symbol.key)).size).toBe(478);
  });

  it("publica as 69 variantes programáticas de shapes/pid2", () => {
    const pid2 = localCatalog.filter((symbol) => symbol.key.startsWith("drawio.pid2."));

    expect(pid2).toHaveLength(69);
    expect(pid2.every((symbol) => symbol.assetUrl.startsWith("/pid/symbols/drawio-pid2-"))).toBe(true);
  });

  it("preserva as constraints normalizadas da Cavity Pump", () => {
    const pump = localCatalog.find((symbol) => symbol.key === "drawio.pid.pumps.cavity-pump");

    expect(pump).toBeDefined();
    expect(pump?.portTemplates).toMatchObject([
      { key: "sw", anchor: { x: 0.12, y: 1 } },
      { key: "se", anchor: { x: 0.485, y: 1 } },
    ]);
  });

  it("mantém os 478 SVGs locais compatíveis com o sanitizador do editor", () => {
    const drawio = localCatalog.filter((symbol) => symbol.source.sourceName === "Draw.io P&ID");

    for (const symbol of drawio) {
      const source = readFileSync(resolve(process.cwd(), "public", symbol.assetUrl.replace(/^\//, "")), "utf8");
      expect(sanitizePidSvgAsset(source).viewBox, symbol.key).toBe(symbol.viewBox);
    }
    expect(drawio.reduce((total, symbol) => total + symbol.portTemplates.length, 0)).toBeGreaterThanOrEqual(1_658);
  });

  it("aceita âncoras normalizadas e as projeta na posição exata do símbolo", () => {
    const parsed = parseCatalogSymbol({
      ...localCatalog[0],
      portTemplates: [
        {
          ...localCatalog[0].portTemplates[0],
          key: "drawio-sw",
          direction: "bidirectional",
          anchor: { x: 0.12, y: 1 },
        },
      ],
    });
    const ports = parsed.portTemplates as readonly {
      direction: "bidirectional";
      anchor: { x: number; y: number };
    }[];

    expect(getCanonicalPortAnchorLayout({ width: 123.77, height: 35 }, ports)).toEqual([
      { position: "bottom", x: 14.8524, y: 35 },
    ]);
  });
});
