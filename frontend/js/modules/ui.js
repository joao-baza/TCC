/**
 * UI Module for Chemical Engineering Calculator
 * Contains utility functions for the UI
 */

const UI = {
    /**
     * Initialize Select2 for all select elements with the select2-input class
     */
    initializeSelect2() {
        $('.select2-input').select2({
            width: '100%',
            placeholder: 'Select an option'
        });
    },

    /**
     * Show a success notification
     * @param {string} title - Title of the notification
     * @param {string} message - Message to display
     */
    showSuccess(title, message) {
        Swal.fire({
            title,
            text: message,
            icon: 'success',
            confirmButtonColor: '#3085d6'
        });
    },

    /**
     * Show an error notification
     * @param {string} title - Title of the notification
     * @param {string|Error} error - Error message or Error object
     */
    showError(title, error) {
        const errorMessage = error instanceof Error ? error.message : error;
        Swal.fire({
            title,
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#d33'
        });
    },

    /**
     * Show a loading indicator on an element
     * @param {string} selector - Element selector
     */
    showLoading(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('loading');
        }
    },

    /**
     * Hide the loading indicator from an element
     * @param {string} selector - Element selector
     */
    hideLoading(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.remove('loading');
        }
    },

    /**
     * Show a result container and fill it with content
     * @param {string} selector - Element selector
     * @param {string|HTMLElement} content - Content to display
     */
    showResult(selector, content) {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = content;
            element.classList.remove('hidden');
        }
    },

    /**
     * Hide a result container
     * @param {string} selector - Element selector
     */
    hideResult(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('hidden');
        }
    },

    /**
     * Generate HTML for a property table
     * @param {Object} data - Property data
     * @returns {string} - HTML for the property table
     */
    generatePropertyTable(data) {
        let html = '<table class="property-table">';
        html += '<thead><tr><th>Property</th><th>Value</th><th>Units</th></tr></thead>';
        html += '<tbody>';
        
        if (data.value !== undefined && data.units !== undefined) {
            html += `
                <tr>
                    <td>Diameter</td>
                    <td>${this.formatValue(data.value)}</td>
                    <td>${data.units}</td>
                </tr>
            `;
        } else {
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'object' && value !== null) {
                    if ('value' in value && 'units' in value) {
                        html += `
                            <tr>
                                <td>${this.formatPropertyName(key)}</td>
                                <td>${this.formatValue(value.value)}</td>
                                <td>${value.units}</td>
                            </tr>
                        `;
                    } else {
                        // For nested objects
                        for (const [nestedKey, nestedValue] of Object.entries(value)) {
                            if (typeof nestedValue === 'object' && nestedValue !== null && 'value' in nestedValue) {
                                html += `
                                    <tr>
                                        <td>${this.formatPropertyName(key)} - ${this.formatPropertyName(nestedKey)}</td>
                                        <td>${this.formatValue(nestedValue.value)}</td>
                                        <td>${nestedValue.units}</td>
                                    </tr>
                                `;
                            }
                        }
                    }
                } else if (value !== null && value !== undefined) {
                    // For simple values
                    html += `
                        <tr>
                            <td>${this.formatPropertyName(key)}</td>
                            <td>${this.formatValue(value)}</td>
                            <td>-</td>
                        </tr>
                    `;
                }
            }
        }
        
        html += '</tbody></table>';
        return html;
    },

    /**
     * Format a property name for display
     * @param {string} name - Property name
     * @returns {string} - Formatted property name
     */
    formatPropertyName(name) {
        return name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    },

    /**
     * Format a value for display
     * @param {any} value - Value to format
     * @returns {string} - Formatted value
     */
    formatValue(value) {
        if (value === null) {
            return "Not specified";
        }
        if (typeof value === 'number') {
            // Format numbers with appropriate precision
            if (Math.abs(value) < 0.0001 || Math.abs(value) > 10000) {
                return value.toExponential(4);
            } else {
                return value.toPrecision(6);
            }
        }
        return value;
    },

    /**
     * Set up tab navigation
     */
    setupTabs() {
        // Remover os event listeners existentes para evitar duplicações
        document.querySelectorAll('[data-tab]').forEach(button => {
            const newButton = button.cloneNode(true);
            if (button.parentNode) {
                button.parentNode.replaceChild(newButton, button);
            }
        });
        
        // Adicionar os event listeners novamente
        const tabButtons = document.querySelectorAll('[data-tab]');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tab buttons
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Hide all tab panes
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.add('hidden');
                    pane.classList.remove('active');
                });
                
                // Show the target tab pane
                const targetId = button.getAttribute('data-tab');
                const targetPane = document.getElementById(targetId);
                if (targetPane) {
                    targetPane.classList.remove('hidden');
                    targetPane.classList.add('active');
                }
            });
        });
        
        if (!document.querySelector('.tab-pane.active')) {
            const firstTab = document.querySelector('[data-tab]');
            if (firstTab) {
                firstTab.click();
            }
        }
    },

    /**
     * Add a fitting row to the fittings container
     * @param {Array} fittingOptions - Array of fitting options
     * @returns {HTMLElement} - The created fitting row element
     */
    addFittingRow(fittingOptions) {
        const container = document.getElementById('fittings-container');
        const fittingRow = document.createElement('div');
        fittingRow.className = 'fitting-item';
        
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.min = '1';
        quantityInput.value = '1';
        quantityInput.className = 'fitting-quantity w-20 p-2 border rounded mr-2';
        
        const fittingSelect = document.createElement('select');
        fittingSelect.className = 'fitting-select select2-input flex-1';
        
        fittingOptions.forEach(fitting => {
            const option = document.createElement('option');
            option.value = fitting;
            option.textContent = fitting;
            fittingSelect.appendChild(option);
        });
        
        const removeButton = document.createElement('span');
        removeButton.className = 'fitting-remove ml-2';
        removeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
        removeButton.addEventListener('click', () => {
            container.removeChild(fittingRow);
        });
        
        fittingRow.appendChild(quantityInput);
        fittingRow.appendChild(fittingSelect);
        fittingRow.appendChild(removeButton);
        
        container.appendChild(fittingRow);
        
        // Initialize Select2 for the new select element
        $(fittingSelect).select2({
            width: '100%',
            placeholder: 'Select a fitting'
        });
        
        return fittingRow;
    },

    /**
     * Collect fittings data from the fittings container
     * @returns {Array} - Array of fitting objects
     */
    collectFittings() {
        const fittings = [];
        const fittingItems = document.querySelectorAll('.fitting-item');
        
        fittingItems.forEach(item => {
            const quantity = parseInt(item.querySelector('.fitting-quantity').value);
            const fitting = $(item.querySelector('.fitting-select')).val();
            
            if (quantity > 0 && fitting) {
                fittings.push({
                    quantity,
                    fitting
                });
            }
        });
        
        return fittings;
    },

    /**
     * Add a component row to a container
     * @param {string} containerId - ID of the container
     * @param {Array} componentOptions - Array of component options
     * @returns {HTMLElement} - The created component row element
     */
    addComponentRow(containerId, componentOptions) {
        const container = document.getElementById(containerId);
        const componentRow = document.createElement('div');
        componentRow.className = 'component-row grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 items-center';
        
        // Component name select
        const nameWrapper = document.createElement('div');
        nameWrapper.className = 'col-span-1';
        
        const componentSelect = document.createElement('select');
        componentSelect.className = 'component-name select2-input w-full';
        
        componentOptions.forEach(component => {
            const option = document.createElement('option');
            option.value = component;
            option.textContent = component;
            componentSelect.appendChild(option);
        });
        
        nameWrapper.appendChild(componentSelect);
        
        // Stoichiometric coefficient input
        const stoichWrapper = document.createElement('div');
        stoichWrapper.className = 'col-span-1';
        
        const stoichiometricInput = document.createElement('input');
        stoichiometricInput.type = 'number';
        stoichiometricInput.step = '0.01';
        stoichiometricInput.placeholder = 'Stoich. Coef.';
        stoichiometricInput.className = 'component-stoich w-full p-2 border rounded';
        
        const stoichLabel = document.createElement('label');
        stoichLabel.className = 'block text-xs text-gray-500 mb-1';
        stoichLabel.textContent = 'Stoich. Coef. (- for reactants)';
        
        stoichWrapper.appendChild(stoichLabel);
        stoichWrapper.appendChild(stoichiometricInput);
        
        // Concentration input
        const concWrapper = document.createElement('div');
        concWrapper.className = 'col-span-1';
        
        const concentrationInput = document.createElement('input');
        concentrationInput.type = 'number';
        concentrationInput.step = '0.01';
        concentrationInput.min = '0';
        concentrationInput.placeholder = 'Conc. (mol/m³)';
        concentrationInput.className = 'component-conc w-full p-2 border rounded';
        
        const concLabel = document.createElement('label');
        concLabel.className = 'block text-xs text-gray-500 mb-1';
        concLabel.textContent = 'Inlet Conc. (mol/m³)';
        
        concWrapper.appendChild(concLabel);
        concWrapper.appendChild(concentrationInput);
        
        // Molecular weight input
        const mwWrapper = document.createElement('div');
        mwWrapper.className = 'col-span-1';
        
        const molecularWeightInput = document.createElement('input');
        molecularWeightInput.type = 'number';
        molecularWeightInput.step = '0.01';
        molecularWeightInput.min = '0';
        molecularWeightInput.placeholder = 'Mol. Weight (g/mol)';
        molecularWeightInput.className = 'component-mw w-full p-2 border rounded';
        
        const mwLabel = document.createElement('label');
        mwLabel.className = 'block text-xs text-gray-500 mb-1';
        mwLabel.textContent = 'Molecular Weight (g/mol)';
        
        mwWrapper.appendChild(mwLabel);
        mwWrapper.appendChild(molecularWeightInput);
        
        // Remove button
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'col-span-1 flex items-end justify-center md:justify-end';
        
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'component-remove bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
            container.removeChild(componentRow);
        });
        
        buttonWrapper.appendChild(removeButton);
        
        // Append all wrappers to the component row
        componentRow.appendChild(nameWrapper);
        componentRow.appendChild(stoichWrapper);
        componentRow.appendChild(concWrapper);
        componentRow.appendChild(mwWrapper);
        componentRow.appendChild(buttonWrapper);
        
        container.appendChild(componentRow);
        
        // Initialize Select2 for the new select element
        $(componentSelect).select2({
            width: '100%',
            placeholder: 'Select a component'
        });
        
        return componentRow;
    },

    /**
     * Collect components data from a container
     * @param {string} containerId - ID of the container
     * @returns {Array} - Array of component objects
     */
    collectComponents(containerId) {
        const components = [];
        const componentRows = document.querySelectorAll(`#${containerId} .component-row`);
        
        componentRows.forEach(row => {
            const name = $(row.querySelector('.component-name')).val();
            const stoichiometricCoef = parseFloat(row.querySelector('.component-stoich').value);
            const inletConcentration = parseFloat(row.querySelector('.component-conc').value);
            const molecularWeight = parseFloat(row.querySelector('.component-mw').value);
            
            if (name && !isNaN(stoichiometricCoef) && !isNaN(inletConcentration)) {
                const component = {
                    name,
                    stoichiometricCoef,
                    inletConcentration
                };
                
                if (!isNaN(molecularWeight)) {
                    component.molecularWeight = molecularWeight;
                }
                
                components.push(component);
            }
        });
        
        return components;
    }
};

// Export the UI module
window.UI = UI; 