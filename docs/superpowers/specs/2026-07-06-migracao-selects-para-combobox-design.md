# Design: Migração de selects do frontend para combobox

**Data:** 2026-07-06  
**Escopo:** substituir os `<select>` nativos e os multi-selects em HTML puro do frontend por uma família de componentes `Combobox` baseada em `@base-ui/react`, com busca textual, seleção única e seleção múltipla com chips.  
**Fora de escopo:** alterar regras de cálculo, contratos de API, estrutura de rotas, conteúdo textual das páginas ou redesenhar a experiência além da troca dos controles de seleção.

---

## 1. Contexto

O frontend atual já usa `@base-ui/react` em outros componentes e também possui um `Combobox` customizado em `frontend/src/components/ui/combobox.tsx`. Esse componente, porém, ainda não está adotado nas telas principais.

O levantamento atual mostra que os controles de seleção relevantes ainda estão distribuídos assim:

- selects nativos em módulos de cálculo e formulários;
- multi-selects em HTML puro, principalmente na página de componentes;
- um combobox customizado coberto por testes, mas não usado nas páginas de produção.

Os arquivos afetados hoje incluem:

- `frontend/src/features/balance/balance-page.tsx`
- `frontend/src/features/components/components-page.tsx`
- `frontend/src/features/exercises/exercises-page.tsx`
- `frontend/src/features/exploratory/template-selector.tsx`
- `frontend/src/features/flow/flow-page.tsx`
- `frontend/src/features/piping/piping-page.tsx`
- `frontend/src/features/pump/pump-page.tsx`
- `frontend/src/features/reactor/reactor-page.tsx`
- `frontend/src/features/sizing/sizing-page.tsx`

A migração precisa preservar o comportamento existente, mas trocar a superfície de interação para algo mais consistente, pesquisável e reutilizável.

---

## 2. Objetivo

Padronizar a seleção de valores no frontend com um conjunto pequeno de componentes reutilizáveis que entreguem:

- busca textual enquanto digita;
- seleção única;
- seleção múltipla com chips;
- acessibilidade melhor que `select` nativo em listas longas;
- integração consistente com o estilo visual do projeto;
- API simples o bastante para substituir os controles atuais sem reescrever a lógica de negócio.

O objetivo é reduzir a dispersão entre `select` nativo, multi-select HTML e combobox customizado isolado.

---

## 3. Decisão Aprovada

A direção aprovada é:

1. Usar `@base-ui/react` como base da nova família de seleção.
2. Consolidar a seleção única em um combobox com busca textual.
3. Consolidar a seleção múltipla em um combobox com chips.
4. Substituir os `<select>` nativos das telas principais por esses componentes.
5. Manter a lógica de domínio e os endpoints como estão.
6. Migrar por etapas, mas com o mesmo padrão de componente em todo o frontend.

---

## 4. Abordagem Escolhida

### 4.1 Alternativas Consideradas

1. Manter `<select>` nativo e adicionar apenas casos isolados de busca.
2. Criar um componente próprio de combobox/multi-combobox em cima do `Combobox` já existente.
3. Adotar diretamente os componentes de `@base-ui/react` para seleção única e múltipla.

### 4.2 Direção Aprovada

A alternativa 3 foi aprovada.

Motivos:

- o projeto já depende de `@base-ui/react`;
- a biblioteca já oferece suporte a múltipla seleção, chips e busca;
- reduz duplicação entre um combobox custom frágil e uma implementação nova;
- facilita manter acessibilidade e comportamento consistente;
- diminui o custo de manutenção dos controles de formulário.

### 4.3 Consequência Arquitetural

A interface de seleção deixa de ser definida caso a caso em cada tela e passa a ser centralizada em componentes compartilhados. O estado de negócio continua local à feature, mas a experiência de seleção passa a seguir as mesmas regras visuais e comportamentais em todo o app.

---

## 5. Arquitetura Alvo

### 5.1 Componentes Compartilhados

A base da migração deve viver em `frontend/src/components/ui/` e cobrir dois casos:

- um componente de seleção única com input pesquisável;
- um componente de seleção múltipla com chips removíveis.

Esses componentes devem expor uma API orientada a dados simples:

- `label`
- `options`
- `value` ou `values`
- `onValueChange`
- `placeholder`
- `emptyText`
- `disabled`
- `className`

### 5.2 Forma de Uso

As features devem continuar controlando o estado, mas com uma interface uniforme.

Em termos de uso, a regra é:

- campos de valor único com listas maiores ou com necessidade de busca usam combobox;
- campos de múltipla seleção usam multi-combobox com chips;
- selects sem necessidade real de busca só permanecem nativos se houver um motivo claro e documentado.

### 5.3 Implementação Base

A implementação deve aproveitar os primitives do `@base-ui/react` já instalados no projeto. O combobox atual pode servir como referência de API e de cobertura de testes, mas não deve continuar como fonte única de verdade se não cobrir múltipla seleção.

Se a migração exigir, o componente atual pode ser:

- reaproveitado como wrapper fino;
- substituído por uma camada nova mais explícita;
- mantido apenas como compatibilidade temporária durante a transição.

---

## 6. Padrões de Comportamento

### 6.1 Seleção Única

O combobox de seleção única deve:

- abrir ao focar;
- filtrar opções por label e value;
- permitir seleção por clique e teclado;
- fechar ao selecionar;
- refletir o item selecionado no campo;
- mostrar estado vazio quando não houver correspondência.

### 6.2 Seleção Múltipla

O multi-combobox deve:

- permitir buscar e adicionar vários itens;
- exibir os itens selecionados como chips;
- permitir remoção individual de chips;
- manter a lista filtrada enquanto o usuário digita;
- suportar a reabertura sem perder a seleção atual;
- evitar duplicar valores já selecionados.

### 6.3 Acessibilidade e Interação

Os componentes devem preservar:

- associação correta entre label e campo;
- navegação por teclado;
- estados `aria-*` apropriados;
- foco visível coerente com o tema;
- comportamento previsível em mouse e teclado.

Não é aceitável trocar select nativo por um componente que piore a navegação por teclado ou que esconda o estado selecionado do usuário.

---

## 7. Componentes Impactados

### 7.1 Módulos com Selects Nativos

Os selects das páginas abaixo devem migrar para combobox:

- [frontend/src/features/balance/balance-page.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/balance/balance-page.tsx)
- [frontend/src/features/exercises/exercises-page.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/exercises/exercises-page.tsx)
- [frontend/src/features/flow/flow-page.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/flow/flow-page.tsx)
- [frontend/src/features/piping/piping-page.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/piping/piping-page.tsx)
- [frontend/src/features/pump/pump-page.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/pump/pump-page.tsx)
- [frontend/src/features/reactor/reactor-page.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/reactor/reactor-page.tsx)
- [frontend/src/features/sizing/sizing-page.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/sizing/sizing-page.tsx)
- [frontend/src/features/exploratory/template-selector.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/exploratory/template-selector.tsx)

### 7.2 Módulos com Multi-Select

Os multi-selects em HTML puro devem migrar para o novo componente com chips, principalmente em:

- [frontend/src/features/components/components-page.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/features/components/components-page.tsx)

### 7.3 Base Compartilhada

O componente existente em [frontend/src/components/ui/combobox.tsx](/home/jpbgr/Área%20de%20trabalho/Projetos/Pessoais/TCC/frontend/src/components/ui/combobox.tsx) deve ser revisado para deixar claro se ele vira:

- wrapper de seleção única;
- ponto de integração com a nova API;
- ou componente legado a ser substituído.

---

## 8. Fluxo de Migração

1. Definir a API compartilhada de seleção única e múltipla.
2. Implementar o componente base com suporte a pesquisa.
3. Implementar a variante de múltipla seleção com chips.
4. Migrar os módulos com selects mais simples.
5. Migrar os formulários mais densos e os multi-selects.
6. Atualizar os testes unitários e e2e afetados.
7. Verificar consistência visual, de teclado e de foco.

Essa ordem reduz risco, porque primeiro estabiliza a base compartilhada e depois troca os consumidores.

---

## 9. Critérios de Aceite

A migração será considerada pronta quando:

- todos os selects relevantes do frontend estiverem usando combobox;
- os campos com múltipla seleção mostrarem chips e suportarem remoção;
- a busca textual funcionar nas telas com listas grandes;
- o comportamento continuar correto para os fluxos de cálculo existentes;
- os testes continuarem passando ou forem ajustados para o novo controle;
- não restarem multi-selects em HTML puro nas telas mapeadas.

---

## 10. Testes e Verificação

A validação deve cobrir:

- testes unitários do componente de seleção única;
- testes unitários do componente de seleção múltipla;
- testes das páginas que trocaram `select` por combobox;
- testes e2e para navegação, filtro e seleção;
- build sem erros;
- verificação visual dos campos migrados.

Os testes devem provar que:

- a busca filtra opções;
- a seleção única mantém o valor correto;
- a seleção múltipla adiciona e remove itens;
- a migração não quebrou o comportamento dos módulos existentes.

