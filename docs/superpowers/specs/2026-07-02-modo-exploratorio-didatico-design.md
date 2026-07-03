# Design: Modo Exploratório Didático — DCOU

**Data:** 2026-07-02  
**Escopo:** Frontend (modo exploratório com templates, sliders e comparação de cenários) + Texto TCC (subseção 4.5.6 com tutoriais passo a passo)

---

## 1. Contexto e Motivação

A seção 4.5 do TCC documenta os recursos didáticos do DCOU. Ela cobre glossário, explicações teóricas embutidas, visualizações interativas, exercícios integrados e trilhas de aprendizagem — mas não oferece um tutorial orientado ao docente que mostre, com valores concretos e passo a passo, como usar a ferramenta numa atividade de sala de aula na disciplina de Operações Unitárias.

A professora da disciplina precisa de um roteiro que possa ser repassado aos alunos: acesse o módulo X, selecione o template Y, varie os parâmetros A e B, observe o gráfico Z, registre o que mudou. Para isso, o frontend também precisa ter a capacidade de tornar a variação de parâmetros interativa e visualmente comparável.

---

## 2. Escopo da Solução

### 2.1 Frontend — Modo Exploratório

Um painel "Modo Exploratório" é adicionado a cinco módulos: **Escoamento, Dimensionamento, Bombas, Reatores e Balanço de Massa**. O painel aparece logo abaixo do resultado de cada calculadora e contém três componentes:

#### 2.1.1 Seletor de Template Didático

Dropdown com 2–3 cenários pré-configurados por módulo. Ao selecionar um template:
- Todos os campos do formulário são preenchidos com os valores do template.
- Os sliders de exploração são configurados com min/max calibrados para aquele cenário.
- O painel "Roteiro de Exploração" é ativado com os cards específicos daquele template.

**Templates por módulo:**

| Módulo | Template 1 | Template 2 | Template 3 |
|---|---|---|---|
| Escoamento | Água a 20°C — PVC DN100, v=1,5 m/s | Óleo viscoso — Aço carbono DN80, v=0,5 m/s | Ar — Duto quadrado 200mm, v=3 m/s |
| Dimensionamento | Linha de processo — água, v_rec=1,5 m/s, Q=0,01 m³/s | Linha de sucção — água, v_rec=0,8 m/s, Q=0,005 m³/s | — |
| Bombas | Bombeamento padrão — água, L=100m, DN100, Δz=5m | Alta resistência — óleo, L=200m, DN80, Δz=10m | — |
| Reatores | Reação 1ª ordem — A→B, k=0,5 min⁻¹, F_A0=1 mol/min, X=0,8 | Reação 2ª ordem — A→B, k=0,1 L/mol·min, C_A0=1 mol/L | — |
| Balanço de Massa | Separação simples — F=100 mol/h, split=0,6 | Sistema com reciclo — razão de reciclo 50% | — |

#### 2.1.2 Sliders de Exploração

2–3 sliders por módulo para os parâmetros mais pedagogicamente relevantes. Cada slider exibe rótulo, valor atual com unidade, e min/max. Ao mover o slider:
- O campo correspondente no formulário é atualizado.
- O formulário é resubmetido automaticamente com debounce de 300 ms.
- O gráfico do módulo é atualizado em tempo real.

**Sliders por módulo:**

| Módulo | Slider 1 | Slider 2 | Slider 3 |
|---|---|---|---|
| Escoamento | Velocidade — 0,1 a 5 m/s | Diâmetro — 50 a 300 mm | — |
| Dimensionamento | Vazão — 1 a 100 L/s | Velocidade recomendada — 0,5 a 3 m/s | — |
| Bombas | Comprimento da tubulação — 20 a 300 m | Vazão — 5 a 50 L/s | Desnível — 0 a 10 m |
| Reatores | Conversão desejada X — 10 a 99% | Constante cinética k — 0,05 a 2 (unidade varia com ordem) | — |
| Balanço de Massa | Razão de reciclo — 0 a 90% | Fração mássica de alimentação — 0,1 a 0,9 | — |

#### 2.1.3 Comparação de Cenários

Após cada cálculo bem-sucedido, um botão **"Salvar Cenário"** aparece. Ao clicar:
- O resultado atual (entradas + saídas + nome automático) é salvo em memória.
- O cenário aparece numa lista lateral com nome editável (ex.: "DN100 — 1,5 m/s").
- O gráfico do módulo exibe todos os cenários salvos sobrepostos, com cores distintas (azul, laranja, verde) e legenda.
- Máximo de 3 cenários simultâneos.
- Botão **"Limpar Comparações"** reseta a lista e o gráfico.

#### 2.1.4 Roteiro de Exploração (Passo a Passo Guiado)

Quando um template está ativo, um painel **"Roteiro de Exploração"** aparece no topo do módulo com 4 cards numerados colapsáveis. Os cards são específicos por template. Exemplo para "Água a 20°C — PVC DN100":

1. "Observe o Reynolds calculado (~150.000). O escoamento é turbulento — o ponto no Diagrama de Moody está na zona turbulenta rugosa?"
2. "Mova o slider de velocidade para 0,3 m/s. O Reynolds cai para ~30.000. O ponto cruza a linha Re=2300 e entra na zona laminar?"
3. "Salve este cenário ('Baixa velocidade'). Agora selecione o template 'Óleo Viscoso'."
4. "Compare os dois pontos no Diagrama de Moody. O que explica a diferença no fator de atrito entre os dois fluidos à mesma velocidade?"

---

### 2.2 Arquivos do Frontend Modificados

| Arquivo | Alteração |
|---|---|
| `frontend/js/modules/didatic.js` | Adicionar: objeto `pedagogicTemplates` com configs por módulo; funções `setupExploratoryPanel()`, `setupSliders()`, `setupScenarioComparison()`, `setupGuidedSteps()` |
| `frontend/js/modules/flow.js` | Expor função `recalculate(params)` chamável externamente pelos sliders |
| `frontend/js/modules/pump.js` | Expor função `recalculate(params)` |
| `frontend/js/modules/reactor.js` | Expor função `recalculate(params)` |
| `frontend/js/modules/sizing.js` | Expor função `recalculate(params)` |
| `frontend/js/modules/balance.js` | Expor função `recalculate(params)` |
| `frontend/index.html` | Adicionar bloco HTML `.exploratory-panel` em cada módulo relevante |
| `frontend/css/styles.css` | Estilos para: sliders (`.param-slider`), painel de comparação (`.scenario-panel`), cards de roteiro (`.guided-step`) |

---

## 3. Texto TCC — Nova Subseção 4.5.6

### 3.1 Localização

Novo arquivo ou adição a `escrita/TEX/capitulos/4.5-recursos-didaticos.tex`, após a subseção "Trilhas de Aprendizagem".

### 3.2 Estrutura

**`\subsection{Tutorial de Uso em Sala de Aula}`**

Parágrafo de abertura: contextualiza o uso como atividade didática. O roteiro pode ser distribuído pela professora para os alunos reproduzirem individualmente ou em grupo. Cada bloco descreve um experimento completo num módulo específico.

**Cinco blocos — um por módulo:**

Cada bloco contém:
- **Contexto da aula** (1–2 frases introdutórias sobre o tópico da disciplina)
- **Passo a passo numerado** (4–6 passos): módulo a acessar, template a selecionar, valores iniciais, o que o gráfico mostra
- **Variação guiada**: qual slider mover, de qual valor para qual, e o que muda no gráfico — com valores numéricos concretos e interpretação física
- **Resultado esperado**: valores específicos (ex.: "Re cai de 149.800 para 29.960, o fator de atrito sobe de 0,016 para 2,13 × 10⁻³") e referência à figura correspondente
- **Proposta de atividade**: 1–2 perguntas para o aluno responder após a exploração (ex.: "A partir de qual vazão o sistema entra em risco de cavitação para a bomba selecionada?")

**Módulos cobertos e tópico central de cada bloco:**

| Módulo | Tópico | Parâmetro variado | Fenômeno observado |
|---|---|---|---|
| Escoamento | Regime de escoamento e fator de atrito | Velocidade | Transição laminar/turbulento no Diagrama de Moody |
| Dimensionamento | Seleção de diâmetro nominal | Vazão | Crescimento do diâmetro calculado e seleção de DN comercial |
| Bombas | Perda de carga e margem de NPSH | Comprimento / Vazão | Curva de perda de carga e risco de cavitação |
| Reatores | Volume CSTR vs PFR em função da conversão | Conversão X | Diagrama de Levenspiel — área CSTR > área PFR a altas conversões |
| Balanço de Massa | Efeito do reciclo sobre correntes do processo | Razão de reciclo | Acúmulo de inerte com aumento do reciclo |

### 3.3 Tom e Formato

Tom instrutivo e direto — como um roteiro de laboratório, não uma descrição de sistema. O texto deve ser legível por um aluno de graduação sem a necessidade de consultar outros materiais. Figuras reais da interface são referenciadas em cada bloco via `\ref{}`.

---

## 4. Fluxo de Dados (Frontend)

```
Usuário seleciona template
    └─► didatic.js: preencheFormulário(template.values)
    └─► didatic.js: configuraSliders(template.sliderConfig)
    └─► didatic.js: exibeRoteiro(template.steps)

Usuário move slider
    └─► didatic.js: debounce 300ms
    └─► didatic.js: atualizaCampo(sliderId, valor)
    └─► Módulo.recalculate(params) → API → resultado
    └─► Módulo: atualizaGráfico(resultado)
    └─► (se cenários salvos) Módulo: redesenhaGráficoComCenários()

Usuário clica "Salvar Cenário"
    └─► didatic.js: salvarCenário(entradas, saídas, nomeAutomático)
    └─► didatic.js: renderizarListaCenários()
    └─► Módulo: redesenhaGráficoComCenários()
```

---

## 5. Restrições e Decisões

- **Sem back-end novo:** toda a lógica de templates, sliders e cenários é client-side em `didatic.js`. Os módulos existentes continuam usando a mesma API.
- **Máximo de 3 cenários** para não poluir o gráfico nem exceder a legenda.
- **Debounce de 300 ms** nos sliders para evitar chamadas excessivas à API.
- **Sliders não substituem os campos:** eles apenas espelham e atualizam os campos existentes. O usuário ainda pode digitar valores manualmente.
- **Roteiros são estáticos por template:** os cards de passo a passo são strings fixas em `didatic.js`, não gerados dinamicamente. Isso simplifica a implementação e facilita manutenção.
- **Compatibilidade:** nenhuma nova dependência JS é adicionada. Sliders usam `<input type="range">` nativo com estilo CSS customizado.
