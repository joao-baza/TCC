# Design: Restauração de Paridade do Frontend React (base + modo exploratório)

**Data:** 2026-07-04
**Escopo:** Restaurar no frontend Vite/React/ShadCN (`frontend/src/**`) toda a camada didática que existia no frontend legado (vanilla HTML/CSS/JS) e que se perdeu na migração — acordeões teóricos, glossário, exercícios integrados, exemplos, validação inline, tratamento de erro/feedback, visualizações interativas e o **modo exploratório** — trazendo cada módulo à paridade funcional total.
**Fora de escopo:** alterar o backend ou os contratos de API; reescrever núcleos de cálculo que já funcionam; remover a base legada do histórico do repositório.

---

## 1. Contexto e Motivação

O frontend passou por uma migração de vanilla HTML/CSS/JS para Vite/React/ShadCN. A migração **preservou bem os núcleos de cálculo** (endpoints de balanço, CoolProp, Reynolds, NPSH, CSTR/PFR etc.) e **melhorou a arquitetura** (estado em React, roteamento com deep-link), mas **removeu quase toda a camada pedagógica** — justamente o que a tese descreve como o diferencial da ferramenta ("o que diferencia de uma simples calculadora").

Uma auditoria de paridade módulo a módulo (13 unidades comparadas entre o legado e o React) apontou:

| Módulo | Veredito | Paridade |
|---|---|---|
| Exercícios | ausente | ~4% |
| Glossário | ausente | ~8% |
| Recursos didáticos (acordeões/exemplos/validação) | ausente | ~12% |
| Bombas | parcial | ~35% |
| Estilo/libs | parcial | ~40% |
| Escoamento | parcial | ~45% |
| Dimensionamento | parcial | ~45% |
| Componentes | parcial | ~55% |
| Tratamento de erros | parcial | ~55% |
| Reatores | parcial | ~60% |
| Balanço | parcial | ~62% |
| Shell/navegação | parcial | ~62% |
| Tubulação | parcial | ~75% |

### Divergência com a tese (crítico para o TCC)

O capítulo `escrita/TEX/capitulos/4.5-recursos-didaticos.tex` **afirma que estes recursos existem**: glossário com 49 termos em 7 categorias com busca e KaTeX; oito blocos "Como funciona"; sete visualizações "geradas no frontend por componentes reativos usando SVG e Recharts"; sete exercícios integrados. O frontend atual não entrega isso, e há placeholders de figura (`\imgouplaceholder{...}`) para telas que não podem ser capturadas do estado atual. Além disso, o spec `2026-07-02-modo-exploratorio-didatico-design.md` previa a subseção **4.5.6 "Tutorial de Uso em Sala de Aula"**, dependente do modo exploratório.

### Decisão

Restaurar **tudo** no artefato React, **módulo a módulo**, com **importância igual entre todos os módulos**. O modo exploratório está **dentro** do escopo, com os mesmos campos e lógicas de antes.

---

## 2. Objetivo e Não-objetivos

**Objetivo:** levar cada um dos 9 módulos/áreas à paridade total conforme o Padrão de Paridade (§4), incluindo o modo exploratório nos 5 módulos aplicáveis, alinhando o artefato ao que a tese descreve.

**Não-objetivos:**
- Alterar backend, endpoints ou contratos de API.
- Reescrever núcleos de cálculo que já foram bem portados (apenas complementá-los).
- Introduzir modos ou recursos que não existiam no legado.

---

## 3. Estratégia Geral

**Reaproveitar conteúdo verbatim, reimplementar comportamento no idioma React/ShadCN.** O legado mistura *conteúdo* (dados) com *comportamento* (UI em jQuery):

- **Conteúdo → portado verbatim** (é dado puro): 54 termos do glossário, 7 exercícios com etapas, 8 textos "Como funciona" com fórmulas e referências, presets de exemplo, e a configuração completa do modo exploratório (templates, sliders, roteiros). Viram módulos `.ts`/`.tsx` tipados.
- **Comportamento → reimplementado**, mapeando cada biblioteca vendor para o equivalente já presente no projeto:

| Legado (vendor) | Equivalente React | Situação |
|---|---|---|
| Chart.js | recharts + SVG | no `package.json`, nunca importado |
| SweetAlert2 | sonner (`toast()`) | `<Toaster/>` montado, nunca chamado |
| Select2 | shadcn Combobox | a adicionar |
| KaTeX | react-katex | já em uso em 2 pontos |
| jQuery | — | removido |

**Descartado:** embrulhar os módulos jQuery dentro do React. Traria o jQuery de volta, contradiz a tese e cria base insustentável.

### Fontes de referência (verbatim)

| Conteúdo | Commit/arquivo de referência |
|---|---|
| Calculadoras base, acordeões, validação, exemplos | `c17f3cc:frontend/js/modules/*.js` + `c17f3cc:frontend/index.html` |
| Glossário (54 termos) | `c17f3cc:frontend/js/modules/glossary.js` |
| Exercícios integrados (7, motor multi-etapa) | `c17f3cc:frontend/js/modules/exercises.js` |
| Modo exploratório completo | `8967e14:frontend/js/modules/didatic.js` (+ renders em `sizing/flow/pump/reactor/balance.js`) |
| Design do modo exploratório | `docs/superpowers/specs/2026-07-02-modo-exploratorio-didatico-design.md` |
| Design system (tokens/cores) | `c17f3cc:frontend/css/styles.css` (`:root`) |
| Alinhamento textual | `escrita/TEX/capitulos/4.5-recursos-didaticos.tex` |

### Sequenciamento

Módulo a módulo. **Sizing é o primeiro** e serve de **molde**: por ser a menor calculadora e por ser um dos 5 módulos com modo exploratório, exercita **os dois frameworks transversais** (fundação base + exploratório), construindo os primitivos compartilhados que os demais módulos reusam. Cada módulo seguinte ganha um spec curto próprio (§8).

---

## 4. Padrão de Paridade (Definition of Done)

Todo módulo — sem exceção — só está "pronto" quando cumpre esta checklist. É o que garante importância igual entre os 9.

- [ ] **Acordeão(ões) "Como funciona"**: fórmula em KaTeX + tabela de variáveis (símbolo/variável/unidade) + referência bibliográfica.
- [ ] **Botão "Carregar exemplo"** (preset realista) + **"Limpar campos"**.
- [ ] **Validação inline** por campo (no blur: regras `positive`/`nonneg`/`number`, com `aria-live`) + validação pré-API com mensagem específica.
- [ ] **Tratamento de erro**: `try/catch` em todo handler + extração do campo `detail` do FastAPI + **toast** de erro.
- [ ] **Feedback de sucesso** (toast) + estados de loading + botões desabilitados durante requisição.
- [ ] **Visualização(ões)** exigida(s) pela tese (SVG/recharts), interativa(s).
- [ ] **Fórmulas em KaTeX** onde aplicável; **formatação numérica** correta usando `units` da API (nada hardcoded).
- [ ] **Flexibilidade de cálculo** do legado restaurada (quando aplicável ao módulo).
- [ ] **Design tokens** de marca aplicados + componentes semânticos (`regime-chip`, `interpretation-strip`) quando aplicável.
- [ ] **Painel exploratório** (condicional — apenas nos 5 módulos aplicáveis: sizing, flow, pump, reactor, balance): seletor de template + sliders + comparação de cenários + roteiro guiado.
- [ ] **Testes** (vitest) cobrindo o comportamento restaurado.

---

## 5. Fundação Compartilhada (primitivos base)

O Sizing constrói; os 8 módulos/áreas seguintes reusam.

| Primitivo | O que é | Local proposto | Substitui |
|---|---|---|---|
| `Accordion` | primitivo shadcn (Radix) colapsável | `components/ui/accordion.tsx` | `.accordion` (jQuery) |
| `HowItWorks` | acordeão + `formula-block` (KaTeX) + `variables-table` + `teoria-ref` | `components/how-it-works.tsx` | bloco "Como funciona" |
| `Combobox` | shadcn combobox com busca (command + popover) | `components/ui/combobox.tsx` | Select2 |
| `Slider` | primitivo shadcn (Radix) | `components/ui/slider.tsx` | `<input type=range>` |
| `notify` | helpers `notify.success/error/info` sobre sonner | `lib/notify.ts` | SweetAlert2 |
| `apiClient` (correção) | extrair `detail` do FastAPI; erro tipado | `lib/api.ts` | — |
| `useFieldValidation` / `NumberField` | validação no blur (`positive`/`nonneg`/`number`) + `aria-live` | `lib/validation.ts` + `components/number-field.tsx` | `_setupFieldValidation` |
| `LoadExampleButton` + presets | preenche o form e limpa validação | `components/load-example-button.tsx` + `features/*/presets.ts` | `didatic.js examples` |
| `PropertyTable` | tabela Propriedade/Valor/Unidade, `tabular-nums`, notação científica | `components/property-table.tsx` | `UI.generatePropertyTable` |
| Design tokens | paleta de marca (`--color-primary #2563EB`, `--color-accent #7C3AED`) + semânticas + tokens de viz/regime | `app/globals.css` | `styles.css :root` |
| `RegimeChip` / `InterpretationStrip` | componentes semânticos de feedback pedagógico | `components/regime-chip.tsx` etc. | `.regime-chip` / `.interpretation-strip` |

### Correção do `apiClient` (quick win de alto impacto)

Hoje `lib/api.ts` usa `response.text()` e exibe o JSON cru `{"detail":"..."}`. Deve fazer `response.json()` em falhas e extrair `errorData.detail` (padrão FastAPI), lançando um `Error` com mensagem legível. Corrige a exibição de erro em todos os módulos de uma vez.

---

## 6. Framework do Modo Exploratório

Camada transversal aplicada a **5 módulos**: Escoamento, Dimensionamento, Bombas, Reatores e Balanço. Aparece abaixo do resultado da calculadora. Client-side puro, sem backend novo.

### 6.1 Componentes (4 partes)

1. **`TemplateSelector`** — dropdown com 2–3 cenários pré-configurados por módulo. Ao selecionar: preenche o form, calibra os sliders (min/max/passo/default do template) e ativa o roteiro.
2. **`ParamSlider`** — 2–3 sliders por módulo. Ao mover → atualiza o campo do form → resubmete com **debounce de 300 ms** → visualização atualiza ao vivo. Exibe rótulo, valor atual com unidade e min/max.
3. **`ScenarioComparison`** — botão "Salvar Cenário" (máx. **3**), lista com nome editável (resumo automático via `scenarioSummaryFn`), gráfico sobrepõe os cenários salvos com cores distintas (`#2563EB` azul, `#D97706` laranja, `#16A34A` verde) e legenda; botão "Limpar Comparações".
4. **`GuidedSteps`** — 4 cards numerados colapsáveis + 1 pergunta de atividade, específicos por template (strings estáticas).

### 6.2 Contrato `recalculate(params)` por página

Cada página exploratória expõe uma forma de recálculo programático que o painel aciona. Em React: a página é dona do estado do form; o painel exploratório recebe callbacks para (a) aplicar valores aos campos, (b) disparar o cálculo, (c) obter o resultado atual para salvar cenário. O slider aplica o valor ao estado (com debounce) e dispara o mesmo submit da calculadora.

### 6.3 Local proposto

- `features/exploratory/` — componentes compartilhados (`template-selector.tsx`, `param-slider.tsx`, `scenario-comparison.tsx`, `guided-steps.tsx`), hook `use-exploratory.ts`, e a configuração tipada `templates.ts` (portada verbatim de `8967e14`).
- `ExploratoryPanel` recebe a config do módulo + os callbacks de recálculo.

### 6.4 Configuração (verbatim de `8967e14`)

Portada sem alterações (confirmado pelo usuário). Resumo:

| Módulo | Templates | Sliders (min–max, passo) |
|---|---|---|
| Dimensionamento | Linha de processo (Q=0,01; v=1,5); Linha de sucção (Q=0,005; v=0,8) | Vazão (0,001–0,05); Velocidade (0,5–3) |
| Escoamento | Água/PVC DN100; Óleo/Aço DN80; Ar/Duto 200 | Velocidade; Diâmetro (faixas por template) |
| Bombas | Padrão (água); Alta resistência (óleo) | Comprimento (20–300 m); Vazão (0,005–0,03); Cota de sucção (0–10 m) |
| Reatores | 1ª ordem; 2ª ordem | Conversão X (0,1–0,95); Constante k (0,05–2) — X *linkado* a CSTR+PFR+plot |
| Balanço | Separação simples; Com reciclo | Razão de reciclo (0–0,9); Fração do componente principal (0,1–0,9) |

Cada template mantém seus 4 passos de roteiro, sua pergunta de atividade e seu `scenarioSummaryFn`, portados verbatim.

---

## 7. Implementação de Referência: Sizing (completo)

Arquivo principal: `frontend/src/features/sizing/sizing-page.tsx`. O que já existe (loading, erro inline, dois formulários chamando `/sizing/calculated-diameter`, `/sizing/real-diameter`, `/piping/schedules`) é mantido; adiciona-se:

### 7.1 Base

1. **2 acordeões "Como funciona"** (conteúdo verbatim de `c17f3cc:index.html`):
   - "Cálculo de Diâmetro": fórmula `D = √(4Q/πV)` (KaTeX), tabela de variáveis (D/Q/V), dicas de velocidade (erosão/deposição), ref. White 2018.
   - "Diâmetro Nominal Comercial": explicação de DN/Schedule/diâmetro interno real, tabela de conceitos, fluxo de uso, ref. ASME B36.10M · White 2018.
2. **`VelocityProfile`** (`components/viz/velocity-profile.tsx`) — SVG portado de `_renderVelocityProfile` (sizing.js): perfil laminar `1−y²`, turbulento `(1−|y|)^{1/7}`, transição por *blend*; `Re = 1000·V·D/0,001` (água a 20 °C); cor + chip por regime (laminar `#3B82F6`, transição `#F59E0B`, turbulento `#EF4444`); nota com D e V. **É uma das 7 visualizações da tese.**
3. **"Carregar exemplo"** (`flow-rate: 0.01`, `velocity: 1.5`) + **"Limpar campos"**.
4. **Validação inline**: `flow-rate` e `velocity` → regra `positive`; validação pré-API ("Informe a vazão e a velocidade").
5. **Toast** de erro/sucesso; **`PropertyTable`** no resultado; usar **`result.units`** em vez de `"mm"` hardcoded.
6. **Combobox** com busca para o schedule.

### 7.2 Exploratório (Sizing)

- 2 templates ("Linha de processo", "Linha de sucção").
- 2 sliders (Vazão, Velocidade recomendada) com as faixas da §6.4.
- Ao mover slider → recalcula o diâmetro → **atualiza o `VelocityProfile` ao vivo**.
- Comparação de cenários (o resumo sobrepõe perfis/valores salvos) + roteiro guiado (4 passos + atividade, verbatim).

Ao final, o Sizing cumpre 100% da checklist da §4 e deixa prontos todos os primitivos das §5 e §6.

---

## 8. Ordem dos Módulos e Specs Subsequentes

Todos com a mesma importância; a ordem é só de execução. Sizing primeiro (molde). Depois, cada módulo ganha um **spec curto próprio** que reusa a fundação e a checklist:

1. Sizing (este spec) — molde + fundação + exploratório
2. Flow — Diagrama de Moody (recharts) + régua/chip de regime (SVG) + exploratório (3 templates)
3. Pump — gauge de NPSH, curva h_f×Q, decomposição de head; fator de atrito por material, NPSHr, múltiplos fittings + exploratório
4. Reactor — Diagrama de Levenspiel + exploratório
5. Balance — gráfico de correntes + reciclo/purga + exploratório
6. Components — Combobox com busca, multi-propriedade, N fluidos; reexpor `/components/props-by-state`
7. Piping — feedback de erro por seleção, loading, formatação científica
8. Glossário — 54 termos em 7 categorias, KaTeX, busca com debounce, filtro por categoria
9. Exercícios — motor multi-etapa, 7 exercícios, propagação de estado, feedback pedagógico, trilha de progresso

---

## 9. Arquitetura e Estrutura de Arquivos (proposta)

```
frontend/src/
  components/
    ui/            accordion.tsx, combobox.tsx, slider.tsx (+ existentes)
    how-it-works.tsx, property-table.tsx, number-field.tsx,
    load-example-button.tsx, regime-chip.tsx, interpretation-strip.tsx
    viz/           velocity-profile.tsx (e futuras: moody.tsx, levenspiel.tsx, npsh-gauge.tsx ...)
  features/
    exploratory/   template-selector.tsx, param-slider.tsx,
                   scenario-comparison.tsx, guided-steps.tsx,
                   use-exploratory.ts, templates.ts, exploratory-panel.tsx
    sizing/        sizing-page.tsx, presets.ts, content.ts (acordeões)
    glossary/      glossary-page.tsx, terms.ts
    exercises/     exercises-page.tsx, exercises.ts, exercise-runner.tsx
    ...
  lib/             api.ts (corrigido), notify.ts, validation.ts, katex.ts, chart.ts
```

**Estado:** cada página é dona do seu estado de formulário e resultado. O `ExploratoryPanel` é controlado pela página (recebe valores atuais e callbacks). Cenários salvos ficam em estado local do painel.

---

## 10. Tratamento de Erros e Feedback

- `apiClient` extrai `detail` do FastAPI e lança `Error` legível (§5).
- Todo handler assíncrono tem `try/catch` → `notify.error(mensagem)`.
- Sucesso relevante (ex.: "Exemplo carregado") → `notify.success`.
- Loading por operação + botões desabilitados (padrão já presente no Sizing).
- `ErrorBoundary` no router + handler global de `unhandledrejection` (na fundação, aplicado no shell).

---

## 11. Visualizações (as 7 da tese)

| # | Visualização | Módulo | Técnica |
|---|---|---|---|
| 1 | Perfil de velocidade | Dimensionamento | SVG |
| 2 | Régua de regime (log) | Escoamento | SVG |
| 3 | Diagrama de Moody (ponto operacional) | Escoamento | recharts |
| 4 | Curva perda de carga × vazão | Bombas | recharts |
| 5 | Margem de NPSH | Bombas | SVG (barra/gauge) |
| 6 | Decomposição da altura manométrica | Bombas | recharts |
| 7 | Diagrama de Levenspiel (CSTR × PFR) | Reatores | recharts |

O overlay de cenários (exploratório) usa multi-série do recharts nos gráficos de linha; no Sizing, sobrepõe perfis no próprio SVG.

---

## 12. Testes

- Vitest por módulo (os arquivos `frontend/src/test/*-page.test.tsx` já existem e são o ponto de partida).
- Cobrir por módulo: renderização do acordeão, carregar exemplo, validação inline (blur), caminho de erro (toast a partir de `detail`), sucesso, e — nos 5 módulos exploratórios — seleção de template, movimento de slider (debounce) e salvar/limpar cenário.
- Testes dos primitivos da fundação (`apiClient` extraindo `detail`; `useFieldValidation`).

---

## 13. Alinhamento com a Tese

- Ao restaurar glossário/acordeões/visualizações/exercícios, as afirmações do capítulo 4.5 voltam a corresponder ao artefato, e as figuras (`glossario.png`, `moody.png`, `levenspiel.png`, `exercicio_integrado.png`) tornam-se capturáveis.
- O modo exploratório reabre a subseção **4.5.6 "Tutorial de Uso em Sala de Aula"** prevista no spec `2026-07-02`. Fica registrado como frente de escrita associada; tratada junto quando o exploratório estiver estável.
- Conferir a contagem de termos do glossário: a tese diz "49"; o legado tem 54. Ajustar tese ou seleção de termos para bater.

---

## 14. Verificação / Critérios de Aceite

1. Sizing cumpre 100% da checklist da §4 (base + exploratório), com testes vitest passando.
2. Os primitivos das §5 e §6 existem, tipados e reutilizáveis, e são efetivamente consumidos pelo Sizing.
3. `apiClient` exibe mensagens legíveis (nunca JSON cru) — verificável forçando um erro de backend.
4. Nenhuma dependência jQuery/Chart.js/SweetAlert2/Select2 é reintroduzida; usa-se recharts/sonner/shadcn/react-katex.
5. Backend e contratos de API inalterados.
6. Cada módulo subsequente entra com seu spec curto e é aceito pela mesma checklist da §4.
