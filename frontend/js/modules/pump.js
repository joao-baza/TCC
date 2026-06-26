/**
 * Pump Module for Chemical Engineering Calculator
 * Handles pump-related calculations
 */

const PumpModule = {
    /**
     * Initialize the Pump module
     */
    init() {
        this.loadHeadlossMethods();
        this.loadFrictionFactorMethods();
        this.loadFittingsOptions();
        this.loadCompositionOptions();
        this.setupEventListeners();
    },

    /**
     * Set up event listeners for the Pump module
     */
    setupEventListeners() {
        // Headloss method change handler
        $('#headloss-method').on('change', () => {
            this.updateHeadlossFieldsVisibility();
        });

        // Friction factor type radio buttons (Darcy-Weisbach)
        $('input[name="friction-factor-type"]').on('change', () => {
            this.updateHeadlossFieldsVisibility();
        });

        // Roughness coefficient type radio buttons (Hazen-Williams)
        $('input[name="roughness-coef-type"]').on('change', () => {
            this.updateHeadlossFieldsVisibility();
        });

        this.setupHeadlossFlowVelocitySync();

        // Material composition select change handler
        $('#material-composition-select').on('change', async (e) => {
            const selectedMaterial = e.target.value;
            this.selectedMaterialRoughnessCoefficient = null;
            this.selectedMaterialRoughness = null;

            if (selectedMaterial) {
                try {
                    const materialDetails = await API.getCompositionDetails(selectedMaterial);
                    const specs = materialDetails && materialDetails.specifications;

                    if (specs && specs.roughness_coefficient && specs.roughness_coefficient.value != null) {
                        this.selectedMaterialRoughnessCoefficient = specs.roughness_coefficient.value;
                    }

                    if (specs && specs.roughness && specs.roughness.value != null) {
                        this.selectedMaterialRoughness = specs.roughness.value;
                    } else {
                        UI.showError('Dados incompletos', 'Rugosidade absoluta não encontrada para este material');
                        return;
                    }

                    if (!this.selectedMaterialRoughnessCoefficient) {
                        // Hazen-Williams may not have C for all materials; only warn when that method is active
                        const method = document.getElementById('headloss-method').value;
                        const roughnessType = document.querySelector('input[name="roughness-coef-type"]:checked')?.value;
                        if (method === 'Hazen-Williams' && roughnessType === 'material') {
                            UI.showError('Dados incompletos', 'Coeficiente de rugosidade (C) não encontrado para este material');
                        }
                    }
                } catch (error) {
                    console.error('Error loading material details:', error);
                }
            }
        });

        // Add fitting button handler
        document.getElementById('add-fitting').addEventListener('click', async () => {
            const fittings = await API.getFittings();
            UI.addFittingRow(fittings);
        });

        // Headloss form submit handler
        document.getElementById('headloss-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const method = document.getElementById('headloss-method').value;
            const pipeLength = document.getElementById('pipe-length').value;
            const diameter = document.getElementById('headloss-diameter').value;
            const flowRate = document.getElementById('headloss-flow-rate').value;
            const velocity = document.getElementById('headloss-velocity').value;
            
            if (!method || !pipeLength || !diameter) {
                UI.showError('Dados incompletos', 'Informe comprimento, diâmetro e selecione um método');
                return;
            }

            const flowResolved = this._resolveHeadlossFlowVelocity(
                parseFloat(diameter),
                flowRate,
                velocity
            );
            if (flowResolved.error) {
                UI.showError('Dados incompletos', flowResolved.error);
                return;
            }
            
            const params = {
                pipe_length: parseFloat(pipeLength),
                diameter: parseFloat(diameter),
                method: method,
                flow_rate: flowResolved.flow_rate,
                velocity: flowResolved.velocity,
            };
            
            // Add method-specific parameters
            if (method === 'Darcy-Weisbach') {
                const frictionType = document.querySelector('input[name="friction-factor-type"]:checked').value;
                let frictionFactor;

                if (frictionType === 'material') {
                    const reynolds = document.getElementById('headloss-reynolds-number').value;
                    const ffMethod = document.getElementById('headloss-friction-factor-method').value;

                    if (!this.selectedMaterialRoughness) {
                        UI.showError('Dados incompletos', 'Selecione um material com rugosidade absoluta');
                        return;
                    }
                    if (!reynolds || !ffMethod) {
                        UI.showError('Dados incompletos', 'Para fator de atrito por material, informe Reynolds e o método de cálculo');
                        return;
                    }

                    try {
                        const ffResult = await API.calculateFrictionFactor(
                            this.selectedMaterialRoughness,
                            parseFloat(diameter),
                            parseFloat(reynolds),
                            ffMethod
                        );
                        frictionFactor = ffResult.value;
                    } catch (error) {
                        UI.showError('Erro ao calcular fator de atrito', error);
                        return;
                    }
                } else {
                    frictionFactor = document.getElementById('headloss-friction-factor').value;
                    if (!frictionFactor) {
                        UI.showError('Dados incompletos', 'Informe o fator de atrito');
                        return;
                    }
                    frictionFactor = parseFloat(frictionFactor);
                }

                params.friction_factor = frictionFactor;

            } else if (method === 'Hazen-Williams') {
                let roughnessCoefficient;
                
                const roughnessType = document.querySelector('input[name="roughness-coef-type"]:checked').value;
                
                if (roughnessType === 'material') {
                    if (!this.selectedMaterialRoughnessCoefficient) {
                        UI.showError('Dados incompletos', 'Selecione um material');
                        return;
                    }
                    roughnessCoefficient = this.selectedMaterialRoughnessCoefficient;
                } else {
                    roughnessCoefficient = document.getElementById('roughness-coefficient').value;
                    if (!roughnessCoefficient) {
                        UI.showError('Dados incompletos', 'Informe um coeficiente de rugosidade');
                        return;
                    }
                    roughnessCoefficient = parseFloat(roughnessCoefficient);
                }
                
                params.roughness_coefficient = roughnessCoefficient;
            }
            
            // Add fittings if any
            const fittings = UI.collectFittings();
            if (fittings.length > 0) {
                params.fittings = fittings;
            }
            
            await this.calculateHeadloss(params);
        });

        // NPSH form submit handler
        document.getElementById('npsh-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const manometricPressure = document.getElementById('manometric-pressure').value;
            const atmosphericPressure = document.getElementById('atmospheric-pressure').value;
            const vaporPressure = document.getElementById('vapor-pressure').value;
            const specificMass = document.getElementById('specific-mass').value;
            const frictionFactor = document.getElementById('npsh-friction-factor').value;
            const pumpInletVelocity = document.getElementById('pump-inlet-velocity').value;
            const gaugeElevation = document.getElementById('gauge-elevation').value;
            
            if (!manometricPressure || !atmosphericPressure || !vaporPressure || !specificMass || !frictionFactor || !pumpInletVelocity) {
                UI.showError('Dados incompletos', 'Preencha todos os campos obrigatórios');
                return;
            }
            
            const params = {
                manometric_pressure: parseFloat(manometricPressure),
                atmospheric_pressure: parseFloat(atmosphericPressure),
                vapor_pressure: parseFloat(vaporPressure),
                density: parseFloat(specificMass),
                friction_factor: parseFloat(frictionFactor),
                pump_inlet_velocity: parseFloat(pumpInletVelocity)
            };
            
            if (gaugeElevation) {
                params.gauge_elevation = parseFloat(gaugeElevation);
            }
            
            await this.calculateNPSHAvailable(params);
        });

        // Head form submit handler
        document.getElementById('head-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const pressure1 = document.getElementById('pressure1').value;
            const pressure2 = document.getElementById('pressure2').value;
            const elevation1 = document.getElementById('elevation1').value;
            const elevation2 = document.getElementById('elevation2').value;
            const velocity1 = document.getElementById('velocity1').value;
            const velocity2 = document.getElementById('velocity2').value;
            const specificMass = document.getElementById('head-specific-mass').value;
            const frictionFactor = document.getElementById('head-friction-factor').value;
            
            if (!pressure1 || !pressure2 || !elevation1 || !elevation2 || !velocity1 || !velocity2 || !specificMass || !frictionFactor) {
                UI.showError('Dados incompletos', 'Preencha todos os campos obrigatórios');
                return;
            }
            
            const params = {
                pressure1: parseFloat(pressure1),
                pressure2: parseFloat(pressure2),
                elevation1: parseFloat(elevation1),
                elevation2: parseFloat(elevation2),
                velocity1: parseFloat(velocity1),
                velocity2: parseFloat(velocity2),
                density: parseFloat(specificMass),
                friction_factor: parseFloat(frictionFactor)
            };
            
            await this.calculateHead(params);
        });
    },

    /**
     * Sync flow rate and velocity from diameter (Q = V·A).
     */
    setupHeadlossFlowVelocitySync() {
        const qInput = document.getElementById('headloss-flow-rate');
        const vInput = document.getElementById('headloss-velocity');
        const dInput = document.getElementById('headloss-diameter');
        if (!qInput || !vInput || !dInput) return;

        let syncing = false;

        const pipeArea = () => {
            const D = parseFloat(dInput.value);
            if (!D || D <= 0) return null;
            const D_m = D / 1000;
            return Math.PI * D_m * D_m / 4;
        };

        const syncFrom = (source) => {
            if (syncing) return;
            const A = pipeArea();
            if (!A) return;

            syncing = true;
            if (source === 'Q' && qInput.value) {
                const Q = parseFloat(qInput.value);
                if (Q > 0) vInput.value = (Q / A).toPrecision(6);
            } else if (source === 'V' && vInput.value) {
                const V = parseFloat(vInput.value);
                if (V > 0) qInput.value = (V * A).toPrecision(6);
            } else if (source === 'D') {
                if (vInput.value) {
                    const V = parseFloat(vInput.value);
                    if (V > 0) qInput.value = (V * A).toPrecision(6);
                } else if (qInput.value) {
                    const Q = parseFloat(qInput.value);
                    if (Q > 0) vInput.value = (Q / A).toPrecision(6);
                }
            }
            syncing = false;
        };

        qInput.addEventListener('input', () => syncFrom('Q'));
        vInput.addEventListener('input', () => syncFrom('V'));
        dInput.addEventListener('input', () => syncFrom('D'));
    },

    /**
     * Resolve Q and V from diameter; validate consistency when both are given.
     */
    _resolveHeadlossFlowVelocity(diameterMm, flowRateStr, velocityStr) {
        const hasQ = flowRateStr !== '';
        const hasV = velocityStr !== '';

        if (!hasQ && !hasV) {
            return { error: 'Informe vazão ou velocidade (ou ambos, consistentes com o diâmetro)' };
        }

        const D_m = diameterMm / 1000;
        const area = Math.PI * D_m * D_m / 4;

        let Q, V;
        if (hasQ && hasV) {
            Q = parseFloat(flowRateStr);
            V = parseFloat(velocityStr);
            if (!(Q > 0 && V > 0)) {
                return { error: 'Vazão e velocidade devem ser positivas' };
            }
            const Q_from_v = V * area;
            const relErr = Math.abs(Q - Q_from_v) / Q;
            if (relErr > 0.001) {
                return {
                    error: 'Vazão e velocidade inconsistentes com o diâmetro informado',
                };
            }
        } else if (hasV) {
            V = parseFloat(velocityStr);
            if (!(V > 0)) return { error: 'Velocidade deve ser positiva' };
            Q = V * area;
        } else {
            Q = parseFloat(flowRateStr);
            if (!(Q > 0)) return { error: 'Vazão deve ser positiva' };
            V = Q / area;
        }

        return { flow_rate: Q, velocity: V };
    },

    /**
     * Show/hide headloss fields based on selected method and input type
     */
    updateHeadlossFieldsVisibility() {
        const method = document.getElementById('headloss-method').value;
        const darcyFields = document.querySelector('.darcy-fields');
        const hazenFields = document.querySelector('.hazen-fields');
        const materialContainer = document.getElementById('headloss-material-container');
        const customRoughnessContainer = document.getElementById('custom-roughness-coef-container');
        const darcyMaterialExtras = document.getElementById('darcy-material-friction-extras');
        const darcyCustomFriction = document.getElementById('darcy-custom-friction-container');
        const darcySlotSpacer = document.getElementById('darcy-slot-spacer');
        const hazenSlotSpacer = document.getElementById('hazen-slot-spacer');

        darcyFields.classList.toggle('hidden', method !== 'Darcy-Weisbach');
        hazenFields.classList.toggle('hidden', method !== 'Hazen-Williams');

        if (method === 'Darcy-Weisbach') {
            const frictionType = document.querySelector('input[name="friction-factor-type"]:checked')?.value;
            const useMaterial = frictionType === 'material';

            this._placeMaterialContainer('darcy-material-anchor');
            materialContainer.classList.toggle('hidden', !useMaterial);
            darcyMaterialExtras.classList.toggle('hidden', !useMaterial);
            darcyCustomFriction.classList.toggle('hidden', useMaterial);
            darcySlotSpacer.classList.toggle('hidden', useMaterial);
            customRoughnessContainer.classList.add('hidden');
            hazenSlotSpacer.classList.add('hidden');
        } else if (method === 'Hazen-Williams') {
            const roughnessType = document.querySelector('input[name="roughness-coef-type"]:checked')?.value;
            const useMaterial = roughnessType === 'material';

            this._placeMaterialContainer('hazen-material-anchor');
            materialContainer.classList.toggle('hidden', !useMaterial);
            customRoughnessContainer.classList.toggle('hidden', useMaterial);
            hazenSlotSpacer.classList.toggle('hidden', useMaterial);
            darcyMaterialExtras.classList.add('hidden');
            darcyCustomFriction.classList.add('hidden');
            darcySlotSpacer.classList.add('hidden');
        } else {
            materialContainer.classList.add('hidden');
            customRoughnessContainer.classList.add('hidden');
            darcyMaterialExtras.classList.add('hidden');
            darcyCustomFriction.classList.add('hidden');
            darcySlotSpacer.classList.add('hidden');
            hazenSlotSpacer.classList.add('hidden');
        }
    },

    /**
     * Move the shared material select to the anchor for the active method
     * @param {string} anchorId - ID of the anchor element
     */
    _placeMaterialContainer(anchorId) {
        const materialContainer = document.getElementById('headloss-material-container');
        const anchor = document.getElementById(anchorId);
        if (materialContainer && anchor && anchor.nextElementSibling !== materialContainer) {
            anchor.insertAdjacentElement('afterend', materialContainer);
        }
    },

    /**
     * Load friction factor methods for Darcy-Weisbach material-based calculation
     */
    async loadFrictionFactorMethods() {
        try {
            UI.showLoading('#headloss-friction-factor-method');

            const methods = await API.getFrictionFactorMethods();
            const select = document.getElementById('headloss-friction-factor-method');

            select.innerHTML = '<option value="">Selecione um método</option>';

            methods.forEach(method => {
                const option = document.createElement('option');
                option.value = method;
                option.textContent = method;
                select.appendChild(option);
            });

            $(select).select2({
                ...UI.getSelect2Options('Selecione um método'),
                allowClear: true
            });
        } catch (error) {
            console.error('Error loading friction factor methods:', error);
        } finally {
            UI.hideLoading('#headloss-friction-factor-method');
        }
    },

    /**
     * Load headloss methods from the API
     */
    async loadHeadlossMethods() {
        try {
            UI.showLoading('#headloss-method');
            
            const methods = await API.getHeadlossMethods();
            const select = document.getElementById('headloss-method');
            
            select.innerHTML = '<option value="">Selecione um método</option>';
            
            methods.forEach(method => {
                const option = document.createElement('option');
                option.value = method;
                option.textContent = method;
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
            this.updateHeadlossFieldsVisibility();
        } catch (error) {
            UI.showError('Erro ao carregar métodos de perda de carga', error);
        } finally {
            UI.hideLoading('#headloss-method');
        }
    },

    /**
     * Load material compositions for the roughness coefficient
     */
    async loadCompositionOptions() {
        try {
            UI.showLoading('#material-composition-select');
            
            const compositions = await API.getCompositions();
            const select = document.getElementById('material-composition-select');
            
            select.innerHTML = '<option value="">Selecione um material</option>';
            
            compositions.forEach(composition => {
                const option = document.createElement('option');
                option.value = composition;
                option.textContent = composition;
                select.appendChild(option);
            });
            
            // Initialize Select2
            $('#material-composition-select').select2({
                ...UI.getSelect2Options('Selecione um material'),
                allowClear: true
            });
        } catch (error) {
            console.error('Error loading compositions:', error);
        } finally {
            UI.hideLoading('#material-composition-select');
        }
    },

    /**
     * Load available fittings for the headloss calculation
     */
    async loadFittingsOptions() {
        try {
            // We'll use this later for the "Add Fitting" button
            this.fittingsOptions = await API.getFittings();
        } catch (error) {
            console.error('Error loading fittings options:', error);
        }
    },

    /**
     * Calculate headloss
     * @param {Object} params - Parameters for headloss calculation
     */
    async calculateHeadloss(params) {
        try {
            UI.showLoading('#headloss-form');
            UI.hideResult('#headloss-result');
            
            const result = await API.calculateHeadloss(params);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Perda de Carga</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#headloss-result', html);

            const hfValue = result && result.value != null ? result.value : null;
            if (hfValue != null) this._renderHeadlossChart(params, hfValue);

            // Optionally update the friction factor input in the head form
            if (result && result.value != null) {
                const headFrictionInput = document.getElementById('head-friction-factor');
                if (headFrictionInput) {
                    headFrictionInput.value = parseFloat(result.value).toFixed(2);
                }
            }
        } catch (error) {
            UI.showError('Erro ao calcular perda de carga', error);
        } finally {
            UI.hideLoading('#headloss-form');
        }
    },

    /**
     * Calculate NPSH available
     * @param {Object} params - Parameters for NPSH calculation
     */
    async calculateNPSHAvailable(params) {
        try {
            UI.showLoading('#npsh-form');
            UI.hideResult('#npsh-result');
            
            const result = await API.calculateNPSHAvailable(params);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">NPSH Disponível</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#npsh-result', html);

            const npshd = result.head_loss && result.head_loss.value != null ? result.head_loss.value : null;
            const npshRInput = document.getElementById('npsh-required');
            const npshR = npshRInput && npshRInput.value ? parseFloat(npshRInput.value) : null;
            this._renderNPSHGauge(npshd, npshR);

        } catch (error) {
            UI.showError('Erro ao calcular NPSH disponível', error);
        } finally {
            UI.hideLoading('#npsh-form');
        }
    },

    /**
     * Calculate head
     * @param {Object} params - Parameters for head calculation
     */
    async calculateHead(params) {
        try {
            UI.showLoading('#head-form');
            UI.hideResult('#head-result');
            
            const result = await API.calculateHead(params);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Altura Manométrica</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#head-result', html);

            const H = result && result.value != null ? result.value : null;
            if (H != null) this._renderHeadBreakdown(params, H);

        } catch (error) {
            UI.showError('Erro ao calcular altura manométrica', error);
        } finally {
            UI.hideLoading('#head-form');
        }
    },

    _renderHeadlossChart(params, hfValue) {
        const method = params.method;
        const D_m = params.diameter / 1000;
        const L = params.pipe_length;
        let Q_op, hfFn;

        if (method === 'Darcy-Weisbach') {
            const f = params.friction_factor, V = params.velocity;
            Q_op = V * Math.PI * D_m * D_m / 4;
            hfFn = Q => 8 * f * L * Q * Q / (Math.PI * Math.PI * 9.81 * Math.pow(D_m, 5));
        } else if (method === 'Hazen-Williams') {
            Q_op = params.flow_rate;
            const C = params.roughness_coefficient;
            hfFn = Q => 4.73 * L / (Math.pow(C, 1.852) * Math.pow(D_m, 4.87)) * Math.pow(Q, 1.852);
        } else return;

        const NUM = 50;
        const points = Array.from({length: NUM}, (_, i) => {
            const Q = (2 * Q_op * (i + 1)) / NUM;
            const y = hfFn(Q);
            return isFinite(y) && y >= 0 ? { x: parseFloat(Q.toPrecision(5)), y: parseFloat(y.toPrecision(5)) } : null;
        }).filter(Boolean);

        if (this._headlossChart) { this._headlossChart.destroy(); this._headlossChart = null; }
        const wrap = document.createElement('div');
        wrap.className = 'viz-container mt-3';
        wrap.innerHTML = `<div class="viz-title">Perda de Carga × Vazão (${method})</div><div class="viz-chart-wrap"><canvas id="headloss-chart"></canvas></div>`;
        document.getElementById('headloss-result').appendChild(wrap);

        const ctx = document.getElementById('headloss-chart').getContext('2d');
        this._headlossChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [
                { label: 'h_f vs Q', data: points, borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, pointRadius: 0, tension: 0.3 },
                { label: 'Ponto operacional', data: [{ x: Q_op, y: hfValue }], borderColor: '#EF4444', backgroundColor: '#EF4444', pointRadius: 6, showLine: false },
            ]},
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { type: 'linear', title: { display: true, text: 'Vazão Q (m³/s)' } },
                    y: { title: { display: true, text: 'Perda de carga h_f (m)' }, beginAtZero: true },
                },
                plugins: { legend: { labels: { font: { size: 11 } } } },
            },
        });
    },

    _renderNPSHGauge(npshd, npshR) {
        if (npshd == null) return;
        const safe = npshR != null ? npshd >= npshR + 0.5 : null;
        const color = safe === null ? '#6B7280' : (safe ? '#22C55E' : '#EF4444');
        const label = safe === null ? 'Informe NPSHr para checar margem' : (safe ? 'Margem segura (NPSHd ≥ NPSHr + 0,5 m) ✓' : 'Risco de cavitação — NPSHd insuficiente ✗');
        const maxVal = npshR != null ? Math.max(npshd, npshR) * 1.3 : npshd * 1.5;
        const W = 460;
        const barY = 18, barH = 30;
        const midY = barY + barH / 2 + 4;
        const xNpshd = (npshd / maxVal) * W;
        let markers = `<rect x="0" y="${barY}" width="${xNpshd}" height="${barH}" fill="${color}80" rx="3"/>` +
            `<rect x="0" y="${barY}" width="${xNpshd}" height="${barH}" fill="none" stroke="${color}" stroke-width="1.5" rx="3"/>` +
            `<text x="${Math.min(xNpshd + 5, W - 110)}" y="${midY}" font-size="11" fill="${color}" font-weight="bold">NPSHd = ${npshd.toFixed(2)} m</text>`;
        if (npshR != null) {
            const xR = (npshR / maxVal) * W;
            const xSafe = ((npshR + 0.5) / maxVal) * W;
            markers += `<line x1="${xR}" y1="${barY - 6}" x2="${xR}" y2="${barY + barH + 4}" stroke="#374151" stroke-width="2" stroke-dasharray="4,2"/>` +
                `<text x="${xR - 3}" y="${barY - 8}" font-size="10" fill="#374151" text-anchor="end">NPSHr = ${npshR.toFixed(1)} m</text>` +
                `<line x1="${xSafe}" y1="${barY - 6}" x2="${xSafe}" y2="${barY + barH + 4}" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="3,2"/>` +
                `<text x="${xSafe + 3}" y="${barY - 8}" font-size="9" fill="#92400E">+0,5 m</text>`;
        }
        const svgH = barY + barH + 16;
        const svg = `<svg viewBox="0 0 ${W + 80} ${svgH}" class="viz-svg w-full" style="max-height:${svgH}px">` +
            `<rect x="0" y="${barY}" width="${W}" height="${barH}" fill="#F1F5F9" rx="3" stroke="#CBD5E1"/>` +
            markers +
            `<text x="${W + 6}" y="${midY}" font-size="10" fill="#374151">${maxVal.toFixed(1)} m</text></svg>`;
        const wrap = document.createElement('div');
        wrap.className = 'viz-container mt-3';
        wrap.innerHTML = `<div class="viz-title">Margem de NPSH</div>${svg}` +
            `<div class="viz-meta"><span class="viz-chip" style="background:${color}20;color:${color};border:1px solid ${color}50">${label}</span></div>`;
        document.getElementById('npsh-result').appendChild(wrap);
    },

    _renderHeadBreakdown(params, H) {
        const g = 9.81, rho = params.density;
        const dp  = (params.pressure2 - params.pressure1) / (rho * g);
        const dz  = params.elevation2 - params.elevation1;
        const dv  = (params.velocity2 ** 2 - params.velocity1 ** 2) / (2 * g);
        const hf  = -params.friction_factor;

        if (this._headChart) { this._headChart.destroy(); this._headChart = null; }
        const wrap = document.createElement('div');
        wrap.className = 'viz-container mt-3';
        wrap.innerHTML = `<div class="viz-title">Decomposição — H = ${H.toFixed(3)} m</div><div class="viz-chart-wrap" style="height:180px"><canvas id="head-chart"></canvas></div>`;
        document.getElementById('head-result').appendChild(wrap);

        const ctx = document.getElementById('head-chart').getContext('2d');
        this._headChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['ΔP/(ρg)', 'Δz', 'ΔV²/(2g)', '−h_f (perdas)'],
                datasets: [{ label: 'metros (m)', data: [dp, dz, dv, hf].map(v => parseFloat(v.toFixed(4))),
                    backgroundColor: [dp>=0?'rgba(59,130,246,0.7)':'rgba(239,68,68,0.7)', dz>=0?'rgba(34,197,94,0.7)':'rgba(239,68,68,0.7)', dv>=0?'rgba(168,85,247,0.7)':'rgba(239,68,68,0.7)', 'rgba(239,68,68,0.7)'],
                    borderWidth: 0 }],
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                scales: { x: { title: { display: true, text: 'm de coluna de fluido' } }, y: { ticks: { font: { size: 11 } } } },
                plugins: { legend: { display: false } },
            },
        });
    },
};

// Export the Pump module
window.PumpModule = PumpModule; 