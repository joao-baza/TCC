import type { CatalogSymbol } from "../catalog-symbol";
import { LOCAL_PID_CATALOG_VERSION } from "../../domain/catalog-version";

type FittingDefinition = Readonly<{
  slug: string;
  name: string;
  aliases: readonly string[];
  category: "Tubulação modular" | "Válvulas modulares";
  viewBox: string;
  defaultSize: Readonly<{ width: number; height: number }>;
  portTemplates: CatalogSymbol["portTemplates"];
}>;

const projectSource = {
  sourceKind: "project",
  sourceName: "DCOU P&ID",
  license: {
    name: "Projeto original - uso no DCOU",
    reference: "Ativos vetoriais originais do projeto DCOU P&ID.",
  },
  attribution: "Ativo vetorial original do projeto DCOU P&ID.",
} as const;

const processPort = (key: string, x: number, y: number) => ({
  key,
  direction: "bidirectional" as const,
  connectionClass: "process" as const,
  capacity: 1,
  anchor: { x, y },
});

function fitting(definition: FittingDefinition): CatalogSymbol {
  return {
    key: `project.pid.fittings.${definition.slug}`,
    name: definition.name,
    aliases: definition.aliases,
    category: definition.category,
    assetUrl: `/pid/symbols/project-fittings-${definition.slug}.svg`,
    viewBox: definition.viewBox,
    defaultSize: definition.defaultSize,
    portTemplates: definition.portTemplates,
    standards: ["free"],
    catalogVersion: LOCAL_PID_CATALOG_VERSION,
    source: projectSource,
  };
}

export const projectFittingsCatalog = [
  fitting({
    slug: "retorno-180",
    name: "Retorno 180°",
    aliases: ["retorno 180", "curva em u", "return bend", "u bend"],
    category: "Tubulação modular",
    viewBox: "0 0 80 64",
    defaultSize: { width: 80, height: 64 },
    portTemplates: [
      processPort("upper", 14 / 80, 14 / 64),
      processPort("lower", 14 / 80, 50 / 64),
    ],
  }),
  fitting({
    slug: "cotovelo-90-raio-longo",
    name: "Cotovelo 90° raio longo",
    aliases: ["cotovelo raio longo", "cotovelo 90 longo", "long radius elbow"],
    category: "Tubulação modular",
    viewBox: "0 0 72 72",
    defaultSize: { width: 72, height: 72 },
    portTemplates: [
      processPort("horizontal", 6 / 72, 56 / 72),
      processPort("vertical", 64 / 72, 6 / 72),
    ],
  }),
  fitting({
    slug: "cotovelo-90-raio-curto",
    name: "Cotovelo 90° raio curto",
    aliases: ["cotovelo raio curto", "cotovelo 90 curto", "short radius elbow"],
    category: "Tubulação modular",
    viewBox: "0 0 64 64",
    defaultSize: { width: 64, height: 64 },
    portTemplates: [
      processPort("horizontal", 6 / 64, 48 / 64),
      processPort("vertical", 56 / 64, 6 / 64),
    ],
  }),
  fitting({
    slug: "cotovelo-90-raio-medio",
    name: "Cotovelo 90° raio médio",
    aliases: ["cotovelo raio medio", "cotovelo 90 medio", "medium radius elbow"],
    category: "Tubulação modular",
    viewBox: "0 0 68 68",
    defaultSize: { width: 68, height: 68 },
    portTemplates: [
      processPort("horizontal", 6 / 68, 52 / 68),
      processPort("vertical", 60 / 68, 6 / 68),
    ],
  }),
  fitting({
    slug: "te-passagem-reta",
    name: "Tê (passagem reta)",
    aliases: ["te passagem reta", "tee", "t junction"],
    category: "Tubulação modular",
    viewBox: "0 0 88 72",
    defaultSize: { width: 88, height: 72 },
    portTemplates: [
      processPort("left", 0, 42 / 72),
      processPort("right", 1, 42 / 72),
      processPort("branch", 44 / 88, 8 / 72),
    ],
  }),
  fitting({
    slug: "saida-de-tanque",
    name: "Saída de tanque",
    aliases: ["saida de tanque", "bocal de tanque", "tank outlet"],
    category: "Tubulação modular",
    viewBox: "0 0 88 56",
    defaultSize: { width: 88, height: 56 },
    portTemplates: [
      processPort("tank", 4 / 88, 28 / 56),
      processPort("pipe", 1, 28 / 56),
    ],
  }),
  fitting({
    slug: "entrada-normal",
    name: "Entrada normal",
    aliases: ["entrada normal", "entrada de tubulacao", "normal entrance", "pipe entrance"],
    category: "Tubulação modular",
    viewBox: "0 0 80 48",
    defaultSize: { width: 80, height: 48 },
    portTemplates: [
      processPort("source", 6 / 80, 24 / 48),
      processPort("pipe", 1, 24 / 48),
    ],
  }),
  fitting({
    slug: "valvula-diafragma",
    name: "Válvula diafragma",
    aliases: ["valvula diafragma", "diaphragm valve"],
    category: "Válvulas modulares",
    viewBox: "0 0 96 48",
    defaultSize: { width: 96, height: 48 },
    portTemplates: [processPort("left", 0, 0.5), processPort("right", 1, 0.5)],
  }),
  fitting({
    slug: "valvula-esfera",
    name: "Válvula esfera",
    aliases: ["valvula esfera", "ball valve"],
    category: "Válvulas modulares",
    viewBox: "0 0 96 48",
    defaultSize: { width: 96, height: 48 },
    portTemplates: [processPort("left", 0, 0.5), processPort("right", 1, 0.5)],
  }),
  fitting({
    slug: "valvula-gaveta",
    name: "Válvula gaveta",
    aliases: ["valvula gaveta", "gate valve"],
    category: "Válvulas modulares",
    viewBox: "0 0 96 48",
    defaultSize: { width: 96, height: 48 },
    portTemplates: [processPort("left", 0, 0.5), processPort("right", 1, 0.5)],
  }),
  fitting({
    slug: "valvula-retencao-de-pe",
    name: "Válvula retenção de pé",
    aliases: ["valvula retencao de pe", "foot valve"],
    category: "Válvulas modulares",
    viewBox: "0 0 96 56",
    defaultSize: { width: 96, height: 56 },
    portTemplates: [processPort("left", 0, 0.5), processPort("right", 1, 0.5)],
  }),
  fitting({
    slug: "valvula-agulha",
    name: "Válvula agulha",
    aliases: ["valvula agulha", "needle valve"],
    category: "Válvulas modulares",
    viewBox: "0 0 96 56",
    defaultSize: { width: 96, height: 56 },
    portTemplates: [processPort("left", 0, 0.5), processPort("right", 1, 0.5)],
  }),
  fitting({
    slug: "valvula-globo-aberta",
    name: "Válvula globo (aberta)",
    aliases: ["valvula globo", "valvula globo aberta", "globe valve"],
    category: "Válvulas modulares",
    viewBox: "0 0 96 56",
    defaultSize: { width: 96, height: 56 },
    portTemplates: [processPort("left", 0, 0.5), processPort("right", 1, 0.5)],
  }),
  fitting({
    slug: "valvula-borboleta",
    name: "Válvula borboleta",
    aliases: ["valvula borboleta", "butterfly valve"],
    category: "Válvulas modulares",
    viewBox: "0 0 96 48",
    defaultSize: { width: 96, height: 48 },
    portTemplates: [processPort("left", 0, 0.5), processPort("right", 1, 0.5)],
  }),
  fitting({
    slug: "valvula-retencao-leve",
    name: "Válvula retenção, leve",
    aliases: ["valvula retencao leve", "check valve", "light check valve"],
    category: "Válvulas modulares",
    viewBox: "0 0 96 48",
    defaultSize: { width: 96, height: 48 },
    portTemplates: [processPort("left", 0, 0.5), processPort("right", 1, 0.5)],
  }),
] as const;
