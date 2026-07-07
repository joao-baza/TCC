export const moduleRoutes = [
  { path: "/", label: "Início", group: "root" },
  { path: "/piping", label: "Tubulações", group: "Hidráulica & Escoamento" },
  {
    path: "/sizing",
    label: "Dimensionamento",
    group: "Hidráulica & Escoamento",
  },
  { path: "/flow", label: "Escoamento", group: "Hidráulica & Escoamento" },
  { path: "/pump", label: "Perda de Carga & NPSH", group: "Bombas" },
  { path: "/components", label: "Componentes", group: "Propriedades" },
  { path: "/reactor", label: "CSTR / PFR", group: "Reatores" },
  { path: "/balance", label: "Balanço", group: "Balanço de Massa" },
  { path: "/glossary", label: "Glossário", group: "Ferramentas" },
  {
    path: "/exercises",
    label: "Exercícios Integrados",
    group: "Ferramentas",
  },
] as const;
