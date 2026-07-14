# TCC Slide Expansion: Engineering Relevance and Complexity

## Goal

Adicionar `5 slides` a apresentacao Beamer do DCOU para reforcar dois pontos da defesa:

- por que o projeto e interessante para Engenharia Quimica;
- por que sua complexidade vai alem de uma colecao de calculadoras.

A expansao deve manter o tom hibrido ja aprovado para a defesa de TCC: TCC academico com um pe em produto tecnico inovador.

## Current Context

A apresentacao atual esta em `slides/`, com `slides/main.tex` incluindo as secoes:

1. `01-opening`
2. `02-solution`
3. `03-demo`
4. `04-architecture`
5. `05-validation`
6. `06-conclusion`

O deck ja segue a narrativa `problema -> solucao -> demo -> fundamentacao tecnica -> validacao -> contribuicao e continuidade`.

No estado atual, a apresentacao possui `33 frames` de conteudo e `4 transition frames`. A expansao deve, portanto, ser objetiva e evitar transformar a abertura ou a fundamentacao tecnica em blocos longos demais para uma defesa de `40 minutos`.

## Chosen Approach

Usar a abordagem `relevancia antes da demo, complexidade antes da arquitetura`.

### Rationale

Essa abordagem foi escolhida porque:

- convence a banca cedo de que o tema importa para Engenharia Quimica;
- preserva a demo como prova visual de que o sistema existe e funciona;
- permite que a complexidade tecnica seja explicada logo depois da experiencia observada na demo;
- evita empurrar a justificativa tecnica para o fechamento, quando ela teria menos forca narrativa.

## Insertions

### Engineering Relevance Slides

Inserir `2 slides` em `slides/sections/01-opening.tex`, logo depois de `Motivacao academica e tecnica` e antes de `Objetivo geral`.

#### Slide 1: Por que o DCOU interessa a Engenharia Quimica

Mensagem central: operacoes unitarias exigem conectar fenomeno, equacao, hipotese, unidade e interpretacao.

Conteudo esperado:

- hidraulica, propriedades, reatores e balancos normalmente aparecem como temas separados;
- no DCOU, esses temas convergem em uma base computacional unica;
- o projeto torna visivel a relacao entre modelo matematico e fenomeno fisico;
- o interesse do trabalho esta na integracao, nao apenas na automacao.

#### Slide 2: Do calculo isolado ao raciocinio de processo

Mensagem central: o valor didatico nao esta apenas no resultado numerico, mas no caminho que leva ate ele.

Conteudo esperado:

- entradas com unidades e hipoteses explicitas;
- validacao antes do calculo;
- resultado acompanhado de tabela, grafico ou interpretacao;
- possibilidade de alterar uma variavel por vez para observar sensibilidade;
- passagem de uma resposta pontual para raciocinio de processo.

### Complexity Slides

Inserir `3 slides` em `slides/sections/04-architecture.tex`, depois da transition frame `Base computacional` e antes de `Arquitetura em tres camadas`.

#### Slide 3: Complexidade quimica: muitos fenomenos, diferentes modelos

Mensagem central: o DCOU nao implementa um unico tipo de formula.

Conteudo esperado:

- escoamento interno envolve regime, atrito, rugosidade, diametro e perda de carga;
- bombas exigem NPSH, altura manometrica e ponto de operacao;
- propriedades termodinamicas dependem de temperatura, pressao, componente e mistura;
- reatores combinam cinetica, estequiometria, conversao e volume;
- balancos com correntes, reacoes, reciclo e divisao de corrente exigem coerencia de materia.

#### Slide 4: Complexidade integrada: transformar engenharia em software confiavel

Mensagem central: a dificuldade esta em converter modelos tecnicos em contratos, validacoes e respostas consistentes.

Conteudo esperado:

- backend como fonte dos calculos;
- validacao de entrada com contratos tipados;
- uso de bibliotecas cientificas para unidades, propriedades e metodos numericos;
- API como fronteira entre modelo de engenharia e interface;
- visualizacoes montadas a partir dos mesmos resultados, sem matematica paralela no frontend.

#### Slide 5: Complexidade didatica: rigor sem caixa-preta

Mensagem central: uma ferramenta didatica precisa simplificar a experiencia sem esconder a engenharia.

Conteudo esperado:

- exemplos coerentes reduzem barreira de entrada;
- graficos tornam tendencias e regimes mais visiveis;
- glossario e blocos explicativos conectam termos tecnicos ao calculo;
- mensagens de validacao devem orientar correcao, nao apenas bloquear uso;
- a interface deve preservar rastreabilidade de unidades, hipoteses e resultados.

## Scope Guard

Esta expansao nao deve:

- reestruturar toda a apresentacao;
- alterar a demo;
- mudar o tema Beamer;
- adicionar novas imagens obrigatorias;
- transformar os slides novos em derivacoes matematicas longas;
- duplicar conteudo ja presente em `Cobertura implementada`, `O backend e a fonte dos calculos` ou `Como a confiabilidade foi tratada`.

## Writing Guidelines

- Manter uma mensagem principal por slide.
- Preferir blocos e listas curtas, compativeis com leitura em defesa.
- Usar linguagem academica direta, sem tom de marketing.
- Reforcar que a complexidade e principalmente de Engenharia Quimica e integracao tecnico-didatica.
- Evitar repetir literalmente os slides ja existentes.

## Verification After Implementation

Depois da implementacao, verificar:

- compilacao do Beamer em `slides/`;
- ausencia de erros LaTeX;
- densidade visual dos novos slides;
- contagem final de frames;
- coerencia narrativa entre abertura, demo e arquitetura.
