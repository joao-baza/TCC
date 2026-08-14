# Implementation Plan: SVGs de Fittings de Tubulacao

## Overview
Produzir uma familia simples e consistente de SVGs para uma selecao de 15 fittings retornados pelo backend de tubulacao e integra-los ao catalogo P&ID. Os SVGs devem funcionar como icones conectaveis, com extremidades e portas normalizadas alinhadas a geometria visual.

## Architecture Decisions
- Os SVGs de revisao permanecem em `frontend/public/pid/fitting-symbols/`; as copias canonicas do editor ficam em `frontend/public/pid/symbols/`.
- O estilo base sera derivado de `piping.svg`: traco escuro, hachura interna quando fizer sentido, `viewBox` pequeno e `vector-effect="non-scaling-stroke"`.
- Cada fitting tera extremidades visuais alinhaveis a portas futuras. A precisao hidraulica nao e requisito desta fase.
- O manifesto `project-fittings.ts` registra os assets como fonte `project`, com `portTemplates` alinhados aos pontos terminais dos desenhos.

## Scope
Incluido:
- Inventario dos fittings existentes no backend e curadoria de 15 SVGs finais.
- Criacao/revisao de SVGs estaticos.
- Padronizacao visual de dimensoes, stroke e pontos de conexao visuais.
- Validacao basica de SVG bem formado e renderizavel.
- Registro dos 15 fittings no catalogo local e validacao de insercao/conexao.
- Substituicao visual da linha de processo pelo modulo repetivel `piping.svg` no canvas e nas exportacoes.

Fora de escopo nesta fase:
- Alteracao dos manifestos gerados `drawio-catalog.json` ou `drawio-pid2-catalog.json`.
- Calculo automatico de perdas a partir do canvas.

## Fitting Inventory
- Retorno 180
- Cotovelo 90 raio longo
- Cotovelo 90 raio curto
- Te passagem reta
- Saida de tanque
- Valvula diafragma
- Valvula esfera
- Valvula gaveta
- Valvula retencao de pe
- Valvula agulha
- Valvula globo aberta
- Valvula borboleta
- Cotovelo 90 raio medio
- Entrada normal
- Valvula retencao leve

## Task List

### Phase 1: Foundation
- [x] Task 1: Normalize the visual template
- [x] Task 2: Define naming and geometry conventions
- [x] Task 3: Group fittings by reusable shape families

### Checkpoint: Foundation
- [x] `piping.svg` remains available as the style reference.
- [x] File names, viewBox sizes, and visual connection points are documented.

### Phase 2: SVG Production
- [x] Task 4: Produce pipe and bend family SVGs.
- [x] Task 5: Produce tee, entry, exit, return, and curve SVGs.
- [x] Task 6: Produce valve family SVGs.
- [x] Task 7: Produce filter and specialty SVGs.

### Checkpoint: SVG Production
- [x] All 15 selected SVG files exist in the staging folder.
- [x] Each SVG opens independently and has an accessible title/description.

### Phase 3: Review and Promotion Readiness
- [x] Task 8: Run static validation over all SVGs.
- [x] Task 9: Create a visual contact sheet for review.
- [x] Task 10: Prepare catalog metadata draft for future integration.

### Checkpoint: Complete
- [x] The folder contains one reviewed SVG per selected fitting.
- [x] The canonical ports are registered per fitting type.
- [x] The editor catalog can search, insert, rotate, and connect the selected fittings.
- [x] Process-line rendering uses the repeatable `piping.svg` asset.

### Phase 4: Catalog Integration
- [x] Task 11: Promote the 15 canonical assets to `frontend/public/pid/symbols/`.
- [x] Task 12: Register project-owned catalog entries with exact visual anchors.
- [x] Task 13: Validate sanitization, insertion, geometry, tests, build, and browser rendering.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| SVGs look inconsistent across families | Medium | Keep a shared template for stroke, pipe thickness, hachura, and viewBox scale. |
| Catalog assets drift from the reviewed SVGs | Medium | Keep canonical assets prefixed with `project-fittings-` and cover every entry with sanitizer tests. |
| Some fittings are visually similar | Low | Use shape families plus clear filenames/titles; exact hydraulic precision is not required. |
| Port anchors drift from visual endpoints | Medium | Derive normalized anchors from each SVG viewBox and terminal coordinates. |

## Open Questions
- Whether the final SVG set should use only horizontal orientation plus rotation in the canvas, or include explicit vertical variants for easier visual review.
- Whether hachura should appear inside every fitting or only in pipe-like bodies.

---

# Implementation Plan: Melhorias visuais canvas-first do editor P&ID

## Overview

Implementar o design aprovado para `/pid/<pid>`: o canvas passa a ser a superfície dominante, catálogo e inspetor tornam-se docks contextuais com rails persistentes, o estado de sincronização sobe para o cabeçalho e a interface mantém o chrome escuro com canvas claro. A implementação deve alterar apenas apresentação e estado de interface, preservando `PidDocument`, autosave, colaboração, validação, exportação e links compartilhados.

## Architecture Decisions

- Manter a composição principal em `pid-editor-page.tsx`, extraindo somente estado/rail reutilizável quando isso reduzir a complexidade do shell.
- Persistir a abertura dos docks em estado de apresentação por diagrama durante a sessão, usando chave de `sessionStorage`; nunca gravar esse estado no documento canônico.
- Usar CSS Grid e rails de pelo menos 44px no desktop; entre 768px e 1279px, somente um dock pode estar expandido; abaixo de 768px, manter a edição bloqueada e melhorar o modo somente leitura.
- Reutilizar os componentes existentes (`CatalogPanel`, `PropertiesInspector`, `ValidationPanel`, `StatusBar`, `EditorToolbar`) e os tokens escopados por `PidThemeProvider`.
- Fazer a mudança em fatias verificáveis: shell primeiro, depois conteúdo dos docks, header/status, e por fim polimento/responsividade.

## Dependency Graph

```text
Estado de dock + breakpoint
        |
        +--> Shell/rails e área do canvas
        |         |
        |         +--> Catálogo contextual
        |         +--> Inspetor/validação contextual
        |
        +--> Header/status/feedback
                  |
                  +--> Tokens, canvas e estados visuais
                  +--> Regressões responsivas/acessíveis
```

## Task List

### Phase 1: Foundation

- [x] Task 1: Introduzir estado de docks e composição canvas-first.

### Checkpoint: Foundation

- [x] Testes focados do shell passam.
- [x] O editor inicia com canvas dominante, rails acessíveis e sem alterar o documento canônico.

### Phase 2: Contextual panels

- [x] Task 2: Reorganizar catálogo, inspetor e validação para o fluxo contextual.

### Checkpoint: Contextual panels

- [x] Catálogo e inspetor abrem/fecham com foco preservado.
- [x] Validação sem problemas permanece discreta; erros continuam acionáveis.

### Phase 3: Session chrome

- [x] Task 3: Reposicionar estado de sessão, status e feedback de operação.

### Checkpoint: Session chrome

- [x] O estado de salvamento aparece uma única vez no cabeçalho.
- [x] Erros de autosave e operação continuam anunciados e recuperáveis.

### Phase 4: Visual polish and responsive verification

- [x] Task 4: Aplicar tokens visuais e estados do canvas.
- [x] Task 5: Cobrir responsividade, acessibilidade e regressão visual do fluxo completo.

### Checkpoint: Complete

- [x] Build e suíte focada P&ID passam.
- [x] Viewports de 375, 414, 768, 1024, 1280 e 1440px foram verificados pela suíte E2E.
- [x] Todos os critérios de aceitação do spec foram verificados.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Docks sobrepostos escondem parte do desenho | High | Usar docks que reduzem a área do canvas no desktop e sheets com fechamento claro em telas menores; testar sem overflow horizontal. |
| Mudança de layout quebra testes de lifecycle e readonly | Medium | Atualizar asserções por contrato sem remover cobertura de autosave, edição em 768px e view-only. |
| Estado de dock contamina o documento salvo | High | Isolar em hook/sessionStorage por `diagramId`; adicionar teste que compara o payload de save antes/depois. |
| Status duplicado ou feedback difícil de localizar | Medium | Mover a fonte única de save/sync para o header e manter footer apenas para métricas secundárias. |
| Aumento de densidade prejudica acessibilidade | High | Manter alvos de 44px, foco visível, labels, `aria-expanded`, `aria-pressed`, reduced motion e verificação em texto ampliado. |

## Open Questions

Nenhuma para o escopo aprovado. A implementação deve seguir o spec `docs/superpowers/specs/2026-08-11-pid-canvas-first-visual-improvements-design.md`.
