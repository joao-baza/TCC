# Fitting Symbols

Pasta de trabalho e revisao dos SVGs selecionados para os fittings de tubulacao.

## Convencoes visuais
- Stroke principal: `#1F2937`.
- Preenchimento auxiliar: `#F8FAFC` e `#E5E7EB`.
- SVGs usam `vector-effect="non-scaling-stroke"` para manter traco legivel no canvas.
- Filenames ficam em ASCII/kebab-case; nomes em portugues ficam em `<title>` e no draft de metadados.
- Os desenhos priorizam extremidades alinhaveis para futuras portas, nao precisao normativa.

## Integracao
Os 15 fittings selecionados estao registrados no catalogo P&ID em
`frontend/src/features/pid/catalog/fixtures/project-fittings.ts`. As copias
canonicas usadas pelo editor ficam em `frontend/public/pid/symbols/` com o
prefixo `project-fittings-`.

Esta pasta permanece como superficie de revisao visual. Alteracoes aprovadas
devem ser replicadas no asset canonico correspondente e validadas pelos testes
do catalogo.

## Asset base
- `tubulacao-modular.svg`: referencia visual enviada pelo usuario.
