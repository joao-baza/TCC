/**
 * Sizing Module for Chemical Engineering Calculator
 * Handles pipe sizing calculations
 */

const SizingModule = {
    /**
     * Initialize the Sizing module
     */
    init() {
        this.loadSchedulesForRealDiameter();
        this.setupEventListeners();
    },

    /**
     * Set up event listeners for the Sizing module
     */
    setupEventListeners() {
        // Calculated diameter form submit handler
        document.getElementById('calculated-diameter-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const flowRate = document.getElementById('flow-rate').value;
            const velocity = document.getElementById('velocity').value;
            
            if (!flowRate || !velocity) {
                UI.showError('Dados incompletos', 'Informe a vazão e a velocidade');
                return;
            }
            
            await this.calculateDiameter(flowRate, velocity);
        });

        // Real diameter form submit handler
        document.getElementById('real-diameter-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const calculatedDiameter = document.getElementById('calculated-diameter').value;
            const schedule = document.getElementById('real-diameter-schedule').value;
            
            if (!calculatedDiameter || !schedule) {
                UI.showError('Dados incompletos', 'Informe o diâmetro calculado e selecione um schedule');
                return;
            }
            
            await this.getRealDiameter(calculatedDiameter, schedule);
        });
    },

    /**
     * Calculate diameter based on flow rate and velocity
     * @param {number} flowRate - Flow rate in m³/s
     * @param {number} velocity - Velocity in m/s
     */
    async calculateDiameter(flowRate, velocity) {
        try {
            UI.showLoading('#calculated-diameter-form');
            UI.hideResult('#calculated-diameter-result');
            
            const result = await API.calculateDiameter(flowRate, velocity);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Diâmetro Calculado</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#calculated-diameter-result', html);

            // Velocity profile visualization
            if (result && result.value != null) {
                const D_m = Number(result.value) / 1000;
                this._renderVelocityProfile(parseFloat(velocity), D_m);
            }

            document.dispatchEvent(new CustomEvent('tcc:calculated', { detail: {
                module: 'Dimensionamento',
                operation: 'Diâmetro Calculado',
                inputs: `Q = ${flowRate} m³/s · V = ${velocity} m/s`,
                summary: result && result.value != null
                    ? `D = ${Number(result.value).toFixed(4)} m`
                    : 'Ver resultado acima',
            }}));

            // Update the calculated diameter input in the Real Diameter form
            if (result && result.value) {
                // Get the diameter value, ensuring we handle both object format and direct value
                let diameterValue = typeof result.value === 'object' ? 
                    (result.value.value || result.value) : 
                    result.value;
                
                // Round to 2 decimal places
                diameterValue = Number(diameterValue).toFixed(2);
                
                // Update the input field
                document.getElementById('calculated-diameter').value = diameterValue;
            }
        } catch (error) {
            UI.showError('Erro ao calcular diâmetro', error);
        } finally {
            UI.hideLoading('#calculated-diameter-form');
        }
    },

    /**
     * Load schedules for the real diameter selection
     */
    async loadSchedulesForRealDiameter() {
        try {
            UI.showLoading('#real-diameter-schedule');
            
            const schedules = await API.getSchedules();
            const select = document.getElementById('real-diameter-schedule');
            
            select.innerHTML = '<option value="">Selecione um schedule</option>';
            
            schedules.forEach(schedule => {
                const option = document.createElement('option');
                option.value = schedule.name;
                option.textContent = schedule.name;
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Erro ao carregar schedules', error);
        } finally {
            UI.hideLoading('#real-diameter-schedule');
        }
    },

    /**
     * Get real diameter based on calculated diameter and schedule
     * @param {number} calculatedDiameter - Calculated diameter in mm
     * @param {string} schedule - Pipe schedule
     */
    _renderVelocityProfile(V, D_m) {
        const Re = 1000 * V * D_m / 0.001;
        const isLam = Re < 2300, isTurb = Re >= 4000;
        const color = isLam ? '#3B82F6' : (isTurb ? '#EF4444' : '#F59E0B');
        const regime = isLam ? 'Laminar' : (isTurb ? 'Turbulento' : 'Transição');
        const ys = [-0.85,-0.65,-0.45,-0.25,0,0.25,0.45,0.65,0.85];
        const maxLen = 260, startX = 55, cy = 70, hr = 48;
        const arrows = ys.map(y => {
            let vr;
            if (isLam) vr = 1 - y*y;
            else if (isTurb) vr = Math.pow(1 - Math.abs(y), 1/7);
            else { const t=(Re-2300)/1700; vr=(1-y*y)*(1-t)+Math.pow(1-Math.abs(y),1/7)*t; }
            const len = Math.max(14, vr * maxLen);
            const yp = cy + y * hr, ex = startX + len;
            return `<line x1="${startX}" y1="${yp}" x2="${ex}" y2="${yp}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>` +
                   `<polygon points="${ex},${yp-4} ${ex+8},${yp} ${ex},${yp+4}" fill="${color}"/>`;
        }).join('');
        const tw = cy - hr, bw = cy + hr;
        const svg = `<svg viewBox="0 0 400 140" class="viz-svg w-full" style="max-height:140px">` +
            `<rect x="0" y="${tw}" width="400" height="${hr*2}" fill="rgba(59,130,246,0.06)"/>` +
            `<line x1="0" y1="${tw}" x2="400" y2="${tw}" stroke="#1F2937" stroke-width="3"/>` +
            `<line x1="0" y1="${bw}" x2="400" y2="${bw}" stroke="#1F2937" stroke-width="3"/>` +
            `<text x="6" y="${tw-3}" font-size="9" fill="#6B7280">parede</text>` +
            `<text x="6" y="${bw+10}" font-size="9" fill="#6B7280">parede</text>` +
            arrows + `</svg>`;
        const badge = `<div class="viz-meta"><span class="viz-chip" style="background:${color}20;color:${color};border:1px solid ${color}50">${regime} — Re ≈ ${Re.toFixed(0)}</span>` +
            `<span class="viz-note">Perfil estimado para água a 20 °C · D = ${(D_m*1000).toFixed(1)} mm · V = ${V} m/s</span></div>`;
        const wrap = document.createElement('div');
        wrap.className = 'viz-container mt-3';
        wrap.innerHTML = `<div class="viz-title">Perfil de Velocidade — Duto Circular</div>${svg}${badge}`;
        document.getElementById('calculated-diameter-result').appendChild(wrap);
    },

    async getRealDiameter(calculatedDiameter, schedule) {
        try {
            UI.showLoading('#real-diameter-form');
            UI.hideResult('#real-diameter-result');
            
            const result = await API.getRealDiameter(calculatedDiameter, schedule);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Diâmetro Real</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#real-diameter-result', html);

            document.dispatchEvent(new CustomEvent('tcc:calculated', { detail: {
                module: 'Dimensionamento',
                operation: 'Diâmetro Real',
                inputs: `D_calc = ${calculatedDiameter} mm · Schedule = ${schedule}`,
                summary: result ? 'Ver resultado acima' : '—',
            }}));
        } catch (error) {
            UI.showError('Erro ao obter diâmetro real', error);
        } finally {
            UI.hideLoading('#real-diameter-form');
        }
    }
};

// Export the Sizing module
window.SizingModule = SizingModule; 