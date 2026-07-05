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
];

export function HomePage() {
  return (
    <section className="space-y-8 p-6 md:p-8">
      <Card>
        <CardHeader>
          <h1 className="text-3xl font-semibold">
            DCOU - Dimensionamento Computacional de Operações Unitárias
          </h1>
        </CardHeader>
        <CardContent className="text-base text-muted-foreground">
          Selecione um módulo na barra lateral, siga uma trilha de aprendizagem ou
          explore diretamente pelo acesso rápido.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Trilhas de Aprendizagem</h2>
        </CardHeader>
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
        <CardHeader>
          <h2 className="text-xl font-semibold">Acesso Rápido</h2>
        </CardHeader>
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
