import { productSections, simulationModules } from "@/features/shell/module-registry";

export const shellNavigation = {
  topLevel: productSections,
  simulations: simulationModules
};

export const quickAccessModules = [
  { group: "Hidráulica", label: "Tubulações" },
  { group: "Hidráulica", label: "Dimensionamento" },
  { group: "Hidráulica", label: "Escoamento" },
  { group: "Bombas", label: "Perda de Carga & NPSH" },
  { group: "Propriedades", label: "Componentes" },
  { group: "Reatores", label: "CSTR / PFR" },
  { group: "Balanço", label: "Balanço de Massa" }
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
