# Design: Frontend em Vite, React, TypeScript e shadcn/ui

**Data:** 2026-07-04  
**Escopo:** modernizar o frontend atual para `Vite + React + TypeScript + shadcn/ui`, preservando o comportamento e a organização geral do produto atual, cobrindo todos os módulos existentes e alinhando a monografia ao stack real final.  
**Fora de escopo:** alterar contratos da API FastAPI, redesenhar profundamente a experiência de uso, ou manter uma arquitetura híbrida permanente com dependência de `window.*` e mutação direta de DOM.

---

## 1. Contexto

O repositório hoje possui um frontend legado servido a partir de `frontend/index.html`, `frontend/css/styles.css` e `frontend/js/modules/*.js`, com comportamento baseado em:

- HTML estático;
- módulos JavaScript globais;
- manipulação direta de DOM;
- assets self-hosted;
- integração com a API via chamadas HTTP.

Esse frontend utiliza bibliotecas como:

- `KaTeX` para renderização matemática;
- `Chart.js` para gráficos;
- `SweetAlert2` para diálogos e feedback;
- `Select2` e `jQuery` para interações de formulário.

Ao mesmo tempo, a escrita em `escrita/TEX/` contém trechos que descrevem uma base `Next.js`, mas esse estado não corresponde ao frontend efetivamente consolidado no worktree atual. A modernização do frontend e a correção da monografia, portanto, precisam ser tratadas como uma frente única e coerente.

---

## 2. Objetivo

Substituir a base de frontend em HTML, CSS e JavaScript puros por uma aplicação `Vite + React + TypeScript`, usando `shadcn/ui` como base principal de componentes, sem descaracterizar a experiência atual do produto.

Isso significa:

- manter a navegação, os módulos e o fluxo mental do usuário o mais próximos possível do frontend atual;
- trocar a stack, a organização interna e os componentes de interação;
- remover dependências legadas que conflitam com React ou reduzem a manutenibilidade;
- preservar bibliotecas e visuais que ainda façam sentido técnico;
- atualizar a monografia para descrever apenas o stack realmente utilizado ao final.

---

## 3. Decisões Aprovadas

As decisões fechadas no brainstorming foram:

1. A base alvo do novo frontend será `Vite + React + TypeScript`.
2. A primeira entrega cobre todos os módulos:
   - `piping`
   - `sizing`
   - `flow`
   - `pump`
   - `reactor`
   - `components`
   - `balance`
   - `glossary`
   - `exercises`
3. A interface nova deve permanecer o mais próxima possível da experiência atual, evitando redesenho estrutural agressivo.
4. Bibliotecas podem ser trocadas quando isso for tecnicamente mais indicado.
5. A abordagem aprovada foi:
   - `Vite + React + TypeScript + shadcn/ui`
   - troca obrigatória de `SweetAlert2` e `Select2`
   - preservação seletiva de bibliotecas úteis, como `KaTeX`
   - avaliação dirigida para gráficos, em vez de preservação automática do legado
6. A monografia deve ser reescrita em termos do stack final real, sem narrativa de migração.

---

## 4. Abordagem Escolhida

### 4.1 Alternativas Consideradas

Foram avaliadas três direções:

1. `Vite + React + TypeScript + shadcn/ui`, preservando seletivamente bibliotecas úteis.
2. `Vite + React + TypeScript`, com padronização total de todas as bibliotecas para equivalentes React.
3. Camada híbrida temporária, mantendo parte dos módulos legados encapsulados em wrappers DOM.

### 4.2 Direção Aprovada

A direção aprovada foi a alternativa 1.

Motivos:

- menor risco de descaracterizar a experiência atual;
- melhor equilíbrio entre modernização e custo de portabilidade;
- simplifica manutenção futura sem introduzir dívida híbrida;
- permite reavaliar biblioteca por biblioteca com critério técnico;
- deixa a escrita da monografia mais limpa e factual.

### 4.3 Consequência Arquitetural

O frontend não deve ser adaptado incrementalmente sobre `index.html` com wrappers permanentes. A solução correta é criar uma base React nova dentro de `frontend/`, portar os fluxos de uso e substituir gradualmente o comportamento legado por componentes, hooks e serviços tipados.

---

## 5. Arquitetura Alvo

### 5.1 Tipo de Aplicação

O frontend será uma SPA em React compilada pelo Vite e entregue como build estático.

O backend FastAPI continua responsável por:

- expor os endpoints de cálculo;
- validar payloads;
- processar os modelos de Engenharia Química;
- retornar os resultados ao frontend.

Não haverá mudança de contrato de API nesta frente.

### 5.2 Estrutura Lógica Proposta

Estrutura sugerida para `frontend/src/`:

- `app/`
  - bootstrap da aplicação
  - layout principal
  - providers
  - roteamento
- `components/`
  - shell compartilhado
  - componentes visuais reutilizáveis
- `components/ui/`
  - componentes `shadcn/ui`
- `features/`
  - `piping/`
  - `sizing/`
  - `flow/`
  - `pump/`
  - `reactor/`
  - `components/`
  - `balance/`
  - `glossary/`
  - `exercises/`
- `lib/`
  - cliente de API
  - utilitários
  - wrappers de bibliotecas
  - helpers de formatação e parsing
- `assets/`
  - fontes, imagens e ícones reaproveitados
- `test/`
  - testes unitários e de integração

### 5.3 Princípios de Organização

- cada módulo deve ser uma feature isolada, com responsabilidade clara;
- componentes de UI não devem conhecer detalhes de endpoint;
- chamadas HTTP devem ficar centralizadas em serviços tipados;
- gráficos e renderização matemática devem ficar encapsulados;
- o shell da aplicação deve ser compartilhado, sem duplicação de layout por módulo.

---

## 6. Navegação e Experiência

### 6.1 Meta de UX

A nova interface deve parecer uma evolução técnica do frontend atual, não um produto diferente.

Portanto, devem ser preservados sempre que possível:

- nomes dos módulos;
- ordem lógica de acesso;
- labels e agrupamentos de campos;
- estrutura geral de formulários, resultados e painéis auxiliares;
- percepção de continuidade entre home, navegação lateral e áreas técnicas.

### 6.2 Navegação

Em vez de abas controladas por DOM e `hash` manual, a navegação passa a usar rotas React estáveis, como:

- `/`
- `/piping`
- `/sizing`
- `/flow`
- `/pump`
- `/reactor`
- `/components`
- `/balance`
- `/glossary`
- `/exercises`

A navegação lateral continua sendo o padrão em desktop, com versão compacta em telas menores.

### 6.3 Regras de Interface

- item ativo deve ser inequívoco;
- foco e ordem de tabulação devem acompanhar a ordem visual;
- páginas com muitos controles devem ter hierarquia visual clara;
- telas de cálculo devem manter formulário, ação, resultado e explicação contextual no mesmo fluxo;
- feedback de carregamento e erro deve ser explícito.

### 6.4 Visual e Direção de Design

A recomendação de design para este contexto é uma interface técnica, clara e previsível, com ênfase em:

- legibilidade;
- consistência;
- baixo ruído visual;
- acessibilidade;
- estabilidade de navegação;
- boa leitura de gráficos e blocos didáticos.

O projeto não deve adotar um estilo experimental ou altamente decorativo. A modernização visual deve vir de organização, contraste, componentes melhores e estados de interação mais claros.

---

## 7. Estado e Fluxo de Dados

### 7.1 Estratégia de Estado

O estado deve ser majoritariamente local por feature.

Cada módulo deve controlar:

- estado de formulário;
- estado de carregamento;
- estado de erro;
- estado de resultado;
- estado de apoio visual, como gráficos, painéis ou exemplos.

### 7.2 Store Global

Não há necessidade inicial de um store global complexo.

Estado global deve ser restrito a preocupações transversais, como:

- tema, se existir;
- navegação compartilhada;
- notificações globais;
- preferências leves de interface, se necessário.

### 7.3 Integração com API

As chamadas à API devem ser centralizadas em `src/lib/api.ts`, com funções tipadas por domínio.

Os componentes não devem consumir `fetch` diretamente. Em vez disso, cada feature deve usar:

- serviços;
- hooks de integração;
- adaptadores de payload e resposta.

### 7.4 Benefícios Esperados

- menor duplicação de chamadas;
- tratamento de erro consistente;
- melhor testabilidade;
- contratos explícitos entre UI e backend;
- remoção da dependência do módulo legado `frontend/js/modules/api.js`.

---

## 8. Decisão de Bibliotecas

### 8.1 Bibliotecas Mantidas

#### `KaTeX`

Decisão: **manter**.

Justificativa:

- já atende bem ao caso de uso didático;
- continua adequada para fórmulas e expressões matemáticas;
- pode ser encapsulada em um componente React sem dificuldade excessiva.

#### Visualizações SVG próprias

Decisão: **manter**, com port para componentes React.

Justificativa:

- representam comportamento específico dos módulos;
- têm valor didático e técnico próprio;
- não dependem de um framework legado para existir.

### 8.2 Bibliotecas Substituídas

#### `SweetAlert2`

Decisão: **substituir** por:

- `Dialog`
- `AlertDialog`
- `sonner`

Justificativa:

- melhor integração com React;
- maior consistência com `shadcn/ui`;
- menos acoplamento com manipulação imperativa global.

#### `Select2`

Decisão: **substituir** por:

- `Select`
- `Combobox`
- `Command`
- `Popover`

Justificativa:

- remove dependência de `jQuery`;
- melhora acessibilidade e integração com estado React;
- reduz a necessidade de gambiarras de estilo e sincronização de DOM.

#### `jQuery`

Decisão: **remover**.

Justificativa:

- conflita com o modelo declarativo do React;
- aumenta acoplamento com DOM;
- não oferece valor que justifique permanência no app novo.

### 8.3 Bibliotecas Reavaliadas

#### Gráficos

Decisão: **preferir `Recharts` com o ecossistema de gráficos do `shadcn/ui`**, avaliando exceções por módulo.

Justificativa:

- melhor alinhamento com React;
- composição mais natural com componentes;
- reduz o estilo de integração imperativa hoje usado com `Chart.js`.

Regra prática:

- usar `Recharts` como padrão;
- só manter ou reintroduzir `Chart.js` se algum gráfico específico perder qualidade, clareza ou esforço de migração ficar desproporcional.

### 8.4 Bibliotecas de Base

- `Tailwind CSS`: **manter**
- `shadcn/ui`: **adotar**
- `lucide-react`: **adotar**
- `TypeScript`: **adotar como padrão obrigatório**

---

## 9. Estratégia por Módulo

Todos os módulos entram na primeira entrega e devem ser tratados como features de mesmo nível.

### 9.1 Módulos de cálculo

Os módulos abaixo devem ser migrados como áreas completas de trabalho:

- `piping`
- `sizing`
- `flow`
- `pump`
- `reactor`
- `components`
- `balance`

Cada um deve conter:

- página própria;
- formulário;
- validação;
- integração com API;
- bloco de resultados;
- visualizações e apoio didático correspondentes.

### 9.2 Módulos de apoio

Os módulos abaixo também entram na SPA:

- `glossary`
- `exercises`

Eles não devem ser tratados como extras tardios ou páginas desconectadas. Devem participar da mesma navegação, do mesmo shell e da mesma linguagem visual do restante da aplicação.

### 9.3 Regra de Portabilidade

Ao migrar um módulo:

- preservar o fluxo atual antes de melhorar detalhes;
- evitar reinterpretação funcional desnecessária;
- separar claramente lógica de domínio, UI e visualização;
- encapsular qualquer cálculo ou visual auxiliar que ainda esteja espalhado pelo DOM legado.

---

## 10. Testes

### 10.1 Testes de frontend

O frontend novo deve ser validado com:

- `Vitest`
- `React Testing Library`
- `Playwright`

### 10.2 Escopo mínimo de cobertura

Os testes devem comprovar:

- navegação entre páginas;
- renderização correta do shell;
- submissão de formulários principais;
- tratamento de erro;
- renderização de resultados;
- atualização de gráficos e blocos visuais relevantes;
- funcionamento dos fluxos de glossário e exercícios.

### 10.3 Diretriz de qualidade

O objetivo dos testes não é congelar detalhes cosméticos, e sim garantir que a experiência funcional do legado foi preservada sob a nova stack.

---

## 11. Deploy

### 11.1 Modelo operacional

O deploy deve continuar simples:

- frontend compilado como build estático;
- contêiner dedicado ao frontend;
- API FastAPI mantida separadamente;
- publicação via stack já existente de Docker e web server.

### 11.2 Implicações

Será necessário ajustar:

- `deploy/Dockerfile.frontend`
- eventual configuração de servidor estático ou proxy
- pipeline de build do frontend

Sem alterar o modelo geral de:

- frontend servido como aplicação web separada;
- backend respondendo em endpoints próprios;
- integração por HTTP.

---

## 12. Monografia e Documentação

### 12.1 Regra documental

A escrita deve refletir apenas o stack final realmente usado.

Não deve haver texto em tom de transição, como:

- “migração para”
- “passa a usar”
- “será substituído por”

Em vez disso, a redação final deve assumir o estado consolidado, com formulações como:

- “o frontend foi desenvolvido usando React, TypeScript e Vite”;
- “Tailwind CSS foi utilizado para estilização da interface”;
- “os componentes de interface utilizam shadcn/ui”;
- “KaTeX é utilizado para renderização de expressões matemáticas”;
- “a biblioteca de gráficos utilizada é ...”, conforme a implementação final.

### 12.2 Arquivos com maior impacto

Os pontos com maior probabilidade de ajuste são:

- `escrita/TEX/capitulos/4.1-desenvolvimento.tex`
- `escrita/TEX/capitulos/4.5-recursos-didaticos.tex`
- `escrita/TEX/capitulos/5-resultados.tex`
- `README.md`

### 12.3 Tratamento do texto incorreto sobre Next

Os trechos que hoje descrevem `Next.js` devem primeiro ser revertidos por Git para remover a narrativa errada, e depois reescritos conforme o frontend real final.

---

## 13. Restrições e Não Objetivos

- não mudar contratos da API nesta frente;
- não manter `jQuery` ou plugins legados por conveniência sem justificativa técnica forte;
- não redesenhar profundamente a UX se isso não trouxer ganho claro;
- não introduzir uma camada híbrida permanente entre React e DOM legado;
- não deixar a monografia descrevendo um stack diferente do código final.

---

## 14. Resultado Esperado

Ao final desta frente, o projeto deve possuir:

- um frontend completo em `Vite + React + TypeScript`;
- componentes `shadcn/ui` como base de interação;
- todos os módulos atuais portados;
- dependências legadas de UI substituídas onde adequado;
- deploy coerente com uma SPA estática;
- monografia e README alinhados ao estado real do código.

O usuário final deve perceber continuidade de uso, melhor consistência visual e melhor qualidade de interação, enquanto o código passa a ter uma base muito mais sustentável para evolução futura.
