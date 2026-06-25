/**
 * Reactor Module for Chemical Engineering Calculator
 * Handles reactor-related calculations
 */

const ReactorModule = {
    /**
     * Initialize the Reactor module
     */
    init() {
        this.createReactorContent();
        this.loadComponents();
        this.loadCSTRCalculationTypes();
        this.loadPFRCalculationTypes();
        this.setupEventListeners();
        // Ativar acordeões criados dinamicamente
        if (window.DidaticModule) DidaticModule.setupAccordions();
    },

    /**
     * Create reactor content dynamically
     */
    createReactorContent() {
        const reactorContent = document.getElementById('reactor-content');
        if (!reactorContent) return;

        // Module header (mesmo padrão dos módulos estáticos)
        const headerEl = document.createElement('div');
        headerEl.className = 'module-header';
        headerEl.innerHTML = `
            <div class="module-header-left">
                <nav class="module-breadcrumb" aria-label="Localização">
                    <a href="#home-content" data-tab="home-content">Início</a>
                    <span class="sep" aria-hidden="true">›</span>
                    <span>Reatores</span>
                    <span class="sep" aria-hidden="true">›</span>
                    <span>CSTR / PFR</span>
                </nav>
                <h2 class="module-heading">Cálculos de Reator</h2>
            </div>
        `;
        reactorContent.appendChild(headerEl);

        const cstrContent = document.createElement('div');
        cstrContent.className = 'grid grid-cols-1 gap-6';
        cstrContent.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">Reator CSTR</h3>
                <div class="accordion">
                    <button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="acc-cstr">
                        <span>Como funciona — Reator CSTR</span>
                        <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="accordion-content" id="acc-cstr" role="region">
                        <p>O <strong>CSTR</strong> (Continuous Stirred-Tank Reactor) opera em regime permanente com mistura perfeita — a composição no interior é uniforme e igual à saída.</p>
                        <div class="formula-block">V = F<sub>A0</sub> · X / (−r<sub>A</sub>)<sub>saída</sub></div>
                        <table class="variables-table">
                            <thead><tr><th>Símbolo</th><th>Variável</th><th>Unidade</th></tr></thead>
                            <tbody>
                                <tr><td>V</td><td>Volume do reator</td><td>m³</td></tr>
                                <tr><td>F<sub>A0</sub></td><td>Vazão molar de A na entrada</td><td>mol/s</td></tr>
                                <tr><td>X</td><td>Conversão do reagente limitante</td><td>0–1</td></tr>
                                <tr><td>−r<sub>A</sub></td><td>Taxa de consumo de A <em>na saída</em></td><td>mol/(m³·s)</td></tr>
                            </tbody>
                        </table>
                        <p><strong>Dica:</strong> para uma reação de 1ª ordem (−r<sub>A</sub> = k·C<sub>A0</sub>·(1−X)), V<sub>CSTR</sub> cresce mais rápido que V<sub>PFR</sub> para a mesma conversão.</p>
                        <p class="teoria-ref">Ref.: Fogler, Elements of Chemical Reaction Engineering, 5ª ed.</p>
                    </div>
                </div>
                <form id="cstr-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Input Type</label>
                            <select id="cstr-input-type" class="w-full select2-input"></select>
                        </div>
                        
                        <!-- Fields visible based on input type -->
                        <div class="mb-4 conversion-field">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Conversion (0-1)</label>
                            <input type="number" step="0.0000000001" min="0" max="1" id="cstr-conversion" class="w-full p-2 border rounded">
                        </div>
                        <div class="mb-4 volume-field">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Volume (m³)</label>
                            <input type="number" step="0.0000000001" id="cstr-volume" class="w-full p-2 border rounded">
                        </div>
                        <div class="mb-4 residence-time-field">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Residence Time (s)</label>
                            <input type="number" step="0.0000000001" id="cstr-residence-time" class="w-full p-2 border rounded">
                        </div>
                    </div>
                    
                    <div class="mb-4 p-4 bg-gray-100 rounded-md border">
                        <h4 class="font-medium text-gray-700 mb-2">Reaction Rate Parameters</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Rate Constant (k)</label>
                                <input type="number" step="0.00001" id="cstr-rate-constant" class="w-full p-2 border rounded">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-4 p-4 bg-gray-100 rounded-md border">
                        <h4 class="font-medium text-gray-700 mb-2">Operation Conditions</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Initial Temperature (K)</label>
                                <input type="number" step="0.0000000001" value="298.15" id="cstr-initial-temperature" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Initial Pressure (Pa)</label>
                                <input type="number" step="0.0000000001" value="101325" id="cstr-initial-pressure" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Final Temperature (K)</label>
                                <input type="number" step="0.0000000001" value="298.15" id="cstr-final-temperature" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Final Pressure (Pa)</label>
                                <input type="number" step="0.0000000001" value="101325" id="cstr-final-pressure" class="w-full p-2 border rounded">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-6 p-4 bg-gray-100 rounded-md border">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-sm font-medium text-gray-700">Components</label>
                            <button type="button" id="add-cstr-component" class="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">+ Add Component</button>
                        </div>
                        <div id="cstr-components-container" class="space-y-4"></div>
                    </div>
                    
                    <div class="mb-6 p-4 bg-gray-100 rounded-md border">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-sm font-medium text-gray-700">Stoichiometric Coefficients</label>
                            <span class="text-xs text-gray-500">(Negative for reactants, positive for products)</span>
                        </div>
                        <div id="cstr-stoichiometric-container" class="space-y-2"></div>
                    </div>
                    
                    <div class="mb-6 p-4 bg-gray-100 rounded-md border">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-sm font-medium text-gray-700">Reaction Orders</label>
                            <span class="text-xs text-gray-500">(Order for each component)</span>
                        </div>
                        <div id="cstr-reaction-orders-container" class="space-y-2"></div>
                    </div>
                    
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Calculate CSTR</button>
                </form>
                <div id="cstr-result" class="mt-4 p-3 bg-white rounded border hidden"></div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">Reator PFR</h3>
                <div class="accordion">
                    <button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="acc-pfr">
                        <span>Como funciona — Reator PFR</span>
                        <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="accordion-content" id="acc-pfr" role="region">
                        <p>O <strong>PFR</strong> (Plug Flow Reactor) opera com escoamento pistonado — concentrações variam continuamente ao longo do comprimento, sem mistura axial.</p>
                        <div class="formula-block">V = F<sub>A0</sub> · ∫₀ˣ dX / (−r<sub>A</sub>)</div>
                        <table class="variables-table">
                            <thead><tr><th>Símbolo</th><th>Variável</th><th>Unidade</th></tr></thead>
                            <tbody>
                                <tr><td>V</td><td>Volume do reator</td><td>m³</td></tr>
                                <tr><td>F<sub>A0</sub></td><td>Vazão molar de A na entrada</td><td>mol/s</td></tr>
                                <tr><td>X</td><td>Conversão desejada</td><td>0–1</td></tr>
                                <tr><td>−r<sub>A</sub>(X)</td><td>Taxa de reação como função da conversão</td><td>mol/(m³·s)</td></tr>
                            </tbody>
                        </table>
                        <p><strong>Comparação:</strong> para reações de ordem > 0, V<sub>PFR</sub> &lt; V<sub>CSTR</sub> para a mesma conversão, pois o PFR opera com concentração mais alta durante a maior parte do percurso.</p>
                        <p class="teoria-ref">Ref.: Fogler, Elements of Chemical Reaction Engineering, 5ª ed.</p>
                    </div>
                </div>
                <form id="pfr-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Input Type</label>
                            <select id="pfr-input-type" class="w-full select2-input"></select>
                        </div>
                        
                        <!-- Fields visible based on input type -->
                        <div class="mb-4 conversion-field">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Conversion (0-1)</label>
                            <input type="number" step="0.0000000001" min="0" max="1" id="pfr-conversion" class="w-full p-2 border rounded">
                        </div>
                        <div class="mb-4 volume-field">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Volume (m³)</label>
                            <input type="number" step="0.0000000001" id="pfr-volume" class="w-full p-2 border rounded">
                        </div>
                        <div class="mb-4 residence-time-field">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Residence Time (s)</label>
                            <input type="number" step="0.0000000001" id="pfr-residence-time" class="w-full p-2 border rounded">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Recycling Ratio</label>
                            <input type="number" step="0.0000000001" id="pfr-recycling-ratio" class="w-full p-2 border rounded" value="0">
                        </div>
                    </div>
                    
                    <div class="mb-4 p-4 bg-gray-100 rounded-md border">
                        <h4 class="font-medium text-gray-700 mb-2">Reaction Rate Parameters</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Rate Constant (k)</label>
                                <input type="number" step="0.00001" id="pfr-rate-constant" class="w-full p-2 border rounded">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-4 p-4 bg-gray-100 rounded-md border">
                        <h4 class="font-medium text-gray-700 mb-2">Operation Conditions</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Initial Temperature (K)</label>
                                <input type="number" step="0.0000000001" value="298.15" id="pfr-initial-temperature" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Initial Pressure (Pa)</label>
                                <input type="number" step="0.0000000001" value="101325" id="pfr-initial-pressure" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Final Temperature (K)</label>
                                <input type="number" step="0.0000000001" value="298.15" id="pfr-final-temperature" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Final Pressure (Pa)</label>
                                <input type="number" step="0.0000000001" value="101325" id="pfr-final-pressure" class="w-full p-2 border rounded">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-6 p-4 bg-gray-100 rounded-md border">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-sm font-medium text-gray-700">Components</label>
                            <button type="button" id="add-pfr-component" class="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">+ Add Component</button>
                        </div>
                        <div id="pfr-components-container" class="space-y-4"></div>
                    </div>
                    
                    <div class="mb-6 p-4 bg-gray-100 rounded-md border">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-sm font-medium text-gray-700">Stoichiometric Coefficients</label>
                            <span class="text-xs text-gray-500">(Negative for reactants, positive for products)</span>
                        </div>
                        <div id="pfr-stoichiometric-container" class="space-y-2"></div>
                    </div>
                    
                    <div class="mb-6 p-4 bg-gray-100 rounded-md border">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-sm font-medium text-gray-700">Reaction Orders</label>
                            <span class="text-xs text-gray-500">(Order for each component)</span>
                        </div>
                        <div id="pfr-reaction-orders-container" class="space-y-2"></div>
                    </div>
                    
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Calculate PFR</button>
                </form>
                <div id="pfr-result" class="mt-4 p-3 bg-white rounded border hidden"></div>
            </div>
            
            <!-- Conversion vs Volume Plot Card -->
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">Conversão × Volume (Gráfico)</h3>
                <div class="accordion">
                    <button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="acc-reactor-plot">
                        <span>Como funciona — Gráfico Conversão × Volume</span>
                        <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="accordion-content" id="acc-reactor-plot" role="region">
                        <p>O gráfico compara visualmente o volume necessário em CSTR e PFR em função da conversão X, usando a lei de velocidade de potência:</p>
                        <div class="formula-block">−r<sub>A</sub> = k · C<sub>A0</sub><sup>n</sup> · (1−X)<sup>n</sup></div>
                        <p>O gráfico é calculado analiticamente no browser. Para conversões próximas a 1 (100%), o volume cresce assintoticamente — insira X<sub>max</sub> ≤ 0,99.</p>
                        <p class="teoria-ref">Ref.: Levenspiel, Chemical Reaction Engineering, 3ª ed.</p>
                    </div>
                </div>
                <form id="plot-conversion-form">
                    <div class="mb-4 p-4 bg-gray-100 rounded-md border">
                        <h4 class="font-medium text-gray-700 mb-2">Operation Conditions</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Initial Temperature (K)</label>
                                <input type="number" step="0.0000000001" value="298.15" id="plot-initial-temperature" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Initial Pressure (Pa)</label>
                                <input type="number" step="0.0000000001" value="101325" id="plot-initial-pressure" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Final Temperature (K)</label>
                                <input type="number" step="0.0000000001" value="298.15" id="plot-final-temperature" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Final Pressure (Pa)</label>
                                <input type="number" step="0.0000000001" value="101325" id="plot-final-pressure" class="w-full p-2 border rounded">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-4 p-4 bg-gray-100 rounded-md border">
                        <h4 class="font-medium text-gray-700 mb-2">Reaction Rate Parameters</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Rate Constant (k)</label>
                                <input type="number" step="0.00001" id="plot-rate-constant" class="w-full p-2 border rounded">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">PFR Recycling Ratio</label>
                                <input type="number" step="0.0000000001" id="plot-recycling-ratio" class="w-full p-2 border rounded" value="0">
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Max Conversion (0-1)</label>
                                <input type="number" step="0.01" min="0" max="1" id="plot-max-conversion" class="w-full p-2 border rounded" value="0.99">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-6 p-4 bg-gray-100 rounded-md border">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-sm font-medium text-gray-700">Components</label>
                            <button type="button" id="add-plot-component" class="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">+ Add Component</button>
                        </div>
                        <div id="plot-components-container" class="space-y-4"></div>
                    </div>
                    
                    <div class="mb-6 p-4 bg-gray-100 rounded-md border">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-sm font-medium text-gray-700">Stoichiometric Coefficients</label>
                            <span class="text-xs text-gray-500">(Negative for reactants, positive for products)</span>
                        </div>
                        <div id="plot-stoichiometric-container" class="space-y-2"></div>
                    </div>
                    
                    <div class="mb-6 p-4 bg-gray-100 rounded-md border">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-sm font-medium text-gray-700">Reaction Orders</label>
                            <span class="text-xs text-gray-500">(Order for each component)</span>
                        </div>
                        <div id="plot-reaction-orders-container" class="space-y-2"></div>
                    </div>
                    
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Generate Plot</button>
                </form>
                <div id="plot-result-reactor" class="mt-4 p-3 bg-white rounded border hidden">
                    <div id="conversion-plot-container" style="position:relative; height:400px;">
                        <canvas id="conversion-chart" aria-label="Gráfico Conversão × Volume — CSTR e PFR"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        reactorContent.appendChild(cstrContent);
        
        // Initialize Select2 for the new selects
        UI.initializeSelect2();
    },

    /**
     * Set up event listeners for the Reactor module
     */
    setupEventListeners() {
        // CSTR input type change handler
        $('#cstr-input-type').on('change', (e) => {
            this.updateFieldsVisibility('cstr', e.target.value);
        });

        // PFR input type change handler
        $('#pfr-input-type').on('change', (e) => {
            this.updateFieldsVisibility('pfr', e.target.value);
        });

        // Add component buttons
        document.getElementById('add-cstr-component').addEventListener('click', () => {
            this.addReactorComponent('cstr-components-container');
            this.updateStoichiometricCoefficients('cstr');
            this.updateReactionOrders('cstr');
        });

        document.getElementById('add-pfr-component').addEventListener('click', () => {
            this.addReactorComponent('pfr-components-container');
            this.updateStoichiometricCoefficients('pfr');
            this.updateReactionOrders('pfr');
        });
        
        document.getElementById('add-plot-component').addEventListener('click', () => {
            this.addReactorComponent('plot-components-container');
            this.updateStoichiometricCoefficients('plot');
            this.updateReactionOrders('plot');
        });

        // CSTR form submit handler
        document.getElementById('cstr-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.calculateReactor('cstr');
        });

        // PFR form submit handler
        document.getElementById('pfr-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.calculateReactor('pfr');
        });
        
        // Plot conversion vs volume form submit handler
        document.getElementById('plot-conversion-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.generateConversionVolumePlot();
        });
    },

    /**
     * Load available components
     */
    async loadComponents() {
        try {
            const components = await API.listComponents();
            this.componentsList = components;
            
            // Add initial component rows
            this.addReactorComponent('cstr-components-container');
            this.addReactorComponent('pfr-components-container');
            this.addReactorComponent('plot-components-container');
            
            // Initialize stoichiometric coefficients and reaction orders
            this.updateStoichiometricCoefficients('cstr');
            this.updateStoichiometricCoefficients('pfr');
            this.updateStoichiometricCoefficients('plot');
            this.updateReactionOrders('cstr');
            this.updateReactionOrders('pfr');
            this.updateReactionOrders('plot');
        } catch (error) {
            console.error('Error loading components:', error);
            UI.showError('Error', 'Failed to load components');
        }
    },

    /**
     * Add a new component row for reactor calculations
     * @param {string} containerId - ID of the container element
     */
    addReactorComponent(containerId) {
        const container = document.getElementById(containerId);
        const componentId = Date.now(); // Unique ID for this component group
        const componentDiv = document.createElement('div');
        componentDiv.className = 'component-row p-3 border rounded bg-white';
        componentDiv.dataset.componentId = componentId;
        
        componentDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Component Name</label>
                    <select class="component-name-select w-full p-2 border rounded"></select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select class="component-state w-full p-2 border rounded">
                        <option value="gaseous">Gaseous</option>
                        <option value="liquid">Liquid</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Flow Rate Inlet (m³/s)</label>
                    <input type="number" step="0.00000001" value="0" class="flow-rate-inlet w-full p-2 border rounded" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Molar Concentration Inlet (mol/L)</label>
                    <input type="number" step="0.0000000001" value="0" class="molar-concentration-inlet w-full p-2 border rounded" required>
                </div>
            </div>
            <div class="flex justify-between mb-2">
                <button type="button" class="remove-component text-red-500 hover:text-red-700">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `;
        
        // Add event listener for remove button
        const removeButton = componentDiv.querySelector('.remove-component');
        removeButton.addEventListener('click', () => {
            container.removeChild(componentDiv);
            
            // Update stoichiometric coefficients and reaction orders
            const reactorType = containerId.split('-')[0]; // 'cstr' or 'pfr'
            this.updateStoichiometricCoefficients(reactorType);
            this.updateReactionOrders(reactorType);
        });
        
        container.appendChild(componentDiv);
        
        // Initialize Select2 for component name
        const componentNameSelect = componentDiv.querySelector('.component-name-select');
        
        // Add options from componentsList
        if (this.componentsList && this.componentsList.length > 0) {
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Selecione ou digite o nome do componente';
            componentNameSelect.appendChild(placeholderOption);
            
            // Add existing components
            this.componentsList.forEach(component => {
                const option = document.createElement('option');
                option.value = component;
                option.textContent = component;
                componentNameSelect.appendChild(option);
            });
        }
        
        // Initialize Select2 with tags support for custom input
        $(componentNameSelect).select2({
            tags: true,
            placeholder: 'Selecione ou digite o nome do componente',
            allowClear: true,
            width: '100%'
        });
    },

    /**
     * Update stoichiometric coefficients based on current components
     * @param {string} reactorType - 'cstr' or 'pfr'
     */
    updateStoichiometricCoefficients(reactorType) {
        const componentsContainer = document.getElementById(`${reactorType}-components-container`);
        const stoichiometricContainer = document.getElementById(`${reactorType}-stoichiometric-container`);
        
        // Clear existing coefficients
        stoichiometricContainer.innerHTML = '';
        
        // Create coefficient input for each component
        const componentRows = componentsContainer.querySelectorAll('.component-row');
        
        if (componentRows.length === 0) {
            stoichiometricContainer.innerHTML = '<p class="text-gray-500 text-sm">Add components first</p>';
            return;
        }
        
        componentRows.forEach((row, index) => {
            const componentId = row.dataset.componentId;
            // Get component name from select2
            const componentNameSelect = row.querySelector('.component-name-select');
            const componentName = $(componentNameSelect).val() || `Component ${index + 1}`;
            
            const coeffDiv = document.createElement('div');
            coeffDiv.className = 'flex items-center space-x-2';
            coeffDiv.innerHTML = `
                <label class="text-sm font-medium text-gray-700 w-1/3">${componentName}:</label>
                <input type="number" step="0.0000000001" value="${index === 0 ? -1 : index === 1 ? 1 : 0}" 
                       class="stoichiometric-coef w-2/3 p-2 border rounded" 
                       data-component-id="${componentId}" required>
            `;
            
            stoichiometricContainer.appendChild(coeffDiv);
        });
    },

    /**
     * Update reaction orders based on current components
     * @param {string} reactorType - 'cstr' or 'pfr'
     */
    updateReactionOrders(reactorType) {
        const componentsContainer = document.getElementById(`${reactorType}-components-container`);
        const reactionOrdersContainer = document.getElementById(`${reactorType}-reaction-orders-container`);
        
        // Clear existing orders
        reactionOrdersContainer.innerHTML = '';
        
        // Create order input for each component
        const componentRows = componentsContainer.querySelectorAll('.component-row');
        
        if (componentRows.length === 0) {
            reactionOrdersContainer.innerHTML = '<p class="text-gray-500 text-sm">Add components first</p>';
            return;
        }
        
        componentRows.forEach((row, index) => {
            const componentId = row.dataset.componentId;
            // Get component name from select2
            const componentNameSelect = row.querySelector('.component-name-select');
            const componentName = $(componentNameSelect).val() || `Component ${index + 1}`;
            
            const orderDiv = document.createElement('div');
            orderDiv.className = 'flex items-center space-x-2';
            orderDiv.innerHTML = `
                <label class="text-sm font-medium text-gray-700 w-1/3">${componentName}:</label>
                <input type="number" step="0.0000000001" value="${index === 0 ? 2 : 0}" 
                       class="reaction-order w-2/3 p-2 border rounded" 
                       data-component-id="${componentId}" required>
            `;
            
            reactionOrdersContainer.appendChild(orderDiv);
        });
    },

    /**
     * Load CSTR calculation types
     */
    async loadCSTRCalculationTypes() {
        try {
            UI.showLoading('#cstr-input-type');
            
            const types = await API.getCSTRCalculationTypes();
            const select = document.getElementById('cstr-input-type');
            
            select.innerHTML = '<option value="">Selecione o tipo de entrada</option>';
            
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = this.formatCalculationType(type);
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
            
            // Set initial field visibility
            this.updateFieldsVisibility('cstr', select.value);
        } catch (error) {
            UI.showError('Error loading CSTR calculation types', error);
        } finally {
            UI.hideLoading('#cstr-input-type');
        }
    },

    /**
     * Format calculation type for display
     * @param {string} type - Calculation type
     * @returns {string} - Formatted calculation type
     */
    formatCalculationType(type) {
        // Convert snake_case to Title Case with spaces
        return type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },

    /**
     * Load PFR calculation types
     */
    async loadPFRCalculationTypes() {
        try {
            UI.showLoading('#pfr-input-type');
            
            const types = await API.getPFRCalculationTypes();
            const select = document.getElementById('pfr-input-type');
            
            select.innerHTML = '<option value="">Selecione o tipo de entrada</option>';
            
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = this.formatCalculationType(type);
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
            
            // Set initial field visibility
            this.updateFieldsVisibility('pfr', select.value);
        } catch (error) {
            UI.showError('Error loading PFR calculation types', error);
        } finally {
            UI.hideLoading('#pfr-input-type');
        }
    },

    /**
     * Update fields visibility based on calculation type
     * @param {string} reactorType - Type of reactor (cstr or pfr)
     * @param {string} inputType - Type of calculation
     */
    updateFieldsVisibility(reactorType, inputType) {
        if (!inputType) return;

        // Get field containers
        const conversionField = document.querySelector(`#${reactorType}-form .conversion-field`);
        const volumeField = document.querySelector(`#${reactorType}-form .volume-field`);
        const residenceTimeField = document.querySelector(`#${reactorType}-form .residence-time-field`);
        
        // Hide all fields first
        conversionField.style.display = 'none';
        volumeField.style.display = 'none';
        residenceTimeField.style.display = 'none';
        
        // Show fields based on input type
        switch (inputType) {
            case 'conversion_and_kinetics':
                conversionField.style.display = '';
                break;
                
            case 'volume_and_kinetics':
                volumeField.style.display = '';
                break;
                
            case 'residence_time_and_kinetics':
                residenceTimeField.style.display = '';
                break;
        }
    },

    /**
     * Collect component data from the form
     * @param {string} containerId - ID of the components container
     * @returns {Array} - Array of component objects
     */
    collectComponentData(containerId) {
        const container = document.getElementById(containerId);
        const componentRows = container.querySelectorAll('.component-row');
        const components = [];
        
        componentRows.forEach(row => {
            const componentId = row.dataset.componentId;
            const componentNameSelect = row.querySelector('.component-name-select');
            
            const component = {
                component_name: $(componentNameSelect).val() || '',
                state: row.querySelector('.component-state').value,
                flow_rate_inlet: parseFloat(row.querySelector('.flow-rate-inlet').value),
                molar_concentration_inlet: parseFloat(row.querySelector('.molar-concentration-inlet').value)
            };
            
            components.push(component);
        });
        
        return components;
    },
    
    /**
     * Collect stoichiometric coefficients
     * @param {string} reactorType - 'cstr' or 'pfr'
     * @returns {Array} - Array of coefficient values
     */
    collectStoichiometricCoefficients(reactorType) {
        const container = document.getElementById(`${reactorType}-stoichiometric-container`);
        const coeffInputs = container.querySelectorAll('.stoichiometric-coef');
        
        return Array.from(coeffInputs).map(input => parseFloat(input.value));
    },
    
    /**
     * Collect reaction orders
     * @param {string} reactorType - 'cstr' or 'pfr'
     * @returns {Array} - Array of reaction order values
     */
    collectReactionOrders(reactorType) {
        const container = document.getElementById(`${reactorType}-reaction-orders-container`);
        const orderInputs = container.querySelectorAll('.reaction-order');
        
        return Array.from(orderInputs).map(input => parseFloat(input.value));
    },

    /**
     * Calculate reactor (CSTR or PFR)
     * @param {string} reactorType - Type of reactor (cstr or pfr)
     */
    async calculateReactor(reactorType) {
        try {
            const inputType = document.getElementById(`${reactorType}-input-type`).value;
            
            if (!inputType) {
                UI.showError('Missing Data', 'Please select an input type');
                return;
            }
            
            // Get common parameters
            const rateConstant = parseFloat(document.getElementById(`${reactorType}-rate-constant`).value);
            
            // Get operation conditions
            const initialTemperature = parseFloat(document.getElementById(`${reactorType}-initial-temperature`).value);
            const initialPressure = parseFloat(document.getElementById(`${reactorType}-initial-pressure`).value);
            const finalTemperature = parseFloat(document.getElementById(`${reactorType}-final-temperature`).value);
            const finalPressure = parseFloat(document.getElementById(`${reactorType}-final-pressure`).value);
            
            // Validate required fields
            if (!rateConstant || !initialTemperature || !initialPressure || !finalTemperature || !finalPressure) {
                UI.showError('Missing Data', 'Please fill in all required fields');
                return;
            }
            
            // Get input type specific parameters
            let conversion, volume, residenceTime;
            
            if (inputType === 'conversion_and_kinetics') {
                conversion = parseFloat(document.getElementById(`${reactorType}-conversion`).value);
                if (!conversion && conversion !== 0) {
                    UI.showError('Missing Data', 'Please enter conversion value');
                    return;
                }
            } else if (inputType === 'volume_and_kinetics') {
                volume = parseFloat(document.getElementById(`${reactorType}-volume`).value);
                if (!volume && volume !== 0) {
                    UI.showError('Missing Data', 'Please enter volume value');
                    return;
                }
            } else if (inputType === 'residence_time_and_kinetics') {
                residenceTime = parseFloat(document.getElementById(`${reactorType}-residence-time`).value);
                if (!residenceTime && residenceTime !== 0) {
                    UI.showError('Missing Data', 'Please enter residence time value');
                    return;
                }
            }
            
            // Collect components, stoichiometric coefficients and reaction orders
            const components = this.collectComponentData(`${reactorType}-components-container`);
            const stoichiometricCoefficients = this.collectStoichiometricCoefficients(reactorType);
            const reactionOrders = this.collectReactionOrders(reactorType);
            
            if (components.length === 0) {
                UI.showError('Missing Data', 'Please add at least one component');
                return;
            }
            
            // Build request payload
            const payload = {
                input_type: inputType,
                components: components,
                stoichiometric_coefficients: stoichiometricCoefficients,
                reaction_rate_params: {
                    k: rateConstant,
                    reaction_orders: reactionOrders
                },
                operation_conditions: {
                    initial_temperature: initialTemperature,
                    initial_pressure: initialPressure,
                    final_temperature: finalTemperature,
                    final_pressure: finalPressure
                }
            };
            
            // Add conditional parameters
            if (conversion !== undefined) payload.conversion = conversion;
            if (volume !== undefined) payload.volume = volume;
            if (residenceTime !== undefined) payload.residence_time = residenceTime;
            
            // For PFR, add recycling ratio
            if (reactorType === 'pfr') {
                payload.recycling_ratio = parseFloat(document.getElementById('pfr-recycling-ratio').value) || 0;
            }
            
            // Send request to API
            UI.showLoading(`#${reactorType}-form`);
            UI.hideResult(`#${reactorType}-result`);
            
            let result;
            if (reactorType === 'cstr') {
                result = await API.calculateCSTR(payload);
            } else if (reactorType === 'pfr') {
                result = await API.calculatePFR(payload);
            }
            
            // Display result
            let html = `<h4 class="font-medium text-gray-700 mb-2">${reactorType.toUpperCase()} Calculation Results</h4>`;
            html += UI.generatePropertyTable(result);
            
            UI.showResult(`#${reactorType}-result`, html);

            document.dispatchEvent(new CustomEvent('tcc:calculated', { detail: {
                module: 'Reatores',
                operation: `${reactorType.toUpperCase()} — ${inputType}`,
                inputs: `k = ${rateConstant}`,
                summary: 'Ver resultado acima',
            }}));
        } catch (error) {
            UI.showError(`Error calculating ${reactorType.toUpperCase()}`, error);
        } finally {
            UI.hideLoading(`#${reactorType}-form`);
        }
    },

    /**
     * Compute CSTR and PFR volume curves for a power-law reaction
     * @param {number} F_A0 - Molar flow rate of A at inlet (mol/s)
     * @param {number} C_A0 - Inlet concentration of A (mol/L or mol/m³ — consistent with k units)
     * @param {number} k - Rate constant
     * @param {number} n - Reaction order
     * @param {number} maxConversion - Maximum conversion to plot (0–1)
     * @returns {{ conversions: number[], cstrVols: (number|null)[], pfrVols: number[] }}
     */
    _computeReactorCurves(F_A0, C_A0, k, n, maxConversion) {
        const NUM = 100;
        const conversions = [];
        const cstrVols = [];
        const pfrVols = [];

        for (let i = 1; i <= NUM; i++) {
            const X = Math.min((i / NUM) * maxConversion, 0.9999);
            conversions.push(parseFloat((X * 100).toFixed(2)));

            // CSTR: V = F_A0 * X / (-r_A) onde -r_A = k * C_A0^n * (1-X)^n
            const rateOut = k * Math.pow(C_A0, n) * Math.pow(1 - X, n);
            cstrVols.push(rateOut > 1e-12 ? parseFloat((F_A0 * X / rateOut).toFixed(6)) : null);

            // PFR: integração trapezoidal de F_A0 / (-r_A) dX
            const STEPS = 200;
            const dX = X / STEPS;
            let integral = 0;
            for (let j = 0; j < STEPS; j++) {
                const Xj = (j + 0.5) * dX;
                const rateJ = k * Math.pow(C_A0, n) * Math.pow(1 - Xj, n);
                if (rateJ > 1e-12) integral += (F_A0 / rateJ) * dX;
            }
            pfrVols.push(parseFloat(integral.toFixed(6)));
        }

        return { conversions, cstrVols, pfrVols };
    },

    /**
     * Generate conversion vs volume plot using Chart.js (local computation)
     */
    async generateConversionVolumePlot() {
        try {
            const rateConstant = parseFloat(document.getElementById('plot-rate-constant').value);
            const maxConversion = parseFloat(document.getElementById('plot-max-conversion').value) || 0.99;

            if (!rateConstant || rateConstant <= 0) {
                UI.showError('Dado faltando', 'Informe a constante de velocidade k > 0');
                return;
            }

            if (!maxConversion || maxConversion <= 0 || maxConversion >= 1) {
                UI.showError('Dado inválido', 'Conversão máxima deve ser entre 0 e 1 (ex: 0.95)');
                return;
            }

            const components = this.collectComponentData('plot-components-container');
            if (components.length === 0) {
                UI.showError('Dado faltando', 'Adicione pelo menos um componente');
                return;
            }

            const reactionOrders = this.collectReactionOrders('plot');
            const n = (reactionOrders[0] != null && reactionOrders[0] > 0) ? reactionOrders[0] : 1;
            const C_A0 = components[0].molar_concentration_inlet || 1;
            const flowRate = components[0].flow_rate_inlet > 0 ? components[0].flow_rate_inlet : 1;
            const F_A0 = flowRate * C_A0;

            UI.showLoading('#plot-conversion-form');

            const { conversions, cstrVols, pfrVols } = this._computeReactorCurves(F_A0, C_A0, rateConstant, n, maxConversion);

            const plotContainer = document.getElementById('plot-result-reactor');
            plotContainer.classList.remove('hidden');

            const ctx = document.getElementById('conversion-chart').getContext('2d');
            if (this._reactorChart) this._reactorChart.destroy();

            this._reactorChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: conversions.map(x => x.toFixed(1) + '%'),
                    datasets: [
                        {
                            label: 'CSTR',
                            data: cstrVols,
                            borderColor: '#2563EB',
                            backgroundColor: 'rgba(37,99,235,0.08)',
                            tension: 0.3,
                            pointRadius: 0,
                            borderWidth: 2,
                        },
                        {
                            label: 'PFR',
                            data: pfrVols,
                            borderColor: '#7C3AED',
                            backgroundColor: 'rgba(124,58,237,0.08)',
                            tension: 0.3,
                            pointRadius: 0,
                            borderWidth: 2,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `Conversão × Volume  (n=${n}, k=${rateConstant})`,
                            font: { size: 14 },
                        },
                        tooltip: { mode: 'index', intersect: false },
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Conversão X (%)' },
                            ticks: { maxTicksLimit: 10 },
                        },
                        y: {
                            title: { display: true, text: 'Volume (m³)' },
                            beginAtZero: true,
                        },
                    },
                },
            });

        } catch (error) {
            console.error('Erro ao gerar gráfico:', error);
            UI.showError('Erro ao gerar gráfico', error.message || 'Erro desconhecido');
        } finally {
            UI.hideLoading('#plot-conversion-form');
        }
    }
};

// Export the Reactor module
window.ReactorModule = ReactorModule; 