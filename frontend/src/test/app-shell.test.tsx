import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

describe("App shell bootstrap", () => {
  it("renders the home route through the application router", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });

    render(
      <RouterProvider router={router} />,
    );

    expect(
      await screen.findByRole("heading", {
        name: /DCOU - Dimensionamento Computacional de Operações Unitárias/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Início/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
