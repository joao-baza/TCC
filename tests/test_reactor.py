import pytest
from pint import UnitRegistry
from models.reactor import ReactorIsothermalHeterogeneous

ureg = UnitRegistry()

@pytest.fixture
def reactor():
    return ReactorIsothermalHeterogeneous()

class TestReactor:
    
    @pytest.fixture
    def basic_params(self):
        """Standard valid parameters for a reactor calculation."""
        return {
            "input_type": "conversion_and_kinetics",
            "flow_rate": 10,  # m3/h
            "conversion": 0.9,
            "components": [
                {"component_name": "A", "molar_mass": 100, "molar_concentration_inlet": 10, "flow_rate_inlet": 10, "density": 1000, "state": "liquid"}
            ],
            "stoichiometric_coefficients": [-1],
            "reaction_rate_params": {"k": 0.5, "reaction_orders": [1]},
            "limiting_reagent": "A",
            "operation_conditions": {"initial_temperature": 300, "final_temperature": 300, "initial_pressure": 101325, "final_pressure": 101325},
            "reactor_type": "CSTR"
        }

    def test_determine_limiting_reagent(self, reactor, basic_params):
        """Test logic for finding limiting reagent."""
        # A: 10 mol/L * 10 m3/s (mock) / 1 = 100 relative
        # Make B limiting:
        comps = [
             {"component_name": "A", "molar_concentration_inlet": 2, "flow_rate_inlet": 1, "state": "liquid"},
             {"component_name": "B", "molar_concentration_inlet": 1, "flow_rate_inlet": 1, "state": "liquid"}
        ]
        coeffs = [-1, -2] # A + 2B -> ...
        # A: 2*1/1 = 2
        # B: 1*1/2 = 0.5 (Limiting)
        
        idx = reactor.determine_limiting_reagent({
            "components": comps,
            "stoichiometric_coefficients": coeffs,
            "operation_conditions": {} # Unused by logic but required by parser sometimes
        })
        assert idx == 1  # Index of B

    def test_impossible_conversion_fails(self, reactor):
        """Test that solver handles impossible convergence gracefully or raises Error."""
        # Using volume definition
        params = {
            "input_type": "volume_and_kinetics",
            "volume": 1e-9,  # Tiny volume
            "conversion": 0.9999, # Impossible conversion for tiny volume
            "reactor_type": "CSTR",
            "flow_rate": 100,
             "components": [
                {"component_name": "A", "molar_mass": 100, "molar_concentration_inlet": 10, "flow_rate_inlet": 10, "density": 1000, "state": "liquid"}
            ],
            "stoichiometric_coefficients": [-1],
            "reaction_rate_params": {"k": 0.1, "reaction_orders": [1]},
            "limiting_reagent": "A",
            "operation_conditions": {"initial_temperature": 300, "final_temperature": 300, "initial_pressure": 101325, "final_pressure": 101325},
        }
        
        # It should fail to converge or find root in bracket
        with pytest.raises(ValueError):
             reactor.cstr(params)

    def test_pfr_calculation(self, reactor, basic_params):
        """Test PFR calculation with basic params."""
        params = basic_params.copy()
        params["reactor_type"] = "PFR"
        params["recycling_ratio"] = 0
        # PFR volume should be different (usually smaller for same X) than CSTR result, but we just check it runs
        result = reactor.pfr(params)
        assert result["volume"] > 0

    def test_plot_conversion_vs_volume(self, reactor, basic_params):
        """Test that plotting function returns a figure."""
        # Mocking or running headless handled by matplotlib agg backend usage in source if present,
        # but here we just check it returns the tuple (fig, ax)
        params = basic_params.copy()
        params["reactor_type"] = "CSTR" # param needed for initial guess? or plot compares both?
        # The function doc says it compares CSTR and PFR.
        params["recycling_ratio_pfr"] = 0
        
        # We need to make sure params are sufficient for both.
        # It needs enough data to solve for range of volumes.
        
        fig, ax = reactor.plot_conversion_vs_volume(params)
        assert fig is not None
        assert ax is not None