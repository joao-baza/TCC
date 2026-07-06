import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";
import { buttonVariants } from "@/components/ui/button";

it("uses the blue theme tokens in the shell and primary actions", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });

  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("navigation", { name: /Navegação principal/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Início/i })).toHaveClass(
    "bg-primary",
  );
  expect(screen.getByLabelText(/Abrir navegação/i)).toHaveClass(
    "bg-background",
  );
  expect(buttonVariants({ variant: "default" })).toContain("bg-primary");
  expect(buttonVariants({ variant: "secondary" })).toContain("bg-secondary");
});
