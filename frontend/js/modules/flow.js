/**
 * Flow Module for Chemical Engineering Calculator
 * Handles flow-related calculations
 */

const FlowModule = {
    /**
     * Initialize the Flow module
     */
    init() {
        this.loadFrictionFactorMethods();
        this.loadHydraulicDiameterShapes();
        this.loadCompositions();
        this.loadSchedules();
        this.setupEventListeners();
    },

    /**
     * Set up event listeners for the Flow module
     */
    setupEventListeners() {
        // Reynolds form submit handler
        document.getElementById('reynolds-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const characteristicDiameter = document.getElementById('characteristic-diameter').value;
            const velocity = document.getElementById('reynolds-velocity').value;
            const density = document.getElementById('density').value;
            const dynamicViscosity = document.getElementById('dynamic-viscosity').value;
            const kinematicViscosity = document.getElementById('kinematic-viscosity').value;
            
            if (!characteristicDiameter || !velocity) {
                UI.showError('Missing Data', 'Please enter characteristic diameter and velocity');
                return;
            }
            
            if ((!density || !dynamicViscosity) && !kinematicViscosity) {
                UI.showError('Missing Data', 'Please enter either density and dynamic viscosity OR kinematic viscosity');
                return;
            }
            
            const params = {
                characteristic_diameter: parseFloat(characteristicDiameter),
                velocity: parseFloat(velocity)
            };
            
            if (density && dynamicViscosity) {
                params.density = parseFloat(density);
                params.dynamic_viscosity = parseFloat(dynamicViscosity);
            } else if (kinematicViscosity) {
                params.kinematic_viscosity = parseFloat(kinematicViscosity);
            }
            
            await this.calculateReynolds(params);
        });

        // Friction factor form submit handler
        document.getElementById('friction-factor-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const reynolds = document.getElementById('reynolds-number').value;
            const method = document.getElementById('friction-factor-method').value;
            const roughnessType = document.querySelector('input[name="roughness-type"]:checked').value;
            const diameterType = document.querySelector('input[name="diameter-type"]:checked').value;
            
            let roughness;
            if (roughnessType === 'custom') {
                roughness = document.getElementById('custom-roughness').value;
                if (!roughness) {
                    UI.showError('Missing Data', 'Please enter a custom roughness value');
                    return;
                }
            } else {
                const composition = document.getElementById('flow-composition-select').value;
                if (!composition) {
                    UI.showError('Missing Data', 'Please select a material composition');
                    return;
                }
                
                // Get roughness from composition
                try {
                    const compositionDetails = await API.getCompositionDetails(composition);
                    roughness = compositionDetails.specifications.roughness.value;
                } catch (error) {
                    UI.showError('Error', 'Failed to get roughness from composition');
                    return;
                }
            }
            
            let diameter;
            if (diameterType === 'custom') {
                diameter = document.getElementById('custom-diameter').value;
                if (!diameter) {
                    UI.showError('Missing Data', 'Please enter a custom diameter value');
                    return;
                }
            } else {
                const schedule = document.getElementById('flow-schedule-select').value;
                const selectedDiameter = document.getElementById('flow-diameter-select').value;
                
                if (!schedule || !selectedDiameter) {
                    UI.showError('Missing Data', 'Please select both schedule and diameter');
                    return;
                }
                
                diameter = selectedDiameter;
            }
            
            if (!reynolds || !method) {
                UI.showError('Missing Data', 'Please fill all required fields');
                return;
            }
            
            await this.calculateFrictionFactor(roughness, diameter, reynolds, method);
        });

        // Hydraulic diameter form submit handler
        document.getElementById('hydraulic-diameter-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const shape = document.getElementById('hydraulic-shape').value;
            if (!shape) {
                UI.showError('Missing Data', 'Please select a shape');
                return;
            }
            
            const params = { shape };
            
            // Add shape-specific parameters
            const shapeParameters = document.querySelectorAll('#shape-parameters input');
            let missingParams = false;
            
            shapeParameters.forEach(input => {
                if (!input.value) {
                    missingParams = true;
                    return;
                }
                params[input.name] = parseFloat(input.value);
            });
            
            if (missingParams) {
                UI.showError('Missing Data', 'Please fill all parameters for the selected shape');
                return;
            }
            
            await this.calculateHydraulicDiameter(params);
        });

        // Hydraulic shape select change handler
        $('#hydraulic-shape').on('change', (e) => {
            this.updateShapeParameters(e.target.value);
        });
        
        // Roughness type radio button change handler
        document.querySelectorAll('input[name="roughness-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleRoughnessInput(e.target.value);
            });
        });
        
        // Diameter type radio button change handler
        document.querySelectorAll('input[name="diameter-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleDiameterInput(e.target.value);
            });
        });
        
        // Schedule change handler for loading diameters
        $('#flow-schedule-select').on('change', async (e) => {
            await this.loadDiameters(e.target.value);
        });
    },

    /**
     * Toggle between custom roughness input and composition selection
     * @param {string} type - Type of roughness input ('custom' or 'composition')
     */
    toggleRoughnessInput(type) {
        const customRoughnessContainer = document.getElementById('custom-roughness-container');
        const compositionContainer = document.getElementById('flow-composition-container');
        
        if (type === 'custom') {
            customRoughnessContainer.classList.remove('hidden');
            compositionContainer.classList.add('hidden');
        } else {
            customRoughnessContainer.classList.add('hidden');
            compositionContainer.classList.remove('hidden');
        }
    },
    
    /**
     * Toggle between custom diameter input and schedule/diameter selection
     * @param {string} type - Type of diameter input ('custom' or 'schedule')
     */
    toggleDiameterInput(type) {
        const customDiameterContainer = document.getElementById('custom-diameter-container');
        const scheduleDiameterContainer = document.getElementById('flow-schedule-diameter-container');
        
        if (type === 'custom') {
            customDiameterContainer.classList.remove('hidden');
            scheduleDiameterContainer.classList.add('hidden');
        } else {
            customDiameterContainer.classList.add('hidden');
            scheduleDiameterContainer.classList.remove('hidden');
        }
    },

    /**
     * Load friction factor methods from the API
     */
    async loadFrictionFactorMethods() {
        try {
            UI.showLoading('#friction-factor-method');
            
            const methods = await API.getFrictionFactorMethods();
            const select = document.getElementById('friction-factor-method');
            
            select.innerHTML = '<option value="">Select a method</option>';
            
            methods.forEach(method => {
                const option = document.createElement('option');
                option.value = method;
                option.textContent = method;
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading friction factor methods', error);
        } finally {
            UI.hideLoading('#friction-factor-method');
        }
    },

    /**
     * Load compositions from the API
     */
    async loadCompositions() {
        try {
            UI.showLoading('#flow-composition-select');
            
            const compositions = await API.getCompositions();
            const select = document.getElementById('flow-composition-select');
            
            select.innerHTML = '<option value="">Select a composition</option>';
            
            compositions.forEach(composition => {
                const option = document.createElement('option');
                option.value = composition;
                option.textContent = composition;
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading compositions', error);
        } finally {
            UI.hideLoading('#flow-composition-select');
        }
    },
    
    /**
     * Load schedules from the API
     */
    async loadSchedules() {
        try {
            UI.showLoading('#flow-schedule-select');
            
            const schedules = await API.getSchedules();
            const select = document.getElementById('flow-schedule-select');
            
            select.innerHTML = '<option value="">Select a schedule</option>';
            
            // Check if schedules is an array or object and handle accordingly
            if (schedules) {
                if (Array.isArray(schedules)) {
                    schedules.forEach(schedule => {
                        const option = document.createElement('option');
                        option.value = typeof schedule === 'object' ? schedule.name : schedule;
                        option.textContent = typeof schedule === 'object' ? schedule.name : schedule;
                        select.appendChild(option);
                    });
                } else if (typeof schedules === 'object') {
                    Object.keys(schedules).forEach(scheduleName => {
                        const option = document.createElement('option');
                        option.value = scheduleName;
                        option.textContent = scheduleName;
                        select.appendChild(option);
                    });
                }
            }
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading schedules', error);
        } finally {
            UI.hideLoading('#flow-schedule-select');
        }
    },
    
    /**
     * Load diameters for a specific schedule from the API
     * @param {string} schedule - Selected schedule
     */
    async loadDiameters(schedule) {
        if (!schedule) return;
        
        try {
            UI.showLoading('#flow-diameter-select');
            
            const diameters = await API.getScheduleDiameters(schedule);
            const select = document.getElementById('flow-diameter-select');
            
            select.innerHTML = '<option value="">Select a diameter</option>';
            
            // Check if diameters is an array or object and handle accordingly
            if (diameters) {
                if (Array.isArray(diameters)) {
                    diameters.forEach(diameter => {
                        const option = document.createElement('option');
                        option.value = diameter.nominal_diameter;
                        option.textContent = `${diameter.nominal_diameter} mm`;
                        select.appendChild(option);
                    });
                } else if (typeof diameters === 'object') {
                    Object.values(diameters).forEach(diameter => {
                        const option = document.createElement('option');
                        option.value = diameter.nominal_diameter;
                        option.textContent = `${diameter.nominal_diameter} mm`;
                        select.appendChild(option);
                    });
                }
            }
            
            // Enable the select
            select.disabled = false;
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading diameters', error);
        } finally {
            UI.hideLoading('#flow-diameter-select');
        }
    },

    /**
     * Load hydraulic diameter shapes from the API
     */
    async loadHydraulicDiameterShapes() {
        try {
            UI.showLoading('#hydraulic-shape');
            
            const shapes = await API.getHydraulicDiameterShapes();
            const select = document.getElementById('hydraulic-shape');
            
            select.innerHTML = '<option value="">Select a shape</option>';
            
            shapes.forEach(shape => {
                const option = document.createElement('option');
                option.value = shape;
                option.textContent = shape.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading hydraulic diameter shapes', error);
        } finally {
            UI.hideLoading('#hydraulic-shape');
        }
    },

    /**
     * Update shape parameters based on selected shape
     * @param {string} shape - Selected shape
     */
    updateShapeParameters(shape) {
        const container = document.getElementById('shape-parameters');
        container.innerHTML = '';
        
        if (!shape) return;
        
        switch (shape) {
            case 'circular':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Diameter (mm)</label>
                        <input type="number" step="0.0000000001" name="diameter" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for circular shape</p>
                    </div>
                `;
                break;
                
            case 'rectangular':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Width (mm)</label>
                        <input type="number" step="0.0000000001" name="width" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for rectangular shape</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Height (mm)</label>
                        <input type="number" step="0.0000000001" name="height" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for rectangular shape</p>
                    </div>
                `;
                break;
                
            case 'annular':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Outer Diameter (mm)</label>
                        <input type="number" step="0.0000000001" name="outer_diameter" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for annular shape (must be larger than inner diameter)</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Inner Diameter (mm)</label>
                        <input type="number" step="0.0000000001" name="inner_diameter" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for annular shape (must be smaller than outer diameter)</p>
                    </div>
                `;
                break;
                
            case 'triangular':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Side A (mm)</label>
                        <input type="number" step="0.0000000001" name="side_a" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for triangular shape</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Side B (mm)</label>
                        <input type="number" step="0.0000000001" name="side_b" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for triangular shape</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Side C (mm)</label>
                        <input type="number" step="0.0000000001" name="side_c" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for triangular shape (must satisfy triangle inequality)</p>
                    </div>
                `;
                break;
                
            case 'circularCap':
                container.innerHTML = `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Diameter (mm)</label>
                        <input type="number" step="0.0000000001" name="diameter" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for circular cap shape</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Height (mm)</label>
                        <input type="number" step="0.0000000001" name="height" class="w-full p-2 border rounded" required min="0">
                        <p class="text-xs text-gray-500 mt-1">Required for circular cap shape</p>
                    </div>
                `;
                break;
        }
    },

    /**
     * Calculate Reynolds number
     * @param {Object} params - Parameters for Reynolds calculation
     */
    async calculateReynolds(params) {
        try {
            UI.showLoading('#reynolds-form');
            UI.hideResult('#reynolds-result');
            
            const result = await API.calculateReynolds(params);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Reynolds Number</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#reynolds-result', html);
            
            // Optionally update the reynolds input in the friction factor form
            if (result.value) {
                document.getElementById('reynolds-number').value = result.value.toFixed(2);
            }
        } catch (error) {
            UI.showError('Error calculating Reynolds number', error);
        } finally {
            UI.hideLoading('#reynolds-form');
        }
    },

    /**
     * Calculate friction factor
     * @param {number} roughness - Roughness in mm
     * @param {number} diameter - Diameter in mm
     * @param {number} reynolds - Reynolds number
     * @param {string} method - Method for calculation
     */
    async calculateFrictionFactor(roughness, diameter, reynolds, method) {
        try {
            UI.showLoading('#friction-factor-form');
            UI.hideResult('#friction-factor-result');
            
            const result = await API.calculateFrictionFactor(roughness, diameter, reynolds, method);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Friction Factor</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#friction-factor-result', html);
            
            // Optionally update the friction factor input in the headloss form
            if (result.friction_factor && result.friction_factor.value) {
                const headlossFrictionInput = document.getElementById('headloss-friction-factor');
                if (headlossFrictionInput) {
                    headlossFrictionInput.value = result.friction_factor.value;
                }
            }
        } catch (error) {
            UI.showError('Error calculating friction factor', error);
        } finally {
            UI.hideLoading('#friction-factor-form');
        }
    },

    /**
     * Calculate hydraulic diameter
     * @param {Object} params - Parameters for hydraulic diameter calculation
     */
    async calculateHydraulicDiameter(params) {
        try {
            UI.showLoading('#hydraulic-diameter-form');
            UI.hideResult('#hydraulic-diameter-result');
            
            // Additional frontend validation
            if (params.shape === 'annular') {
                const outerDiameter = parseFloat(params.outer_diameter);
                const innerDiameter = parseFloat(params.inner_diameter);
                
                if (innerDiameter >= outerDiameter) {
                    UI.showError('Validation Error', 'Inner diameter must be smaller than outer diameter');
                    return;
                }
            }
            
            if (params.shape === 'triangular') {
                const sideA = parseFloat(params.side_a);
                const sideB = parseFloat(params.side_b);
                const sideC = parseFloat(params.side_c);
                
                // Check triangle inequality
                if (sideA + sideB <= sideC || sideA + sideC <= sideB || sideB + sideC <= sideA) {
                    UI.showError('Validation Error', 'The sides do not form a valid triangle (must satisfy triangle inequality)');
                    return;
                }
            }

            if (params.shape === 'circular cap') {
                const diameter = parseFloat(params.diameter);
                const height = parseFloat(params.height);
                
                if (height > diameter) {
                    UI.showError('Validation Error', 'Height cannot be greater than diameter');
                    return;
                }
            }
            
            const result = await API.calculateHydraulicDiameter(params);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Hydraulic Diameter</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#hydraulic-diameter-result', html);
        } catch (error) {
            UI.showError('Error calculating hydraulic diameter', error);
        } finally {
            UI.hideLoading('#hydraulic-diameter-form');
        }
    }
};

// Export the Flow module
window.FlowModule = FlowModule; 