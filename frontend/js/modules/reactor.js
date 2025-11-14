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
    },

    /**
     * Create reactor content dynamically
     */
    createReactorContent() {
        const reactorContent = document.getElementById('reactor-content');
        
        if (!reactorContent) return;
        
        // CSTR Reactor content
        const cstrContent = document.createElement('div');
        cstrContent.className = 'grid grid-cols-1 gap-6';
        cstrContent.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">CSTR Reactor</h3>
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
                <h3 class="text-lg font-medium mb-3 text-gray-800">PFR Reactor</h3>
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
                <h3 class="text-lg font-medium mb-3 text-gray-800">Conversion vs Volume Plot</h3>
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
                    <div id="conversion-plot-container" class="flex justify-center">
                        <img id="conversion-plot-image" class="max-w-full h-auto" />
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
            placeholderOption.textContent = 'Select or enter component name';
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
            placeholder: 'Select or enter component name',
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
            
            select.innerHTML = '<option value="">Select input type</option>';
            
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
            
            select.innerHTML = '<option value="">Select input type</option>';
            
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
        } catch (error) {
            UI.showError(`Error calculating ${reactorType.toUpperCase()}`, error);
        } finally {
            UI.hideLoading(`#${reactorType}-form`);
        }
    },

    /**
     * Generate conversion vs volume plot
     */
    async generateConversionVolumePlot() {
        try {
            // Get common parameters
            const rateConstant = parseFloat(document.getElementById('plot-rate-constant').value);
            
            // Get operation conditions
            const initialTemperature = parseFloat(document.getElementById('plot-initial-temperature').value);
            const initialPressure = parseFloat(document.getElementById('plot-initial-pressure').value);
            const finalTemperature = parseFloat(document.getElementById('plot-final-temperature').value);
            const finalPressure = parseFloat(document.getElementById('plot-final-pressure').value);
            const recyclingRatio = parseFloat(document.getElementById('plot-recycling-ratio').value) || 0;
            const maxConversion = parseFloat(document.getElementById('plot-max-conversion').value) || 0.99;
            
            // Validate required fields
            if (!rateConstant || !initialTemperature || !initialPressure || !finalTemperature || !finalPressure) {
                UI.showError('Missing Data', 'Please fill in all required fields');
                return;
            }
            
            // Collect components, stoichiometric coefficients and reaction orders
            const components = this.collectComponentData('plot-components-container');
            const stoichiometricCoefficients = this.collectStoichiometricCoefficients('plot');
            const reactionOrders = this.collectReactionOrders('plot');
            
            if (components.length === 0) {
                UI.showError('Missing Data', 'Please add at least one component');
                return;
            }
            
            // Build request payload
            const payload = {
                components: components,
                stoichiometric_coefficients: stoichiometricCoefficients,
                reaction_rate_params: {
                    k: rateConstant,
                    reaction_orders: reactionOrders
                },
                recycling_ratio: recyclingRatio,
                max_conversion: maxConversion,
                operation_conditions: {
                    initial_temperature: initialTemperature,
                    initial_pressure: initialPressure,
                    final_temperature: finalTemperature,
                    final_pressure: finalPressure
                }
            };
            
            // Send request to API
            UI.showLoading('#plot-conversion-form');
            
            const result = await API.plotConversionVsVolume(payload);
            
            // Display the plot
            if (result && result.image_base64) {
                // Get the result container and make it visible
                const plotResultContainer = document.getElementById('plot-result-reactor');
                plotResultContainer.classList.remove('hidden');
                
                // Set the image source
                const plotImage = document.getElementById('conversion-plot-image');
                plotImage.src = `data:image/png;base64,${result.image_base64}`;
                
                // Make sure the image is visible
                plotImage.style.display = 'block';
                plotImage.style.maxWidth = '100%';
            } else {
                UI.showError('Error', 'Failed to generate plot');
            }
        } catch (error) {
            console.error('Error generating plot:', error);
            UI.showError('Error generating plot', error.message || 'Unknown error');
        } finally {
            UI.hideLoading('#plot-conversion-form');
        }
    }
};

// Export the Reactor module
window.ReactorModule = ReactorModule; 