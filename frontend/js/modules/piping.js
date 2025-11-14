/**
 * Piping Module for Chemical Engineering Calculator
 * Handles piping-related functionality
 */

const PipingModule = {
    /**
     * Initialize the Piping module
     */
    init() {
        this.loadCompositions();
        this.loadSchedules();
        this.loadFittings();
        this.setupEventListeners();
    },

    /**
     * Set up event listeners for the Piping module
     */
    setupEventListeners() {
        // Composition select change handler
        $('#composition-select').on('change', (e) => {
            const selectedComposition = $(e.target).val();
            if (selectedComposition) {
                this.loadCompositionDetails(selectedComposition);
            } else {
                document.getElementById('composition-details').innerHTML = '';
            }
        });

        // Schedule select change handler
        $('#schedule-select').on('change', (e) => {
            const selectedSchedule = e.target.value;
            if (selectedSchedule) {
                this.loadScheduleDiameters(selectedSchedule);
            } else {
                const diameterSelect = document.getElementById('diameter-select');
                diameterSelect.innerHTML = '';
                diameterSelect.disabled = true;
                document.getElementById('diameter-details').innerHTML = '';
            }
        });

        // Diameter select change handler
        $('#diameter-select').on('change', (e) => {
            const selectedDiameter = e.target.value;
            const selectedSchedule = document.getElementById('schedule-select').value;
            
            if (selectedDiameter && selectedSchedule) {
                this.loadDiameterDetails(selectedSchedule, selectedDiameter);
            } else {
                document.getElementById('diameter-details').innerHTML = '';
            }
        });

        // Fitting select change handler
        $('#fitting-select').on('change', (e) => {
            const selectedFitting = e.target.value;
            if (selectedFitting) {
                this.loadFittingDetails(selectedFitting);
            } else {
                document.getElementById('fitting-details').innerHTML = '';
            }
        });
    },

    /**
     * Load compositions from the API
     */
    async loadCompositions() {
        try {
            UI.showLoading('#composition-select');
            
            const compositions = await API.getCompositions();
            const select = document.getElementById('composition-select');
            
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
            UI.hideLoading('#composition-select');
        }
    },

    /**
     * Load composition details from the API
     * @param {string} compositionName - Name of the composition to load
     */
    async loadCompositionDetails(compositionName) {
        try {
            UI.showLoading('#composition-details');
            
            const details = await API.getCompositionDetails(compositionName);
            const detailsContainer = document.getElementById('composition-details');
            
            // Generate HTML for composition details
            let html = '<h4 class="font-medium text-gray-700 mb-2">Composition Details</h4>';
            html += UI.generatePropertyTable(details);
            
            detailsContainer.innerHTML = html;
        } catch (error) {
            UI.showError('Error loading composition details', error);
            document.getElementById('composition-details').innerHTML = '';
        } finally {
            UI.hideLoading('#composition-details');
        }
    },

    /**
     * Load schedules from the API
     */
    async loadSchedules() {
        try {
            UI.showLoading('#schedule-select');
            
            const schedules = await API.getSchedules();
            const select = document.getElementById('schedule-select');
            
            select.innerHTML = '<option value="">Select a schedule</option>';
            
            schedules.forEach(schedule => {
                const option = document.createElement('option');
                option.value = schedule.name;
                option.textContent = schedule.name;
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading schedules', error);
        } finally {
            UI.hideLoading('#schedule-select');
        }
    },

    /**
     * Load schedule diameters from the API
     * @param {string} schedule - Name of the schedule to load diameters for
     */
    async loadScheduleDiameters(schedule_name) {
        try {
            UI.showLoading('#diameter-select');
            
            const diameters = await API.getScheduleDiameters(schedule_name);

            const select = document.getElementById('diameter-select');
            
            select.innerHTML = '<option value="">Select a diameter</option>';
            
            // Handle diameters as an object instead of an array
            if (diameters && typeof diameters === 'object') {
                Object.values(diameters).forEach(diameter => {
                    const option = document.createElement('option');
                    option.value = diameter.nominal_diameter;
                    option.textContent = `${diameter.nominal_diameter} ${diameter.units}`;
                    select.appendChild(option);
                });
            }
            
            select.disabled = false;
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading diameters', error);
        } finally {
            UI.hideLoading('#diameter-select');
        }
    },

    /**
     * Load diameter details from the API
     * @param {string} schedule - Name of the schedule
     * @param {number} diameter - Diameter value
     */
    async loadDiameterDetails(schedule, diameter) {
        try {
            UI.showLoading('#diameter-details');
            
            const details = await API.getScheduleDiameterDetails(schedule, diameter);
            const detailsContainer = document.getElementById('diameter-details');
            
            // Generate HTML for diameter details
            let html = '<h4 class="font-medium text-gray-700 mb-2">Diameter Details</h4>';
            html += UI.generatePropertyTable(details);
            
            detailsContainer.innerHTML = html;
        } catch (error) {
            UI.showError('Error loading diameter details', error);
            document.getElementById('diameter-details').innerHTML = '';
        } finally {
            UI.hideLoading('#diameter-details');
        }
    },

    /**
     * Load fittings from the API
     */
    async loadFittings() {
        try {
            UI.showLoading('#fitting-select');
            
            const fittings = await API.getFittings();
            const select = document.getElementById('fitting-select');
            
            select.innerHTML = '<option value="">Select a fitting</option>';
            
            fittings.forEach(fitting => {
                const option = document.createElement('option');
                option.value = fitting;
                option.textContent = fitting;
                select.appendChild(option);
            });
            
            // Refresh Select2
            $(select).trigger('change');
        } catch (error) {
            UI.showError('Error loading fittings', error);
        } finally {
            UI.hideLoading('#fitting-select');
        }
    },

    /**
     * Load fitting details from the API
     * @param {string} fittingName - Name of the fitting to load
     */
    async loadFittingDetails(fittingName) {
        try {
            UI.showLoading('#fitting-details');
            
            const details = await API.getFittingDetails(fittingName);
            const detailsContainer = document.getElementById('fitting-details');
            
            // Generate HTML for fitting details
            let html = '<h4 class="font-medium text-gray-700 mb-2">Fitting Details</h4>';
            html += UI.generatePropertyTable(details);
            
            detailsContainer.innerHTML = html;
        } catch (error) {
            UI.showError('Error loading fitting details', error);
            document.getElementById('fitting-details').innerHTML = '';
        } finally {
            UI.hideLoading('#fitting-details');
        }
    }
};

// Export the Piping module
window.PipingModule = PipingModule; 