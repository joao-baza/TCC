import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByRole("treeitem", { name: /^Inserir Bomba centrífuga/ })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Fonte: Projeto" }));
    expect(screen.getByRole("treeitem", { name: /^Inserir Bomba centrífuga/ })).toBeVisible();
  });

  it("permite recolher categorias sem ocultar o botão semântico", () => {
    renderPanel();

    const category = screen.getByRole("treeitem", { name: "Equipamentos" });
    fireEvent.click(category);
    expect(category).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("treeitem", { name: /^Inserir Bomba centrífuga/ })).not.toBeInTheDocument();

    fireEvent.click(category);
    expect(category).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: /^Inserir Bomba centrífuga/ })).toBeVisible();
  });

  it("insere uma vez pela tecla Enter ou clique na mesma linha-botão", () => {
    const onInsert = renderPanel();
    const row = screen.getByRole("treeitem", { name: /^Inserir Bomba centrífuga/ });

    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.click(row);

    expect(onInsert).toHaveBeenCalledTimes(2);
    expect(onInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({ key: "project.pump.centrifugal" }));
  });

  it("move o foco na árvore e insere com Enter sem criar botão aninhado", () => {
    const onInsert = renderPanel();
    const category = screen.getByRole("treeitem", { name: "Equipamentos" });
    category.focus();
    fireEvent.keyDown(category, { key: "ArrowDown" });
    const pump = screen.getByRole("treeitem", { name: /^Inserir Bomba centrífuga/ });
    expect(pump).toHaveFocus();
    fireEvent.keyDown(pump, { key: "Enter" });
    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(pump.querySelector("button")).toBeNull();
    expect(pump.querySelector("img")).toHaveClass("bg-white", "object-contain");
    expect(pump.querySelector("img")).toHaveAttribute("alt", "");
    expect(pump.querySelector("img")).toHaveAttribute("loading", "lazy");
    expect(pump.querySelector("img")).toHaveAttribute("decoding", "async");
  });

  it("respeita atualização de source controlada", () => {
    const index = createCatalogIndex(localCatalog);
    const { rerender } = render(<CatalogPanel index={index} standard="free" source="project" onInsert={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Fonte: Projeto" })).toHaveAttribute("aria-pressed", "true");
    rerender(<CatalogPanel index={index} standard="free" source={undefined} onInsert={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Fonte: Projeto" })).toHaveAttribute("aria-pressed", "false");
  });

  it("mantém IDs únicos entre painéis e unifica categorias canônicas", () => {
    const symbols = [
      { ...localCatalog[0], key: "project.cafe.one", category: "Café" },
      { ...localCatalog[1], key: "project.cafe.two", category: "Cafe" },
    ];
    render(<><CatalogPanel symbols={symbols} standard="free" onInsert={vi.fn()} /><CatalogPanel symbols={symbols} standard="free" onInsert={vi.fn()} /></>);
    expect(screen.getAllByRole("treeitem", { name: /Cafe|Café/ }).filter((item) => item.getAttribute("aria-level") === "1")).toHaveLength(2);
    const ids = screen.getAllByRole("treeitem").map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
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
      key: `project.synthetic.item${index}`,
      name: `Bomba sintética ${index}`,
      aliases: [`bomba sintetica ${index}`],
    }));
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 360, width: 320, height: 360,
      toJSON: () => ({}),
    });

    render(<CatalogPanel symbols={catalog} standard="free" onInsert={vi.fn()} />);

    expect(screen.getAllByRole("treeitem", { name: /Inserir Bomba sintética/ })).toHaveLength(11);
    expect(screen.queryByRole("treeitem", { name: /Inserir Bomba sintética 119/ })).not.toBeInTheDocument();
    rect.mockRestore();
  });

  it("reconcilia foco e posição virtual ao navegar até o fim e filtrar após scroll", async () => {
    const catalog = Array.from({ length: 80 }, (_, index) => ({
      ...localCatalog[0], key: `project.scroll.item${index}`, name: `Bomba scroll ${index}`, aliases: [`scroll ${index}`],
    }));
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 160, width: 320, height: 160, toJSON: () => ({}) });
    render(<CatalogPanel symbols={catalog} standard="free" onInsert={vi.fn()} />);
    const tree = screen.getByRole("tree");
    const scrollTo = vi.fn(({ top }: { top: number }) => { Object.defineProperty(tree, "scrollTop", { configurable: true, value: top, writable: true }); fireEvent.scroll(tree); });
    Object.defineProperty(tree, "clientHeight", { configurable: true, value: 160 });
    Object.defineProperty(tree, "scrollTo", { configurable: true, value: scrollTo });
    const first = screen.getByRole("treeitem", { name: "Equipamentos" });
    first.focus();
    fireEvent.keyDown(first, { key: "End" });
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    expect(tree.scrollTop).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("searchbox", { name: "Pesquisar símbolos" }), { target: { value: "79" } });
    await waitFor(() => expect(screen.getByRole("treeitem", { name: /Bomba scroll 79/ })).toBeInTheDocument());
    rect.mockRestore();
  });
});
