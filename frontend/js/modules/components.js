/**
 * Components Module for Chemical Engineering Calculator
 * Handles fluid property calculations
 */

const ComponentsModule = {
    /** Traduções dos nomes de propriedades retornados pela API (inglês → pt-BR). */
    _propertyLabelsPt: {
        'Density': 'Densidade',
        'Specific heat': 'Calor específico',
        'Viscosity': 'Viscosidade',
        'Thermal conductivity': 'Condutividade térmica',
        'Enthalpy': 'Entalpia',
        'Entropy': 'Entropia',
        'Molar mass': 'Massa molar',
        'Surface tension': 'Tensão superficial',
        'Pressure': 'Pressão',
        'Temperature': 'Temperatura',
        'Quality (vapor fraction)': 'Titulo (fração de vapor)',
        'Internal energy': 'Energia interna',
        'Speed of sound': 'Velocidade do som',
        'Compressibility factor': 'Fator de compressibilidade',
        'Bubble point temperature': 'Temperatura do ponto de bolha',
        'Dew point temperature': 'Temperatura do ponto de orvalho',
        'Bubble point pressure': 'Pressão do ponto de bolha',
        'Dew point pressure': 'Pressão do ponto de orvalho'
    },

    _translatePropertyLabel(description) {
        const bracketIndex = description.indexOf('[');
        const name = (bracketIndex >= 0 ? description.slice(0, bracketIndex) : description).trim();
        const units = bracketIndex >= 0 ? description.slice(bracketIndex) : '';
        const translated = this._propertyLabelsPt[name] || name;
        return units ? `${translated} ${units}` : translated;
    },
    /**
     * Initialize the Components module
     */
    init() {
        this.createComponentsContent();
        this.loadComponents();
        this.loadPropertyNames();
        this.loadPropertyMixtureNames();
        this.setupEventListeners();
        if (window.DidaticModule) DidaticModule.setupAccordions();
    },

    /**
     * Create components content dynamically
     */
    createComponentsContent() {
        const componentsContent = document.getElementById('components-content');
        
        if (!componentsContent) return;

        const headerEl = document.createElement('div');
        headerEl.className = 'module-header';
        headerEl.innerHTML = `
            <div class="module-header-left">
                <nav class="module-breadcrumb" aria-label="Localização">
                    <a href="#home-content" data-tab="home-content">Início</a>
                    <span class="sep" aria-hidden="true">›</span>
                    <span>Propriedades</span>
                    <span class="sep" aria-hidden="true">›</span>
                    <span>Componentes</span>
                </nav>
                <h2 class="module-heading">Propriedades de Componentes</h2>
            </div>
        `;
        componentsContent.appendChild(headerEl);

        // Components content
        const content = document.createElement('div');
        content.className = 'grid grid-cols-1 gap-6';
        content.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">Propriedades Críticas</h3>
                <div class="accordion">
                    <button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="acc-critical">
                        <span>Como funciona — Propriedades Críticas</span>
                        <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="accordion-content" id="acc-critical" role="region">
                        <p>Propriedades críticas descrevem o ponto acima do qual a distinção entre fase líquida e vapor desaparece (ponto crítico).</p>
                        <table class="variables-table">
                            <thead><tr><th>Propriedade</th><th>Símbolo</th><th>Unidade típica</th></tr></thead>
                            <tbody>
                                <tr><td>Temperatura crítica</td><td>T<sub>c</sub></td><td>K</td></tr>
                                <tr><td>Pressão crítica</td><td>P<sub>c</sub></td><td>Pa</td></tr>
                                <tr><td>Densidade crítica</td><td>ρ<sub>c</sub></td><td>kg/m³</td></tr>
                                <tr><td>Temp. ponto triplo</td><td>T<sub>tp</sub></td><td>K</td></tr>
                            </tbody>
                        </table>
                        <p>Os dados são fornecidos pelo <strong>CoolProp</strong>, biblioteca termodinâmica open-source com modelos de equação de estado de alta precisão.</p>
                        <p class="teoria-ref">Ref.: Bell et al., CoolProp — An Open-Source Thermodynamics Library, 2014.</p>
                    </div>
                </div>
                <form id="critical-properties-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Selecionar Fluido</label>
                        <select id="critical-fluid-select" class="w-full select2-input" data-placeholder="Selecione um fluido"></select>
                    </div>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Obter Propriedades Críticas</button>
                </form>
                <div id="critical-properties-result" class="mt-4 p-3 bg-white rounded border hidden"></div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">Propriedades de Fluidos</h3>
                <div class="accordion">
                    <button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="acc-fluid-props">
                        <span>Como funciona — Propriedades do Fluido</span>
                        <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="accordion-content" id="acc-fluid-props" role="region">
                        <p>Calcula propriedades termodinâmicas e de transporte de <strong>fluidos puros</strong> a temperatura e pressão especificadas. Os dados são fornecidos pela biblioteca <strong>CoolProp</strong> (equações de estado de alta precisão, ≈120 fluidos).</p>
                        <table class="variables-table">
                            <thead><tr><th>Propriedade</th><th>Símbolo</th><th>Unidade</th></tr></thead>
                            <tbody>
                                <tr><td>Densidade</td><td>ρ</td><td>kg/m³</td></tr>
                                <tr><td>Viscosidade dinâmica</td><td>μ</td><td>Pa·s</td></tr>
                                <tr><td>Viscosidade cinemática</td><td>ν = μ/ρ</td><td>m²/s</td></tr>
                                <tr><td>Condutividade térmica</td><td>λ</td><td>W/(m·K)</td></tr>
                                <tr><td>Calor específico (pressão cte.)</td><td>c<sub>p</sub></td><td>J/(kg·K)</td></tr>
                                <tr><td>Calor específico (volume cte.)</td><td>c<sub>v</sub></td><td>J/(kg·K)</td></tr>
                                <tr><td>Entalpia específica</td><td>h</td><td>J/kg</td></tr>
                                <tr><td>Entropia específica</td><td>s</td><td>J/(kg·K)</td></tr>
                                <tr><td>Pressão de vapor</td><td>p<sub>vap</sub></td><td>Pa</td></tr>
                                <tr><td>Tensão superficial</td><td>σ</td><td>N/m</td></tr>
                                <tr><td>Ponto de bolha / orvalho</td><td>T<sub>bolha</sub>, T<sub>orvalho</sub></td><td>K</td></tr>
                            </tbody>
                        </table>
                        <p><strong>Uso principal no projeto:</strong> a pressão de vapor (p<sub>vap</sub>) é insumo direto do cálculo de NPSHd no módulo Bombas. Viscosidade e densidade alimentam o cálculo de Reynolds.</p>
                        <p class="teoria-ref">Ref.: Bell et al., "CoolProp — An Open-Source Thermodynamics Library", 2014 · Smith, Van Ness &amp; Abbott, Introduction to Chemical Engineering Thermodynamics, 8ª ed.</p>
                    </div>
                </div>
                <form id="property-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Selecionar Fluido</label>
                            <select id="property-fluid-select" class="w-full select2-input" data-placeholder="Selecione um fluido"></select>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Selecionar Propriedade</label>
                            <select multiple id="property-name-select" class="w-full select2-input" data-placeholder="Selecione uma ou mais propriedades"><option></option></select>
                            <div class="text-xs text-gray-500 mt-1">Selecione uma ou mais propriedades para calcular</div>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Temperatura (K)</label>
                            <input type="number" step="0.0000000001" id="property-temperature" class="w-full p-2 border rounded">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Pressão (Pa)</label>
                            <input type="number" step="0.0000000001" id="property-pressure" class="w-full p-2 border rounded">
                        </div>
                    </div>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Obter Propriedade</button>
                </form>
                <div id="property-result" class="mt-4 p-3 bg-white rounded border hidden"></div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">Propriedades de Misturas</h3>
                <div class="accordion">
                    <button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="acc-mixture">
                        <span>Como funciona — Propriedades de Mistura</span>
                        <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="accordion-content" id="acc-mixture" role="region">
                        <p>Calcula propriedades termodinâmicas de <strong>misturas</strong> de fluidos usando o backend HEOS do CoolProp. As frações molares devem somar exatamente 1,0.</p>
                        <p>Internamente, o sistema monta a string de estado no formato:</p>
                        <div class="formula-block">HEOS::Fluido1[x<sub>1</sub>]&amp;Fluido2[x<sub>2</sub>]&amp;…</div>
                        <p>Onde x<sub>i</sub> é a fração molar de cada componente. Esta string é enviada ao CoolProp junto com T e P para obter as propriedades da mistura.</p>
                        <table class="variables-table">
                            <thead><tr><th>Restrição</th><th>Detalhe</th></tr></thead>
                            <tbody>
                                <tr><td>Frações</td><td>∑ x<sub>i</sub> = 1,0 — obrigatório</td></tr>
                                <tr><td>Pares suportados</td><td>Verificar documentação CoolProp; nem todo par tem modelo de mistura implementado</td></tr>
                                <tr><td>Fase</td><td>As propriedades retornadas dependem da fase (líquido, vapor, bifásico) na condição T, P informada</td></tr>
                            </tbody>
                        </table>
                        <p><strong>Dica:</strong> para verificar se dois fluidos formam uma mistura suportada, consulte <em>CoolProp Mixture documentation</em>. Misturas não suportadas retornam erro da API.</p>
                        <p class="teoria-ref">Ref.: Bell et al., "CoolProp — An Open-Source Thermodynamics Library", 2014.</p>
                    </div>
                </div>
                <form id="mixture-properties-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Temperatura (K)</label>
                            <input type="number" step="0.0000000001" id="mixture-temperature" class="w-full p-2 border rounded">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Pressão (Pa)</label>
                            <input type="number" step="0.0000000001" id="mixture-pressure" class="w-full p-2 border rounded">
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <label class="block text-sm font-medium text-gray-700">Frações dos Fluidos</label>
                            <button type="button" id="add-fluid-fraction" class="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">+ Adicionar Fluido</button>
                        </div>
                        <div id="fluid-fractions-container"></div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Propriedades a Calcular</label>
                        <select id="mixture-properties-select" class="w-full select2-input" multiple data-placeholder="Selecione as propriedades (opcional)"><option></option></select>
                        <div class="text-xs text-gray-500 mt-1">Deixe vazio para calcular todas as propriedades disponíveis</div>
                    </div>
                    
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Calcular Propriedades da Mistura</button>
                </form>
                <div id="mixture-properties-result" class="mt-4 p-3 bg-white rounded border hidden"></div>
            </div>
        `;
        
        componentsContent.appendChild(content);
    },

    /**
     * Set up event listeners for the Components module
     */
    setupEventListeners() {
        // Critical properties form submit handler
        document.getElementById('critical-properties-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fluid = document.getElementById('critical-fluid-select').value;
            
            if (!fluid) {
                UI.showError('Dados incompletos', 'Selecione um fluido');
                return;
            }
            
            await this.getCriticalProperties(fluid);
        });

        // Property form submit handler
        document.getElementById('property-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fluid = document.getElementById('property-fluid-select').value;
            const propertyNames = $('#property-name-select').val();
            const temperature = document.getElementById('property-temperature').value;
            const pressure = document.getElementById('property-pressure').value;

            if (!fluid || !propertyNames || propertyNames.length === 0 || !temperature || !pressure) {
                UI.showError('Dados incompletos', 'Preencha todos os campos obrigatórios');
                return;
            }
            
            await this.getProperties(fluid, propertyNames, temperature, pressure);
        });

        // Add fluid fraction button handler
        document.getElementById('add-fluid-fraction').addEventListener('click', () => {
            this.addFluidFractionRow();
        });

        // Mixture properties form submit handler
        document.getElementById('mixture-properties-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const temperature = document.getElementById('mixture-temperature').value;
            const pressure = document.getElementById('mixture-pressure').value;
            
            if (!temperature || !pressure) {
                UI.showError('Dados incompletos', 'Informe temperatura e pressão');
                return;
            }
            
            const fluidFractions = this.collectFluidFractions();
            
            if (Object.keys(fluidFractions).length === 0) {
                UI.showError('Dados incompletos', 'Adicione pelo menos uma fração de fluido');
                return;
            }
            
            const properties = $('#mixture-properties-select').val();
            
            await this.getMixtureProperties(fluidFractions, temperature, pressure, properties);
        });
    },

    /**
     * Load available components
     */
    async loadComponents() {
        try {
            const componentsResponse = await API.listComponents();
            
            // Ensure components is an array
            const components = Array.isArray(componentsResponse) ? componentsResponse :
                              (typeof componentsResponse === 'object' ? Object.keys(componentsResponse) : []);
            
            // Update fluid selects
            this.updateFluidSelect('critical-fluid-select', components);
            this.updateFluidSelect('property-fluid-select', components);
            
            // Store for later use
            this.componentsList = components;
            
            // Add initial fluid fraction row
            this.addFluidFractionRow();
        } catch (error) {
            console.error('Error loading components:', error);
            UI.showError('Erro', 'Não foi possível carregar os componentes');
        }
    },

    /**
     * Update a fluid select element with the list of components
     * @param {string} selectId - ID of the select element
     * @param {Array} components - List of components
     */
    updateFluidSelect(selectId, components) {
        const select = document.getElementById(selectId);
        
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione um fluido</option>';
        
        // Ensure components is an array
        const componentList = Array.isArray(components) ? components :
                            (typeof components === 'object' ? Object.keys(components) : []);
        
        componentList.forEach(component => {
            const option = document.createElement('option');
            option.value = component;
            option.textContent = component;
            select.appendChild(option);
        });
        
        // Refresh Select2
        UI.refreshSelect2(`#${selectId}`);
    },

    /**
     * Load property names
     */
    async loadPropertyNames() {
        try {
            UI.showLoading('#property-name-select');
            
            const properties = await API.getPropertyNames();
            const select = document.getElementById('property-name-select');
            
            select.innerHTML = '<option></option>';
            
            // Check if properties is an object with key-value pairs
            if (typeof properties === 'object' && properties !== null && !Array.isArray(properties)) {
                // If it's an object with property descriptions
                Object.entries(properties).forEach(([key, description]) => {
                    const option = document.createElement('option');
                    option.value = key; // Keep the key as the value
                    option.textContent = this._translatePropertyLabel(description);
                    select.appendChild(option);
                });
            } else {
                // Fallback for array format
                const propertyList = Array.isArray(properties) ? properties : Object.keys(properties);
                propertyList.forEach(property => {
                    const option = document.createElement('option');
                    option.value = property;
                    option.textContent = property;
                    select.appendChild(option);
                });
            }
            
            UI.refreshSelect2('#property-name-select');
        } catch (error) {
            UI.showError('Erro ao carregar nomes de propriedades', error);
        } finally {
            UI.hideLoading('#property-name-select');
        }
    },

    /**
     * Load property mixture names
     */
    async loadPropertyMixtureNames() {
        try {
            UI.showLoading('#mixture-properties-select');
            
            const properties = await API.getPropertyMixtureNames();
            const select = document.getElementById('mixture-properties-select');
            
            select.innerHTML = '<option></option>';
            
            // Check if properties is an object with key-value pairs
            if (typeof properties === 'object' && properties !== null && !Array.isArray(properties)) {
                // If it's an object with property descriptions
                Object.entries(properties).forEach(([key, description]) => {
                    const option = document.createElement('option');
                    option.value = key; // Keep the key as the value
                    option.textContent = this._translatePropertyLabel(description);
                    select.appendChild(option);
                });
            } else {
                // Fallback for array format
                const propertyList = Array.isArray(properties) ? properties : Object.keys(properties);
                propertyList.forEach(property => {
                    const option = document.createElement('option');
                    option.value = property;
                    option.textContent = property;
                    select.appendChild(option);
                });
            }
            
            UI.refreshSelect2('#mixture-properties-select');
        } catch (error) {
            UI.showError('Erro ao carregar propriedades de mistura', error);
        } finally {
            UI.hideLoading('#mixture-properties-select');
        }
    },

    /**
     * Add a fluid fraction row
     */
    addFluidFractionRow() {
        const container = document.getElementById('fluid-fractions-container');
        const fractionRow = document.createElement('div');
        fractionRow.className = 'fluid-fraction-row flex items-center gap-2 mb-2';
        
        const fluidSelect = document.createElement('select');
        fluidSelect.className = 'fluid-name select2-input flex-1';
        fluidSelect.dataset.placeholder = 'Selecione um fluido';
        
        if (this.componentsList) {
            fluidSelect.innerHTML = '<option value="">Selecione um fluido</option>';
            
            this.componentsList.forEach(component => {
                const option = document.createElement('option');
                option.value = component;
                option.textContent = component;
                fluidSelect.appendChild(option);
            });
        }
        
        const fractionInput = document.createElement('input');
        fractionInput.type = 'number';
        fractionInput.step = '0.01';
        fractionInput.min = '0';
        fractionInput.max = '1';
        fractionInput.placeholder = 'Fração';
        fractionInput.className = 'fluid-fraction w-24 p-2 border rounded';
        
        const removeButton = document.createElement('span');
        removeButton.className = 'remove-fluid-fraction text-red-500 cursor-pointer';
        removeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
        removeButton.addEventListener('click', () => {
            container.removeChild(fractionRow);
        });
        
        fractionRow.appendChild(fluidSelect);
        fractionRow.appendChild(fractionInput);
        fractionRow.appendChild(removeButton);
        
        container.appendChild(fractionRow);
        
        // Initialize Select2 for the new select element
        $(fluidSelect).select2({
            ...UI.getSelect2Options('Selecione um fluido')
        });
    },

    /**
     * Collect fluid fractions from the form
     * @returns {Object} - Object with fluid names as keys and fractions as values
     */
    collectFluidFractions() {
        const fluidFractions = {};
        const fractionRows = document.querySelectorAll('.fluid-fraction-row');
        
        fractionRows.forEach(row => {
            const fluidName = $(row.querySelector('.fluid-name')).val();
            const fraction = parseFloat(row.querySelector('.fluid-fraction').value);
            
            if (fluidName && !isNaN(fraction)) {
                fluidFractions[fluidName] = fraction;
            }
        });
        
        return fluidFractions;
    },

    /**
     * Get critical properties for a fluid
     * @param {string} fluid - Fluid name
     */
    async getCriticalProperties(fluid) {
        try {
            UI.showLoading('#critical-properties-form');
            UI.hideResult('#critical-properties-result');
            
            const result = await API.getCriticalProperties(fluid);
            
            // Display the result
            let html = `<h4 class="font-medium text-gray-700 mb-2">Propriedades Críticas de ${fluid}</h4>`;
            
            // Format the result as a table
            html += '<table class="property-table">';
            html += '<thead><tr><th>Property</th><th>Value</th><th>Units</th></tr></thead>';
            html += '<tbody>';
            
            // Critical temperature
            html += `
                <tr>
                    <td>Critical Temperature</td>
                    <td>${UI.formatValue(result.critical_temperature)}</td>
                    <td>${result.critical_temperature_units}</td>
                </tr>
            `;
            
            // Critical pressure
            html += `
                <tr>
                    <td>Critical Pressure</td>
                    <td>${UI.formatValue(result.critical_pressure)}</td>
                    <td>${result.critical_pressure_units}</td>
                </tr>
            `;
            
            // Critical density
            html += `
                <tr>
                    <td>Critical Density</td>
                    <td>${UI.formatValue(result.critical_density)}</td>
                    <td>${result.critical_density_units}</td>
                </tr>
            `;
            
            // Triple point temperature
            html += `
                <tr>
                    <td>Triple Point Temperature</td>
                    <td>${UI.formatValue(result.triple_point_temperature)}</td>
                    <td>${result.triple_point_temperature_units}</td>
                </tr>
            `;
            
            // Triple point pressure
            html += `
                <tr>
                    <td>Triple Point Pressure</td>
                    <td>${UI.formatValue(result.triple_point_pressure)}</td>
                    <td>${result.triple_point_pressure_units}</td>
                </tr>
            `;
            
            html += '</tbody></table>';
            
            UI.showResult('#critical-properties-result', html);
        } catch (error) {
            UI.showError('Erro ao obter propriedades críticas', error);
        } finally {
            UI.hideLoading('#critical-properties-form');
        }
    },

    /**
     * Get a specific property for a fluid
     * @param {string} fluid - Fluid name
     * @param {string} propertyName - Property name
     * @param {number} temperature - Temperature in K
     * @param {number} pressure - Pressure in Pa
     * @param {string} propertyDescription - Description of the property
     */
    async getProperty(fluid, propertyName, temperature, pressure, propertyDescription) {
        try {
            UI.showLoading('#property-form');
            UI.hideResult('#property-result');
            
            const result = await API.getProperty(fluid, propertyName, temperature, pressure);
            
            // Display the result
            let html = `<h4 class="font-medium text-gray-700 mb-2">${propertyDescription} for ${fluid}</h4>`;
            
            // Format the result as a table
            html += '<table class="property-table">';
            html += '<thead><tr><th>Conditions</th><th>Value</th><th>Units</th></tr></thead>';
            html += '<tbody>';

            // Property value
            html += `
                <tr>
                    <td>${propertyDescription}</td>
                    <td>${UI.formatValue(result.value)}</td>
                    <td>${result.units}</td>
                </tr>
            `;
            
            html += '</tbody></table>';
            
            UI.showResult('#property-result', html);
        } catch (error) {
            UI.showError('Erro ao obter propriedade', error);
        } finally {
            UI.hideLoading('#property-form');
        }
    },

    /**
     * Get multiple properties for a fluid
     * @param {string} fluid - Fluid name
     * @param {Array} propertyNames - Array of property names
     * @param {number} temperature - Temperature in K
     * @param {number} pressure - Pressure in Pa
     */
    async getProperties(fluid, propertyNames, temperature, pressure) {
        try {
            UI.showLoading('#property-form');
            UI.hideResult('#property-result');
            
            const results = [];
            
            // Get property descriptions for display
            const select = document.getElementById('property-name-select');
            const propertyDescriptions = {};
            
            // Create a map of property keys to their descriptions
            Array.from(select.options).forEach(option => {
                propertyDescriptions[option.value] = option.text;
            });
            
            // Fetch each property
            for (const propertyName of propertyNames) {
                const result = await API.getProperty(fluid, propertyName, temperature, pressure);
                results.push({
                    name: propertyName,
                    description: propertyDescriptions[propertyName],
                    value: result.value,
                    units: result.units
                });
            }
            
            // Display the results
            let html = `<h4 class="font-medium text-gray-700 mb-2">Propriedades de ${fluid}</h4>`;
            
            // Format the result as a table
            html += '<table class="property-table">';
            html += '<thead><tr><th>Property</th><th>Value</th><th>Units</th></tr></thead>';
            html += '<tbody>';
            
            // Add each property
            results.forEach(result => {
                html += `
                    <tr>
                        <td>${result.description}</td>
                        <td>${UI.formatValue(result.value)}</td>
                        <td>${result.units}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            
            UI.showResult('#property-result', html);
        } catch (error) {
            UI.showError('Erro ao obter propriedades', error);
        } finally {
            UI.hideLoading('#property-form');
        }
    },

    /**
     * Get mixture properties
     * @param {Object} fluidFractions - Object with fluid names as keys and fractions as values
     * @param {number} temperature - Temperature in K
     * @param {number} pressure - Pressure in Pa
     * @param {Array} properties - List of properties to calculate (optional)
     */
    async getMixtureProperties(fluidFractions, temperature, pressure, properties) {
        try {
            UI.showLoading('#mixture-properties-form');
            UI.hideResult('#mixture-properties-result');
            
            const result = await API.getMixtureProperties(fluidFractions, temperature, pressure, properties);
            
            // Display the result
            let html = `<h4 class="font-medium text-gray-700 mb-2">Propriedades da Mistura</h4>`;
            
            // Format the fluid composition
            html += '<div class="mb-3">';
            html += '<p class="text-sm font-medium text-gray-700 mb-1">Fluid Composition:</p>';
            html += '<div class="flex flex-wrap">';
            
            for (const [fluid, fraction] of Object.entries(fluidFractions)) {
                html += `<span class="badge badge-blue">${fluid}: ${fraction}</span>`;
            }
            
            html += '</div></div>';
            
            // Format the result as a table
            html += '<table class="property-table">';
            html += '<thead><tr><th>Property</th><th>Value</th><th>Units</th></tr></thead>';
            html += '<tbody>';
                        
            // Property values
            for (const [property, value] of Object.entries(result.properties)) {
                if (typeof value === 'object' && value !== null) {
                    // Format property name: replace underscores with spaces and capitalize each word
                    const formattedProperty = property
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                        
                    html += `
                        <tr>
                            <td>${formattedProperty}</td>
                            <td>${UI.formatValue(value.value)}</td>
                            <td>${value.units}</td>
                        </tr>
                    `;
                }
            }
            
            html += '</tbody></table>';
            
            UI.showResult('#mixture-properties-result', html);
        } catch (error) {
            UI.showError('Erro ao calcular propriedades da mistura', error);
        } finally {
            UI.hideLoading('#mixture-properties-form');
        }
    }
};

// Export the Components module
window.ComponentsModule = ComponentsModule; 