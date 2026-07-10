# TCC Monograph Presentation Design

## Goal

Definir a apresentação em `Beamer` da monografia do DCOU como uma defesa de `40 minutos` com narrativa de produto/projeto, preservando caráter explícito de monografia e usando uma demonstração ao vivo como evidência central de que o sistema existe, funciona e possui valor didático e computacional.

## Scope

Este design cobre:

- estrutura narrativa da defesa
- distribuição macro de tempo
- função de cada bloco da apresentação
- papel da demonstração ao vivo
- escopo do deck de slides
- direção visual do material em `Beamer`
- mensagens centrais da conclusão

Este design não cobre ainda:

- escrita slide a slide
- implementação do tema `Beamer`
- seleção final de capturas de tela
- roteiro oral detalhado frase a frase
- preparação operacional do ambiente de demo

## Current Context

A monografia está centralizada em [monograph/TEX/main.tex](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/monograph/TEX/main.tex) e capítulos associados, com foco no desenvolvimento do DCOU como ferramenta didática aberta para Engenharia Química.

Os capítulos já estabelecem os eixos que a apresentação precisa reutilizar:

- problema e motivação
- objetivos
- desenvolvimento de software
- arquitetura e API
- validação
- recursos didáticos
- resultados e conclusões

O material existente também já oferece muitas imagens candidatas a reaproveitamento em slides, especialmente em [monograph/TEX/media](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/monograph/TEX/media).

## Audience and Positioning

A apresentação deve ser tratada como `monografia com um pé em produto`.

Isso significa:

- o trabalho precisa parecer academicamente defensável, não um pitch
- o sistema precisa aparecer como artefato real e inovador
- a banca deve perceber equilíbrio entre valor didático e solidez técnica
- a monografia continua sendo a moldura principal da defesa

## Presentation Objectives

Ao final da defesa, a banca deve sair com quatro convicções:

1. existe uma lacuna real entre ferramentas proprietárias e o uso didático acessível em operações unitárias
2. o DCOU responde a essa lacuna com uma plataforma computacional coerente e ampla
3. o sistema é tecnicamente sério, com arquitetura, validação de dados e evidências de confiabilidade
4. o projeto não termina na entrega atual, pois seu caráter `open source` o torna uma base evolutiva e institucional para a `UFMS`

## Recommended Narrative

### Approach

Usar uma narrativa híbrida em arco:

`problema -> solução -> demo -> fundamentação técnica -> validação -> contribuição e continuidade`

### Rationale

Essa abordagem foi escolhida porque:

- preserva o formato de defesa acadêmica
- valoriza a natureza inovadora do projeto
- acomoda uma demo ao vivo longa sem parecer enxerto
- permite mostrar o sistema antes de mergulhar em arquitetura e validação
- transforma a parte técnica em explicação do que a banca acabou de ver

## Time Budget

Distribuição recomendada para os `40 minutos`:

1. `Abertura e problema` — `4 a 5 min`
2. `Visão geral da solução` — `5 a 6 min`
3. `Demonstração ao vivo` — `8 a 10 min`
4. `Como o sistema foi construído` — `7 a 8 min`
5. `Validação e resultados` — `6 a 7 min`
6. `Conclusões e continuidade` — `4 a 5 min`

Essa distribuição deixa pequena folga para transições, respiração e variações normais de fala.

## Content Depth

### Mathematical Depth

A profundidade matemática deve ser `média`.

Implica:

- usar equações apenas para contextualizar
- reforçar que o sistema cobre múltiplos casos e múltiplas equações
- evitar transformar a defesa em derivação teórica longa
- priorizar visão de sistema, integração computacional e validação

### Module Coverage

Todos os módulos devem aparecer na defesa, exceto `trilhas de aprendizagem`.

Os módulos não devem ser tratados com profundidade longa individual. A defesa deve provar abrangência de plataforma, não aprofundar um único módulo como protagonista.

## Demo Strategy

A demonstração ao vivo não é acessória. Ela é um bloco central da prova da defesa.

Ela precisa mostrar:

- que o sistema existe e está operacional
- que o projeto cobre muitos módulos
- que o valor não está apenas no cálculo bruto, mas também em validação, visualizações, glossário e apoio didático
- que a proposta `open source` é concreta por poder rodar fora do ambiente publicado

### Demo Runtime Targets

A demonstração deve considerar três formas de execução:

1. versão `online` como caminho principal
2. execução `local em localhost` para reforçar abertura e reprodutibilidade
3. versão `Linux app` como bônus de portabilidade em evolução

### Demo Coverage

A demo deve percorrer o sistema de forma ampla e sintética, cobrindo:

- home e posicionamento geral do DCOU
- módulos de tubulações
- escoamento
- bombas
- propriedades
- reatores
- balanço de massa
- glossário
- visualizações
- exemplos/demos integrados

### Demo Risk Policy

Como a demo é ao vivo, o deck deve conter contingência explícita.

Plano recomendado:

- fonte principal: ambiente online
- backup operacional: `localhost`
- bônus: `Linux app`
- backup visual: slides com checkpoints e capturas sequenciais para queda de rede, falha de serviço ou problema de navegador

## What Each Block Must Prove

### 1. Abertura e problema

Precisa provar que a lacuna é real:

- ferramentas fortes existem, mas têm barreiras de acesso e didática
- há espaço para uma plataforma aberta com foco em ensino

### 2. Visão geral da solução

Precisa provar que o DCOU responde a essa lacuna de forma coerente:

- sistema amplo
- integração entre cálculo e apoio didático
- proposta além de uma calculadora isolada

### 3. Demonstração ao vivo

Precisa provar operacionalidade e abrangência:

- o sistema está funcionando
- os módulos coexistem numa plataforma única
- a interface e os recursos didáticos são reais

### 4. Como o sistema foi construído

Precisa provar rigor técnico:

- arquitetura cliente-servidor
- `backend`
- `frontend`
- `API` aberta
- validação de dados
- deploy e distribuição

### 5. Validação e resultados

Precisa provar confiabilidade:

- comparações com literatura
- testes
- consistência dos resultados
- uso do módulo de demo/testes do backend como evidência adicional

### 6. Conclusões e continuidade

Precisa provar contribuição acadêmica e futuro institucional:

- valor didático real
- projeto `open source`
- base inicial pronta para evolução
- incorporação como repertório da `UFMS`

## Deck Shape

O deck deve ter aproximadamente `22 a 26 slides`.

Distribuição recomendada:

1. capa
2. problema e motivação — `2 slides`
3. objetivo e proposta do DCOU — `2 slides`
4. escopo do sistema — `2 a 3 slides`
5. apoio à demo — `3 a 4 slides`
6. arquitetura e construção — `4 a 5 slides`
7. validação e resultados — `3 a 4 slides`
8. contribuição acadêmica e institucional — `2 slides`
9. conclusão — `1 slide`
10. perguntas — `1 slide` opcional

## Slide Types

Priorizar:

- slides de mensagem
- slides-mapa
- slides de evidência
- slides de apoio à demo
- slide final de legado institucional

Evitar:

- tabelas densas
- excesso de texto
- excesso de equações
- screenshots sem função narrativa
- repetição literal da monografia em bullets

## Visual Direction

### Format

- `Beamer`
- `16:9`
- horizontal (`landscape`)

### Style

O visual deve ser sóbrio, técnico e acadêmico, sem aparência de apresentação corporativa agressiva.

Direção recomendada:

- paleta limpa com uma cor principal e uma cor de destaque
- screenshots grandes e legíveis
- diagramas simples
- pouco texto por slide
- hierarquia forte de títulos
- densidade visual controlada

### Verbal Tone Support

Os slides devem sustentar uma fala:

- segura
- técnica
- acessível
- focada em conectar decisão computacional com valor didático

## Core Message

A mensagem central da defesa deve ser:

`O DCOU não é apenas um conjunto de calculadoras; é uma base computacional aberta para ensino de operações unitárias, que integra cálculo confiável, validação de dados e recursos didáticos em uma plataforma evolutiva.`

## Conclusion Message

A conclusão deve encerrar com três afirmações claras:

1. o DCOU já entrega valor real hoje
2. o projeto é apenas o início de uma plataforma aberta em evolução
3. por integrar o repertório da `UFMS`, a base pode crescer com a contribuição de estudantes, pesquisadores e demais usuários, ampliando módulos, robustez e segurança ao longo do tempo

## Success Criteria

O design será considerado correto se o deck final:

- couber com conforto em `40 minutos`
- sustentar uma demo ao vivo de `8 a 10 minutos`
- parecer uma defesa de monografia, não um pitch
- provar amplitude do sistema sem aprofundar demais um único módulo
- apresentar validação com peso suficiente para credibilidade
- encerrar com contribuição acadêmica e perspectiva institucional clara

## Out of Scope Risks To Handle Later

Esses pontos não precisam ser resolvidos neste design, mas devem ser tratados na fase de planejamento/execução:

- seleção exata das capturas de contingência
- preparação do ambiente online e local para demo
- plano de fallback caso o serviço público esteja indisponível
- definição do tema visual final em `Beamer`
- ordem exata de navegação da demo
