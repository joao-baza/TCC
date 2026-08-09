import { describe, expect, it, vi } from "vitest";

import { CatalogValidationError, createCatalogIndex } from "@/features/pid/catalog/catalog-index";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import { applyCommand, insertSymbol } from "@/features/pid/domain/commands";
import { LOCAL_PID_CATALOG_VERSION } from "@/features/pid/domain/catalog-version";
import { createEmptyDocument } from "@/features/pid/domain/schema";

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

  it.each(localCatalog.flatMap((symbol) => symbol.standards.map((standard) => [symbol, standard] as const)))(
    "insere %s em um documento local %s compatível",
    (symbol, standard) => {
      const document = createEmptyDocument({ title: "Novo P&ID", standard });
      const inserted = applyCommand(document, insertSymbol(symbol, { x: 24, y: 32 }));

      expect(document.metadata.catalogVersion).toBe(LOCAL_PID_CATALOG_VERSION);
      expect(Object.values(inserted.nodes)[0]).toMatchObject({
        symbolKey: symbol.key,
        catalogVersion: LOCAL_PID_CATALOG_VERSION,
      });
    },
  );

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

  it("desanexa e congela a licença aninhada da proveniência", () => {
    const source = [{
      ...localCatalog[0],
      source: {
        ...localCatalog[0].source,
        license: { ...localCatalog[0].source.license },
      },
    }];
    const index = createCatalogIndex(source);
    (source[0].source.license as { name: string }).name = "Corrompida";
    const returnedLicense = index.search("bomba", { standard: "free" })[0].source.license;

    expect(returnedLicense.name).toBe("Projeto original - uso no DCOU");
    expect(Object.isFrozen(returnedLicense)).toBe(true);
    expect(() => { (returnedLicense as { name: string }).name = "Mutada"; }).toThrow();
    expect(index.search("bomba", { standard: "free" })[0].source.license.name)
      .toBe("Projeto original - uso no DCOU");
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

  it.each([
    ["versão em branco", { catalogVersion: "  " }, "versão de catálogo", ["catalogVersion"]],
    ["fonte sem nome", { source: { ...localCatalog[0].source, sourceName: " " } }, "proveniência", ["source", "sourceName"]],
    ["licença sem nome", { source: { ...localCatalog[0].source, license: { ...localCatalog[0].source.license, name: " " } } }, "proveniência", ["source", "license", "name"]],
    ["licença sem referência", { source: { ...localCatalog[0].source, license: { ...localCatalog[0].source.license, reference: " " } } }, "proveniência", ["source", "license", "reference"]],
    ["atribuição em branco", { source: { ...localCatalog[0].source, attribution: " " } }, "proveniência", ["source", "attribution"]],
    ["viewBox sem largura positiva", { viewBox: "0 0 0 80" }, "viewBox", ["viewBox"]],
    ["viewBox não finito", { viewBox: "0 0 NaN 80" }, "viewBox", ["viewBox"]],
    ["ativo fora do manifesto local", { assetUrl: "https://externo.test/symbol.svg" }, "metadados", ["assetUrl"]],
    ["porta sem chave", { portTemplates: [{ ...localCatalog[0].portTemplates[0], key: " " }] }, "porta", ["portTemplates", 0, "key"]],
    ["capacidade fracionária", { portTemplates: [{ ...localCatalog[0].portTemplates[0], capacity: 1.5 }] }, "porta", ["portTemplates", 0, "capacity"]],
    ["chave de porta normalizada duplicada", {
      portTemplates: [
        { ...localCatalog[0].portTemplates[0], key: "signal" },
        { ...localCatalog[0].portTemplates[1], key: " SIGNAL " },
      ],
    }, "porta duplicada", ["portTemplates", 1, "key"]],
  ])("rejeita %s", (_label, patch, message, path) => {
    let thrown: unknown;
    try {
      createCatalogIndex([{ ...localCatalog[0], ...patch }]);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(CatalogValidationError);
    expect(thrown).toMatchObject({ message: expect.stringContaining(message), path });
  });

  it("não ordena nem classifica novamente uma busca vazia em catálogo grande", () => {
    const catalog = Array.from({ length: 400 }, (_, index) => ({
      ...localCatalog[0],
      key: `project.synthetic.${String(400 - index).padStart(3, "0")}`,
      name: `Bomba ${index}`,
      aliases: [`pump ${index}`],
    }));
    const index = createCatalogIndex(catalog);
    const expectedKeys = catalog.map((symbol) => symbol.key).sort();
    const sort = vi.spyOn(Array.prototype, "sort");

    const result = index.search("", { standard: "free" });

    expect(result).toHaveLength(400);
    expect(result.map((symbol) => symbol.key)).toEqual(expectedKeys);
    expect(sort).not.toHaveBeenCalled();
    sort.mockRestore();
  });
});
