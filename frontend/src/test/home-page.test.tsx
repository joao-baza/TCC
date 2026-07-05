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
  expect(screen.getByText(/Hidráulica & Escoamento/i)).toBeInTheDocument();
  expect(
    screen
      .getAllByRole("link", { name: /Tubulações/i })
      .some((link) => link.getAttribute("href") === "/piping"),
  ).toBe(true);
  expect(screen.getByText(/Trilhas de Aprendizagem/i)).toBeInTheDocument();
});
