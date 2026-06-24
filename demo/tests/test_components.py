import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import pytest
from models.components import Components

@pytest.fixture
def components():
    return Components()

class TestComponents:
    
    def test_get_property_valid(self, components):
        """Test retrieving a valid property."""
        prop = components.get_property("Water", "D", 300, 101325)
        # Density of water at 300K is roughly 997 kg/m3
        assert 900 < prop.magnitude < 1100
        
    def test_get_property_coolprop_error_caught(self, components):
        """Verify that CoolProp errors are now caught and re-raised clearly."""
        with pytest.raises(ValueError, match="CoolProp error"):
            # Impossible state (e.g., extremely low pressure where equation might fail or generic invalid input)
            # Or asking for a property of a fluid that fails calculation
            components.get_property("Water", "D", -50, 101325)

    def test_mixture_properties_valid(self, components):
        """Test mixture property calculation."""
        fractions = {"Water": 0.5, "Ethanol": 0.5}
        props = components.get_mixture_properties(fractions, 300, 101325, ["D"])
        assert "density" in props
        assert props["density"] is not None
        assert props["density"].magnitude > 0

    def test_mixture_properties_invalid_sum(self, components):
        """Test mixture with invalid mass fractions."""
        fractions = {"Water": 0.5, "Ethanol": 0.8} # Sum > 1
        with pytest.raises(ValueError, match="Sum of fluid fractions"):
             components.get_mixture_properties(fractions, 300, 101325)

    def test_list_all_components(self, components):
        """Test listing all components."""
        comps = components.list_all_components()
        assert isinstance(comps, list)
        assert len(comps) > 0
        assert "Water" in comps

    def test_get_all_properties(self, components):
        """Test retrieving all properties for a fluid."""
        props = components.get_all_properties("Water", 300, 101325)
        assert isinstance(props, dict)
        assert "density" in props
        assert "viscosity" in props

    def test_get_property_names(self, components):
        """Test retrieving property names."""
        names = components.get_property_names()
        assert isinstance(names, dict)
        assert "D" in names  # Density key

    def test_get_critical_properties(self, components):
        """Test retrieving critical properties."""
        crit = components.get_critical_properties("Water")
        assert isinstance(crit, dict)
        assert "critical_temperature" in crit
        assert crit["critical_temperature"].magnitude > 0

    def test_get_property_mixture_names(self, components):
        """Test retrieving mixture property names."""
        names = components.get_property_mixture_names()
        assert isinstance(names, dict)
        assert "D" in names


class TestComponentsEdgeCases:

    def test_invalid_fluid_raises(self, components):
        with pytest.raises(ValueError, match="Fluid 'NotAFluid' not found"):
            components.get_property("NotAFluid", "D", 300, 101325)

    def test_get_all_properties_invalid_fluid_raises(self, components):
        with pytest.raises(ValueError, match="Fluid 'NotAFluid' not found"):
            components.get_all_properties("NotAFluid", 300, 101325)

    def test_get_critical_properties_invalid_fluid_raises(self, components):
        with pytest.raises(ValueError, match="Fluid 'NotAFluid' not found"):
            components.get_critical_properties("NotAFluid")

    def test_mixture_invalid_fluid_raises(self, components):
        fractions = {"NotAFluid": 1.0}
        with pytest.raises(ValueError, match="Fluid 'NotAFluid' not found"):
            components.get_mixture_properties(fractions, 300, 101325)

    def test_mixture_zero_fraction_sum_raises(self, components):
        fractions = {"Water": 0, "Ethanol": 0}
        with pytest.raises(ValueError, match="Sum of fluid fractions should be 1.0, got 0"):
            components.get_mixture_properties(fractions, 300, 101325)

    def test_mixture_negative_fraction_sum_raises(self, components):
        fractions = {"Water": -0.5, "Ethanol": 1.5}
        with pytest.raises(ValueError, match="CoolProp mixture error"):
            components.get_mixture_properties(fractions, 300, 101325)

    def test_mixture_single_component_full_fraction(self, components):
        props = components.get_mixture_properties({"Water": 1.0}, 300, 101325, ["D"])
        assert props["density"].magnitude > 0

    def test_get_property_negative_temperature_raises(self, components):
        with pytest.raises(ValueError, match="CoolProp error"):
            components.get_property("Water", "D", -50, 101325)

    def test_get_property_zero_pressure_may_fail(self, components):
        with pytest.raises(ValueError, match="CoolProp error"):
            components.get_property("Water", "D", 300, 0)

if __name__ == "__main__":
    pytest.main([__file__])
