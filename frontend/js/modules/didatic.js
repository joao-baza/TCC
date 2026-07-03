const DidaticModule = {
    _scenarioColors: ['#2563EB', '#D97706', '#16A34A'],
    _scenarios: {},
    _activeTemplates: {},

    examples: {
        sizing: {
            'flow-rate': '0.01',
            'velocity': '1.5',
        },
        flow: {
            'characteristic-diameter': '100',
            'reynolds-velocity': '2',
            'density': '998',
            'dynamic-viscosity': '0.001',
        },
        pump: {
            'pipe-length': '100',
            'headloss-diameter': '100',
            'headloss-flow-rate': '0.015708',
            'headloss-friction-factor': '0.018',
            'headloss-velocity': '2',
            'manometric-pressure': '0',
            'atmospheric-pressure': '1.033',
            'vapor-pressure': '0.023',
            'specific-mass': '998',
            'npsh-friction-factor': '2',
            'pump-inlet-velocity': '2',
            'gauge-elevation': '3',
            'pressure1': '0',
            'pressure2': '200000',
            'elevation1': '0',
            'elevation2': '5',
            'velocity1': '1',
            'velocity2': '2',
            'head-specific-mass': '998',
            'head-friction-factor': '3',
        },
    },

    pedagogicTemplates: {
        sizing: {
            'process-line': {
                fields: { 'flow-rate': '0.01', 'velocity': '1.5' },
                sliders: [
                    { id: 'sizing-sl-flow', field: 'flow-rate', label: 'Vazao', unit: 'm3/s', min: 0.001, max: 0.05, step: 0.001, default: 0.01 },
                    { id: 'sizing-sl-vel', field: 'velocity', label: 'Velocidade', unit: 'm/s', min: 0.5, max: 3, step: 0.1, default: 1.5 },
                ],
                steps: [
                    'Observe o diametro teorico calculado e a selecao do diametro real para o caso base.',
                    'Aumente a vazao e note o crescimento do diametro necessario para manter a mesma velocidade.',
                    'Reduza a velocidade para discutir linhas de succao e o aumento do DN comercial.',
                    'Salve os cenarios e compare o compromisso entre custo de tubulacao e perda de carga.',
                ],
                activity: [
                    'Qual e a maior vazao que ainda permite um DN comercial abaixo de 100 mm neste caso?',
                ],
                scenarioSummaryFn: () => {
                    const q = document.getElementById('flow-rate')?.value;
                    const v = document.getElementById('velocity')?.value;
                    return `Q=${q} m3/s, v=${v} m/s`;
                },
            },
            'suction-line': {
                fields: { 'flow-rate': '0.005', 'velocity': '0.8' },
                sliders: [
                    { id: 'sizing-sl-flow', field: 'flow-rate', label: 'Vazao', unit: 'm3/s', min: 0.001, max: 0.03, step: 0.001, default: 0.005 },
                    { id: 'sizing-sl-vel', field: 'velocity', label: 'Velocidade', unit: 'm/s', min: 0.5, max: 2, step: 0.1, default: 0.8 },
                ],
                steps: [
                    'Use o caso de succao para trabalhar velocidades menores e maior diametro nominal.',
                    'Aumente a velocidade e compare o ganho de compacidade com o risco hidraulico associado.',
                    'Observe como o campo de diametro calculado alimenta a selecao do diametro real.',
                    'Salve dois cenarios e compare os DNs sugeridos.',
                ],
                activity: [
                    'Em qual faixa de velocidade a linha ainda se mantem coerente para succao de bomba?',
                ],
                scenarioSummaryFn: () => {
                    const q = document.getElementById('flow-rate')?.value;
                    const v = document.getElementById('velocity')?.value;
                    return `Q=${q} m3/s, v=${v} m/s`;
                },
            },
        },
        flow: {
            'water-pvc-dn100': {
                fields: {
                    'characteristic-diameter': '100',
                    'reynolds-velocity': '1.5',
                    'density': '998',
                    'dynamic-viscosity': '0.001',
                },
                sliders: [
                    { id: 'flow-sl-vel', field: 'reynolds-velocity', label: 'Velocidade', unit: 'm/s', min: 0.02, max: 5, step: 0.01, default: 1.5 },
                    { id: 'flow-sl-diam', field: 'characteristic-diameter', label: 'Diametro', unit: 'mm', min: 50, max: 300, step: 10, default: 100 },
                ],
                steps: [
                    'Observe o numero de Reynolds e localize o ponto operacional no Diagrama de Moody.',
                    'Reduza a velocidade para aproximar o sistema do regime laminar e acompanhe a mudanca no fator de atrito.',
                    'Varie o diametro para perceber o efeito da rugosidade relativa no ponto operacional.',
                    'Salve cenarios distintos e compare os pontos sobrepostos no grafico.',
                ],
                activity: [
                    'Qual velocidade leva este sistema para a fronteira laminar em DN100?',
                ],
                roughness: 0.0015,
                scenarioSummaryFn: () => {
                    const v = document.getElementById('reynolds-velocity')?.value;
                    const d = document.getElementById('characteristic-diameter')?.value;
                    return `v=${v} m/s, D=${d} mm`;
                },
            },
            'oil-steel-dn80': {
                fields: {
                    'characteristic-diameter': '80',
                    'reynolds-velocity': '0.5',
                    'density': '870',
                    'dynamic-viscosity': '0.05',
                },
                sliders: [
                    { id: 'flow-sl-vel', field: 'reynolds-velocity', label: 'Velocidade', unit: 'm/s', min: 0.1, max: 3, step: 0.1, default: 0.5 },
                    { id: 'flow-sl-diam', field: 'characteristic-diameter', label: 'Diametro', unit: 'mm', min: 50, max: 200, step: 10, default: 80 },
                ],
                steps: [
                    'Compare o escoamento viscoso com o caso de agua e veja como a viscosidade domina o Reynolds.',
                    'Aumente a velocidade para se aproximar da transicao de regime.',
                    'Use o diametro como variavel de comparacao para alterar a rugosidade relativa do ponto no Moody.',
                    'Salve e compare com o template de agua.',
                ],
                activity: [
                    'Qual velocidade minima produz turbulencia neste caso de oleo?',
                ],
                roughness: 0.045,
                scenarioSummaryFn: () => {
                    const v = document.getElementById('reynolds-velocity')?.value;
                    const d = document.getElementById('characteristic-diameter')?.value;
                    return `v=${v} m/s, D=${d} mm`;
                },
            },
            'air-duct-200': {
                fields: {
                    'characteristic-diameter': '200',
                    'reynolds-velocity': '3',
                    'density': '1.2',
                    'dynamic-viscosity': '0.0000181',
                },
                sliders: [
                    { id: 'flow-sl-vel', field: 'reynolds-velocity', label: 'Velocidade', unit: 'm/s', min: 0.2, max: 10, step: 0.2, default: 3 },
                    { id: 'flow-sl-diam', field: 'characteristic-diameter', label: 'Diametro hidraulico', unit: 'mm', min: 100, max: 500, step: 25, default: 200 },
                ],
                steps: [
                    'Observe como a combinacao de baixa densidade e baixa viscosidade desloca o ponto do ar no diagrama.',
                    'Leve o sistema para a zona de transicao reduzindo a velocidade.',
                    'Aumente a velocidade para notar a menor sensibilidade do fator de atrito em regime muito turbulento.',
                    'Salve e compare os tres fluidos estudados.',
                ],
                activity: [
                    'Que diametro minimo manteria a velocidade de ventilacao abaixo de 8 m/s?',
                ],
                roughness: 0.09,
                scenarioSummaryFn: () => {
                    const v = document.getElementById('reynolds-velocity')?.value;
                    const d = document.getElementById('characteristic-diameter')?.value;
                    return `v=${v} m/s, Dh=${d} mm`;
                },
            },
        },
        pump: {
            'standard-pump': {
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
                    'head-friction-factor': '2',
                    'npsh-required': '3',
                },
                sliders: [
                    { id: 'pump-sl-len', field: 'pipe-length', label: 'Comprimento', unit: 'm', min: 20, max: 300, step: 10, default: 100 },
                    { id: 'pump-sl-flow', field: 'headloss-flow-rate', label: 'Vazao', unit: 'm3/s', min: 0.005, max: 0.03, step: 0.001, default: 0.01 },
                    { id: 'pump-sl-elev', field: 'gauge-elevation', label: 'Cota de succao', unit: 'm', min: 0, max: 10, step: 0.5, default: 3 },
                ],
                steps: [
                    'Observe a curva de perda de carga para o caso base com agua.',
                    'Aumente o comprimento para ver a curva se deslocar e a perda de carga crescer.',
                    'Altere a cota de succao para enxergar o impacto direto na margem de NPSH.',
                    'Salve cenarios e compare a decomposicao da altura manometrica.',
                ],
                activity: [
                    'Qual vazao aproxima o sistema do limite de cavitacao neste arranjo?',
                ],
                scenarioSummaryFn: () => {
                    const l = document.getElementById('pipe-length')?.value;
                    const q = document.getElementById('headloss-flow-rate')?.value;
                    return `L=${l} m, Q=${q} m3/s`;
                },
            },
            'high-resistance': {
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
                    'npsh-required': '3',
                },
                sliders: [
                    { id: 'pump-sl-len', field: 'pipe-length', label: 'Comprimento', unit: 'm', min: 50, max: 400, step: 25, default: 200 },
                    { id: 'pump-sl-flow', field: 'headloss-flow-rate', label: 'Vazao', unit: 'm3/s', min: 0.002, max: 0.02, step: 0.001, default: 0.008 },
                    { id: 'pump-sl-elev', field: 'gauge-elevation', label: 'Cota de succao', unit: 'm', min: 0, max: 8, step: 0.5, default: 2 },
                ],
                steps: [
                    'Observe a penalizacao hidraulica do oleo em uma linha mais resistente.',
                    'Reduza a vazao para comparar como a perda de carga cai mais rapidamente.',
                    'Compare a margem de NPSH com o caso de agua.',
                    'Salve e compare os dois cenarios principais de operacao.',
                ],
                activity: [
                    'Que diametro seria necessario para reduzir hf sem alterar a vazao de projeto?',
                ],
                scenarioSummaryFn: () => {
                    const l = document.getElementById('pipe-length')?.value;
                    const q = document.getElementById('headloss-flow-rate')?.value;
                    return `L=${l} m, Q=${q} m3/s`;
                },
            },
        },
        reactor: {
            'first-order': {
                fields: {
                    'cstr-conversion': '0.8',
                    'cstr-rate-constant': '0.5',
                    'pfr-conversion': '0.8',
                    'pfr-rate-constant': '0.5',
                    'plot-rate-constant': '0.5',
                    'plot-max-conversion': '0.95',
                },
                sliders: [
                    { id: 'reactor-sl-conv', field: 'cstr-conversion', linkedField: 'pfr-conversion', extraFields: ['plot-max-conversion'], label: 'Conversao X', unit: '', min: 0.1, max: 0.95, step: 0.01, default: 0.8 },
                    { id: 'reactor-sl-k', field: 'cstr-rate-constant', linkedField: 'pfr-rate-constant', extraFields: ['plot-rate-constant'], label: 'Constante k', unit: 'min-1', min: 0.05, max: 2, step: 0.05, default: 0.5 },
                ],
                steps: [
                    'Use o template para comparar a eficiencia volumetrica de CSTR e PFR no diagrama de Levenspiel.',
                    'Aumente a conversao e note como o CSTR cresce mais rapidamente do que o PFR.',
                    'Aumente a constante cinetica para reduzir ambos os volumes sem alterar a tendencia relativa.',
                    'Salve cenarios e sobreponha as curvas de volume no grafico.',
                ],
                activity: [
                    'Em que faixa de conversao a diferenca relativa entre CSTR e PFR se torna mais visivel?',
                ],
                scenarioSummaryFn: () => {
                    const x = document.getElementById('cstr-conversion')?.value;
                    const k = document.getElementById('cstr-rate-constant')?.value;
                    return `X=${x}, k=${k}`;
                },
            },
            'second-order': {
                fields: {
                    'cstr-conversion': '0.6',
                    'cstr-rate-constant': '0.1',
                    'pfr-conversion': '0.6',
                    'pfr-rate-constant': '0.1',
                    'plot-rate-constant': '0.1',
                    'plot-max-conversion': '0.85',
                },
                sliders: [
                    { id: 'reactor-sl-conv', field: 'cstr-conversion', linkedField: 'pfr-conversion', extraFields: ['plot-max-conversion'], label: 'Conversao X', unit: '', min: 0.1, max: 0.9, step: 0.01, default: 0.6 },
                    { id: 'reactor-sl-k', field: 'cstr-rate-constant', linkedField: 'pfr-rate-constant', extraFields: ['plot-rate-constant'], label: 'Constante k', unit: 'L mol-1 min-1', min: 0.05, max: 1, step: 0.05, default: 0.1 },
                ],
                steps: [
                    'Compare um caso de segunda ordem com a referencia de primeira ordem no grafico de volume.',
                    'Aumente a conversao e observe como o crescimento de volume se torna mais severo.',
                    'Varie k para discutir o efeito combinado de cinetica mais lenta e conversao elevada.',
                    'Salve cenarios e compare as curvas sobrepostas.',
                ],
                activity: [
                    'Como a ordem da reacao altera a distancia entre as curvas de CSTR e PFR?',
                ],
                reactionOrders: [2, 0],
                scenarioSummaryFn: () => {
                    const x = document.getElementById('cstr-conversion')?.value;
                    const k = document.getElementById('cstr-rate-constant')?.value;
                    return `X=${x}, k=${k}`;
                },
            },
        },
        balance: {
            'simple-separation': {
                sliders: [
                    {
                        id: 'balance-sl-recycle',
                        label: 'Razao de reciclo',
                        unit: '',
                        min: 0,
                        max: 0.9,
                        step: 0.05,
                        default: 0.5,
                        apply: value => {
                            const input = document.querySelector('#splits-container .recycle-fraction');
                            if (input) input.value = value;
                        },
                    },
                    {
                        id: 'balance-sl-feed',
                        label: 'Fracao do componente principal',
                        unit: '',
                        min: 0.1,
                        max: 0.9,
                        step: 0.05,
                        default: 0.6,
                        apply: value => {
                            const input = document.querySelector('#streams-container .stream-form .composition-row .composition-value');
                            if (input) input.value = value;
                        },
                    },
                ],
                steps: [
                    'Carregue o exemplo do modulo e calcule o balanco para conferir o fechamento global.',
                    'Gere o grafico de correntes e compare entradas e saidas por corrente.',
                    'Ajuste manualmente as correntes do exemplo e recalcule.',
                    'Discuta com a turma como a conservacao de massa aparece no conjunto de resultados.',
                ],
                activity: [
                    'Que mudancas nas correntes de saida mantem o fechamento do balanco?',
                ],
                scenarioSummaryFn: () => {
                    return `correntes=${document.querySelectorAll('#streams-container .stream-form').length}`;
                },
            },
            'recycle-system': {
                sliders: [
                    {
                        id: 'balance-sl-recycle',
                        label: 'Razao de reciclo',
                        unit: '',
                        min: 0.1,
                        max: 0.9,
                        step: 0.05,
                        default: 0.5,
                        apply: value => {
                            const input = document.querySelector('#splits-container .recycle-fraction');
                            if (input) input.value = value;
                        },
                    },
                    {
                        id: 'balance-sl-feed',
                        label: 'Fracao do componente principal',
                        unit: '',
                        min: 0.1,
                        max: 0.9,
                        step: 0.05,
                        default: 0.5,
                        apply: value => {
                            const input = document.querySelector('#streams-container .stream-form .composition-row .composition-value');
                            if (input) input.value = value;
                        },
                    },
                ],
                steps: [
                    'Carregue o exemplo e concentre a discussao no efeito do reciclo sobre as correntes internas.',
                    'Use o slider de reciclo para ampliar ou reduzir a parcela retornada ao processo.',
                    'Altere a fracao do componente principal na alimentacao e compare o grafico de correntes.',
                    'Salve cenarios e discuta a sensibilidade do fechamento ao reciclo.',
                ],
                activity: [
                    'Em que faixa de reciclo o sistema passa a depender mais das correntes internas do que da alimentacao fresca?',
                ],
                scenarioSummaryFn: () => {
                    const recycle = document.querySelector('#splits-container .recycle-fraction')?.value;
                    return `reciclo=${recycle || '-'}`;
                },
            },
        },
    },

    init() {
        this.setupAccordions();
        this.setupExampleButtons();
        this.setupReynoldsValidation();
        this.setupSizingValidation();
        this.setupHeadlossValidation();
        this.setupNpshValidation();
        this.setupHeadValidation();
        this.initExploratoryPanels();
    },

    setupAccordions() {
        document.querySelectorAll('.accordion-trigger:not([data-acc-bound])').forEach(trigger => {
            trigger.dataset.accBound = '1';
            trigger.addEventListener('click', function () {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', String(!expanded));
                const content = document.getElementById(this.getAttribute('aria-controls'));
                if (content) content.classList.toggle('open', !expanded);
            });
        });
    },

    setupExampleButtons() {
        const examples = this.examples;
        document.querySelectorAll('.btn-example[data-example]:not([data-ex-bound])').forEach(btn => {
            btn.dataset.exBound = '1';
            btn.addEventListener('click', function () {
                const key = this.getAttribute('data-example');
                if (key === 'balance') {
                    if (window.BalanceModule) BalanceModule.loadExampleData();
                    return;
                }
                if (key === 'reactor') {
                    if (window.ReactorModule) ReactorModule.loadExampleData();
                    return;
                }
                const data = examples[key];
                if (!data) return;
                Object.entries(data).forEach(([id, value]) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.value = value;
                    el.classList.remove('field-invalid', 'field-valid');
                    if (el.tagName === 'SELECT') $(el).trigger('change');
                });
                if (key === 'pump') {
                    const method = document.getElementById('headloss-method');
                    if (method) { method.value = 'Darcy-Weisbach'; $(method).trigger('change'); }
                    const frictionCustom = document.querySelector('input[name="friction-factor-type"][value="custom"]');
                    if (frictionCustom) { frictionCustom.checked = true; frictionCustom.dispatchEvent(new Event('change')); }
                }
            });
        });
    },

    _setupFieldValidation(fields) {
        fields.forEach(({ id, label, rule = 'positive' }) => {
            const input = document.getElementById(id);
            if (!input) return;
            if (document.getElementById(`err-${id}`)) return;

            const errorEl = document.createElement('p');
            errorEl.id = `err-${id}`;
            errorEl.className = 'field-error-msg';
            errorEl.setAttribute('role', 'alert');
            errorEl.setAttribute('aria-live', 'polite');
            input.setAttribute('aria-describedby', `err-${id}`);
            input.parentNode.insertBefore(errorEl, input.nextSibling);

            const isValid = value => {
                if (rule === 'positive') return !isNaN(value) && value > 0;
                if (rule === 'nonneg') return !isNaN(value) && value >= 0;
                if (rule === 'number') return !isNaN(value);
                return true;
            };

            const errorMsg = {
                positive: `${label} deve ser um numero positivo (> 0).`,
                nonneg: `${label} deve ser >= 0.`,
                number: `${label} deve ser um numero valido.`,
            };

            input.addEventListener('blur', function () {
                if (this.value === '') {
                    this.classList.remove('field-invalid', 'field-valid');
                    errorEl.classList.remove('visible');
                    return;
                }
                const value = parseFloat(this.value);
                if (!isValid(value)) {
                    this.classList.add('field-invalid');
                    this.classList.remove('field-valid');
                    errorEl.textContent = errorMsg[rule];
                    errorEl.classList.add('visible');
                } else {
                    this.classList.remove('field-invalid');
                    this.classList.add('field-valid');
                    errorEl.classList.remove('visible');
                }
            });

            input.addEventListener('focus', function () {
                this.classList.remove('field-invalid');
                errorEl.classList.remove('visible');
            });
        });
    },

    setupReynoldsValidation() {
        this._setupFieldValidation([
            { id: 'characteristic-diameter', label: 'Diametro caracteristico', rule: 'positive' },
            { id: 'reynolds-velocity', label: 'Velocidade', rule: 'positive' },
            { id: 'density', label: 'Densidade', rule: 'positive' },
            { id: 'dynamic-viscosity', label: 'Viscosidade dinamica', rule: 'positive' },
            { id: 'kinematic-viscosity', label: 'Viscosidade cinematica', rule: 'positive' },
        ]);
    },

    setupSizingValidation() {
        this._setupFieldValidation([
            { id: 'flow-rate', label: 'Vazao', rule: 'positive' },
            { id: 'velocity', label: 'Velocidade', rule: 'positive' },
        ]);
    },

    setupHeadlossValidation() {
        this._setupFieldValidation([
            { id: 'pipe-length', label: 'Comprimento do tubo', rule: 'positive' },
            { id: 'headloss-diameter', label: 'Diametro', rule: 'positive' },
            { id: 'headloss-flow-rate', label: 'Vazao', rule: 'positive' },
            { id: 'headloss-friction-factor', label: 'Fator de atrito', rule: 'positive' },
            { id: 'headloss-velocity', label: 'Velocidade', rule: 'positive' },
        ]);
    },

    setupNpshValidation() {
        this._setupFieldValidation([
            { id: 'atmospheric-pressure', label: 'Pressao atmosferica', rule: 'positive' },
            { id: 'vapor-pressure', label: 'Pressao de vapor', rule: 'nonneg' },
            { id: 'specific-mass', label: 'Massa especifica', rule: 'positive' },
            { id: 'npsh-friction-factor', label: 'Perdas de carga', rule: 'nonneg' },
            { id: 'pump-inlet-velocity', label: 'Velocidade na entrada', rule: 'positive' },
        ]);
    },

    setupHeadValidation() {
        this._setupFieldValidation([
            { id: 'velocity1', label: 'Velocidade no Ponto 1', rule: 'nonneg' },
            { id: 'velocity2', label: 'Velocidade no Ponto 2', rule: 'nonneg' },
            { id: 'head-specific-mass', label: 'Massa especifica', rule: 'positive' },
        ]);
    },

    initExploratoryPanels() {
        ['sizing', 'flow', 'pump'].forEach(moduleKey => this._bindExploratoryPanel(moduleKey));
    },

    initDynamicExploratoryPanel(moduleKey) {
        if (moduleKey === 'reactor') this._injectReactorPanel();
        if (moduleKey === 'balance') this._injectBalancePanel();
        this._bindExploratoryPanel(moduleKey);
    },

    _injectDynamicPanels() {
        this._injectReactorPanel();
        this._injectBalancePanel();
    },

    _injectReactorPanel() {
        const container = document.getElementById('reactor-content');
        if (!container || container.querySelector('#reactor-exploratory')) return;

        const panel = document.createElement('div');
        panel.id = 'reactor-exploratory';
        panel.className = 'exploratory-panel';
        panel.innerHTML = `
            <div class="exp-header">
                <span class="exp-title">&#127891; Modo Exploratório</span>
                <select class="template-select" id="reactor-template-select">
                    <option value="">Selecione um template didático</option>
                    <option value="first-order">Reação de 1a ordem - A para B</option>
                    <option value="second-order">Reação de 2a ordem - A para B</option>
                </select>
            </div>
            <div class="sliders-section hidden" id="reactor-sliders"></div>
            <div class="guided-steps hidden" id="reactor-steps"></div>
            <div class="exploratory-visuals hidden" id="reactor-exploratory-visuals">
                <div class="exploratory-visual-card" id="reactor-exploratory-summary"></div>
                <div class="exploratory-visual-card" id="reactor-exploratory-chart"></div>
            </div>
            <div class="scenario-panel hidden" id="reactor-scenario-panel">
                <div class="scenario-panel-header">
                    <span class="scenario-panel-title">Comparação de cenários</span>
                    <div class="scenario-actions">
                        <button class="btn-save-scenario" id="reactor-save-scenario" type="button">Salvar cenário</button>
                        <button class="btn-clear-scenarios" id="reactor-clear-scenarios" type="button">Limpar</button>
                    </div>
                </div>
                <div class="scenario-list" id="reactor-scenario-list"></div>
            </div>
        `;
        container.appendChild(panel);
    },

    _injectBalancePanel() {
        const container = document.getElementById('balance-content');
        if (!container || container.querySelector('#balance-exploratory')) return;

        const panel = document.createElement('div');
        panel.id = 'balance-exploratory';
        panel.className = 'exploratory-panel';
        panel.innerHTML = `
            <div class="exp-header">
                <span class="exp-title">&#127891; Modo Exploratório</span>
                <select class="template-select" id="balance-template-select">
                    <option value="">Selecione um template didático</option>
                    <option value="simple-separation">Separação simples - alimentação de 100 mol/h</option>
                    <option value="recycle-system">Sistema com reciclo - razão de reciclo 50%</option>
                </select>
            </div>
            <div class="sliders-section hidden" id="balance-sliders"></div>
            <div class="guided-steps hidden" id="balance-steps"></div>
            <div class="exploratory-visuals hidden" id="balance-exploratory-visuals">
                <div class="exploratory-visual-card" id="balance-exploratory-summary"></div>
                <div class="exploratory-visual-card" id="balance-exploratory-chart"></div>
            </div>
            <div class="scenario-panel hidden" id="balance-scenario-panel">
                <div class="scenario-panel-header">
                    <span class="scenario-panel-title">Comparação de cenários</span>
                    <div class="scenario-actions">
                        <button class="btn-save-scenario" id="balance-save-scenario" type="button">Salvar cenário</button>
                        <button class="btn-clear-scenarios" id="balance-clear-scenarios" type="button">Limpar</button>
                    </div>
                </div>
                <div class="scenario-list" id="balance-scenario-list"></div>
            </div>
        `;
        container.appendChild(panel);
    },

    _bindExploratoryPanel(moduleKey) {
        const panel = document.getElementById(`${moduleKey}-exploratory`);
        const select = document.getElementById(`${moduleKey}-template-select`);
        if (!panel || !select) return;

        panel.classList.remove('hidden');
        if (select.dataset.expBound === '1') return;

        select.dataset.expBound = '1';
        select.addEventListener('change', async () => {
            if (!select.value) {
                this._resetExploratoryPanel(moduleKey);
                return;
            }
            await this._applyTemplate(moduleKey, select.value);
        });
    },

    _resetExploratoryPanel(moduleKey) {
        ['sliders', 'steps', 'scenario-panel', 'exploratory-visuals'].forEach(suffix => {
            const el = document.getElementById(`${moduleKey}-${suffix}`);
            if (el) el.classList.add('hidden');
        });
    },

    async _applyTemplate(moduleKey, templateKey) {
        const tpl = this.pedagogicTemplates[moduleKey]?.[templateKey];
        if (!tpl) return;

        this._activeTemplates[moduleKey] = templateKey;

        if (moduleKey === 'reactor') {
            await this._prepareReactorTemplate(tpl);
        } else if (moduleKey === 'balance') {
            await this._prepareBalanceTemplate(tpl);
        }

        if (tpl.fields) {
            Object.entries(tpl.fields).forEach(([id, value]) => this._setFieldValue(id, value));
        }

        if (tpl.sliders) {
            this._buildSliders(moduleKey, tpl);
        } else {
            const sliders = document.getElementById(`${moduleKey}-sliders`);
            if (sliders) sliders.classList.add('hidden');
        }

        this._renderGuidedSteps(moduleKey, tpl);
        this._setupScenarioButtons(moduleKey, tpl);

        const scenarioPanel = document.getElementById(`${moduleKey}-scenario-panel`);
        if (scenarioPanel) scenarioPanel.classList.remove('hidden');

        await this._runModuleCalculation(moduleKey, tpl);
        this._renderExploratoryVisuals(moduleKey);
        this._scrollExploratoryPanelIntoView(moduleKey);
    },

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

    _setFieldValue(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (el.tagName === 'SELECT' && window.$) $(el).trigger('change');
    },

    _buildSliders(moduleKey, tpl) {
        const container = document.getElementById(`${moduleKey}-sliders`);
        if (!container) return;

        container.innerHTML = '';
        container.classList.remove('hidden');

        tpl.sliders.forEach(cfg => {
            const group = document.createElement('div');
            group.className = 'param-slider-group';

            const label = document.createElement('label');
            label.textContent = cfg.label;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'slider-value';
            valueSpan.textContent = `${cfg.default}${cfg.unit ? ` ${cfg.unit}` : ''}`;
            label.appendChild(valueSpan);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = cfg.id;
            slider.min = cfg.min;
            slider.max = cfg.max;
            slider.step = cfg.step;
            slider.value = cfg.default;

            const limits = document.createElement('div');
            limits.className = 'slider-limits';
            limits.innerHTML = `<span>${cfg.min}${cfg.unit ? ` ${cfg.unit}` : ''}</span><span>${cfg.max}${cfg.unit ? ` ${cfg.unit}` : ''}</span>`;

            group.appendChild(label);
            group.appendChild(slider);
            group.appendChild(limits);
            container.appendChild(group);

            let debounceTimer = null;
            slider.addEventListener('input', () => {
                valueSpan.textContent = `${slider.value}${cfg.unit ? ` ${cfg.unit}` : ''}`;
                if (cfg.apply) {
                    cfg.apply(slider.value);
                } else if (cfg.field) {
                    this._setFieldValue(cfg.field, slider.value);
                }
                if (cfg.linkedField) this._setFieldValue(cfg.linkedField, slider.value);
                (cfg.extraFields || []).forEach(fieldId => this._setFieldValue(fieldId, slider.value));

                clearTimeout(debounceTimer);
                debounceTimer = window.setTimeout(() => {
                    this._runModuleCalculation(moduleKey, tpl);
                }, 300);
            });
        });
    },

    _renderGuidedSteps(moduleKey, tpl) {
        const container = document.getElementById(`${moduleKey}-steps`);
        if (!container) return;

        container.innerHTML = '';
        container.classList.remove('hidden');

        const title = document.createElement('div');
        title.className = 'steps-title';
        title.textContent = 'Roteiro de exploração';
        container.appendChild(title);

        (tpl.steps || []).forEach((text, index) => {
            const step = document.createElement('div');
            step.className = 'guided-step';

            const number = document.createElement('span');
            number.className = 'step-num';
            number.textContent = String(index + 1);

            const content = document.createElement('span');
            content.textContent = text;

            step.appendChild(number);
            step.appendChild(content);
            container.appendChild(step);
        });

        if ((tpl.activity || []).length > 0) {
            const activityTitle = document.createElement('div');
            activityTitle.className = 'steps-title';
            activityTitle.textContent = 'Atividade';
            container.appendChild(activityTitle);

            tpl.activity.forEach((text, index) => {
                const step = document.createElement('div');
                step.className = 'guided-step step-activity';

                const number = document.createElement('span');
                number.className = 'step-num';
                number.textContent = String(index + 1);

                const content = document.createElement('span');
                content.textContent = text;

                step.appendChild(number);
                step.appendChild(content);
                container.appendChild(step);
            });
        }
    },

    _setupScenarioButtons(moduleKey, tpl) {
        const saveBtn = document.getElementById(`${moduleKey}-save-scenario`);
        const clearBtn = document.getElementById(`${moduleKey}-clear-scenarios`);
        if (!saveBtn || !clearBtn) return;

        saveBtn.onclick = () => this._saveScenario(moduleKey, tpl);
        clearBtn.onclick = () => this._clearScenarios(moduleKey);
    },

    _saveScenario(moduleKey, tpl) {
        if (!this._scenarios[moduleKey]) this._scenarios[moduleKey] = [];
        const scenarios = this._scenarios[moduleKey];
        if (scenarios.length >= 3) {
            UI.showError('Limite atingido', 'Use no máximo 3 cenários por módulo.');
            return;
        }

        const summary = tpl.scenarioSummaryFn ? tpl.scenarioSummaryFn() : `Cenário ${scenarios.length + 1}`;
        scenarios.push({
            name: summary,
            summary,
            color: this._scenarioColors[scenarios.length],
            chartDatasets: this._captureChartDatasets(moduleKey),
        });
        this._renderScenarioList(moduleKey);
    },

    _captureChartDatasets(moduleKey) {
        const chart = {
            flow: window.FlowModule?._moodyChart,
            pump: window.PumpModule?._headlossChart,
            reactor: window.ReactorModule?._reactorChart,
            balance: window.BalanceModule?._balanceChart,
        }[moduleKey];
        if (!chart) return null;

        return chart.data.datasets.map(dataset => ({
            label: dataset.label,
            data: Array.isArray(dataset.data) ? dataset.data.map(point => ({ ...point })) : dataset.data,
        }));
    },

    _renderScenarioList(moduleKey) {
        const listEl = document.getElementById(`${moduleKey}-scenario-list`);
        if (!listEl) return;

        listEl.innerHTML = '';
        const scenarios = this._scenarios[moduleKey] || [];
        scenarios.forEach((scenario, index) => {
            const item = document.createElement('div');
            item.className = 'scenario-item';

            const dot = document.createElement('span');
            dot.className = 'scenario-color-dot';
            dot.style.background = scenario.color;

            const nameInput = document.createElement('input');
            nameInput.className = 'scenario-name';
            nameInput.value = scenario.name;
            nameInput.addEventListener('input', () => {
                scenarios[index].name = nameInput.value;
                this._overlayScenarios(moduleKey);
            });

            const summary = document.createElement('span');
            summary.className = 'scenario-summary';
            summary.textContent = scenario.summary;

            item.appendChild(dot);
            item.appendChild(nameInput);
            item.appendChild(summary);
            listEl.appendChild(item);
        });

        this._overlayScenarios(moduleKey);
    },

    _overlayScenarios(moduleKey) {
        const chart = {
            flow: window.FlowModule?._moodyChart,
            pump: window.PumpModule?._headlossChart,
            reactor: window.ReactorModule?._reactorChart,
            balance: window.BalanceModule?._balanceChart,
        }[moduleKey];
        if (!chart) return;

        const baseDatasets = chart.data.datasets.filter(dataset => !dataset._scenario);
        const scenarios = this._scenarios[moduleKey] || [];
        const scenarioDatasets = [];

        scenarios.forEach(scenario => {
            if (!scenario.chartDatasets) return;
            scenario.chartDatasets.forEach(dataset => {
                scenarioDatasets.push({
                    ...dataset,
                    label: `[${scenario.name}] ${dataset.label}`,
                    borderColor: scenario.color,
                    backgroundColor: `${scenario.color}33`,
                    borderDash: [6, 4],
                    pointRadius: dataset.pointRadius ?? 0,
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

        const chart = {
            flow: window.FlowModule?._moodyChart,
            pump: window.PumpModule?._headlossChart,
            reactor: window.ReactorModule?._reactorChart,
            balance: window.BalanceModule?._balanceChart,
        }[moduleKey];
        if (!chart) return;

        chart.data.datasets = chart.data.datasets.filter(dataset => !dataset._scenario);
        chart.update();
    },

    async _runModuleCalculation(moduleKey, tpl) {
        if (moduleKey === 'sizing') {
            await this._runSizingCalculation();
        } else if (moduleKey === 'flow') {
            await this._runFlowCalculation(tpl);
        } else if (moduleKey === 'pump') {
            await this._runPumpCalculation();
        } else if (moduleKey === 'reactor') {
            await this._runReactorCalculation();
        } else if (moduleKey === 'balance') {
            await this._runBalanceCalculation();
        }

        if ((this._scenarios[moduleKey] || []).length > 0) {
            this._overlayScenarios(moduleKey);
        }
    },

    async _runSizingCalculation() {
        const flowRate = document.getElementById('flow-rate')?.value;
        const velocity = document.getElementById('velocity')?.value;
        if (!flowRate || !velocity || !window.SizingModule) return;

        await SizingModule.calculateDiameter(flowRate, velocity);
        this._selectPreferredOption('real-diameter-schedule', ['SCH 40', '40']);
        const calculatedDiameter = document.getElementById('calculated-diameter')?.value;
        const schedule = document.getElementById('real-diameter-schedule')?.value;
        if (calculatedDiameter && schedule) {
            await SizingModule.getRealDiameter(calculatedDiameter, schedule);
        }
    },

    async _runFlowCalculation(tpl) {
        if (!window.FlowModule) return;

        const params = {
            characteristic_diameter: parseFloat(document.getElementById('characteristic-diameter')?.value || '0'),
            velocity: parseFloat(document.getElementById('reynolds-velocity')?.value || '0'),
        };
        const density = document.getElementById('density')?.value;
        const dynamicViscosity = document.getElementById('dynamic-viscosity')?.value;
        if (density && dynamicViscosity) {
            params.density = parseFloat(density);
            params.dynamic_viscosity = parseFloat(dynamicViscosity);
        }

        await FlowModule.calculateReynolds(params);

        const roughnessType = document.querySelector('input[name="roughness-type"][value="custom"]');
        const diameterType = document.querySelector('input[name="diameter-type"][value="custom"]');
        if (roughnessType) {
            roughnessType.checked = true;
            roughnessType.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (diameterType) {
            diameterType.checked = true;
            diameterType.dispatchEvent(new Event('change', { bubbles: true }));
        }

        this._setFieldValue('custom-roughness', String(tpl.roughness || 0.0015));
        this._setFieldValue('custom-diameter', document.getElementById('characteristic-diameter')?.value || '100');
        this._selectFirstMeaningfulOption('friction-factor-method');

        const reynolds = document.getElementById('reynolds-number')?.value;
        const method = document.getElementById('friction-factor-method')?.value;
        const roughness = document.getElementById('custom-roughness')?.value;
        const diameter = document.getElementById('custom-diameter')?.value;
        if (reynolds && method && roughness && diameter) {
            await FlowModule.calculateFrictionFactor(roughness, diameter, reynolds, method);
        }
    },

    async _runPumpCalculation() {
        if (!window.PumpModule) return;

        this._selectPreferredOption('headloss-method', ['Darcy-Weisbach']);
        const frictionType = document.querySelector('input[name="friction-factor-type"][value="custom"]');
        if (frictionType) {
            frictionType.checked = true;
            frictionType.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const diameter = parseFloat(document.getElementById('headloss-diameter')?.value || '0');
        const flowRate = document.getElementById('headloss-flow-rate')?.value;
        const velocity = document.getElementById('headloss-velocity')?.value;
        const resolved = PumpModule._resolveHeadlossFlowVelocity(diameter, flowRate, velocity);
        if (resolved.error) return;

        await PumpModule.calculateHeadloss({
            pipe_length: parseFloat(document.getElementById('pipe-length')?.value || '0'),
            diameter,
            method: document.getElementById('headloss-method')?.value || 'Darcy-Weisbach',
            flow_rate: resolved.flow_rate,
            velocity: resolved.velocity,
            friction_factor: parseFloat(document.getElementById('headloss-friction-factor')?.value || '0'),
        });

        await PumpModule.calculateNPSHAvailable({
            manometric_pressure: parseFloat(document.getElementById('manometric-pressure')?.value || '0'),
            atmospheric_pressure: parseFloat(document.getElementById('atmospheric-pressure')?.value || '0'),
            vapor_pressure: parseFloat(document.getElementById('vapor-pressure')?.value || '0'),
            density: parseFloat(document.getElementById('specific-mass')?.value || '0'),
            friction_factor: parseFloat(document.getElementById('npsh-friction-factor')?.value || '0'),
            pump_inlet_velocity: parseFloat(document.getElementById('pump-inlet-velocity')?.value || '0'),
            gauge_elevation: parseFloat(document.getElementById('gauge-elevation')?.value || '0'),
        });

        await PumpModule.calculateHead({
            pressure1: parseFloat(document.getElementById('pressure1')?.value || '0'),
            pressure2: parseFloat(document.getElementById('pressure2')?.value || '0'),
            elevation1: parseFloat(document.getElementById('elevation1')?.value || '0'),
            elevation2: parseFloat(document.getElementById('elevation2')?.value || '0'),
            velocity1: parseFloat(document.getElementById('velocity1')?.value || '0'),
            velocity2: parseFloat(document.getElementById('velocity2')?.value || '0'),
            density: parseFloat(document.getElementById('head-specific-mass')?.value || '0'),
            friction_factor: parseFloat(document.getElementById('head-friction-factor')?.value || '0'),
        });
    },

    async _prepareReactorTemplate(tpl) {
        if (!window.ReactorModule) return;
        await this._waitFor(() => Array.isArray(ReactorModule.componentsList) && ReactorModule.componentsList.length > 0, 20, 100);
        ReactorModule.loadExampleData();
        if (tpl.reactionOrders) {
            await this._waitFor(() => document.querySelectorAll('#cstr-reaction-orders-container .reaction-order').length > 0, 20, 100);
            document.querySelectorAll('#cstr-reaction-orders-container .reaction-order').forEach((input, index) => {
                input.value = tpl.reactionOrders[index] ?? input.value;
            });
            document.querySelectorAll('#pfr-reaction-orders-container .reaction-order').forEach((input, index) => {
                input.value = tpl.reactionOrders[index] ?? input.value;
            });
            document.querySelectorAll('#plot-reaction-orders-container .reaction-order').forEach((input, index) => {
                input.value = tpl.reactionOrders[index] ?? input.value;
            });
        }
        this._setFieldValue('cstr-input-type', 'conversion_and_kinetics');
        this._setFieldValue('pfr-input-type', 'conversion_and_kinetics');
        this._setFieldValue('plot-max-conversion', tpl.fields['plot-max-conversion']);
        this._setFieldValue('plot-rate-constant', tpl.fields['plot-rate-constant']);
    },

    async _runReactorCalculation() {
        if (!window.ReactorModule) return;
        await ReactorModule.calculateReactor('cstr');
        await ReactorModule.calculateReactor('pfr');
        await ReactorModule.generateConversionVolumePlot();
    },

    async _prepareBalanceTemplate(tpl) {
        if (!window.BalanceModule) return;
        await BalanceModule.loadExampleData();
        await this._waitFor(() => document.querySelector('#streams-container .stream-form'), 20, 100);
        tpl.sliders?.forEach(cfg => {
            if (cfg.apply) cfg.apply(cfg.default);
        });
    },

    async _runBalanceCalculation() {
        if (!window.BalanceModule) return;
        await BalanceModule.calculateMassBalance();
        await BalanceModule.generatePlot();
    },

    _selectFirstMeaningfulOption(id) {
        const select = document.getElementById(id);
        if (!select || select.value) return;
        const option = Array.from(select.options).find(item => item.value);
        if (!option) return;
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
    },

    _selectPreferredOption(id, patterns) {
        const select = document.getElementById(id);
        if (!select) return;
        const options = Array.from(select.options);
        const match = options.find(option => patterns.some(pattern => option.textContent.includes(pattern) || option.value.includes(pattern)));
        const fallback = options.find(option => option.value);
        const chosen = match || fallback;
        if (!chosen) return;
        select.value = chosen.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.$) $(select).trigger('change');
    },

    async _waitFor(predicate, attempts = 10, delayMs = 100) {
        for (let index = 0; index < attempts; index += 1) {
            if (predicate()) return true;
            await new Promise(resolve => window.setTimeout(resolve, delayMs));
        }
        return false;
    },
};

window.DidaticModule = DidaticModule;
