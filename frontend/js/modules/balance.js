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
        
        // Initialization of Select2 is important for dynamic elements
        setTimeout(() => {
            $('.select2-input').select2({
                width: '100%',
                placeholder: 'Select an option'
            });
            
            // Update the tab navigation to include the new tab
            UI.setupTabs();
        }, 100);
    },

    /**
     * Create balance content dynamically
     */
    createBalanceContent() {
        // Add tab button if it doesn't exist yet
        const tabsContainer = document.getElementById('mainTab');
        if (tabsContainer && !document.getElementById('balance-tab')) {
            const balanceTabItem = document.createElement('li');
            balanceTabItem.className = 'mr-2';
            balanceTabItem.setAttribute('role', 'presentation');
            balanceTabItem.innerHTML = `
                <button class="inline-block p-4 rounded-t-lg hover:bg-gray-100" id="balance-tab" data-tab="balance-content">Mass Balance</button>
            `;
            tabsContainer.appendChild(balanceTabItem);
        }

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
                <h2 class="text-xl font-semibold mb-4 text-blue-700">Mass Balance Calculations</h2>
                
                <div class="grid grid-cols-1 gap-6">
                    <div class="bg-gray-50 p-4 rounded-md">
                        <h3 class="text-lg font-medium mb-3 text-gray-800">Components</h3>
                        <div class="flex mb-4 justify-between items-center">
                            <div class="flex items-center">
                                <input type="text" id="component-name" class="p-2 border rounded" placeholder="Component name">
                                <button type="button" id="add-component" class="ml-2 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">Add</button>
                            </div>
                            <button type="button" id="load-example" class="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600">Load Example</button>
                        </div>
                        <div id="components-list" class="flex flex-wrap gap-2 mb-4"></div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-md">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="text-lg font-medium text-gray-800">Streams</h3>
                            <button type="button" id="add-stream" class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">Add Stream</button>
                        </div>
                        <div id="streams-container" class="space-y-4"></div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-md">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="text-lg font-medium text-gray-800">Reactions</h3>
                            <button type="button" id="add-reaction" class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">Add Reaction</button>
                        </div>
                        <div id="reactions-container" class="space-y-4"></div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-md">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="text-lg font-medium text-gray-800">Splits (Recycle)</h3>
                            <button type="button" id="add-split" class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">Add Split</button>
                        </div>
                        <div id="splits-container" class="space-y-4"></div>
                    </div>

                    <div class="flex space-x-4">
                        <button type="button" id="calculate-button" class="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">Calculate Mass Balance</button>
                        <button type="button" id="calculate-yields-button" class="bg-purple-600 text-white px-6 py-3 rounded hover:bg-purple-700">Calculate Yields</button>
                        <button type="button" id="plot-button" class="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700">Generate Plot</button>
                    </div>
                    Note: Flow rates use consistent units throughout. Compositions are mass fractions (when using mass flow units) or molar fractions (when using molar flow units).

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
        // Add event listener to the tab button itself to ensure it works
        const balanceTab = document.getElementById('balance-tab');
        if (balanceTab) {
            balanceTab.addEventListener('click', () => {
                // Hide all tab panes
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.add('hidden');
                    pane.classList.remove('active');
                });
                
                // Show balance tab pane
                const balanceContent = document.getElementById('balance-content');
                if (balanceContent) {
                    balanceContent.classList.remove('hidden');
                    balanceContent.classList.add('active');
                }
                
                // Update active state on tabs
                document.querySelectorAll('[data-tab]').forEach(tab => {
                    tab.classList.remove('active');
                });
                balanceTab.classList.add('active');
            });
        }

        // Add component
        document.getElementById('add-component')?.addEventListener('click', () => {
            const componentName = document.getElementById('component-name').value.trim();
            if (componentName) {
                this.addComponent(componentName);
                document.getElementById('component-name').value = '';
            } else {
                UI.showError('Error', 'Please enter a component name');
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
            UI.showError('Error', `Component ${name} already exists`);
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
     * Load example data from the API
     */
    async loadExampleData() {
        try {
            UI.showLoading('#balance-content');
            const example = await API.getMassBalanceExample();
            
            // Clear existing data
            document.getElementById('components-list').innerHTML = '';
            document.getElementById('streams-container').innerHTML = '';
            document.getElementById('reactions-container').innerHTML = '';
            document.getElementById('splits-container').innerHTML = '';
            
            // Add components
            example.components.forEach(component => {
                this.addComponent(component);
            });
            
            // Add streams
            example.streams.forEach(stream => {
                this.addStream(stream);
            });
            
            // Add reactions
            example.reactions.forEach(reaction => {
                this.addReaction(reaction);
            });
            
            // Add splits
            example.splits.forEach(split => {
                this.addSplit(split);
            });
            
            UI.hideLoading('#balance-content');
            UI.showSuccess('Success', 'Example data loaded');
        } catch (error) {
            UI.hideLoading('#balance-content');
            UI.showError('Error', error);
        }
    },

    /**
     * Calculate mass balance
     */
    async calculateMassBalance() {
        try {
            const components = this.getComponents();
            if (components.length === 0) {
                UI.showError('Error', 'Please add at least one component');
                return;
            }
            
            const streams = this.collectStreamData();
            if (streams.length === 0) {
                UI.showError('Error', 'Please add at least one stream');
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
            
            let resultHtml = '<h3 class="text-lg font-semibold mb-3">Mass Balance Results</h3>';
            resultHtml += '<p class="text-sm text-gray-600 mb-3">Flow rates are in consistent units throughout. Compositions are mass fractions (when using mass flow units) or molar fractions (when using molar flow units).</p>';
            
            // Add process metrics if available
            if (result.metrics && Object.keys(result.metrics).length > 0) {
                resultHtml += '<div class="mb-4 p-3 bg-gray-50 rounded border">';
                resultHtml += '<h4 class="font-medium mb-2">Process Metrics</h4>';
                resultHtml += '<ul class="list-disc pl-5">';
                
                if (result.metrics.fresh_feed) {
                    resultHtml += `<li>Fresh Feed: ${result.metrics.fresh_feed.toFixed(2)} (mass or mol)/time</li>`;
                }
                if (result.metrics.product_flow) {
                    resultHtml += `<li>Product Flow: ${result.metrics.product_flow.toFixed(2)} (mass or mol)/time</li>`;
                }
                if (result.metrics.recycle_ratio) {
                    resultHtml += `<li>Recycle Ratio: ${result.metrics.recycle_ratio.toFixed(2)}</li>`;
                }
                
                resultHtml += '</ul>';
                resultHtml += '</div>';
            }
            
            // Stream results
            for (const [streamName, streamData] of Object.entries(result.results)) {
                resultHtml += `<div class="mb-4 p-3 bg-gray-50 rounded border">`;
                resultHtml += `<h4 class="font-medium mb-2">${streamName}</h4>`;
                resultHtml += `<p>Flow Rate: ${streamData.flow_rate.toFixed(2)} (mass or mol)/time</p>`;
                
                resultHtml += `<div class="mt-2">`;
                resultHtml += `<p class="font-medium">Compositions (mass or molar fractions):</p>`;
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
        } catch (error) {
            UI.hideLoading('#balance-content');
            UI.showError('Error', error);
        }
    },

    /**
     * Calculate yields
     */
    async calculateYields() {
        try {
            const components = this.getComponents();
            if (components.length === 0) {
                UI.showError('Error', 'Please add at least one component');
                return;
            }
            
            const streams = this.collectStreamData();
            if (streams.length === 0) {
                UI.showError('Error', 'Please add at least one stream');
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
            
            let resultHtml = '<h3 class="text-lg font-semibold mb-3">Yield Results</h3>';
            
            // Add yields
            if (result.yields && Object.keys(result.yields).length > 0) {
                resultHtml += '<div class="mb-4 p-3 bg-gray-50 rounded border">';
                resultHtml += '<h4 class="font-medium mb-2">Yields</h4>';
                resultHtml += '<ul class="list-disc pl-5">';
                
                for (const [yieldName, yieldValue] of Object.entries(result.yields)) {
                    const [output, input] = yieldName.split('_from_');
                    resultHtml += `<li>Yield of ${output} from ${input}: ${yieldValue.toFixed(2)}%</li>`;
                }
                
                resultHtml += '</ul>';
                resultHtml += '</div>';
            }
            
            // Stream results (simplified)
            resultHtml += '<h4 class="font-medium mb-2">Stream Results</h4>';
            resultHtml += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">';
            
            for (const [streamName, streamData] of Object.entries(result.results)) {
                resultHtml += `<div class="p-3 bg-gray-50 rounded border">`;
                resultHtml += `<h5 class="font-medium">${streamName}</h5>`;
                resultHtml += `<p>Flow: ${streamData.flow_rate.toFixed(2)} kg/h</p>`;
                resultHtml += `</div>`;
            }
            
            resultHtml += '</div>';
            
            UI.hideLoading('#balance-content');
            UI.showResult('#balance-result', resultHtml);
        } catch (error) {
            UI.hideLoading('#balance-content');
            UI.showError('Error', error);
        }
    },

    /**
     * Generate plot
     */
    async generatePlot() {
        try {
            const components = this.getComponents();
            if (components.length === 0) {
                UI.showError('Error', 'Please add at least one component');
                return;
            }
            
            const streams = this.collectStreamData();
            if (streams.length === 0) {
                UI.showError('Error', 'Please add at least one stream');
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
            
            const result = await API.plotMassBalance(data);

            if (result.image_base64) {
                
                // Create a placeholder first with fixed dimensions
                const plotResultElement = document.getElementById('plot-result-mass-balance');
                if (!plotResultElement) {
                    console.error('Plot result element not found');
                    return;
                }
                
                // Set placeholder HTML
                plotResultElement.innerHTML = `
                    <div class="plot-container">
                        <img src="data:image/png;base64,${result.image_base64}" 
                             alt="Mass Balance Plot" 
                             style="max-width:100%; height:auto; display:block;"
                        >
                    </div>
                `;
                
                // Show the plot result container
                plotResultElement.classList.remove('hidden');
                
            } else {
                console.error('No image data received from server');
                UI.showError('Error', 'No plot image was received from the server');
            }
            
            UI.hideLoading('#balance-content');
        } catch (error) {
            console.error('Plot generation error:', error);
            UI.hideLoading('#balance-content');
            UI.showError('Error', error);
        }
    }
};

// Export the Balance module
window.BalanceModule = BalanceModule; 