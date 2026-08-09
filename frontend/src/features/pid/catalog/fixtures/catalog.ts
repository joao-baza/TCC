import { LOCAL_PID_CATALOG_VERSION } from "../../domain/catalog-version";
import type { CatalogSymbol } from "../catalog-symbol";
export type { CatalogProvenance, CatalogSourceKind, CatalogSymbol } from "../catalog-symbol";

const projectSource = {
  sourceKind: "project",
  sourceName: "DCOU P&ID",
  license: {
    name: "Projeto original - uso no DCOU",
    reference: "Ativos vetoriais originais do projeto DCOU P&ID.",
  },
  attribution: "Ativo vetorial original do projeto DCOU P&ID.",
} as const;

export const localCatalog = [
  {
    key: "project.pump.centrifugal",
    name: "Bomba centrífuga",
    aliases: ["bomba centrifuga", "centrifugal pump", "pump"],
    category: "Equipamentos",
    assetUrl: "/pid/symbols/pump.svg",
    viewBox: "0 0 120 80",
    defaultSize: { width: 96, height: 64 },
    portTemplates: [
      { key: "suction", direction: "input", connectionClass: "process", capacity: 1 },
      { key: "discharge", direction: "output", connectionClass: "process", capacity: 1 },
    ],
    standards: ["free", "isa"],
    catalogVersion: LOCAL_PID_CATALOG_VERSION,
    source: projectSource,
  },
  {
    key: "project.tank.storage",
    name: "Tanque de armazenamento",
    aliases: ["tanque", "reservatorio", "storage tank", "tank"],
    category: "Equipamentos",
    assetUrl: "/pid/symbols/tank.svg",
    viewBox: "0 0 120 80",
    defaultSize: { width: 80, height: 72 },
    portTemplates: [
      { key: "inlet", direction: "input", connectionClass: "process", capacity: 2 },
      { key: "outlet", direction: "output", connectionClass: "process", capacity: 1 },
    ],
    standards: ["free", "iso"],
    catalogVersion: LOCAL_PID_CATALOG_VERSION,
    source: projectSource,
  },
  {
    key: "project.valve.control",
    name: "Válvula de controle",
    aliases: ["valvula", "valvula de controle", "control valve", "valve"],
    category: "Válvulas",
    assetUrl: "/pid/symbols/valve.svg",
    viewBox: "0 0 120 80",
    defaultSize: { width: 72, height: 56 },
    portTemplates: [
      { key: "inlet", direction: "input", connectionClass: "process", capacity: 1 },
      { key: "outlet", direction: "output", connectionClass: "process", capacity: 1 },
      { key: "signal", direction: "input", connectionClass: "signal", capacity: 1 },
    ],
    standards: ["free", "isa", "iso"],
    catalogVersion: LOCAL_PID_CATALOG_VERSION,
    source: projectSource,
  },
  {
    key: "project.instrument.flow-indicator",
    name: "Indicador de vazão",
    aliases: ["indicador de vazao", "medidor de vazao", "flow indicator", "fi"],
    category: "Instrumentação",
    assetUrl: "/pid/symbols/instrument.svg",
    viewBox: "0 0 120 80",
    defaultSize: { width: 56, height: 56 },
    portTemplates: [
      { key: "process", direction: "bidirectional", connectionClass: "process", capacity: 1 },
      { key: "signal", direction: "output", connectionClass: "signal", capacity: 1 },
    ],
    standards: ["free", "isa"],
    catalogVersion: LOCAL_PID_CATALOG_VERSION,
    source: projectSource,
  },
] satisfies readonly CatalogSymbol[];
