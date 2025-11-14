/**
 * API Module for Chemical Engineering Calculator
 * Handles all API calls to the backend
 */

const API = {
    // Base URL for the API
    baseUrl: 'http://localhost:5000',

    /**
     * Generic API call function
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method (GET, POST)
     * @param {Object} data - Data to send (for POST requests)
     * @returns {Promise} - Promise with API response
     */
    async call(endpoint, method = 'GET', data = null) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            if (data && method === 'POST') {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'API request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // ---------------------------------------------------------------------------
    // Piping Endpoints
    // ---------------------------------------------------------------------------
    
    async getCompositions() {
        return this.call('/piping/compositions');
    },

    async getCompositionDetails(name) {
        return this.call(`/piping/composition/${name}`);
    },

    async getSchedules() {
        return this.call('/piping/schedules');
    },

    async getScheduleDiameters(schedule) {
        return this.call(`/piping/schedule/${schedule}/diameters`);
    },

    async getScheduleDiameterDetails(schedule, diameter) {
        return this.call(`/piping/schedule/${schedule}/diameter/${diameter}`);
    },

    async getFittings() {
        return this.call('/piping/fittings');
    },

    async getFittingDetails(name) {
        return this.call(`/piping/fitting/${name}`);
    },

    // ---------------------------------------------------------------------------
    // Sizing Endpoints
    // ---------------------------------------------------------------------------
    
    async calculateDiameter(flowRate, velocity) {
        return this.call('/sizing/calculated-diameter', 'POST', {
            flow_rate: parseFloat(flowRate),
            velocity: parseFloat(velocity)
        });
    },

    async getRealDiameter(calculatedDiameter, schedule) {
        return this.call('/sizing/real-diameter', 'POST', {
            calculated_diameter: parseFloat(calculatedDiameter),
            schedule
        });
    },

    // ---------------------------------------------------------------------------
    // Flow Endpoints
    // ---------------------------------------------------------------------------
    
    async calculateReynolds(params) {
        return this.call('/flow/reynolds', 'POST', params);
    },

    async getFrictionFactorMethods() {
        return this.call('/flow/friction-factor/methods');
    },

    async calculateFrictionFactor(roughness, diameter, reynolds, method) {
        return this.call('/flow/friction-factor', 'POST', {
            roughness: parseFloat(roughness),
            diameter: parseFloat(diameter),
            reynolds: parseFloat(reynolds),
            method
        });
    },

    async getHydraulicDiameterShapes() {
        return this.call('/flow/hydraulic-diameter/shapes');
    },

    async calculateHydraulicDiameter(params) {
        return this.call('/flow/hydraulic-diameter', 'POST', params);
    },

    // ---------------------------------------------------------------------------
    // Pump Endpoints
    // ---------------------------------------------------------------------------
    
    async getHeadlossMethods() {
        return this.call('/pump/headloss/methods');
    },

    async calculateHeadloss(params) {
        return this.call('/pump/headloss', 'POST', params);
    },

    async calculateNPSHAvailable(params) {
        return this.call('/pump/npsh-available', 'POST', params);
    },

    async calculateHead(params) {
        return this.call('/pump/head', 'POST', params);
    },

    // ---------------------------------------------------------------------------
    // Reactor Endpoints
    // ---------------------------------------------------------------------------
    
    async getCSTRCalculationTypes() {
        return this.call('/reactor/cstr/calculation-types');
    },

    async calculateCSTR(params) {
        return this.call('/reactor/cstr', 'POST', params);
    },

    async getPFRCalculationTypes() {
        return this.call('/reactor/pfr/calculation-types');
    },

    async calculatePFR(params) {
        return this.call('/reactor/pfr', 'POST', params);
    },

    async plotConversionVsVolume(params) {
        return this.call('/reactor/plot-conversion-vs-volume', 'POST', params);
    },

    async calculateLimitingReagent(params) {
        return this.call('/reactor/limiting-reagent', 'POST', params);
    },

    // ---------------------------------------------------------------------------
    // Components Endpoints
    // ---------------------------------------------------------------------------
    
    async listComponents() {
        return this.call('/components/list');
    },

    async getPropertyNames() {
        try {
            const response = await this.call('/components/property-names');
            return response;
        } catch (error) {
            console.error('Error getting property names:', error);
            throw error;
        }
    },

    async getPropertyMixtureNames() {
        try {
            const response = await this.call('/components/property-mixture-names');
            return response;
        } catch (error) {
            console.error('Error getting property mixture names:', error);
            throw error;
        }
    },

    async getCriticalProperties(fluid) {
        return this.call('/components/critical-properties', 'POST', {
            fluid
        });
    },

    async getProperty(fluid, propertyName, temperature, pressure) {
        return this.call('/components/property', 'POST', {
            fluid,
            property_name: propertyName,
            temperature: parseFloat(temperature),
            pressure: parseFloat(pressure)
        });
    },

    async getMixtureProperties(fluidFractions, temperature, pressure, properties = null) {
        return this.call('/components/mixture-properties', 'POST', {
            fluid_fractions: fluidFractions,
            temperature: parseFloat(temperature),
            pressure: parseFloat(pressure),
            properties
        });
    },

    // ---------------------------------------------------------------------------
    // Mass Balance Endpoints
    // ---------------------------------------------------------------------------
    
    async getMassBalanceExample() {
        return this.call('/mass-balance/example');
    },
    
    async calculateMassBalance(params) {
        return this.call('/mass-balance/calculate', 'POST', params);
    },
    
    async calculateYields(params) {
        return this.call('/mass-balance/yields', 'POST', params);
    },
    
    async plotMassBalance(params) {
        return this.call('/mass-balance/plot', 'POST', params);
    }
};

// Export the API module
window.API = API; 