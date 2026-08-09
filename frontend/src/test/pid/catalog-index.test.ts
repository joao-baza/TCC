import { describe, expect, it } from "vitest";

import { createCatalogIndex } from "@/features/pid/catalog/catalog-index";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";

describe("createCatalogIndex", () => {
  it("encontra bomba por alias em português sem acento", () => {
    const index = createCatalogIndex(localCatalog);

    expect(index.search("bomba centrifuga", { standard: "free" }).map((item) => item.key))
      .toContain("project.pump.centrifugal");
  });

  it("não mistura símbolos exclusivos ISA e ISO", () => {
    const index = createCatalogIndex(localCatalog);

    expect(index.search("", { standard: "isa" }).every((item) => item.standards.includes("isa")))
      .toBe(true);
    expect(index.search("", { standard: "iso" }).every((item) => item.standards.includes("iso")))
      .toBe(true);
  });

  it("prioriza nome e alias exatos antes de correspondências parciais", () => {
    const index = createCatalogIndex([
      ...localCatalog,
      { ...localCatalog[0], key: "project.fixture.pump", name: "Bomba auxiliar", aliases: ["bomba"] },
    ]);

    expect(index.search("bomba", { standard: "free" }).map((item) => item.key).slice(0, 2))
      .toEqual(["project.fixture.pump", "project.pump.centrifugal"]);
  });

  it("protege o índice contra mutações do chamador", () => {
    const source = [...localCatalog];
    const index = createCatalogIndex(source);
    source[0] = { ...source[0], name: "Corrompido" };

    const result = index.search("bomba", { standard: "free" });
    expect(result[0].name).not.toBe("Corrompido");
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it("desanexa propriedades opcionais aninhadas", () => {
    const source = [{
      ...localCatalog[0],
      properties: { configuration: { mode: "original" } },
    }];
    const index = createCatalogIndex(source);
    (source[0].properties?.configuration as { mode: string }).mode = "corrompido";

    expect((index.search("bomba", { standard: "free" })[0].properties?.configuration as { mode: string }).mode)
      .toBe("original");
  });

  it("rejeita chaves repetidas e símbolos sem portas", () => {
    expect(() => createCatalogIndex([...localCatalog, localCatalog[0]])).toThrow("duplicada");
    expect(() => createCatalogIndex([{ ...localCatalog[0], portTemplates: [] }])).toThrow("porta");
  });

  it("rejeita aliases vazios e tamanhos não finitos", () => {
    expect(() => createCatalogIndex([{ ...localCatalog[0], aliases: [""] }])).toThrow("aliases");
    expect(() => createCatalogIndex([{
      ...localCatalog[0],
      defaultSize: { width: Number.NaN, height: 64 },
    }])).toThrow("tamanho");
  });
});
