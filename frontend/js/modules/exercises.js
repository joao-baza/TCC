/**
 * Exercises Module — Exercícios Integrados
 * Guided, multi-step exercises that chain existing calculator modules.
 */

const ExercisesModule = {

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    state: {
        exerciseId: null,
        stepIndex: 0,
        results: {}
    },

    _fluidList: [],

    /** Render a Select2-ready fluid select. `disabled` = read-only (step 2+). */
    _fluidSelect(id, selectedValue, disabled = false) {
        const opts = (ExercisesModule._fluidList || []).map(f =>
            `<option value="${f}"${f === selectedValue ? ' selected' : ''}>${f}</option>`
        ).join('');
        return `<select id="${id}" class="p-2 border rounded w-full text-sm ex-fluid-select"
                    data-placeholder="Selecione um fluido"${disabled ? ' disabled' : ''}>
                    <option value=""></option>${opts}
                </select>`;
    },

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    fmt(v, decimals = 4) {
        if (v === null || v === undefined) return '—';
        const n = Number(v);
        if (isNaN(n)) return String(v);
        if (Math.abs(n) >= 1e4 || (Math.abs(n) < 1e-3 && n !== 0)) {
            return n.toExponential(decimals);
        }
        return n.toFixed(decimals);
    },

    flowRegime(Re) {
        if (Re < 2300) return 'Laminar';
        if (Re < 4000) return 'Transição';
        return 'Turbulento';
    },

    // Pa to kgf/cm²
    paToKgfCm2(pa) { return pa / 98066.5; },

    // -----------------------------------------------------------------------
    // Exercise Definitions
    // -----------------------------------------------------------------------
    EXERCISES: [
        // ===================================================================
        // 1. TROCADOR DE CALOR
        // ===================================================================
        {
            id: 'heat-exchanger',
            title: 'Trocador de Calor',
            icon: '♨',
            desc: 'Use propriedades termodinâmicas reais (CoolProp) para calcular o calor trocado por unidade de massa entre dois estados de um fluido.',
            problem: 'Um trocador de calor opera com <strong>Propano</strong> (<code>n-Propane</code> no CoolProp — editável). Determine a potência do trocador para aquecer o fluido da temperatura de entrada até a de saída.',
            steps: [
                {
                    title: 'Etapa 1 — Entalpia de entrada (h₁)',
                    desc: 'Obtenha a entalpia do fluido nas condições de <strong>entrada</strong> do trocador via CoolProp.',
                    render(state) {
                        const fluid = state.results.fluid || 'n-Propane';
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Fluido</label>
                                ${ExercisesModule._fluidSelect('ex-fluid', fluid)}
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Temperatura de entrada T₁ (K)</label>
                                <input id="ex-t1" type="number" value="298.15" step="0.01" class="p-2 border rounded w-full text-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Pressão de entrada P₁ (Pa)</label>
                                <input id="ex-p1" type="number" value="101325" step="1" class="p-2 border rounded w-full text-sm">
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular h₁ via CoolProp</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const fluid = document.getElementById('ex-fluid').value.trim();
                        const t1 = parseFloat(document.getElementById('ex-t1').value);
                        const p1 = parseFloat(document.getElementById('ex-p1').value);
                        const r = await API.getProperty(fluid, 'H', t1, p1);
                        return { fluid, t1, p1, h1: r.value, display: `h₁ = ${ExercisesModule.fmt(r.value, 1)} J/kg` };
                    },
                    resultKey: 'h1',
                    contextText: 'Entalpia de entrada obtida. Agora precisamos da entalpia na saída para calcular a variação de energia.'
                },
                {
                    title: 'Etapa 2 — Entalpia de saída (h₂)',
                    desc: 'Obtenha a entalpia do fluido nas condições de <strong>saída</strong> do trocador.',
                    render(state) {
                        const fluid = state.results.fluid || 'n-Propane';
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Fluido (da etapa anterior)</label>
                                ${ExercisesModule._fluidSelect('ex-fluid2', fluid, true)}
                            </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Temperatura de saída T₂ (K)</label>
                                <input id="ex-t2" type="number" value="353.15" step="0.01" class="p-2 border rounded w-full text-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Pressão de saída P₂ (Pa)</label>
                                <input id="ex-p2" type="number" value="101325" step="1" class="p-2 border rounded w-full text-sm">
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular h₂ via CoolProp</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const fluid = state.results.fluid || 'n-Propane';
                        const t2 = parseFloat(document.getElementById('ex-t2').value);
                        const p2 = parseFloat(document.getElementById('ex-p2').value);
                        const r = await API.getProperty(fluid, 'H', t2, p2);
                        return { h2: r.value, display: `h₂ = ${ExercisesModule.fmt(r.value, 1)} J/kg` };
                    },
                    resultKey: 'h2',
                    contextText: 'Entalpia de saída obtida. Com Δh = h₂ − h₁ e a vazão mássica, calculamos a potência do trocador.'
                },
                {
                    title: 'Etapa 3 — Potência do trocador (Q̇)',
                    desc: 'Calcule a potência trocada: Q̇ = ṁ · (h₂ − h₁)',
                    render(state) {
                        const dh = ((state.results.h2 || 0) - (state.results.h1 || 0));
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                <div>h₁ = ${ExercisesModule.fmt(state.results.h1, 1)} J/kg</div>
                                <div>h₂ = ${ExercisesModule.fmt(state.results.h2, 1)} J/kg</div>
                                <div class="font-semibold">Δh = ${ExercisesModule.fmt(dh, 1)} J/kg</div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Vazão mássica ṁ (kg/s)</label>
                                <input id="ex-mdot" type="number" value="1.5" step="0.01" class="p-2 border rounded w-full text-sm">
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Q̇</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const mdot = parseFloat(document.getElementById('ex-mdot').value);
                        const dh = (state.results.h2 - state.results.h1);
                        const Qdot = mdot * dh / 1000;
                        return { Qdot, display: `Q̇ = ${ExercisesModule.fmt(Qdot, 2)} kW` };
                    },
                    resultKey: 'Qdot',
                    contextText: 'Exercício concluído! A potência do trocador depende do fluido, das condições e da vazão. Tente variar a temperatura de saída ou o fluido.'
                }
            ]
        },

        // ===================================================================
        // 2. ALIMENTAÇÃO DE REATOR
        // ===================================================================
        {
            id: 'reactor-feed',
            title: 'Alimentação de Reator',
            icon: '⚙',
            desc: 'Dimensione a tubulação e selecione a bomba para conduzir um fluido até um reator, encadeando CoolProp → Reynolds → Perda de carga → NPSH → Altura manométrica.',
            problem: 'Uma linha de alimentação conduz <strong>água a 80 °C</strong> até um reator. Dimensione a tubulação e calcule os requisitos da bomba centrífuga.',
            steps: [
                {
                    title: 'Etapa 1 — Propriedades do fluido',
                    desc: 'Obtenha densidade e viscosidade via CoolProp para as condições de operação.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Fluido</label>
                                ${ExercisesModule._fluidSelect('ex-fluid', 'Water')}
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Temperatura (K)</label>
                                <input id="ex-T" type="number" value="353.15" step="0.01" class="p-2 border rounded w-full text-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Pressão (Pa)</label>
                                <input id="ex-P" type="number" value="200000" step="1" class="p-2 border rounded w-full text-sm">
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Consultar CoolProp</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const fluid = document.getElementById('ex-fluid').value.trim();
                        const T = parseFloat(document.getElementById('ex-T').value);
                        const P = parseFloat(document.getElementById('ex-P').value);
                        const [rho, mu, pv] = await Promise.all([
                            API.getProperty(fluid, 'D', T, P),
                            API.getProperty(fluid, 'V', T, P),
                            API.getProperty(fluid, 'P', T, 0).catch(() => ({ value: null }))
                        ]);
                        // get vapor pressure via Q=0 saturation
                        let pvapVal = 47400; // default for water at 80C
                        try {
                            const pvr = await API.getPropertyByState(fluid, 'T', T, 'Q', 0, 'P');
                            pvapVal = pvr.value;
                        } catch (e) { /* use default */ }
                        return {
                            fluid, T, P,
                            rho: rho.value, mu: mu.value, pvap: pvapVal,
                            display: `ρ = ${ExercisesModule.fmt(rho.value, 2)} kg/m³ · μ = ${ExercisesModule.fmt(mu.value, 6)} Pa·s`
                        };
                    },
                    resultKey: 'rho',
                    contextText: 'Densidade e viscosidade obtidas. Com essas propriedades calculamos o regime de escoamento na tubulação.'
                },
                {
                    title: 'Etapa 2 — Número de Reynolds',
                    desc: 'Calcule Re para determinar o regime de escoamento.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">ρ (kg/m³)</label>
                                    <input id="ex-rho" type="number" value="${ExercisesModule.fmt(state.results.rho,3)}" step="any" class="p-2 border rounded w-full text-sm bg-blue-50">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">μ (Pa·s)</label>
                                    <input id="ex-mu" type="number" value="${ExercisesModule.fmt(state.results.mu,7)}" step="any" class="p-2 border rounded w-full text-sm bg-blue-50">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Diâmetro (mm)</label>
                                    <input id="ex-D-mm" type="number" value="50" step="1" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Velocidade (m/s)</label>
                                    <input id="ex-v" type="number" value="2.0" step="0.1" class="p-2 border rounded w-full text-sm">
                                </div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Reynolds</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const rho = parseFloat(document.getElementById('ex-rho').value);
                        const mu = parseFloat(document.getElementById('ex-mu').value);
                        const Dmm = parseFloat(document.getElementById('ex-D-mm').value);
                        const v = parseFloat(document.getElementById('ex-v').value);
                        const r = await API.calculateReynolds({ characteristic_diameter: Dmm, velocity: v, density: rho, dynamic_viscosity: mu });
                        const Re = r.value;
                        const regime = ExercisesModule.flowRegime(Re);
                        return { Re, regime, Dmm, v, display: `Re = ${ExercisesModule.fmt(Re, 0)} (${regime})` };
                    },
                    resultKey: 'Re',
                    contextText: 'Regime de escoamento determinado. Com Re e a rugosidade da tubulação, calculamos o fator de atrito e a perda de carga.'
                },
                {
                    title: 'Etapa 3 — Perda de carga (Darcy-Weisbach)',
                    desc: 'Calcule a perda de carga na linha de alimentação.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Diâmetro (mm)</label>
                                    <input id="ex-D-mm2" type="number" value="${state.results.Dmm||50}" step="1" class="p-2 border rounded w-full text-sm bg-blue-50">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Velocidade (m/s)</label>
                                    <input id="ex-v2" type="number" value="${state.results.v||2.0}" step="0.1" class="p-2 border rounded w-full text-sm bg-blue-50">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Comprimento L (m)</label>
                                    <input id="ex-L" type="number" value="50" step="1" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Rugosidade ε (mm)</label>
                                    <input id="ex-eps" type="number" value="0.046" step="0.001" class="p-2 border rounded w-full text-sm">
                                </div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Perda de Carga</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const Dmm = parseFloat(document.getElementById('ex-D-mm2').value);
                        const v = parseFloat(document.getElementById('ex-v2').value);
                        const L = parseFloat(document.getElementById('ex-L').value);
                        const eps = parseFloat(document.getElementById('ex-eps').value);
                        const Re = state.results.Re;
                        // 1) friction factor
                        const fr = await API.calculateFrictionFactor(eps, Dmm, Re, 'ColebrookWhite');
                        const f = fr.value;
                        // 2) headloss
                        const hl = await API.calculateHeadloss({ method: 'Darcy-Weisbach', pipe_length: L, diameter: Dmm, friction_factor: f, velocity: v });
                        const headloss_m = hl.value;
                        return { headloss_m, f, Dmm2: Dmm, v2: v, L, display: `ΔP = ${ExercisesModule.fmt(headloss_m, 3)} m.c.l. · f = ${ExercisesModule.fmt(f, 5)}` };
                    },
                    resultKey: 'headloss_m',
                    contextText: 'Perda de carga obtida. Esse valor (em metros de coluna de líquido) define a energia que a bomba precisa fornecer ao fluido.'
                },
                {
                    title: 'Etapa 4 — NPSH disponível',
                    desc: 'Calcule o NPSH disponível para verificar risco de cavitação.',
                    render(state) {
                        const pvap_kgf = ExercisesModule.paToKgfCm2(state.results.pvap || 47400);
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">ρ (kg/m³)</label>
                                    <input id="ex-rho-n" type="number" value="${ExercisesModule.fmt(state.results.rho,2)}" step="any" class="p-2 border rounded w-full text-sm bg-blue-50">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">P manométrica (kgf/cm²)</label>
                                    <input id="ex-Ps" type="number" value="0" step="0.01" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">P atmosférica (kgf/cm²)</label>
                                    <input id="ex-Patm" type="number" value="1.033" step="0.001" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">P vapor (kgf/cm²)</label>
                                    <input id="ex-Pv" type="number" value="${ExercisesModule.fmt(pvap_kgf,4)}" step="0.0001" class="p-2 border rounded w-full text-sm bg-blue-50">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Cota z_s (m)</label>
                                    <input id="ex-z-s" type="number" value="-0.5" step="0.1" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">v entrada bomba (m/s)</label>
                                    <input id="ex-v-npsh" type="number" value="${state.results.v||2.0}" step="0.1" class="p-2 border rounded w-full text-sm bg-blue-50">
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Perda de carga na sucção (m)</label>
                                    <input id="ex-hl-s" type="number" value="0.3" step="0.1" class="p-2 border rounded w-full text-sm">
                                </div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular NPSH disponível</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const rho = parseFloat(document.getElementById('ex-rho-n').value);
                        const Ps = parseFloat(document.getElementById('ex-Ps').value);
                        const Patm = parseFloat(document.getElementById('ex-Patm').value);
                        const Pv = parseFloat(document.getElementById('ex-Pv').value);
                        const zs = parseFloat(document.getElementById('ex-z-s').value);
                        const v = parseFloat(document.getElementById('ex-v-npsh').value);
                        const hls = parseFloat(document.getElementById('ex-hl-s').value);
                        const r = await API.calculateNPSHAvailable({
                            manometric_pressure: Ps, atmospheric_pressure: Patm,
                            vapor_pressure: Pv, density: rho, friction_factor: hls,
                            pump_inlet_velocity: v, gauge_elevation: zs
                        });
                        const npsh = r.head_loss.value;
                        return { npsh_avail: npsh, display: `NPSH_disp = ${ExercisesModule.fmt(npsh, 3)} m` };
                    },
                    resultKey: 'npsh_avail',
                    contextText: 'NPSH disponível calculado. Esse valor deve ser maior que o NPSH requerido da bomba (informado pelo fabricante) para evitar cavitação.'
                },
                {
                    title: 'Etapa 5 — Altura manométrica total',
                    desc: 'Calcule a altura manométrica que a bomba deve fornecer (Equação de Bernoulli estendida).',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm mb-2">
                                Perda de carga total ≈ ${ExercisesModule.fmt(state.results.headloss_m, 3)} m · ρ = ${ExercisesModule.fmt(state.results.rho, 2)} kg/m³
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">P₁ sucção (Pa)</label>
                                    <input id="ex-p1h" type="number" value="101325" step="1" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">P₂ descarga (Pa)</label>
                                    <input id="ex-p2h" type="number" value="200000" step="1" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">z₁ sucção (m)</label>
                                    <input id="ex-z1h" type="number" value="0" step="0.1" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">z₂ descarga (m)</label>
                                    <input id="ex-z2h" type="number" value="3" step="0.1" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">v₁ (m/s)</label>
                                    <input id="ex-v1h" type="number" value="${state.results.v||2.0}" step="0.1" class="p-2 border rounded w-full text-sm bg-blue-50">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">v₂ (m/s)</label>
                                    <input id="ex-v2h" type="number" value="${state.results.v||2.0}" step="0.1" class="p-2 border rounded w-full text-sm">
                                </div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Altura Manométrica</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const rho = state.results.rho;
                        const headloss = state.results.headloss_m;
                        const p1 = parseFloat(document.getElementById('ex-p1h').value);
                        const p2 = parseFloat(document.getElementById('ex-p2h').value);
                        const z1 = parseFloat(document.getElementById('ex-z1h').value);
                        const z2 = parseFloat(document.getElementById('ex-z2h').value);
                        const v1 = parseFloat(document.getElementById('ex-v1h').value);
                        const v2 = parseFloat(document.getElementById('ex-v2h').value);
                        const r = await API.calculateHead({ pressure1: p1, pressure2: p2, elevation1: z1, elevation2: z2, velocity1: v1, velocity2: v2, density: rho, friction_factor: headloss });
                        const H = r.value;
                        return { head_m: H, display: `H_man = ${ExercisesModule.fmt(H, 3)} m` };
                    },
                    resultKey: 'head_m',
                    contextText: 'Exercício concluído! A altura manométrica total define a seleção da bomba. Compare H_man com NPSH_disp para garantir operação segura.'
                }
            ]
        },

        // ===================================================================
        // 3. CICLO DE RANKINE
        // ===================================================================
        {
            id: 'rankine',
            title: 'Ciclo de Rankine',
            icon: '⚡',
            desc: 'Calcule os 4 estados termodinâmicos do ciclo de Rankine para vapor d\'água e determine a eficiência térmica do ciclo.',
            problem: 'Um ciclo de Rankine opera com <strong>vapor d\'água</strong>. Calcule cada ponto do ciclo (caldeira → turbina → condensador → bomba) e determine a eficiência térmica η.',
            steps: [
                {
                    title: 'Etapa 1 — Estado 1: Vapor superaquecido (saída caldeira)',
                    desc: 'Determine h₁ e s₁ do vapor superaquecido na entrada da turbina.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs mb-2">
                                <strong>Estado 1</strong>: vapor superaquecido saindo da caldeira e entrando na turbina.
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">T₁ (K)</label>
                                    <input id="ex-T1" type="number" value="773.15" step="0.01" class="p-2 border rounded w-full text-sm">
                                    <span class="text-xs text-gray-400">500 °C</span>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">P₁ (Pa)</label>
                                    <input id="ex-P1" type="number" value="3000000" step="1000" class="p-2 border rounded w-full text-sm">
                                    <span class="text-xs text-gray-400">3 MPa</span>
                                </div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Estado 1 via CoolProp</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const T1 = parseFloat(document.getElementById('ex-T1').value);
                        const P1 = parseFloat(document.getElementById('ex-P1').value);
                        const [rH, rS] = await Promise.all([
                            API.getProperty('Water', 'H', T1, P1),
                            API.getProperty('Water', 'S', T1, P1)
                        ]);
                        return { T1, P1, h1: rH.value, s1: rS.value, display: `h₁ = ${ExercisesModule.fmt(rH.value,1)} J/kg · s₁ = ${ExercisesModule.fmt(rS.value,2)} J/kg/K` };
                    },
                    resultKey: 'h1',
                    contextText: 'Estado 1 calculado. O vapor entra na turbina e se expande isentropicamente (s₂ = s₁). Usaremos P₂ e S=s₁ para encontrar h₂.'
                },
                {
                    title: 'Etapa 2 — Estado 2: Saída da turbina (expansão isentrópica)',
                    desc: 'Calcule h₂ pela expansão isentrópica da turbina (P₂, S = s₁).',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs mb-2">
                                <strong>Estado 2</strong>: saída da turbina. Expansão isentrópica: s₂ = s₁ = ${ExercisesModule.fmt(state.results.s1,2)} J/kg/K.
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">P₂ — Pressão do condensador (Pa)</label>
                                <input id="ex-P2" type="number" value="10000" step="100" class="p-2 border rounded w-full text-sm">
                                <span class="text-xs text-gray-400">10 kPa</span>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">s₂ = s₁ (J/kg·K) — pré-preenchido</label>
                                <input id="ex-s1r" type="number" value="${ExercisesModule.fmt(state.results.s1,4)}" class="p-2 border rounded w-full text-sm bg-blue-50" readonly>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular h₂ (P+S → H)</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const P2 = parseFloat(document.getElementById('ex-P2').value);
                        const s1 = state.results.s1;
                        const r = await API.getPropertyByState('Water', 'P', P2, 'S', s1, 'H');
                        return { P2, h2: r.value, display: `h₂ = ${ExercisesModule.fmt(r.value,1)} J/kg` };
                    },
                    resultKey: 'h2',
                    contextText: 'Saída da turbina calculada. O vapor úmido entra no condensador e perde calor até virar líquido saturado (Q=0).'
                },
                {
                    title: 'Etapa 3 — Estado 3: Saída do condensador (líquido saturado)',
                    desc: 'Calcule h₃ e s₃ do líquido saturado na saída do condensador.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs mb-2">
                                <strong>Estado 3</strong>: líquido saturado saindo do condensador. Qualidade Q = 0 (totalmente líquido).
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">P₃ = P₂ (Pa)</label>
                                <input id="ex-P3" type="number" value="${state.results.P2||10000}" class="p-2 border rounded w-full text-sm bg-blue-50" readonly>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Q = 0 (líquido saturado)</label>
                                <input type="text" value="0 (fixo)" class="p-2 border rounded w-full text-sm bg-gray-100" disabled>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Estado 3 (P+Q=0)</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const P3 = state.results.P2 || 10000;
                        const [rH, rS] = await Promise.all([
                            API.getPropertyByState('Water', 'P', P3, 'Q', 0, 'H'),
                            API.getPropertyByState('Water', 'P', P3, 'Q', 0, 'S')
                        ]);
                        return { h3: rH.value, s3: rS.value, P3, display: `h₃ = ${ExercisesModule.fmt(rH.value,1)} J/kg · s₃ = ${ExercisesModule.fmt(rS.value,2)} J/kg/K` };
                    },
                    resultKey: 'h3',
                    contextText: 'Estado 3 calculado. A bomba comprime o líquido isentropicamente de P₂ para P₁ (s₄ = s₃).'
                },
                {
                    title: 'Etapa 4 — Estado 4: Saída da bomba (compressão isentrópica)',
                    desc: 'Calcule h₄ pela compressão isentrópica da bomba (P₁, S = s₃).',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs mb-2">
                                <strong>Estado 4</strong>: saída da bomba. Compressão isentrópica: s₄ = s₃ = ${ExercisesModule.fmt(state.results.s3,2)} J/kg/K.
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">P₄ = P₁ (Pa)</label>
                                <input id="ex-P4" type="number" value="${state.results.P1||3000000}" class="p-2 border rounded w-full text-sm bg-blue-50" readonly>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">s₄ = s₃ (J/kg·K)</label>
                                <input id="ex-s3r" type="number" value="${ExercisesModule.fmt(state.results.s3,4)}" class="p-2 border rounded w-full text-sm bg-blue-50" readonly>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular h₄ (P+S → H)</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const P4 = state.results.P1 || 3000000;
                        const s3 = state.results.s3;
                        const r = await API.getPropertyByState('Water', 'P', P4, 'S', s3, 'H');
                        return { h4: r.value, display: `h₄ = ${ExercisesModule.fmt(r.value,1)} J/kg` };
                    },
                    resultKey: 'h4',
                    contextText: 'Estado 4 calculado. Com os 4 pontos do ciclo, podemos calcular a eficiência térmica.'
                },
                {
                    title: 'Etapa 5 — Eficiência térmica do ciclo',
                    desc: 'Calcule W_turbina, W_bomba, Q_caldeira e η.',
                    render(state) {
                        const h1 = state.results.h1, h2 = state.results.h2;
                        const h3 = state.results.h3, h4 = state.results.h4;
                        return `
                        <form id="ex-step-form">
                            <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm space-y-1 mb-3">
                                <div class="font-semibold text-gray-700 mb-2">Resumo dos estados</div>
                                <div class="grid grid-cols-2 gap-x-4 text-xs">
                                    <div>Estado 1 (caldeira): h₁ = ${ExercisesModule.fmt(h1,1)} J/kg</div>
                                    <div>Estado 2 (turbina): h₂ = ${ExercisesModule.fmt(h2,1)} J/kg</div>
                                    <div>Estado 3 (condensador): h₃ = ${ExercisesModule.fmt(h3,1)} J/kg</div>
                                    <div>Estado 4 (bomba): h₄ = ${ExercisesModule.fmt(h4,1)} J/kg</div>
                                </div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Eficiência</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const { h1, h2, h3, h4 } = state.results;
                        const W_turb = h1 - h2;
                        const W_bomb = h4 - h3;
                        const W_liq = W_turb - W_bomb;
                        const Q_in = h1 - h4;
                        const eta = (W_liq / Q_in) * 100;
                        const lines = [
                            `W_turbina = ${ExercisesModule.fmt(W_turb/1000,2)} kJ/kg`,
                            `W_bomba = ${ExercisesModule.fmt(W_bomb/1000,2)} kJ/kg`,
                            `W_líquido = ${ExercisesModule.fmt(W_liq/1000,2)} kJ/kg`,
                            `Q_caldeira = ${ExercisesModule.fmt(Q_in/1000,2)} kJ/kg`,
                            `η = ${ExercisesModule.fmt(eta,1)} %`
                        ];
                        return { eta, display: `η = ${ExercisesModule.fmt(eta,1)} %` };
                    },
                    resultKey: 'eta',
                    contextText: 'Ciclo de Rankine concluído! A eficiência típica está entre 30–45%. Experimente alterar P₁ (pressão da caldeira) ou T₁ para ver o impacto na eficiência.'
                }
            ]
        },

        // ===================================================================
        // 4. REATORES EM SÉRIE
        // ===================================================================
        {
            id: 'series-reactors',
            title: 'Reatores em Série',
            icon: '⚗',
            desc: 'Compare as configurações PFR→CSTR e CSTR→PFR para determinar qual requer menor volume total para uma dada conversão final.',
            problem: 'Reação A→B (1ª ordem em fase líquida, k = 0,5 L/mol/s). Compare o volume total das configurações <strong>PFR→CSTR</strong> e <strong>CSTR→PFR</strong> para X_final = 0,9.',
            steps: [
                {
                    title: 'Etapa 1 — Gráfico de Levenspiel (X vs V)',
                    desc: 'Visualize o comportamento de cada reator isolado antes de combinar.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <p class="text-xs text-gray-600">O gráfico mostra conversão vs volume para CSTR e PFR operando com a mesma cinética. A diferença entre as curvas motiva a combinação em série.</p>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Gerar Gráfico de Levenspiel</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const params = ExercisesModule._reactorBase(0.89);
                        const r = await API.plotConversionVsVolume(params);
                        return { levenspiel_done: true, levenspiel_img: r.image_base64, display: 'Gráfico gerado' };
                    },
                    resultKey: 'levenspiel_done',
                    contextText: 'Para reações de ordem positiva, o PFR é sempre mais eficiente que o CSTR isolado. A vantagem do PFR diminui em conversões mais altas.'
                },
                {
                    title: 'Etapa 2 — V_PFR₁ (0 → X_int)',
                    desc: 'Calcule o volume do PFR que vai da alimentação até a conversão intermediária.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">X_int (conversão intermediária)</label>
                                    <input id="ex-Xint" type="number" value="0.5" step="0.05" min="0.1" max="0.85" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">X_final</label>
                                    <input id="ex-Xfin" type="number" value="0.9" step="0.05" min="0.6" max="0.97" class="p-2 border rounded w-full text-sm">
                                </div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular V_PFR₁</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const Xint = parseFloat(document.getElementById('ex-Xint').value);
                        const Xfin = parseFloat(document.getElementById('ex-Xfin').value);
                        const r = await API.calculatePFR({ ...ExercisesModule._reactorBase(), input_type: 'conversion_and_kinetics', conversion: Xint, recycling_ratio: 0 });
                        const V_PFR1 = r.volume.value;
                        return { V_PFR1, Xint, Xfin, display: `V_PFR₁ = ${ExercisesModule.fmt(V_PFR1,5)} m³` };
                    },
                    resultKey: 'V_PFR1',
                    contextText: 'Volume do primeiro PFR calculado. Agora calculamos o CSTR que finaliza de X_int até X_final (configuração PFR→CSTR).'
                },
                {
                    title: 'Etapa 3 — V_CSTR₂ e V_total (PFR→CSTR)',
                    desc: 'Calcule o CSTR que completa a reação (X_int → X_final) e some os volumes.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                V_PFR₁ = ${ExercisesModule.fmt(state.results.V_PFR1,5)} m³ (0 → ${state.results.Xint})
                            </div>
                            <p class="text-xs text-gray-600">Para CSTR em série: V_CSTR₂ = V_CSTR(0→X_fin) × (X_fin − X_int) / X_fin</p>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular V_CSTR₂ e V_total</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const { Xint, Xfin, V_PFR1 } = state.results;
                        const r = await API.calculateCSTR({ ...ExercisesModule._reactorBase(), input_type: 'conversion_and_kinetics', conversion: Xfin });
                        const V_cstr_total = r.volume.value;
                        const V_CSTR2 = V_cstr_total * (Xfin - Xint) / Xfin;
                        const V_total_1 = V_PFR1 + V_CSTR2;
                        return { V_CSTR2, V_total_PFR_CSTR: V_total_1, display: `V_CSTR₂ = ${ExercisesModule.fmt(V_CSTR2,5)} m³ · V_total = ${ExercisesModule.fmt(V_total_1,5)} m³` };
                    },
                    resultKey: 'V_total_PFR_CSTR',
                    contextText: 'Configuração PFR→CSTR calculada. Agora calculamos a configuração inversa (CSTR→PFR) para comparar.'
                },
                {
                    title: 'Etapa 4 — V_CSTR₁ (0 → X_int)',
                    desc: 'Calcule o volume do CSTR que vai da alimentação até a conversão intermediária.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                Configuração CSTR→PFR · X_int = ${state.results.Xint}
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular V_CSTR₁</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const Xint = state.results.Xint;
                        const r = await API.calculateCSTR({ ...ExercisesModule._reactorBase(), input_type: 'conversion_and_kinetics', conversion: Xint });
                        const V_CSTR1 = r.volume.value;
                        return { V_CSTR1, display: `V_CSTR₁ = ${ExercisesModule.fmt(V_CSTR1,5)} m³` };
                    },
                    resultKey: 'V_CSTR1',
                    contextText: 'Primeiro CSTR calculado. Agora calculamos o PFR que completa a reação de X_int até X_final.'
                },
                {
                    title: 'Etapa 5 — V_PFR₂ e V_total (CSTR→PFR)',
                    desc: 'Calcule o PFR que vai de X_int até X_final e some os volumes.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                V_CSTR₁ = ${ExercisesModule.fmt(state.results.V_CSTR1,5)} m³ (0 → ${state.results.Xint})
                            </div>
                            <p class="text-xs text-gray-600">Para PFR em série: V_PFR₂ = V_PFR(0→X_fin) − V_PFR(0→X_int)</p>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular V_PFR₂ e V_total</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const { Xint, Xfin, V_CSTR1 } = state.results;
                        const base = ExercisesModule._reactorBase();
                        const [r1, r2] = await Promise.all([
                            API.calculatePFR({ ...base, input_type: 'conversion_and_kinetics', conversion: Xfin, recycling_ratio: 0 }),
                            API.calculatePFR({ ...base, input_type: 'conversion_and_kinetics', conversion: Xint, recycling_ratio: 0 })
                        ]);
                        const V_PFR2 = r1.volume.value - r2.volume.value;
                        const V_total_2 = V_CSTR1 + V_PFR2;
                        return { V_PFR2, V_total_CSTR_PFR: V_total_2, display: `V_PFR₂ = ${ExercisesModule.fmt(V_PFR2,5)} m³ · V_total = ${ExercisesModule.fmt(V_total_2,5)} m³` };
                    },
                    resultKey: 'V_total_CSTR_PFR',
                    contextText: 'Configuração CSTR→PFR calculada. Agora comparamos as duas configurações para escolher a mais eficiente.'
                },
                {
                    title: 'Etapa 6 — Comparação e decisão',
                    desc: 'Compare os volumes totais e justifique a escolha.',
                    render(state) {
                        return `<form id="ex-step-form"><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Ver comparação</button></form>`;
                    },
                    async run(vals, state) {
                        const { V_PFR1, V_CSTR2, V_total_PFR_CSTR, V_CSTR1, V_PFR2, V_total_CSTR_PFR, Xint, Xfin } = state.results;
                        const melhor = V_total_PFR_CSTR < V_total_CSTR_PFR ? 'PFR→CSTR' : 'CSTR→PFR';
                        const economia = Math.abs(V_total_PFR_CSTR - V_total_CSTR_PFR);
                        return {
                            melhor,
                            display: `Melhor: ${melhor} (economia de ${ExercisesModule.fmt(economia,5)} m³)`,
                            comparison: { V_total_PFR_CSTR, V_total_CSTR_PFR, Xint, Xfin }
                        };
                    },
                    resultKey: 'melhor',
                    contextText: 'Para reações de ordem positiva, PFR→CSTR geralmente requer menor volume total. A vantagem aumenta com a diferença entre X_int e X_final.'
                }
            ]
        },

        // ===================================================================
        // 5. BALANÇO SIMPLES (sem reciclo)
        // ===================================================================
        {
            id: 'balance-simple',
            title: 'Balanço de Massa Simples',
            icon: '⚖',
            desc: 'Resolva um balanço de massa para a reação A→B sem reciclo. Observe a relação entre conversão por passagem e a composição do produto.',
            problem: 'Reação <strong>A → B</strong> em regime estacionário. Alimentação de 100 kg/h de A puro. Sem reciclo — a conversão global é igual à conversão por passagem.',
            steps: [
                {
                    title: 'Etapa 1 — Calcular balanço de massa',
                    desc: 'Defina a conversão e calcule as correntes de entrada e saída.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-gray-50 border rounded p-3 text-sm">
                                <div class="font-semibold mb-2">Sistema: A → B (sem reciclo)</div>
                                <div>Feed: 100 kg/h · zA = 1,0 · zB = 0,0</div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Conversão X (0–1)</label>
                                <input id="ex-X-simple" type="number" value="0.8" step="0.01" min="0.01" max="0.99" class="p-2 border rounded w-full text-sm">
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Balanço</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const X = parseFloat(document.getElementById('ex-X-simple').value);
                        const payload = {
                            components: ['A', 'B'],
                            streams: [
                                { name: 'Feed', direction: 1, flow_rate: 100, compositions: { A: 1.0, B: 0.0 } },
                                { name: 'Produto', direction: -1, flow_rate: null, compositions: { A: null, B: null } }
                            ],
                            reactions: [{ stoichiometry: { A: -1, B: 1 }, key_component: 'A', conversion: X }],
                            splits: null
                        };
                        const r = await API.calculateMassBalance(payload);
                        const prod = r.results['Produto'];
                        return {
                            X, balance_payload: payload, balance_results: r.results,
                            display: `Produto: ${ExercisesModule.fmt(prod.flow_rate,2)} kg/h · zA = ${ExercisesModule.fmt(prod.compositions.A,4)} · zB = ${ExercisesModule.fmt(prod.compositions.B,4)}`
                        };
                    },
                    resultKey: 'balance_results',
                    contextText: 'Sem reciclo, conversão global = conversão por passagem. Todo o A não reagido sai com o produto.'
                },
                {
                    title: 'Etapa 2 — Rendimentos',
                    desc: 'Calcule o rendimento de B produzido a partir de A consumido.',
                    render(state) {
                        return `<form id="ex-step-form"><div class="text-sm text-gray-600 mb-3">Calcularemos o yield de B a partir de A para este sistema sem reciclo.</div><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Rendimentos</button></form>`;
                    },
                    async run(vals, state) {
                        const r = await API.calculateYields(state.results.balance_payload);
                        const yieldBA = r.yields['B_from_A'];
                        return { yield_BA: yieldBA, display: `Rendimento B←A = ${ExercisesModule.fmt(yieldBA,1)} %` };
                    },
                    resultKey: 'yield_BA',
                    contextText: 'Exercício concluído! No balanço simples, o rendimento de B é igual à conversão. Compare com o balanço com reciclo para ver a diferença.'
                }
            ]
        },

        // ===================================================================
        // 6. BALANÇO COM RECICLO
        // ===================================================================
        {
            id: 'balance-recycle',
            title: 'Balanço com Reciclo',
            icon: '🔄',
            desc: 'Demonstre como o reciclo aumenta a conversão global de A para além da conversão por passagem no reator.',
            problem: 'Reação <strong>A → B</strong> com corrente de reciclo. Alimentação fresca de 100 kg/h de A. Parte da saída do reator é reciclada para a entrada, aumentando a conversão global.',
            steps: [
                {
                    title: 'Etapa 1 — Calcular balanço com reciclo',
                    desc: 'Ajuste a conversão por passagem e a fração de reciclo para ver o efeito.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">X por passagem (0–1)</label>
                                    <input id="ex-Xpass" type="number" value="0.6" step="0.05" min="0.05" max="0.95" class="p-2 border rounded w-full text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Fração de reciclo f (0–1)</label>
                                    <input id="ex-f-rec" type="number" value="0.5" step="0.05" min="0.0" max="0.95" class="p-2 border rounded w-full text-sm">
                                </div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Balanço</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const Xpass = parseFloat(document.getElementById('ex-Xpass').value);
                        const f = parseFloat(document.getElementById('ex-f-rec').value);
                        const payload = {
                            components: ['A', 'B'],
                            streams: [
                                { name: 'Fresh_Feed', direction: 1, flow_rate: 100, compositions: { A: 1.0, B: 0.0 } },
                                { name: 'Reactor_Out', direction: -1, flow_rate: null, compositions: { A: null, B: null } },
                                { name: 'Recycle', direction: 1, flow_rate: null, compositions: { A: null, B: null } },
                                { name: 'Produto', direction: -1, flow_rate: null, compositions: { A: null, B: null } }
                            ],
                            reactions: [{ stoichiometry: { A: -1, B: 1 }, key_component: 'A', conversion: Xpass }],
                            splits: [{ parent_stream: 'Reactor_Out', recycle_stream: 'Recycle', purge_stream: 'Produto', fraction: f }]
                        };
                        const r = await API.calculateMassBalance(payload);
                        const prod = r.results['Produto'];
                        return {
                            Xpass, f, balance_payload_rec: payload, balance_results_rec: r.results,
                            zA_prod: prod.compositions.A, zB_prod: prod.compositions.B,
                            display: `Produto: zA = ${ExercisesModule.fmt(prod.compositions.A,4)} · zB = ${ExercisesModule.fmt(prod.compositions.B,4)}`
                        };
                    },
                    resultKey: 'balance_results_rec',
                    contextText: 'Com reciclo, o A não reagido retorna ao reator, aumentando a conversão global além de X por passagem.'
                },
                {
                    title: 'Etapa 2 — Comparação com e sem reciclo',
                    desc: 'Calcule o mesmo sistema sem reciclo para quantificar o ganho.',
                    render(state) {
                        return `<form id="ex-step-form"><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular sistema sem reciclo para comparação</button></form>`;
                    },
                    async run(vals, state) {
                        const { Xpass } = state.results;
                        const payloadSR = {
                            components: ['A', 'B'],
                            streams: [
                                { name: 'Feed', direction: 1, flow_rate: 100, compositions: { A: 1.0, B: 0.0 } },
                                { name: 'Produto_SR', direction: -1, flow_rate: null, compositions: { A: null, B: null } }
                            ],
                            reactions: [{ stoichiometry: { A: -1, B: 1 }, key_component: 'A', conversion: Xpass }],
                            splits: null
                        };
                        const r = await API.calculateMassBalance(payloadSR);
                        const zA_sr = r.results['Produto_SR'].compositions.A;
                        const zA_rec = state.results.zA_prod;
                        const diff = ((zA_sr - zA_rec) * 100).toFixed(2);
                        return {
                            zA_sr,
                            display: `Sem reciclo: zA = ${ExercisesModule.fmt(zA_sr,4)} · Com reciclo: zA = ${ExercisesModule.fmt(zA_rec,4)} · Redução de A: ${diff}%`
                        };
                    },
                    resultKey: 'zA_sr',
                    contextText: 'A diferença mostra quantitativamente o benefício do reciclo. Quanto maior a fração de reciclo f, menor A no produto final (maior conversão global).'
                },
                {
                    title: 'Etapa 3 — Rendimentos',
                    desc: 'Calcule o rendimento global de B no sistema com reciclo.',
                    render(state) {
                        return `<form id="ex-step-form"><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Rendimentos</button></form>`;
                    },
                    async run(vals, state) {
                        const r = await API.calculateYields(state.results.balance_payload_rec);
                        const y = r.yields['B_from_A'];
                        return { yield_rec: y, display: `Rendimento B←A (com reciclo) = ${ExercisesModule.fmt(y,1)} %` };
                    },
                    resultKey: 'yield_rec',
                    contextText: 'Exercício concluído! O reciclo aumenta o rendimento global sem alterar as condições do reator. O trade-off é maior custo de bombeamento e equipamentos maiores.'
                }
            ]
        },

        // ===================================================================
        // 7. BALANÇO COM RECICLO E PURGA
        // ===================================================================
        {
            id: 'balance-purge',
            title: 'Reciclo com Purga (Inerte)',
            icon: '💨',
            desc: 'Demonstre como a presença de um inerte no feed exige purga para evitar acúmulo indefinido no circuito de reciclo.',
            problem: 'Reação <strong>A → B</strong> com inerte I (feed: A = 0,8; I = 0,2). Sem purga, o inerte I acumula no reciclo indefinidamente. A purga drena continuamente uma fração da corrente circulante.',
            steps: [
                {
                    title: 'Etapa 1 — Sem purga: o problema do acúmulo',
                    desc: 'Simule f ≈ 1,0 (quase sem purga) e observe o acúmulo de I no circuito.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                                <strong>Sistema:</strong> Feed = 100 kg/h · zA=0,8 · zI=0,2<br>
                                Reação A → B (X=0,7 por passagem) · Inerte I não reage.<br>
                                <strong>Cenário:</strong> f = 0,999 (praticamente sem purga)
                            </div>
                            <button type="submit" class="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 w-full text-sm">Simular sem purga (f = 0,999)</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const payload = ExercisesModule._purgePayload(0.999);
                        const r = await API.calculateMassBalance(payload);
                        const rec = r.results['Recycle'];
                        const zI_rec = rec.compositions.I;
                        return {
                            zI_no_purge: zI_rec,
                            display: `Sem purga: I no reciclo = ${ExercisesModule.fmt(zI_rec,4)} (fração mássica)`
                        };
                    },
                    resultKey: 'zI_no_purge',
                    contextText: 'Sem purga, I acumula até dominar o circuito. O sistema entra em colapso operacional. A purga drena continuamente I para manter regime estacionário real.'
                },
                {
                    title: 'Etapa 2 — Com purga: regime estacionário controlado',
                    desc: 'Calcule o sistema com fração de reciclo f < 1 e veja I controlado.',
                    render(state) {
                        return `
                        <form id="ex-step-form" class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Fração de reciclo f (< 1)</label>
                                <input id="ex-f-purge" type="number" value="0.6" step="0.05" min="0.1" max="0.95" class="p-2 border rounded w-full text-sm">
                                <span class="text-xs text-gray-400">1−f é a fração que vai para a purga/produto</span>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular com purga</button>
                        </form>`;
                    },
                    async run(vals, state) {
                        const f = parseFloat(document.getElementById('ex-f-purge').value);
                        const payload = ExercisesModule._purgePayload(f);
                        const r = await API.calculateMassBalance(payload);
                        const rec = r.results['Recycle'];
                        const purge = r.results['Purga_Produto'];
                        return {
                            f, purge_payload: payload, purge_results: r.results,
                            zI_rec: rec.compositions.I, zI_purge: purge.compositions.I,
                            display: `I no reciclo = ${ExercisesModule.fmt(rec.compositions.I,4)} · I na purga = ${ExercisesModule.fmt(purge.compositions.I,4)}`
                        };
                    },
                    resultKey: 'zI_rec',
                    contextText: 'Com purga (f<1), I atinge regime estacionário. Aumentar a purga (diminuir f) reduz I no circuito, mas aumenta a perda de A não reagido.'
                },
                {
                    title: 'Etapa 3 — Rendimentos com purga',
                    desc: 'Calcule o rendimento global de B considerando as perdas pela purga.',
                    render(state) {
                        return `<form id="ex-step-form"><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">Calcular Rendimentos</button></form>`;
                    },
                    async run(vals, state) {
                        const r = await API.calculateYields(state.results.purge_payload);
                        const y = r.yields['B_from_A'];
                        return { yield_purge: y, display: `Rendimento B←A = ${ExercisesModule.fmt(y,1)} %` };
                    },
                    resultKey: 'yield_purge',
                    contextText: 'Exercício concluído! A purga é essencial quando há inertes. O projeto ótimo balanceia controle de acúmulo vs perda de reagente pela purga.'
                }
            ]
        }
    ],

    // -----------------------------------------------------------------------
    // Base kinetic params for reactor exercises
    // -----------------------------------------------------------------------
    _reactorBase(maxConv) {
        const base = {
            components: [
                { state: 'liquid', component_name: 'A', flow_rate_inlet: 0.001, molar_concentration_inlet: 2.0 },
                { state: 'liquid', component_name: 'B', flow_rate_inlet: 0.0, molar_concentration_inlet: 0.0 }
            ],
            stoichiometric_coefficients: [-1, 1],
            reaction_rate_params: { k: 0.5, reaction_orders: [1, 0] },
            operation_conditions: { initial_temperature: 298.15, final_temperature: 298.15, initial_pressure: 101325, final_pressure: 101325 }
        };
        if (maxConv !== undefined) base.max_conversion = maxConv;
        return base;
    },

    _purgePayload(f) {
        return {
            components: ['A', 'B', 'I'],
            streams: [
                { name: 'Feed', direction: 1, flow_rate: 100, compositions: { A: 0.8, B: 0.0, I: 0.2 } },
                { name: 'Reactor_Out', direction: -1, flow_rate: null, compositions: { A: null, B: null, I: null } },
                { name: 'Recycle', direction: 1, flow_rate: null, compositions: { A: null, B: null, I: null } },
                { name: 'Purga_Produto', direction: -1, flow_rate: null, compositions: { A: null, B: null, I: null } }
            ],
            reactions: [{ stoichiometry: { A: -1, B: 1, I: 0 }, key_component: 'A', conversion: 0.7 }],
            splits: [{ parent_stream: 'Reactor_Out', recycle_stream: 'Recycle', purge_stream: 'Purga_Produto', fraction: f }]
        };
    },

    // -----------------------------------------------------------------------
    // Init
    // -----------------------------------------------------------------------
    async init() {
        // Pre-load CoolProp fluid list for Select2 selects
        try {
            const fluids = await API.listComponents();
            this._fluidList = Array.isArray(fluids) ? fluids.sort() : [];
        } catch (_) {
            this._fluidList = [];
        }
        this.renderSelector();
        this.setupBackBtn();
    },

    // -----------------------------------------------------------------------
    // Selector
    // -----------------------------------------------------------------------
    renderSelector() {
        const container = document.getElementById('exercise-cards');
        if (!container) return;
        container.innerHTML = '';
        this.EXERCISES.forEach(ex => {
            const card = document.createElement('div');
            card.className = 'exercise-card bg-white border rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all';
            card.setAttribute('data-exercise-id', ex.id);
            card.innerHTML = `
                <div class="text-2xl mb-2">${ex.icon}</div>
                <h3 class="font-semibold text-gray-800 mb-1">${ex.title}</h3>
                <p class="text-sm text-gray-500">${ex.desc}</p>
                <div class="mt-3 text-xs text-blue-600">${ex.steps.length} etapas</div>`;
            card.addEventListener('click', () => this.loadExercise(ex.id));
            container.appendChild(card);
        });
    },

    setupBackBtn() {
        const btn = document.getElementById('ex-back-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (confirm('Sair do exercício? O progresso será perdido.')) {
                this.resetExercise();
            }
        });
    },

    // -----------------------------------------------------------------------
    // Load Exercise
    // -----------------------------------------------------------------------
    loadExercise(id) {
        const ex = this.EXERCISES.find(e => e.id === id);
        if (!ex) return;
        this.state = { exerciseId: id, stepIndex: 0, results: {} };

        document.getElementById('exercise-selector').classList.add('hidden');
        document.getElementById('exercise-runner').classList.remove('hidden');

        const label = document.getElementById('ex-breadcrumb-label');
        if (label) label.textContent = ex.title;
        const heading = document.getElementById('ex-heading');
        if (heading) heading.textContent = ex.title;

        document.getElementById('ex-problem-statement').innerHTML = ex.problem;
        document.getElementById('exercise-steps-trail').innerHTML = '';

        // Render all step cards as pending
        ex.steps.forEach((step, i) => {
            const card = document.createElement('div');
            card.id = `ex-step-trail-${i}`;
            card.className = 'step-card step-pending bg-white border rounded p-3 opacity-40';
            card.innerHTML = `<div class="text-xs font-semibold text-gray-400">Etapa ${i + 1} — ${step.title.replace(/^Etapa \d+ — /, '')}</div>`;
            document.getElementById('exercise-steps-trail').appendChild(card);
        });

        this.loadStep(0);
    },

    // -----------------------------------------------------------------------
    // Load Step
    // -----------------------------------------------------------------------
    loadStep(n) {
        const ex = this.EXERCISES.find(e => e.id === this.state.exerciseId);
        if (!ex || n >= ex.steps.length) return;

        this.state.stepIndex = n;
        const step = ex.steps[n];

        // Update trail card to active
        const trailCard = document.getElementById(`ex-step-trail-${n}`);
        if (trailCard) {
            trailCard.className = 'step-card step-active bg-blue-50 border border-blue-300 rounded p-3';
            trailCard.innerHTML = `
                <div class="text-xs font-semibold text-blue-700">Etapa ${n + 1} — ${step.title.replace(/^Etapa \d+ — /, '')}</div>
                <div class="text-xs text-gray-600 mt-1">${step.desc}</div>`;
            trailCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Render step panel
        const frame = document.getElementById('exercise-module-frame');
        frame.innerHTML = `
            <h3 class="font-semibold text-gray-700 mb-2 text-sm">${step.title}</h3>
            <p class="text-xs text-gray-500 mb-4">${step.desc}</p>
            ${step.render(this.state)}
            <div id="ex-step-result" class="hidden mt-4 p-3 bg-white border rounded text-sm"></div>
            <button id="ex-next-btn" class="hidden mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full text-sm">
                ${n + 1 < ex.steps.length ? 'Próxima Etapa →' : 'Concluir Exercício ✓'}
            </button>`;

        // Initialize Select2 on any fluid selects rendered in this step
        if (typeof UI !== 'undefined' && UI.refreshSelect2) {
            UI.refreshSelect2('.ex-fluid-select');
        }

        const form = document.getElementById('ex-step-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.runStep(n);
            });
        }
    },

    // -----------------------------------------------------------------------
    // Run Step
    // -----------------------------------------------------------------------
    async runStep(n) {
        const ex = this.EXERCISES.find(e => e.id === this.state.exerciseId);
        const step = ex.steps[n];
        const submitBtn = document.querySelector('#ex-step-form button[type="submit"]');
        const resultDiv = document.getElementById('ex-step-result');

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Calculando...'; }
        if (resultDiv) resultDiv.classList.add('hidden');

        // Timeout fallback
        const timeout = setTimeout(() => {
            if (resultDiv) {
                resultDiv.innerHTML = '<div class="text-yellow-700 bg-yellow-50 p-2 rounded text-xs">Tempo esgotado. Verifique a conexão com a API.</div>';
                resultDiv.classList.remove('hidden');
            }
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Calcular'; }
        }, 30000);

        try {
            const data = await step.run({}, this.state);
            clearTimeout(timeout);

            // Merge results into state
            Object.assign(this.state.results, data);

            // Build result HTML
            let html = `<div class="font-mono text-green-700 font-semibold">${data.display}</div>`;

            // Special: Levenspiel image
            if (data.levenspiel_img) {
                html += `<img src="data:image/png;base64,${data.levenspiel_img}" class="mt-3 w-full rounded border" alt="Levenspiel plot">`;
            }
            // Special: series reactor comparison
            if (data.comparison) {
                const c = data.comparison;
                const winner = c.V_total_PFR_CSTR < c.V_total_CSTR_PFR ? 'PFR→CSTR' : 'CSTR→PFR';
                html += `<table class="mt-3 w-full text-xs border-collapse">
                    <tr class="bg-gray-100"><th class="p-1 border text-left">Configuração</th><th class="p-1 border">V_total (m³)</th></tr>
                    <tr class="${winner==='PFR→CSTR'?'bg-green-50':''}"><td class="p-1 border">PFR→CSTR</td><td class="p-1 border font-mono">${this.fmt(c.V_total_PFR_CSTR,5)}</td></tr>
                    <tr class="${winner==='CSTR→PFR'?'bg-green-50':''}"><td class="p-1 border">CSTR→PFR</td><td class="p-1 border font-mono">${this.fmt(c.V_total_CSTR_PFR,5)}</td></tr>
                </table>
                <div class="mt-2 text-green-700 text-xs font-semibold">✓ Recomendado: ${winner}</div>`;
            }
            // Special: Rankine summary (last step)
            if (step.resultKey === 'eta') {
                const s = this.state.results;
                const Wt = (s.h1-s.h2)/1000, Wb = (s.h4-s.h3)/1000, Wl = Wt-Wb, Qi = (s.h1-s.h4)/1000;
                html += `<table class="mt-3 w-full text-xs border-collapse">
                    <tr class="bg-gray-100"><th class="p-1 border">Grandeza</th><th class="p-1 border">Valor</th></tr>
                    <tr><td class="p-1 border">W_turbina</td><td class="p-1 border font-mono">${this.fmt(Wt,2)} kJ/kg</td></tr>
                    <tr><td class="p-1 border">W_bomba</td><td class="p-1 border font-mono">${this.fmt(Wb,2)} kJ/kg</td></tr>
                    <tr><td class="p-1 border">W_líquido</td><td class="p-1 border font-mono">${this.fmt(Wl,2)} kJ/kg</td></tr>
                    <tr><td class="p-1 border">Q_caldeira</td><td class="p-1 border font-mono">${this.fmt(Qi,2)} kJ/kg</td></tr>
                    <tr class="bg-green-50 font-semibold"><td class="p-1 border">η</td><td class="p-1 border font-mono">${this.fmt(data.eta,1)} %</td></tr>
                </table>`;
            }
            // Special: mass balance table
            if (data.balance_results || data.balance_results_rec || data.purge_results) {
                const res = data.balance_results || data.balance_results_rec || data.purge_results;
                html += `<table class="mt-3 w-full text-xs border-collapse">
                    <tr class="bg-gray-100"><th class="p-1 border text-left">Corrente</th><th class="p-1 border">Vazão (kg/h)</th><th class="p-1 border">Composições</th></tr>`;
                for (const [sname, sdata] of Object.entries(res)) {
                    const comps = Object.entries(sdata.compositions).map(([k,v]) => `${k}=${this.fmt(v,3)}`).join(' · ');
                    html += `<tr><td class="p-1 border font-semibold">${sname}</td><td class="p-1 border font-mono">${this.fmt(sdata.flow_rate,2)}</td><td class="p-1 border font-mono text-xs">${comps}</td></tr>`;
                }
                html += '</table>';
            }

            if (resultDiv) {
                resultDiv.innerHTML = html;
                resultDiv.classList.remove('hidden');
            }

            // Update trail card to done
            const trailCard = document.getElementById(`ex-step-trail-${n}`);
            if (trailCard) {
                trailCard.className = 'step-card step-done bg-green-50 border border-green-300 rounded p-3';
                trailCard.innerHTML = `
                    <div class="text-xs font-semibold text-green-700">✓ Etapa ${n+1} — ${ex.steps[n].title.replace(/^Etapa \d+ — /, '')}</div>
                    <div class="text-xs font-mono text-gray-700 mt-1">${data.display}</div>
                    <div class="text-xs text-gray-400 italic mt-1">${step.contextText}</div>`;
            }

            // Show next btn
            const nextBtn = document.getElementById('ex-next-btn');
            if (nextBtn) {
                nextBtn.classList.remove('hidden');
                nextBtn.onclick = () => this.advanceStep(n + 1);
            }

            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Recalcular'; }
        } catch (err) {
            clearTimeout(timeout);
            if (resultDiv) {
                resultDiv.innerHTML = `<div class="text-red-700 bg-red-50 p-2 rounded text-xs">Erro: ${err.message || JSON.stringify(err)}</div>`;
                resultDiv.classList.remove('hidden');
            }
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Calcular'; }
        }
    },

    // -----------------------------------------------------------------------
    // Advance Step
    // -----------------------------------------------------------------------
    advanceStep(n) {
        const ex = this.EXERCISES.find(e => e.id === this.state.exerciseId);
        if (n >= ex.steps.length) {
            // Exercise complete
            document.getElementById('exercise-module-frame').innerHTML = `
                <div class="text-center py-8">
                    <div class="text-4xl mb-3">✅</div>
                    <h3 class="font-semibold text-gray-700 mb-2">Exercício concluído!</h3>
                    <p class="text-sm text-gray-500 mb-4">Você completou todas as etapas de <strong>${ex.title}</strong>.</p>
                    <button onclick="ExercisesModule.resetExercise()" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 text-sm">← Voltar aos exercícios</button>
                </div>`;
            return;
        }
        // Mark remaining steps still pending opacity
        for (let i = n + 1; i < ex.steps.length; i++) {
            const c = document.getElementById(`ex-step-trail-${i}`);
            if (c && c.classList.contains('step-pending')) {
                c.classList.remove('opacity-40');
                c.classList.add('opacity-40');
            }
        }
        this.loadStep(n);
    },

    // -----------------------------------------------------------------------
    // Reset
    // -----------------------------------------------------------------------
    resetExercise() {
        this.state = { exerciseId: null, stepIndex: 0, results: {} };
        document.getElementById('exercise-runner').classList.add('hidden');
        document.getElementById('exercise-selector').classList.remove('hidden');
        const label = document.getElementById('ex-breadcrumb-label');
        if (label) label.textContent = 'Exercícios Integrados';
        const heading = document.getElementById('ex-heading');
        if (heading) heading.textContent = 'Exercícios Integrados';
    }
};

window.ExercisesModule = ExercisesModule;
