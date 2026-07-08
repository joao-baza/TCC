import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

it("shows the sidebar groups and learning trails on the home page", async () => {
  const router = createMemoryRouter(routes, {
    initialEntries: ["/"],
  });

  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("navigation", { name: /Navegação principal/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /Universidade Federal de Mato Grosso do Sul/i })).toBeInTheDocument();
  expect(screen.getByText("Dimensionamento Computacional de Operações Unitárias")).toBeInTheDocument();
  expect(screen.getByText(/Hidráulica & Escoamento/i)).toBeInTheDocument();
  expect(
    screen
      .getAllByRole("link", { name: /Tubulações/i })
      .some((link) => link.getAttribute("href") === "/piping"),
  ).toBe(true);
  expect(screen.queryAllByRole("link", { name: /Exercícios Integrados/i })).toHaveLength(0);
  expect(screen.getByText(/Trilhas de Aprendizagem/i)).toBeInTheDocument();
});
