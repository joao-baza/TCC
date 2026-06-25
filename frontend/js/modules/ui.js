/**
 * UI Module for Chemical Engineering Calculator
 * Contains utility functions for the UI
 */

const UI = {
    SELECT2_DEFAULT_PLACEHOLDER: 'Selecione uma opção',

    getSelect2Language() {
        return {
            noResults: () => 'Nenhum resultado encontrado',
            searching: () => 'Buscando…',
            inputTooShort: (args) => `Digite ${args.minimum - args.input.length} ou mais caracteres`,
            loadingMore: () => 'Carregando mais resultados…',
            maximumSelected: (args) => `Você só pode selecionar ${args.maximum} item(ns)`,
            removeAllItems: () => 'Remover todos os itens',
            errorLoading: () => 'Não foi possível carregar os resultados'
        };
    },

    getSelect2Options(placeholder = this.SELECT2_DEFAULT_PLACEHOLDER) {
        return {
            width: '100%',
            placeholder,
            language: this.getSelect2Language()
        };
    },

    /**
     * Initialize Select2 for select elements with the select2-input class.
     * Destroys existing instances first to avoid duplicate wrappers and stale config.
     */
    initializeSelect2(selector = '.select2-input') {
        $(selector).each(function initSelect2Element() {
            const el = this;
            const $el = $(el);

            if ($el.hasClass('select2-hidden-accessible')) {
                $el.select2('destroy');
            }

            const placeholder = el.dataset.placeholder || UI.SELECT2_DEFAULT_PLACEHOLDER;

            $el.select2({
                ...UI.getSelect2Options(placeholder),
                allowClear: !el.multiple
            });
        });
    },

    /** Re-apply Select2 after options are loaded dynamically. */
    refreshSelect2(selector) {
        this.initializeSelect2(selector);
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
        html += '<thead><tr><th>Propriedade</th><th>Valor</th><th>Unidade</th></tr></thead>';
        html += '<tbody>';
        
        if (data.value !== undefined && data.units !== undefined) {
            html += `
                <tr>
                    <td>Diâmetro</td>
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
            return '<span class="text-gray-400">-</span>';
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
     * Map de tab-id para função de inicialização do módulo (lazy-load)
     */
    _moduleInitMap: {
        'piping-content':     () => window.PipingModule     && window.PipingModule.init(),
        'sizing-content':     () => window.SizingModule     && window.SizingModule.init(),
        'flow-content':       () => window.FlowModule       && window.FlowModule.init(),
        'pump-content':       () => window.PumpModule       && window.PumpModule.init(),
        'reactor-content':    () => window.ReactorModule    && window.ReactorModule.init(),
        'components-content': () => window.ComponentsModule && window.ComponentsModule.init(),
        'balance-content':    () => window.BalanceModule    && window.BalanceModule.init(),
        'history-content':   () => window.HistoryModule  && window.HistoryModule.render(),
        'glossary-content':  () => window.GlossaryModule && window.GlossaryModule.render(),
    },

    _initialized: new Set(),

    /**
     * Ativa um tab/painel pelo id, faz lazy-init do módulo e atualiza o hash.
     */
    activateTab(tabId) {
        // Esconde todos os painéis
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.add('hidden');
            pane.classList.remove('active');
        });

        // Atualiza estado ativo na sidebar
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            const isActive = item.getAttribute('data-tab') === tabId;
            item.classList.toggle('active', isActive);
            if (isActive) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });

        // Exibe o painel alvo
        const pane = document.getElementById(tabId);
        if (pane) {
            pane.classList.remove('hidden');
            pane.classList.add('active');
        }

        // Lazy-init do módulo (apenas uma vez por módulo)
        if (!this._initialized.has(tabId) && this._moduleInitMap[tabId]) {
            this._moduleInitMap[tabId]();
            this._initialized.add(tabId);
            // Re-inicializa Select2 nos novos selects do módulo
            this.initializeSelect2();
        }

        // Atualiza o hash sem rolar a página
        if (tabId !== 'home-content') {
            history.replaceState(null, '', '#' + tabId);
        } else {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // Fecha o drawer mobile se estiver aberto
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            overlay && overlay.classList.remove('visible');
            const toggle = document.getElementById('sidebarToggle');
            toggle && toggle.setAttribute('aria-expanded', 'false');
        }

        // Move o foco para o heading do pane ativado (a11y)
        const target = document.getElementById(tabId);
        if (target) {
            const heading = target.querySelector('h1, h2, h3, [tabindex="-1"]');
            if (heading) {
                heading.setAttribute('tabindex', '-1');
                heading.focus({ preventScroll: false });
            }
        }
    },

    /**
     * Configura a sidebar de navegação com lazy-load por módulo e hash routing.
     */
    setupSidebar() {
        const self = this;

        // Delegate em todos os elementos [data-tab] (sidebar + home cards)
        document.addEventListener('click', function (e) {
            const trigger = e.target.closest('[data-tab]');
            if (!trigger) return;
            e.preventDefault();
            const tabId = trigger.getAttribute('data-tab');
            if (tabId) self.activateTab(tabId);
        });

        // Drawer mobile — botão hambúrguer
        const toggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (toggle && sidebar && overlay) {
            toggle.addEventListener('click', function () {
                const isOpen = sidebar.classList.toggle('open');
                overlay.classList.toggle('visible', isOpen);
                toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });
            overlay.addEventListener('click', function () {
                sidebar.classList.remove('open');
                overlay.classList.remove('visible');
                toggle.setAttribute('aria-expanded', 'false');
            });
        }

        // Hash routing: abre o módulo indicado pela URL (ex: #piping-content)
        const hash = window.location.hash.replace('#', '');
        const validTabs = ['home-content', 'piping-content', 'sizing-content', 'flow-content',
                           'pump-content', 'reactor-content', 'components-content', 'balance-content',
                           'history-content', 'glossary-content'];
        if (hash && validTabs.includes(hash)) {
            self.activateTab(hash);
        }
        // Caso contrário, o HTML já tem home-content como active — não faz nada
    },

    /**
     * @deprecated Use setupSidebar() — mantido para compatibilidade.
     */
    setupTabs() {
        this.setupSidebar();
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
            ...UI.getSelect2Options('Selecione uma conexão')
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
            ...UI.getSelect2Options('Selecione um componente')
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