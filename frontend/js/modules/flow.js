/**
 * Flow Module for Chemical Engineering Calculator
 * Handles flow-related calculations
 */

const FlowModule = {
    _lastFrictionState: null,
    /**
     * Initialize the Flow module
     */
    init() {
        this.loadFrictionFactorMethods();
        this.loadHydraulicDiameterShapes();
        this.loadCompositions();
        this.loadSchedules();
        this.setupEventListeners();
    },

    /**
     * Set up event listeners for the Flow module
     */
    setupEventListeners() {
        // Reynolds form submit handler
        document.getElementById('reynolds-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const characteristicDiameter = document.getElementById('characteristic-diameter').value;
            const velocity = document.getElementById('reynolds-velocity').value;
            const density = document.getElementById('density').value;
            const dynamicViscosity = document.getElementById('dynamic-viscosity').value;
            const kinematicViscosity = document.getElementById('kinematic-viscosity').value;
            
            if (!characteristicDiameter || !velocity) {
                UI.showError('Dados incompletos', 'Informe o diâmetro característico e a velocidade');
                return;
            }
            
            if ((!density || !dynamicViscosity) && !kinematicViscosity) {
                UI.showError('Dados incompletos', 'Informe densidade e viscosidade dinâmica, ou viscosidade cinemática');
                return;
            }
            
            const params = {
                characteristic_diameter: parseFloat(characteristicDiameter),
                velocity: parseFloat(velocity)
            };
            
            if (density && dynamicViscosity) {
                params.density = parseFloat(density);
                params.dynamic_viscosity = parseFloat(dynamicViscosity);
            } else if (kinematicViscosity) {
                params.kinematic_viscosity = parseFloat(kinematicViscosity);
            }
            
            await this.calculateReynolds(params);
        });

        // Friction factor form submit handler
        document.getElementById('friction-factor-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const reynolds = document.getElementById('reynolds-number').value;
            const method = document.getElementById('friction-factor-method').value;
            const roughnessType = document.querySelector('input[name="roughness-type"]:checked').value;
            const diameterType = document.querySelector('input[name="diameter-type"]:checked').value;
            
            let roughness;
            if (roughnessType === 'custom') {
                roughness = document.getElementById('custom-roughness').value;
                if (!roughness) {
                    UI.showError('Dados incompletos', 'Informe um valor de rugosidade personalizado');
                    return;
                }
            } else {
                const composition = document.getElementById('flow-composition-select').value;
                if (!composition) {
                    UI.showError('Dados incompletos', 'Selecione uma composição de material');
                    return;
                }
                
                // Get roughness from composition
                try {
                    const compositionDetails = await API.getCompositionDetails(composition);
                    roughness = compositionDetails.specifications.roughness.value;
                } catch (error) {
                    UI.showError('Erro', 'Não foi possível obter a rugosidade da composição');
                    return;
                }
            }
            
            let diameter;
            if (diameterType === 'custom') {
                diameter = document.getElementById('custom-diameter').value;
                if (!diameter) {
                    UI.showError('Dados incompletos', 'Informe um valor de diâmetro personalizado');
                    return;
                }
            } else {
                const schedule = document.getElementById('flow-schedule-select').value;
                const selectedDiameter = document.getElementById('flow-diameter-select').value;
                
                if (!schedule || !selectedDiameter) {
                    UI.showError('Dados incompletos', 'Selecione schedule e diâmetro');
                    return;
                }
                
                diameter = selectedDiameter;
            }
            
            if (!reynolds || !method) {
                UI.showError('Dados incompletos', 'Preencha todos os campos obrigatórios');
                return;
            }
            
            await this.calculateFrictionFactor(roughness, diameter, reynolds, method);
        });

        // Hydraulic diameter form submit handler
        document.getElementById('hydraulic-diameter-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const shape = document.getElementById('hydraulic-shape').value;
            if (!shape) {
                UI.showError('Dados incompletos', 'Selecione uma forma');
                return;
            }
            
            const params = { shape };
            
            // Add shape-specific parameters
            const shapeParameters = document.querySelectorAll('#shape-parameters input');
            let missingParams = false;
            
            shapeParameters.forEach(input => {
                if (!input.value) {
                    missingParams = true;
                    return;
                }
                params[input.name] = parseFloat(input.value);
            });
            
            if (missingParams) {
                UI.showError('Dados incompletos', 'Preencha todos os parâmetros da forma selecionada');
                return;
            }
            
            await this.calculateHydraulicDiameter(params);
        });

        // Hydraulic shape select change handler
        $('#hydraulic-shape').on('change', (e) => {
            this.updateShapeParameters(e.target.value);
        });
        
        // Roughness type radio button change handler
        document.querySelectorAll('input[name="roughness-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleRoughnessInput(e.target.value);
            });
        });
        
        // Diameter type radio button change handler
        document.querySelectorAll('input[name="diameter-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleDiameterInput(e.target.value);
            });
        });
        
        // Schedule change handler for loading diameters
        $('#flow-schedule-select').on('change', async (e) => {
            await this.loadDiameters(e.target.value);
        });
    },

    /**
     * Toggle between custom roughness input and composition selection
     * @param {string} type - Type of roughness input ('custom' or 'composition')
     */
    toggleRoughnessInput(type) {
        const customRoughnessContainer = document.getElementById('custom-roughness-container');
        const compositionContainer = document.getElementById('flow-composition-container');
        
        if (type === 'custom') {
            customRoughnessContainer.classList.remove('hidden');
            compositionContainer.classList.add('hidden');
        } else {
            customRoughnessContainer.classList.add('hidden');
            compositionContainer.classList.remove('hidden');
        }
    },
    
    /**
     * Toggle between custom diameter input and schedule/diameter selection
     * @param {string} type - Type of diameter input ('custom' or 'schedule')
     */
    toggleDiameterInput(type) {
        const customDiameterContainer = document.getElementById('custom-diameter-container');
        const scheduleDiameterContainer = document.getElementById('flow-schedule-diameter-container');
        
        if (type === 'custom') {
            customDiameterContainer.classList.remove('hidden');
            scheduleDiameterContainer.classList.add('hidden');
        } else {
            customDiameterContainer.classList.add('hidden');
            scheduleDiameterContainer.classList.remove('hidden');
        }
    },

    /**
     * Load friction factor methods from the API
     */
    async loadFrictionFactorMethods() {
        try {
            UI.showLoading('#friction-factor-method');
            
            const methods = await API.getFrictionFactorMethods();
            const select = document.getElementById('friction-factor-method');
            
            select.innerHTML = '<option value="">Selecione um método</option>';
            
            methods.forEach(method => {
                const option = document.createElement('option');
                option.value = method;
                option.textContent = method;
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Erro ao carregar métodos de fator de atrito', error);
        } finally {
            UI.hideLoading('#friction-factor-method');
        }
    },

    /**
     * Load compositions from the API
     */
    async loadCompositions() {
        try {
            UI.showLoading('#flow-composition-select');
            
            const compositions = await API.getCompositions();
            const select = document.getElementById('flow-composition-select');
            
            select.innerHTML = '<option value="">Selecione uma composição</option>';
            
            compositions.forEach(composition => {
                const option = document.createElement('option');
                option.value = composition;
                option.textContent = composition;
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Erro ao carregar composições', error);
        } finally {
            UI.hideLoading('#flow-composition-select');
        }
    },
    
    /**
     * Load schedules from the API
     */
    async loadSchedules() {
        try {
            UI.showLoading('#flow-schedule-select');
            
            const schedules = await API.getSchedules();
            const select = document.getElementById('flow-schedule-select');
            
            select.innerHTML = '<option value="">Selecione um schedule</option>';
            
            // Check if schedules is an array or object and handle accordingly
            if (schedules) {
                if (Array.isArray(schedules)) {
                    schedules.forEach(schedule => {
                        const option = document.createElement('option');
                        option.value = typeof schedule === 'object' ? schedule.name : schedule;
                        option.textContent = typeof schedule === 'object' ? schedule.name : schedule;
                        select.appendChild(option);
                    });
                } else if (typeof schedules === 'object') {
                    Object.keys(schedules).forEach(scheduleName => {
                        const option = document.createElement('option');
                        option.value = scheduleName;
                        option.textContent = scheduleName;
                        select.appendChild(option);
                    });
                }
            }
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Erro ao carregar schedules', error);
        } finally {
            UI.hideLoading('#flow-schedule-select');
        }
    },
    
    /**
     * Load diameters for a specific schedule from the API
     * @param {string} schedule - Selected schedule
     */
    async loadDiameters(schedule) {
        if (!schedule) return;
        
        try {
            UI.showLoading('#flow-diameter-select');
            
            const diameters = await API.getScheduleDiameters(schedule);
            const select = document.getElementById('flow-diameter-select');
            
            select.innerHTML = '<option value="">Selecione um diâmetro</option>';
            
            // Check if diameters is an array or object and handle accordingly
            if (diameters) {
                if (Array.isArray(diameters)) {
                    diameters.forEach(diameter => {
                        const option = document.createElement('option');
                        option.value = diameter.nominal_diameter;
                        option.textContent = `${diameter.nominal_diameter} mm`;
                        select.appendChild(option);
                    });
                } else if (typeof diameters === 'object') {
                    Object.values(diameters).forEach(diameter => {
                        const option = document.createElement('option');
                        option.value = diameter.nominal_diameter;
                        option.textContent = `${diameter.nominal_diameter} mm`;
                        select.appendChild(option);
                    });
                }
            }
            
            // Enable the select
            select.disabled = false;
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Erro ao carregar diâmetros', error);
        } finally {
            UI.hideLoading('#flow-diameter-select');
        }
    },

    /**
     * Load hydraulic diameter shapes from the API
     */
    async loadHydraulicDiameterShapes() {
        try {
            UI.showLoading('#hydraulic-shape');
            
            const shapes = await API.getHydraulicDiameterShapes();
            const select = document.getElementById('hydraulic-shape');
            
            select.innerHTML = '<option value="">Selecione uma forma</option>';
            
            shapes.forEach(shape => {
                const option = document.createElement('option');
                option.value = shape;
                option.textContent = shape.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Erro ao carregar formas de diâmetro hidráulico', error);
        } finally {
            UI.hideLoading('#hydraulic-shape');
        }
    },

    /**
     * Update shape parameters based on selected shape
     * @param {string} shape - Selected shape
     */
    updateShapeParameters(shape) {
        const container = document.getElementById('shape-parameters');
        container.innerHTML = '';
        
        if (!shape) return;
        
        switch (shape) {
            case 'circular':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Diameter (mm)</label>
                        <input type="number" step="0.0000000001" name="diameter" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for circular shape</p>
                    </div>
                `;
                break;
                
            case 'rectangular':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Width (mm)</label>
                        <input type="number" step="0.0000000001" name="width" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for rectangular shape</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Height (mm)</label>
                        <input type="number" step="0.0000000001" name="height" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for rectangular shape</p>
                    </div>
                `;
                break;
                
            case 'annular':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Outer Diameter (mm)</label>
                        <input type="number" step="0.0000000001" name="outer_diameter" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for annular shape (must be larger than inner diameter)</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Inner Diameter (mm)</label>
                        <input type="number" step="0.0000000001" name="inner_diameter" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for annular shape (must be smaller than outer diameter)</p>
                    </div>
                `;
                break;
                
            case 'triangular':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Side A (mm)</label>
                        <input type="number" step="0.0000000001" name="side_a" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for triangular shape</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Side B (mm)</label>
                        <input type="number" step="0.0000000001" name="side_b" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for triangular shape</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Side C (mm)</label>
                        <input type="number" step="0.0000000001" name="side_c" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for triangular shape (must satisfy triangle inequality)</p>
                    </div>
                `;
                break;
                
            case 'circularCap':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Diameter (mm)</label>
                        <input type="number" step="0.0000000001" name="diameter" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for circular cap shape</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Height (mm)</label>
                        <input type="number" step="0.0000000001" name="height" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for circular cap shape</p>
                    </div>
                `;
                break;
        }
    },

    /**
     * Calculate Reynolds number
     * @param {Object} params - Parameters for Reynolds calculation
     */
    async calculateReynolds(params) {
        try {
            UI.showLoading('#reynolds-form');
            UI.hideResult('#reynolds-result');

            const result = await API.calculateReynolds(params);

            let html = '<h4 class="font-medium text-gray-700 mb-2">Número de Reynolds</h4>';
            html += UI.generatePropertyTable(result);

            // Faixa de interpretação didática
            const re = result && result.value;
            if (re != null) {
                let regime, chipClass, nextStep;
                if (re < 2300) {
                    regime = 'Laminar';
                    chipClass = 'regime-laminar';
                    nextStep = 'No regime laminar o fator de atrito é determinado analiticamente: <strong>f = 64 / Re</strong>. Não é necessário usar Colebrook-White.';
                } else if (re < 4000) {
                    regime = 'Transição';
                    chipClass = 'regime-transicao';
                    nextStep = 'O regime de transição é instável. Considere alterar velocidade ou diâmetro para sair dessa faixa.';
                } else {
                    regime = 'Turbulento';
                    chipClass = 'regime-turbulento';
                    nextStep = 'Use o módulo <strong>Escoamento → Fator de atrito</strong> para calcular <em>f</em> pela correlação de Colebrook-White (ou Swamee-Jain).';
                }
                html += `
                    <div class="interpretation-strip">
                        <span class="regime-chip ${chipClass}">${regime}</span>
                        <strong>Re = ${re.toFixed(0)}</strong> — ${nextStep}
                    </div>`;
            }

            UI.showResult('#reynolds-result', html);

            if (re != null) this._renderReynoldsGauge(re);

            // Preenche o campo Reynolds no formulário de Fator de atrito
            if (re != null) {
                document.getElementById('reynolds-number').value = re.toFixed(2);
            }
        } catch (error) {
            UI.showError('Erro ao calcular Reynolds', error);
        } finally {
            UI.hideLoading('#reynolds-form');
        }
    },

    /**
     * Calculate friction factor
     * @param {number} roughness - Roughness in mm
     * @param {number} diameter - Diameter in mm
     * @param {number} reynolds - Reynolds number
     * @param {string} method - Method for calculation
     */
    async calculateFrictionFactor(roughness, diameter, reynolds, method) {
        try {
            UI.showLoading('#friction-factor-form');
            UI.hideResult('#friction-factor-result');
            
            const result = await API.calculateFrictionFactor(roughness, diameter, reynolds, method);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Fator de Atrito</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#friction-factor-result', html);

            // Moody diagram
            const fVal = result && result.value != null ? result.value : null;
            if (fVal != null) {
                this._lastFrictionState = {
                    reynolds: parseFloat(reynolds),
                    frictionFactor: fVal,
                    roughness: parseFloat(roughness),
                    diameter: parseFloat(diameter),
                };
                this._renderMoodyChart(parseFloat(reynolds), fVal, parseFloat(roughness), parseFloat(diameter));
            }

            // Optionally update the friction factor input in the headloss form
            if (result && result.value) {
                const headlossFrictionInput = document.getElementById('headloss-friction-factor');
                if (headlossFrictionInput) {
                    headlossFrictionInput.value = result.value;
                }
            }
        } catch (error) {
            UI.showError('Erro ao calcular fator de atrito', error);
        } finally {
            UI.hideLoading('#friction-factor-form');
        }
    },

    /**
     * Calculate hydraulic diameter
     * @param {Object} params - Parameters for hydraulic diameter calculation
     */
    async calculateHydraulicDiameter(params) {
        try {
            UI.showLoading('#hydraulic-diameter-form');
            UI.hideResult('#hydraulic-diameter-result');
            
            // Additional frontend validation
            if (params.shape === 'annular') {
                const outerDiameter = parseFloat(params.outer_diameter);
                const innerDiameter = parseFloat(params.inner_diameter);
                
                if (innerDiameter >= outerDiameter) {
                    UI.showError('Erro de validação', 'O diâmetro interno deve ser menor que o externo');
                    return;
                }
            }
            
            if (params.shape === 'triangular') {
                const sideA = parseFloat(params.side_a);
                const sideB = parseFloat(params.side_b);
                const sideC = parseFloat(params.side_c);
                
                // Check triangle inequality
                if (sideA + sideB <= sideC || sideA + sideC <= sideB || sideB + sideC <= sideA) {
                    UI.showError('Erro de validação', 'Os lados não formam um triângulo válido (desigualdade triangular)');
                    return;
                }
            }

            if (params.shape === 'circular cap') {
                const diameter = parseFloat(params.diameter);
                const height = parseFloat(params.height);
                
                if (height > diameter) {
                    UI.showError('Erro de validação', 'A altura não pode ser maior que o diâmetro');
                    return;
                }
            }
            
            const result = await API.calculateHydraulicDiameter(params);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Diâmetro Hidráulico</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#hydraulic-diameter-result', html);
        } catch (error) {
            UI.showError('Erro ao calcular diâmetro hidráulico', error);
        } finally {
            UI.hideLoading('#hydraulic-diameter-form');
        }
    },

    _renderReynoldsGauge(re) {
        const W = 340, H = 52;
        const logMin = Math.log10(100), logMax = Math.log10(1e7);
        const toX = v => ((Math.log10(Math.max(100, Math.min(v, 1e7))) - logMin) / (logMax - logMin)) * W;
        const xLam = toX(2300), xTurb = toX(4000), xRe = toX(re);
        const clr = re < 2300 ? '#3B82F6' : (re < 4000 ? '#F59E0B' : '#EF4444');
        const barY = 16;
        const svg = `<svg viewBox="0 0 360 100" class="viz-svg w-full" style="max-height:100px">` +
            `<rect x="10" y="${barY}" width="${xLam}" height="${H}" fill="#DBEAFE" rx="2"/>` +
            `<rect x="${10+xLam}" y="${barY}" width="${xTurb-xLam}" height="${H}" fill="#FEF9C3" rx="0"/>` +
            `<rect x="${10+xTurb}" y="${barY}" width="${W-xTurb}" height="${H}" fill="#FEE2E2" rx="2"/>` +
            `<polygon points="${10+xRe},${barY-2} ${10+xRe-7},4 ${10+xRe+7},4" fill="${clr}"/>` +
            `<line x1="${10+xRe}" y1="${barY-2}" x2="${10+xRe}" y2="${barY+H}" stroke="${clr}" stroke-width="2" stroke-dasharray="3,2"/>` +
            `<text x="12" y="${barY+H+18}" font-size="11" fill="#1D4ED8">Laminar</text>` +
            `<text x="${10+xLam+2}" y="${barY+H+18}" font-size="11" fill="#92400E">Trans.</text>` +
            `<text x="${10+xTurb+2}" y="${barY+H+18}" font-size="11" fill="#991B1B">Turbulento</text>` +
            `<text x="${10+xRe}" y="${barY+H/2+5}" text-anchor="middle" font-size="12" fill="${clr}" font-weight="bold">Re=${re.toFixed(0)}</text>` +
            `</svg>`;
        const wrap = document.createElement('div');
        wrap.className = 'viz-container mt-3';
        wrap.innerHTML = `<div class="viz-title">Régua de Regime de Escoamento</div>${svg}`;
        document.getElementById('reynolds-result').appendChild(wrap);
    },

    _swameeJain(epsD, Re) {
        if (Re < 1) return null;
        if (Re < 2300) return 64 / Re;
        if (Re < 4000) {
            const fLam = 64 / 2300;
            const arg = epsD / 3.7 + 5.74 / Math.pow(4000, 0.9);
            const fTurb = arg > 0 ? 0.25 / (Math.log10(arg) ** 2) : null;
            if (fTurb == null) return fLam;
            const t = (Re - 2300) / 1700;
            return fLam * (1 - t) + fTurb * t;
        }
        const arg = epsD / 3.7 + 5.74 / Math.pow(Re, 0.9);
        return arg > 0 ? 0.25 / (Math.log10(arg) ** 2) : null;
    },

    _renderMoodyChart(re, f, roughnessMm, diameterMm, options = {}) {
        const {
            targetId = 'friction-factor-result',
            canvasId = 'moody-chart',
            chartKey = '_moodyChart',
            title = 'Diagrama de Moody',
        } = options;
        const epsDs = [0, 0.00005, 0.0001, 0.001, 0.005, 0.01, 0.05];
        const colors = ['#94A3B8','#60A5FA','#34D399','#FBBF24','#F87171','#A78BFA','#EC4899'];
        const labelsEps = ['liso (ε/D=0)','ε/D=5×10⁻⁵','ε/D=10⁻⁴','ε/D=10⁻³','ε/D=5×10⁻³','ε/D=10⁻²','ε/D=5×10⁻²'];
        const NUM = 60;
        const rePoints = Array.from({length: NUM}, (_, i) =>
            Math.pow(10, Math.log10(100) + i * (Math.log10(1e8) - Math.log10(100)) / (NUM - 1)));

        const datasets = epsDs.map((epsD, i) => ({
            label: labelsEps[i],
            data: rePoints.map(r => ({ x: r, y: this._swameeJain(epsD, r) })).filter(p => p.y != null),
            borderColor: colors[i],
            backgroundColor: 'transparent',
            borderWidth: i === 0 ? 2 : 1.5,
            pointRadius: 0,
            tension: 0.1,
            showLine: true,
        }));

        const epsD = diameterMm > 0 ? roughnessMm / diameterMm : 0;
        datasets.push({
            label: 'Ponto operacional',
            data: [{ x: re, y: f }],
            borderColor: '#EF4444',
            backgroundColor: '#EF4444',
            pointRadius: 7,
            pointStyle: 'circle',
            showLine: false,
        });

        const container = document.getElementById(targetId);
        if (!container) return;
        if (this[chartKey]) { this[chartKey].destroy(); this[chartKey] = null; }
        const wrap = document.createElement('div');
        wrap.className = 'viz-container mt-3';
        wrap.innerHTML = `<div class="viz-title">${title}</div><div class="viz-chart-wrap"><canvas id="${canvasId}"></canvas></div>`;
        container.appendChild(wrap);

        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        this[chartKey] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { type: 'logarithmic', title: { display: true, text: 'Número de Reynolds (Re)' }, min: 100, max: 1e8 },
                    y: { type: 'logarithmic', title: { display: true, text: 'Fator de atrito de Darcy (f)' }, min: 0.005, max: 0.2 },
                },
                plugins: {
                    legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 12 } },
                    tooltip: { callbacks: { label: c => `Re=${c.parsed.x.toExponential(2)}, f=${c.parsed.y != null ? c.parsed.y.toFixed(5) : '—'}` } },
                },
            },
        });
    },

    renderExploratoryVisuals(targets = {}) {
        const summaryEl = document.getElementById(targets.summaryId);
        const chartEl = document.getElementById(targets.chartId);
        if (!summaryEl || !chartEl) return;

        const state = this._lastFrictionState;
        const reynolds = parseFloat(document.getElementById('reynolds-number')?.value || state?.reynolds || '0');
        const roughness = parseFloat(document.getElementById('custom-roughness')?.value || state?.roughness || '0');
        const diameter = parseFloat(document.getElementById('custom-diameter')?.value || state?.diameter || '0');
        const frictionFactor = state?.frictionFactor ?? null;

        summaryEl.innerHTML = `
            <h4 class="font-medium text-gray-700 mb-2">Leitura do cenário</h4>
            <div class="text-sm text-gray-600 space-y-1">
                <p>Reynolds: <strong>${reynolds ? reynolds.toFixed(0) : '—'}</strong></p>
                <p>Fator de atrito: <strong>${frictionFactor != null ? Number(frictionFactor).toFixed(5) : '—'}</strong></p>
                <p>Rugosidade: <strong>${roughness ? roughness.toFixed(4) : '—'} mm</strong></p>
                <p>Diâmetro: <strong>${diameter ? diameter.toFixed(1) : '—'} mm</strong></p>
            </div>
        `;

        chartEl.innerHTML = '';
        if (!reynolds || frictionFactor == null || !diameter) {
            chartEl.innerHTML = '<div class="exploratory-placeholder">Calcule o fator de atrito para carregar o Diagrama de Moody neste laboratório.</div>';
            return;
        }

        this._renderMoodyChart(reynolds, frictionFactor, roughness, diameter, {
            targetId: targets.chartId,
            canvasId: 'flow-exploratory-chart-canvas',
            chartKey: '_exploratoryMoodyChart',
            title: 'Diagrama de Moody — modo exploratório',
        });
    },

    async recalculate(params = {}) {
        const read = (id) => document.getElementById(id);
        const update = (id, value) => {
            const input = read(id);
            if (input && value != null) input.value = value;
        };

        update('characteristic-diameter', params.characteristic_diameter);
        update('reynolds-velocity', params.velocity);
        update('density', params.density);
        update('dynamic-viscosity', params.dynamic_viscosity);
        update('kinematic-viscosity', params.kinematic_viscosity);

        const reynoldsParams = {
            characteristic_diameter: parseFloat(read('characteristic-diameter')?.value || '0'),
            velocity: parseFloat(read('reynolds-velocity')?.value || '0'),
        };
        if (read('density')?.value && read('dynamic-viscosity')?.value) {
            reynoldsParams.density = parseFloat(read('density').value);
            reynoldsParams.dynamic_viscosity = parseFloat(read('dynamic-viscosity').value);
        } else if (read('kinematic-viscosity')?.value) {
            reynoldsParams.kinematic_viscosity = parseFloat(read('kinematic-viscosity').value);
        }

        await this.calculateReynolds(reynoldsParams);

        const roughness = params.roughness ?? read('custom-roughness')?.value;
        const diameter = params.friction_diameter ?? params.characteristic_diameter ?? read('custom-diameter')?.value ?? read('characteristic-diameter')?.value;
        const method = params.method ?? read('friction-factor-method')?.value;
        const reynolds = read('reynolds-number')?.value;

        if (roughness && diameter && method && reynolds) {
            await this.calculateFrictionFactor(roughness, diameter, reynolds, method);
        }
    },
};

// Export the Flow module
window.FlowModule = FlowModule; 
