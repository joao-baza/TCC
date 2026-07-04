export type ProductSectionId = "home" | "simulations" | "trails" | "resources" | "teaching";

export type SimulationModuleId = "piping" | "sizing" | "flow" | "glossary";

export type NavigationTarget = ProductSectionId | SimulationModuleId | `${SimulationModuleId}-content`;

export type ProductSection = {
  id: ProductSectionId;
  label: string;
  href: `#${ProductSectionId}`;
  aliases: readonly string[];
};

export type SimulationModule = {
  id: SimulationModuleId;
  label: string;
  group: "Hidráulica & Escoamento" | "Recursos";
  href: `#${SimulationModuleId}`;
  aliases: readonly string[];
};

const TOP_LEVEL_SECTIONS: readonly ProductSection[] = [
  { id: "home", label: "Início", href: "#home", aliases: ["home-content"] },
  { id: "simulations", label: "Simulações", href: "#simulations", aliases: ["simulations-content"] },
  { id: "trails", label: "Trilhas", href: "#trails", aliases: ["trails-content"] },
  { id: "resources", label: "Recursos", href: "#resources", aliases: ["resources-content"] },
  { id: "teaching", label: "Docência", href: "#teaching", aliases: ["teaching-content"] }
] as const;

const SIMULATION_MODULES: readonly SimulationModule[] = [
  {
    id: "piping",
    label: "Tubulações",
    group: "Hidráulica & Escoamento",
    href: "#piping",
    aliases: ["piping-content"]
  },
  {
    id: "sizing",
    label: "Dimensionamento",
    group: "Hidráulica & Escoamento",
    href: "#sizing",
    aliases: ["sizing-content"]
  },
  {
    id: "flow",
    label: "Escoamento",
    group: "Hidráulica & Escoamento",
    href: "#flow",
    aliases: ["flow-content"]
  },
  {
    id: "glossary",
    label: "Glossário",
    group: "Recursos",
    href: "#glossary",
    aliases: ["glossary-content"]
  }
] as const;

export const productSections = TOP_LEVEL_SECTIONS;
export const simulationModules = SIMULATION_MODULES;
export const shellNavigation = {
  topLevel: productSections,
  simulations: simulationModules
} as const;

export function resolveProductSection(target?: string): ProductSectionId {
  if (!target || target === "home-content") {
    return "home";
  }

  const matchedSection = TOP_LEVEL_SECTIONS.find(
    (section) => section.id === target || section.aliases.includes(target)
  );

  if (matchedSection) {
    return matchedSection.id;
  }

  if (SIMULATION_MODULES.some((module) => module.id === target || module.aliases.includes(target))) {
    return "simulations";
  }

  return "home";
}

export function resolveSimulationModule(target?: string): SimulationModuleId | undefined {
  if (!target) {
    return undefined;
  }

  return SIMULATION_MODULES.find((module) => module.id === target || module.aliases.includes(target))?.id;
}
