import CoolProp.CoolProp as CP
from CoolProp.CoolProp import FluidsList
import pint

class Components:
    def __init__(self):
        self.ureg = pint.UnitRegistry()
        
    def list_all_components(self):
        """Returns a list of all available components/fluids"""
        return FluidsList()
    
    def get_all_properties(self, fluid, temperature, pressure):
        """
        Returns all available properties for a fluid at given temperature and pressure
        
        Parameters:
        -----------
        fluid : str
            Name of the fluid
        temperature : float
            Temperature in K
        pressure : float
            Pressure in Pa
        
        Returns:
        --------
        dict
            Dictionary containing all available properties
        """
        if fluid not in self.list_all_components():
            raise ValueError(f"Fluid '{fluid}' not found")
        
        properties = {}
        properties["temperature"] = temperature * self.ureg.kelvin
        properties["pressure"] = pressure * self.ureg.pascal
        
        # Get basic properties
        properties["density"] = CP.PropsSI("D", "T", temperature, "P", pressure, fluid) * self.ureg.kg / self.ureg.m**3
        properties["specific_heat"] = CP.PropsSI("C", "T", temperature, "P", pressure, fluid) * self.ureg.joule / (self.ureg.kg * self.ureg.kelvin)
        properties["viscosity"] = CP.PropsSI("V", "T", temperature, "P", pressure, fluid) * self.ureg.pascal * self.ureg.second
        properties["conductivity"] = CP.PropsSI("L", "T", temperature, "P", pressure, fluid) * self.ureg.watt / (self.ureg.meter * self.ureg.kelvin)
        properties["enthalpy"] = CP.PropsSI("H", "T", temperature, "P", pressure, fluid) * self.ureg.joule / self.ureg.kg
        properties["entropy"] = CP.PropsSI("S", "T", temperature, "P", pressure, fluid) * self.ureg.joule / (self.ureg.kg * self.ureg.kelvin)
        properties["molecular_weight"] = CP.PropsSI("M", "T", temperature, "P", pressure, fluid) * self.ureg.kg / self.ureg.mol
        
        try:
            properties["surface_tension"] = CP.PropsSI("I", "T", temperature, "P", pressure, fluid) * self.ureg.newton / self.ureg.meter
        except:
            properties["surface_tension"] = None
            
        try:
            properties["vapor_pressure"] = CP.PropsSI("P", "T", temperature, "Q", 1, fluid) * self.ureg.pascal
        except:
            properties["vapor_pressure"] = None
            
        # Add bubble and dew points (for pure fluids, these are the same as saturation properties)
        try:
            sat_temperature = CP.PropsSI("T", "P", pressure, "Q", 0, fluid)
            properties["bubble_point_temperature"] = sat_temperature * self.ureg.kelvin
            properties["dew_point_temperature"] = sat_temperature * self.ureg.kelvin
        except:
            properties["bubble_point_temperature"] = None
            properties["dew_point_temperature"] = None
            
        try:
            sat_pressure = CP.PropsSI("P", "T", temperature, "Q", 0, fluid)
            properties["bubble_point_pressure"] = sat_pressure * self.ureg.pascal
            properties["dew_point_pressure"] = sat_pressure * self.ureg.pascal
        except:
            properties["bubble_point_pressure"] = None
            properties["dew_point_pressure"] = None
        
        return properties
    
    def get_property(self, fluid, property_name, temperature, pressure):
        """
        Returns a specific property for a fluid at given temperature and pressure
        
        Parameters:
        -----------
        fluid : str
            Name of the fluid
        property_name : str
            Name of the property to retrieve (CoolProp format)
        temperature : float
            Temperature in K
        pressure : float
            Pressure in Pa
        
        Returns:
        --------
        float with units
            The requested property with appropriate units
        """
        if fluid not in self.list_all_components():
            raise ValueError(f"Fluid '{fluid}' not found")
        
        # Map of properties to their units
        units_map = {
            "D": self.ureg.kg / self.ureg.m**3,           # Density
            "C": self.ureg.joule / (self.ureg.kg * self.ureg.kelvin),  # Specific heat
            "V": self.ureg.pascal * self.ureg.second,     # Viscosity
            "L": self.ureg.watt / (self.ureg.meter * self.ureg.kelvin),  # Conductivity
            "H": self.ureg.joule / self.ureg.kg,          # Enthalpy
            "S": self.ureg.joule / (self.ureg.kg * self.ureg.kelvin),  # Entropy
            "M": self.ureg.kg / self.ureg.mol,           # Molecular weight
            "I": self.ureg.newton / self.ureg.meter,      # Surface tension
            "P": self.ureg.pascal,                        # Pressure
            "T": self.ureg.kelvin,                        # Temperature
            "T_bubble": self.ureg.kelvin,                 # Bubble point temperature
            "T_dew": self.ureg.kelvin,                    # Dew point temperature
            "P_bubble": self.ureg.pascal,                 # Bubble point pressure
            "P_dew": self.ureg.pascal                     # Dew point pressure
        }
        
        # Check if the fluid is pure (not a mixture)
        # For bubble and dew points, we need a mixture
        if property_name in ["T_bubble", "T_dew", "P_bubble", "P_dew"]:
            # For pure fluids, return the saturation temperature/pressure
            try:
                if property_name == "T_bubble" or property_name == "T_dew":
                    # Saturation temperature at given pressure
                    value = CP.PropsSI("T", "P", pressure, "Q", 0, fluid)
                elif property_name == "P_bubble" or property_name == "P_dew":
                    # Saturation pressure at given temperature
                    value = CP.PropsSI("P", "T", temperature, "Q", 0, fluid)
            except Exception as e:
                return None  # Returns None if calculation not possible
        else:
            # For other properties, use standard method
            value = CP.PropsSI(property_name, "T", temperature, "P", pressure, fluid)
        
        if property_name in units_map:
            return value * units_map[property_name]
        else:
            return value  # Return without units if not in the map
    
    def get_property_names(self):
        """Returns a dictionary of available property keys and their descriptions"""
        property_map = {
            "D": "Density [kg/m³]",
            "C": "Specific heat [J/(kg·K)]",
            "V": "Viscosity [Pa·s]",
            "L": "Thermal conductivity [W/(m·K)]",
            "H": "Enthalpy [J/kg]",
            "S": "Entropy [J/(kg·K)]",
            "M": "Molar mass [kg/mol]",
            "I": "Surface tension [N/m]",
            "P": "Pressure [Pa]",
            "T": "Temperature [K]",
            "Q": "Quality (vapor fraction) [kg/kg]",
            "U": "Internal energy [J/kg]",
            "A": "Speed of sound [m/s]",
            "Z": "Compressibility factor [-]",
            "T_bubble": "Bubble point temperature [K]",
            "T_dew": "Dew point temperature [K]",
            "P_bubble": "Bubble point pressure [Pa]",
            "P_dew": "Dew point pressure [Pa]"
        }
        return property_map
    
    def get_critical_properties(self, fluid):
        """
        Returns critical properties for a fluid
        
        Parameters:
        -----------
        fluid : str
            Name of the fluid
        
        Returns:
        --------
        dict
            Dictionary containing critical properties
        """
        if fluid not in self.list_all_components():
            raise ValueError(f"Fluid '{fluid}' not found")
        
        critical_props = {}
        critical_props["critical_temperature"] = CP.PropsSI("Tcrit", fluid) * self.ureg.kelvin
        critical_props["critical_pressure"] = CP.PropsSI("Pcrit", fluid) * self.ureg.pascal
        critical_props["critical_density"] = CP.PropsSI("rhocrit", fluid) * self.ureg.kg / self.ureg.m**3
        critical_props["triple_point_temperature"] = CP.PropsSI("Ttriple", fluid) * self.ureg.kelvin
        critical_props["triple_point_pressure"] = CP.PropsSI("ptriple", fluid) * self.ureg.pascal
        
        return critical_props
        
    def get_property_mixture_names(self):
        """Returns a dictionary of available property keys for mixtures and their descriptions"""
        property_map = {
            "D": "Density [kg/m³]",
            "C": "Specific heat [J/(kg·K)]",
            "V": "Viscosity [Pa·s]",
            "L": "Thermal conductivity [W/(m·K)]",
            "H": "Enthalpy [J/kg]",
            "S": "Entropy [J/(kg·K)]",
            "M": "Molar mass [kg/mol]",
            "I": "Surface tension [N/m]",
            "P": "Pressure [Pa]",
            "T": "Temperature [K]"
        }
        return property_map

    def get_mixture_properties(self, fluid_fractions, temperature, pressure, properties=None):
        """
        Returns properties for a mixture of fluids at given temperature and pressure
        
        Parameters:
        -----------
        fluid_fractions : dict
            Dictionary with fluid names as keys and their mass fractions as values
            Example: {"Water": 0.7, "Ethanol": 0.3} for a mixture of 70% water and 30% ethanol
        temperature : float
            Temperature in K
        pressure : float
            Pressure in Pa
        properties : list, optional
            List of property keys to retrieve. If None, returns all available properties.
            
        Returns:
        --------
        dict
            Dictionary containing the requested properties for the mixture
        """
        # Validate inputs
        for fluid in fluid_fractions.keys():
            if fluid not in self.list_all_components():
                raise ValueError(f"Fluid '{fluid}' not found")
                
        # Check that fractions sum to approximately 1
        total_fraction = sum(fluid_fractions.values())
        if not 0.99 <= total_fraction <= 1.01:
            raise ValueError(f"Sum of fluid fractions should be 1.0, got {total_fraction}")
            
        # Create the mixture string for CoolProp
        # Format: "HEOS::fluid1[fraction1]&fluid2[fraction2]&..."
        mixture_string = "HEOS::"
        for i, (fluid, fraction) in enumerate(fluid_fractions.items()):
            if i > 0:
                mixture_string += "&"
            mixture_string += f"{fluid}[{fraction}]"
            
        # Get properties
        result = {}
        
        # Define which properties to retrieve
        if properties is None:
            properties = ["D", "C", "V", "L", "H", "S", "M", "I", "P", "T"]
            
        # Map of property keys to result dictionary keys
        property_key_map = {
            "D": "density",
            "C": "specific_heat",
            "V": "viscosity",
            "L": "thermal_conductivity",
            "H": "enthalpy",
            "S": "entropy",
            "M": "molecular_weight",
            "I": "surface_tension",
            "P": "pressure",
            "T": "temperature"
        }
            
        # Map of properties to their units (same as in get_property method)
        units_map = {
            "D": self.ureg.kg / self.ureg.m**3,           # Density
            "C": self.ureg.joule / (self.ureg.kg * self.ureg.kelvin),  # Specific heat
            "V": self.ureg.pascal * self.ureg.second,     # Viscosity
            "L": self.ureg.watt / (self.ureg.meter * self.ureg.kelvin),  # Conductivity
            "H": self.ureg.joule / self.ureg.kg,          # Enthalpy
            "S": self.ureg.joule / (self.ureg.kg * self.ureg.kelvin),  # Entropy
            "M": self.ureg.kg / self.ureg.mol,           # Molecular weight
            "I": self.ureg.newton / self.ureg.meter,      # Surface tension
            "P": self.ureg.pascal,                        # Pressure
            "T": self.ureg.kelvin                         # Temperature
        }
        
        # Retrieve each property
        for prop in properties:
            try:
                # For mixtures or other properties
                value = CP.PropsSI(prop, "T", temperature, "P", pressure, mixture_string)
                
                if prop in units_map:
                    result[property_key_map.get(prop, prop)] = value * units_map[prop]
                else:
                    result[property_key_map.get(prop, prop)] = value
            except Exception as e:
                result[property_key_map.get(prop, prop)] = None
                
        return result 