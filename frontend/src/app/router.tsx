import { createBrowserRouter } from "react-router-dom";

import { App } from "@/app/app";
import { AppShell } from "@/components/app-shell";
import { HomePage } from "@/features/home/home-page";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="space-y-4 p-6 md:p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        Módulo em migração para a nova base React.
      </p>
    </section>
  );
}

export const routes = [
  {
    path: "/",
    element: <App />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "piping", element: <PlaceholderPage title="Tubulações" /> },
          { path: "sizing", element: <PlaceholderPage title="Dimensionamento" /> },
          { path: "flow", element: <PlaceholderPage title="Escoamento" /> },
          { path: "pump", element: <PlaceholderPage title="Perda de Carga & NPSH" /> },
          { path: "components", element: <PlaceholderPage title="Componentes" /> },
          { path: "reactor", element: <PlaceholderPage title="CSTR / PFR" /> },
          { path: "balance", element: <PlaceholderPage title="Balanço" /> },
          { path: "glossary", element: <PlaceholderPage title="Glossário" /> },
          {
            path: "exercises",
            element: <PlaceholderPage title="Exercícios Integrados" />,
          },
        ],
      },
    ],
  }
];

export const router = createBrowserRouter(routes);
