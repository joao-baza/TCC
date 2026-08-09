import { render, screen, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter, matchRoutes } from "react-router-dom";

import { routes } from "@/app/router";

it.each(["/pid", "/pid/7c1fdcea-c47a-49d2-b16f-22c30da1b3cb"])(
  "declara a rota focada %s",
  (path) => expect(matchRoutes(routes, path)).not.toBeNull(),
);

it("oferece P&ID na navegação geral", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("link", { name: /Editor P&ID/i })).toHaveAttribute("href", "/pid");
});

it.each(["/pid", "/pid/7c1fdcea-c47a-49d2-b16f-22c30da1b3cb"])(
  "renderiza o editor focado sem a barra lateral em %s",
  async (path) => {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Editor P&ID" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao DCOU" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("navigation", { name: /Navegação principal/i })).not.toBeInTheDocument();
  },
);

it("oferece o card P&ID no acesso rápido", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  render(<RouterProvider router={router} />);

  const quickAccess = (await screen.findByRole("heading", { name: "Acesso Rápido" }))
    .closest<HTMLElement>('[data-slot="card"]');

  expect(quickAccess).not.toBeNull();
  expect(
    within(quickAccess!).getByRole("link", { name: "Ferramentas P&ID" }),
  ).toHaveAttribute("href", "/pid");
});
