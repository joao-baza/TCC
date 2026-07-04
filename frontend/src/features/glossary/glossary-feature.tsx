"use client";

import { useMemo, useState } from "react";
import { glossaryTerms } from "@/features/glossary/terms";
import { CompactBars, SectionHeader, SurfaceCard } from "@/features/shell/shell-ui";

export function GlossaryFeature() {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleTerms = glossaryTerms.filter((term) => {
      if (!normalizedQuery) {
        return true;
      }

      return `${term.term} ${term.def} ${term.cat}`.toLowerCase().includes(normalizedQuery);
    });

    const categories = [...new Set(visibleTerms.map((term) => term.cat))];

    return categories.map((category) => ({
      category,
      terms: visibleTerms.filter((term) => term.cat === category)
    }));
  }, [query]);

  const categoryCounts = useMemo(
    () =>
      [...new Set(glossaryTerms.map((term) => term.cat))].map((category) => ({
        label: category,
        value: glossaryTerms.filter((term) => term.cat === category).length,
        detail: "termos"
      })),
    []
  );

  return (
    <div className="glossary-shell" id="glossary-content">
      <SurfaceCard
        eyebrow="Recursos"
        title="Glossário"
        description="Use a pesquisa para recuperar rapidamente os termos técnicos mais relevantes para a disciplina."
      >
        <SectionHeader
          description="As categorias ajudam o aluno a navegar pela base conceitual sem sair da mesma tela."
          title="Consulta rápida"
        />

        <div className="glossary-toolbar">
          <input
            aria-label="Pesquisar no glossário"
            className="glossary-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar termo…"
            role="searchbox"
            type="search"
            value={query}
          />

          <div className="glossary-meta">
            <span className="glossary-chip">{glossaryTerms.length} termos</span>
            <span className="glossary-chip">{filteredGroups.length} categorias visíveis</span>
            <span className="glossary-chip">Pesquisa instantânea</span>
          </div>
        </div>
      </SurfaceCard>

      <div className="module-page-grid">
        <div className="module-stack">
          {filteredGroups.map((group) => (
            <SurfaceCard key={group.category} eyebrow={group.category} title={`Termos de ${group.category}`}>
              <div className="glossary-section">
                {group.terms.map((term) => (
                  <div className="glossary-term" key={term.term}>
                    <dt className="glossary-dt">{term.term}</dt>
                    <dd className="glossary-dd">{term.def}</dd>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          ))}
        </div>

        <div className="module-stack">
          <SurfaceCard eyebrow="Mapa conceitual" title="Categorias do glossário">
            <CompactBars bars={categoryCounts} description="Uma leitura rápida da cobertura conceitual disponível." title="Distribuição por categoria" />
          </SurfaceCard>

          <SurfaceCard eyebrow="Uso em aula" title="Como apoiar a turma">
            <SectionHeader
              description="O glossário serve como ponto de consulta antes e depois dos cálculos."
              title="Estratégia recomendada"
            />
            <div className="didactic-list">
              <div className="didactic-item">
                <div className="didactic-index">1</div>
                <div>
                  <div className="didactic-item-title">Antes do módulo</div>
                  <div className="didactic-item-detail">
                    Use a busca para alinhar termos como Reynolds, schedule e NPSH antes de iniciar o exercício.
                  </div>
                </div>
              </div>
              <div className="didactic-item">
                <div className="didactic-index">2</div>
                <div>
                  <div className="didactic-item-title">Durante a resolução</div>
                  <div className="didactic-item-detail">
                    Consulte a definição enquanto discute o significado físico de cada variável e unidade.
                  </div>
                </div>
              </div>
              <div className="didactic-item">
                <div className="didactic-index">3</div>
                <div>
                  <div className="didactic-item-title">Depois da leitura</div>
                  <div className="didactic-item-detail">
                    Reforce a terminologia técnica para que o estudante navegue com mais autonomia.
                  </div>
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
