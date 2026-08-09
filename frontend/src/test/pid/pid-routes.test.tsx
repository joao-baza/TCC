import { render, screen, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter, matchRoutes } from "react-router-dom";
import { afterEach, vi } from "vitest";

import { routes } from "@/app/router";
import { PidRouteErrorPage } from "@/features/pid/api/pid-services";

afterEach(() => vi.restoreAllMocks());

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

it("mostra orientação focada quando falta uma capacidade do runtime local", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
  try {
    const router = createMemoryRouter(routes, { initialEntries: ["/pid"] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Editor P&ID indisponível" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Web Locks indisponível para o adaptador P&ID local.",
    );
    expect(screen.getByText(/Use um navegador atualizado/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao DCOU" })).toHaveAttribute("href", "/");
  } finally {
    if (descriptor) Object.defineProperty(navigator, "locks", descriptor);
    else Reflect.deleteProperty(navigator, "locks");
  }
});

it("mostra recuperação neutra e preserva diagnóstico para erro desconhecido", async () => {
  const failure = new Error("falha interna inesperada");
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const router = createMemoryRouter([{
    path: "/pid",
    element: <UnexpectedPidFailure error={failure} />,
    errorElement: <PidRouteErrorPage />,
  }], { initialEntries: ["/pid"] });

  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir o editor P&ID.");
  expect(screen.getByText(/Tente recarregar a página/i)).toBeInTheDocument();
  expect(screen.queryByText(/Use um navegador atualizado/i)).not.toBeInTheDocument();
  expect(consoleError).toHaveBeenCalledWith("Falha inesperada na rota P&ID.", failure);
});

function UnexpectedPidFailure({ error }: { error: Error }): never {
  throw error;
}
