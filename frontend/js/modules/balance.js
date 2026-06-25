/**
 * Mass Balance Module for Chemical Engineering Calculator
 * Handles mass balance calculations
 */

const BalanceModule = {
    /**
     * Initialize the Balance module
     */
    init() {
        this.createBalanceContent();
        this.setupEventListeners();
        UI.initializeSelect2();
        if (window.DidaticModule) {
            DidaticModule.setupAccordions();
        }
    },

    /**
     * Create balance content dynamically
     */
    createBalanceContent() {
        // Create the tab content if it doesn't exist or is empty
        const existingContent = document.getElementById('balance-content');
        if (existingContent && existingContent.children.length > 1) {
            // Content already exists and has children, no need to recreate
            return;
        }

        // Get or create the tab content element
        let balanceContent = existingContent;
        const tabContentContainer = document.querySelector('.tab-content');

        if (!balanceContent && tabContentContainer) {
            balanceContent = document.createElement('div');
            balanceContent.id = 'balance-content';
            balanceContent.className = 'bg-white p-6 rounded-lg shadow-md tab-pane hidden';
            tabContentContainer.appendChild(balanceContent);
        }

        if (balanceContent) {
            balanceContent.innerHTML = `
    <div class="module-header">
        <div class="module-header-left">
            <nav class="module-breadcrumb" aria-label="Localização">
                <a href="#home-content" data-tab="home-content">Início</a>
                <span class="sep" aria-hidden="true">›</span>
                <span>Balanço de Massa</span>
            </nav>
            <h2 class="module-heading">Balanço de Massa</h2>
        </div>
    </div>

    <div class="accordion mb-6">
        <button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="acc-balance">
            <span>Como funciona — Balanço de Massa</span>
            <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        <div class="accordion-content" id="acc-balance" role="region">
            <p>O balanço de massa aplica o princípio da conservação da massa a um sistema em regime permanente:</p>
            <div class="formula-block">∑ Entradas − ∑ Saídas + ∑ Gerado = 0</div>
            <table class="variables-table">
                <thead><tr><th>Conceito</th><th>Descrição</th></tr></thead>
                <tbody>
                    <tr><td>Corrente (direction=1)</td><td>Entrada no sistema</td></tr>
                    <tr><td>Corrente (direction=−1)</td><td>Saída do sistema</td></tr>
                    <tr><td>Coef. estequiométrico</td><td>Negativo para reagentes, positivo para produtos</td></tr>
                    <tr><td>Reciclo (split)</td><td>Fração da corrente retornada à entrada</td></tr>
                    <tr><td>Conversão (X)</td><td>Fração do componente-chave consumido na reação</td></tr>
                </tbody>
            </table>
            <p><strong>Dica:</strong> use "Carregar Exemplo" para ver um sistema de reação com reciclo pré-configurado.</p>
            <p class="teoria-ref">Ref.: Reklaitis et al., Introduction to Material and Energy Balances, Wiley.</p>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-6">
        <div class="bg-gray-50 p-4 rounded-md">
            <h3 class="text-lg font-medium mb-3 text-gray-800">Componentes</h3>
            <div class="flex mb-4 justify-between items-center">
                <div class="flex items-center">
                    <input type="text" id="component-name" class="p-2 border rounded" placeholder="Nome do componente">
                    <button type="button" id="add-component" class="ml-2 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">Adicionar</button>
                </div>
                <button type="button" id="load-example" class="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600">Carregar Exemplo</button>
            </div>
            <div id="components-list" class="flex flex-wrap gap-2 mb-4"></div>
        </div>

        <div class="bg-gray-50 p-4 rounded-md">
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-lg font-medium text-gray-800">Correntes</h3>
                <button type="button" id="add-stream" class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">Adicionar Corrente</button>
            </div>
            <div id="streams-container" class="space-y-4"></div>
        </div>

        <div class="bg-gray-50 p-4 rounded-md">
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-lg font-medium text-gray-800">Reações</h3>
                <button type="button" id="add-reaction" class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">Adicionar Reação</button>
            </div>
            <div id="reactions-container" class="space-y-4"></div>
        </div>

        <div class="bg-gray-50 p-4 rounded-md">
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-lg font-medium text-gray-800">Correntes de Reciclo (Splits)</h3>
                <button type="button" id="add-split" class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">Adicionar Split</button>
            </div>
            <div id="splits-container" class="space-y-4"></div>
        </div>

        <div class="flex space-x-4 flex-wrap gap-y-2">
            <button type="button" id="calculate-button" class="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">Calcular Balanço de Massa</button>
            <button type="button" id="calculate-yields-button" class="bg-purple-600 text-white px-6 py-3 rounded hover:bg-purple-700">Calcular Rendimentos</button>
            <button type="button" id="plot-button" class="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700">Gerar Gráfico de Correntes</button>
        </div>

        <div id="balance-result" class="mt-4 p-4 bg-white rounded border hidden"></div>
        <div id="plot-result-mass-balance" class="mt-4 p-4 bg-white rounded border hidden text-center"></div>
    </div>
`;
        }
    },

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Add component
        document.getElementById('add-component')?.addEventListener('click', () => {
            const componentName = document.getElementById('component-name').value.trim();
            if (componentName) {
                this.addComponent(componentName);
                document.getElementById('component-name').value = '';
            } else {
                UI.showError('Erro', 'Informe o nome do componente');
            }
        });

        // Load example
        document.getElementById('load-example')?.addEventListener('click', () => {
            this.loadExampleData();
        });

        // Add stream
        document.getElementById('add-stream')?.addEventListener('click', () => {
            this.addStream();
        });

        // Add reaction
        document.getElementById('add-reaction')?.addEventListener('click', () => {
            this.addReaction();
        });

        // Add split
        document.getElementById('add-split')?.addEventListener('click', () => {
            this.addSplit();
        });

        // Calculate button
        document.getElementById('calculate-button')?.addEventListener('click', () => {
            this.calculateMassBalance();
        });

        // Calculate yields button
        document.getElementById('calculate-yields-button')?.addEventListener('click', () => {
            this.calculateYields();
        });

        // Plot button
        document.getElementById('plot-button')?.addEventListener('click', () => {
            this.generatePlot();
        });
    },

    /**
     * Add a component to the component list
     * @param {string} name - Component name
     */
    addComponent(name) {
        const componentsList = document.getElementById('components-list');
        
        // Check if component already exists
        if (document.querySelector(`#components-list .component-tag[data-name="${name}"]`)) {
            UI.showError('Erro', `O componente ${name} já existe`);
            return;
        }
        
        const componentTag = document.createElement('div');
        componentTag.className = 'component-tag bg-blue-100 text-blue-800 px-3 py-1 rounded flex items-center';
        componentTag.setAttribute('data-name', name);
        componentTag.innerHTML = `
            <span>${name}</span>
            <button type="button" class="remove-component ml-2 text-red-500 hover:text-red-700">×</button>
        `;
        componentsList.appendChild(componentTag);
        
        // Add remove event
        componentTag.querySelector('.remove-component').addEventListener('click', () => {
            componentTag.remove();
            this.updateStreamComponents();
            this.updateReactionComponents();
        });
        
        this.updateStreamComponents();
        this.updateReactionComponents();
    },

    /**
     * Update components in existing streams
     */
    updateStreamComponents() {
        const components = this.getComponents();
        const streamForms = document.querySelectorAll('#streams-container .stream-form');
        
        streamForms.forEach(form => {
            const compositionsContainer = form.querySelector('.compositions-container');
            const existingComponents = Array.from(compositionsContainer.querySelectorAll('.composition-row')).map(
                row => row.getAttribute('data-component')
            );
            
            // Remove compositions for components that no longer exist
            Array.from(compositionsContainer.querySelectorAll('.composition-row')).forEach(row => {
                const component = row.getAttribute('data-component');
                if (!components.includes(component)) {
                    row.remove();
                }
            });
            
            // Add compositions for new components
            components.forEach(component => {
                if (!existingComponents.includes(component)) {
                    const row = document.createElement('div');
                    row.className = 'composition-row grid grid-cols-2 gap-2 mb-2';
                    row.setAttribute('data-component', component);
                    row.innerHTML = `
                        <label class="flex items-center">${component}</label>
                        <input type="number" step="0.0000000001" class="p-2 border rounded composition-value" placeholder="Value" min="0" max="1">
                    `;
                    compositionsContainer.appendChild(row);
                }
            });
        });
    },

    /**
     * Update components in existing reactions
     */
    updateReactionComponents() {
        const components = this.getComponents();
        const reactionForms = document.querySelectorAll('#reactions-container .reaction-form');
        
        reactionForms.forEach(form => {
            const stoichiometryContainer = form.querySelector('.stoichiometry-container');
            const existingComponents = Array.from(stoichiometryContainer.querySelectorAll('.stoichiometry-row')).map(
                row => row.getAttribute('data-component')
            );
            
            // Remove stoichiometry for components that no longer exist
            Array.from(stoichiometryContainer.querySelectorAll('.stoichiometry-row')).forEach(row => {
                const component = row.getAttribute('data-component');
                if (!components.includes(component)) {
                    row.remove();
                }
            });
            
            // Add stoichiometry for new components
            components.forEach(component => {
                if (!existingComponents.includes(component)) {
                    const row = document.createElement('div');
                    row.className = 'stoichiometry-row grid grid-cols-2 gap-2 mb-2';
                    row.setAttribute('data-component', component);
                    row.innerHTML = `
                        <label class="flex items-center">${component}</label>
                        <input type="number" step="0.01" class="p-2 border rounded stoichiometry-value" placeholder="Stoichiometric coefficient">
                    `;
                    stoichiometryContainer.appendChild(row);
                }
            });
            
            // Update key component dropdown
            const keyComponentSelect = form.querySelector('.key-component-select');
            const currentValue = keyComponentSelect.value;
            
            // Clear existing options
            keyComponentSelect.innerHTML = '';
            
            // Add new options
            components.forEach(component => {
                const option = document.createElement('option');
                option.value = component;
                option.textContent = component;
                keyComponentSelect.appendChild(option);
            });
            
            // Restore previous value if possible
            if (components.includes(currentValue)) {
                keyComponentSelect.value = currentValue;
            }
        });
    },

    /**
     * Add a new stream form
     * @param {Object} streamData - Optional initial data for the stream
     */
    addStream(streamData = null) {
        const streamsContainer = document.getElementById('streams-container');
        const streamId = 'stream-' + (streamsContainer.children.length + 1);
        
        const streamForm = document.createElement('div');
        streamForm.className = 'stream-form p-4 bg-gray-100 rounded-md border';
        streamForm.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-medium text-gray-700">Stream</h4>
                <button type="button" class="remove-stream text-red-500 hover:text-red-700">Remove</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" class="stream-name p-2 border rounded w-full" placeholder="Stream name" value="${streamData?.name || ''}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                    <select class="stream-direction p-2 border rounded w-full">
                        <option value="1" ${streamData?.direction === 1 ? 'selected' : ''}>Input</option>
                        <option value="-1" ${streamData?.direction === -1 ? 'selected' : ''}>Output</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Flow Rate</label>
                    <div class="flex items-center">
                        <input type="number" step="0.01" class="stream-flow-rate p-2 border rounded w-full" placeholder="Flow rate (optional)" value="${streamData?.flow_rate || ''}">
                        <span class="ml-2 text-gray-500 text-sm">Use any mass or molar units per time</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Maintain consistent units throughout all streams</p>
                </div>
            </div>
            <div class="mb-4">
                <h5 class="text-sm font-medium text-gray-700 mb-2">Compositions</h5>
                <p class="text-xs text-gray-500 mb-2">Values represent mass fractions (when using mass flow units) or molar fractions (when using molar flow units)</p>
                <div class="compositions-container"></div>
            </div>
        `;
        streamsContainer.appendChild(streamForm);
        
        // Add remove event
        streamForm.querySelector('.remove-stream').addEventListener('click', () => {
            streamForm.remove();
        });
        
        // Add compositions for all current components
        const components = this.getComponents();
        const compositionsContainer = streamForm.querySelector('.compositions-container');
        
        components.forEach(component => {
            const row = document.createElement('div');
            row.className = 'composition-row grid grid-cols-2 gap-2 mb-2';
            row.setAttribute('data-component', component);
            
            // Get composition value from streamData if available
            let compositionValue = '';
            if (streamData && streamData.compositions && component in streamData.compositions) {
                compositionValue = streamData.compositions[component] !== null ? streamData.compositions[component] : '';
            }
            
            row.innerHTML = `
                <label class="flex items-center">${component}</label>
                <input type="number" step="0.0000000001" class="p-2 border rounded composition-value" placeholder="Value" min="0" max="1" value="${compositionValue}">
            `;
            compositionsContainer.appendChild(row);
        });
    },

    /**
     * Add a new reaction form
     * @param {Object} reactionData - Optional initial data for the reaction
     */
    addReaction(reactionData = null) {
        const reactionsContainer = document.getElementById('reactions-container');
        const reactionId = 'reaction-' + (reactionsContainer.children.length + 1);
        
        const reactionForm = document.createElement('div');
        reactionForm.className = 'reaction-form p-4 bg-gray-100 rounded-md border';
        reactionForm.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-medium text-gray-700">Reaction</h4>
                <button type="button" class="remove-reaction text-red-500 hover:text-red-700">Remove</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Key Component</label>
                    <select class="key-component-select p-2 border rounded w-full"></select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Conversion (0-1)</label>
                    <input type="number" step="0.01" min="0" max="1" class="conversion p-2 border rounded w-full" placeholder="Conversion" value="${reactionData?.conversion || ''}">
                </div>
            </div>
            <div class="mb-4">
                <h5 class="text-sm font-medium text-gray-700 mb-2">Stoichiometric Coefficients</h5>
                <p class="text-xs text-gray-500 mb-2">(Negative for reactants, positive for products)</p>
                <div class="stoichiometry-container"></div>
            </div>
        `;
        reactionsContainer.appendChild(reactionForm);
        
        // Add remove event
        reactionForm.querySelector('.remove-reaction').addEventListener('click', () => {
            reactionForm.remove();
        });
        
        // Add key component options
        const keyComponentSelect = reactionForm.querySelector('.key-component-select');
        const components = this.getComponents();
        
        components.forEach(component => {
            const option = document.createElement('option');
            option.value = component;
            option.textContent = component;
            keyComponentSelect.appendChild(option);
        });
        
        // Set key component if provided
        if (reactionData && reactionData.key_component) {
            keyComponentSelect.value = reactionData.key_component;
        }
        
        // Add stoichiometry fields for all current components
        const stoichiometryContainer = reactionForm.querySelector('.stoichiometry-container');
        
        components.forEach(component => {
            const row = document.createElement('div');
            row.className = 'stoichiometry-row grid grid-cols-2 gap-2 mb-2';
            row.setAttribute('data-component', component);
            
            // Get stoichiometry value from reactionData if available
            let stoichiometryValue = '';
            if (reactionData && reactionData.stoichiometry && component in reactionData.stoichiometry) {
                stoichiometryValue = reactionData.stoichiometry[component];
            }
            
            row.innerHTML = `
                <label class="flex items-center">${component}</label>
                <input type="number" step="0.01" class="p-2 border rounded stoichiometry-value" placeholder="Stoichiometric coefficient" value="${stoichiometryValue}">
            `;
            stoichiometryContainer.appendChild(row);
        });
    },

    /**
     * Add a new split form
     * @param {Object} splitData - Optional initial data for the split
     */
    addSplit(splitData = null) {
        const splitsContainer = document.getElementById('splits-container');
        const splitId = 'split-' + (splitsContainer.children.length + 1);
        
        const splitForm = document.createElement('div');
        splitForm.className = 'split-form p-4 bg-gray-100 rounded-md border';
        splitForm.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-medium text-gray-700">Split</h4>
                <button type="button" class="remove-split text-red-500 hover:text-red-700">Remove</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Parent Stream</label>
                    <input type="text" class="parent-stream p-2 border rounded w-full" placeholder="Parent stream name" value="${splitData?.parent_stream || ''}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Recycle Stream</label>
                    <input type="text" class="recycle-stream p-2 border rounded w-full" placeholder="Recycle stream name" value="${splitData?.recycle_stream || ''}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Purge Stream</label>
                    <input type="text" class="purge-stream p-2 border rounded w-full" placeholder="Purge stream name" value="${splitData?.purge_stream || ''}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Recycle Fraction (0-1)</label>
                    <input type="number" step="0.01" min="0" max="1" class="recycle-fraction p-2 border rounded w-full" placeholder="Recycle fraction" value="${splitData?.fraction || ''}">
                </div>
            </div>
        `;
        splitsContainer.appendChild(splitForm);
        
        // Add remove event
        splitForm.querySelector('.remove-split').addEventListener('click', () => {
            splitForm.remove();
        });
    },

    /**
     * Get the list of components
     * @returns {Array} - Array of component names
     */
    getComponents() {
        return Array.from(document.querySelectorAll('#components-list .component-tag')).map(
            tag => tag.getAttribute('data-name')
        );
    },

    /**
     * Collect stream data from the form
     * @returns {Array} - Array of stream objects
     */
    collectStreamData() {
        const streamForms = document.querySelectorAll('#streams-container .stream-form');
        const streams = [];
        
        streamForms.forEach(form => {
            const name = form.querySelector('.stream-name').value.trim();
            const direction = parseInt(form.querySelector('.stream-direction').value);
            const flowRateInput = form.querySelector('.stream-flow-rate').value.trim();
            const flowRate = flowRateInput ? parseFloat(flowRateInput) : null;
            
            // Collect compositions
            const compositions = {};
            form.querySelectorAll('.composition-row').forEach(row => {
                const component = row.getAttribute('data-component');
                const valueInput = row.querySelector('.composition-value').value.trim();
                compositions[component] = valueInput ? parseFloat(valueInput) : null;
            });
            
            if (name) {
                streams.push({
                    name,
                    direction,
                    flow_rate: flowRate,
                    compositions
                });
            }
        });
        
        return streams;
    },

    /**
     * Collect reaction data from the form
     * @returns {Array} - Array of reaction objects
     */
    collectReactionData() {
        const reactionForms = document.querySelectorAll('#reactions-container .reaction-form');
        const reactions = [];
        
        reactionForms.forEach(form => {
            const keyComponent = form.querySelector('.key-component-select').value;
            const conversionInput = form.querySelector('.conversion').value.trim();
            const conversion = conversionInput ? parseFloat(conversionInput) : null;
            
            // Collect stoichiometry
            const stoichiometry = {};
            form.querySelectorAll('.stoichiometry-row').forEach(row => {
                const component = row.getAttribute('data-component');
                const valueInput = row.querySelector('.stoichiometry-value').value.trim();
                if (valueInput) {
                    stoichiometry[component] = parseFloat(valueInput);
                }
            });
            
            if (keyComponent && conversion !== null && Object.keys(stoichiometry).length > 0) {
                reactions.push({
                    stoichiometry,
                    key_component: keyComponent,
                    conversion
                });
            }
        });
        
        return reactions;
    },

    /**
     * Collect split data from the form
     * @returns {Array} - Array of split objects
     */
    collectSplitData() {
        const splitForms = document.querySelectorAll('#splits-container .split-form');
        const splits = [];
        
        splitForms.forEach(form => {
            const parentStream = form.querySelector('.parent-stream').value.trim();
            const recycleStream = form.querySelector('.recycle-stream').value.trim();
            const purgeStream = form.querySelector('.purge-stream').value.trim();
            const fractionInput = form.querySelector('.recycle-fraction').value.trim();
            const fraction = fractionInput ? parseFloat(fractionInput) : null;
            
            if (parentStream && recycleStream && purgeStream && fraction !== null) {
                splits.push({
                    parent_stream: parentStream,
                    recycle_stream: recycleStream,
                    purge_stream: purgeStream,
                    fraction
                });
            }
        });
        
        return splits;
    },

    /**
     * Carrega dados de exemplo da API (mesmo fluxo das demais telas via btn-example)
     */
    async loadExampleData() {
        try {
            UI.showLoading('#balance-content');
            const example = await API.getMassBalanceExample();

            document.getElementById('components-list').innerHTML = '';
            document.getElementById('streams-container').innerHTML = '';
            document.getElementById('reactions-container').innerHTML = '';
            document.getElementById('splits-container').innerHTML = '';

            example.components.forEach(component => {
                this.addComponent(component);
            });

            example.streams.forEach(stream => {
                this.addStream(stream);
            });

            example.reactions.forEach(reaction => {
                this.addReaction(reaction);
            });

            example.splits.forEach(split => {
                this.addSplit(split);
            });

            UI.showSuccess('Sucesso', 'Exemplo carregado com sucesso.');
        } catch (error) {
            UI.showError('Erro', error.message || 'Não foi possível carregar o exemplo');
        } finally {
            UI.hideLoading('#balance-content');
        }
    },

    /**
     * Calculate mass balance
     */
    async calculateMassBalance() {
        try {
            const components = this.getComponents();
            if (components.length === 0) {
                UI.showError('Erro', 'Adicione pelo menos um componente');
                return;
            }
            
            const streams = this.collectStreamData();
            if (streams.length === 0) {
                UI.showError('Erro', 'Adicione pelo menos uma corrente');
                return;
            }
            
            const reactions = this.collectReactionData();
            const splits = this.collectSplitData();
            
            const data = {
                components,
                streams,
                reactions: reactions.length > 0 ? reactions : null,
                splits: splits.length > 0 ? splits : null
            };
            
            UI.showLoading('#balance-content');
            UI.hideResult('#balance-result');
            UI.hideResult('#plot-result-mass-balance');
            
            const result = await API.calculateMassBalance(data);
            
            let resultHtml = '<h3 class="text-lg font-semibold mb-3">Resultados do Balanço de Massa</h3>';
            resultHtml += '<p class="text-sm text-gray-600 mb-3">As vazões estão em unidades consistentes. Composições são frações mássicas (vazão em massa) ou molares (vazão molar).</p>';
            
            // Add process metrics if available
            if (result.metrics && Object.keys(result.metrics).length > 0) {
                resultHtml += '<div class="mb-4 p-3 bg-gray-50 rounded border">';
                resultHtml += '<h4 class="font-medium mb-2">Métricas do Processo</h4>';
                resultHtml += '<ul class="list-disc pl-5">';
                
                if (result.metrics.fresh_feed) {
                    resultHtml += `<li>Alimentação fresca: ${result.metrics.fresh_feed.toFixed(2)} (massa ou mol)/tempo</li>`;
                }
                if (result.metrics.product_flow) {
                    resultHtml += `<li>Vazão de produto: ${result.metrics.product_flow.toFixed(2)} (massa ou mol)/tempo</li>`;
                }
                if (result.metrics.recycle_ratio) {
                    resultHtml += `<li>Taxa de reciclo: ${result.metrics.recycle_ratio.toFixed(2)}</li>`;
                }
                
                resultHtml += '</ul>';
                resultHtml += '</div>';
            }
            
            // Stream results
            for (const [streamName, streamData] of Object.entries(result.results)) {
                resultHtml += `<div class="mb-4 p-3 bg-gray-50 rounded border">`;
                resultHtml += `<h4 class="font-medium mb-2">${streamName}</h4>`;
                resultHtml += `<p>Vazão: ${streamData.flow_rate.toFixed(2)} (massa ou mol)/tempo</p>`;
                
                resultHtml += `<div class="mt-2">`;
                resultHtml += `<p class="font-medium">Composições (frações mássicas ou molares):</p>`;
                resultHtml += `<ul class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1">`;
                
                for (const [comp, value] of Object.entries(streamData.compositions)) {
                    resultHtml += `<li>${comp}: ${value.toFixed(4)}</li>`;
                }
                
                resultHtml += `</ul>`;
                resultHtml += `</div>`;
                resultHtml += `</div>`;
            }
            
            UI.hideLoading('#balance-content');
            UI.showResult('#balance-result', resultHtml);

            document.dispatchEvent(new CustomEvent('tcc:calculated', { detail: {
                module: 'Balanço de Massa',
                operation: 'Balanço de Massa',
                inputs: `${components.length} componentes · ${streams.length} correntes`,
                summary: `${Object.keys(result.results).length} correntes calculadas`,
            }}));
        } catch (error) {
            UI.hideLoading('#balance-content');
            UI.showError('Erro', error);
        }
    },

    /**
     * Calculate yields
     */
    async calculateYields() {
        try {
            const components = this.getComponents();
            if (components.length === 0) {
                UI.showError('Erro', 'Adicione pelo menos um componente');
                return;
            }
            
            const streams = this.collectStreamData();
            if (streams.length === 0) {
                UI.showError('Erro', 'Adicione pelo menos uma corrente');
                return;
            }
            
            const reactions = this.collectReactionData();
            const splits = this.collectSplitData();
            
            const data = {
                components,
                streams,
                reactions: reactions.length > 0 ? reactions : null,
                splits: splits.length > 0 ? splits : null
            };
            
            UI.showLoading('#balance-content');
            UI.hideResult('#balance-result');
            UI.hideResult('#plot-result-mass-balance');
            
            const result = await API.calculateYields(data);
            
            let resultHtml = '<h3 class="text-lg font-semibold mb-3">Resultados de Rendimento</h3>';
            
            // Add yields
            if (result.yields && Object.keys(result.yields).length > 0) {
                resultHtml += '<div class="mb-4 p-3 bg-gray-50 rounded border">';
                resultHtml += '<h4 class="font-medium mb-2">Rendimentos</h4>';
                resultHtml += '<ul class="list-disc pl-5">';
                
                for (const [yieldName, yieldValue] of Object.entries(result.yields)) {
                    const [output, input] = yieldName.split('_from_');
                    resultHtml += `<li>Rendimento de ${output} a partir de ${input}: ${yieldValue.toFixed(2)}%</li>`;
                }
                
                resultHtml += '</ul>';
                resultHtml += '</div>';
            }
            
            // Stream results (simplified)
            resultHtml += '<h4 class="font-medium mb-2">Resultados por Corrente</h4>';
            resultHtml += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">';
            
            for (const [streamName, streamData] of Object.entries(result.results)) {
                resultHtml += `<div class="p-3 bg-gray-50 rounded border">`;
                resultHtml += `<h5 class="font-medium">${streamName}</h5>`;
                resultHtml += `<p>Vazão: ${streamData.flow_rate.toFixed(2)} kg/h</p>`;
                resultHtml += `</div>`;
            }
            
            resultHtml += '</div>';
            
            UI.hideLoading('#balance-content');
            UI.showResult('#balance-result', resultHtml);
        } catch (error) {
            UI.hideLoading('#balance-content');
            UI.showError('Erro', error);
        }
    },

    /**
     * Generate plot
     */
    async generatePlot() {
        try {
            const components = this.getComponents();
            if (components.length === 0) {
                UI.showError('Erro', 'Adicione pelo menos um componente');
                return;
            }

            const streams = this.collectStreamData();
            if (streams.length === 0) {
                UI.showError('Erro', 'Adicione pelo menos uma corrente');
                return;
            }

            const reactions = this.collectReactionData();
            const splits = this.collectSplitData();
            const data = {
                components,
                streams,
                reactions: reactions.length > 0 ? reactions : null,
                splits:    splits.length > 0    ? splits    : null,
            };

            UI.showLoading('#balance-content');
            UI.hideResult('#balance-result');
            UI.hideResult('#plot-result-mass-balance');

            const result = await API.calculateMassBalance(data);

            const streamNames = Object.keys(result.results);
            const flowRates   = streamNames.map(name => result.results[name].flow_rate);

            // Mapa de direção por nome de corrente
            const dirMap = {};
            streams.forEach(s => { dirMap[s.name] = s.direction; });

            const plotEl = document.getElementById('plot-result-mass-balance');
            if (!plotEl) {
                console.error('plot-result-mass-balance não encontrado');
                return;
            }

            if (this._balanceChart) {
                this._balanceChart.destroy();
                this._balanceChart = null;
            }
            plotEl.innerHTML = '<canvas id="balance-chart" aria-label="Gráfico de Balanço de Massa por Corrente"></canvas>';
            plotEl.classList.remove('hidden');

            const ctx = document.getElementById('balance-chart').getContext('2d');

            this._balanceChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: streamNames,
                    datasets: [{
                        label: 'Vazão da Corrente',
                        data: flowRates,
                        backgroundColor: streamNames.map(name =>
                            dirMap[name] === 1
                                ? 'rgba(37,99,235,0.75)'
                                : 'rgba(220,38,38,0.75)'
                        ),
                        borderColor: streamNames.map(name =>
                            dirMap[name] === 1 ? '#2563EB' : '#DC2626'
                        ),
                        borderWidth: 1,
                    }],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Balanço de Massa — Vazões por Corrente',
                            font: { size: 14 },
                        },
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const dir = dirMap[ctx.label] === 1 ? 'Entrada' : 'Saída';
                                    return `${ctx.raw.toFixed(3)}  (${dir})`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Vazão (unidades consistentes)' },
                            beginAtZero: true,
                        },
                    },
                },
            });

            UI.hideLoading('#balance-content');
        } catch (error) {
            console.error('Erro ao gerar gráfico:', error);
            UI.hideLoading('#balance-content');
            UI.showError('Erro', error);
        }
    }
};

// Export the Balance module
window.BalanceModule = BalanceModule; 