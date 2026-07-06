import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

describe("App shell bootstrap", () => {
  it("renders the home route through the application router", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });

    const { container } = render(
      <RouterProvider router={router} />,
    );

    expect(container.firstElementChild).toHaveClass(
      "bg-background",
      "text-foreground",
    );
    expect(
      await screen.findByRole("heading", {
        name: /DCOU - Dimensionamento Computacional de Operações Unitárias/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("navigation", { name: /Navegação principal/i })
        .closest("aside"),
    ).toHaveClass("bg-sidebar");
    expect(screen.getByLabelText(/Abrir navegação/i).closest("header")).toHaveClass(
      "bg-background",
    );
    expect(screen.getByRole("link", { name: /Início/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByLabelText(/Notifications alt\+T/i)).toBeInTheDocument();
  });
});
