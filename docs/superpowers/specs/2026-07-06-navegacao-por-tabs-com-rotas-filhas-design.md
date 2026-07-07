# Design: Navegação por tabs com rotas filhas

**Data:** 2026-07-06  
**Escopo:** transformar as telas principais do frontend em navegação por tabs com rotas filhas, mantendo o estado dos campos ao trocar de aba, refletindo a aba ativa na URL e preservando o histórico do navegador para `back`/`forward`. O foco é a área de módulos do DCOU: Tubulações, Dimensionamento, Escoamento, Bombas, Componentes, Reatores, Balanço, Glossário e Exercícios.  
**Fora de escopo:** redesenhar o conteúdo técnico de cada calculadora, alterar contratos de API, mudar a lógica de cálculo ou introduzir novos módulos de domínio.

---

## 1. Contexto

Hoje o frontend expõe vários módulos como páginas longas com cards empilhados. Isso funciona, mas concentra informação demais ao mesmo tempo e dificulta a exploração em telas densas.

O problema fica mais claro nas páginas com muitos blocos independentes:

- `Tubulações` hoje reúne `Composições`, `Schedules e Diâmetros` e `Conexões` na mesma tela.
- `Dimensionamento` reúne `Diâmetro Calculado`, `Diâmetro Real` e `Modo Exploratório`.
- `Componentes`, `Reatores` e `Balanço` concentram ainda mais seções.
- `Glossário` e `Exercícios` são menos card-based, mas também se beneficiam da mesma navegação com subrotas.

A mudança proposta não é apenas visual. Ela altera a unidade de navegação: cada bloco principal passa a ser uma rota filha, e a tab vira a representação visual dessa rota.

---

## 2. Objetivo

Criar um padrão de navegação único para as telas principais do DCOU:

- cada módulo principal continua tendo sua rota pai;
- cada bloco principal da tela vira uma rota filha e uma tab;
- a tab ativa fica refletida na URL;
- o estado preenchido pelo usuário sobrevive à troca de tab;
- a navegação do navegador continua funcionando de forma natural.

O resultado esperado é uma interface menos sobrecarregada, mais previsível e com links diretos por seção.

---

## 3. Decisão Aprovada

A solução escolhida é:

1. Usar **rotas filhas reais** para representar tabs.
2. Manter um **shell por módulo** que guarda o estado compartilhado.
3. Renderizar a navegação de tabs como links/rotas, não como tabs puramente locais.
4. Redirecionar rota pai e rotas inválidas para a aba padrão do módulo.
5. Aplicar o padrão em todas as rotas de módulo do frontend, não só em Tubulações e Dimensionamento. `Home` continua como tela de overview.

### Consequência prática

O app deixa de tratar essas seções como uma única página longa e passa a tratá-las como pequenas subpáginas dentro de cada módulo. Isso reduz a carga visual sem quebrar a estrutura atual do produto.

---

## 4. Alternativas Consideradas

### 4.1 `?tab=...` na query string

Prós:

- menos mudanças no router;
- URLs simples;
- fácil de implementar.

Contras:

- navegação menos semântica;
- pior encaixe com a estrutura atual de páginas;
- menos clara para deep links de longo prazo.

### 4.2 Tabs locais sem rota

Prós:

- implementação rápida;
- bom para estado temporário.

Contras:

- não suporta deep link de forma real;
- back/forward não representa a aba corretamente;
- perde o requisito principal do pedido.

### 4.3 Rotas filhas

Prós:

- URL explícita por aba;
- deep link funcional;
- histórico do navegador preservado;
- encaixa com o `react-router` já usado no app.

Contras:

- exige reorganizar o estado por módulo;
- aumenta um pouco a estrutura de rotas.

### Direção escolhida

A alternativa 3 é a adotada.

---

## 5. Arquitetura Alvo

### 5.1 Estrutura geral

O app passa a ter três camadas de navegação:

- `AppShell`: shell global do sistema;
- `ModuleTabsLayout`: shell do módulo com tabs e estado compartilhado;
- `TabRoute`: conteúdo específico de cada rota filha.

### 5.2 Comportamento do shell

O shell do módulo é responsável por:

- exibir o título e o texto de apoio do módulo;
- renderizar a barra de tabs na largura total da área principal;
- manter o estado dos campos e resultados enquanto o usuário troca de tab;
- expor um `Outlet` para o conteúdo da rota filha;
- redirecionar para a tab padrão quando necessário.

### 5.3 Relação entre tabs e estado

As tabs devem ser links de rota, mas o estado do formulário não deve viver dentro do componente da tab isolada. O estado precisa ficar:

- no shell do módulo;
- ou em um hook/contexto local ao módulo;
- nunca em um estado local que desaparece ao navegar para outra tab.

Isso preserva o que o usuário já digitou.

### 5.4 Comportamento de carregamento

Cada tab continua podendo fazer fetch próprio, mas:

- as requisições precisam ser isoladas por rota;
- respostas atrasadas não podem sobrescrever a tab errada;
- ao sair de uma tab, efeitos assíncronos pendentes devem ser ignorados ou cancelados.

---

## 6. Mapa De Rotas

### 6.1 Tubulações

- `/piping/compositions` -> `Composições`
- `/piping/schedules-diameters` -> `Schedules e Diâmetros`
- `/piping/connections` -> `Conexões`

### 6.2 Dimensionamento

- `/sizing/calculated-diameter` -> `Diâmetro Calculado`
- `/sizing/real-diameter` -> `Diâmetro Real`
- `/sizing/exploratory` -> `Modo Exploratório`

### 6.3 Escoamento

- `/flow/reynolds` -> `Número de Reynolds`
- `/flow/friction-factor` -> `Fator de Atrito`
- `/flow/hydraulic-diameter` -> `Diâmetro Hidráulico`

### 6.4 Bombas

- `/pump/headloss` -> `Perda de Carga`
- `/pump/npsh` -> `NPSH Disponível`
- `/pump/head` -> `Altura Manométrica`
- `/pump/pressure-profile` -> `Perfil de pressão`

### 6.5 Componentes

- `/components/critical-properties` -> `Propriedades Críticas`
- `/components/pure-fluid` -> `Fluido Puro`
- `/components/state-properties` -> `Propriedades por Estado`
- `/components/mixtures` -> `Misturas`
- `/components/ternary-diagram` -> `Diagrama Ternário`
- `/components/binary-vle` -> `Diagrama T-x-y / y-x`
- `/components/mccabe-thiele` -> `McCabe-Thiele`
- `/components/property-surface` -> `Superfície de Propriedades`
- `/components/phase-envelope` -> `Envelope de Fase`

### 6.6 Reatores

- `/reactor/calculations` -> `Cálculos de Reator`
- `/reactor/cstr` -> `CSTR`
- `/reactor/pfr` -> `PFR`
- `/reactor/arrhenius` -> `Arrhenius`

### 6.7 Balanço

- `/balance/components` -> `Componentes`
- `/balance/actions` -> `Ações`
- `/balance/streams` -> `Correntes`
- `/balance/reactions` -> `Reações`
- `/balance/splits-recycle` -> `Splits / Reciclo`
- `/balance/results` -> `Resultados do Balanço`
- `/balance/yields` -> `Rendimentos`

### 6.8 Glossário

O glossário usa tabs por categoria, mantendo a busca no topo da área:

- `/glossary/hydraulics` -> `Hidráulica`
- `/glossary/dimensioning` -> `Dimensionamento`
- `/glossary/pumps` -> `Bombas`
- `/glossary/reactors` -> `Reatores`
- `/glossary/components` -> `Componentes`
- `/glossary/balance` -> `Balanço`
- `/glossary/thermodynamics` -> `Termodinâmica`

### 6.9 Exercícios

O catálogo de exercícios fica tabulado por runners/famílias já existentes:

- `/exercises/catalog` -> `Catálogo`
- `/exercises/heat-exchanger` -> `Trocador de Calor`
- `/exercises/rankine` -> `Rankine`
- `/exercises/balance-simple` -> `Balanço Simples`
- `/exercises/balance-recycle` -> `Balanço com Reciclo`
- `/exercises/balance-purge` -> `Balanço com Purga`

Se novas famílias forem adicionadas depois, elas entram como novas rotas filhas sem quebrar o shell.

### 6.10 Home

`/` permanece como tela de entrada/overview. Ela não precisa virar um conjunto de tabs, porque sua função é orientar a navegação para os módulos.

---

## 7. Regras De UX

### 7.1 Tabs em largura total

A barra de tabs deve ocupar toda a largura disponível do módulo. Em telas menores, ela pode rolar horizontalmente, mas não deve quebrar a leitura empilhando todos os itens em várias linhas.

### 7.2 Menos informação por vez

Cada tab mostra apenas o bloco ativo. O objetivo é reduzir a quantidade de cartões visíveis simultaneamente.

### 7.3 Estado preservado

Ao trocar de tab:

- os valores digitados permanecem;
- resultados anteriores continuam disponíveis quando o usuário volta;
- não deve haver reset implícito.

### 7.4 Deep link e histórico

- abrir uma URL filha deve cair diretamente na tab correspondente;
- voltar/avançar deve alternar entre tabs sem perder contexto;
- rota pai sem filha deve cair na tab padrão;
- rota filha inválida deve redirecionar para a tab padrão do módulo.

### 7.5 Acessibilidade

As tabs devem ser navegáveis por teclado e indicar estado ativo de forma clara. O ideal é que o item ativo também funcione bem com `aria-current`/estado selecionado do router.

---

## 8. Casos Especiais

### 8.1 Telas densas

`Componentes`, `Reatores` e `Balanço` têm mais conteúdo do que `Tubulações` e `Dimensionamento`. Nelas, o shell de tabs precisa evitar virar apenas uma troca cosmética. O conteúdo ativo deve ficar realmente isolado do restante.

### 8.2 Telas com fluxo guiado

`Exercícios` e parte de `Reatores` têm fluxos com etapas internas. Nesse caso:

- a rota filha identifica a família principal;
- o fluxo interno continua existindo dentro da tab;
- a troca de tab não deve apagar o progresso do runner enquanto o usuário permanecer no módulo.

### 8.3 Requisições pendentes

Se o usuário trocar de tab enquanto uma requisição ainda está em andamento, a resposta antiga não pode “voltar” e preencher a tab errada. O padrão atual de `ignore`/cancelamento precisa continuar.

---

## 9. Estrutura De Código

A organização alvo fica próxima a isto:

```text
frontend/src/
  app/router.tsx
  components/
    module-tabs-layout.tsx
  features/
    piping/
      piping-page.tsx
      piping-tabs.ts
    sizing/
      sizing-page.tsx
      sizing-tabs.ts
    flow/
      flow-page.tsx
      flow-tabs.ts
    pump/
      pump-page.tsx
      pump-tabs.ts
    components/
      components-page.tsx
      components-tabs.ts
    reactor/
      reactor-page.tsx
      reactor-tabs.ts
    balance/
      balance-page.tsx
      balance-tabs.ts
    glossary/
      glossary-page.tsx
      glossary-tabs.ts
    exercises/
      exercises-page.tsx
      exercises-tabs.ts
```

Os arquivos `*-tabs.ts` centralizam o mapa de tabs de cada módulo para evitar espalhar labels, paths e ordem em vários lugares.

---

## 10. Testes E Critérios De Aceitação

### 10.1 Critérios de aceitação

- Abrir `/piping/compositions`, `/sizing/calculated-diameter` e outras rotas filhas mostra a tab correta ativa.
- Trocar de tab altera a URL sem recarregar a aplicação.
- O browser `back`/`forward` alterna entre tabs corretamente.
- Os campos preenchidos em uma tab continuam preenchidos ao voltar para ela.
- Rota pai e rota inválida redirecionam para a tab padrão.
- A navegação funciona em telas pequenas sem quebrar layout.

### 10.2 Testes

- testes unitários/integração para o roteamento de cada módulo;
- testes de página verificando que os valores persistem após troca de rota;
- testes e2e cobrindo pelo menos:
  - `Tubulações` com troca entre tabs;
  - `Dimensionamento` com preservação de estado;
  - uma tela mais densa, como `Reatores` ou `Balanço`;
  - deep link direto em uma rota filha.

---

## 11. Decisão Final

Este desenho mantém a interface mais legível sem perder profundidade funcional:

- tabs viram navegação real;
- cada bloco principal vira uma subrota;
- o histórico do navegador passa a fazer parte do fluxo;
- o usuário deixa de ver tudo ao mesmo tempo e passa a trabalhar por recortes menores.

O padrão é consistente em todas as rotas principais de módulo do DCOU e pode ser expandido sem reescrever a navegação de novo.
