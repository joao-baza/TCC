
import pytest
from pint import UnitRegistry
from models.hydraulic import Hydraulic

ureg = UnitRegistry()

@pytest.fixture
def hydraulic():
    return Hydraulic()

class TestHydraulicComprehensive:

    # -------------------------------------------------------------------------
    # REYNOLDS
    # -------------------------------------------------------------------------
    def test_reynolds_dynamic(self, hydraulic):
        params = {
            "characteristic_diameter": 100, "velocity": 2, 
            "density": 1000, "dynamic_viscosity": 0.001
        }
        re = hydraulic.reynolds(params)
        # Re = (0.1 * 1000 * 2) / 0.001 = 200,000
        assert pytest.approx(re, 0.01) == 200000

    def test_reynolds_kinematic(self, hydraulic):
        params = {
            "characteristic_diameter": 100, "velocity": 2, 
            "kinematic_viscosity": 1e-6
        }
        re = hydraulic.reynolds(params)
        # Re = (0.1 * 2) / 1e-6 = 200,000
        assert pytest.approx(re, 0.01) == 200000

    def test_reynolds_invalid(self, hydraulic):
        with pytest.raises(ValueError):
            hydraulic.reynolds({"characteristic_diameter": 100}) # Missing vars

    # -------------------------------------------------------------------------
    # FRICTION FACTOR
    # -------------------------------------------------------------------------
    @pytest.mark.parametrize("method", ["ColebrookWhite", "SwameeJain", "Haaland"])
    def test_friction_factor_methods(self, hydraulic, method):
        params = {
            "diameter": 100, "roughness": 0.05, 
            "reynolds": 100000, "method": method
        }
        f = hydraulic.friction_factor(params)
        assert f.magnitude > 0
        assert f.magnitude < 0.1 # Typical range

    # -------------------------------------------------------------------------
    # HEAD LOSS
    # -------------------------------------------------------------------------
    def test_head_loss_darcy(self, hydraulic):
        params = {
            "method": "Darcy-Weisbach",
            "friction_factor": 0.02,
            "pipe_length": 100,
            "diameter": 100,
            "velocity": 2,
            "fittings": []
        }
        hl = hydraulic.head_loss(params)
        assert hl.magnitude > 0

    def test_head_loss_with_fittings(self, hydraulic):
        """Test head loss calculation including accessories (fittings)."""
        base_params = {
            "method": "Darcy-Weisbach",
            "friction_factor": 0.02,
            "pipe_length": 100,
            "diameter": 100,  # mm -> 0.1m
            "velocity": 2,
            "fittings": []
        }
        
        # 1. Calculate without fittings
        hl_base = hydraulic.head_loss(base_params)
        
        # 2. Calculate with fittings
        # "90 degrees Elbow long radius": eq_len=16D
        # "Ball valve": eq_len=18D
        # Total added length = (16*2 + 18*1) * D = 50 * 0.1 = 5m
        params_with_fittings = base_params.copy()
        params_with_fittings["fittings"] = [
            {"fitting": "90 degrees Elbow long radius", "quantity": 2},
            {"fitting": "Ball valve", "quantity": 1}
        ]
        
        hl_fittings = hydraulic.head_loss(params_with_fittings)
        
        # 3. Assertions
        assert hl_fittings.magnitude > hl_base.magnitude
        
        # Check specific increase magnitude if possible, or just strict inequality
        # Expected increase is proportional to length increase (100 -> 105m, so 5% increase)
        # using pytest.approx with some tolerance
        ratio = hl_fittings.magnitude / hl_base.magnitude
        assert pytest.approx(ratio, 0.01) == 1.05

    def test_head_loss_hazen(self, hydraulic):
        params = {
            "method": "Hazen-Williams",
            "flow_rate": 0.01,
            "roughness_coefficient": 140,
            "pipe_length": 100,
            "diameter": 100
        }
        hl = hydraulic.head_loss(params)
        assert hl.magnitude > 0

    def test_head_loss_hazen_diameter_limit(self, hydraulic):
        # Hazen-Williams requires D >= 50mm
        params = {
            "method": "Hazen-Williams",
            "flow_rate": 0.01, "roughness_coefficient": 140,
            "pipe_length": 100, "diameter": 40 # Invalid
        }
        with pytest.raises(ValueError, match="diameter must exceed 50 mm"):
            hydraulic.head_loss(params)

    # -------------------------------------------------------------------------
    # NPSH & DIAMETERS
    # -------------------------------------------------------------------------
    def test_npsh_available(self, hydraulic):
        params = {
            "manometric_pressure": 0, "atmospheric_pressure": 1.033, 
            "vapor_pressure": 0.02, "density": 1000, 
            "head_loss": 1, "pump_inlet_velocity": 1, 
            "gauge_elevation": 2
        }
        npsh = hydraulic.npsh_available(params)
        assert npsh.magnitude > 0

    def test_hydraulic_diameter_shapes(self, hydraulic):
        # Rectangular
        res = hydraulic.hydraulic_diameter({"shape": "rectangular", "width": 100, "height": 50})
        # 4A/P = 4(5000)/300 = 200/3 = 66.66
        assert pytest.approx(res.magnitude, 0.1) == 66.666

        # Annular
        res = hydraulic.hydraulic_diameter({"shape": "annular", "outer_diameter": 100, "inner_diameter": 50})
        # Do - Di = 50
        assert res.magnitude == 50

    def test_get_calculated_diameter(self, hydraulic):
        # D = sqrt(4Q / pi V)
        # Q=0.01, V=1 -> D=sqrt(0.0127) ~= 0.112 m = 112mm
        res = hydraulic.get_calculated_diameter({"flow_rate": 0.01, "velocity": 1})
        assert res.magnitude > 100
