export type ProductSectionId = "home" | "simulations" | "trails" | "resources" | "teaching";

export type SimulationModuleId = "piping" | "sizing" | "flow" | "glossary";

export type NavigationTarget = ProductSectionId | SimulationModuleId | `${SimulationModuleId}-content`;

export type ProductSection = {
  id: ProductSectionId;
  label: string;
  href: `#${ProductSectionId}`;
};

export type SimulationModule = {
  id: SimulationModuleId;
  label: string;
  group: "Hidráulica & Escoamento" | "Recursos";
  href: `#${SimulationModuleId}`;
};

const TOP_LEVEL_SECTIONS: readonly ProductSection[] = [
  { id: "home", label: "Início", href: "#home" },
  { id: "simulations", label: "Simulações", href: "#simulations" },
  { id: "trails", label: "Trilhas", href: "#trails" },
  { id: "resources", label: "Recursos", href: "#resources" },
  { id: "teaching", label: "Docência", href: "#teaching" }
] as const;

const SIMULATION_MODULES: readonly SimulationModule[] = [
  { id: "piping", label: "Tubulações", group: "Hidráulica & Escoamento", href: "#piping" },
  { id: "sizing", label: "Dimensionamento", group: "Hidráulica & Escoamento", href: "#sizing" },
  { id: "flow", label: "Escoamento", group: "Hidráulica & Escoamento", href: "#flow" },
  { id: "glossary", label: "Glossário", group: "Recursos", href: "#glossary" }
] as const;

export const productSections = TOP_LEVEL_SECTIONS;
export const simulationModules = SIMULATION_MODULES;
export const shellNavigation = {
  topLevel: productSections,
  simulations: simulationModules
} as const;

const SHELL_SECTION_TARGETS = new Set<ProductSectionId>([
  "home",
  "simulations",
  "trails",
  "resources",
  "teaching"
]);

const MODULE_TARGETS = new Set<SimulationModuleId>([
  "piping",
  "sizing",
  "flow",
  "glossary"
]);

export function resolveProductSection(target?: string): ProductSectionId {
  if (!target || target === "home-content") {
    return "home";
  }

  if (SHELL_SECTION_TARGETS.has(target as ProductSectionId)) {
    return target as ProductSectionId;
  }

  if (
    target === "piping-content" ||
    target === "sizing-content" ||
    target === "flow-content" ||
    target === "glossary-content" ||
    target === "piping" ||
    target === "sizing" ||
    target === "flow" ||
    target === "glossary"
  ) {
    return "simulations";
  }

  return "home";
}

export function resolveSimulationModule(target?: string): SimulationModuleId | undefined {
  if (!target) {
    return undefined;
  }

  if (MODULE_TARGETS.has(target as SimulationModuleId)) {
    return target as SimulationModuleId;
  }

  if (target === "piping-content") {
    return "piping";
  }

  if (target === "sizing-content") {
    return "sizing";
  }

  if (target === "flow-content") {
    return "flow";
  }

  if (target === "glossary-content") {
    return "glossary";
  }

  return undefined;
}
