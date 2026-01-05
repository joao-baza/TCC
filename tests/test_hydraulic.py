import pytest
from pint import UnitRegistry
from models.hydraulic import Hydraulic

@pytest.fixture
def hydraulic():
    return Hydraulic()

class TestHydraulic:
    
    def test_friction_factor_colebrook_normal(self, hydraulic):
        """Test Colebrook for standard turbulent flow."""
        params = {
            "method": "ColebrookWhite",
            "roughness": 0.05,
            "diameter": 100,
            "reynolds": 100000
        }
        f = hydraulic.friction_factor(params)
        assert 0.015 < f.magnitude < 0.04
        assert f.units == hydraulic.ureg.dimensionless

    def test_friction_factor_colebrook_extreme_turbulence(self, hydraulic):
        """Test Colebrook stability at very high Reynolds numbers."""
        params = {
            "method": "ColebrookWhite",
            "roughness": 0.05,
            "diameter": 100,
            "reynolds": 1e9  # Extremely turbulent
        }
        f = hydraulic.friction_factor(params)
        # For high Re, f tends to constant determined by relative roughness
        assert 0.0 < f.magnitude < 1.0
        
    def test_head_loss_darcy_valid(self, hydraulic):
        """Test simple Darcy-Weisbach head loss calculation."""
        params = {
            "method": "Darcy-Weisbach",
            "friction_factor": 0.02,
            "pipe_length": 100,
            "diameter": 50,
            "velocity": 2,
            "fittings": []
        }
        hl = hydraulic.head_loss(params)
        assert hl.magnitude > 0
        assert hl.units == hydraulic.ureg.meter

    def test_head_loss_invalid_method(self, hydraulic):
        """Ensure invalid method raises ValueError."""
        with pytest.raises(ValueError, match="Invalid method"):
            hydraulic.head_loss({"method": "InvalidOne"})

    def test_hydraulic_diameter_circular(self, hydraulic):
        """Test hydraulic diameter for circular pipe."""
        d = hydraulic.hydraulic_diameter({"shape": "circular", "diameter": 100})
        assert d.magnitude == 100
        assert d.units == hydraulic.ureg.mm

    def test_npsh_available(self, hydraulic):
        """Test NPSH calculation."""
        params = {
               "manometric_pressure": 0,
               "atmospheric_pressure": 1, 
               "vapor_pressure": 0.02,
               "specific_mass": 1000,
               "friction_factor": 1,
               "pump_inlet_velocity": 2,
               "gauge_elevation": 5
        }
        npsh = hydraulic.npsh_available(params)
        # Just sanity check it returns a value in meters
        assert npsh.units == hydraulic.ureg.meter

    def test_reynolds(self, hydraulic):
        """Test Reynolds number calculation."""
        # Dynamic viscosity
        params = {
            "characteristic_diameter": 100,
            "velocity": 2,
            "density": 1000,
            "dynamic_viscosity": 0.001
        }
        re = hydraulic.reynolds(params)
        assert re > 0

    def test_get_real_diameter(self, hydraulic):
        """Test picking real diameter."""
        params = {"calculated_diameter": 50, "schedule": "SCH40"}
        real_d = hydraulic.get_real_diameter(params)
        assert real_d.magnitude >= 50
        assert real_d.units == hydraulic.ureg.mm

    def test_get_calculated_diameter(self, hydraulic):
        """Test calculating diameter from flow."""
        params = {"flow_rate": 0.01, "velocity": 2}
        d = hydraulic.get_calculated_diameter(params)
        assert d.magnitude > 0
        assert d.units == hydraulic.ureg.mm

    def test_head(self, hydraulic):
        """Test head calculation."""
        params = {
            "pressure1": 101325,
            "pressure2": 101325,
            "elevation1": 0,
            "elevation2": 10,
            "velocity1": 2,
            "velocity2": 2,
            "velocity": 2, # for friction
            "pipe_length": 100,
            "diameter": 50,
            "specific_mass": 1000,
            "friction_factor": 0.02
        }
        # h = z1 + P1/gamma + v1^2/2g - (z2 + P2/gamma + v2^2/2g) - hf
        # Here just ensuring it runs and validates units
        h = hydraulic.head(params)
        assert h.units == hydraulic.ureg.meter
