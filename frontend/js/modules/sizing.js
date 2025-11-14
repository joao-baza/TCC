/**
 * Sizing Module for Chemical Engineering Calculator
 * Handles pipe sizing calculations
 */

const SizingModule = {
    /**
     * Initialize the Sizing module
     */
    init() {
        this.loadSchedulesForRealDiameter();
        this.setupEventListeners();
    },

    /**
     * Set up event listeners for the Sizing module
     */
    setupEventListeners() {
        // Calculated diameter form submit handler
        document.getElementById('calculated-diameter-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const flowRate = document.getElementById('flow-rate').value;
            const velocity = document.getElementById('velocity').value;
            
            if (!flowRate || !velocity) {
                UI.showError('Missing Data', 'Please enter flow rate and velocity');
                return;
            }
            
            await this.calculateDiameter(flowRate, velocity);
        });

        // Real diameter form submit handler
        document.getElementById('real-diameter-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const calculatedDiameter = document.getElementById('calculated-diameter').value;
            const schedule = document.getElementById('real-diameter-schedule').value;
            
            if (!calculatedDiameter || !schedule) {
                UI.showError('Missing Data', 'Please enter calculated diameter and select a schedule');
                return;
            }
            
            await this.getRealDiameter(calculatedDiameter, schedule);
        });
    },

    /**
     * Calculate diameter based on flow rate and velocity
     * @param {number} flowRate - Flow rate in m³/s
     * @param {number} velocity - Velocity in m/s
     */
    async calculateDiameter(flowRate, velocity) {
        try {
            UI.showLoading('#calculated-diameter-form');
            UI.hideResult('#calculated-diameter-result');
            
            const result = await API.calculateDiameter(flowRate, velocity);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Calculated Diameter</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#calculated-diameter-result', html);
            
            // Update the calculated diameter input in the Real Diameter form
            if (result && result.value) {
                // Get the diameter value, ensuring we handle both object format and direct value
                let diameterValue = typeof result.value === 'object' ? 
                    (result.value.value || result.value) : 
                    result.value;
                
                // Round to 2 decimal places
                diameterValue = Number(diameterValue).toFixed(2);
                
                // Update the input field
                document.getElementById('calculated-diameter').value = diameterValue;
            }
        } catch (error) {
            UI.showError('Error calculating diameter', error);
        } finally {
            UI.hideLoading('#calculated-diameter-form');
        }
    },

    /**
     * Load schedules for the real diameter selection
     */
    async loadSchedulesForRealDiameter() {
        try {
            UI.showLoading('#real-diameter-schedule');
            
            const schedules = await API.getSchedules();
            const select = document.getElementById('real-diameter-schedule');
            
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
            UI.hideLoading('#real-diameter-schedule');
        }
    },

    /**
     * Get real diameter based on calculated diameter and schedule
     * @param {number} calculatedDiameter - Calculated diameter in mm
     * @param {string} schedule - Pipe schedule
     */
    async getRealDiameter(calculatedDiameter, schedule) {
        try {
            UI.showLoading('#real-diameter-form');
            UI.hideResult('#real-diameter-result');
            
            const result = await API.getRealDiameter(calculatedDiameter, schedule);
            
            // Display the result
            let html = '<h4 class="font-medium text-gray-700 mb-2">Real Diameter</h4>';
            html += UI.generatePropertyTable(result);
            
            UI.showResult('#real-diameter-result', html);
        } catch (error) {
            UI.showError('Error getting real diameter', error);
        } finally {
            UI.hideLoading('#real-diameter-form');
        }
    }
};

// Export the Sizing module
window.SizingModule = SizingModule; 