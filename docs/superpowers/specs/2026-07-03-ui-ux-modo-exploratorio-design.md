# Design: Refinamento de UI/UX do Modo Exploratório

**Data:** 2026-07-03  
**Escopo:** Frontend do DCOU, com foco no modo exploratório dos módulos de Dimensionamento, Escoamento, Bombas, Reatores e Balanço de Massa.

---

## 1. Contexto

Os arquivos atualmente em edição introduziram um modo exploratório didático, mas a experiência ainda ficou fragmentada no navegador. O comportamento observado é:

- ao interagir com o modo exploratório, a página pode reposicionar o usuário de forma desconfortável;
- após alterar parâmetros, os gráficos relevantes ficam fora do contexto imediato do card exploratório;
- o painel funciona mais como um controle remoto dos resultados do módulo do que como um mini-laboratório autônomo;
- parte dos textos visíveis ao usuário no frontend foi escrita sem acentuação correta.

O objetivo desta iteração não é redesenhar os cálculos nem criar novos modelos visuais simplificados. O objetivo é reorganizar a experiência para que o modo exploratório concentre, no mesmo bloco, a seleção do template, os sliders, a orientação guiada, os gráficos analíticos do módulo e a comparação de cenários.

---

## 2. Objetivo de UX

O modo exploratório deve passar a se comportar como um **mini-laboratório autônomo** dentro de cada módulo.

Isso significa:

- ao escolher um template, o usuário deve ser levado suavemente ao topo do laboratório exploratório, sem saltos desorientadores;
- após isso, qualquer ajuste de slider deve atualizar os dados no próprio contexto visual, sem rolagem automática;
- os mesmos gráficos analíticos já usados pelo módulo devem aparecer dentro do card exploratório;
- a pessoa usuária não deve precisar subir ou descer a página para entender o efeito da alteração de parâmetros;
- os textos visíveis alterados nesta frente devem aparecer com acentuação correta quando estiverem claramente errados.

---

## 3. Decisões Aprovadas

As decisões fechadas durante a etapa de brainstorming foram:

1. O modo exploratório será tratado como um mini-laboratório autônomo.
2. Os gráficos embutidos no card serão os mesmos gráficos analíticos principais do módulo, não versões resumidas.
3. Ao selecionar um template, a interface fará apenas um ajuste suave para alinhar o topo do laboratório exploratório na viewport.
4. Ao mover sliders, não haverá rolagem automática.
5. A correção textual cobrirá apenas palavras e rótulos visivelmente errados nos trechos alterados, sem revisão editorial ampla do frontend.

---

## 4. Estrutura da Solução

### 4.1 Organização do Card Exploratório

Cada módulo com modo exploratório passará a exibir, dentro do próprio card, esta sequência:

1. Cabeçalho do modo exploratório com seletor de template.
2. Área de sliders de exploração.
3. Área de roteiro guiado.
4. Área de visualização embutida com os gráficos analíticos do módulo.
5. Área de comparação de cenários.

O card deixa de depender dos resultados espalhados no restante do módulo para entregar a experiência principal de exploração.

### 4.2 Papel dos Gráficos

Os gráficos embutidos devem reutilizar a mesma lógica de renderização existente no módulo original. A solução não deve duplicar regras matemáticas nem introduzir gráficos alternativos apenas para o modo exploratório.

A experiência desejada é:

- no fluxo exploratório, os gráficos embutidos são a referência principal;
- os gráficos já existentes fora do card podem continuar existindo por compatibilidade;
- o usuário consegue interpretar a mudança de cenário sem sair do laboratório.

### 4.3 Posicionamento e Rolagem

O comportamento de navegação será:

- ao selecionar um template, o laboratório é expandido e alinhado suavemente no topo da área visível;
- o movimento deve ser curto, previsível e restrito a esse momento inicial;
- alterações posteriores por sliders, salvar cenário ou limpar comparações não devem disparar rolagem automática.

Essa decisão evita o efeito de “teletransporte” da interface e reduz perda de contexto.

---

## 5. Arquitetura de Frontend

### 5.1 Responsabilidades do `didatic.js`

`frontend/js/modules/didatic.js` permanece como orquestrador do modo exploratório e passa a assumir também:

- montagem da área visual embutida do laboratório;
- expansão e exibição dos estados do card ao selecionar template;
- alinhamento suave do card na viewport no momento de ativação;
- correção das strings visíveis do próprio modo exploratório nos trechos tocados;
- coordenação entre template ativo, sliders, cenários e atualização da visualização embutida.

`didatic.js` não deve concentrar a lógica interna de desenho dos gráficos.

### 5.2 Responsabilidades dos Módulos

Os módulos (`flow.js`, `pump.js`, `reactor.js`, `sizing.js` e `balance.js`) continuam responsáveis por:

- cálculo;
- transformação dos resultados;
- renderização dos gráficos principais.

Para permitir reutilização dentro do laboratório exploratório, cada módulo deve expor pontos de entrada pequenos e claros para renderizar os gráficos em contêineres específicos.

Diretriz:

- evitar cópia de implementação de gráfico em `didatic.js`;
- preferir funções do tipo “renderizar visualização X neste contêiner com estes dados”;
- manter a lógica de cálculo fora da camada didática.

### 5.3 Compatibilidade

O preenchimento dos campos-base dos formulários continua existindo. Os sliders do modo exploratório seguem espelhando os campos do módulo.

Fluxo mantido:

1. Template define campos.
2. Slider altera campo correspondente.
3. Módulo recalcula.
4. Resultado alimenta o gráfico embutido e, se aplicável, o gráfico externo já existente.

---

## 6. Comportamento por Estado

### 6.1 Estado Inicial

- o card exploratório aparece em estado compacto;
- a área de gráficos embutidos ainda não é mostrada antes da seleção de template;
- o usuário vê apenas a entrada do modo exploratório.

### 6.2 Após Seleção de Template

- o template é aplicado aos campos necessários;
- sliders, roteiro, gráficos embutidos e comparação são revelados;
- o topo do card é alinhado suavemente na viewport;
- o cálculo inicial do cenário é executado automaticamente;
- a primeira visualização útil já aparece no próprio laboratório.

### 6.3 Durante Ajustes de Slider

- o valor visual do slider é atualizado localmente;
- os campos associados continuam sendo sincronizados;
- o cálculo roda com debounce;
- os gráficos embutidos são atualizados no mesmo lugar;
- a posição de scroll permanece intacta.

### 6.4 Cenários Salvos

- a lista de cenários continua no próprio laboratório;
- a comparação visual deve priorizar os gráficos embutidos;
- nomes, cores e ações de limpar permanecem acessíveis no mesmo contexto.

### 6.5 Estado de Erro ou Resultado Incompleto

- caso não haja dados suficientes para o gráfico, o laboratório exibe um placeholder curto;
- caso haja erro de cálculo, a mensagem deve aparecer dentro do próprio contexto exploratório, próxima da área visual;
- o usuário não deve depender apenas da área geral de resultado do módulo para entender a falha.

---

## 7. Ajustes de UI

### 7.1 Hierarquia Visual

O laboratório precisa de hierarquia mais clara do que a implementação atual. A interface deve evidenciar:

- seleção do cenário didático;
- manipulação dos parâmetros;
- leitura do comportamento nos gráficos;
- comparação entre cenários.

O layout deve evitar a aparência de bloco genérico solto no fim do módulo.

### 7.2 Responsividade

O card exploratório precisa acomodar:

- sliders em coluna em telas menores;
- gráficos com largura total dentro do bloco;
- comparação de cenários sem romper o layout;
- leitura confortável sem exigir navegação horizontal.

### 7.3 Microcópia e Acentuação

Serão corrigidos os textos visíveis e claramente errados nos trechos alterados, incluindo exemplos como:

- “Exploratório”;
- “didático”;
- “comparação”;
- “cenário”;
- “reação”, “razão”, “sucção”, “óleo”, “água”, “diâmetro”;
- passos guiados e rótulos derivados do modo exploratório.

Não faz parte deste escopo revisar editorialmente todo o frontend.

---

## 8. Arquivos Envolvidos

Arquivos com maior probabilidade de alteração:

- `frontend/index.html`
- `frontend/css/styles.css`
- `frontend/js/modules/didatic.js`
- `frontend/js/modules/flow.js`
- `frontend/js/modules/pump.js`
- `frontend/js/modules/reactor.js`
- `frontend/js/modules/sizing.js`
- `frontend/js/modules/balance.js`

O objetivo é concentrar a alteração no frontend já tocado, sem expandir escopo para backend.

---

## 9. Riscos e Cuidados

### 9.1 Duplicação de Lógica

O principal risco é copiar a lógica dos gráficos para dentro de `didatic.js`. Isso deve ser evitado. A solução correta é reutilizar renderizadores ou expor funções específicas por módulo.

### 9.2 Acoplamento Excessivo

Se o laboratório começar a depender de detalhes internos demais de cada módulo, a manutenção ficará frágil. Por isso, os contratos entre `didatic.js` e os módulos devem ser pequenos e explícitos.

### 9.3 Regressão de Scroll

Qualquer `scrollIntoView`, foco automático ou rerender que cause reposicionamento inesperado precisa ser auditado. O único reposicionamento intencional aprovado é o alinhamento suave do topo do laboratório ao selecionar um template.

### 9.4 Poluição Visual

Se a área embutida crescer sem hierarquia, o laboratório pode virar um bloco longo demais. O layout precisa manter separação clara entre controles, explicação guiada, gráficos e cenários.

---

## 10. Estratégia de Verificação

Antes de considerar a implementação pronta, verificar:

1. Selecionar template alinha o card de forma suave e previsível.
2. Alterar sliders não muda a posição de rolagem.
3. Os gráficos embutidos mostram o mesmo comportamento analítico esperado do módulo.
4. A comparação de cenários continua funcional dentro do laboratório.
5. Os textos corrigidos aparecem com acentuação adequada nos trechos alterados.
6. O layout continua legível em desktop e mobile.

---

## 11. Fora de Escopo

Não faz parte deste trabalho:

- criar novos gráficos simplificados;
- redesenhar o backend;
- revisar editorialmente todo o frontend;
- reestruturar todos os módulos além do necessário para suportar renderização embutida;
- alterar a lógica matemática dos cálculos.

---

## 12. Resultado Esperado

Ao final desta frente, o modo exploratório deixa de ser apenas um painel auxiliar no fim do módulo e passa a ser um espaço de exploração completo, com contexto visual próprio, interação previsível e linguagem visível mais correta no frontend.
