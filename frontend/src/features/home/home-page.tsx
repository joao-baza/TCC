import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

const trails = [
  {
    to: "/piping",
    title: "Transporte de Fluidos",
    description: "Tubulações → Dimensionamento → Escoamento → Bombas",
  },
  {
    to: "/reactor",
    title: "Reatores Ideais",
    description: "Propriedades de Componentes → Reator CSTR / PFR",
  },
  {
    to: "/balance",
    title: "Balanço de Massa",
    description: "Componentes → Balanço de Massa",
  },
];

const quickAccess = [
  { to: "/piping", group: "Hidráulica", label: "Tubulações" },
  { to: "/sizing", group: "Hidráulica", label: "Dimensionamento" },
  { to: "/flow", group: "Hidráulica", label: "Escoamento" },
  { to: "/pump", group: "Bombas", label: "Perda de Carga & NPSH" },
  { to: "/components", group: "Propriedades", label: "Componentes" },
  { to: "/reactor", group: "Reatores", label: "CSTR / PFR" },
  { to: "/balance", group: "Balanço", label: "Balanço de Massa" },
  { to: "/glossary", group: "Ferramentas", label: "Glossário" },
];

export function HomePage() {
  return (
    <section className="space-y-8 p-6 md:p-8">
      <Card>
        <CardHeader
          level={1}
          subtitle={
            "Use a barra lateral para navegar entre módulos, siga uma trilha se estiver aprendendo do zero ou vá direto ao cálculo pelos atalhos rápidos."
          }
          title="DCOU - Dimensionamento Computacional de Operações Unitárias"
          variant="hero"
        />
      </Card>

      <Card>
        <CardHeader title="Trilhas de Aprendizagem" />
        <CardContent className="grid gap-4 md:grid-cols-3">
          {trails.map((trail) => (
            <Link
              key={trail.to}
              to={trail.to}
              className="rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">{trail.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {trail.description}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Acesso Rápido" />
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickAccess.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {item.group}
              </p>
              <p className="mt-2 font-medium">{item.label}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
