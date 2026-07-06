import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";
import { Button } from "@/components/ui/button";

it("uses the blue theme tokens in the shell and primary actions", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });

  render(
    <>
      <RouterProvider router={router} />
      <div>
        <Button variant="default">Primário</Button>
        <Button variant="secondary">Secundário</Button>
      </div>
    </>,
  );

  expect(
    await screen.findByRole("navigation", { name: /Navegação principal/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Início/i })).toHaveClass(
    "bg-primary",
  );
  expect(screen.getByLabelText(/Abrir navegação/i)).toHaveClass(
    "bg-background",
  );
  expect(screen.getByRole("button", { name: /Primário/i })).toHaveClass(
    "bg-primary",
  );
  expect(screen.getByRole("button", { name: /Secundário/i })).toHaveClass(
    "bg-secondary",
  );
});
