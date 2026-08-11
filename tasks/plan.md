# Implementation Plan: SVGs de Fittings de Tubulacao

## Overview
Produzir uma familia simples e consistente de SVGs para uma selecao de 15 fittings retornados pelo backend de tubulacao e integra-los ao catalogo P&ID. Os SVGs devem funcionar como icones conectaveis, com extremidades e portas normalizadas alinhadas a geometria visual.

## Architecture Decisions
- Os SVGs de revisao permanecem em `frontend/public/pid/fitting-symbols/`; as copias canonicas do editor ficam em `frontend/public/pid/symbols/`.
- O estilo base sera derivado de `tubulacao-modular.svg`: traco escuro, hachura interna quando fizer sentido, `viewBox` pequeno e `vector-effect="non-scaling-stroke"`.
- Cada fitting tera extremidades visuais alinhaveis a portas futuras. A precisao hidraulica nao e requisito desta fase.
- O manifesto `project-fittings.ts` registra os assets como fonte `project`, com `portTemplates` alinhados aos pontos terminais dos desenhos.

## Scope
Incluido:
- Inventario dos fittings existentes no backend e curadoria de 15 SVGs finais.
- Criacao/revisao de SVGs estaticos.
- Padronizacao visual de dimensoes, stroke e pontos de conexao visuais.
- Validacao basica de SVG bem formado e renderizavel.
- Registro dos 15 fittings no catalogo local e validacao de insercao/conexao.

Fora de escopo nesta fase:
- Alteracao dos manifestos gerados `drawio-catalog.json` ou `drawio-pid2-catalog.json`.
- Substituicao da linha de processo por tubulacao modular.
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
- [x] `tubulacao-modular.svg` remains available as the style reference.
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
- [x] Process-line rendering remains unchanged in this phase.

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
