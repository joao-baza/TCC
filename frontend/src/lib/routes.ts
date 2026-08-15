import { PID_EDITOR_ENABLED } from "@/features/pid/routing/active-pid-route";

export function createModuleRoutes(includePid: boolean) {
  return [
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
    ...(includePid
      ? [{ path: "/pid", label: "Editor P&ID", group: "Ferramentas" }]
      : []),
  ] as const;
}

export const moduleRoutes = createModuleRoutes(PID_EDITOR_ENABLED);
