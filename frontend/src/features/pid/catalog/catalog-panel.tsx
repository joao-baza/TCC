import { useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { PidStandard } from "../domain/model";
import { createCatalogIndex, type CatalogIndex } from "./catalog-index";
import type { CatalogSourceKind, CatalogSymbol } from "./fixtures/catalog";

export interface CatalogPanelProps {
  index?: CatalogIndex;
  symbols?: readonly CatalogSymbol[];
  standard: PidStandard;
  onInsert(symbol: CatalogSymbol): void;
  source?: CatalogSourceKind;
  category?: string;
  sourceFilters?: readonly CatalogSourceKind[];
}

type CatalogRow =
  | { kind: "category"; category: string }
  | { kind: "symbol"; category: string; symbol: CatalogSymbol };

export function CatalogPanel({
  index,
  symbols = [],
  standard,
  onInsert,
  source,
  category,
  sourceFilters = ["project"],
}: CatalogPanelProps) {
  const generatedIndex = useMemo(() => createCatalogIndex(symbols), [symbols]);
  const catalog = index ?? generatedIndex;
  const [query, setQuery] = useState("");
  const [activeSource, setActiveSource] = useState<CatalogSourceKind | undefined>(source);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  const results = catalog.search(query, { standard, source: activeSource, category });
  const rows = useMemo(() => toRows(results, collapsed), [results, collapsed]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    estimateSize: (row) => rows[row]?.kind === "category" ? 44 : 76,
    overscan: 6,
    initialRect: { width: 320, height: 360 },
  });
  const virtualItems = virtualizer.getVirtualItems();
  // JSDOM has no layout by default. Keep only an estimated visible window until
  // the virtualizer receives a real (or test-stubbed) scroll measurement.
  const visibleItems = virtualItems.length > 0
    ? virtualItems
    : estimatedVisibleItems(rows);
  const totalSize = virtualizer.getTotalSize() || estimatedTotalSize(rows);

  const toggleCategory = (value: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <section aria-label="Catálogo de símbolos P&ID" className="space-y-3">
      <div className="flex gap-2">
        <input
          aria-label="Pesquisar símbolos"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar símbolos"
          className="min-h-11 flex-1 rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {query !== "" && (
          <button type="button" onClick={() => setQuery("")} className="min-h-11 rounded-md border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Limpar busca
          </button>
        )}
      </div>
      {source === undefined && sourceFilters.length > 0 && (
        <div aria-label="Fontes do catálogo" className="flex gap-2">
          {sourceFilters.map((sourceKind) => (
            <button
              type="button"
              key={sourceKind}
              aria-pressed={activeSource === sourceKind}
              onClick={() => setActiveSource((current) => current === sourceKind ? undefined : sourceKind)}
              className="min-h-11 rounded-md border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Fonte: {sourceKind === "project" ? "Projeto" : sourceKind}
            </button>
          ))}
        </div>
      )}
      {results.length === 0 ? (
        <p role="status" className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nenhum símbolo encontrado.</p>
      ) : (
        <div
          ref={setScrollElement}
          role="listbox"
          aria-label="Símbolos disponíveis"
          className="max-h-[360px] overflow-auto rounded-md border"
          style={{ minHeight: 160 }}
        >
          <div style={{ height: totalSize, position: "relative" }}>
            {visibleItems.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={`${row.kind}-${row.category}-${row.kind === "symbol" ? row.symbol.key : ""}`}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                >
                  {row.kind === "category" ? (
                    <button
                      type="button"
                      aria-expanded={!collapsed.has(row.category)}
                      onClick={() => toggleCategory(row.category)}
                      className="min-h-11 w-full px-3 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      {row.category}
                    </button>
                  ) : (
                    <SymbolRow symbol={row.symbol} onInsert={onInsert} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function SymbolRow({ symbol, onInsert }: { symbol: CatalogSymbol; onInsert(symbol: CatalogSymbol): void }) {
  const insert = () => onInsert(symbol);
  return (
    <div
      role="option"
      aria-label={`${symbol.name}; fonte ${symbol.source.sourceName}; normas ${symbol.standards.join(", ")}`}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === event.currentTarget) {
          event.preventDefault();
          insert();
        }
      }}
      className="flex min-h-[76px] items-center gap-3 border-t px-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <img src={symbol.assetUrl} alt={`Prévia de ${symbol.name}`} width={48} height={40} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{symbol.name}</p>
        <p className="text-xs text-muted-foreground">{symbol.source.sourceName} · {symbol.standards.join(" / ")}</p>
      </div>
      <button type="button" onClick={insert} className="min-h-11 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Inserir {symbol.name}
      </button>
    </div>
  );
}

function toRows(symbols: readonly CatalogSymbol[], collapsed: ReadonlySet<string>): CatalogRow[] {
  const categories = new Map<string, CatalogSymbol[]>();
  for (const symbol of symbols) {
    const group = categories.get(symbol.category) ?? [];
    group.push(symbol);
    categories.set(symbol.category, group);
  }
  return [...categories.entries()].flatMap(([category, items]) => [
    { kind: "category" as const, category },
    ...(collapsed.has(category) ? [] : items.map((symbol) => ({ kind: "symbol" as const, category, symbol }))),
  ]);
}

function estimatedTotalSize(rows: readonly CatalogRow[]): number {
  return rows.reduce((total, row) => total + (row.kind === "category" ? 44 : 76), 0);
}

function estimatedVisibleItems(rows: readonly CatalogRow[]) {
  let start = 0;
  return rows.slice(0, 12).map((row, index) => {
    const item = { index, start };
    start += row.kind === "category" ? 44 : 76;
    return item;
  });
}
