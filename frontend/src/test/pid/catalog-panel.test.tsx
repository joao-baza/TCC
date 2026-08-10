import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CatalogPanel } from "@/features/pid/catalog/catalog-panel";
import { createCatalogIndex } from "@/features/pid/catalog/catalog-index";
import { localCatalog } from "@/features/pid/catalog/fixtures/catalog";

function renderPanel(onInsert = vi.fn()) {
  render(
    <CatalogPanel
      index={createCatalogIndex(localCatalog)}
      standard="free"
      initialSource="drawio"
      sourceFilters={["drawio"]}
      onInsert={onInsert}
    />,
  );
  return onInsert;
}

describe("CatalogPanel", () => {
  it("filtra por busca e fonte", () => {
    renderPanel();

    fireEvent.change(screen.getByRole("searchbox", { name: "Pesquisar símbolos" }), {
      target: { value: "centrifugal pump 1" },
    });
    expect(screen.getByRole("treeitem", { name: /^Inserir Centrifugal Pump 1/ })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Fonte: Draw.io" }));
    expect(screen.getByRole("treeitem", { name: /^Inserir Centrifugal Pump 1/ })).toBeVisible();
  });

  it("permite recolher categorias sem ocultar o botão semântico", () => {
    renderPanel();

    const category = screen.getByRole("treeitem", { name: "Agitadores" });
    fireEvent.click(category);
    expect(category).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("treeitem", { name: /^Inserir Agitator \(Anchor\)/ })).not.toBeInTheDocument();

    fireEvent.click(category);
    expect(category).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: /^Inserir Agitator \(Anchor\)/ })).toBeVisible();
  });

  it("insere uma vez pela tecla Enter ou clique na mesma linha-botão", () => {
    const onInsert = renderPanel();
    const row = screen.getByRole("treeitem", { name: /^Inserir Agitator \(Anchor\)/ });

    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.click(row);

    expect(onInsert).toHaveBeenCalledTimes(2);
    expect(onInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({ key: "drawio.pid.agitators.agitator-anchor" }));
  });

  it("move o foco na árvore e insere com Enter sem criar botão aninhado", () => {
    const onInsert = renderPanel();
    const category = screen.getByRole("treeitem", { name: "Agitadores" });
    category.focus();
    fireEvent.keyDown(category, { key: "ArrowDown" });
    const pump = screen.getByRole("treeitem", { name: /^Inserir Agitator \(Anchor\)/ });
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
    const { rerender } = render(<CatalogPanel index={index} standard="free" source="drawio" sourceFilters={["drawio"]} onInsert={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Fonte: Draw.io" })).toHaveAttribute("aria-pressed", "true");
    rerender(<CatalogPanel index={index} standard="free" source={undefined} sourceFilters={["drawio"]} onInsert={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Fonte: Draw.io" })).toHaveAttribute("aria-pressed", "false");
  });

  it("mantém IDs únicos entre painéis e unifica categorias canônicas", () => {
    const symbols = [
      { ...localCatalog[0], key: "project.cafe.one", category: "Café" },
      { ...localCatalog[1], key: "project.cafe.two", category: " Cafe " },
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

  it("preserva o foco do campo de busca, mas recupera o foco quando a tree remove a linha ativa", async () => {
    renderPanel();
    const pump = screen.getByRole("treeitem", { name: /^Inserir Agitator \(Anchor\)/ });
    const search = screen.getByRole("searchbox", { name: "Pesquisar símbolos" });

    pump.focus();
    search.focus();
    fireEvent.change(search, { target: { value: "valve" } });
    expect(search).toHaveFocus();

    fireEvent.change(search, { target: { value: "" } });
    const restoredPump = await screen.findByRole("treeitem", { name: /^Inserir Agitator \(Anchor\)/ });
    restoredPump.focus();
    fireEvent.change(search, { target: { value: "valve" } });
    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Válvulas" })).toHaveFocus());
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
    const resizeObserverDescriptor = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
    const observers: ControlledResizeObserver[] = [];
    class ControlledResizeObserver {
      readonly targets = new Set<Element>();

      constructor(readonly callback: ResizeObserverCallback) { observers.push(this); }
      observe(target: Element) { this.targets.add(target); }
      unobserve(target: Element) { this.targets.delete(target); }
      disconnect() { this.targets.clear(); }
    }
    Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: ControlledResizeObserver });
    const windowResizeObserverDescriptor = Object.getOwnPropertyDescriptor(window, "ResizeObserver");
    Object.defineProperty(window, "ResizeObserver", { configurable: true, value: ControlledResizeObserver });

    let tree: HTMLElement | undefined;
    let viewportHeight = 160;
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const rowIndex = this.getAttribute("data-index");
      const height = this === tree ? viewportHeight : rowIndex === null ? 160 : Number(rowIndex) === 0 ? 44 : 76;
      return { x: 0, y: 0, top: 0, left: 0, right: 320, bottom: height, width: 320, height, toJSON: () => ({}) };
    });
    const emitResize = (target: Element, height: number) => {
      const size = { blockSize: height, inlineSize: 320 };
      const entry = {
        target,
        borderBoxSize: [size],
        contentBoxSize: [size],
        contentRect: { x: 0, y: 0, top: 0, left: 0, right: 320, bottom: height, width: 320, height },
      } as unknown as ResizeObserverEntry;
      for (const observer of observers) if (observer.targets.has(target)) observer.callback([entry], observer as unknown as ResizeObserver);
    };

    try {
      render(<CatalogPanel symbols={catalog} standard="free" onInsert={vi.fn()} />);
      tree = screen.getByRole("tree");
      let scrollTop = 0;
      let dispatchedScroll = false;
      const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
        const nextScrollTop = Math.max(0, top ?? 0);
        if (nextScrollTop === scrollTop) return;
        scrollTop = nextScrollTop;
        if (!dispatchedScroll) {
          dispatchedScroll = true;
          queueMicrotask(() => tree!.dispatchEvent(new Event("scroll")));
        }
      });
      Object.defineProperties(tree, {
        clientHeight: { configurable: true, get: () => viewportHeight },
        scrollHeight: { configurable: true, get: () => 6_200 },
        offsetHeight: { configurable: true, get: () => viewportHeight },
        scrollTop: { configurable: true, get: () => scrollTop, set: (value: number) => { scrollTop = value; } },
        scrollTo: { configurable: true, value: scrollTo },
      });
      await waitFor(() => expect(observers.some((observer) => observer.targets.has(tree!))).toBe(true));
      act(() => emitResize(tree!, viewportHeight));
      const initialRows = tree.querySelectorAll<HTMLElement>("[data-index]");
      act(() => emitResize(initialRows[0], 44));
      act(() => emitResize(initialRows[1], 76));
      scrollTo.mockClear();

      const first = screen.getByRole("treeitem", { name: "Agitadores" });
      first.focus();
      fireEvent.keyDown(first, { key: "End" });
      await waitFor(() => expect(scrollTo).toHaveBeenCalled());
      const finalRow = await screen.findByRole("treeitem", { name: /Bomba scroll 9/ });
      await waitFor(() => expect(finalRow).toHaveFocus());
      const finalContainer = finalRow.closest<HTMLElement>("[data-index]");
      expect(finalContainer).not.toBeNull();
      act(() => emitResize(finalContainer!, 76));

      scrollTo.mockClear();
      fireEvent.keyDown(finalRow, { key: "ArrowUp" });
      const previousRow = await screen.findByRole("treeitem", { name: /Bomba scroll 8/ });
      await waitFor(() => expect(previousRow).toHaveFocus());
      scrollTo.mockClear();
      fireEvent.keyDown(previousRow, { key: "ArrowDown" });
      await waitFor(() => expect(screen.getByRole("treeitem", { name: /Bomba scroll 9/ })).toHaveFocus());
      expect(scrollTo).not.toHaveBeenCalled();

      viewportHeight = 280;
      act(() => emitResize(tree!, viewportHeight));
      expect(screen.getByRole("treeitem", { name: /Bomba scroll 9/ })).toHaveFocus();

      fireEvent.change(screen.getByRole("searchbox", { name: "Pesquisar símbolos" }), { target: { value: "79" } });
      await waitFor(() => expect(screen.getByRole("treeitem", { name: "Agitadores" })).toHaveFocus());
      const category = screen.getByRole("treeitem", { name: "Agitadores" });
      fireEvent.click(category);
      await waitFor(() => expect(category).toHaveFocus());
      expect(screen.queryByRole("treeitem", { name: /Bomba scroll 79/ })).not.toBeInTheDocument();
    } finally {
      rect.mockRestore();
      if (resizeObserverDescriptor) Object.defineProperty(globalThis, "ResizeObserver", resizeObserverDescriptor);
      else Reflect.deleteProperty(globalThis, "ResizeObserver");
      if (windowResizeObserverDescriptor) Object.defineProperty(window, "ResizeObserver", windowResizeObserverDescriptor);
      else Reflect.deleteProperty(window, "ResizeObserver");
    }
  });
});
