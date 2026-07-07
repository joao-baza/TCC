# Design: Padronização de resultados em tabela no frontend

**Data:** 2026-07-06  
**Escopo:** padronizar, somente no frontend, a apresentação de resultados numéricos e tabelares em todas as telas relevantes, com um componente reutilizável e uma regra única de formatação numérica.  
**Fora de escopo:** qualquer alteração no backend, mudança de contrato de API, redesign geral do app, ou criação de novas páginas apenas para esta padronização.

---

## 1. Contexto

Hoje o frontend já tem um componente-base de tabela em [`frontend/src/components/property-table.tsx`](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/components/property-table.tsx), mas a renderização dos resultados ainda não é totalmente uniforme:

- algumas telas já usam `PropertyTable`;
- outras, como partes de [`frontend/src/features/components/components-page.tsx`](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/components/components-page.tsx), ainda renderizam resultados em cartões individuais com `dl/dd`;
- a formatação numérica atual usa até 2 casas decimais em valores normais, o que faz números muito pequenos aparecerem como `0`.

Isso cria dois problemas práticos:

1. o usuário não vê sempre o mesmo formato visual para o retorno;
2. valores extremos podem ser mascarados por arredondamento.

---

## 2. Objetivo

Criar uma apresentação única para resultados no frontend, com estas propriedades:

- mesmo formato visual em todas as telas que exibem retorno de cálculo;
- reutilização de um componente compartilhado;
- preservação da semântica de tabela já existente;
- formatação numérica adequada para valores muito pequenos e muito grandes;
- sem tocar em backend.

---

## 3. Decisão

A solução aprovada é:

1. manter [`PropertyTable`](/home/jpbgr/Área%20de%20Trabalho/Projetos/Pessoais/TCC/frontend/src/components/property-table.tsx) como base da apresentação tabular;
2. criar um wrapper reutilizável de resultado no frontend para padronizar o contêiner, título, estado vazio e encaixe visual;
3. migrar as telas com retorno customizado para esse wrapper;
4. ajustar a formatação numérica para usar notação científica quando o valor estiver fora de uma faixa legível em decimal.

### Regra numérica

O frontend deve usar:

- notação decimal normal para valores usuais;
- notação científica para valores com `0 < |valor| < 1e-4` ou `|valor| >= 1e5`;
- no máximo 5 casas decimais na mantissa da notação científica;
- preservação de `0` como `0`, sem forçar científica;
- preservação do estado vazio atual para `null`, `undefined` ou valores inválidos.

A saída científica deve continuar legível na tabela, preferencialmente em formato matemático `a × 10^b` com o expoente inteiro, e não como texto cru com `e`.

Exemplo:

- `0.00008949025483876957 Pa` deve aparecer em formato científico, e não como `0 Pa`.

---

## 4. Abordagem Escolhida

### 4.1 Alternativas consideradas

1. Criar apenas um novo componente de contêiner e manter a formatação numérica como está.
2. Padronizar `PropertyTable` e também a função de formatação numérica, usando um wrapper simples de resultado.
3. Criar um componente muito genérico para qualquer tipo de retorno, incluindo gráfico, tabela e erro.

### 4.2 Direção aprovada

A alternativa 2 foi a escolhida.

Motivos:

- reaproveita o componente que já existe;
- evita duplicar o padrão de layout em várias páginas;
- resolve o problema dos números pequenos e grandes no mesmo movimento;
- não cria uma abstração grande demais para um problema que é, no fundo, de apresentação.

---

## 5. Arquitetura Alvo

### 5.1 Camada base

`PropertyTable` continua sendo o componente responsável por renderizar linhas, valores e unidades.

### 5.2 Novo wrapper de resultado

Um componente reutilizável, por exemplo `ResultTableSection`, deve concentrar:

- título de seção;
- contêiner visual padronizado;
- estado vazio;
- encaixe de `PropertyTable`;
- eventual mensagem auxiliar, quando necessário.

Esse wrapper não deve saber nada sobre domínio físico, apenas sobre apresentação.

### 5.3 Formatação de números

A lógica de formatação deve ficar no frontend, em um helper compartilhado usado por `PropertyTable`:

- para valores comuns, mantém a leitura decimal;
- para extremos, converte para científica com até 5 casas decimais na mantissa;
- a unidade continua sendo renderizada separadamente, como hoje.

### 5.4 Migração de telas

A primeira migração deve cobrir os locais que ainda usam cartões ou `dl/dd` para mostrar retorno:

- `frontend/src/features/components/components-page.tsx`;
- qualquer outro painel de resultado que ainda não use o padrão tabular;
- as telas que já usam `PropertyTable` só devem receber o wrapper novo quando isso reduzir duplicação de contêiner/estado vazio e melhorar a consistência visual do retorno.

---

## 6. Impacto Visual

O comportamento esperado é:

- resultados com poucas linhas continuam compactos;
- a leitura fica consistente entre páginas;
- números pequenos e grandes deixam de ser truncados de forma enganosa;
- a unidade continua visível como unidade, não como texto solto.

O visual deve permanecer alinhado ao restante do sistema, sem introduzir um estilo novo só para essa padronização.

---

## 7. Estados e Erros

### 7.1 Sem resultado

Quando não houver dado para exibir, o wrapper deve mostrar um estado vazio explícito, em vez de renderizar um bloco vazio ou um cartão sem conteúdo.

### 7.2 Resultado parcial

Se a página produzir uma lista vazia de linhas válidas, o estado vazio também deve aparecer.

### 7.3 Falha de cálculo

Mensagens de erro continuam sendo tratadas pela tela de origem.

O wrapper de tabela não substitui o tratamento de erro da página; ele apenas padroniza a exibição do retorno quando existe dado válido.

---

## 8. Testes

Os testes devem cobrir:

- renderização do wrapper reutilizável;
- preservação do formato de tabela;
- formatação decimal normal;
- formatação científica para valores muito pequenos e muito grandes;
- exibição de zero sem virar científica;
- migração de ao menos uma tela representativa, com foco em `/components`.

Os testes existentes de `PropertyTable` precisam ser atualizados para validar a nova regra numérica.

---

## 9. Critérios de Aceite

O trabalho estará pronto quando:

- todas as telas relevantes de resultado estiverem usando o mesmo padrão visual;
- o frontend exibir valores extremos em notação científica com até 5 casas decimais;
- `0.00008949025483876957 Pa` não for mais exibido como `0 Pa`;
- a mudança estiver restrita ao frontend;
- a cobertura de testes refletir a nova regra.
