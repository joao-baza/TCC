# TCC Equation Coverage Design

## Goal

Planejar uma auditoria tecnica para garantir que todas as equacoes de dominio implementadas no codigo e usadas para resultados de Engenharia Quimica estejam presentes, explicadas e rastreaveis no TCC.

Esta frente e separada das correcoes pontuais da banca ja registradas para slides, escrita e figuras. O objetivo aqui e conferir cobertura matematica entre codigo, texto do TCC e referencias antes de editar qualquer equacao ou explicacao.

## Scope

Entram no escopo apenas formulas, correlacoes e modelos que afetam resultados de Engenharia Quimica retornados pelo sistema.

Incluido:

- calculos hidraulicos: diametro calculado, selecao de diametro comercial, numero de Reynolds, fator de atrito, Darcy--Weisbach, Hazen--Williams, altura manometrica, NPSH, diametro hidraulico e curvas de bomba/sistema quando forem descritas como modelo de engenharia;
- reatores: reagente limitante, vazoes molares, concentracoes, lei de velocidade, fator de diluicao, variacao volumetrica, CSTR, PFR, PFR com reciclo, tempo de residencia, funcoes objetivo e integrais numericas;
- balanco de massa: balanco global, balanco por componente, normalizacao de composicoes, reacao/conversao, divisao de corrente, reciclo e purga;
- propriedades termofisicas: variaveis retornadas, unidades e uso do CoolProp como dependencia cientifica;
- equilibrio, VLE e McCabe--Thiele, quando houver equacao de dominio implementada no backend para gerar resultado tecnico, nao apenas visualizacao.

Fora do escopo:

- matematica puramente visual do frontend, como coordenadas, escalas, setas, interpolacao de cor, dominio de grafico e responsividade;
- refatoracao funcional do backend ou frontend;
- criacao de novos modelos de Engenharia Quimica;
- substituicao de referencias sem evidencia tecnica;
- edicao imediata do TCC antes da matriz de cobertura estar montada.

## Source Inputs

Fontes locais a comparar:

- codigo de dominio em `models/*.py`;
- rotas que transformam entradas e saidas em `routers/*.py`;
- texto principal em `final-paper/TEX/main.tex`;
- capitulos em `final-paper/TEX/chapters/*.tex`;
- bibliografia em `final-paper/TEX/bibliografia.bib`.

As principais areas de codigo ja identificadas sao:

- `models/hydraulic.py`;
- `models/reactor.py`;
- `models/mass_balance.py`;
- `models/components.py`;
- `routers/flow.py`;
- `routers/pump.py`;
- `routers/sizing.py`;
- `routers/reactor.py`;
- `routers/mass_balance.py`;
- `routers/components_router.py`.

## Chosen Approach

Usar uma matriz de cobertura orientada pelo codigo.

Cada formula de dominio encontrada no codigo deve virar uma linha da matriz. A linha deve registrar:

- identificador estavel;
- modulo e funcao no codigo;
- expressao matematica implementada;
- entrada e saida relevantes;
- unidade esperada;
- local correspondente no TCC;
- referencia ou citacao usada;
- classificacao de cobertura;
- decisao de edicao.

Classificacoes aceitas:

- `Coberta e explicada`;
- `Coberta, mas explicacao insuficiente`;
- `Implementada no codigo, ausente no TCC`;
- `No TCC, mas sem contraparte atual no codigo`;
- `Biblioteca externa documentada, sem formula propria`;
- `Fora de escopo: matematica visual`.

Essa abordagem foi escolhida porque evita depender apenas das equacoes ja existentes no TCC. A pergunta principal e: "o que o sistema calcula de fato e onde isso aparece no texto?".

## Audit Workflow

1. Criar `docs/superpowers/audits/2026-07-14-tcc-equation-coverage-audit.md`.
2. Capturar estado inicial com `git status --short --branch`.
3. Inventariar funcoes de dominio em `models/` e rotas publicas em `routers/`.
4. Extrair as equacoes ja existentes no TCC, incluindo `\label{eq:*}` e equacoes sem label.
5. Para cada funcao de dominio, preencher a matriz com codigo, formula, unidade, trecho do TCC e referencia.
6. Marcar funcoes auxiliares de grafico como fora do escopo quando nao alterarem resultado de Engenharia Quimica.
7. Revisar propriedades CoolProp como dependencia externa: documentar entrada, saida, unidade e papel no sistema, sem tentar derivar internamente as equacoes de estado da biblioteca.
8. Gerar uma lista de edicoes necessarias no TCC somente depois da matriz estar completa.
9. Validar que as futuras edicoes nao duplicam formulas entre metodologia e validacao sem necessidade.
10. Compilar o TCC apos as edicoes em uma etapa posterior de implementacao.

## Expected Findings

A auditoria deve produzir tres tipos de resultado:

1. Pontos ja corretos: equacoes implementadas e bem explicadas no TCC.
2. Lacunas de escrita: formulas presentes no codigo, mas ausentes ou pouco explicadas no TCC.
3. Inconsistencias: equacoes no TCC que nao correspondem ao codigo atual, usam simbolos diferentes, omitem unidade ou dependem de uma referencia nao explicitada.

## Editing Strategy For Later Implementation

Quando a matriz apontar uma lacuna, a edicao futura deve seguir estas regras:

- preferir complementar a secao existente em vez de criar uma secao nova;
- evitar repetir demonstracoes completas em metodologia e validacao;
- usar a metodologia para apresentar o modelo geral;
- usar a validacao para mostrar calculos numericos e comparacao com retorno do sistema;
- adicionar simbolos a lista de nomenclatura quando forem usados em equacoes principais;
- registrar quando uma formula vem de uma biblioteca externa, como CoolProp, e quando vem de implementacao propria.

## Acceptance Criteria

A frente sera considerada pronta para implementacao quando houver uma auditoria com:

- todas as funcoes de dominio de `models/` classificadas;
- rotas publicas de `routers/` mapeadas para as funcoes de dominio correspondentes;
- todas as equacoes do TCC classificadas como correspondentes ao codigo, validacao numerica, referencia teorica ou item sem contraparte;
- lista objetiva de edicoes necessarias no TCC;
- lista objetiva de itens sem edicao, com justificativa;
- nenhuma formula de dominio sem decisao de cobertura.

## Non-Goals

- Nao corrigir equacoes nesta spec.
- Nao alterar codigo.
- Nao alterar slides.
- Nao incluir matematica de renderizacao visual.
- Nao transformar a auditoria em revisao bibliografica ampla.
- Nao substituir o julgamento tecnico por extracao automatica de expressoes do codigo.
