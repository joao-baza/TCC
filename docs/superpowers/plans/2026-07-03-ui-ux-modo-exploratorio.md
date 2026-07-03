# UI/UX do Modo Exploratório Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o modo exploratório em um mini-laboratório autônomo com gráficos embutidos, scroll previsível ao ativar templates e microcópia corrigida nos trechos alterados.

**Architecture:** O `didatic.js` continua orquestrando templates, sliders e cenários, mas passa a controlar uma área visual embutida por módulo. Cada módulo expõe hooks pequenos para renderizar seus gráficos existentes em contêineres do laboratório, evitando duplicação de cálculo ou de lógica analítica.

**Tech Stack:** HTML estático, CSS customizado, JavaScript modular no frontend, Chart.js, `pytest` para regressão estática do frontend.

---

### Task 1: Ampliar a cobertura de regressão estática para o novo laboratório exploratório

**Files:**
- Modify: `demo/tests/test_exploratory_mode.py`

- [ ] **Step 1: Write the failing test**

```python
def test_static_panels_define_embedded_visual_containers():
    html = read("frontend/index.html")

    required_ids = (
        'id="sizing-exploratory-visuals"',
        'id="flow-exploratory-visuals"',
        'id="pump-exploratory-visuals"',
    )

    for snippet in required_ids:
        assert snippet in html


def test_didatic_module_defines_scroll_alignment_and_visual_hooks():
    didatic = read("frontend/js/modules/didatic.js")

    required_snippets = (
        "_scrollExploratoryPanelIntoView",
        "_renderExploratoryVisuals",
        "_buildExploratoryVisualShell",
        "Modo Exploratório",
        "Roteiro de exploração",
    )

    for snippet in required_snippets:
        assert snippet in didatic


def test_modules_expose_embedded_visual_render_surface():
    for rel_path in (
        "frontend/js/modules/flow.js",
        "frontend/js/modules/sizing.js",
        "frontend/js/modules/pump.js",
        "frontend/js/modules/reactor.js",
        "frontend/js/modules/balance.js",
    ):
        source = read(rel_path)
        assert "renderExploratoryVisuals(" in source


def test_styles_define_visual_lab_sections():
    styles = read("frontend/css/styles.css")

    for selector in (
        ".exploratory-visuals",
        ".exploratory-visual-card",
        ".exploratory-placeholder",
    ):
        assert selector in styles
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py -q
```

Expected:

```text
FAIL demo/tests/test_exploratory_mode.py::test_static_panels_define_embedded_visual_containers
FAIL demo/tests/test_exploratory_mode.py::test_didatic_module_defines_scroll_alignment_and_visual_hooks
FAIL demo/tests/test_exploratory_mode.py::test_modules_expose_embedded_visual_render_surface
FAIL demo/tests/test_exploratory_mode.py::test_styles_define_visual_lab_sections
```

- [ ] **Step 3: Write minimal implementation**

Adicionar exatamente os testes acima ao final de `demo/tests/test_exploratory_mode.py`, preservando os testes já existentes.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py -q
```

Expected:

```text
FAIL
```

Observação: nesta etapa o arquivo de teste deve estar correto, mas a suíte ainda falhará porque a implementação do frontend ainda não existe. O objetivo aqui é consolidar a regressão vermelha antes de tocar no código.

- [ ] **Step 5: Commit**

```bash
git add demo/tests/test_exploratory_mode.py
git commit -m "test: cover exploratory lab ui hooks"
```

### Task 2: Reestruturar o markup e o CSS do card exploratório para suportar o mini-laboratório

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/css/styles.css`
- Test: `demo/tests/test_exploratory_mode.py`

- [ ] **Step 1: Write the failing test**

Consolidar o teste de markup escrito na Task 1 como a referência vermelha:

```python
def test_static_panels_define_embedded_visual_containers():
    html = read("frontend/index.html")

    required_ids = (
        'id="sizing-exploratory-visuals"',
        'id="flow-exploratory-visuals"',
        'id="pump-exploratory-visuals"',
    )

    for snippet in required_ids:
        assert snippet in html
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py::test_static_panels_define_embedded_visual_containers -q
```

Expected:

```text
AssertionError: assert 'id="sizing-exploratory-visuals"' in html
```

- [ ] **Step 3: Write minimal implementation**

Em `frontend/index.html`, substituir o cabeçalho textual sem acento e inserir a área visual embutida em cada painel estático:

```html
<div class="exploratory-panel hidden" id="flow-exploratory">
    <div class="exp-header">
        <span class="exp-title">Modo Exploratório</span>
        <select class="template-select" id="flow-template-select">
            <option value="">Selecione um template didático</option>
            <option value="water-pvc-dn100">Água a 20 °C - PVC DN100, v=1,5 m/s</option>
            <option value="oil-steel-dn80">Óleo viscoso - Aço carbono DN80, v=0,5 m/s</option>
            <option value="air-duct-200">Ar - Duto 200 mm, v=3 m/s</option>
        </select>
    </div>
    <div class="sliders-section hidden" id="flow-sliders"></div>
    <div class="guided-steps hidden" id="flow-steps"></div>
    <div class="exploratory-visuals hidden" id="flow-exploratory-visuals">
        <div class="exploratory-visual-card" id="flow-exploratory-summary"></div>
        <div class="exploratory-visual-card" id="flow-exploratory-chart"></div>
    </div>
    <div class="scenario-panel hidden" id="flow-scenario-panel">
```

Aplicar a mesma estrutura a `sizing-exploratory` e `pump-exploratory`.

Em `frontend/css/styles.css`, adicionar estilos mínimos para a nova área:

```css
.exploratory-visuals {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
}

.exploratory-visual-card {
    background: #fff;
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1rem;
    min-height: 180px;
}

.exploratory-placeholder {
    color: var(--color-text-2);
    font-size: 0.95rem;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py::test_static_panels_define_embedded_visual_containers -q
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/css/styles.css demo/tests/test_exploratory_mode.py
git commit -m "feat: add exploratory lab visual containers"
```

### Task 3: Refatorar o `didatic.js` para controlar scroll, microcópia e shell visual do laboratório

**Files:**
- Modify: `frontend/js/modules/didatic.js`
- Test: `demo/tests/test_exploratory_mode.py`

- [ ] **Step 1: Write the failing test**

Usar o teste da Task 1 como driver:

```python
def test_didatic_module_defines_scroll_alignment_and_visual_hooks():
    didatic = read("frontend/js/modules/didatic.js")

    required_snippets = (
        "_scrollExploratoryPanelIntoView",
        "_renderExploratoryVisuals",
        "_buildExploratoryVisualShell",
        "Modo Exploratório",
        "Roteiro de exploração",
    )

    for snippet in required_snippets:
        assert snippet in didatic
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py::test_didatic_module_defines_scroll_alignment_and_visual_hooks -q
```

Expected:

```text
AssertionError: assert '_scrollExploratoryPanelIntoView' in didatic
```

- [ ] **Step 3: Write minimal implementation**

Em `frontend/js/modules/didatic.js`, adicionar as novas superfícies e corrigir a microcópia do laboratório:

```javascript
_scrollExploratoryPanelIntoView(moduleKey) {
    const panel = document.getElementById(`${moduleKey}-exploratory`);
    if (!panel) return;

    const top = panel.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
},

_buildExploratoryVisualShell(moduleKey) {
    const visuals = document.getElementById(`${moduleKey}-exploratory-visuals`);
    if (!visuals) return;

    visuals.classList.remove('hidden');

    const summary = document.getElementById(`${moduleKey}-exploratory-summary`);
    const chart = document.getElementById(`${moduleKey}-exploratory-chart`);

    if (summary && !summary.innerHTML.trim()) {
        summary.innerHTML = '<div class="exploratory-placeholder">Selecione um template para carregar a visualização exploratória.</div>';
    }
    if (chart && !chart.innerHTML.trim()) {
        chart.innerHTML = '<div class="exploratory-placeholder">Os gráficos analíticos deste módulo aparecerão aqui.</div>';
    }
},

_renderExploratoryVisuals(moduleKey) {
    this._buildExploratoryVisualShell(moduleKey);
    const moduleMap = {
        sizing: window.SizingModule,
        flow: window.FlowModule,
        pump: window.PumpModule,
        reactor: window.ReactorModule,
        balance: window.BalanceModule,
    };

    moduleMap[moduleKey]?.renderExploratoryVisuals?.({
        summaryId: `${moduleKey}-exploratory-summary`,
        chartId: `${moduleKey}-exploratory-chart`,
    });
},
```

No fluxo de `_applyTemplate`, chamar o scroll apenas uma vez por ativação:

```javascript
await this._runModuleCalculation(moduleKey, tpl);
this._renderExploratoryVisuals(moduleKey);
this._scrollExploratoryPanelIntoView(moduleKey);
```

Corrigir também as strings visíveis erradas, por exemplo:

```javascript
title.textContent = 'Roteiro de exploração';
UI.showError('Limite atingido', 'Use no máximo 3 cenários por módulo.');
const summary = tpl.scenarioSummaryFn ? tpl.scenarioSummaryFn() : `Cenário ${scenarios.length + 1}`;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py::test_didatic_module_defines_scroll_alignment_and_visual_hooks -q
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Commit**

```bash
git add frontend/js/modules/didatic.js demo/tests/test_exploratory_mode.py
git commit -m "feat: orchestrate exploratory lab scroll and copy"
```

### Task 4: Expor hooks de renderização embutida em cada módulo sem duplicar cálculo

**Files:**
- Modify: `frontend/js/modules/flow.js`
- Modify: `frontend/js/modules/sizing.js`
- Modify: `frontend/js/modules/pump.js`
- Modify: `frontend/js/modules/reactor.js`
- Modify: `frontend/js/modules/balance.js`
- Test: `demo/tests/test_exploratory_mode.py`

- [ ] **Step 1: Write the failing test**

Usar o teste de superfície mínima:

```python
def test_modules_expose_embedded_visual_render_surface():
    for rel_path in (
        "frontend/js/modules/flow.js",
        "frontend/js/modules/sizing.js",
        "frontend/js/modules/pump.js",
        "frontend/js/modules/reactor.js",
        "frontend/js/modules/balance.js",
    ):
        source = read(rel_path)
        assert "renderExploratoryVisuals(" in source
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py::test_modules_expose_embedded_visual_render_surface -q
```

Expected:

```text
AssertionError: assert 'renderExploratoryVisuals(' in source
```

- [ ] **Step 3: Write minimal implementation**

Adicionar um hook enxuto em cada módulo, reaproveitando o último resultado calculado e os renderizadores existentes.

Exemplo em `frontend/js/modules/flow.js`:

```javascript
renderExploratoryVisuals(targets = {}) {
    const summaryEl = document.getElementById(targets.summaryId);
    const chartEl = document.getElementById(targets.chartId);
    if (!summaryEl || !chartEl) return;

    summaryEl.innerHTML = `
        <h4 class="text-sm font-semibold mb-2">Leitura do cenário</h4>
        <p>Reynolds e fator de atrito atualizados com os parâmetros exploratórios ativos.</p>
    `;

    chartEl.innerHTML = '<canvas id="flow-exploratory-chart-canvas" aria-label="Diagrama de Moody do modo exploratório"></canvas>';
    this._renderMoodyChart(
        parseFloat(document.getElementById('reynolds-number')?.value || '0'),
        this._lastFrictionFactor,
        parseFloat(document.getElementById('custom-roughness')?.value || '0'),
        parseFloat(document.getElementById('custom-diameter')?.value || '0'),
        'flow-exploratory-chart-canvas'
    );
},
```

Exemplo de ajuste mínimo no renderizador para aceitar canvas customizado:

```javascript
_renderMoodyChart(re, f, roughnessMm, diameterMm, canvasId = 'moody-chart') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    // manter o restante da lógica existente
}
```

Aplicar o mesmo padrão aos demais módulos:

- `sizing.js`: reutilizar `_renderVelocityProfile(...)` e escrever no contêiner exploratório;
- `pump.js`: priorizar a curva de perda de carga no card e manter o gauge/resumo no bloco de resumo;
- `reactor.js`: reutilizar o Chart.js do gráfico de conversão/Levenspiel em canvas exploratório;
- `balance.js`: reutilizar a geração do gráfico de correntes em canvas exploratório.

Sempre que necessário, guardar o último resultado útil para não recalcular apenas para desenhar:

```javascript
this._lastExploratoryState = { /* resultado mínimo necessário para rerender */ };
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py::test_modules_expose_embedded_visual_render_surface -q
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Commit**

```bash
git add frontend/js/modules/flow.js frontend/js/modules/sizing.js frontend/js/modules/pump.js frontend/js/modules/reactor.js frontend/js/modules/balance.js demo/tests/test_exploratory_mode.py
git commit -m "feat: embed module visuals in exploratory labs"
```

### Task 5: Fechar a camada visual, placeholders e verificação final

**Files:**
- Modify: `frontend/css/styles.css`
- Modify: `frontend/js/modules/didatic.js`
- Test: `demo/tests/test_exploratory_mode.py`

- [ ] **Step 1: Write the failing test**

Usar o teste de estilos como driver:

```python
def test_styles_define_visual_lab_sections():
    styles = read("frontend/css/styles.css")

    for selector in (
        ".exploratory-visuals",
        ".exploratory-visual-card",
        ".exploratory-placeholder",
    ):
        assert selector in styles
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py::test_styles_define_visual_lab_sections -q
```

Expected:

```text
AssertionError: assert '.exploratory-visuals' in styles
```

- [ ] **Step 3: Write minimal implementation**

Consolidar os estilos do laboratório para hierarquia e responsividade:

```css
.exploratory-panel {
    margin-top: 1.5rem;
    padding: 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: 1.25rem;
    background:
        radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 35%),
        linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.exploratory-visuals {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
}

.exploratory-visual-card {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1rem;
    overflow: hidden;
}

.exploratory-placeholder {
    color: var(--color-text-2);
    line-height: 1.5;
}

@media (min-width: 960px) {
    .exploratory-visuals {
        grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
        align-items: start;
    }
}
```

Em `didatic.js`, garantir que o placeholder reapareça quando o painel for resetado:

```javascript
_resetExploratoryPanel(moduleKey) {
    ['sliders', 'steps', 'scenario-panel', 'exploratory-visuals'].forEach(suffix => {
        const el = document.getElementById(`${moduleKey}-${suffix}`);
        if (el) el.classList.add('hidden');
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest demo/tests/test_exploratory_mode.py -q
```

Expected:

```text
8 passed
```

Também executar a checagem manual final:

```bash
python3 -m http.server 8000 --directory frontend
```

Checklist manual no navegador:

```text
1. Abrir cada módulo com laboratório exploratório.
2. Selecionar um template e confirmar alinhamento suave do topo do card.
3. Mover sliders e confirmar ausência de scroll automático.
4. Validar presença dos gráficos embutidos no próprio card.
5. Validar textos com acentuação corrigida nos trechos alterados.
```

- [ ] **Step 5: Commit**

```bash
git add frontend/css/styles.css frontend/js/modules/didatic.js demo/tests/test_exploratory_mode.py
git commit -m "style: polish exploratory lab layout"
```

---

## Self-Review

- Cobertura da spec:
  - mini-laboratório autônomo: Tasks 2, 3 e 4;
  - scroll suave apenas ao ativar template: Task 3;
  - ausência de rolagem nos sliders: Task 3 + checklist da Task 5;
  - gráficos reais embutidos: Task 4;
  - acentuação visível corrigida: Tasks 2 e 3;
  - hierarquia visual e responsividade: Task 5.

- Placeholder scan:
  - não há `TODO`, `TBD` ou “implementar depois”;
  - cada etapa aponta arquivos, snippets e comandos concretos.

- Consistência de nomes:
  - hooks planejados: `_scrollExploratoryPanelIntoView`, `_buildExploratoryVisualShell`, `_renderExploratoryVisuals`, `renderExploratoryVisuals`;
  - IDs planejados: `*-exploratory-visuals`, `*-exploratory-summary`, `*-exploratory-chart`.
