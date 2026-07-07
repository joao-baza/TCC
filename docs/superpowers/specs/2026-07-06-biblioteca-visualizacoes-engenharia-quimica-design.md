# Design: Biblioteca de visualizações de engenharia química

**Data:** 2026-07-06  
**Escopo:** criar uma biblioteca compartilhada de visualizações para o frontend, com gráficos, curvas, diagramas, tabelas e SVGs úteis em engenharia química, priorizando reaproveitamento entre termodinâmica, hidráulica, transferência de calor, reatores e balanço de massa. O backend pode ser ajustado para fornecer dados calculados ou amostrados, mas sem criar módulos completos de domínio novos.  
**Fora de escopo:** criar uma nova área de produto para um assunto inteiro, como um módulo completo de destilação; redesenhar a navegação principal; alterar a arquitetura geral do app; substituir o stack visual já adotado sem necessidade.

---

## 1. Contexto

O frontend atual já possui uma base real para visualização técnica:

- componentes reutilizáveis em `frontend/src/components/viz/`;
- um contêiner padrão de gráfico em `frontend/src/components/chart-panel.tsx`;
- páginas e testes para hidráulica, bombas, reatores, balanço, sizing e componentes;
- uso consistente de React + `recharts` + SVG para diagramas didáticos.

Além disso, o repositório já aponta para uma direção clara de produto: explicar operações unitárias por meio de telas interativas, com leitura pedagógica e apoio ao cálculo. O que falta agora não é “inventar gráficos”, mas consolidar isso como uma biblioteca coerente.

O pedido atual amplia o repertório de visualizações para cobrir mais áreas clássicas de engenharia química. A forma mais segura de fazer isso é criar uma biblioteca de visuais reaproveitáveis, com integração pontual no backend quando os dados não puderem ser gerados localmente no frontend.

---

## 2. Objetivo

Construir um conjunto de componentes e padrões visuais que permitam representar, de forma clara e consistente:

- fenômenos de termodinâmica e propriedades;
- curvas e diagramas de escoamento e bombas;
- análises de transferência de calor;
- comportamento de reatores;
- balanços e fluxos de processo.

A biblioteca deve servir para duas coisas ao mesmo tempo:

- **didática**, ajudando o usuário a entender o conceito;
- **projeto**, ajudando a ler ponto de operação, margem, tendência e comparação entre cenários.

---

## 3. Decisão Aprovada

A direção escolhida é:

1. Criar uma **biblioteca de visualizações compartilhada** no frontend.
2. Reutilizar componentes e padrões já existentes onde fizer sentido.
3. Permitir backend apenas como fornecedor de dados calculados, amostras de curvas ou séries derivadas.
4. Não criar módulos completos de domínio novos só para acomodar um gráfico.
5. Integrar cada visualização em páginas existentes ou em superfícies compartilhadas, conforme necessidade.

### Consequência prática

O sistema passa a ter uma separação entre:

- **visualização**: componente pequeno e reutilizável;
- **fonte de dados**: cálculo local, endpoint existente ou endpoint pequeno novo;
- **contexto de uso**: a tela em que o gráfico aparece.

Isso evita o erro de transformar um único gráfico interessante em um subsistema inteiro.

---

## 4. Abordagem Escolhida

### 4.1 Alternativas Consideradas

1. Criar módulos completos por assunto, com páginas novas para cada tema.
2. Criar uma biblioteca de visualizações reutilizáveis, consumida pelas telas existentes.
3. Criar um atlas de engenharia com páginas temáticas e navegação própria.

### 4.2 Direção Aprovada

A alternativa 2 foi aprovada.

Motivos:

- reduz o risco de inflar o produto com áreas inteiras ainda não validadas;
- reaproveita o que já existe no frontend;
- permite evoluir por blocos pequenos;
- mantém a flexibilidade de usar backend somente onde necessário;
- preserva a navegação atual, que já está funcional.

---

## 5. Princípios de Projeto

### 5.1 Biblioteca, não módulo

Uma visualização nova não deve implicar uma nova seção inteira do app. Ela deve ser:

- um componente;
- um conjunto pequeno de componentes;
- ou uma composição simples de componentes reutilizáveis.

Se houver necessidade de várias telas para um mesmo tema, isso só entra depois, com validação explícita.

### 5.2 Backend sob demanda

O backend pode ser alterado quando o frontend precisar de dados que não devem ser reimplementados no cliente, por exemplo:

- equilíbrio líquido-vapor;
- envelopes de fase;
- perfis ao longo de equipamentos;
- amostras densas de propriedades;
- dados intermediários de pinch ou curvas compostas.

Mas o backend não deve virar uma nova “feature” de produto sem necessidade.

### 5.3 Reaproveitamento máximo

A regra é preferir:

- gráfico genérico com dados diferentes;
- componente genérico com legenda e estados comuns;
- tabela padrão de correntes ou propriedades;
- SVG pequeno para domos, mapas e faixas;

antes de criar um novo padrão visual do zero.

### 5.4 Cautela com rótulos

Todo gráfico numérico deve tratar textos internos como elementos de risco visual.

Isso significa que a biblioteca deve, por padrão:

- reservar margens suficientes para rótulos e valores de eixo;
- gerar ticks automáticos que mostrem valores de tempos em tempos sem poluir a leitura;
- evitar sobreposição entre texto e linhas, curvas, áreas, eixos ou marcadores;
- deslocar rótulos para áreas seguras quando houver conflito;
- mover o texto para legenda, cabeçalho ou callout lateral quando a área útil estiver congestionada;
- priorizar legibilidade sobre simetria visual perfeita.

Esse cuidado vale para todos os gráficos com escala numérica, com atenção especial para gráficos densos como `ArrheniusPlot` e `McCabeThieleChart`, onde rótulos como `Xb` e `Xf` devem ficar fora da trajetória principal ou em áreas livres sempre que possível.

---

## 6. Arquitetura Alvo

### 6.1 Camadas

#### 6.1.1 Primitivos visuais

Componentes básicos e reutilizáveis, como:

- `ChartPanel`;
- eixos, grids, legendas e rótulos;
- gerador de ticks automáticos por gráfico;
- helper de posicionamento seguro para textos e anotações;
- cards de comparação;
- tabelas compactas;
- chips de cenário;
- badges de estado;
- faixas sombreadas de risco;
- escalas e marcadores de ponto de operação.

#### 6.1.2 Visualizações de domínio

Componentes específicos o bastante para traduzir um conceito técnico, mas ainda genéricos em relação ao dado:

- `McCabeThieleChart`;
- `PhaseEnvelopeChart`;
- `TXYDiagram`;
- `TernaryPhaseDiagram`;
- `PumpSystemCurveChart`;
- `EnergyGradeLineChart`;
- `PressureProfileChart`;
- `PumpEfficiencyMap`;
- `NpshMarginChart`;
- `CompositeCurvesChart`;
- `TemperatureProfileChart`;
- `ArrheniusPlot`;
- `PfrProfileChart`;
- `RecyclePurgeMap`;
- `StreamsTable`;
- `ProcessSankey`.

#### 6.1.3 Adaptadores de dados

Pequenas funções ou serviços que:

- chamam endpoints;
- normalizam unidades;
- transformam séries em pontos prontos para gráfico;
- calculam campos derivados simples;
- preservam uma interface estável para os componentes.

### 6.2 Organização de pastas

A estrutura alvo deve ficar próxima a:

- `frontend/src/components/viz/` para componentes reutilizáveis;
- `frontend/src/features/<dominio>/` para telas que hospedam as visualizações;
- `frontend/src/lib/` ou `frontend/src/features/<dominio>/service.ts` para montagem e normalização dos dados.

Não é necessário criar uma pasta de “módulo” para cada tema novo se o tema só existir como visualização embutida.

---

## 7. Catálogo Inicial

### 7.1 Termodinâmica e propriedades

#### 7.1.1 McCabe-Thiele

Usado para destilação binária e leitura de estágios teóricos.

- entrada: curva de equilíbrio `y-x`, linha de alimentação, retas de operação;
- saída: número de estágios, ponto de alimentação, visual de stepping;
- valor: didático e muito clássico.

#### 7.1.2 Diagrama `T-x-y` / `y-x`

Mostra equilíbrio líquido-vapor de mistura binária.

- entrada: composição e temperatura/pressão;
- saída: linha de bolha, linha de orvalho e região bifásica;
- valor: ponte natural para McCabe-Thiele.

#### 7.1.3 Diagrama ternário

Útil para extração líquido-líquido e sistemas com três componentes.

- entrada: composições tricomponentes;
- saída: triângulo, pontos de mistura e regiões;
- valor: excelente para visualização de composição.

#### 7.1.4 Superfícies de propriedades

Exemplo: `Z(P,T)`, `rho(T,P)`, `mu(T)`, `h(T,P)`.

- entrada: grade de propriedades calculadas;
- saída: mapa 2D/3D ou heatmap;
- valor: forte para análise de tendência e comportamento real.

#### 7.1.5 Envelope de fase / domo de saturação

Mostra líquido, vapor e região de coexistência.

- entrada: amostragem de saturação;
- saída: domo com estado crítico e região bifásica;
- valor: essencial para interpretação de mudança de fase.

### 7.2 Hidráulica e bombas

#### 7.2.1 Curva da bomba vs curva do sistema

Visual clássico de ponto de operação.

- entrada: curva da bomba e curva do sistema;
- saída: interseção, margem e comparação entre cenários;
- valor: muito útil para projeto e ensino.

#### 7.2.2 Linha piezométrica e linha de energia

Mostra a distribuição de energia ao longo da tubulação.

- entrada: trechos, perdas, cotas e pressões;
- saída: duas curvas longitudinais;
- valor: excelente para entender perdas e bomba.

#### 7.2.3 Perfil de pressão por trecho/acessório

Representa quedas de pressão distribuídas e localizadas.

- entrada: sequência de trechos, válvulas, curvas e acessórios;
- saída: gráfico segmentado por elemento;
- valor: muito bom para diagnóstico.

#### 7.2.4 Mapa de eficiência da bomba e BEP

Mostra a região de maior eficiência da bomba.

- entrada: `Q`, `H`, eficiência;
- saída: mapa de contorno e ponto de melhor eficiência;
- valor: ajuda na seleção e operação.

#### 7.2.5 Faixa de cavitação / margem de NPSH

Mostra área de risco e margem operacional segura.

- entrada: `NPSHa`, `NPSHr` e margem mínima;
- saída: faixa sombreada e indicador de segurança;
- valor: central para evitar operação inadequada.

### 7.3 Transferência de calor

#### 7.3.1 Curvas compostas e pinch analysis

Mostra limites de recuperação térmica e necessidade de utilidades.

- entrada: correntes quentes e frias, `Cp`, intervalos de temperatura;
- saída: curvas compostas, pinch e utilidades;
- valor: muito forte para projeto energético.

#### 7.3.2 Perfis de temperatura quente/fria ao longo do trocador

Mostra a evolução térmica ao longo da área de troca.

- entrada: geometrias, coeficientes e condições de entrada;
- saída: perfis comparativos de ambos os lados;
- valor: clara ligação entre cálculo e física.

### 7.4 Reatores

#### 7.4.1 `k` vs `1/T` de Arrhenius

Mostra a dependência exponencial da constante cinética com a temperatura.

- entrada: `k`, `T`, `Ea`;
- saída: gráfico semi-log e ajuste linear;
- valor: um dos visuais mais didáticos de cinética.

#### 7.4.2 Perfis de concentração e temperatura em PFR

Mostra evolução axial do processo.

- entrada: posição, concentração e temperatura;
- saída: curvas ao longo do comprimento;
- valor: essencial para entender comportamento espacial.

### 7.5 Balanço e processo

#### 7.5.1 Mapa de reciclo e purga

Mostra como o material circula no processo.

- entrada: fluxos principais, reciclos e purgas;
- saída: diagrama de fluxo simplificado;
- valor: ajuda a entender acúmulo e controle de inertes.

#### 7.5.2 Tabela de correntes

Lista o estado de cada corrente do processo.

- entrada: vazão, composição, fase, temperatura, pressão, entalpia;
- saída: tabela compacta com destaques;
- valor: peça de apoio para qualquer visual.

#### 7.5.3 Sankey de massa e energia

Mostra para onde a massa ou energia “vai” no processo.

- entrada: correntes com pesos proporcionais;
- saída: diagrama de fluxos com largura proporcional;
- valor: muito intuitivo para balanços e perdas.

---

## 8. Política de Backend

### 8.1 Quando pode alterar backend

O backend pode ser alterado quando a visualização exigir:

- cálculo confiável com bibliotecas já existentes;
- dados em malha densa;
- séries derivadas difíceis de reproduzir no frontend;
- transformações de unidade e normalização centralizadas;
- resultados que precisam ser usados por mais de uma tela.

### 8.2 Quando não deve alterar backend

Não deve haver mudança de backend quando:

- o gráfico puder ser montado a partir de dados já retornados por uma rota existente;
- a visualização for apenas uma forma melhor de apresentar o resultado atual;
- a lógica extra for simples o bastante para ficar no cliente.

### 8.3 Regra contra módulos completos

Não criar novos módulos completos apenas para acomodar uma visualização.

Exemplo do que não fazer:

- um módulo completo de destilação;
- um módulo completo de trocadores;
- um módulo completo de psicrometria.

Exemplo do que fazer:

- um endpoint pequeno para devolver uma curva `T-x-y`;
- um serviço que retorna pontos para o domo de saturação;
- um ajuste no cálculo atual para expor dados intermediários de bomba;
- um adaptador para fornecer curvas compostas.

---

## 9. Componentes Esperados

### 9.1 Base compartilhada

Os componentes atuais devem servir de base e ser refinados onde necessário:

- `ChartPanel`;
- componentes de tabela;
- badges e chips de cenário;
- componentes SVG com escalas e anotação de ponto;
- grids de fundo e eixos com ticks automáticos;
- helpers de posicionamento seguro para textos sobre o gráfico;
- wrappers de eixo, legenda e grid.

### 9.2 Componentes novos prováveis

Os visuais acima provavelmente pedem novos componentes, mas sempre como peças isoladas:

- gráficos 2D com ponto operacional;
- diagramas com áreas sombreadas;
- charts com duas ou mais séries comparativas;
- mapas e domos em SVG;
- tabelas compactas de correntes e propriedades.

### 9.3 Integração com páginas existentes

As visualizações devem entrar em páginas ou áreas já existentes, sem forçar navegação nova.

Exemplos:

- hidráulica e bombas usam as páginas já existentes de escoamento e bombeamento;
- termodinâmica e propriedades entram nas páginas de propriedades ou em uma seção técnica apropriada;
- balanço usa a página de balanço;
- reatores usam a página de reatores;
- calor pode entrar em uma página existente de transferência térmica, quando existir.

Se uma visualização não tiver lugar natural, ela pode começar como componente de catálogo/tabela até existir contexto suficiente para uma tela dedicada.

---

## 10. Fluxo de Implementação

1. Mapear quais dados já existem no frontend e quais precisam vir do backend.
2. Definir os componentes base de visualização.
3. Implementar primeiro os visuais de maior retorno e menor dependência.
4. Adicionar os adaptadores de dados necessários.
5. Integrar cada visualização na tela existente correspondente.
6. Completar testes unitários, de integração e e2e para cada adição.

Esse fluxo evita começar pelo backend sem necessidade e evita criar páginas novas sem validação.

---

## 11. Critérios de Aceite

A biblioteca será considerada pronta quando:

- os visuais prioritários puderem ser montados como componentes reutilizáveis;
- o frontend continuar sendo o ponto principal de composição visual;
- o backend só tiver sido ajustado onde a visualização exigia dados calculados ou amostrados;
- não houver criação de módulos completos novos só para um gráfico;
- a mesma linguagem visual continuar consistente entre gráficos, tabelas e diagramas;
- as visualizações atenderem tanto a didática quanto ao projeto.

---

## 12. Testes e Verificação

A validação deve cobrir:

- testes unitários dos componentes de visualização;
- testes dos adaptadores de dados;
- testes de renderização em telas existentes;
- validação de que os dados do backend chegam no formato esperado;
- build e e2e das páginas afetadas;
- revisão visual dos estados de ponto operacional, risco e comparação.

Se um gráfico novo introduzir um formato de dado novo, o contrato desse formato deve ser testado explicitamente.
