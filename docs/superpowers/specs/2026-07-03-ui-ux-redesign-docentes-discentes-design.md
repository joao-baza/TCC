# Design: Redesenho de UI/UX do Frontend Next para Docentes e Discentes

**Data:** 2026-07-03  
**Escopo:** `frontend-next-migration`, com foco em home, navegação, estrutura dos módulos e experiência didática-operacional do DCOU.  
**Dependência documental:** qualquer novo módulo proposto e efetivamente adicionado ao produto deve ser refletido na escrita da tese em `/escrita`.

---

## 1. Contexto

O frontend migrado para Next.js já possui uma base funcional para:

- shell com navegação lateral;
- home com trilhas e acesso rápido;
- módulos iniciais de tubulações, dimensionamento, escoamento e glossário;
- cobertura de testes para navegação e fluxos principais.

Apesar disso, a experiência atual ainda carrega limitações estruturais:

- a home funciona mais como vitrine do que como ponto de decisão de uso;
- a navegação organiza o sistema pelo inventário de módulos, não pela jornada real de docentes e discentes;
- os módulos técnicos aparecem como blocos de formulário e resultado, com pouca orientação contextual;
- o valor pedagógico existe mais na intenção do produto do que na arquitetura da interface;
- a continuidade entre estudar, calcular, interpretar e avançar para o próximo passo ainda é fraca.

O redesenho deve preservar o rigor técnico de um software de Engenharia Química, mas adicionar camadas de orientação suficientes para tornar o produto útil tanto em estudo autônomo quanto em apoio didático.

---

## 2. Objetivo

Transformar o frontend migrado em um **estúdio de simulação didático**.

Esse conceito significa:

- o valor principal do produto aparece no uso direto dos módulos de cálculo;
- a interface ensina durante a execução, sem transformar cada tela em texto excessivo;
- docentes conseguem usar a plataforma para apoiar explicação, roteiros e comparação de cenários;
- discentes conseguem começar, preencher entradas corretamente, interpretar saídas e seguir uma progressão lógica;
- a navegação conecta simulação, trilhas e recursos de apoio em uma única experiência coerente.

---

## 3. Decisões Aprovadas

As decisões fechadas na etapa de brainstorming foram:

1. O público-alvo principal do redesign inclui **docentes e discentes** igualmente.
2. O plano deve cobrir explicitamente:
   - orientação pedagógica;
   - execução dos cálculos;
   - navegação geral.
3. A linguagem dominante será **híbrida**:
   - base acadêmica e técnica;
   - camadas de orientação didática e atalhos para iniciantes.
4. Mudanças profundas de estrutura são permitidas se melhorarem a experiência.
5. Não há restrição técnica prévia para a análise, além do cuidado de refletir novos módulos adicionados também na tese em `/escrita`.
6. A direção macro aprovada foi a de **Estúdio de Simulação**, em que o valor da ferramenta aparece primeiro nos módulos, com explicação contextual integrada.
7. A experiência deve incorporar **efeitos visuais e gráficos adicionais** com dupla função:
   - apoio didático para explicar fenômenos e comportamento dos sistemas;
   - aprofundamento analítico para comparação, leitura de curvas e interpretação técnica.
8. Essa camada visual mais rica deve ser tratada como diretriz para **todos os módulos**, não apenas para um subconjunto inicial.

---

## 4. Proposta de Produto

### 4.1 Posicionamento

O DCOU deve se apresentar como um ambiente digital para:

- explorar operações unitárias;
- executar cálculos e simulações;
- interpretar resultados;
- conectar teoria, parâmetros e comportamento do sistema;
- apoiar estudo individual e mediação em sala de aula.

O produto não deve parecer apenas uma coleção de calculadoras, nem apenas uma plataforma de conteúdo. O modelo aprovado é um sistema híbrido em que a simulação é o centro e o ensino orbita em torno dela.

### 4.2 Princípio Central

Cada tela precisa responder com clareza a três perguntas:

1. O que posso fazer aqui?
2. O que preciso informar?
3. O que este resultado significa e para onde sigo agora?

Se uma tela não responde a essas perguntas, ela ainda não está cumprindo o papel esperado para docentes e discentes.

---

## 5. Arquitetura da Experiência

### 5.1 Estrutura Macro

O frontend deve ser reorganizado em três camadas permanentes:

1. **Entrada orientada**
   - a home identifica a intenção inicial do usuário;
   - deve permitir começar por estudo, simulação ou trilha;
   - evita que o usuário precise conhecer o mapa inteiro antes de agir.

2. **Módulo de cálculo como experiência principal**
   - cada operação unitária deve funcionar como uma tela de trabalho completa;
   - cálculo, entrada, interpretação e continuidade ficam no mesmo contexto.

3. **Ecossistema de apoio**
   - glossário, exercícios, exemplos, hipóteses, referências e conexões entre módulos;
   - esses recursos devem servir à tarefa em andamento, não competir com ela.

### 5.2 Consequência Arquitetural

A interface deixa de operar no modelo atual de:

- home separada com atalhos; e
- módulos relativamente isolados.

Ela passa a operar como:

- entrada orientada por intenção;
- módulos com fluxo completo;
- recursos conectados ao contexto do cálculo.

---

## 6. Navegação

### 6.1 Problema Atual

A navegação lateral atual já cria agrupamentos úteis, mas expõe o sistema sobretudo como lista de áreas. Isso é útil para usuários já familiarizados, mas não guia suficientemente o primeiro uso nem comunica a relação entre teoria, cálculo e prática.

### 6.2 Estrutura Recomendada

A navegação deve evoluir para um modelo com níveis mais claros:

- `Início`
- `Simulações`
- `Trilhas`
- `Recursos`
- `Docência`

Distribuição esperada:

- `Simulações`: tubulações, dimensionamento, escoamento, bombas, reatores, balanço e demais operações unitárias;
- `Trilhas`: sequências guiadas por tema, disciplina ou dificuldade;
- `Recursos`: glossário, exercícios, biblioteca de propriedades, exemplos e referências;
- `Docência`: roteiros de aula, casos guiados, comparações de cenário e material de apoio didático.

### 6.3 Regras de Navegação

- o item ativo deve ser inequívoco;
- a navegação deve refletir a jornada e não só a taxonomia do produto;
- telas profundas devem preservar contexto com breadcrumb real;
- o usuário deve conseguir voltar sem perder noção de onde estava;
- estudar, simular e revisar conceitos devem ser caminhos complementares, não paralelos desconectados.

### 6.4 Responsividade

Em telas largas, a navegação pode permanecer lateral. Em telas menores, deve virar drawer ou estrutura compacta, mas mantendo:

- acesso simples às áreas principais;
- clareza de localização atual;
- preservação da ação principal do módulo.

---

## 7. Home

### 7.1 Novo Papel da Home

A home não deve ser apenas uma vitrine de cards. Ela passa a ter três funções explícitas:

1. mostrar valor imediato;
2. orientar o primeiro passo;
3. segmentar intenção.

### 7.2 Estrutura Recomendada

A home deve ser reorganizada em blocos como:

1. **Hero principal**
   - valor do produto em linguagem técnica clara;
   - duas CTAs principais:
     - `Iniciar uma simulação`
     - `Seguir uma trilha`

2. **Atalhos por objetivo**
   - exemplos:
     - dimensionar tubulação;
     - calcular escoamento;
     - consultar propriedades;
     - revisar conceitos-chave.

3. **Trilhas didáticas**
   - sequências de aprendizagem por área;
   - indicação de progressão ou pré-requisitos.

4. **Recursos de apoio**
   - glossário;
   - exercícios;
   - exemplos;
   - materiais correlatos.

5. **Faixa para docência**
   - roteiros de aula;
   - cenários orientados;
   - materiais para condução em sala.

### 7.3 Comportamento Esperado

A home deve responder rapidamente:

- “quero usar agora”;
- “quero entender por onde começar”;
- “quero preparar uma aula ou prática”.

---

## 8. Estrutura dos Módulos

### 8.1 Problema Atual

Os módulos atuais já têm núcleo funcional, mas a experiência ainda é próxima de:

- formulário;
- botão;
- resultado;
- detalhes auxiliares em blocos separados.

Isso é insuficiente para uma experiência forte de ensino e uso profissional-acadêmico.

### 8.2 Estrutura Recomendada por Módulo

Cada módulo deve seguir uma arquitetura-base:

1. **Cabeçalho de contexto**
   - nome do módulo;
   - breadcrumb;
   - objetivo técnico;
   - quando usar;
   - pré-requisitos conceituais ou operacionais.

2. **Painel de entrada guiada**
   - campos agrupados por etapa;
   - labels fortes;
   - unidades explícitas;
   - ajuda contextual;
   - presets ou exemplos;
   - validação clara.

3. **Painel de saída**
   - resultado principal em destaque;
   - unidades evidentes;
   - leitura imediata do valor;
   - interpretação resumida;
   - comparação com faixas ou alternativas, quando fizer sentido.

4. **Apoio didático**
   - hipóteses do cálculo;
   - significado das variáveis;
   - limitações do modelo;
   - glossário contextual;
   - referências e leitura complementar.

5. **Continuidade**
   - usar o resultado no próximo cálculo;
   - abrir exercício relacionado;
   - comparar cenários;
   - navegar para módulo dependente;
   - revisar conceito associado.

### 8.3 Fluxo Ideal

O fluxo de cada módulo passa a ser:

`contexto` → `preenchimento` → `execução` → `interpretação` → `continuidade`

Esse fluxo deve estar visualmente claro sem exigir que o usuário descubra a lógica sozinho.

### 8.4 Camada Visual de Fenômenos e Análise

Além do resultado principal, cada módulo deve evoluir para incluir uma camada visual com duas funções simultâneas:

1. **Explicar o fenômeno**
   - mostrar o que muda fisicamente ou conceitualmente quando os parâmetros variam;
   - tornar visíveis transições, regimes, tendências e relações entre variáveis;
   - ajudar o discente a conectar número, comportamento e teoria.

2. **Aprofundar a análise**
   - ampliar a leitura técnica além do valor final;
   - permitir comparação de cenários;
   - expor curvas, faixas, indicadores e gráficos complementares quando fizer sentido.

Essa camada não deve ser cosmética. Efeitos visuais, gráficos e elementos interativos só são aprovados quando melhorarem compreensão ou interpretação.

### 8.5 Aplicação Transversal

Essa diretriz vale para todos os módulos do produto.

Exemplos esperados:

- em escoamento, visualizações de regime, comportamento do Reynolds, fator de atrito e transições;
- em dimensionamento, leitura gráfica do impacto de vazão, velocidade e diâmetro;
- em tubulações, apoio visual para materiais, schedules, conexões e consequências técnicas das escolhas;
- em reatores, balanço e demais operações, gráficos e esquemas que revelem comportamento do sistema, não apenas o valor calculado.

Se um módulo ainda não tiver material visual suficiente, o redesign deve prever a estrutura para recebê-lo sem quebrar a consistência do sistema.

---

## 9. Princípios de UX para Docentes e Discentes

### 9.1 Camadas de Uso

Cada módulo deve operar em três camadas:

1. **Camada operacional**
   - preencher entradas;
   - executar cálculo;
   - ler resultado principal.

2. **Camada explicativa**
   - entender o que cada variável representa;
   - conhecer hipóteses e limitações;
   - interpretar por que o resultado faz sentido.

3. **Camada de continuidade didática**
   - comparar cenários;
   - abrir exemplos;
   - seguir uma trilha;
   - conectar com outro módulo ou exercício.

### 9.2 Equilíbrio entre Perfis

Para discentes:

- reduzir atrito de entrada;
- tornar variáveis e unidades mais autoexplicativas;
- reforçar leitura orientada dos resultados.

Para docentes:

- garantir previsibilidade e clareza metodológica;
- facilitar demonstração em aula;
- permitir conexão entre exemplo, teoria e simulação.

O produto não deve criar uma interface para cada público, e sim uma única experiência com camadas suficientes para ambos.

### 9.3 Linguagem

A linguagem visual e textual deve ser:

- acadêmica, sem ser burocrática;
- precisa, sem exigir familiaridade prévia total;
- orientadora, sem infantilizar o usuário.

---

## 10. Diretrizes Visuais e de Interação

### 10.1 Direção Visual

Com base na análise de UI/UX, a direção recomendada é:

- estrutura de estúdio técnico;
- alta legibilidade;
- hierarquia forte;
- densidade controlada;
- estética acadêmica contemporânea;
- apoio visual à interpretação de dados.

### 10.2 Elementos Essenciais

- tipografia com forte legibilidade para textos técnicos;
- contraste adequado para uso prolongado;
- diferenciação clara entre áreas de entrada, saída e apoio;
- estados ativos e de progresso bem marcados;
- tratamento visual de unidades e valores como elementos de primeira classe.

### 10.3 Visualização Didática e Analítica

Os módulos devem incorporar mais recursos visuais, desde que tenham função pedagógica ou analítica clara, como:

- gráficos de comportamento;
- comparações entre cenários;
- indicadores de faixa ou regime;
- esquemas que expliquem relações entre variáveis;
- destaques visuais para transições importantes;
- feedback visual de causa e efeito quando parâmetros forem alterados.

Referência de decisão:

- se o elemento ajuda a explicar “o que está acontecendo”, ele é didático;
- se ajuda a explicar “o que este resultado implica”, ele é analítico;
- se não ajuda em nenhum dos dois, ele não deve entrar.

### 10.4 Acessibilidade e Clareza

Devem ser considerados obrigatórios:

- contraste mínimo adequado;
- hierarquia correta de headings;
- labels visíveis;
- foco navegável por teclado;
- estados vazios e de erro claros;
- feedback visível nas ações principais.

---

## 11. Implicações para o Código Atual

### 11.1 Shell

`AppShell`, `HomePage`, `AppExperience` e `navigation.ts` devem deixar de ser apenas infraestrutura de troca de abas e passar a representar a arquitetura real do produto.

Isso implica:

- redefinir a taxonomia de navegação;
- reorganizar a home por intenção e não só por grupos;
- estruturar melhor a persistência de contexto entre telas.

### 11.2 Módulos

`piping-feature.tsx`, `flow-feature.tsx` e `sizing-feature.tsx` devem ser reestruturados para:

- separar com clareza contexto, entrada, saída e apoio;
- evitar blocos homogêneos com mesmo peso visual;
- incorporar ajuda contextual e continuidade;
- reduzir a sensação de formulário cru;
- preparar regiões estáveis para gráficos, esquemas e indicadores didático-analíticos.

### 11.3 Expansão Futura

Ao adicionar módulos ainda ausentes no frontend migrado, a implementação deve seguir a mesma arquitetura-base.

Se a expansão incluir novos módulos de produto, registrar também o impacto correspondente em `/escrita`, para manter coerência entre software e tese.

Os módulos já existentes e os futuros devem nascer com espaço arquitetural para:

- visualização principal;
- visualização complementar;
- comparação de cenários;
- interpretação guiada do resultado.

---

## 12. Riscos e Cuidados

### 12.1 Risco de Sobrecarga

Adicionar suporte didático sem disciplina pode transformar a interface em um agregado excessivo de texto, painéis e caixas auxiliares. O ensino deve aparecer em camadas progressivas e contextuais.

### 12.2 Risco de Fragmentação

Se trilhas, recursos e docência forem adicionados como áreas paralelas demais, o produto continuará parecendo um conjunto de partes desconectadas. A integração com os módulos é obrigatória.

### 12.3 Risco de Navegação Ambígua

Se a nova taxonomia não for clara, o produto pode trocar uma lista simples por uma arquitetura conceitualmente bonita, mas confusa. Os nomes e agrupamentos precisam refletir tarefas reais.

### 12.4 Risco de Escopo

Como mudanças profundas são permitidas, há risco de o redesign tentar resolver tudo de uma vez. A implementação futura deve ser faseada, mesmo que a visão final seja ampla.

---

## 13. Estratégia de Verificação

Antes de considerar o redesign implementado de forma satisfatória, verificar:

- a home orienta melhor o primeiro passo do que a versão atual;
- a navegação comunica com clareza a estrutura do produto;
- os módulos principais deixam evidente objetivo, entradas, resultado e próximos passos;
- docentes conseguem identificar valor de apoio didático;
- discentes conseguem executar cálculos com menos atrito e mais contexto;
- os elementos visuais adicionais explicam fenômenos ou aprofundam análise, sem virar ornamento;
- todos os módulos possuem caminho consistente para evolução visual;
- a interface mantém consistência entre módulos;
- novos módulos adicionados possuem correspondência documentada em `/escrita`, quando aplicável.

---

## 14. Resultado Esperado

Ao final da implementação, o frontend Next do DCOU deve parecer menos uma migração visual de telas isoladas e mais um sistema coerente de aprendizagem aplicada e simulação.

O ganho esperado não é apenas estético. O ganho esperado é estrutural:

- navegação mais inteligível;
- entrada mais orientada;
- módulos mais utilizáveis;
- resultados mais interpretáveis;
- melhor convergência entre uso acadêmico e valor prático.
