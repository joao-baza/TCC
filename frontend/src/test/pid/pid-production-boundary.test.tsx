import { render, screen, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";

import { App } from "@/app/app";
import { createQuickAccess } from "@/features/home/home-page";
import { pidFocusedEditorRoute, pidRoute } from "@/features/pid/routing/pid-route-disabled";
import { HomePage } from "@/features/home/home-page";
import { createModuleRoutes } from "@/lib/routes";

it("oculta os acessos P&ID quando o adaptador de produção está desabilitado", async () => {
  expect(createModuleRoutes(false)).not.toContainEqual(expect.objectContaining({ path: "/pid" }));
  expect(createQuickAccess(false)).not.toContainEqual(expect.objectContaining({ to: "/pid" }));
  const router = createMemoryRouter([{
    path: "/",
    element: <App />,
    children: [{ index: true, element: <HomePage pidEnabled={false} /> }],
  }], { initialEntries: ["/"] });

  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: "Acesso Rápido" })).toBeVisible();
  expect(screen.queryByRole("link", { name: /Editor P&ID/i })).not.toBeInTheDocument();
  const quickAccess = screen.getByRole("heading", { name: "Acesso Rápido" })
    .closest<HTMLElement>('[data-slot="card"]');
  expect(quickAccess).not.toBeNull();
  expect(within(quickAccess!).queryByRole("link", { name: "Ferramentas P&ID" })).not.toBeInTheDocument();
});

it("torna a rota P&ID indisponível sem inicializar o adaptador local", async () => {
  const router = createMemoryRouter([{
    path: "/",
    element: <App />,
    children: [pidFocusedEditorRoute],
  }], {
    initialEntries: ["/pid/7c1fdcea-c47a-49d2-b16f-22c30da1b3cb#edit=fake-local-token"],
  });

  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: "Editor P&ID indisponível" })).toBeVisible();
  expect(screen.getByText(/não está habilitado nesta distribuição/i)).toBeVisible();
  expect(screen.queryByRole("button", { name: /Compartilhar/i })).not.toBeInTheDocument();
});

it("mantém Meus diagramas indisponível quando o adaptador está desabilitado", async () => {
  const router = createMemoryRouter([{
    path: "/",
    element: <App />,
    children: [pidRoute],
  }], { initialEntries: ["/pid/meus-diagramas"] });

  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: "Editor P&ID indisponível" })).toBeVisible();
});
