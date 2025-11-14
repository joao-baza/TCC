from pint import UnitRegistry

class Piping:
    def __init__(self):
        """
        Contains piping specifications.
        Each number key is the nominal diameter in mm, which retrieve:
        ----external_diameter: mm
        ----thickness: mm
        ----weight: kg/m
        ----pressure: psi
        """
        
        self.ureg = UnitRegistry()
        
        # Armazena os dados numéricos
        self.data = {
            "dimensions":{
                "SCH10": {
                    6: {
                        "external_diameter": 10.30,
                        "thickness": 1.245,
                        "weight": 0.277,
                        "max_pressure": None
                    
                    },
                    8: {
                        "external_diameter": 13.70,
                        "thickness": 1.651,
                        "weight": 0.489,
                        "max_pressure": None
                    },
                    10: {
                        "external_diameter": 17.145,
                        "thickness": 1.651,
                        "weight": 0.629,
                        "max_pressure": None
                    },
                    15: {
                        "external_diameter": 21.30,
                        "thickness": 2.11,
                        "weight": 1.00,
                        "max_pressure": 350
                    },
                    20: {
                        "external_diameter": 26.90,
                        "thickness": 2.11,
                        "weight": 1.29,
                        "max_pressure": 350
                    },
                    25: {
                        "external_diameter": 33.70,
                        "thickness": 2.77,
                        "weight": 2.11,
                        "max_pressure": 350
                    },
                    32: {
                        "external_diameter": 42.40,
                        "thickness": 2.77,
                        "weight": 2.71,
                        "max_pressure": 600
                    },
                    40: {
                        "external_diameter": 48.30,
                        "thickness": 2.77,
                        "weight": 3.11,
                        "max_pressure": 600
                    },
                    50: {
                        "external_diameter": 60.30,
                        "thickness": 2.77,
                        "weight": 3.93,
                        "max_pressure": 820
                    },
                    65: {
                        "external_diameter": 73.00,
                        "thickness": 3.05,
                        "weight": 5.26,
                        "max_pressure": 750
                    },
                    80: {
                        "external_diameter": 88.90,
                        "thickness": 3.05,
                        "weight": 6.46,
                        "max_pressure": 610
                    },
                    100: {
                        "external_diameter": 114.30,
                        "thickness": 3.05,
                        "weight": 8.37,
                        "max_pressure": 480
                    },
                    125: {
                        "external_diameter": 141.30,
                        "thickness": 3.40,
                        "weight": 11.56,
                        "max_pressure": 430
                    },
                    150: {
                        "external_diameter": 168.30,
                        "thickness": 3.40,
                        "weight": 13.83,
                        "max_pressure": 365
                    },
                    200: {
                        "external_diameter": 219.10,
                        "thickness": 3.76,
                        "weight": 19.97,
                        "max_pressure": 305
                    }
                },
                "SCH40": {
                    6: {
                        "external_diameter": 10.30,
                        "thickness": 1.727,
                        "weight": 0.364,
                        "max_pressure": None
                    },
                    8: {
                        "external_diameter": 13.70,
                        "thickness": 2.235,
                        "weight": 0.673,
                        "max_pressure": None
                    },
                    10: {
                        "external_diameter": 17.145,
                        "thickness": 2.31,
                        "weight": 0.843,
                        "max_pressure": None
                    },
                    15: {
                        "external_diameter": 21.30,
                        "thickness": 2.77,
                        "weight": 1.27,
                        "max_pressure": 350
                    },
                    20: {
                        "external_diameter": 26.90,
                        "thickness": 2.87,
                        "weight": 1.69,
                        "max_pressure": 350
                    },
                    25: {
                        "external_diameter": 33.70,
                        "thickness": 3.38,
                        "weight": 2.50,
                        "max_pressure": 350
                    },
                    32: {
                        "external_diameter": 42.40,
                        "thickness": 3.56,
                        "weight": 3.39,
                        "max_pressure": 600
                    },
                    40: {
                        "external_diameter": 48.30,
                        "thickness": 3.68,
                        "weight": 4.05,
                        "max_pressure": 600
                    },
                    50: {
                        "external_diameter": 60.30,
                        "thickness": 3.91,
                        "weight": 4.44,
                        "max_pressure": 1150
                    },
                    65: {
                        "external_diameter": 73.00,
                        "thickness": 5.16,
                        "weight": 8.63,
                        "max_pressure": 1250
                    },
                    80: {
                        "external_diameter": 88.90,
                        "thickness": 5.49,
                        "weight": 11.29,
                        "max_pressure": 965
                    },
                    100: {
                        "external_diameter": 114.30,
                        "thickness": 6.02,
                        "weight": 16.07,
                        "max_pressure": 750
                    },
                    125: {
                        "external_diameter": 141.30,
                        "thickness": 6.55,
                        "weight": 21.77,
                        "max_pressure": 835
                    },
                    150: {
                        "external_diameter": 168.30,
                        "thickness": 7.11,
                        "weight": 28.26,
                        "max_pressure": 760
                    },
                    200: {
                        "external_diameter": 219.10,
                        "thickness": 8.18,
                        "weight": 42.55,
                        "max_pressure": 670
                    }
                },
                "SCH80": {
                    6: {
                        "external_diameter": 10.30,
                        "thickness": 2.413,
                        "weight": 0.468,
                        "max_pressure": None
                    },
                    8: {
                        "external_diameter": 13.70,
                        "thickness": 3.023,
                        "weight": 0.794,
                        "max_pressure": None
                    },
                    10: {
                        "external_diameter": 17.145,
                        "thickness": 3.20,
                        "weight": 1.098,
                        "max_pressure": None
                    },
                    50: {
                        "external_diameter": 60.30,
                        "thickness": 5.54,
                        "weight": 7.48,
                        "max_pressure": 1250
                    },
                    65: {
                        "external_diameter": 73.00,
                        "thickness": 7.01,
                        "weight": 11.41,
                        "max_pressure": 1250
                    },
                    80: {
                        "external_diameter": 88.90,
                        "thickness": 7.62,
                        "weight": 15.27,
                        "max_pressure": 1250
                    },
                    100: {
                        "external_diameter": 114.30,
                        "thickness": 8.56,
                        "weight": 23.32,
                        "max_pressure": 1350
                    },
                    125: {
                        "external_diameter": 141.30,
                        "thickness": 9.52,
                        "weight": 30.94,
                        "max_pressure": 1215
                    },
                    150: {
                        "external_diameter": 168.30,
                        "thickness": 10.97,
                        "weight": 42.56,
                        "max_pressure": 1175
                    },
                    200: {
                        "external_diameter": 219.10,
                        "thickness": 12.70,
                        "weight": 64.64,
                        "max_pressure": 1045
                    }
                }
            },
            "composition":{
                "Commercial steel":{
                    "roughness":0.06,
                    "roughness_coefficient": 135
                },
                "Galvanized steel":{
                    "roughness":0.16,
                    "roughness_coefficient": 125
                },
                "Lightly rusted steel":{
                    "roughness":0.25,
                    "roughness_coefficient": None
                },
                "Asphalt-coated steel":{
                    "roughness":0.6,
                    "roughness_coefficient": None
                },
                "Steel coated with enamel, vinyl, epoxy":{
                    "roughness":0.06,
                    "roughness_coefficient": None
                },
                "Aluminum":{
                    "roughness":0.004,
                    "roughness_coefficient": None
                },
                "Very rough concrete":{
                    "roughness":2000,
                    "roughness_coefficient": 120                
                },
                "Rough concrete":{
                    "roughness":0.5,
                    "roughness_coefficient": 120                
                },
                "Smooth concrete":{
                    "roughness":0.1,
                    "roughness_coefficient": 120                
                },
                "Very smooth concrete":{
                    "roughness":0.06,
                    "roughness_coefficient": 120                
                },
                "Troweled, centrifuged concrete":{
                    "roughness":0.3,
                    "roughness_coefficient": 120                
                },
                "Asphalted cast iron":{
                    "roughness":0.122,
                    "roughness_coefficient": 130
                },
                "New uncoated cast iron":{
                    "roughness":0.5,
                    "roughness_coefficient": 125
                },
                "Lightly rusted cast iron":{
                    "roughness":1.5,
                    "roughness_coefficient": 90
                },
                "Centrifuged cement-lined cast iron":{
                    "roughness":0.1,
                    "roughness_coefficient": None
                },
                "Fiber cement":{
                    "roughness":0.1,
                    "roughness_coefficient": None
                },
                "Ceramic pipe":{
                    "roughness":0.6,
                    "roughness_coefficient": None
                },
                "Brass, copper":{
                    "roughness":0.007,
                    "roughness_coefficient": 130
                },
                "Plastics":{
                    "roughness":0.06,
                    "roughness_coefficient": 140
                }
            },
             "fittings": {
                "180 degrees Return": {
                    "equivalentLength": 28
                    },
                "90 degrees Elbow long radius": {
                    "equivalentLength": 16
                    },
                "90 degrees Elbow short radius": {
                    "equivalentLength": 20
                    },
                "45 degrees Elbow": {
                    "equivalentLength": 16
                    },
                "Tee (straight run)": {
                    "equivalentLength": 20
                    },
                "Tee (side outlet)": {
                    "equivalentLength": 65
                    },
                "Tank outlet": {
                    "equivalentLength": 32
                    },
                "Diaphragm valve": {
                    "equivalentLength": 200
                    },
                "Ball valve": {
                    "equivalentLength": 18
                    },
                "Y-strainer valve": {
                    "equivalentLength": 250
                    },
                "Gate valve (fully open)": {
                    "equivalentLength": 13
                    },
                "Gate valve (3/4 open)": {
                    "equivalentLength": 35
                    },
                "Gate valve (half open)": {
                    "equivalentLength": 160
                    },
                "Gate valve (1/4 open)": {
                    "equivalentLength": 900
                    },
                "Foot check valve": {
                    "equivalentLength": 150
                    },
                "Swing check valve": {
                    "equivalentLength": 135
                    },
                "Needle valve": {
                    "equivalentLength": 1000
                    },
                "Globe valve (open)": {
                    "equivalentLength": 300
                    },
                "Butterfly valve": {
                    "equivalentLength": 20
                    },
                "90 degrees Elbow medium radius": {
                    "equivalentLength": 28.5
                    },
                "45 degrees Elbow (custom)": {
                    "equivalentLength": 15.4
                    },
                "90 degrees Bend R per D = 1.5": {
                    "equivalentLength": 12.8
                    },
                "90 degrees Bend R per D = 1": {
                    "equivalentLength": 17.5
                    },
                "45 degrees Bend": {
                    "equivalentLength": 7.8
                    },
                "Normal inlet": {
                    "equivalentLength": 14.7
                    },
                "Side inlet": {
                    "equivalentLength": 30.2
                    },
                "Open angle valve": {
                    "equivalentLength": 171.5
                    },
                "90 degrees Tee double outlet": {
                    "equivalentLength": 69
                    },
                "Check valve, light duty": {
                    "equivalentLength": 83.6}
            }

        }

        for schedule, diam_dict in self.data["dimensions"].items():
            for nominal_diam, specs in diam_dict.items():
                specs["external_diameter"] = specs["external_diameter"] * self.ureg.mm
                specs["thickness"] = specs["thickness"] * self.ureg.mm
                specs["weight"] = specs["weight"] * (self.ureg.kg / self.ureg.m)
                if specs["max_pressure"] is not None:
                    specs["max_pressure"] = specs["max_pressure"] * self.ureg.psi
                    specs["max_pressure"] = specs["max_pressure"].to(self.ureg.Pa)
                    
        for composition, specs in self.data["composition"].items():
            specs["roughness"] = specs["roughness"] * self.ureg.mm
            if specs["roughness_coefficient"]:
                specs["roughness_coefficient"] = specs["roughness_coefficient"] * self.ureg.dimensionless
                
        for fittings, specs in self.data["fittings"].items():
            specs["equivalentLength"] = specs["equivalentLength"] / self.ureg.m

    def fittings(self):
        """        
        Returns piping fittings
        """
        return list(self.data["fittings"].keys())
        
    def fitting_specifications(self, fitting):
        """        
        Returns piping specifications for fitting with additional details
        """
        if fitting not in self.data["fittings"]:
            raise TypeError("fitting not found")
            
        # Get basic specifications
        specs = self.data["fittings"][fitting]
        
        # Add additional details
        enhanced_specs = {
            "name": fitting,
            "description": self._get_fitting_description(fitting),
            "usage": self._get_fitting_usage(fitting),
            "specifications": specs
        }
        
        return enhanced_specs
    
    def compositions(self):
        """        
        Returns piping compositions
        """
        return list(self.data["composition"].keys())
    
    def composition_specifications(self, composition):
        """        
        Returns piping specifications for composition with additional details
        """
        if composition not in self.data["composition"]:
            raise TypeError("Composition not found")
            
        # Get basic specifications
        specs = self.data["composition"][composition]
        
        # Add additional details
        enhanced_specs = {
            "name": composition,
            "description": self._get_composition_description(composition),
            "applications": self._get_composition_applications(composition),
            "specifications": specs
        }
        
        return enhanced_specs
    
    def schedules(self):
        """        
        Returns piping schedules with available diameters
        """
        result = []
        for schedule in list(self.data["dimensions"].keys()):
            result.append({
                "name": schedule,
                "diameters": list(self.data["dimensions"][schedule].keys()),
                "description": self._get_schedule_description(schedule)
            })
        return result
    
    def diameters(self, schedule_key):
        """        
        Returns piping diameters with basic information for the given schedule key   
        """
        if schedule_key not in self.data["dimensions"]:
            raise TypeError("Schedule not found")
            
        diameters_dict = {}
        for diameter in list(self.data["dimensions"][schedule_key].keys()):
            specs = self.data["dimensions"][schedule_key][diameter]
            diameters_dict[diameter] = {
                "nominal_diameter": diameter,
                "external_diameter": specs["external_diameter"].magnitude,
                "units": "mm"
            }
            
        return diameters_dict
        
    def diameter_specifications(self, schedule_key, diameter_nominal):
        """        
        Returns piping data for the given schedule key and nominal diameter in mm
        """
        if schedule_key not in self.data["dimensions"]:
            raise TypeError("Schedule not found")
        if diameter_nominal not in self.data["dimensions"][schedule_key]:
            raise TypeError("Nominal diameter not found")
        return self.data["dimensions"][schedule_key][diameter_nominal]
        
    # Helper methods for additional information
    
    def _get_fitting_description(self, fitting):
        """Provides a description for the given fitting"""
        descriptions = {
            "180 degrees Return": "A U-shaped pipe fitting that changes the direction of flow by 180 degrees.",
            "90 degrees Elbow long radius": "An elbow with a large radius that changes the direction of flow by 90 degrees with reduced pressure loss.",
            "90 degrees Elbow short radius": "A compact elbow that changes the direction of flow by 90 degrees with higher pressure loss.",
            "45 degrees Elbow": "An elbow that changes the direction of flow by 45 degrees.",
            "Tee (straight run)": "A T-shaped fitting with flow continuing straight through the main line.",
            "Tee (side outlet)": "A T-shaped fitting with flow diverted through the side outlet.",
            "Tank outlet": "A fitting that connects a tank to a pipe system.",
            "Diaphragm valve": "A valve that uses a flexible diaphragm to control flow.",
            "Ball valve": "A valve with a pivoting ball to control flow with minimal pressure loss when fully open."
        }
        
        return descriptions.get(fitting, "A pipe fitting used in fluid transport systems.")
    
    def _get_fitting_usage(self, fitting):
        """Provides usage information for the given fitting"""
        usages = {
            "180 degrees Return": "Used in tight spaces where a complete reversal of flow is needed.",
            "90 degrees Elbow long radius": "Preferred for high flow rates and to minimize pressure loss in directional changes.",
            "90 degrees Elbow short radius": "Used where space is limited and flow rates are moderate.",
            "45 degrees Elbow": "Used for gradual directional changes to reduce pressure loss.",
            "Tee (straight run)": "Used to create branches while maintaining flow in the main line.",
            "Tee (side outlet)": "Used to divert a portion of flow to a branch line.",
            "Tank outlet": "Used to connect storage tanks to piping systems.",
            "Diaphragm valve": "Used for precise flow control and isolation in sanitary applications.",
            "Ball valve": "Used for quick shut-off with minimal pressure loss."
        }
        
        return usages.get(fitting, "Common in industrial and commercial piping systems.")
    
    def _get_composition_description(self, composition):
        """Provides a description for the given pipe composition"""
        descriptions = {
            "Commercial steel": "Standard carbon steel piping used in many industrial applications.",
            "Galvanized steel": "Steel pipe coated with zinc to prevent corrosion.",
            "Lightly rusted steel": "Steel pipe with minor surface oxidation.",
            "Asphalt-coated steel": "Steel pipe coated with asphalt for corrosion protection in underground applications.",
            "Steel coated with enamel, vinyl, epoxy": "Steel pipe with specialized coating for chemical resistance.",
            "Aluminum": "Lightweight metal piping with good corrosion resistance.",
            "Very rough concrete": "Concrete pipe with high surface roughness.",
            "Smooth concrete": "Concrete pipe with minimal surface roughness.",
            "Brass, copper": "Metal piping with excellent thermal conductivity and biofouling resistance.",
            "Plastics": "Synthetic polymer piping with excellent chemical resistance and lightweight properties."
        }
        
        return descriptions.get(composition, "Material used in fluid transport piping systems.")
    
    def _get_composition_applications(self, composition):
        """Provides application information for the given pipe composition"""
        applications = {
            "Commercial steel": "Water, gas, oil, steam transport in industrial settings.",
            "Galvanized steel": "Potable water systems, fire sprinkler systems, irrigation.",
            "Asphalt-coated steel": "Underground water and sewer lines.",
            "Steel coated with enamel, vinyl, epoxy": "Chemical processing, corrosive environments.",
            "Aluminum": "Compressed air, refrigeration, irrigation systems.",
            "Concrete": "Large diameter water transport, sewage, drainage systems.",
            "Brass, copper": "Potable water, heating systems, refrigeration, medical gas.",
            "Plastics": "Chemical processing, water treatment, irrigation, low-pressure applications."
        }
        
        return applications.get(composition, "Various fluid transport applications based on material properties.")
    
    def _get_schedule_description(self, schedule):
        """Provides a description for the given pipe schedule"""
        descriptions = {
            "SCH10": "Light-duty schedule with thinner walls, suitable for low-pressure applications.",
            "SCH40": "Standard-duty schedule used in most commercial and industrial applications.",
            "SCH80": "Heavy-duty schedule with thicker walls for high-pressure applications."
        }
        
        return descriptions.get(schedule, "A standardized specification for pipe dimensions.")
