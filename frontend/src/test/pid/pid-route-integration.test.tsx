import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, expect, it } from "vitest";

import { routes } from "@/app/router";

beforeEach(() => localStorage.clear());

it("cria e abre um diagrama pelas rotas reais com o serviço local compartilhado", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/pid"] });
  render(<RouterProvider router={router} />);

  fireEvent.change(await screen.findByLabelText("Título do diagrama"), { target: { value: "Utilidades" } });
  expect(screen.queryByLabelText("Norma")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
  fireEvent.click(screen.getByRole("button", { name: "Criar diagrama" }));

  const editUrl = (await screen.findByLabelText("Link de edição") as HTMLInputElement).value;
  const parsed = new URL(editUrl);
  expect(parsed.hash).toMatch(/^#access=[A-Za-z0-9_-]{43}$/);
  expect(localStorage.getItem(`dcou.pid.local.v1.${parsed.pathname.split("/").at(-1)}`)).not.toContain(
    parsed.hash.slice("#access=".length),
  );

  fireEvent.click(screen.getByRole("checkbox", { name: "Copiei o link de edição" }));
  await router.navigate(`${parsed.pathname}${parsed.hash}`);

  expect(await screen.findByRole("heading", { name: "Utilidades" })).toBeInTheDocument();
  expect(screen.getByText("Acesso de edição")).toBeInTheDocument();
});
