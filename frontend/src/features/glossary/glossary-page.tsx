import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { BlockMath, InlineMath } from "@/lib/katex";
import { glossaryEntries } from "@/features/glossary/glossary-data";
import { glossaryTabs } from "@/features/glossary/glossary-tabs";

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function decodeEntities(value: string) {
  return value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function stripMarkup(value: string) {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\\\[([\s\S]+?)\\\]/g, " $1 ")
    .replace(/\\\(([\s\S]+?)\\\)/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value: string) {
  return stripMarkup(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function renderInlineMarkup(value: string) {
  const tokenPattern = /(<strong>.*?<\/strong>|<em>.*?<\/em>)/g;
  const parts = value.split(tokenPattern).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("<strong>") && part.endsWith("</strong>")) {
      return (
        <strong key={`strong-${index}`}>
          {decodeEntities(part.replace(/<\/?strong>/g, ""))}
        </strong>
      );
    }

    if (part.startsWith("<em>") && part.endsWith("</em>")) {
      return (
        <em key={`em-${index}`}>
          {decodeEntities(part.replace(/<\/?em>/g, ""))}
        </em>
      );
    }

    return <Fragment key={`text-${index}`}>{decodeEntities(part)}</Fragment>;
  });
}

function renderDefinition(definition: string) {
  const tokenPattern = /(<strong>.*?<\/strong>|<em>.*?<\/em>|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  const parts = definition.split(tokenPattern).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("<strong>") && part.endsWith("</strong>")) {
      return (
        <strong key={`strong-${index}`}>
          {decodeEntities(part.replace(/<\/?strong>/g, ""))}
        </strong>
      );
    }

    if (part.startsWith("<em>") && part.endsWith("</em>")) {
      return (
        <em key={`em-${index}`}>{decodeEntities(part.replace(/<\/?em>/g, ""))}</em>
      );
    }

    if (part.startsWith("\\[") && part.endsWith("\\]")) {
      return (
        <div key={`block-${index}`} className="my-3 max-w-full overflow-x-auto">
          <BlockMath math={part.slice(2, -2)} />
        </div>
      );
    }

    if (part.startsWith("\\(") && part.endsWith("\\)")) {
      return <InlineMath key={`inline-${index}`} math={part.slice(2, -2)} />;
    }

    return <Fragment key={`text-${index}`}>{decodeEntities(part)}</Fragment>;
  });
}

export function GlossaryPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const activeTab = pathname.startsWith("/glossary/")
    ? pathname.slice("/glossary/".length).split("/")[0] || "terms"
    : "terms";

  useEffect(() => {
    if (pathname === "/glossary") {
      navigate("terms", { replace: true });
    }
  }, [navigate, pathname]);

  const groupedEntries = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    const groups = new Map<string, typeof glossaryEntries>();

    for (const entry of glossaryEntries) {
      const searchText = normalizeSearchText(`${entry.term} ${entry.category} ${entry.definition}`);
      if (normalizedQuery && !searchText.includes(normalizedQuery)) {
        continue;
      }

      const group = groups.get(entry.category) ?? [];
      group.push(entry);
      groups.set(entry.category, group);
    }

    return [...groups.entries()].map(([category, entries]) => ({ category, entries }));
  }, [query]);

  return (
    <ModuleTabsLayout
      title="Glossário"
      subtitle={
        <p className="text-sm text-muted-foreground">
          Consulte termos, conceitos, fórmulas e referências usados ao longo dos módulos do DCOU.
        </p>
      }
      tabs={glossaryTabs}
    >
      {activeTab === "terms" ? (
        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Termos</h2>
            <p className="text-sm text-muted-foreground">
              Pesquise por termo, categoria ou trecho da definição para localizar o conceito
              relevante.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="glossary-search" className="text-sm font-medium text-slate-700">
              Pesquisar no glossário
            </label>
            <input
              id="glossary-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: Reynolds, Arrhenius, NPSH"
              className={inputClassName}
            />
          </div>

          <div className="space-y-6 min-w-0">
            {groupedEntries.length ? (
              groupedEntries.map((group) => (
                <section key={group.category} className="space-y-3 min-w-0">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.category}
                  </h3>
                  <div className="grid gap-4">
                    {group.entries.map((entry) => (
                      <article key={entry.term} className="min-w-0 rounded-xl border p-4">
                        <h4 className="font-medium">{renderInlineMarkup(entry.term)}</h4>
                        <div className="mt-2 min-w-0 space-y-2 text-sm leading-6 text-slate-600">
                          {renderDefinition(entry.definition)}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                Nenhum termo corresponde à pesquisa informada.
              </div>
            )}
          </div>
        </section>
      ) : null}
    </ModuleTabsLayout>
  );
}
