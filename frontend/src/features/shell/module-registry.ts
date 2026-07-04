export type ProductSectionId =
  | "home"
  | "simulations"
  | "trails"
  | "resources"
  | "teaching";

export type SimulationModuleId =
  | "piping"
  | "sizing"
  | "flow"
  | "glossary";

export const productSections = [
  { id: "home", label: "Início" },
  { id: "simulations", label: "Simulações" },
  { id: "trails", label: "Trilhas" },
  { id: "resources", label: "Recursos" },
  { id: "teaching", label: "Docência" }
] as const;

export const simulationModules = [
  { id: "piping", label: "Tubulações", group: "Hidráulica & Escoamento" },
  { id: "sizing", label: "Dimensionamento", group: "Hidráulica & Escoamento" },
  { id: "flow", label: "Escoamento", group: "Hidráulica & Escoamento" },
  { id: "glossary", label: "Glossário", group: "Recursos" }
] as const;
