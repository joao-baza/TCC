/**
 * Components Module for Chemical Engineering Calculator
 * Handles fluid property calculations
 */

const ComponentsModule = {
    /**
     * Initialize the Components module
     */
    init() {
        this.createComponentsContent();
        this.loadComponents();
        this.loadPropertyNames();
        this.loadPropertyMixtureNames();
        this.setupEventListeners();
    },

    /**
     * Create components content dynamically
     */
    createComponentsContent() {
        const componentsContent = document.getElementById('components-content');
        
        if (!componentsContent) return;
        
        // Components content
        const content = document.createElement('div');
        content.className = 'grid grid-cols-1 gap-6';
        content.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">Critical Properties</h3>
                <form id="critical-properties-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Select Fluid</label>
                        <select id="critical-fluid-select" class="w-full select2-input"></select>
                    </div>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Get Critical Properties</button>
                </form>
                <div id="critical-properties-result" class="mt-4 p-3 bg-white rounded border hidden"></div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">Fluid Properties</h3>
                <form id="property-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Select Fluid</label>
                            <select id="property-fluid-select" class="w-full select2-input"></select>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Select Property</label>
                            <select multiple id="property-name-select" class="w-full select2-input"></select>
                            <div class="text-xs text-gray-500 mt-1">Select one or more properties to calculate</div>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Temperature (K)</label>
                            <input type="number" step="0.0000000001" id="property-temperature" class="w-full p-2 border rounded">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Pressure (Pa)</label>
                            <input type="number" step="0.0000000001" id="property-pressure" class="w-full p-2 border rounded">
                        </div>
                    </div>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Get Property</button>
                </form>
                <div id="property-result" class="mt-4 p-3 bg-white rounded border hidden"></div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-md">
                <h3 class="text-lg font-medium mb-3 text-gray-800">Mixture Properties</h3>
                <form id="mixture-properties-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Temperature (K)</label>
                            <input type="number" step="0.0000000001" id="mixture-temperature" class="w-full p-2 border rounded">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Pressure (Pa)</label>
                            <input type="number" step="0.0000000001" id="mixture-pressure" class="w-full p-2 border rounded">
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <label class="block text-sm font-medium text-gray-700">Fluid Fractions</label>
                            <button type="button" id="add-fluid-fraction" class="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">+ Add Fluid</button>
                        </div>
                        <div id="fluid-fractions-container"></div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Properties to Calculate</label>
                        <select id="mixture-properties-select" class="w-full select2-input" multiple></select>
                        <div class="text-xs text-gray-500 mt-1">Leave empty to calculate all available properties</div>
                    </div>
                    
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Calculate Mixture Properties</button>
                </form>
                <div id="mixture-properties-result" class="mt-4 p-3 bg-white rounded border hidden"></div>
            </div>
        `;
        
        componentsContent.appendChild(content);
        
        // Initialize Select2 for the new selects
        UI.initializeSelect2();
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
                UI.showError('Missing Data', 'Please select a fluid');
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
                UI.showError('Missing Data', 'Please fill all required fields');
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
                UI.showError('Missing Data', 'Please enter temperature and pressure');
                return;
            }
            
            const fluidFractions = this.collectFluidFractions();
            
            if (Object.keys(fluidFractions).length === 0) {
                UI.showError('Missing Data', 'Please add at least one fluid fraction');
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
            UI.showError('Error', 'Failed to load components');
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
        
        select.innerHTML = '<option value="">Select a fluid</option>';
        
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
        $(select).trigger('change');
    },

    /**
     * Load property names
     */
    async loadPropertyNames() {
        try {
            UI.showLoading('#property-name-select');
            
            const properties = await API.getPropertyNames();
            const select = document.getElementById('property-name-select');
            
            select.innerHTML = '<option value="">Select a property</option>';
            
            // Check if properties is an object with key-value pairs
            if (typeof properties === 'object' && properties !== null && !Array.isArray(properties)) {
                // If it's an object with property descriptions
                Object.entries(properties).forEach(([key, description]) => {
                    const option = document.createElement('option');
                    option.value = key; // Keep the key as the value
                    option.textContent = description.split('[')[0].trim(); // Show the description without units
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
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading property names', error);
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
            
            select.innerHTML = '';
            
            // Check if properties is an object with key-value pairs
            if (typeof properties === 'object' && properties !== null && !Array.isArray(properties)) {
                // If it's an object with property descriptions
                Object.entries(properties).forEach(([key, description]) => {
                    const option = document.createElement('option');
                    option.value = key; // Keep the key as the value
                    option.textContent = description.split('[')[0].trim(); // Show the description without units
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
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading mixture property names', error);
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
        
        if (this.componentsList) {
            fluidSelect.innerHTML = '<option value="">Select a fluid</option>';
            
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
        fractionInput.placeholder = 'Fraction';
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
            width: '100%',
            placeholder: 'Select a fluid'
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
            let html = `<h4 class="font-medium text-gray-700 mb-2">Critical Properties for ${fluid}</h4>`;
            
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
            UI.showError('Error getting critical properties', error);
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
            UI.showError('Error getting property', error);
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
            let html = `<h4 class="font-medium text-gray-700 mb-2">Properties for ${fluid}</h4>`;
            
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
            UI.showError('Error getting properties', error);
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
            let html = `<h4 class="font-medium text-gray-700 mb-2">Mixture Properties</h4>`;
            
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
            UI.showError('Error calculating mixture properties', error);
        } finally {
            UI.hideLoading('#mixture-properties-form');
        }
    }
};

// Export the Components module
window.ComponentsModule = ComponentsModule; 