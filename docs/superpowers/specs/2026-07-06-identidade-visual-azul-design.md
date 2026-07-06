# Design: Identidade visual azul do frontend

**Data:** 2026-07-06  
**Escopo:** aplicar uma nova identidade visual em todo o frontend, usando `#0088B7` como cor primária e `#006D92` como cor secundária dominante, com branco como base principal de superfície e contraste.  
**Fora de escopo:** alterar fluxos de produto, navegação funcional, conteúdo técnico das páginas ou a arquitetura de dados do aplicativo.

---

## 1. Contexto

O frontend atual já está organizado em React com `Vite`, `Tailwind CSS v4` e componentes reutilizáveis. A identidade visual, porém, ainda mistura tokens genéricos com cores fixas espalhadas em shell, sidebar, cards, botões e gráficos.

Hoje existem pontos visuais que precisam ser alinhados:

- tokens globais em `frontend/src/app/globals.css`;
- superfícies próprias em `AppShell`, `AppSidebar`, `Card` e `Button`;
- cores hardcoded em visualizações e testes de gráfico;
- estados de foco, hover, seleção e destaque com linguagem cromática inconsistente.

A mudança solicitada é de identidade visual, não de reestruturação funcional. O objetivo é tornar o app visualmente coerente com uma paleta azul técnica, clara e institucional.

---

## 2. Objetivo

Padronizar toda a interface para uma identidade visual baseada em:

- `#0088B7` como cor primária;
- `#006D92` como cor secundária dominante;
- branco como fundo e superfície principal;
- variações neutras para texto, borda e fundo auxiliar;
- uso consistente da paleta também em gráficos, estados interativos e feedback visual.

A interface deve continuar legível, técnica e estável para uso em telas densas de cálculo.

---

## 3. Decisão Aprovada

A direção escolhida no brainstorming foi:

1. Base branca e limpa.
2. Azul primário `#0088B7` para ações principais, links e foco de marca.
3. Azul secundário `#006D92` para reforço visual, estado ativo e elementos de destaque.
4. Aplicação da identidade em tudo:
   - shell;
   - sidebar;
   - cards;
   - botões;
   - inputs e estados de foco;
   - gráficos e séries;
   - páginas e seções principais.

---

## 4. Abordagem Escolhida

### 4.1 Alternativas Consideradas

1. Tema institucional limpo, com branco predominante e azuis como acento.
2. Tema técnico mais forte, com azul mais presente nas superfícies.
3. Tema escuro imersivo, com azul como protagonista.

### 4.2 Direção Aprovada

A alternativa 1 foi aprovada.

Motivos:

- preserva a leitura em páginas com muita informação;
- combina com um app técnico e acadêmico;
- reduz risco de poluição visual;
- permite aplicar a marca sem alterar o comportamento da interface;
- facilita manter contraste consistente entre texto, superfície e destaque.

---

## 5. Arquitetura Visual

### 5.1 Tokens Globais

A base visual deve sair de `frontend/src/app/globals.css`, onde os tokens semânticos do tema serão recalibrados para a nova paleta.

Os tokens devem cobrir:

- `--primary` e `--primary-foreground`;
- `--secondary` e `--secondary-foreground`;
- `--accent`;
- `--ring`;
- `--border` e `--input`;
- `--muted` e `--muted-foreground`;
- `--sidebar-*`;
- `--chart-*`.

Se a aplicação continuar com suporte a tema escuro, os tokens equivalentes também devem ser alinhados à mesma família cromática, mantendo a versão clara como referência principal da identidade.

### 5.2 Superfícies

As superfícies principais devem seguir a hierarquia:

- `background`: branco ou quase branco;
- `card` e `popover`: branco com borda sutil;
- `sidebar`: branco com separação discreta;
- `header` e áreas de navegação: superfícies neutras com destaque apenas onde houver interação.

### 5.3 Tipografia

A tipografia atual pode ser mantida. O foco da mudança é cromático e de consistência de superfície, não de troca de família tipográfica.

---

## 6. Componentes Impactados

### 6.1 Shell da Aplicação

`frontend/src/components/app-shell.tsx` deve deixar de usar cores fixas que não pertencem ao sistema de tokens. O shell precisa herdar o tema global e não competir com ele.

### 6.2 Sidebar

`frontend/src/components/app-sidebar.tsx` deve usar:

- estado ativo com `primary` e contraste correto;
- hover com azul secundário ou neutro derivado da paleta;
- estrutura visual consistente com a nova marca.

### 6.3 Botões

`frontend/src/components/ui/button.tsx` deve preservar os variantes existentes, mas com o `default` e o `outline` alinhados à nova paleta.

Regras:

- `default` usa `primary`;
- `secondary` usa o azul secundário como base sem perder legibilidade;
- `outline` e `ghost` devem permanecer neutros, mas compatíveis com o tema azul;
- foco visual deve usar o `ring` do tema, não um azul genérico externo.

### 6.4 Cards

`frontend/src/components/ui/card.tsx` deve continuar claro e neutro, mas com borda, sombra e footer harmonizados ao novo sistema.

### 6.5 Home e Páginas

`frontend/src/features/home/home-page.tsx` e demais páginas de módulo devem abandonar cores hardcoded de família cinza/azul que contrariem os tokens globais.

### 6.6 Gráficos e Visualizações

`frontend/src/lib/chart.ts` e componentes de visualização devem migrar para uma paleta coerente com:

- tons derivados de `#0088B7`;
- tons derivados de `#006D92`;
- neutros de apoio para comparação e legibilidade.

Não é aceitável manter uma combinação de cores por biblioteca que contradiga a identidade do produto.

---

## 7. Regras de Cor

### 7.1 Uso da Cor Primária

`#0088B7` deve aparecer como:

- ação principal;
- destaque de navegação;
- links importantes;
- foco visual de marca;
- série principal em gráficos quando fizer sentido.

### 7.2 Uso da Cor Secundária

`#006D92` deve aparecer como:

- hover e estado ativo complementar;
- destaque secundário;
- elementos de apoio em gráficos;
- variação de marca para separar camadas de informação.

### 7.3 Neutros

O branco deve ser dominante. Cinzas e neutros devem servir apenas para:

- hierarquia textual;
- separação de blocos;
- superfícies secundárias;
- estados desabilitados;
- legibilidade.

### 7.4 Estados Interativos

Os estados de hover, focus, active e selected devem ser derivados da própria paleta e não depender de uma mistura inconsistente de tons de biblioteca.

---

## 8. Fluxo de Aplicação

1. Atualizar tokens globais do tema.
2. Recalibrar shell, sidebar, cards e botões.
3. Substituir cores fixas em páginas e componentes por tokens semânticos.
4. Revisar gráficos e cores de séries.
5. Verificar contraste, destaque ativo e coerência entre páginas.
6. Validar em desktop e mobile.

---

## 9. Critérios de Aceite

A mudança será considerada pronta quando:

- toda a interface usar a nova identidade sem cores conflitantes;
- `primary` e `secondary` estiverem claramente perceptíveis em navegação e ações;
- gráficos, botões e cards parecerem parte do mesmo sistema visual;
- a aplicação permanecer legível em telas densas;
- não houver dependência de uma cor genérica fora da identidade para estados principais.

---

## 10. Testes e Verificação

A validação deve cobrir:

- build sem erros;
- inspeção visual das telas principais;
- navegação com estado ativo consistente;
- gráficos com paleta coerente;
- contraste básico em superfícies e botões;
- ausência de estilos hardcoded conflitantes nos componentes atingidos.

Os testes existentes devem continuar passando. Se algum teste depender de uma cor fixa antiga, ele deve ser ajustado para refletir o novo sistema visual.
