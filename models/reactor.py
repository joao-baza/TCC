from scipy.optimize import root_scalar

from typing import Dict

import matplotlib.pyplot as plt

import numpy as np

from scipy.integrate import quad

from pint import UnitRegistry

from base_validator import BaseValidator

class ReactorIsothermalHeterogeneous(BaseValidator):
    """Reactor utility class"""

    # ------------------------------------------------------------------ #
    #                               INIT                                 #
    # ------------------------------------------------------------------ #
    def __init__(self) -> None:
        self.ureg = UnitRegistry()

    # ------------------------------------------------------------------ #
    #                         PRIVATE HELPERS                            #
    # ------------------------------------------------------------------ #
    def _calculate_dilution_factor(self, components, stoichiometric_coefficients, limiting, X):
        """Calculate the dilution factor based on the stoichiometric coefficients and conversion."""
        has_gas_phase = any(c["state"] == "gaseous" for c in components)
        
        if has_gas_phase:
            mols_prod = sum(coef for coef in stoichiometric_coefficients if coef > 0)
            mols_reag = sum(abs(coef) for coef in stoichiometric_coefficients if coef < 0)
            ε = (mols_prod - mols_reag) / abs(stoichiometric_coefficients[limiting]) * X
        else:
            ε = 0.0
        
        return ε
    
    def _calculate_concentration_and_rate(self, components, stoichiometric_coefficients, reaction_rate_params, 
                                        limiting, C0_i, C_lim0, X, dilution_factor):
        """Calculate the reactor concentrations and reaction rate for a given conversion."""
        outlet_concentrations = {}
        concentration_values = []
        for i in range(len(components)):
            if stoichiometric_coefficients[i] < 0:  # reactant
                if i == limiting:
                    # For the limiting reactant
                    Ci = C0_i[i] * (1 - X) / dilution_factor
                else:
                    # For other reactants
                    theta_i = C0_i[i]/C_lim0
                    stoichiometric_ratio = abs(stoichiometric_coefficients[i]) / abs(stoichiometric_coefficients[limiting])
                    X_i = X / stoichiometric_ratio
                    if X_i > 1:  # Cannot have more than 100% conversion
                        X_i = 1
                    Ci = C0_i[i] * (1 - X_i) / dilution_factor
            else: 
                if stoichiometric_coefficients[i] > 0:  # product
                    # For products
                    stoichiometric_ratio = stoichiometric_coefficients[i] / abs(stoichiometric_coefficients[limiting])
                    # Ensure C_lim0 is a single value, not a sequence
                    lim_conc = C_lim0 if isinstance(C_lim0, (int, float)) or hasattr(C_lim0, 'magnitude') else C_lim0[0]
                    Ci = (C0_i[i] + stoichiometric_ratio * lim_conc * X) / dilution_factor
                else:  # Inert (stoichiometric_coefficients[i] = 0)
                    # For inerts, just dilution
                    Ci = C0_i[i] / dilution_factor
            
            component_name = components[i]["component_name"]
            outlet_concentrations[component_name] = Ci
            concentration_values.append(Ci)
                
        # Calculate the reaction rate r = k ∏ C_i^{n_i}
        rate_expression = 1.0  # Initialize variable
        for i, n_i in enumerate(reaction_rate_params["reaction_orders"]):
            if n_i != 0:  # Only consider terms with non-zero order
                rate_expression *= concentration_values[i] ** n_i
        
        k_unit = self.ureg.Unit('mol/m³/s') / rate_expression.units
        k = reaction_rate_params["k"] * k_unit
        r = k * rate_expression
        
        return outlet_concentrations, k, r

    # ------------------------------------------------------------------ #
    #                         CSTR FUNCTIONS                              #
    # ------------------------------------------------------------------ #
    def _conversion_and_kinetics_in_cstr(self, parameters):
        """Calculates the volume of a CSTR based on conversion and kinetics."""
        self._require_keys(parameters, ["components", "reaction_rate_params", "conversion", "stoichiometric_coefficients", "operation_conditions"])
        self._validate_numeric(parameters, ["conversion"])
    
        components = parameters["components"]
        stoichiometric_coefficients = parameters["stoichiometric_coefficients"]
        reaction_rate_params = parameters["reaction_rate_params"]
        operation_conditions = parameters["operation_conditions"]
        X = parameters["conversion"] * self.ureg.dimensionless  # dimensionless
    
        last_component_state = components[0]["state"]
        for component in components:
            if last_component_state != component["state"]:
                last_component_state = component["state"]
                raise ValueError("Use only liquid or only gaseous components")
    
        limiting = self.determine_limiting_reagent(parameters)
    
        # Initialize variables
        F0_i = []
        Q_tot = 0 * self.ureg.m**3 / self.ureg.s  # initialize with zero, with unit
        
        # Calculate inlet molar flow rates and total volumetric flow rate
        for c in components:
            flow_rate = c["flow_rate_inlet"] * self.ureg.m**3 / self.ureg.s
            conc = (c["molar_concentration_inlet"] * self.ureg.mol / self.ureg.L).to(self.ureg.mol / self.ureg.m**3)
            F0_i.append(flow_rate * conc)  # mol/s for each component
            Q_tot += flow_rate
                
        F_A0 = F0_i[limiting]  # mol/s for the limiting reagent
        C0_i = [F0 / Q_tot for F0 in F0_i]  # concentrations after mixing (mol/m³)
        C_lim0 = C0_i[limiting]
        
        ε = self._calculate_dilution_factor(components, stoichiometric_coefficients, limiting, X) * F_A0 / sum(F0_i)
        
        # Operating conditions: temperature and pressure
        T0 = operation_conditions["initial_temperature"] * self.ureg.K
        P0 = operation_conditions["initial_pressure"] * self.ureg.Pa
        T = operation_conditions["final_temperature"] * self.ureg.K
        P = operation_conditions["final_pressure"] * self.ureg.Pa
        
        # Correction factor for operating conditions (pressure and temperature)
        var_operation_conditions = (P0*T/(P*T0)).magnitude  # Dimensionless
        
        # Combined factor: effect of volumetric variation and operating conditions
        dilution_factor = (1 + (ε * X)) * var_operation_conditions
        
        outlet_concentrations, k, r = self._calculate_concentration_and_rate(
            components, stoichiometric_coefficients, reaction_rate_params, 
            limiting, C0_i, C_lim0, X, dilution_factor
        )
        
        if any(C.magnitude < 0 for C in outlet_concentrations.values()):
            raise ValueError("Too high conversion — negative concentration calculated.")
        
        # Check if r has the correct units (mol/m³/s)
        if r.units != self.ureg.Unit('mol/m³/s'):
            raise ValueError(f"Incorrect unit for reaction rate: {r.units}. Expected: mol/m³/s")
        
        if r.magnitude == 0:
            raise ValueError("The reaction rate cannot be zero.")
    
        # Consumption rate of the limiting reagent
        rate_lim = abs(stoichiometric_coefficients[limiting]) * r  # mol/m³/s
        
        # Calculate the reactor volume using V/FA0 = X/r
        V = F_A0 * X / rate_lim  # m³
        
        residence_time = V / Q_tot
        
        # Return the volume with the unit in cubic meters
        return {
            "volume": V,
            "reaction_rate": r,
            "outlet_concentrations": outlet_concentrations,
            "dilution_factor": ε * self.ureg.dimensionless,
            "molar_rate_inlet_(limitant)": F_A0,
            "flow_rate_outlet": Q_tot,
            "residence_time": residence_time,
            "conversion": X,
            }

    def _volume_and_kinetics_in_cstr(self, parameters):
        """Calculates the conversion of a CSTR based on volume and kinetics."""
        self._require_keys(parameters, ["components", "reaction_rate_params", "volume", "stoichiometric_coefficients", "operation_conditions"])
        self._validate_numeric(parameters, ["volume"])

        components = parameters["components"]
        stoichiometric_coefficients = parameters["stoichiometric_coefficients"]
        reaction_rate_params = parameters["reaction_rate_params"]
        operation_conditions = parameters["operation_conditions"]
        V = parameters["volume"] * self.ureg.m**3  # volume in cubic meters

        last_component_state = components[0]["state"]
        for component in components:
            if last_component_state != component["state"]:
                last_component_state = component["state"]
                raise ValueError("Use only liquid or only gaseous components")
    
        limiting = self.determine_limiting_reagent(parameters)
    
        F0_i = []
        Q_tot = 0 * self.ureg.m**3 / self.ureg.s  # initialize with zero, with unit
        for c in components:
            flow_rate = c["flow_rate_inlet"] * self.ureg.m**3 / self.ureg.s
            conc = (c["molar_concentration_inlet"] * self.ureg.mol / self.ureg.L).to(self.ureg.mol / self.ureg.m**3)
            F0_i.append(flow_rate * conc)  # mol/s for each component
            Q_tot += flow_rate
    
        F_A0 = F0_i[limiting]  # mol/s for the limiting reagent
        C0_i = [F0 / Q_tot for F0 in F0_i]  # concentrations after mixing (mol/m³)
        C_lim0 = C0_i[limiting]
    
        ε_base = self._calculate_dilution_factor(components, stoichiometric_coefficients, limiting, F_A0 / sum(F0_i))
    
        T0 = operation_conditions["initial_temperature"] * self.ureg.K
        P0 = operation_conditions["initial_pressure"] * self.ureg.Pa
        T = operation_conditions["final_temperature"] * self.ureg.K
        P = operation_conditions["final_pressure"] * self.ureg.Pa
    
        var_operation_conditions = (P0 * T / (P * T0)).magnitude
    
        def objective(X_val):
            if not (0 < X_val < 1):
                raise ValueError("Conversion out of bounds")
            
            dilution_factor = (1 + (ε_base * X_val)) * var_operation_conditions
            
            outlet_concentrations, k, r = self._calculate_concentration_and_rate(
                components, stoichiometric_coefficients, reaction_rate_params, 
                limiting, C0_i, C_lim0, X_val, dilution_factor
            )
            
            if any(Ci.magnitude < 0 for Ci in outlet_concentrations.values()):
                raise ValueError("Ci is negative")
                
            rate_lim = abs(stoichiometric_coefficients[limiting]) * r
            X_calc = (rate_lim * V / F_A0).to_base_units().magnitude
            return X_calc - X_val
    
        result = root_scalar(objective, bracket=[1e-6, 0.999], method='brentq')
        if not result.converged:
            raise ValueError("Failed to converge to a valid conversion value.")
    
        X = result.root * self.ureg.dimensionless

        dilution_factor = (1 + (ε_base * X)) * var_operation_conditions
        outlet_concentrations, k, r = self._calculate_concentration_and_rate(
            components, stoichiometric_coefficients, reaction_rate_params, 
            limiting, C0_i, C_lim0, X, dilution_factor
        )
    
        return {
            "conversion": X,
            "reaction_rate": r,
            "outlet_concentrations": outlet_concentrations,
            "dilution_factor": ε_base * self.ureg.dimensionless,
            "molar_rate_inlet_(limitant)": F_A0,
            "flow_rate_outlet": Q_tot,
            "residence_time": V / Q_tot,
            "volume": V,
        }

    def _residence_time_and_kinetics_in_cstr(self, parameters):
        """Calculates the conversion of a CSTR based on residence time and kinetics."""
        self._require_keys(parameters, ["components", "reaction_rate_params", "residence_time", "stoichiometric_coefficients", "operation_conditions"])
        self._validate_numeric(parameters, ["residence_time"])

        components = parameters["components"]
        stoichiometric_coefficients = parameters["stoichiometric_coefficients"]
        reaction_rate_params = parameters["reaction_rate_params"]
        operation_conditions = parameters["operation_conditions"]
        residence_time = parameters["residence_time"] * self.ureg.s  # residence time in seconds

        limiting = self.determine_limiting_reagent(parameters)

        F0_i = []
        Q_tot = 0 * self.ureg.m**3 / self.ureg.s  # initialize with zero, with unit
        for c in components:
            flow_rate = c["flow_rate_inlet"] * self.ureg.m**3 / self.ureg.s
            conc = (c["molar_concentration_inlet"] * self.ureg.mol / self.ureg.L).to(self.ureg.mol / self.ureg.m**3)
            F0_i.append(flow_rate * conc)  # mol/s for each component
            Q_tot += flow_rate

        F_A0 = F0_i[limiting]  # mol/s for the limiting reagent
        C0_i = [F0 / Q_tot for F0 in F0_i]  # concentrations after mixing (mol/m³)
        C_lim0 = C0_i[limiting]
        
        # Reactor volume based on residence time
        V = Q_tot * residence_time  # m³
        
        ε_base = self._calculate_dilution_factor(components, stoichiometric_coefficients, limiting, F_A0 / sum(F0_i))
        
        T0 = operation_conditions["initial_temperature"] * self.ureg.K
        P0 = operation_conditions["initial_pressure"] * self.ureg.Pa
        T = operation_conditions["final_temperature"] * self.ureg.K
        P = operation_conditions["final_pressure"] * self.ureg.Pa
        
        var_operation_conditions = (P0 * T / (P * T0)).magnitude
        
        def objective(X_val):
            if not (0 < X_val < 1):
                raise ValueError("Conversion out of bounds")
            
            dilution_factor = (1 + (ε_base * X_val)) * var_operation_conditions
            
            outlet_concentrations, k, r = self._calculate_concentration_and_rate(
                components, stoichiometric_coefficients, reaction_rate_params, 
                limiting, C0_i, C_lim0, X_val, dilution_factor
            )
            
            if any(Ci.magnitude < 0 for Ci in outlet_concentrations.values()):
                raise ValueError("Ci is negative")
                
            rate_lim = abs(stoichiometric_coefficients[limiting]) * r
            X_calc = (rate_lim * V / F_A0).to_base_units().magnitude
            return X_calc - X_val
        
        result = root_scalar(objective, bracket=[1e-6, 0.999], method='brentq')
        if not result.converged:
            raise ValueError("Failed to converge to a valid conversion value.")
        
        X = result.root * self.ureg.dimensionless
        
        dilution_factor = (1 + (ε_base * X)) * var_operation_conditions
        outlet_concentrations, k, r = self._calculate_concentration_and_rate(
                components, stoichiometric_coefficients, reaction_rate_params, 
                limiting, C0_i, C_lim0, X, dilution_factor
            )
        
        return {
            "conversion": X,
            "molar_rate_inlet_(limitant)": F_A0,
            "flow_rate_outlet": Q_tot,
            "volume": V,
            "reaction_rate": r,
            "outlet_concentrations": outlet_concentrations,
            "dilution_factor_(1+e * P0*T/P*T0)": dilution_factor * self.ureg.dimensionless,
            "residence_time": V / Q_tot,
            "dilution_factor": ε_base * self.ureg.dimensionless
        }

    # ------------------------------------------------------------------ #
    #                         PFR FUNCTIONS                              #
    # ------------------------------------------------------------------ #
    def _conversion_and_kinetics_in_pfr(self, parameters):
        """Calculates the volume of a PFR based on conversion and kinetics."""
        self._require_keys(parameters, ["recycling_ratio", "components", "reaction_rate_params", "conversion", "stoichiometric_coefficients", "operation_conditions"])
        self._validate_numeric(parameters, ["conversion", "recycling_ratio"])

        components = parameters["components"]
        stoichiometric_coefficients = parameters["stoichiometric_coefficients"]
        reaction_rate_params = parameters["reaction_rate_params"]
        operation_conditions = parameters["operation_conditions"]
        X = parameters["conversion"] * self.ureg.dimensionless  # dimensionless
        R = parameters["recycling_ratio"] * self.ureg.dimensionless  # dimensionless

        limiting = self.determine_limiting_reagent(parameters)

        F0_i = []
        Q_tot = 0 * self.ureg.m**3 / self.ureg.s  # initialize with zero, with unit
        for c in components:
            flow_rate = c["flow_rate_inlet"] * self.ureg.m**3 / self.ureg.s
            conc = (c["molar_concentration_inlet"] * self.ureg.mol / self.ureg.L).to(self.ureg.mol / self.ureg.m**3)
            F0_i.append(flow_rate * conc)  # mol/s for each component
            Q_tot += flow_rate

        F_A0 = F0_i[limiting]  # mol/s for the limiting reagent
        C0_i = [F0 / Q_tot for F0 in F0_i]  # concentrations after mixing (mol/m³)
        C_lim0 = C0_i[limiting]

        # Define the rate function for integration
        def rate_function(X_val):
            dilution_factor = (1 + (self._calculate_dilution_factor(components, stoichiometric_coefficients, limiting, X_val))) * (operation_conditions["initial_pressure"] * operation_conditions["final_temperature"] / (operation_conditions["final_pressure"] * operation_conditions["initial_temperature"]))
            outlet_concentrations, k, r = self._calculate_concentration_and_rate(
                components, stoichiometric_coefficients, reaction_rate_params, 
                limiting, C0_i, C_lim0, X_val, dilution_factor
            )
            return abs(stoichiometric_coefficients[limiting]) * r.magnitude

        # Calculate the volume using numerical integration
        
        integral, _ = quad(lambda x: 1 / rate_function(x), (R/(R+1)*X).magnitude, X.magnitude)

        V = (R+1) * F_A0 * integral * self.ureg.m**3  # m³
        
        # Calcular o fator de diluição final e as concentrações no reator
        ε = self._calculate_dilution_factor(components, stoichiometric_coefficients, limiting, X)
        T0 = operation_conditions["initial_temperature"] * self.ureg.K
        P0 = operation_conditions["initial_pressure"] * self.ureg.Pa
        T = operation_conditions["final_temperature"] * self.ureg.K
        P = operation_conditions["final_pressure"] * self.ureg.Pa
        dilution_factor = (1 + ε) * (P0 * T / (P * T0)).magnitude
        outlet_concentrations, k, r = self._calculate_concentration_and_rate(
            components, stoichiometric_coefficients, reaction_rate_params, 
            limiting, C0_i, C_lim0, X, dilution_factor
        )

        return {
            "volume": V,
            "conversion": X,
            "molar_rate_inlet_(limitant)": F_A0,
            "flow_rate_outlet": Q_tot,
            "reaction_rate": r,
            "outlet_concentrations": outlet_concentrations,
            "dilution_factor_(1+e * P0*T)": dilution_factor * self.ureg.dimensionless,
            "residence_time": V / Q_tot,
            "dilution_factor": ε * self.ureg.dimensionless
        }

    def _volume_and_kinetics_in_pfr(self, parameters):
        """Calculates the conversion of a PFR based on volume and kinetics."""
        self._require_keys(parameters, ["components", "reaction_rate_params", "volume", "stoichiometric_coefficients", "operation_conditions"])
        self._validate_numeric(parameters, ["volume"])

        components = parameters["components"]
        stoichiometric_coefficients = parameters["stoichiometric_coefficients"]
        reaction_rate_params = parameters["reaction_rate_params"]
        operation_conditions = parameters["operation_conditions"]
        V = parameters["volume"] * self.ureg.m**3  # volume in cubic meters

        limiting = self.determine_limiting_reagent(parameters)

        F0_i = []
        Q_tot = 0 * self.ureg.m**3 / self.ureg.s  # initialize with zero, with unit
        for c in components:
            flow_rate = c["flow_rate_inlet"] * self.ureg.m**3 / self.ureg.s
            conc = (c["molar_concentration_inlet"] * self.ureg.mol / self.ureg.L).to(self.ureg.mol / self.ureg.m**3)
            F0_i.append(flow_rate * conc)  # mol/s for each component
            Q_tot += flow_rate

        F_A0 = F0_i[limiting]  # mol/s for the limiting reagent
        C0_i = [F0 / Q_tot for F0 in F0_i]  # concentrations after mixing (mol/m³)
        C_lim0 = C0_i[limiting]

        T0 = operation_conditions["initial_temperature"] * self.ureg.K
        P0 = operation_conditions["initial_pressure"] * self.ureg.Pa
        T = operation_conditions["final_temperature"] * self.ureg.K
        P = operation_conditions["final_pressure"] * self.ureg.Pa

        def objective(X_val):
            ε = self._calculate_dilution_factor(components, stoichiometric_coefficients, limiting, X_val)
            dilution_factor = (1 + ε) * (P0 * T / (P * T0)).magnitude
            outlet_concentrations, k, r = self._calculate_concentration_and_rate(
                components, stoichiometric_coefficients, reaction_rate_params, 
                limiting, C0_i, C_lim0, X_val, dilution_factor
            )
            rate_lim = abs(stoichiometric_coefficients[limiting]) * r
            X_calc = (rate_lim * V / F_A0).to_base_units().magnitude
            return X_calc - X_val

        result = root_scalar(objective, bracket=[1e-6, 0.99999], method='brentq')
        if not result.converged:
            raise ValueError("Failed to converge to a valid conversion value.")

        X = result.root * self.ureg.dimensionless

        ε = self._calculate_dilution_factor(components, stoichiometric_coefficients, limiting, X)
        dilution_factor = (1 + ε) * (P0 * T / (P * T0)).magnitude
        outlet_concentrations, k, r = self._calculate_concentration_and_rate(
            components, stoichiometric_coefficients, reaction_rate_params, 
            limiting, C0_i, C_lim0, X, dilution_factor
        )

        return {
            "conversion": X,
            "molar_rate_inlet_(limitant)": F_A0,
            "flow_rate_outlet": Q_tot,
            "volume": V,
            "reaction_rate": r,
            "outlet_concentrations": outlet_concentrations,
            "dilution_factor_(1+e * P0*T)": dilution_factor * self.ureg.dimensionless,
            "residence_time": V / Q_tot,
            "dilution_factor": ε * self.ureg.dimensionless
        }

    def _residence_time_and_kinetics_in_pfr(self, parameters):
        """Calculates the conversion of a PFR based on residence time and kinetics."""
        self._require_keys(parameters, ["components", "reaction_rate_params", "residence_time", "stoichiometric_coefficients", "operation_conditions"])
        self._validate_numeric(parameters, ["residence_time"])

        components = parameters["components"]
        stoichiometric_coefficients = parameters["stoichiometric_coefficients"]
        reaction_rate_params = parameters["reaction_rate_params"]
        operation_conditions = parameters["operation_conditions"]
        residence_time = parameters["residence_time"] * self.ureg.s  # residence time in seconds

        limiting = self.determine_limiting_reagent(parameters)

        F0_i = []
        Q_tot = 0 * self.ureg.m**3 / self.ureg.s  # initialize with zero, with unit
        for c in components:
            flow_rate = c["flow_rate_inlet"] * self.ureg.m**3 / self.ureg.s
            conc = (c["molar_concentration_inlet"] * self.ureg.mol / self.ureg.L).to(self.ureg.mol / self.ureg.m**3)
            F0_i.append(flow_rate * conc)  # mol/s for each component
            Q_tot += flow_rate

        F_A0 = F0_i[limiting]  # mol/s for the limiting reagent
        C0_i = [F0 / Q_tot for F0 in F0_i]  # concentrations after mixing (mol/m³)
        C_lim0 = C0_i[limiting]

        # Reactor volume based on residence time
        V = Q_tot * residence_time  # m³

        T0 = operation_conditions["initial_temperature"] * self.ureg.K
        P0 = operation_conditions["initial_pressure"] * self.ureg.Pa
        T = operation_conditions["final_temperature"] * self.ureg.K
        P = operation_conditions["final_pressure"] * self.ureg.Pa

        def objective(X_val):
            ε = self._calculate_dilution_factor(components, stoichiometric_coefficients, limiting, X_val)
            dilution_factor = (1 + ε) * (P0 * T / (P * T0)).magnitude
            
            outlet_concentrations, k, r = self._calculate_concentration_and_rate(
                components, stoichiometric_coefficients, reaction_rate_params, 
                limiting, C0_i, C_lim0, X_val, dilution_factor
            )
            rate_lim = abs(stoichiometric_coefficients[limiting]) * r
            X_calc = (rate_lim * V / F_A0).to_base_units().magnitude
            return X_calc - X_val

        result = root_scalar(objective, bracket=[1e-6, 0.999], method='brentq')
        if not result.converged:
            raise ValueError("Failed to converge to a valid conversion value.")

        X = result.root * self.ureg.dimensionless

        ε = self._calculate_dilution_factor(components, stoichiometric_coefficients, limiting, X)
        dilution_factor = (1 + ε) * (P0 * T / (P * T0)).magnitude
        outlet_concentrations, k, r = self._calculate_concentration_and_rate(
                components, stoichiometric_coefficients, reaction_rate_params, 
                limiting, C0_i, C_lim0, X, dilution_factor
            )

        return {
            "conversion": X,
            "molar_rate_inlet_(limitant)": F_A0,
            "flow_rate_outlet": Q_tot,
            "volume": V,
            "reaction_rate": r,
            "outlet_concentrations": outlet_concentrations,
            "dilution_factor_(1+e * P0*T)": dilution_factor * self.ureg.dimensionless,
            "residence_time": V / Q_tot,
            "dilution_factor": ε * self.ureg.dimensionless
        }

    # ------------------------------------------------------------------ #
    #                              PUBLIC                                #
    # ------------------------------------------------------------------ #
    def cstr(self, parameters: Dict[str, object]):
        """Calculate the CSTR reactor"""

        if "input_type" not in parameters:
            return [
                "conversion_and_kinetics",
                "volume_and_kinetics",
                "residence_time_and_kinetics",
            ]
        
        input_type = parameters["input_type"]
        
        if input_type == "conversion_and_kinetics":
            return self._conversion_and_kinetics_in_cstr(parameters)
        elif input_type == "volume_and_kinetics":
            return self._volume_and_kinetics_in_cstr(parameters)
        elif input_type == "residence_time_and_kinetics":
            return self._residence_time_and_kinetics_in_cstr(parameters)
        else:
            raise ValueError(f"Invalid input_type: {input_type}")

    def pfr(self, parameters: Dict[str, object]):
        """Calculate the PFR reactor"""

        if "input_type" not in parameters:
            return [
                "conversion_and_kinetics",
                "volume_and_kinetics",
                "residence_time_and_kinetics",
            ]
        
        input_type = parameters["input_type"]
        
        if input_type == "conversion_and_kinetics":
            return self._conversion_and_kinetics_in_pfr(parameters)
        elif input_type == "volume_and_kinetics":
            return self._volume_and_kinetics_in_pfr(parameters)
        elif input_type == "residence_time_and_kinetics":
            return self._residence_time_and_kinetics_in_pfr(parameters)
        else:
            raise ValueError(f"Invalid input_type: {input_type}")

    def plot_conversion_vs_volume(self, parameters: Dict[str, object]):
        """
        Generates a comparative graph between CSTR and PFR reactors showing the relationship between conversion (X) and volume (V).
        
        Args:
            parameters: Dictionary containing the necessary parameters:
                - components: List of components
                - reaction_rate_params: Reaction rate parameters
                - stoichiometric_coefficients: Stoichiometric coefficients
                - operation_conditions: Operating conditions
                - max_conversion: Maximum conversion for the graph (optional, default 0.99)
                - num_points: Number of points in the graph (optional, default 50)
                - recycling_ratio: Recycling rate for PFR (optional, default 0)
        
        Returns:
            Matplotlib Figure and Axes containing the generated graph
        """
        self._require_keys(parameters, ["recycling_ratio_pfr", "components", "reaction_rate_params", "stoichiometric_coefficients", "operation_conditions"])
        
        # Optional parameters with default values
        max_conversion = parameters.get("max_conversion", 0.99)
        num_points = parameters.get("num_points", 50)
        recycling_ratio_pfr = parameters.get("recycling_ratio_pfr", 0)
        
        # Generate conversion points
        conversion_points = np.linspace(0.01, max_conversion, num_points)
        
        # Initialize lists for volumes
        volumes_cstr = []
        volumes_pfr = []
        
        # Calculate volumes for CSTR
        for x in conversion_points:
            cstr_params = parameters.copy()
            cstr_params["conversion"] = x
            cstr_params["input_type"] = "conversion_and_kinetics"
            result = self._conversion_and_kinetics_in_cstr(cstr_params)
            volumes_cstr.append(result["volume"].magnitude)
        
        # Calculate volumes for PFR
        for x in conversion_points:
            pfr_params = parameters.copy()
            pfr_params["conversion"] = x
            pfr_params["recycling_ratio"] = recycling_ratio_pfr
            pfr_params["input_type"] = "conversion_and_kinetics"
            result = self._conversion_and_kinetics_in_pfr(pfr_params)
            volumes_pfr.append(result["volume"].magnitude)
        
        # Create graph
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Plot curves
        ax.plot(volumes_cstr, conversion_points, 'b-', linewidth=2, label='CSTR')
        ax.plot(volumes_pfr, conversion_points, 'r-', linewidth=2, label='PFR')
        
        # Configure labels and legends
        ax.set_xlabel('Volume (m³)', fontsize=12)
        ax.set_ylabel('Conversion (X)', fontsize=12)
        ax.set_title('CSTR and PFR Reactors at same reaction', fontsize=14)
        ax.grid(True, linestyle='--', alpha=0.7)
        ax.legend(fontsize=12)
        
        # Adjust limits and format
        ax.set_xlim(0, max(max(volumes_cstr), max(volumes_pfr)) * 1.1)
        ax.set_ylim(0, max_conversion * 1.1)
        
        plt.tight_layout()
        
        return fig, ax

    def determine_limiting_reagent(self, parameters):
        """Determine the limiting reagent based on stoichiometric coefficients and component concentrations."""
        self._require_keys(parameters, ["components", "stoichiometric_coefficients"])
        
        components = parameters["components"]
        stoichiometric_coefficients = parameters["stoichiometric_coefficients"]
    
        if len(components) != len(stoichiometric_coefficients):
            raise ValueError("Components and stoichiometric coefficients must have the same length.")
        
        required_keys = ["flow_rate_inlet", "molar_concentration_inlet", "component_name"]
        for component in components:
            for key in required_keys:
                if key not in component:
                    raise KeyError(f"Missing key '{key}' in component {component}")
    
        limiting_index = None
        min_ratio = float('inf')
    
        for i, component in enumerate(components):
            coef = stoichiometric_coefficients[i]
    
            if coef == 0:
                raise ValueError(f"Stoichiometric coefficient for component {component['component_name']} is zero.")
    
            if coef < 0:  # It's a reactant
                flow_rate = component["flow_rate_inlet"] * self.ureg.m**3 / self.ureg.s
                molar_concentration = (component["molar_concentration_inlet"] * self.ureg.mol / self.ureg.L).to(self.ureg.mol / self.ureg.m**3)
                
                ratio = (flow_rate * molar_concentration / abs(coef)).magnitude  # mol/s per mol
    
                if ratio < min_ratio:
                    min_ratio = ratio
                    limiting_index = i  # Store the index of the limiting reagent
    
        if limiting_index is None:
            raise ValueError("No limiting reagent found. Check stoichiometric coefficients and components.")
    
        return limiting_index