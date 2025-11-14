/**
 * Pump Module for Chemical Engineering Calculator
 * Handles pump-related calculations
 */

const PumpModule = {
    /**
     * Initialize the Pump module
     */
    init() {
        this.loadHeadlossMethods();
        this.loadFittingsOptions();
        this.loadCompositionOptions();
        this.setupEventListeners();
    },

    /**
     * Set up event listeners for the Pump module
     */
    setupEventListeners() {
        // Headloss method change handler
        $('#headloss-method').on('change', (e) => {
            const selectedMethod = e.target.value;
            
            // Show/hide method-specific fields
            const darcyFields = document.querySelector('.darcy-fields');
            const hazenFields = document.querySelector('.hazen-fields');
            
            if (selectedMethod === 'Darcy-Weisbach') {
                darcyFields.classList.remove('hidden');
                hazenFields.classList.add('hidden');
            } else if (selectedMethod === 'Hazen-Williams') {
                darcyFields.classList.add('hidden');
                hazenFields.classList.remove('hidden');
            } else {
                darcyFields.classList.add('hidden');
                hazenFields.classList.add('hidden');
            }
        });

        // Roughness coefficient type radio buttons change handler
        $('input[name="roughness-coef-type"]').on('change', (e) => {
            const selectedType = e.target.value;
            const materialContainer = document.getElementById('material-roughness-container');
            const customContainer = document.getElementById('custom-roughness-coef-container');
            
            if (selectedType === 'material') {
                materialContainer.classList.remove('hidden');
                customContainer.classList.add('hidden');
            } else {
                materialContainer.classList.add('hidden');
                customContainer.classList.remove('hidden');
            }
        });

        // Material composition select change handler
        $('#material-composition-select').on('change', async (e) => {
            const selectedMaterial = e.target.value;
            if (selectedMaterial) {
                try {
                    const materialDetails = await API.getCompositionDetails(selectedMaterial);
                    if (materialDetails && materialDetails.specifications.roughness_coefficient) {
                        // Store the roughness coefficient for later use in form submission
                        if (materialDetails.specifications.roughness_coefficient.value) {
                            this.selectedMaterialRoughnessCoefficient = materialDetails.specifications.roughness_coefficient.value;
                        }else{
                            UI.showError('Missing Data', 'No roughness coefficient found for this material');
                            return;
                        }
                    }else{
                        UI.showError('Missing Data', 'No roughness coefficient found for this material');
                        return;
                    }
                } catch (error) {
                    console.error('Error loading material details:', error);
                }
            }
        });

        // Add fitting button handler
        document.getElementById('add-fitting').addEventListener('click', async () => {
            const fittings = await API.getFittings();
            UI.addFittingRow(fittings);
        });

        // Headloss form submit handler
        document.getElementById('headloss-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const method = document.getElementById('headloss-method').value;
            const pipeLength = document.getElementById('pipe-length').value;
            const diameter = document.getElementById('headloss-diameter').value;
            
            if (!method || !pipeLength || !diameter) {
                UI.showError('Missing Data', 'Please enter pipe length, diameter, and select a method');
                return;
            }
            
            const params = {
                pipe_length: parseFloat(pipeLength),
                diameter: parseFloat(diameter),
                method: method
            };
            
            // Add method-specific parameters
            if (method === 'Darcy-Weisbach') {
                const frictionFactor = document.getElementById('headloss-friction-factor').value;
                const velocity = document.getElementById('headloss-velocity').value;
                
                if (!frictionFactor || !velocity) {
                    UI.showError('Missing Data', 'For Darcy-Weisbach, please enter friction factor and velocity');
                    return;
                }
                
                params.friction_factor = parseFloat(frictionFactor);
                params.velocity = parseFloat(velocity);

            } else if (method === 'Hazen-Williams') {
                const flowRate = document.getElementById('headloss-flow-rate').value;
                let roughnessCoefficient;
                
                const roughnessType = document.querySelector('input[name="roughness-coef-type"]:checked').value;
                
                if (roughnessType === 'material') {
                    if (!this.selectedMaterialRoughnessCoefficient) {
                        UI.showError('Missing Data', 'Please select a material');
                        return;
                    }
                    roughnessCoefficient = this.selectedMaterialRoughnessCoefficient;
                } else {
                    roughnessCoefficient = document.getElementById('roughness-coefficient').value;
                    if (!roughnessCoefficient) {
                        UI.showError('Missing Data', 'Please enter a roughness coefficient');
                        return;
                    }
                    roughnessCoefficient = parseFloat(roughnessCoefficient);
                }
                
                if (!flowRate) {
                    UI.showError('Missing Data', 'For Hazen-Williams, please enter flow rate');
                    return;
                }
                
                params.flow_rate = parseFloat(flowRate);
                params.roughness_coefficient = roughnessCoefficient;
            }
            
            // Add fittings if any
            const fittings = UI.collectFittings();
            if (fittings.length > 0) {
                params.fittings = fittings;
            }
            
            await this.calculateHeadloss(params);
        });

        // NPSH form submit handler
        document.getElementById('npsh-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const manometricPressure = document.getElementById('manometric-pressure').value;
            const atmosphericPressure = document.getElementById('atmospheric-pressure').value;
            const vaporPressure = document.getElementById('vapor-pressure').value;
            const specificMass = document.getElementById('specific-mass').value;
            const frictionFactor = document.getElementById('npsh-friction-factor').value;
            const pumpInletVelocity = document.getElementById('pump-inlet-velocity').value;
            const gaugeElevation = document.getElementById('gauge-elevation').value;
            
            if (!manometricPressure || !atmosphericPressure || !vaporPressure || !specificMass || !frictionFactor || !pumpInletVelocity) {
                UI.showError('Missing Data', 'Please fill all required fields');
                return;
            }
            
            const params = {
                manometric_pressure: parseFloat(manometricPressure),
                atmospheric_pressure: parseFloat(atmosphericPressure),
                vapor_pressure: parseFloat(vaporPressure),
                specific_mass: parseFloat(specificMass),
                friction_factor: parseFloat(frictionFactor),
                pump_inlet_velocity: parseFloat(pumpInletVelocity)
            };
            
            if (gaugeElevation) {
                params.gauge_elevation = parseFloat(gaugeElevation);
            }
            
            await this.calculateNPSHAvailable(params);
        });

        // Head form submit handler
        document.getElementById('head-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const pressure1 = document.getElementById('pressure1').value;
            const pressure2 = document.getElementById('pressure2').value;
            const elevation1 = document.getElementById('elevation1').value;
            const elevation2 = document.getElementById('elevation2').value;
            const velocity1 = document.getElementById('velocity1').value;
            const velocity2 = document.getElementById('velocity2').value;
            const specificMass = document.getElementById('head-specific-mass').value;
            const frictionFactor = document.getElementById('head-friction-factor').value;
            
            if (!pressure1 || !pressure2 || !elevation1 || !elevation2 || !velocity1 || !velocity2 || !specificMass || !frictionFactor) {
                UI.showError('Missing Data', 'Please fill all required fields');
                return;
            }
            
            const params = {
                pressure1: parseFloat(pressure1),
                pressure2: parseFloat(pressure2),
                elevation1: parseFloat(elevation1),
                elevation2: parseFloat(elevation2),
                velocity1: parseFloat(velocity1),
                velocity2: parseFloat(velocity2),
                specific_mass: parseFloat(specificMass),
                friction_factor: parseFloat(frictionFactor)
            };
            
            await this.calculateHead(params);
        });
    },

    /**
     * Load headloss methods from the API
     */
    async loadHeadlossMethods() {
        try {
            UI.showLoading('#headloss-method');
            
            const methods = await API.getHeadlossMethods();
            const select = document.getElementById('headloss-method');
            
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
            UI.showError('Error loading headloss methods', error);
        } finally {
            UI.hideLoading('#headloss-method');
        }
    },

    /**
     * Load material compositions for the roughness coefficient
     */
    async loadCompositionOptions() {
        try {
            UI.showLoading('#material-composition-select');
            
            const compositions = await API.getCompositions();
            const select = document.getElementById('material-composition-select');
            
            select.innerHTML = '<option value="">Select a material</option>';
            
            compositions.forEach(composition => {
                const option = document.createElement('option');
                option.value = composition;
                option.textContent = composition;
                select.appendChild(option);
            });
            
            // Initialize Select2
            $('#material-composition-select').select2({
                placeholder: "Select a material",
                allowClear: true
            });
        } catch (error) {
            console.error('Error loading compositions:', error);
        } finally {
            UI.hideLoading('#material-composition-select');
        }
    },

    /**
     * Load available fittings for the headloss calculation
     */
    async loadFittingsOptions() {
        try {
            // We'll use this later for the "Add Fitting" button
            this.fittingsOptions = await API.getFittings();
        } catch (error) {
            console.error('Error loading fittings options:', error);
        }
    },

    /**
     * Calculate headloss
     * @param {Object} params - Parameters for headloss calculation
     */
    async calculateHeadloss(params) {
        try {
            UI.showLoading('#headloss-form');
            UI.hideResult('#headloss-result');
            
            const result = await API.calculateHeadloss(params);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Head Loss</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#headloss-result', html);
            
            // Optionally update the friction factor input in the head form
            if (result.head_loss && result.head_loss.value) {
                const headFrictionInput = document.getElementById('head-friction-factor');
                if (headFrictionInput) {
                    headFrictionInput.value = result.head_loss.value;
                }
            }
        } catch (error) {
            UI.showError('Error calculating head loss', error);
        } finally {
            UI.hideLoading('#headloss-form');
        }
    },

    /**
     * Calculate NPSH available
     * @param {Object} params - Parameters for NPSH calculation
     */
    async calculateNPSHAvailable(params) {
        try {
            UI.showLoading('#npsh-form');
            UI.hideResult('#npsh-result');
            
            const result = await API.calculateNPSHAvailable(params);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">NPSH Available</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#npsh-result', html);
        } catch (error) {
            UI.showError('Error calculating NPSH available', error);
        } finally {
            UI.hideLoading('#npsh-form');
        }
    },

    /**
     * Calculate head
     * @param {Object} params - Parameters for head calculation
     */
    async calculateHead(params) {
        try {
            UI.showLoading('#head-form');
            UI.hideResult('#head-result');
            
            const result = await API.calculateHead(params);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Head</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#head-result', html);
        } catch (error) {
            UI.showError('Error calculating head', error);
        } finally {
            UI.hideLoading('#head-form');
        }
    }
};

// Export the Pump module
window.PumpModule = PumpModule; 