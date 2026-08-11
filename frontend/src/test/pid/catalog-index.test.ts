import { describe, expect, it, vi } from "vitest";

import { CatalogValidationError, createCatalogIndex } from "@/features/pid/catalog/catalog-index";
import { parseCatalogManifest, parseCatalogManifestJson, parseCatalogSymbol } from "@/features/pid/catalog/catalog-symbol";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";
import { applyCommand, insertSymbol } from "@/features/pid/domain/commands";
import { LOCAL_PID_CATALOG_VERSION } from "@/features/pid/domain/catalog-version";
import { createEmptyDocument } from "@/features/pid/domain/schema";

describe("createCatalogIndex", () => {
  it.each([
    ["accessor", () => {
      const value = { ...localCatalog[0] } as Record<string, unknown>;
      Object.defineProperty(value, "name", { enumerable: true, get: () => "Bomba" });
      return value;
    }],
    ["prototype não simples", () => Object.assign(Object.create({ inherited: true }), localCatalog[0])],
    ["símbolo próprio", () => {
      const value = { ...localCatalog[0] } as Record<PropertyKey, unknown>;
      value[Symbol("catalog")] = true;
      return value;
    }],
    ["proxy", () => new Proxy({ ...localCatalog[0] }, { getOwnPropertyDescriptor: () => { throw new Error("trap"); } })],
    ["array esparso", () => ({ ...localCatalog[0], aliases: new Array(1) })],
    ["ciclo", () => {
      const properties: Record<string, unknown> = {};
      properties.self = properties;
      return { ...localCatalog[0], properties };
    }],
  ])("rejeita decoder adversarial: %s", (_label, makeValue) => {
    expect(() => parseCatalogSymbol(makeValue())).toThrow(CatalogValidationError);
  });

  it("não aceita chaves não canônicas nem caminhos de ativo ambíguos", () => {
    expect(() => parseCatalogSymbol({ ...localCatalog[0], key: "Project.Pump" })).toThrow("key");
    expect(() => parseCatalogSymbol({ ...localCatalog[0], portTemplates: [{ ...localCatalog[0].portTemplates[0], key: "Signal" }] }))
      .toThrow("key");
    expect(() => parseCatalogSymbol({ ...localCatalog[0], assetUrl: "/pid/symbols/%2e%2e/pump.svg" })).toThrow("asset");
    expect(() => parseCatalogSymbol({ ...localCatalog[0], assetUrl: "/pid/symbols/pump.svg?x=1" })).toThrow("asset");
  });

  it("rejeita accessors sem executá-los", () => {
    let reads = 0;
    const value = { ...localCatalog[0] } as Record<string, unknown>;
    Object.defineProperty(value, "name", { enumerable: true, get: () => { reads += 1; return "Bomba"; } });
    expect(() => parseCatalogSymbol(value)).toThrow(CatalogValidationError);
    expect(reads).toBe(0);
  });

  it("decodifica a lista externa por descritores e rejeita fronteiras adversariais", () => {
    expect(() => parseCatalogManifest(new Proxy([], { ownKeys: () => { throw new Error("trap"); } }))).toThrow(CatalogValidationError);
    expect(() => parseCatalogManifest(new Array(1))).toThrow(CatalogValidationError);
    expect(() => parseCatalogManifest(Array.from({ length: 501 }, () => localCatalog[0]))).toThrow(CatalogValidationError);
    let reads = 0;
    const nested = { ...localCatalog[0], source: { ...localCatalog[0].source } } as Record<string, unknown>;
    Object.defineProperty(nested.source as object, "sourceName", { enumerable: true, get: () => { reads += 1; return "DCOU"; } });
    expect(() => parseCatalogManifest([nested])).toThrow(CatalogValidationError);
    expect(reads).toBe(0);
    expect(() => parseCatalogManifestJson("[")).toThrow(CatalogValidationError);
    expect(() => parseCatalogManifestJson(`"${"x".repeat(1_000_001)}"`)).toThrow("bytes");
  });

  it("encontra bomba centrífuga pelo nome do Draw.io", () => {
    const index = createCatalogIndex(localCatalog);

    expect(index.search("centrifugal pump", { standard: "free" }).map((item) => item.key))
      .toContain("drawio.pid.pumps.centrifugal-pump-1");
  });

  it("publica fixtures profundamente congeladas", () => {
    const symbol = localCatalog[0];
    expect(Object.isFrozen(localCatalog)).toBe(true);
    expect(Object.isFrozen(symbol)).toBe(true);
    expect(Object.isFrozen(symbol.aliases)).toBe(true);
    expect(Object.isFrozen(symbol.standards)).toBe(true);
    expect(Object.isFrozen(symbol.defaultSize)).toBe(true);
    expect(Object.isFrozen(symbol.portTemplates)).toBe(true);
    expect(Object.isFrozen(symbol.portTemplates[0])).toBe(true);
    expect(Object.isFrozen(symbol.source)).toBe(true);
    expect(Object.isFrozen(symbol.source.license)).toBe(true);
  });

  it("publica apenas símbolos explicitamente livres", () => {
    const index = createCatalogIndex(localCatalog);

    expect(index.search("", { standard: "free" })).toHaveLength(562);
    expect(index.search("", { standard: "free" }).every((item) => item.standards.length === 1
      && item.standards[0] === "free")).toBe(true);
  });

  it("rejeita classificações normativas antigas no catálogo", () => {
    expect(() => parseCatalogSymbol({ ...localCatalog[0], standards: ["iso"] })).toThrow("normas");
    expect(() => parseCatalogSymbol({ ...localCatalog[0], standards: ["isa"] })).toThrow("normas");
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
      { ...localCatalog[0], key: "drawio.fixture.agitator", name: "Agitador auxiliar", aliases: ["agitator"] },
    ]);

    expect(index.search("agitator", { standard: "free" }).map((item) => item.key).slice(0, 2))
      .toEqual(["drawio.fixture.agitator", "drawio.pid.agitators.agitator-anchor"]);
  });

  it("protege o índice contra mutações do chamador", () => {
    const source = [...localCatalog];
    const index = createCatalogIndex(source);
    source[0] = { ...source[0], name: "Corrompido" };

    const result = index.search("", { standard: "free" });
    expect(result[0].name).not.toBe("Corrompido");
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it("desanexa propriedades opcionais aninhadas", () => {
    const drawioFixture = localCatalog.find((symbol) => symbol.key === "drawio.pid.agitators.agitator-anchor")!;
    const source = [{
      ...drawioFixture,
      properties: { configuration: { mode: "original" } },
    }];
    const index = createCatalogIndex(source);
    (source[0].properties?.configuration as { mode: string }).mode = "corrompido";

    expect((index.search("agitator", { standard: "free" })[0].properties?.configuration as { mode: string }).mode)
      .toBe("original");
  });

  it("desanexa e congela a licença aninhada da proveniência", () => {
    const drawioFixture = localCatalog.find((symbol) => symbol.key === "drawio.pid.agitators.agitator-anchor")!;
    const source = [{
      ...drawioFixture,
      source: {
        ...drawioFixture.source,
        license: { ...drawioFixture.source.license },
      },
    }];
    const index = createCatalogIndex(source);
    (source[0].source.license as { name: string }).name = "Corrompida";
    const returnedLicense = index.search("agitator", { standard: "free" })[0].source.license;

    expect(returnedLicense.name).toBe("Apache-2.0");
    expect(Object.isFrozen(returnedLicense)).toBe(true);
    expect(() => { (returnedLicense as { name: string }).name = "Mutada"; }).toThrow();
    expect(index.search("agitator", { standard: "free" })[0].source.license.name)
      .toBe("Apache-2.0");
  });

  it("rejeita chaves repetidas e símbolos sem portas", () => {
    expect(() => createCatalogIndex([...localCatalog, localCatalog[0]])).toThrow("duplicada");
    expect(() => createCatalogIndex([{ ...localCatalog[0], portTemplates: [] }])).toThrow("porta");
  });

  it("rejeita aliases vazios e tamanhos não finitos", () => {
    expect(() => createCatalogIndex([{ ...localCatalog[0], aliases: [""] }])).toThrow("aliases");
    let aliasError: unknown;
    try { parseCatalogSymbol({ ...localCatalog[0], aliases: ["x".repeat(100_000)] }); } catch (error) { aliasError = error; }
    expect(aliasError).toMatchObject({ path: ["aliases", 0] });
    expect(() => createCatalogIndex([{
      ...localCatalog[0],
      defaultSize: { width: Number.NaN, height: 64 },
    }])).toThrow("tamanho");
  });

  it("valida portas pela geometria canônica sem acoplar o catálogo ao alvo DOM", () => {
    const parsed = parseCatalogSymbol({
      ...localCatalog[2],
      defaultSize: { width: 72, height: 56 },
    });
    expect(parsed.defaultSize).toEqual({ width: 72, height: 56 });
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
        { ...localCatalog[0].portTemplates[0], key: " SIGNAL " },
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
      key: `drawio.synthetic.item${String(400 - index).padStart(3, "0")}`,
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
