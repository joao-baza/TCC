import { productSections, simulationModules } from "@/features/shell/module-registry";

export const shellNavigation = {
  topLevel: productSections,
  simulations: simulationModules
};

export const quickAccessModules = [
  { group: "Hidráulica", label: "Tubulações", target: "piping" },
  { group: "Hidráulica", label: "Dimensionamento", target: "sizing" },
  { group: "Hidráulica", label: "Escoamento", target: "flow" },
  { group: "Bombas", label: "Perda de Carga & NPSH", disabled: true },
  { group: "Propriedades", label: "Componentes", disabled: true },
  { group: "Reatores", label: "CSTR / PFR", disabled: true },
  { group: "Balanço", label: "Balanço de Massa", disabled: true }
] as const;

export const learningTrails = [
  {
    badge: "1",
    title: "Transporte de Fluidos",
    description: "Tubulações → Dimensionamento → Escoamento → Bombas"
  },
  {
    badge: "2",
    title: "Reatores Ideais",
    description: "Propriedades de Componentes → Reator CSTR / PFR"
  },
  {
    badge: "3",
    title: "Balanço de Massa",
    description: "Componentes → Balanço de Massa"
  }
] as const;
