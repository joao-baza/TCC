# Design: Reversão do Modo Exploratório no Frontend Legado

**Data:** 2026-07-04  
**Escopo:** restaurar o frontend legado em HTML, CSS e JavaScript puros para o estado anterior à frente visual exploratória aplicada em 2026-07-03.  
**Fora de escopo:** alterar a trilha Next.js em `frontend/src/**`, remover a base Next do repositório, ou mudar backend e contratos de API.

## 1. Contexto

O deploy atual publicado por `deploy_app.sh` continua servindo o frontend legado a partir de `frontend/index.html` e demais assets estáticos em `frontend/`.

Em 2026-07-03, uma frente visual introduziu o modo exploratório didático no frontend legado por meio dos commits:

- `eab2956` `feat: add exploratory lab visual containers`
- `9bf41db` `feat: orchestrate exploratory lab scroll and copy`
- `c17f3cc` `fix: trim exploratory lab task 2 scope`
- `8a7c9c0` `fix: rerender exploratory visuals after slider updates`
- `8967e14` `feat: render exploratory module visuals`

O objetivo desta reversão é voltar o frontend legado para a experiência anterior a essa frente, preservando a arquitetura baseada em HTML estático, CSS global e módulos JS puros.

## 2. Objetivo

Restaurar o frontend legado para o comportamento visual e estrutural anterior ao modo exploratório, de forma alinhada ao visual hoje publicado pelo deploy tradicional.

Isso significa:

- remover os contêineres e fluxos do mini-laboratório exploratório;
- remover a orquestração de scroll e cópia específica dessa frente;
- remover a renderização visual embutida adicionada exclusivamente para o modo exploratório;
- manter o restante do frontend legado funcional sem tocar na trilha Next.js.

## 3. Estratégia

A reversão será feita por restauração seletiva dos arquivos afetados para o estado anterior aos commits de 2026-07-03, em vez de usar `git revert` direto na sequência inteira.

Motivos:

- a restauração seletiva é mais precisa para voltar apenas a frente exploratória;
- evita conflitos desnecessários com commits corretivos encadeados no mesmo dia;
- reduz o risco de atingir trabalho paralelo em `frontend/src/**`.

## 4. Arquivos Alvo

Os arquivos com maior probabilidade de restauração são:

- `frontend/index.html`
- `frontend/css/styles.css`
- `frontend/js/modules/didatic.js`
- `frontend/js/modules/flow.js`
- `frontend/js/modules/pump.js`
- `frontend/js/modules/reactor.js`
- `frontend/js/modules/sizing.js`
- `frontend/js/modules/balance.js`

Arquivos fora desse conjunto só devem ser alterados se a verificação mostrar dependência direta da frente exploratória.

## 5. Regras de Implementação

- Não tocar em `frontend/src/**`, `frontend/package.json`, `frontend/next.config.ts` ou demais artefatos da trilha Next.
- Não reverter mudanças anteriores a 2026-07-03 que façam parte do legado já consolidado.
- Tratar a reversão como retorno ao estado anterior do frontend legado, não como remoção geral de melhorias visuais históricas.
- Preservar o comportamento do deploy atual baseado em `deploy/Dockerfile.frontend` e `frontend/index.html`.

## 6. Verificação

A validação da reversão deve cobrir:

1. diff restrito aos arquivos do frontend legado afetados;
2. ausência dos blocos e hooks do modo exploratório nos arquivos restaurados;
3. checagem automatizada compatível com o estado final.

Como existe uma suíte `demo/tests/test_exploratory_mode.py` dedicada à feature revertida, ela deve ser revista durante a implementação:

- se ainda fizer sentido parcialmente, será adaptada ao estado legado;
- se validar apenas a feature removida, será excluída ou substituída por checagem compatível com o legado restaurado.

## 7. Resultado Esperado

Ao final, o repositório continuará contendo a trilha Next.js como trabalho paralelo, mas o frontend legado em `frontend/` voltará ao estado pré-modo-exploratório, coerente com o deploy tradicional em HTML, CSS e JS puros.
