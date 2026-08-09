import { render, screen } from "@testing-library/react";
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
