import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createCatalogIndex } from "@/features/pid/catalog/catalog-index";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import { sanitizePidSvgAsset } from "@/features/pid/catalog/sanitized-svg-asset";
import { applyCommand, insertSymbol } from "@/features/pid/domain/commands";
import { createEmptyDocument } from "@/features/pid/domain/schema";

const fittingPrefix = "project.pid.fittings.";

describe("catálogo de fittings modulares do projeto", () => {
  it("publica os 15 fittings selecionados como assets próprios e livres", () => {
    const fittings = localCatalog.filter((symbol) => symbol.key.startsWith(fittingPrefix));

    expect(fittings).toHaveLength(15);
    expect(fittings.every((symbol) => symbol.source.sourceKind === "project")).toBe(true);
    expect(fittings.every((symbol) => symbol.standards.length === 1 && symbol.standards[0] === "free")).toBe(true);
    expect(new Set(fittings.map((symbol) => symbol.key)).size).toBe(15);
  });

  it("mantém cada SVG promovido compatível com o sanitizador do editor", () => {
    const fittings = localCatalog.filter((symbol) => symbol.key.startsWith(fittingPrefix));

    for (const symbol of fittings) {
      const source = readFileSync(resolve(process.cwd(), "public", symbol.assetUrl.replace(/^\//, "")), "utf8");
      expect(sanitizePidSvgAsset(source).viewBox, symbol.key).toBe(symbol.viewBox);
    }
  });

  it("encontra os fittings pelos nomes e aliases em português", () => {
    const index = createCatalogIndex(localCatalog);

    expect(index.search("válvula esfera", { standard: "free" })[0]?.key)
      .toBe("project.pid.fittings.valvula-esfera");
    expect(index.search("cotovelo raio curto", { standard: "free" }).map((symbol) => symbol.key))
      .toContain("project.pid.fittings.cotovelo-90-raio-curto");
  });

  it("insere o tê com três portas de processo nas âncoras visuais", () => {
    const tee = localCatalog.find((symbol) => symbol.key === "project.pid.fittings.te-passagem-reta");
    expect(tee).toBeDefined();
    expect(tee?.portTemplates).toEqual([
      expect.objectContaining({ key: "left", anchor: { x: 0, y: 42 / 72 } }),
      expect.objectContaining({ key: "right", anchor: { x: 1, y: 42 / 72 } }),
      expect.objectContaining({ key: "branch", anchor: { x: 44 / 88, y: 8 / 72 } }),
    ]);

    const ids = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000004",
    ];
    const inserted = applyCommand(
      createEmptyDocument({ title: "Fittings", standard: "free" }),
      insertSymbol(tee!, { x: 120, y: 80 }),
      { generateId: () => ids.shift()!, now: () => new Date("2026-08-10T00:00:00.000Z") },
    );

    expect(inserted.nodes["00000000-0000-4000-8000-000000000001"]).toMatchObject({
      symbolKey: tee?.key,
      width: 88,
      height: 72,
      x: 120,
      y: 80,
    });
    expect(Object.values(inserted.ports)).toMatchObject([
      { templateKey: "left", connectionClass: "process", anchor: { x: 0, y: 42 / 72 } },
      { templateKey: "right", connectionClass: "process", anchor: { x: 1, y: 42 / 72 } },
      { templateKey: "branch", connectionClass: "process", anchor: { x: 44 / 88, y: 8 / 72 } },
    ]);
  });
});
