import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CatalogPanel } from "@/features/pid/catalog/catalog-panel";
import { createCatalogIndex } from "@/features/pid/catalog/catalog-index";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";

function renderPanel(onInsert = vi.fn()) {
  render(
    <CatalogPanel
      index={createCatalogIndex(localCatalog)}
      standard="free"
      onInsert={onInsert}
    />,
  );
  return onInsert;
}

describe("CatalogPanel", () => {
  it("filtra por busca e fonte", () => {
    renderPanel();

    fireEvent.change(screen.getByRole("searchbox", { name: "Pesquisar símbolos" }), {
      target: { value: "centrifuga" },
    });
    expect(screen.getByRole("button", { name: "Inserir Bomba centrífuga" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Fonte: Projeto" }));
    expect(screen.getByRole("button", { name: "Inserir Bomba centrífuga" })).toBeVisible();
  });

  it("permite recolher categorias sem ocultar o botão semântico", () => {
    renderPanel();

    const category = screen.getByRole("button", { name: "Equipamentos" });
    fireEvent.click(category);
    expect(category).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Inserir Bomba centrífuga" })).not.toBeInTheDocument();

    fireEvent.click(category);
    expect(category).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Inserir Bomba centrífuga" })).toBeVisible();
  });

  it("insere uma vez pelo botão e pela tecla Enter na linha", () => {
    const onInsert = renderPanel();
    const row = screen.getByRole("option", { name: /Bomba centrífuga/ });

    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Inserir Bomba centrífuga" }));

    expect(onInsert).toHaveBeenCalledTimes(2);
    expect(onInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({ key: "project.pump.centrifugal" }));
  });

  it("mostra estado vazio e permite limpar a busca", () => {
    renderPanel();
    const search = screen.getByRole("searchbox", { name: "Pesquisar símbolos" });
    fireEvent.change(search, { target: { value: "inexistente" } });

    expect(screen.getByText("Nenhum símbolo encontrado.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(search).toHaveValue("");
  });

  it("mantém uma janela virtual pequena para um catálogo sintético grande", () => {
    const catalog = Array.from({ length: 120 }, (_, index) => ({
      ...localCatalog[0],
      key: `project.synthetic.${index}`,
      name: `Bomba sintética ${index}`,
      aliases: [`bomba sintetica ${index}`],
    }));
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 360, width: 320, height: 360,
      toJSON: () => ({}),
    });

    render(<CatalogPanel symbols={catalog} standard="free" onInsert={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /Inserir Bomba sintética/ })).toHaveLength(11);
    expect(screen.queryByRole("button", { name: "Inserir Bomba sintética 119" })).not.toBeInTheDocument();
    rect.mockRestore();
  });
});
