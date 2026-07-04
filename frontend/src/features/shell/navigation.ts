import {
  productSections,
  quickAccessModules,
  simulationModules
} from "@/features/shell/module-registry";

export const shellNavigation = {
  topLevel: productSections,
  simulations: simulationModules
};

export { quickAccessModules };

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
