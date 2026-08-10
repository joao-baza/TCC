import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { PidStandard } from "../domain/model";
import { createCatalogIndex, type CatalogIndex } from "./catalog-index";
import type { CatalogSourceKind, CatalogSymbol } from "./catalog-symbol";

type CatalogInput =
  | { readonly index: CatalogIndex; readonly symbols?: never }
  | { readonly symbols: readonly unknown[]; readonly index?: never };

type CatalogPanelCommonProps = {
  readonly standard: PidStandard;
  readonly onInsert: (symbol: CatalogSymbol) => void;
  /** Controlled source filter. Pair with onSourceChange. */
  readonly source?: CatalogSourceKind;
  /** Used only while source is uncontrolled. */
  readonly initialSource?: CatalogSourceKind;
  readonly onSourceChange?: (source: CatalogSourceKind | undefined) => void;
  readonly category?: string;
  readonly sourceFilters?: readonly CatalogSourceKind[];
  readonly thumbSize?: number;
};

export type CatalogPanelProps = CatalogPanelCommonProps & CatalogInput;

type CatalogRow =
  | { readonly kind: "category"; readonly id: string; readonly category: string }
  | { readonly kind: "symbol"; readonly id: string; readonly category: string; readonly symbol: CatalogSymbol };

export function CatalogPanel(props: CatalogPanelProps) {
  const { standard, onInsert, source, initialSource, onSourceChange, category, sourceFilters = [], thumbSize } = props;
  const inputSymbols = props.index === undefined ? props.symbols : undefined;
  const generatedIndex = useMemo(
    () => inputSymbols === undefined ? undefined : createCatalogIndex(inputSymbols),
    [inputSymbols],
  );
  const catalog = props.index ?? generatedIndex;
  if (!catalog) throw new Error("Forneça index ou symbols ao catálogo P&ID.");
  const [query, setQuery] = useState("");
  const [uncontrolledSource, setUncontrolledSource] = useState<CatalogSourceKind | undefined>(initialSource);
  const sourceControlled = Object.hasOwn(props, "source");
  const selectedSource = sourceControlled ? source : uncontrolledSource;
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | undefined>();
  const [pendingFocusId, setPendingFocusId] = useState<string | undefined>();
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const panelId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const results = useMemo(
    () => catalog.search(query, { standard, source: selectedSource, category }),
    [catalog, query, standard, selectedSource, category],
  );
  const rows = useMemo(() => toRows(results, collapsed), [results, collapsed]);
  const itemKey = useCallback((index: number) => rows[index]?.id ?? index, [rows]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    getItemKey: itemKey,
    estimateSize: (index) => rows[index]?.kind === "category" ? 44 : 76,
    overscan: 6,
    initialRect: { width: 320, height: 360 },
  });
  const virtualItems = virtualizer.getVirtualItems().filter((item) => rows[item.index] !== undefined);
  const visibleItems = virtualItems.length > 0 ? virtualItems : estimatedVisibleItems(rows);
  const totalSize = virtualizer.getTotalSize() || estimatedTotalSize(rows);
  const activeRowRemoved = activeId !== undefined && !rows.some((row) => row.id === activeId);
  const shouldRecoverTreeFocus = activeRowRemoved
    && scrollElement?.contains(document.activeElement)
    && document.activeElement?.id === `${panelId}-${activeId}`;

  useLayoutEffect(() => { virtualizer.measure(); }, [virtualizer, rows]);
  useEffect(() => {
    if (activeId === undefined) { setActiveId(rows[0]?.id); return; }
    if (!activeRowRemoved) return;
    setActiveId(rows[0]?.id);
    setPendingFocusId(shouldRecoverTreeFocus ? rows[0]?.id : undefined);
  }, [activeId, activeRowRemoved, rows, shouldRecoverTreeFocus]);
  useLayoutEffect(() => {
    if (!pendingFocusId) return;
    const button = document.getElementById(`${panelId}-${pendingFocusId}`) as HTMLButtonElement | null;
    if (button) {
      button.focus();
      setPendingFocusId(undefined);
    }
  }, [panelId, pendingFocusId, visibleItems]);

  const changeSource = (next: CatalogSourceKind | undefined) => {
    if (!sourceControlled) setUncontrolledSource(next);
    onSourceChange?.(next);
  };
  const toggleCategory = (value: string) => setCollapsed((current) => {
    const identity = canonicalCategory(value);
    const next = new Set(current);
    if (next.has(identity)) next.delete(identity); else next.add(identity);
    return next;
  });
  const moveFocus = (index: number) => {
    const row = rows[index];
    if (!row) return;
    setActiveId(row.id);
    setPendingFocusId(row.id);
    const range = virtualizer.range;
    if (!range || index < range.startIndex || index > range.endIndex) virtualizer.scrollToIndex(index, { align: "auto" });
  };
  const onRowKeyDown = (event: KeyboardEvent<HTMLButtonElement>, row: CatalogRow, index: number) => {
    const target = event.key === "ArrowDown" ? index + 1
      : event.key === "ArrowUp" ? index - 1
      : event.key === "Home" ? 0
      : event.key === "End" ? rows.length - 1
      : undefined;
    if (target !== undefined) { event.preventDefault(); moveFocus(Math.max(0, Math.min(rows.length - 1, target))); return; }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (row.kind === "category" && !collapsed.has(canonicalCategory(row.category))) toggleCategory(row.category);
      else if (row.kind === "symbol") moveFocus(rows.findIndex((candidate) => candidate.kind === "category" && candidate.category === row.category));
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (row.kind === "category") {
        if (collapsed.has(canonicalCategory(row.category))) toggleCategory(row.category);
        else moveFocus(index + 1);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (row.kind === "category") toggleCategory(row.category); else onInsert(row.symbol);
    }
  };

  return (
    <section aria-label="Catálogo de símbolos P&ID" className="flex flex-col gap-3 min-h-0">
      <div className="flex gap-2">
        <input aria-label="Pesquisar símbolos" type="search" value={query} onChange={(event) => { setPendingFocusId(undefined); setQuery(event.target.value); }} placeholder="Pesquisar símbolos" className="min-h-11 flex-1 rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        {query !== "" && <button type="button" onClick={() => setQuery("")} className="min-h-11 rounded-md border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Limpar busca</button>}
      </div>
      {sourceFilters.length > 0 && <div aria-label="Fontes do catálogo" className="flex gap-2">
        {sourceFilters.map((sourceKind) => <button type="button" key={sourceKind} aria-pressed={selectedSource === sourceKind} onClick={() => changeSource(selectedSource === sourceKind ? undefined : sourceKind)} className="min-h-11 rounded-md border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Fonte: {sourceKind === "project" ? "Projeto" : "Draw.io"}</button>)}
      </div>}
      {rows.length === 0 ? <p role="status" className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nenhum símbolo encontrado.</p> : (
        <div ref={setScrollElement} role="tree" aria-label="Símbolos disponíveis" className="min-h-[160px] flex-1 overflow-auto rounded-md border" style={{ minHeight: 160 }}>
          <div style={{ height: totalSize, position: "relative" }}>
            {visibleItems.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return <div key={row.id} ref={virtualizer.measureElement} data-index={virtualRow.index} style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}>
                {row.kind === "category" ? <button id={`${panelId}-${row.id}`} role="treeitem" aria-level={1} aria-expanded={!collapsed.has(canonicalCategory(row.category))} tabIndex={activeId === row.id ? 0 : -1} onFocus={() => setActiveId(row.id)} onClick={() => toggleCategory(row.category)} onKeyDown={(event) => onRowKeyDown(event, row, virtualRow.index)} className="min-h-11 w-full px-3 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{row.category}</button>
                  : <button id={`${panelId}-${row.id}`} role="treeitem" aria-level={2} tabIndex={activeId === row.id ? 0 : -1} onFocus={() => setActiveId(row.id)} onClick={() => onInsert(row.symbol)} onKeyDown={(event) => onRowKeyDown(event, row, virtualRow.index)} className="flex min-h-[76px] w-full items-center gap-3 border-t px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    <img src={row.symbol.assetUrl} alt="" loading="lazy" decoding="async" style={{ height: thumbSize ?? 40, width: thumbSize ?? 40 }} className="rounded bg-white object-contain shrink-0" />
                    <span className="min-w-0 flex-1"><span className="block font-medium">{row.symbol.name}</span><span className="block text-xs text-muted-foreground">{row.symbol.source.sourceName} · {row.symbol.standards.join(" / ")}</span></span>
                  </button>}
              </div>;
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function toRows(symbols: readonly CatalogSymbol[], collapsed: ReadonlySet<string>): readonly CatalogRow[] {
  const categories = new Map<string, { label: string; symbols: CatalogSymbol[] }>();
  for (const symbol of symbols) {
    const canonical = canonicalCategory(symbol.category);
    const group = categories.get(canonical) ?? { label: symbol.category, symbols: [] };
    group.label = symbol.category < group.label ? symbol.category : group.label;
    group.symbols.push(symbol);
    categories.set(canonical, group);
  }
  return Object.freeze([...categories.entries()].flatMap(([canonical, group]) => {
    const { label: category, symbols: items } = group;
    return [{ kind: "category" as const, id: `category:${canonical}`, category }, ...(collapsed.has(canonical) ? [] : items.map((symbol) => ({ kind: "symbol" as const, id: `symbol:${symbol.key}`, category, symbol })) )];
  }));
}
function canonicalCategory(value: string): string { return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, "-"); }
function estimatedTotalSize(rows: readonly CatalogRow[]): number { return rows.reduce((total, row) => total + (row.kind === "category" ? 44 : 76), 0); }
function estimatedVisibleItems(rows: readonly CatalogRow[]) { let start = 0; return rows.slice(0, 12).map((row, index) => { const item = { index, start }; start += row.kind === "category" ? 44 : 76; return item; }); }
