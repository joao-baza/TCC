import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { routes } from "@/app/router";

it("renders grouped glossary sections and filters terms from the legacy catalog", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/glossary/terms"] });

  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("heading", { name: /Glossário/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("searchbox", { name: /Pesquisar no glossário/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /Termos/i }),
  ).toBeInTheDocument();
  expect(screen.getByText(/^Hidráulica$/i)).toBeInTheDocument();
  expect(screen.getByText(/Número de Reynolds \(Re\)/i)).toBeInTheDocument();

  fireEvent.change(
    screen.getByRole("searchbox", { name: /Pesquisar no glossário/i }),
    { target: { value: "brent" } },
  );

  expect(screen.getByText(/Método de Brent/i)).toBeInTheDocument();
  expect(screen.queryByText(/Número de Reynolds \(Re\)/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/^Hidráulica$/i)).not.toBeInTheDocument();
  expect(screen.getAllByText(/^Reatores$/i).length).toBeGreaterThan(0);
}, 10000);

it("matches glossary terms regardless of accent marks", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/glossary/terms"] });

  render(<RouterProvider router={router} />);

  await screen.findByRole("heading", { name: /Glossário/i });

  fireEvent.change(screen.getByRole("searchbox", { name: /Pesquisar no glossário/i }), {
    target: { value: "cavitacao" },
  });

  expect(screen.getByRole("heading", { name: /Cavitação/i })).toBeInTheDocument();
  expect(screen.queryByText(/Número de Reynolds \(Re\)/i)).not.toBeInTheDocument();
});

it("surfaces the new process visualization terms", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/glossary/terms"] });

  render(<RouterProvider router={router} />);

  await screen.findByRole("heading", { name: /Glossário/i });

  fireEvent.change(screen.getByRole("searchbox", { name: /Pesquisar no glossário/i }), {
    target: { value: "sankey" },
  });

  expect(screen.getByRole("heading", { name: /Sankey de massa e energia/i })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /Tabela de correntes/i })).not.toBeInTheDocument();
});

it("renders KaTeX content for math-heavy glossary definitions", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/glossary/terms"] });

  const { container } = render(<RouterProvider router={router} />);

  await screen.findByRole("heading", { name: /Glossário/i });

  fireEvent.change(screen.getByRole("searchbox", { name: /Pesquisar no glossário/i }), {
    target: { value: "perda de carga distribuída" },
  });

  const article = screen.getByText(/Perda de carga distribuída \(h_f\)/i).closest("article");

  expect(article).not.toBeNull();
  expect(article?.querySelector(".katex")).not.toBeNull();
  expect(container.querySelector(".katex")).not.toBeNull();
});

it("renders fractions in the pump head glossary definition", async () => {
  const router = createMemoryRouter(routes, { initialEntries: ["/glossary/terms"] });

  render(<RouterProvider router={router} />);

  await screen.findByRole("heading", { name: /Glossário/i });

  fireEvent.change(screen.getByRole("searchbox", { name: /Pesquisar no glossário/i }), {
    target: { value: "Head da bomba" },
  });

  const article = screen
    .getByRole("heading", { name: /Head da bomba \(H\)/i })
    .closest("article");

  expect(article).not.toBeNull();
  expect(article?.querySelector(".katex")).not.toBeNull();
  expect(article?.querySelectorAll(".mfrac").length).toBeGreaterThan(0);
});
