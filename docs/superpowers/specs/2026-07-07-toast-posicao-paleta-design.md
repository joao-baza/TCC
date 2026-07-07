# Design: posicionamento e paleta dos toasts

**Data:** 2026-07-07  
**Escopo:** padronizar o posicionamento e a linguagem visual dos toasts globais do frontend.  
**Fora de escopo:** alterar o fluxo de mensagens de erro/sucesso nas telas, trocar a biblioteca de toast ou redesenhar outros componentes de feedback.

---

## 1. Contexto

O frontend já usa `sonner` por meio de um `Toaster` global e do wrapper `frontend/src/lib/notify.ts`. O comportamento atual atende à exibição básica, mas ainda não expressa uma regra visual explícita para o tipo de mensagem.

O ajuste solicitado define duas decisões:

- o toast deve aparecer no canto superior direito em desktop;
- no mobile, o toast deve ficar centralizado no topo para melhorar leitura e evitar disputa com bordas laterais estreitas.

Além disso, o tipo da mensagem deve influenciar diretamente a cor:

- `info` usa a paleta de marca, combinando primária e secundária;
- `error` usa vermelho semântico de erro;
- demais tipos mantêm cores semânticas coerentes com o significado da mensagem.

---

## 2. Objetivo

Garantir que os toasts globais:

- apareçam em uma posição previsível e confortável em diferentes larguras;
- expressem o tipo da mensagem pela cor, não apenas pelo ícone;
- mantenham a implementação pequena e centralizada.

---

## 3. Decisão

A solução aprovada é:

1. Manter um único `Toaster` global.
2. Usar `top-right` como posição padrão em telas maiores.
3. Trocar para `top-center` em telas pequenas.
4. Aplicar estilos por tipo diretamente no toast renderizado, com classes globais e seletores baseados em `data-type`.
5. Preservar `notify.ts` como wrapper fino, adicionando apenas o helper `warning` para completar a API semântica.

---

## 4. Arquitetura Visual

### 4.1 Posição

O componente `frontend/src/components/ui/sonner.tsx` vai decidir a posição responsiva do `Toaster`.

Regra:

- desktop: `top-right`;
- mobile: `top-center`.

Isso deve ser resolvido no próprio wrapper, sem depender de cada tela.

### 4.2 Cor por tipo

O estilo base do toast será neutro e usará tokens do tema.

Os tipos terão variações:

- `info`: fundo com `primary` e `secondary`, texto em contraste claro;
- `error`: fundo em vermelho de erro;
- `success`: estilo semântico de sucesso;
- `warning`: estilo semântico de alerta;
- `loading`: superfície neutra com feedback visual consistente.

O objetivo é tornar o significado perceptível mesmo em leitura rápida.

### 4.3 Implementação centralizada

As classes visuais devem ficar no sistema global de estilos, para não repetir cor em cada chamada de toast e para manter a API de `notify` simples.

---

## 5. Componentes Impactados

- `frontend/src/components/ui/sonner.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/lib/notify.ts`
- testes unitários do wrapper e do posicionamento responsivo

---

## 6. Critérios de Aceite

- Em desktop, os toasts aparecem no canto superior direito.
- Em mobile, os toasts aparecem centralizados no topo.
- `notify.info()` gera visual de marca com primária e secundária.
- `notify.error()` e erros exibidos pelo app usam vermelho semântico.
- `notify.success()` e `notify.warning()` continuam semânticos e legíveis.
- A alteração não quebra o uso atual do `Toaster` global nem a API existente de `notify`.

---

## 7. Verificação

A validação deve cobrir:

- a posição passada ao `Toaster` conforme a largura da tela;
- a presença do helper `warning`;
- a manutenção do wrapper centralizado;
- build e teste do frontend.
