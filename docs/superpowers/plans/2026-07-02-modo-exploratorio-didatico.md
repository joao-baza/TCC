# Modo Exploratório Didático — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um Modo Exploratório ao DCOU — com templates didáticos, sliders de variação de parâmetros em tempo real, comparação de cenários e roteiro guiado passo a passo — e escrever a subseção 4.5.6 do TCC documentando seu uso em sala de aula.

**Architecture:** Toda a lógica do modo exploratório é client-side, centralizada em `didatic.js`. Os módulos existentes (flow, sizing, pump, reactor, balance) expõem recálculo via `dispatchEvent(new Event('submit'))` em seus formulários, sem refatoração das funções de cálculo. Reatores e Balanço, cujo DOM é gerado dinamicamente, recebem seus painéis via injeção após `init()`.

**Tech Stack:** JavaScript vanilla (ES6+), `<input type="range">` nativo, Chart.js (já presente), CSS custom, LaTeX.

---

## Mapa de Arquivos

| Arquivo | Tipo | Responsabilidade |
|---|---|---|
| `frontend/css/styles.css` | Modificar | Estilos do painel exploratório, sliders, cards de roteiro, painel de cenários |
| `frontend/index.html` | Modificar | Blocos HTML `.exploratory-panel` nos módulos sizing, flow, pump |
| `frontend/js/modules/didatic.js` | Modificar | Templates, sliders, recálculo, cenários, roteiro guiado, injeção em reactor/balance |
| `escrita/TEX/capitulos/4.5-recursos-didaticos.tex` | Modificar | Nova `\subsection{Tutorial de Uso em Sala de Aula}` com 5 blocos |

---

## Task 1: CSS — Estilos do Modo Exploratório

**Files:**
- Modify: `frontend/css/styles.css` (final do arquivo)

- [ ] **Step 1: Adicionar estilos ao final de `styles.css`**

```css
/* ===== Modo Exploratório Didático ===== */
.exploratory-panel {
  margin-top: 1.5rem;
  border: 2px solid #7C3AED;
  border-radius: 0.75rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
}

.exploratory-panel .exp-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.exploratory-panel .exp-title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.95rem;
  color: #5B21B6;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
}

.exploratory-panel .template-select {
  flex: 1;
  min-width: 220px;
  padding: 0.4rem 0.6rem;
  border: 1px solid #C4B5FD;
  border-radius: 0.4rem;
  background: white;
  font-size: 0.875rem;
  color: var(--color-text);
}

/* Sliders */
.sliders-section {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.param-slider-group {
  background: white;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #DDD6FE;
}

.param-slider-group label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 600;
  color: #4C1D95;
  margin-bottom: 0.4rem;
}

.param-slider-group .slider-value {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: #7C3AED;
}

.param-slider-group input[type="range"] {
  width: 100%;
  accent-color: #7C3AED;
  cursor: pointer;
}

.param-slider-group .slider-limits {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--color-text-2);
  margin-top: 0.2rem;
}

/* Roteiro guiado */
.guided-steps {
  margin-top: 1rem;
}

.guided-steps .steps-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #5B21B6;
  margin-bottom: 0.5rem;
}

.guided-step {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.6rem 0.75rem;
  background: white;
  border: 1px solid #DDD6FE;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.5;
}

.guided-step .step-num {
  min-width: 1.5rem;
  height: 1.5rem;
  background: #7C3AED;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.guided-step .step-activity {
  background: #FEF3C7;
  border-color: #FCD34D;
}

/* Cenários */
.scenario-panel {
  margin-top: 1rem;
  border-top: 1px solid #DDD6FE;
  padding-top: 0.75rem;
}

.scenario-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.scenario-panel-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #5B21B6;
}

.btn-save-scenario {
  padding: 0.35rem 0.8rem;
  background: #7C3AED;
  color: white;
  border: none;
  border-radius: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-save-scenario:hover { background: #5B21B6; }

.btn-clear-scenarios {
  padding: 0.2rem 0.6rem;
  background: transparent;
  color: #9CA3AF;
  border: 1px solid #D1D5DB;
  border-radius: 0.4rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-clear-scenarios:hover { color: var(--color-error); border-color: var(--color-error); }

.scenario-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.scenario-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: white;
  border: 1px solid #DDD6FE;
  border-radius: 0.4rem;
  font-size: 0.8rem;
}

.scenario-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.scenario-name {
  flex: 1;
  outline: none;
  border: none;
  background: transparent;
  font-size: 0.8rem;
  color: var(--color-text);
}

.scenario-summary {
  color: var(--color-text-2);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
```

- [ ] **Step 2: Verificar no browser que não há conflitos de CSS**

Abra `frontend/index.html` no browser, navegue até o módulo Escoamento e confirme que os estilos existentes não foram afetados (o arquivo ainda não tem elementos com essas classes).

- [ ] **Step 3: Commit**

```bash
cd "/home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC"
git add frontend/css/styles.css
git commit -m "style: adiciona estilos do modo exploratório didático"
```

---

## Task 2: HTML — Painéis Exploratórios nos Módulos Estáticos

Os módulos **Sizing**, **Flow** e **Pump** têm HTML estático em `index.html`. Os módulos **Reactor** e **Balance** têm DOM gerado dinamicamente em JS (tratados na Task 8).

**Files:**
- Modify: `frontend/index.html`

Cada painel é inserido **imediatamente antes do fechamento `</div>` do `tab-pane`** do módulo.

- [ ] **Step 1: Adicionar painel ao módulo Dimensionamento (após linha 295, antes de `</div>`)**

Localizar a linha `</div>` que fecha `<div id="sizing-content" ...>` (linha ~295 do HTML) e inserir antes dela:

```html
            <!-- Modo Exploratório — Dimensionamento -->
            <div class="exploratory-panel hidden" id="sizing-exploratory">
                <div class="exp-header">
                    <span class="exp-title">&#127891; Modo Exploratório</span>
                    <select class="template-select" id="sizing-template-select">
                        <option value="">— Selecione um template didático —</option>
                        <option value="process-line">Linha de processo — Água, v=1,5 m/s</option>
                        <option value="suction-line">Linha de sucção de bomba — Água, v=0,8 m/s</option>
                    </select>
                </div>
                <div class="sliders-section hidden" id="sizing-sliders"></div>
                <div class="guided-steps hidden" id="sizing-steps"></div>
                <div class="scenario-panel hidden" id="sizing-scenario-panel">
                    <div class="scenario-panel-header">
                        <span class="scenario-panel-title">Comparação de Cenários</span>
                        <div style="display:flex;gap:0.5rem;align-items:center;">
                            <button class="btn-save-scenario" id="sizing-save-scenario">&#128190; Salvar Cenário</button>
                            <button class="btn-clear-scenarios" id="sizing-clear-scenarios">Limpar</button>
                        </div>
                    </div>
                    <div class="scenario-list" id="sizing-scenario-list"></div>
                </div>
            </div>
```

- [ ] **Step 2: Adicionar painel ao módulo Escoamento (após linha 530, antes do `</div>` que fecha `flow-content`)**

Localizar a linha `</div>` que fecha `<div id="flow-content" ...>` (linha ~530) e inserir antes dela:

```html
            <!-- Modo Exploratório — Escoamento -->
            <div class="exploratory-panel hidden" id="flow-exploratory">
                <div class="exp-header">
                    <span class="exp-title">&#127891; Modo Exploratório</span>
                    <select class="template-select" id="flow-template-select">
                        <option value="">— Selecione um template didático —</option>
                        <option value="water-pvc-dn100">Água a 20°C — PVC DN100, v=1,5 m/s</option>
                        <option value="oil-steel-dn80">Óleo viscoso — Aço carbono DN80, v=0,5 m/s</option>
                        <option value="air-duct-200">Ar — Duto quadrado 200 mm, v=3 m/s</option>
                    </select>
                </div>
                <div class="sliders-section hidden" id="flow-sliders"></div>
                <div class="guided-steps hidden" id="flow-steps"></div>
                <div class="scenario-panel hidden" id="flow-scenario-panel">
                    <div class="scenario-panel-header">
                        <span class="scenario-panel-title">Comparação de Cenários</span>
                        <div style="display:flex;gap:0.5rem;align-items:center;">
                            <button class="btn-save-scenario" id="flow-save-scenario">&#128190; Salvar Cenário</button>
                            <button class="btn-clear-scenarios" id="flow-clear-scenarios">Limpar</button>
                        </div>
                    </div>
                    <div class="scenario-list" id="flow-scenario-list"></div>
                </div>
            </div>
```

- [ ] **Step 3: Adicionar painel ao módulo Bombas (após linha 844, antes do `</div>` que fecha `pump-content`)**

Localizar a linha `</div>` que fecha `<div id="pump-content" ...>` (linha ~844) e inserir antes dela:

```html
            <!-- Modo Exploratório — Bombas -->
            <div class="exploratory-panel hidden" id="pump-exploratory">
                <div class="exp-header">
                    <span class="exp-title">&#127891; Modo Exploratório</span>
                    <select class="template-select" id="pump-template-select">
                        <option value="">— Selecione um template didático —</option>
                        <option value="standard-pump">Bombeamento padrão — Água, L=100 m, DN100</option>
                        <option value="high-resistance">Alta resistência — Óleo, L=200 m, DN80</option>
                    </select>
                </div>
                <div class="sliders-section hidden" id="pump-sliders"></div>
                <div class="guided-steps hidden" id="pump-steps"></div>
                <div class="scenario-panel hidden" id="pump-scenario-panel">
                    <div class="scenario-panel-header">
                        <span class="scenario-panel-title">Comparação de Cenários</span>
                        <div style="display:flex;gap:0.5rem;align-items:center;">
                            <button class="btn-save-scenario" id="pump-save-scenario">&#128190; Salvar Cenário</button>
                            <button class="btn-clear-scenarios" id="pump-clear-scenarios">Limpar</button>
                        </div>
                    </div>
                    <div class="scenario-list" id="pump-scenario-list"></div>
                </div>
            </div>
```

- [ ] **Step 4: Verificar que os painéis estão `hidden` e não afetam o layout**

Abrir no browser, navegar pelos três módulos e confirmar que estão visualmente idênticos ao estado anterior.

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html
git commit -m "feat: adiciona blocos HTML do painel exploratório em sizing, flow e pump"
```

---

## Task 3: didatic.js — Dados dos Templates (`pedagogicTemplates`)

**Files:**
- Modify: `frontend/js/modules/didatic.js`

- [ ] **Step 1: Adicionar o objeto `pedagogicTemplates` no início do `DidaticModule`**

Adicionar logo após `const DidaticModule = {` e antes de `examples:`:

```javascript
    pedagogicTemplates: {
        sizing: {
            'process-line': {
                label: 'Linha de processo — Água, v=1,5 m/s',
                fields: { 'flow-rate': '0.01', 'velocity': '1.5' },
                sliders: [
                    { id: 'sizing-sl-flow', field: 'flow-rate', label: 'Vazão', unit: 'm³/s',
                      min: 0.001, max: 0.1, step: 0.001, default: 0.01 },
                    { id: 'sizing-sl-vel', field: 'velocity', label: 'Velocidade', unit: 'm/s',
                      min: 0.5, max: 3, step: 0.1, default: 1.5 },
                ],
                steps: [
                    'O diâmetro calculado com Q=0,01 m³/s e v=1,5 m/s é ~92 mm. O DN comercial selecionado será DN100 (SCH 40). Observe o perfil de velocidade na seção circular.',
                    'Mova o slider de Vazão para 0,05 m³/s. O diâmetro calculado sobe para ~206 mm (DN200). O perfil se expande proporcionalmente. Por que aumentar a vazão sem aumentar a velocidade exige um tubo maior?',
                    'Salve este cenário ("Alta vazão"). Redefina para Q=0,01 m³/s e mova Velocidade para 0,8 m/s. O diâmetro calculado sobe para ~126 mm (DN150). Salve como "Baixa velocidade".',
                    'Compare os dois cenários salvos: qual DN cada um exige? Qual seria o custo relativo de tubulação?',
                ],
                activity: [
                    'Qual é a vazão máxima que mantém o diâmetro calculado abaixo de 100 mm a v=1,5 m/s?',
                    'Para uma linha de sucção de bomba, a velocidade recomendada é 0,8–1,2 m/s. Qual seria o DN para Q=0,02 m³/s?',
                ],
                formSelector: '#calculated-diameter-form',
                scenarioSummaryFn: () => {
                    const q = document.getElementById('flow-rate')?.value;
                    const v = document.getElementById('velocity')?.value;
                    return `Q=${q} m³/s, v=${v} m/s`;
                },
                scenarioKey: 'sizing',
            },
            'suction-line': {
                label: 'Linha de sucção de bomba — Água, v=0,8 m/s',
                fields: { 'flow-rate': '0.005', 'velocity': '0.8' },
                sliders: [
                    { id: 'sizing-sl-flow', field: 'flow-rate', label: 'Vazão', unit: 'm³/s',
                      min: 0.001, max: 0.05, step: 0.001, default: 0.005 },
                    { id: 'sizing-sl-vel', field: 'velocity', label: 'Velocidade', unit: 'm/s',
                      min: 0.5, max: 2, step: 0.1, default: 0.8 },
                ],
                steps: [
                    'Linha de sucção: velocidade recomendada 0,8–1,2 m/s para minimizar perdas e risco de cavitação. Com Q=0,005 m³/s e v=0,8 m/s o diâmetro é ~89 mm (DN100).',
                    'Aumente a velocidade para 1,5 m/s. O diâmetro cai para ~65 mm (DN80). Isso reduz o custo da tubulação — mas qual é o efeito na perda de carga e no NPSH disponível?',
                    'Salve o cenário "v=0,8 m/s" e depois o "v=1,5 m/s". Compare os diâmetros nominais selecionados.',
                    'Reflexão: em linhas de sucção, diâmetros menores aumentam a perda de carga e podem reduzir o NPSH disponível a ponto de causar cavitação. Qual seria a velocidade limite segura?',
                ],
                activity: [
                    'Para uma bomba com NPSH_req=3 m e elevação geométrica de 2 m, como a escolha do DN afeta a margem de NPSH?',
                ],
                formSelector: '#calculated-diameter-form',
                scenarioSummaryFn: () => {
                    const q = document.getElementById('flow-rate')?.value;
                    const v = document.getElementById('velocity')?.value;
                    return `Q=${q} m³/s, v=${v} m/s`;
                },
                scenarioKey: 'sizing',
            },
        },

        flow: {
            'water-pvc-dn100': {
                label: 'Água a 20°C — PVC DN100, v=1,5 m/s',
                fields: {
                    'characteristic-diameter': '100',
                    'reynolds-velocity': '1.5',
                    'density': '998',
                    'dynamic-viscosity': '0.001',
                },
                sliders: [
                    { id: 'flow-sl-vel', field: 'reynolds-velocity', label: 'Velocidade', unit: 'm/s',
                      min: 0.1, max: 5, step: 0.1, default: 1.5 },
                    { id: 'flow-sl-diam', field: 'characteristic-diameter', label: 'Diâmetro', unit: 'mm',
                      min: 50, max: 300, step: 10, default: 100 },
                ],
                steps: [
                    'Com v=1,5 m/s e D=100 mm: Re ≈ 149.800 — regime TURBULENTO. O ponto no Diagrama de Moody está na zona turbulenta rugosa. A Régua de Regime mostra o ponto bem à direita.',
                    'Reduza a velocidade para 0,02 m/s usando o slider. Re ≈ 2.000 — regime LAMINAR. O ponto cruza a linha Re=2.300 e entra na zona laminar. O fator de atrito segue f=64/Re (linha reta no Diagrama de Moody).',
                    'Salve o cenário "Laminar (0,02 m/s)". Restaure v=1,5 m/s. Agora reduza o diâmetro para 50 mm — Re sobe para ~74.900. Por quê? O fator de atrito muda mesmo com mesma velocidade?',
                    'Salve "Turbulento D=50mm" e compare com o cenário laminar no gráfico. Qual é a diferença no fator de atrito? Como isso afetaria a perda de carga?',
                ],
                activity: [
                    'Qual é a velocidade limite (m/s) para que o escoamento de água em PVC DN100 seja laminar?',
                    'Compare dois pontos no Diagrama de Moody: Água (μ=0,001 Pa·s) vs Óleo (μ=0,05 Pa·s) à v=1 m/s, D=100 mm. Qual tem maior Re? Qual tem maior f?',
                ],
                formSelector: '#reynolds-form',
                postSubmitFormSelector: '#friction-factor-form',
                scenarioSummaryFn: () => {
                    const v = document.getElementById('reynolds-velocity')?.value;
                    const d = document.getElementById('characteristic-diameter')?.value;
                    return `v=${v} m/s, D=${d} mm`;
                },
                scenarioKey: 'flow',
            },
            'oil-steel-dn80': {
                label: 'Óleo viscoso — Aço carbono DN80, v=0,5 m/s',
                fields: {
                    'characteristic-diameter': '80',
                    'reynolds-velocity': '0.5',
                    'density': '870',
                    'dynamic-viscosity': '0.05',
                },
                sliders: [
                    { id: 'flow-sl-vel', field: 'reynolds-velocity', label: 'Velocidade', unit: 'm/s',
                      min: 0.1, max: 3, step: 0.1, default: 0.5 },
                    { id: 'flow-sl-diam', field: 'characteristic-diameter', label: 'Diâmetro', unit: 'mm',
                      min: 50, max: 200, step: 10, default: 80 },
                ],
                steps: [
                    'Óleo com μ=0,05 Pa·s e D=80 mm, v=0,5 m/s: Re ≈ 696 — regime LAMINAR. Compare com a água: para obter o mesmo Re, a água precisaria de v≈0,003 m/s. A viscosidade domina o regime.',
                    'Aumente a velocidade para 1,5 m/s. Re ≈ 2.088 — ainda laminar, mas próximo da transição (Re=2.300). Qual seria a velocidade mínima para turbulência neste óleo?',
                    'Salve o cenário "Óleo laminar". Agora aumente a velocidade até Re>4.000 (~2,9 m/s). O ponto entra na zona turbulenta. O fator de atrito cai abruptamente?',
                    'Compare o Diagrama de Moody para Água (template anterior) vs Óleo neste template. Por que o mesmo Re produz fator de atrito diferente dependendo da rugosidade relativa?',
                ],
                activity: [
                    'Qual é a velocidade mínima para escoamento turbulento de óleo (μ=0,05 Pa·s, ρ=870 kg/m³) em DN80?',
                ],
                formSelector: '#reynolds-form',
                postSubmitFormSelector: '#friction-factor-form',
                scenarioSummaryFn: () => {
                    const v = document.getElementById('reynolds-velocity')?.value;
                    const d = document.getElementById('characteristic-diameter')?.value;
                    return `v=${v} m/s, D=${d} mm`;
                },
                scenarioKey: 'flow',
            },
            'air-duct-200': {
                label: 'Ar — Duto quadrado 200 mm, v=3 m/s',
                fields: {
                    'characteristic-diameter': '200',
                    'reynolds-velocity': '3',
                    'density': '1.2',
                    'dynamic-viscosity': '0.0000181',
                },
                sliders: [
                    { id: 'flow-sl-vel', field: 'reynolds-velocity', label: 'Velocidade', unit: 'm/s',
                      min: 0.5, max: 10, step: 0.5, default: 3 },
                    { id: 'flow-sl-diam', field: 'characteristic-diameter', label: 'D. hidráulico', unit: 'mm',
                      min: 100, max: 500, step: 25, default: 200 },
                ],
                steps: [
                    'Ar com ρ=1,2 kg/m³, μ=1,81×10⁻⁵ Pa·s, D_h=200 mm, v=3 m/s: Re ≈ 39.779 — turbulento. Compare com a água: o ar é ~55 vezes menos viscoso, mas também ~830 vezes menos denso.',
                    'Reduza a velocidade para 0,2 m/s. Re ≈ 2.653 — zona de transição. Aumento de ruído esperado. Como isso afetaria um sistema de ventilação?',
                    'Aumente a velocidade para 8 m/s. Re ≈ 106.078 — profundamente turbulento. O fator de atrito muda pouco (rugosidade relativa domina). Por quê?',
                    'Compare os três fluidos (água, óleo, ar) no Diagrama de Moody à mesma velocidade de 1,5 m/s e D=100 mm. Qual tem maior Re? Qual tem maior f?',
                ],
                activity: [
                    'Em ventilação industrial, velocidades acima de 10 m/s causam ruído excessivo. Qual seria o diâmetro hidráulico mínimo para Q=0,5 m³/s com v≤8 m/s?',
                ],
                formSelector: '#reynolds-form',
                postSubmitFormSelector: '#friction-factor-form',
                scenarioSummaryFn: () => {
                    const v = document.getElementById('reynolds-velocity')?.value;
                    const d = document.getElementById('characteristic-diameter')?.value;
                    return `v=${v} m/s, D_h=${d} mm`;
                },
                scenarioKey: 'flow',
            },
        },

        pump: {
            'standard-pump': {
                label: 'Bombeamento padrão — Água, L=100 m, DN100',
                fields: {
                    'pipe-length': '100',
                    'headloss-diameter': '100',
                    'headloss-flow-rate': '0.01',
                    'headloss-friction-factor': '0.02',
                    'headloss-velocity': '1.27',
                    'atmospheric-pressure': '1.033',
                    'vapor-pressure': '0.023',
                    'specific-mass': '998',
                    'npsh-friction-factor': '2',
                    'pump-inlet-velocity': '1.27',
                    'gauge-elevation': '3',
                    'pressure1': '0',
                    'pressure2': '200000',
                    'elevation1': '0',
                    'elevation2': '5',
                    'velocity1': '1.27',
                    'velocity2': '1.27',
                    'head-specific-mass': '998',
                    'head-friction-factor': '3',
                },
                sliders: [
                    { id: 'pump-sl-len', field: 'pipe-length', label: 'Comprimento', unit: 'm',
                      min: 20, max: 300, step: 10, default: 100 },
                    { id: 'pump-sl-flow', field: 'headloss-flow-rate', label: 'Vazão', unit: 'm³/s',
                      min: 0.005, max: 0.05, step: 0.005, default: 0.01 },
                    { id: 'pump-sl-elev', field: 'gauge-elevation', label: 'Cota geométrica (sucção)', unit: 'm',
                      min: 0, max: 10, step: 0.5, default: 3 },
                ],
                steps: [
                    'Com L=100 m, Q=0,01 m³/s (v≈1,27 m/s), f=0,02: h_f ≈ 1,64 m (Darcy-Weisbach). A curva Perda de Carga × Vazão mostra que h_f cresce com o quadrado da vazão. Identifique o ponto de operação.',
                    'Aumente o comprimento para 200 m usando o slider. A perda de carga dobra para ~3,28 m. A curva se desloca para cima — a bomba precisa fornecer mais head. Isso afeta a seleção da bomba.',
                    'Agora aumente a cota geométrica de sucção (elevation) para 8 m com o slider. Observe a Margem de NPSH diminuir. A partir de qual cota a margem fica abaixo de 1 m?',
                    'Salve o cenário "L=200 m" e compare com "L=100 m". A diferença no head total é visível na Decomposição da Altura Manométrica? Qual parcela domina?',
                ],
                activity: [
                    'Para L=150 m, qual é a vazão máxima (m³/s) antes que a perda de carga exceda 5 m?',
                    'Com cota de sucção de 6 m, a margem de NPSH é positiva? Qual é a margem disponível?',
                ],
                formSelector: '#headloss-form',
                scenarioSummaryFn: () => {
                    const l = document.getElementById('pipe-length')?.value;
                    const q = document.getElementById('headloss-flow-rate')?.value;
                    return `L=${l} m, Q=${q} m³/s`;
                },
                scenarioKey: 'pump',
            },
            'high-resistance': {
                label: 'Alta resistência — Óleo, L=200 m, DN80',
                fields: {
                    'pipe-length': '200',
                    'headloss-diameter': '80',
                    'headloss-flow-rate': '0.008',
                    'headloss-friction-factor': '0.035',
                    'headloss-velocity': '1.59',
                    'atmospheric-pressure': '1.033',
                    'vapor-pressure': '0.001',
                    'specific-mass': '870',
                    'npsh-friction-factor': '5',
                    'pump-inlet-velocity': '1.59',
                    'gauge-elevation': '2',
                    'pressure1': '0',
                    'pressure2': '300000',
                    'elevation1': '0',
                    'elevation2': '8',
                    'velocity1': '1.59',
                    'velocity2': '1.59',
                    'head-specific-mass': '870',
                    'head-friction-factor': '5',
                },
                sliders: [
                    { id: 'pump-sl-len', field: 'pipe-length', label: 'Comprimento', unit: 'm',
                      min: 50, max: 400, step: 25, default: 200 },
                    { id: 'pump-sl-flow', field: 'headloss-flow-rate', label: 'Vazão', unit: 'm³/s',
                      min: 0.002, max: 0.02, step: 0.001, default: 0.008 },
                    { id: 'pump-sl-elev', field: 'gauge-elevation', label: 'Cota geométrica (sucção)', unit: 'm',
                      min: 0, max: 8, step: 0.5, default: 2 },
                ],
                steps: [
                    'Óleo (ρ=870 kg/m³) em DN80, L=200 m, f=0,035: h_f ≈ 18 m — muito maior que o template de água. O fator de atrito mais alto reflete a maior viscosidade do óleo.',
                    'Reduza a vazão para 0,003 m³/s. h_f cai para ~2,5 m. Para fluidos viscosos, operar em vazões menores pode ser economicamente mais eficiente. Qual é a penalidade em produtividade?',
                    'A pressão de vapor do óleo é muito menor que a da água — a margem de NPSH é mais favorável. Compare este cenário com o de água: para a mesma cota de sucção, qual sistema está mais próximo da cavitação?',
                    'Salve "Óleo L=200 m" e compare com o template de Água. O head total de óleo é maior ou menor para a mesma potência de bomba? Por quê (dica: ρ × g × H)?',
                ],
                activity: [
                    'Dada a maior perda de carga do óleo, qual seria o diâmetro ideal para limitar h_f a 10 m com L=200 m, Q=0,008 m³/s?',
                ],
                formSelector: '#headloss-form',
                scenarioSummaryFn: () => {
                    const l = document.getElementById('pipe-length')?.value;
                    const q = document.getElementById('headloss-flow-rate')?.value;
                    return `L=${l} m, Q=${q} m³/s`;
                },
                scenarioKey: 'pump',
            },
        },

        reactor: {
            'first-order': {
                label: 'Reação 1ª ordem — A→B, k=0,5 min⁻¹, X=0,8',
                fields: {
                    'cstr-conversion': '0.8',
                    'cstr-rate-constant': '0.5',
                    'pfr-conversion': '0.8',
                    'pfr-rate-constant': '0.5',
                },
                sliders: [
                    { id: 'reactor-sl-conv', field: 'cstr-conversion', label: 'Conversão X', unit: '',
                      min: 0.1, max: 0.99, step: 0.01, default: 0.8,
                      linkedField: 'pfr-conversion' },
                    { id: 'reactor-sl-k', field: 'cstr-rate-constant', label: 'Constante k', unit: 'min⁻¹',
                      min: 0.05, max: 2, step: 0.05, default: 0.5,
                      linkedField: 'pfr-rate-constant' },
                ],
                steps: [
                    'X=0,8, k=0,5 min⁻¹: V_CSTR > V_PFR. No Diagrama de Levenspiel, a área do retângulo (CSTR) é sempre maior que a área sob a curva (PFR). Esta é a regra geral: PFR é mais eficiente que CSTR para reações cinéticas simples.',
                    'Aumente a conversão para X=0,95 usando o slider. As áreas crescem — ambos os reatores precisam de mais volume. Mas o CSTR cresce MUITO mais que o PFR. Por quê? A cinética de 1ª ordem faz a taxa de reação cair drasticamente ao final.',
                    'Salve o cenário "X=0,95". Reduza para X=0,5. A diferença relativa CSTR/PFR é menor. Existe uma conversão abaixo da qual o volume adicional do CSTR é desprezível?',
                    'Agora aumente k para 1,5 min⁻¹. Os volumes diminuem para a mesma conversão. A razão V_CSTR/V_PFR muda? (Dica: para reações de 1ª ordem, a razão depende apenas de X, não de k.)',
                ],
                activity: [
                    'Para X=0,90 e k=0,5 min⁻¹, qual é a razão V_CSTR/V_PFR? E para X=0,99?',
                    'Se o custo de instalação de um CSTR é 20% menor que um PFR de mesmo volume, existe uma conversão onde o CSTR seria economicamente preferível?',
                ],
                formSelector: '#cstr-form',
                postSubmitFormSelector: '#pfr-form',
                scenarioSummaryFn: () => {
                    const x = document.getElementById('cstr-conversion')?.value;
                    const k = document.getElementById('cstr-rate-constant')?.value;
                    return `X=${x}, k=${k} min⁻¹`;
                },
                scenarioKey: 'reactor',
            },
        },

        balance: {
            'simple-separation': {
                label: 'Separação simples — Alimentação 100 mol/h',
                steps: [
                    'Carregue o exemplo de balanço de massa. O sistema tem uma alimentação e duas saídas (produto e rejeito). Clique em Calcular Balanço.',
                    'Observe o gráfico de correntes: a alimentação está corretamente dividida entre produto e rejeito. A soma das saídas equivale à entrada (conservação de massa).',
                    'Modifique a fração de split no formulário para 0,8 (80% para o produto). Recalcule. Como as correntes mudam no gráfico? A soma ainda fecha?',
                    'Discussão: em um processo real, o split é determinado pela eficiência do separador. Como o DCOU ajuda a verificar o fechamento do balanço sem calcular manualmente?',
                ],
                activity: [
                    'Se a alimentação contém dois componentes (A: 60 mol/h, B: 40 mol/h) e o split é 0,7 para A e 0,9 para B, quais são as correntes de saída?',
                ],
                formSelector: null, // balance usa botão próprio
                scenarioKey: 'balance',
                useLoadExample: true,
            },
        },
    },
```

- [ ] **Step 2: Commit do objeto de dados**

```bash
git add frontend/js/modules/didatic.js
git commit -m "feat: adiciona pedagogicTemplates com configs de todos os módulos didáticos"
```

---

## Task 4: didatic.js — Inicialização e Seletor de Template

**Files:**
- Modify: `frontend/js/modules/didatic.js`

- [ ] **Step 1: Adicionar `initExploratoryPanels()` ao objeto `DidaticModule`**

Adicionar logo após o objeto `pedagogicTemplates` (mas ainda dentro de `DidaticModule`):

```javascript
    // -----------------------------------------------------------------------
    // Modo Exploratório — inicialização
    // -----------------------------------------------------------------------
    initExploratoryPanels() {
        const moduleKeys = ['sizing', 'flow', 'pump'];
        moduleKeys.forEach(key => {
            const panel = document.getElementById(`${key}-exploratory`);
            const select = document.getElementById(`${key}-template-select`);
            if (!panel || !select) return;

            panel.classList.remove('hidden');

            select.addEventListener('change', () => {
                const templateKey = select.value;
                if (!templateKey) {
                    document.getElementById(`${key}-sliders`).classList.add('hidden');
                    document.getElementById(`${key}-steps`).classList.add('hidden');
                    document.getElementById(`${key}-scenario-panel`).classList.add('hidden');
                    return;
                }
                this._applyTemplate(key, templateKey);
            });
        });
    },

    _applyTemplate(moduleKey, templateKey) {
        const tpl = this.pedagogicTemplates[moduleKey]?.[templateKey];
        if (!tpl) return;

        // Preencher campos
        if (tpl.fields) {
            Object.entries(tpl.fields).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }

        // Configurar sliders
        if (tpl.sliders) {
            this._buildSliders(moduleKey, tpl);
        }

        // Renderizar roteiro
        this._renderGuidedSteps(moduleKey, tpl);

        // Mostrar painel de cenários
        const scenarioPanel = document.getElementById(`${moduleKey}-scenario-panel`);
        if (scenarioPanel) scenarioPanel.classList.remove('hidden');

        // Disparar cálculo inicial
        if (tpl.formSelector) {
            const form = document.querySelector(tpl.formSelector);
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    },
```

- [ ] **Step 2: Chamar `initExploratoryPanels()` no método `init()` existente**

Localizar o método `init()` em `didatic.js` e adicionar `this.initExploratoryPanels();` ao final:

```javascript
    init() {
        this.setupAccordions();
        this.setupExampleButtons();
        this.setupReynoldsValidation();
        this.setupSizingValidation();
        this.setupHeadlossValidation();
        this.setupNpshValidation();
        this.setupHeadValidation();
        this.initExploratoryPanels(); // <-- adicionar esta linha
    },
```

- [ ] **Step 3: Verificar manualmente**

No browser: navegar para o módulo Escoamento. O painel "Modo Exploratório" deve aparecer. Selecionar "Água a 20°C — PVC DN100". Os campos de Reynolds devem ser preenchidos e o cálculo deve disparar automaticamente.

- [ ] **Step 4: Commit**

```bash
git add frontend/js/modules/didatic.js
git commit -m "feat: adiciona initExploratoryPanels e _applyTemplate para seleção de template"
```

---

## Task 5: didatic.js — Sliders e Recálculo Automático

**Files:**
- Modify: `frontend/js/modules/didatic.js`

- [ ] **Step 1: Adicionar `_buildSliders()` com debounce e recálculo**

```javascript
    _buildSliders(moduleKey, tpl) {
        const container = document.getElementById(`${moduleKey}-sliders`);
        if (!container) return;

        container.innerHTML = '';
        container.classList.remove('hidden');

        tpl.sliders.forEach(cfg => {
            const group = document.createElement('div');
            group.className = 'param-slider-group';

            const label = document.createElement('label');
            const valSpan = document.createElement('span');
            valSpan.className = 'slider-value';
            valSpan.id = `${cfg.id}-val`;
            valSpan.textContent = `${cfg.default} ${cfg.unit}`;
            label.textContent = cfg.label + ' ';
            label.appendChild(valSpan);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = cfg.min;
            slider.max = cfg.max;
            slider.step = cfg.step;
            slider.value = cfg.default;
            slider.id = cfg.id;

            const limits = document.createElement('div');
            limits.className = 'slider-limits';
            limits.innerHTML = `<span>${cfg.min} ${cfg.unit}</span><span>${cfg.max} ${cfg.unit}</span>`;

            group.appendChild(label);
            group.appendChild(slider);
            group.appendChild(limits);
            container.appendChild(group);

            let debounceTimer;
            slider.addEventListener('input', () => {
                valSpan.textContent = `${slider.value} ${cfg.unit}`;

                // Atualizar o campo do formulário
                const field = document.getElementById(cfg.field);
                if (field) field.value = slider.value;

                // Atualizar campo vinculado (ex: conversão CSTR e PFR ao mesmo tempo)
                if (cfg.linkedField) {
                    const linked = document.getElementById(cfg.linkedField);
                    if (linked) linked.value = slider.value;
                }

                // Disparar recálculo com debounce
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (tpl.formSelector) {
                        const form = document.querySelector(tpl.formSelector);
                        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    }
                }, 300);
            });
        });
    },
```

- [ ] **Step 2: Verificar que o Diagrama de Moody atualiza ao mover o slider**

No browser, no módulo Escoamento com template "Água PVC DN100": mover o slider de Velocidade de 1,5 para 0,02 m/s. Aguardar ~300ms. O Diagrama de Moody deve mostrar o ponto migrando da zona turbulenta para a laminar. A Régua de Regime deve atualizar também.

- [ ] **Step 3: Verificar que o Perfil de Velocidade (Dimensionamento) atualiza**

No módulo Dimensionamento com template "Linha de processo": mover o slider de Vazão. O perfil SVG de velocidade deve escalar conforme o diâmetro muda.

- [ ] **Step 4: Commit**

```bash
git add frontend/js/modules/didatic.js
git commit -m "feat: adiciona _buildSliders com debounce e recálculo automático via dispatchEvent"
```

---

## Task 6: didatic.js — Roteiro de Exploração (Cards Guiados)

**Files:**
- Modify: `frontend/js/modules/didatic.js`

- [ ] **Step 1: Adicionar `_renderGuidedSteps()`**

```javascript
    _renderGuidedSteps(moduleKey, tpl) {
        const container = document.getElementById(`${moduleKey}-steps`);
        if (!container) return;

        container.innerHTML = '';
        container.classList.remove('hidden');

        const title = document.createElement('div');
        title.className = 'steps-title';
        title.textContent = 'Roteiro de Exploração';
        container.appendChild(title);

        (tpl.steps || []).forEach((text, i) => {
            const step = document.createElement('div');
            step.className = 'guided-step';
            step.innerHTML = `<span class="step-num">${i + 1}</span><span>${text}</span>`;
            container.appendChild(step);
        });

        if (tpl.activity && tpl.activity.length > 0) {
            const actTitle = document.createElement('div');
            actTitle.className = 'steps-title';
            actTitle.style.marginTop = '0.75rem';
            actTitle.textContent = 'Atividade';
            container.appendChild(actTitle);

            tpl.activity.forEach((text, i) => {
                const step = document.createElement('div');
                step.className = 'guided-step step-activity';
                step.innerHTML = `<span class="step-num">${i + 1}</span><span>${text}</span>`;
                container.appendChild(step);
            });
        }
    },
```

- [ ] **Step 2: Verificar no browser**

Com template "Água PVC DN100" selecionado, o painel deve exibir 4 cards de roteiro azuis e 2 cards de atividade amarelos logo abaixo dos sliders.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/modules/didatic.js
git commit -m "feat: adiciona _renderGuidedSteps com cards numerados e atividades"
```

---

## Task 7: didatic.js — Comparação de Cenários

**Files:**
- Modify: `frontend/js/modules/didatic.js`

- [ ] **Step 1: Adicionar estado e funções de cenário**

Adicionar a propriedade `_scenarios` ao objeto `DidaticModule` (junto com `pedagogicTemplates`):

```javascript
    _scenarios: {}, // { moduleKey: [{ name, summary, chartDatasets, color }] }
    _scenarioColors: ['#2563EB', '#D97706', '#16A34A'],
```

- [ ] **Step 2: Adicionar `_setupScenarioButtons()`**

```javascript
    _setupScenarioButtons(moduleKey, tpl) {
        const saveBtn = document.getElementById(`${moduleKey}-save-scenario`);
        const clearBtn = document.getElementById(`${moduleKey}-clear-scenarios`);
        if (!saveBtn || !clearBtn) return;

        saveBtn.onclick = () => this._saveScenario(moduleKey, tpl);
        clearBtn.onclick = () => this._clearScenarios(moduleKey);
    },

    _saveScenario(moduleKey, tpl) {
        if (!this._scenarios[moduleKey]) this._scenarios[moduleKey] = [];
        const list = this._scenarios[moduleKey];
        if (list.length >= 3) {
            alert('Máximo de 3 cenários. Limpe um antes de salvar.');
            return;
        }
        const colorIdx = list.length;
        const summary = tpl.scenarioSummaryFn ? tpl.scenarioSummaryFn() : '';
        const scenario = {
            name: summary || `Cenário ${list.length + 1}`,
            summary,
            color: this._scenarioColors[colorIdx],
            chartDatasets: this._captureChartDatasets(moduleKey),
        };
        list.push(scenario);
        this._renderScenarioList(moduleKey);
    },

    _captureChartDatasets(moduleKey) {
        // Captura os datasets do Chart.js ativo no módulo
        const chartMap = {
            flow: '_moodyChart',
            sizing: null,
            pump: '_headlossChart',
            reactor: '_reactorChart',
            balance: '_balanceChart',
        };
        const chartProp = chartMap[moduleKey];
        const moduleObj = { flow: FlowModule, sizing: SizingModule, pump: PumpModule,
                            reactor: ReactorModule, balance: BalanceModule }[moduleKey];
        if (!chartProp || !moduleObj || !moduleObj[chartProp]) return null;
        const chart = moduleObj[chartProp];
        return chart.data.datasets.map(ds => ({
            label: ds.label,
            data: [...(ds.data || [])],
            borderColor: ds.borderColor,
            backgroundColor: ds.backgroundColor,
        }));
    },

    _renderScenarioList(moduleKey) {
        const listEl = document.getElementById(`${moduleKey}-scenario-list`);
        if (!listEl) return;
        const scenarios = this._scenarios[moduleKey] || [];
        listEl.innerHTML = '';
        scenarios.forEach((sc, i) => {
            const item = document.createElement('div');
            item.className = 'scenario-item';
            item.innerHTML = `
                <span class="scenario-color-dot" style="background:${sc.color}"></span>
                <input class="scenario-name" value="${sc.name}" placeholder="Nome do cenário">
                <span class="scenario-summary">${sc.summary}</span>`;
            const nameInput = item.querySelector('.scenario-name');
            nameInput.addEventListener('input', () => { scenarios[i].name = nameInput.value; });
            listEl.appendChild(item);
        });

        if (scenarios.length >= 2) {
            this._overlayScenarios(moduleKey);
        }
    },

    _overlayScenarios(moduleKey) {
        const chartMap = { flow: '_moodyChart', pump: '_headlossChart',
                           reactor: '_reactorChart', balance: '_balanceChart' };
        const chartProp = chartMap[moduleKey];
        const moduleObj = { flow: FlowModule, pump: PumpModule,
                            reactor: ReactorModule, balance: BalanceModule }[moduleKey];
        if (!chartProp || !moduleObj || !moduleObj[chartProp]) return;

        const chart = moduleObj[chartProp];
        const scenarios = this._scenarios[moduleKey] || [];

        // Manter dataset original do cálculo atual + adicionar cenários salvos
        const baseDatasets = chart.data.datasets.filter(ds => !ds._scenario);
        const scenarioDatasets = [];

        scenarios.forEach((sc, i) => {
            if (!sc.chartDatasets) return;
            sc.chartDatasets.forEach(ds => {
                scenarioDatasets.push({
                    ...ds,
                    label: `[${sc.name}] ${ds.label}`,
                    borderColor: sc.color,
                    backgroundColor: sc.color + '33',
                    borderDash: [4, 4],
                    _scenario: true,
                });
            });
        });

        chart.data.datasets = [...baseDatasets, ...scenarioDatasets];
        chart.update();
    },

    _clearScenarios(moduleKey) {
        this._scenarios[moduleKey] = [];
        const listEl = document.getElementById(`${moduleKey}-scenario-list`);
        if (listEl) listEl.innerHTML = '';

        // Remover datasets de cenário do gráfico
        const chartMap = { flow: '_moodyChart', pump: '_headlossChart',
                           reactor: '_reactorChart', balance: '_balanceChart' };
        const chartProp = chartMap[moduleKey];
        const moduleObj = { flow: FlowModule, pump: PumpModule,
                            reactor: ReactorModule, balance: BalanceModule }[moduleKey];
        if (chartProp && moduleObj && moduleObj[chartProp]) {
            const chart = moduleObj[chartProp];
            chart.data.datasets = chart.data.datasets.filter(ds => !ds._scenario);
            chart.update();
        }
    },
```

- [ ] **Step 3: Chamar `_setupScenarioButtons()` dentro de `_applyTemplate()`**

Localizar `_applyTemplate` e adicionar ao final:

```javascript
        // Configurar botões de cenário
        this._setupScenarioButtons(moduleKey, tpl);
```

- [ ] **Step 4: Verificar cenários no módulo Escoamento**

Template "Água PVC DN100" → calcular → Salvar Cenário → mudar velocidade para 0,3 m/s → calcular → Salvar Cenário. O Diagrama de Moody deve mostrar os dois pontos sobrepostos com cores diferentes.

- [ ] **Step 5: Commit**

```bash
git add frontend/js/modules/didatic.js
git commit -m "feat: adiciona comparação de cenários com overlay no Chart.js"
```

---

## Task 8: didatic.js — Integração com Reatores e Balanço (DOM Dinâmico)

Os módulos **Reactor** e **Balance** criam seu DOM em `init()`. O painel exploratório precisa ser injetado **após** esse init.

**Files:**
- Modify: `frontend/js/modules/didatic.js`

- [ ] **Step 1: Adicionar `_injectDynamicPanels()` para Reactor e Balance**

```javascript
    _injectDynamicPanels() {
        this._injectReactorPanel();
        this._injectBalancePanel();
    },

    _injectReactorPanel() {
        const container = document.getElementById('reactor-content');
        if (!container || container.querySelector('#reactor-exploratory')) return;

        const panel = document.createElement('div');
        panel.className = 'exploratory-panel';
        panel.id = 'reactor-exploratory';
        panel.innerHTML = `
            <div class="exp-header">
                <span class="exp-title">&#127891; Modo Exploratório</span>
                <select class="template-select" id="reactor-template-select">
                    <option value="">— Selecione um template didático —</option>
                    <option value="first-order">Reação 1ª ordem — A→B, k=0,5 min⁻¹</option>
                </select>
            </div>
            <div class="sliders-section hidden" id="reactor-sliders"></div>
            <div class="guided-steps hidden" id="reactor-steps"></div>
            <div class="scenario-panel hidden" id="reactor-scenario-panel">
                <div class="scenario-panel-header">
                    <span class="scenario-panel-title">Comparação de Cenários</span>
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <button class="btn-save-scenario" id="reactor-save-scenario">&#128190; Salvar Cenário</button>
                        <button class="btn-clear-scenarios" id="reactor-clear-scenarios">Limpar</button>
                    </div>
                </div>
                <div class="scenario-list" id="reactor-scenario-list"></div>
            </div>`;
        container.appendChild(panel);

        const select = document.getElementById('reactor-template-select');
        select.addEventListener('change', () => {
            const templateKey = select.value;
            if (!templateKey) return;
            this._applyTemplate('reactor', templateKey);
        });
    },

    _injectBalancePanel() {
        const container = document.getElementById('balance-content');
        if (!container || container.querySelector('#balance-exploratory')) return;

        const panel = document.createElement('div');
        panel.className = 'exploratory-panel';
        panel.id = 'balance-exploratory';
        panel.innerHTML = `
            <div class="exp-header">
                <span class="exp-title">&#127891; Modo Exploratório</span>
                <select class="template-select" id="balance-template-select">
                    <option value="">— Selecione um template didático —</option>
                    <option value="simple-separation">Separação simples — Alimentação 100 mol/h</option>
                </select>
            </div>
            <div class="guided-steps hidden" id="balance-steps"></div>`;
        container.appendChild(panel);

        const select = document.getElementById('balance-template-select');
        select.addEventListener('change', () => {
            const templateKey = select.value;
            if (!templateKey) return;
            this._applyBalanceTemplate(templateKey);
        });
    },

    _applyBalanceTemplate(templateKey) {
        const tpl = this.pedagogicTemplates.balance?.[templateKey];
        if (!tpl) return;

        // Balanço usa loadExampleData — carregar o exemplo primeiro
        if (tpl.useLoadExample && window.BalanceModule) {
            BalanceModule.loadExampleData().then(() => {
                this._renderGuidedSteps('balance', tpl);
                document.getElementById('balance-steps')?.classList.remove('hidden');
            });
        }
    },
```

- [ ] **Step 2: Chamar `_injectDynamicPanels()` dentro de `initExploratoryPanels()`**

Localizar `initExploratoryPanels()` e adicionar no final:

```javascript
        // Reactor e Balance têm DOM dinâmico — injetar após slight delay
        setTimeout(() => this._injectDynamicPanels(), 100);
```

- [ ] **Step 3: Verificar injeção do painel no módulo Reatores**

Navegar para Reatores, aguardar carregamento. O painel "Modo Exploratório" deve aparecer no final da página. Selecionar "Reação 1ª ordem" — os campos de conversão e k devem ser preenchidos e o cálculo disparado.

- [ ] **Step 4: Verificar injeção no módulo Balanço**

Navegar para Balanço. Selecionar "Separação simples" — o exemplo deve ser carregado e os cards de roteiro devem aparecer.

- [ ] **Step 5: Commit**

```bash
git add frontend/js/modules/didatic.js
git commit -m "feat: injeta painel exploratório em reactor e balance via DOM dinâmico"
```

---

## Task 9: LaTeX — Subseção 4.5.6 "Tutorial de Uso em Sala de Aula"

**Files:**
- Modify: `escrita/TEX/capitulos/4.5-recursos-didaticos.tex`

- [ ] **Step 1: Adicionar a nova subseção ao final de `4.5-recursos-didaticos.tex`**

Adicionar após a última figura da seção `\subsection{Trilhas de Aprendizagem}`:

```latex
\subsection{Tutorial de Uso em Sala de Aula}

O DCOU incorpora um Modo Exploratório que transforma cada módulo de cálculo em um ambiente de experimentação paramétrica. Ao selecionar um \textit{template} didático pré-configurado, o estudante recebe campos preenchidos com valores realistas, controles deslizantes para variar os parâmetros mais relevantes e um roteiro numerado que guia a observação dos fenômenos. Todas as visualizações --- gráficos e diagramas SVG --- reagem em tempo real à variação dos parâmetros. Esta subseção apresenta cinco exemplos de uso em sala de aula, um por módulo, estruturados como atividades que a professora da disciplina pode distribuir para os estudantes reproduzirem individualmente ou em grupo.

% ----- Escoamento -----
\subsubsection{Regime de Escoamento e Diagrama de Moody}

\textbf{Contexto:} em uma aula sobre regime de escoamento e fator de atrito, o estudante deve compreender como o número de Reynolds governa a transição laminar/turbulento e como isso se reflete no Diagrama de Moody.

\textbf{Procedimento:}
\begin{enumerate}
    \item Acesse o módulo \textbf{Escoamento} na barra lateral do DCOU.
    \item No painel \textit{Modo Exploratório}, selecione o \textit{template} ``Água a 20°C --- PVC DN100, v=1,5 m/s''. Os campos de diâmetro (100 mm), velocidade (1,5 m/s), densidade (998 kg/m³) e viscosidade dinâmica (0,001 Pa$\cdot$s) são preenchidos automaticamente e o cálculo é executado.
    \item Observe o resultado: Re $\approx 149.800$ --- regime \textbf{turbulento}. A Régua de Regime de Escoamento posiciona o valor na extremidade direita da escala logarítmica. O Diagrama de Moody exibe o ponto operacional na zona turbulenta rugosa.
    \item Mova o controle deslizante de \textit{Velocidade} gradualmente de 1,5 m/s até 0,02 m/s. O Reynolds cai de 149.800 para aproximadamente 2.000. Quando Re cruza o valor 2.300, o ponto no Diagrama de Moody migra para a reta $f = 64/\text{Re}$ (regime laminar) e o fator de atrito sobe abruptamente de $\approx 0,016$ para $\approx 0,032$.
    \item Clique em ``Salvar Cenário'' e nomeie como ``Laminar (v=0,02 m/s)''.
    \item Restaure a velocidade para 1,5 m/s e reduza o diâmetro para 50 mm com o controle deslizante correspondente. O Reynolds sobe para $\approx 74.900$ (mesmo fluido, menor diâmetro $\Rightarrow$ maior velocidade interna). Salve como ``Turbulento D=50 mm''.
    \item O Diagrama de Moody exibe os dois cenários sobrepostos com cores distintas. Compare os fatores de atrito: por que o ponto ``D=50 mm'' tem $f$ ligeiramente maior que ``D=100 mm'' à mesma velocidade?
\end{enumerate}

\textbf{Resultado esperado:} o estudante observa que a rugosidade relativa ($\varepsilon/D$) aumenta para diâmetros menores, elevando $f$ mesmo a Re idêntico na zona plenamente turbulenta rugosa. Para o PVC ($\varepsilon \approx 0,0015$ mm), $\varepsilon/D_{100} = 1,5 \times 10^{-5}$ e $\varepsilon/D_{50} = 3,0 \times 10^{-5}$ --- diferença perceptível no Diagrama de Moody.

\textbf{Atividade:} (a) Qual é a velocidade limite (m/s) para que o escoamento de água em PVC DN100 seja laminar? (b) Selecione o \textit{template} ``Óleo viscoso --- DN80'' e compare os dois pontos no Diagrama de Moody à velocidade de 1 m/s. Qual fluido tem maior Re? Qual tem maior fator de atrito? Explique.

% ----- Dimensionamento -----
\subsubsection{Dimensionamento de Tubulações e Seleção de Diâmetro Nominal}

\textbf{Contexto:} em uma aula sobre seleção de tubulações, o estudante deve entender como a equação da continuidade ($D = \sqrt{4Q/\pi V}$) determina o diâmetro mínimo e como esse valor é arredondado para o DN comercial imediatamente superior.

\textbf{Procedimento:}
\begin{enumerate}
    \item Acesse o módulo \textbf{Dimensionamento}.
    \item No \textit{Modo Exploratório}, selecione ``Linha de processo --- Água, v=1,5 m/s''. Os campos Vazão ($Q = 0,01$ m³/s) e Velocidade (1,5 m/s) são preenchidos. O diâmetro calculado é $D = \sqrt{4 \times 0{,}01 / (\pi \times 1{,}5)} \approx 92$ mm $\Rightarrow$ DN100 SCH~40.
    \item Observe o perfil de velocidade na seção circular: vetores uniformes indicam escoamento médio turbulento desenvolvido.
    \item Mova o controle deslizante de \textit{Vazão} para 0,05 m³/s. O diâmetro calculado sobe para $\approx 206$ mm (DN200). O perfil escala proporcionalmente.
    \item Salve o cenário ``Alta vazão (0,05 m³/s)''. Redefina $Q = 0,01$ m³/s e mova o controle de \textit{Velocidade} para 0,8 m/s (linha de sucção). O diâmetro sobe para $\approx 126$ mm (DN150). Salve como ``Baixa velocidade (0,8 m/s)''.
    \item Compare: DN100 (v=1,5 m/s) \textit{vs.} DN150 (v=0,8 m/s) para a mesma vazão. Menor velocidade $\Rightarrow$ maior diâmetro $\Rightarrow$ maior custo de material, mas menor perda de carga e menor risco de erosão.
\end{enumerate}

\textbf{Atividade:} (a) Para $Q = 0,02$ m³/s e velocidade recomendada de 1,0 m/s, qual é o DN selecionado? (b) Qual é a velocidade real do fluido após selecionar o DN comercial (diâmetro interno real $\neq$ diâmetro calculado)?

% ----- Bombas -----
\subsubsection{Perda de Carga e Margem de NPSH}

\textbf{Contexto:} em uma aula sobre bombas centrífugas, o estudante deve observar como o comprimento da tubulação e a vazão afetam a perda de carga e como a cota geométrica de sucção influencia o NPSH disponível e o risco de cavitação.

\textbf{Procedimento:}
\begin{enumerate}
    \item Acesse o módulo \textbf{Perda de Carga \& NPSH}.
    \item Selecione o \textit{template} ``Bombeamento padrão --- Água, L=100 m, DN100''. Os campos são preenchidos: $L = 100$ m, $D = 100$ mm, $Q = 0,01$ m³/s, $f = 0,02$. Perda de carga calculada: $h_f \approx 1{,}64$ m (Darcy-Weisbach: $h_f = f \cdot L/D \cdot V^2/2g$).
    \item Observe a curva \textit{Perda de Carga $\times$ Vazão}: $h_f$ cresce com o quadrado da vazão. O ponto operacional está marcado sobre a curva.
    \item Mova o controle deslizante de \textit{Comprimento} para 200 m. $h_f$ dobra para $\approx 3{,}28$ m. A curva se desloca verticalmente --- a bomba precisa fornecer mais \textit{head} para o mesmo ponto de operação.
    \item Salve ``L=100 m'' e ``L=200 m''. Compare a Decomposição da Altura Manométrica: qual parcela mais aumenta com o comprimento?
    \item Agora mova o controle de \textit{Cota Geométrica de Sucção} para 8 m (antes era 3 m). Observe a Margem de NPSH diminuir. A partir de qual cota a margem NPSH cai abaixo de 1 m?
\end{enumerate}

\textbf{Atividade:} (a) Para $L = 150$ m e $Q = 0,015$ m³/s, qual é a perda de carga? (b) Com cota de sucção de 7 m e pressão de vapor da água a 20°C ($P_v = 0{,}023$ kgf/cm²), a margem de NPSH é positiva? Qual é o risco de cavitação?

% ----- Reatores -----
\subsubsection{Volume de Reatores CSTR e PFR pelo Diagrama de Levenspiel}

\textbf{Contexto:} em uma aula sobre reatores ideais, o estudante deve compreender por que o volume de um CSTR é sempre maior que o de um PFR para a mesma conversão em reações com cinética positiva, e como esse efeito se acentua a altas conversões.

\textbf{Procedimento:}
\begin{enumerate}
    \item Acesse o módulo \textbf{CSTR / PFR}.
    \item Selecione o \textit{template} ``Reação 1ª ordem --- A→B, k=0,5 min⁻¹''. Os campos de conversão ($X = 0{,}8$) e constante cinética ($k = 0{,}5$ min$^{-1}$) são preenchidos para CSTR e PFR simultaneamente.
    \item Observe o Diagrama de Levenspiel ($1/(-r_A)$ em função de $X$): a área do retângulo (CSTR) é maior que a área sob a curva (PFR). Esta é a regra geral: o PFR é mais eficiente volumetricamente que o CSTR para reações com taxa decrescente.
    \item Mova o controle de \textit{Conversão} para $X = 0{,}95$. Ambas as áreas crescem, mas o CSTR cresce desproporcionalmente. Para reações de 1ª ordem: $V_\text{CSTR}/V_\text{PFR} = (X/(1-X)) / (-\ln(1-X))$. Para $X=0{,}8$: razão $\approx 1{,}62$; para $X=0{,}95$: razão $\approx 2{,}44$.
    \item Salve ``X=0,80'' e ``X=0,95''. Compare os diagramas sobrepostos: a diferença relativa entre as áreas é claramente maior a $X=0{,}95$.
    \item Agora mova $k$ para 1,5 min$^{-1}$ com $X = 0{,}8$. Os volumes diminuem (reação mais rápida), mas a razão $V_\text{CSTR}/V_\text{PFR}$ permanece igual ($\approx 1{,}62$). Confirmação: para reações de 1ª ordem, a razão depende apenas de $X$, não de $k$.
\end{enumerate}

\textbf{Atividade:} (a) Para $X = 0{,}90$ e $k = 0{,}5$ min$^{-1}$, qual é a razão $V_\text{CSTR}/V_\text{PFR}$? Verifique com a fórmula analítica. (b) Se o custo de instalação de um CSTR é 20\% menor que um PFR de mesmo volume, existe uma conversão em que o CSTR seria economicamente preferível?

% ----- Balanço de Massa -----
\subsubsection{Fechamento do Balanço de Massa com Corrente de Reciclo}

\textbf{Contexto:} em uma aula sobre balanço de massa, o estudante deve verificar numericamente o princípio da conservação da massa em um sistema com múltiplas correntes e identificar como a corrente de reciclo afeta a composição das correntes internas.

\textbf{Procedimento:}
\begin{enumerate}
    \item Acesse o módulo \textbf{Balanço de Massa}.
    \item No \textit{Modo Exploratório}, selecione ``Separação simples --- Alimentação 100 mol/h''. O exemplo é carregado automaticamente: uma alimentação e duas correntes de saída (produto e rejeito).
    \item Clique em ``Calcular Balanço''. O gráfico exibe as correntes por componente. Verifique: $\sum \dot{n}_\text{entrada} = \sum \dot{n}_\text{saída}$ (fechamento do balanço).
    \item Leia o roteiro de exploração: modifique a fração de \textit{split} de 0,6 para 0,8 no formulário de divisão. Recalcule. A corrente de produto aumenta de 60 para 80 mol/h; o rejeito diminui de 40 para 20 mol/h. O balanço global ainda fecha.
    \item Inspecione a tabela de correntes: a razão produto/rejeito mudou proporcionalmente ao \textit{split}. O DCOU calcula algebricamente as incógnitas sem necessidade de substituição manual nas equações.
    \item Discussão: em um processo real com reciclo, parte do rejeito é recirculada. Como isso altera a alimentação efetiva do separador e a pureza do produto?
\end{enumerate}

\textbf{Atividade:} (a) Para uma alimentação de 100 mol/h com componentes A (60\%) e B (40\%), e separador com eficiência de 70\% para A e 90\% para B, quais são as correntes de produto e rejeito? (b) Se 50\% do rejeito é reciclado, qual é a nova alimentação efetiva ao separador? Configure esse cenário no DCOU e verifique o fechamento.

\begin{figure}[H]
    \centering
    \caption{Modo Exploratório no módulo de Escoamento: \textit{template} selecionado, controles deslizantes e roteiro guiado}
    \imgouplaceholder{media/modo_exploratorio_escoamento.png}
    \fonte{Autoria própria.}
    \label{fig:modo_exploratorio}
\end{figure}
```

- [ ] **Step 2: Compilar o PDF**

```bash
cd "/home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC/escrita"
bash compile.sh
```

Verificar que o PDF compila sem erros LaTeX e que a seção 4.5.6 aparece no sumário.

- [ ] **Step 3: Commit**

```bash
cd "/home/jpbgr/Área de trabalho/Projetos/Pessoais/TCC"
git add escrita/TEX/capitulos/4.5-recursos-didaticos.tex
git commit -m "docs: adiciona subseção 4.5.6 Tutorial de Uso em Sala de Aula com 5 blocos"
```

---

## Revisão do Spec vs. Plano

| Requisito do Spec | Task que implementa |
|---|---|
| Templates pré-configurados (2–3 por módulo) | Task 3 — `pedagogicTemplates` |
| Seletor de template dropdown | Task 4 — `initExploratoryPanels`, `_applyTemplate` |
| Sliders de exploração (2–3 por módulo) | Task 5 — `_buildSliders` |
| Sliders atualizam visualizações (SVG + Chart.js) | Task 5 — `dispatchEvent('submit')` aciona todo o pipeline existente |
| Comparação de cenários (até 3, overlay no gráfico) | Task 7 — `_saveScenario`, `_overlayScenarios` |
| Roteiro de exploração (4 cards + atividades) | Task 6 — `_renderGuidedSteps` |
| Reatores e Balanço (DOM dinâmico) | Task 8 — `_injectDynamicPanels` |
| CSS para todos os elementos novos | Task 1 |
| HTML estático para sizing, flow, pump | Task 2 |
| Subseção 4.5.6 no TCC (5 blocos, passo a passo) | Task 9 |
| Valores concretos e resultados esperados no texto | Task 9 — cada bloco com valores calculados explícitos |
| Tom de roteiro de laboratório | Task 9 — linguagem imperativa e numerada |
