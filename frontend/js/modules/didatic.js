const DidaticModule = {

    examples: {
        sizing: {
            'flow-rate':  '0.01',
            'velocity':   '1.5',
        },
        flow: {
            'characteristic-diameter': '100',
            'reynolds-velocity':        '2',
            'density':                  '998',
            'dynamic-viscosity':        '0.001',
        },
        pump: {
            'pipe-length':              '100',
            'headloss-diameter':        '100',
            'headloss-friction-factor': '0.018',
            'headloss-velocity':        '2',
            'manometric-pressure':  '0',
            'atmospheric-pressure': '1.033',
            'vapor-pressure':       '0.023',
            'specific-mass':        '998',
            'npsh-friction-factor': '2',
            'pump-inlet-velocity':  '2',
            'gauge-elevation':      '3',
            'pressure1':            '0',
            'pressure2':            '200000',
            'elevation1':           '0',
            'elevation2':           '5',
            'velocity1':            '1',
            'velocity2':            '2',
            'head-specific-mass':   '998',
            'head-friction-factor': '3',
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
    },

    // -----------------------------------------------------------------------
    // Acordeões "Como funciona"
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // "Carregar exemplo"
    // -----------------------------------------------------------------------
    setupExampleButtons() {
        const examples = this.examples;
        document.querySelectorAll('.btn-example[data-example]').forEach(btn => {
            btn.addEventListener('click', function () {
                const key = this.getAttribute('data-example');
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
                }
            });
        });
    },

    // -----------------------------------------------------------------------
    // Helper genérico de validação inline (blur)
    // -----------------------------------------------------------------------
    _setupFieldValidation(fields) {
        fields.forEach(({ id, label, rule = 'positive' }) => {
            const input = document.getElementById(id);
            if (!input) return;

            // Não duplicar elementos de erro
            if (document.getElementById('err-' + id)) return;

            const errorEl = document.createElement('p');
            errorEl.id = 'err-' + id;
            errorEl.className = 'field-error-msg';
            errorEl.setAttribute('role', 'alert');
            errorEl.setAttribute('aria-live', 'polite');
            input.setAttribute('aria-describedby', 'err-' + id);
            input.parentNode.insertBefore(errorEl, input.nextSibling);

            const isValid = (val) => {
                if (rule === 'positive') return !isNaN(val) && val > 0;
                if (rule === 'nonneg')   return !isNaN(val) && val >= 0;
                if (rule === 'number')   return !isNaN(val);
                return true;
            };

            const errorMsg = {
                positive: `${label} deve ser um número positivo (> 0).`,
                nonneg:   `${label} deve ser ≥ 0.`,
                number:   `${label} deve ser um número válido.`,
            };

            input.addEventListener('blur', function () {
                if (this.value === '') {
                    this.classList.remove('field-invalid', 'field-valid');
                    errorEl.classList.remove('visible');
                    return;
                }
                const val = parseFloat(this.value);
                if (!isValid(val)) {
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

    // -----------------------------------------------------------------------
    // Validações por formulário
    // -----------------------------------------------------------------------
    setupReynoldsValidation() {
        this._setupFieldValidation([
            { id: 'characteristic-diameter', label: 'Diâmetro característico', rule: 'positive' },
            { id: 'reynolds-velocity',        label: 'Velocidade',              rule: 'positive' },
            { id: 'density',                  label: 'Densidade',               rule: 'positive' },
            { id: 'dynamic-viscosity',        label: 'Viscosidade dinâmica',    rule: 'positive' },
            { id: 'kinematic-viscosity',      label: 'Viscosidade cinemática',  rule: 'positive' },
        ]);
    },

    setupSizingValidation() {
        this._setupFieldValidation([
            { id: 'flow-rate', label: 'Vazão',       rule: 'positive' },
            { id: 'velocity',  label: 'Velocidade',  rule: 'positive' },
        ]);
    },

    setupHeadlossValidation() {
        this._setupFieldValidation([
            { id: 'pipe-length',              label: 'Comprimento do tubo', rule: 'positive' },
            { id: 'headloss-diameter',        label: 'Diâmetro',            rule: 'positive' },
            { id: 'headloss-friction-factor', label: 'Fator de atrito',     rule: 'positive' },
            { id: 'headloss-velocity',        label: 'Velocidade',          rule: 'positive' },
        ]);
    },

    setupNpshValidation() {
        this._setupFieldValidation([
            { id: 'atmospheric-pressure', label: 'Pressão atmosférica',       rule: 'positive' },
            { id: 'vapor-pressure',       label: 'Pressão de vapor',          rule: 'nonneg'   },
            { id: 'specific-mass',        label: 'Massa específica',          rule: 'positive' },
            { id: 'npsh-friction-factor', label: 'Perdas de carga (hf)',      rule: 'nonneg'   },
            { id: 'pump-inlet-velocity',  label: 'Velocidade na entrada',     rule: 'positive' },
        ]);
    },

    setupHeadValidation() {
        this._setupFieldValidation([
            { id: 'velocity1',          label: 'Velocidade no Ponto 1', rule: 'nonneg'   },
            { id: 'velocity2',          label: 'Velocidade no Ponto 2', rule: 'nonneg'   },
            { id: 'head-specific-mass', label: 'Massa específica',      rule: 'positive' },
        ]);
    },
};

window.DidaticModule = DidaticModule;
