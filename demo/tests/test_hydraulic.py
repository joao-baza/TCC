import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

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
        # "Cotovelo 90° raio longo": eq_len=16D
        # "Válvula esfera": eq_len=18D
        # Total added length = (16*2 + 18*1) * D = 50 * 0.1 = 5m
        params_with_fittings = base_params.copy()
        params_with_fittings["fittings"] = [
            {"fitting": "Cotovelo 90° raio longo", "quantity": 2},
            {"fitting": "Válvula esfera", "quantity": 1}
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

    def test_head_loss_darcy_from_flow_rate_only(self, hydraulic):
        """Darcy-Weisbach accepts flow_rate alone; velocity is derived."""
        D_mm = 100
        V = 2.0
        Q = V * (3.14159265 * (D_mm / 1000) ** 2 / 4)
        params_v = {
            "method": "Darcy-Weisbach",
            "friction_factor": 0.02,
            "pipe_length": 100,
            "diameter": D_mm,
            "velocity": V,
            "fittings": [],
        }
        params_q = {**params_v, "flow_rate": Q}
        del params_q["velocity"]

        hl_v = hydraulic.head_loss(params_v)
        hl_q = hydraulic.head_loss(params_q)
        assert hl_v.magnitude == pytest.approx(hl_q.magnitude, rel=1e-6)

    def test_head_loss_hazen_from_velocity_only(self, hydraulic):
        """Hazen-Williams accepts velocity alone; flow_rate is derived."""
        D_mm = 100
        V = 2.0
        Q = V * (3.14159265 * (D_mm / 1000) ** 2 / 4)
        params_q = {
            "method": "Hazen-Williams",
            "flow_rate": Q,
            "roughness_coefficient": 140,
            "pipe_length": 100,
            "diameter": D_mm,
        }
        params_v = {**params_q, "velocity": V}
        del params_v["flow_rate"]

        hl_q = hydraulic.head_loss(params_q)
        hl_v = hydraulic.head_loss(params_v)
        assert hl_q.magnitude == pytest.approx(hl_v.magnitude, rel=1e-6)

    def test_head_loss_inconsistent_flow_velocity_raises(self, hydraulic):
        params = {
            "method": "Darcy-Weisbach",
            "friction_factor": 0.02,
            "pipe_length": 100,
            "diameter": 100,
            "velocity": 2.0,
            "flow_rate": 0.5,  # inconsistent with V and D
        }
        with pytest.raises(ValueError, match="inconsistent"):
            hydraulic.head_loss(params)

    def test_head_loss_missing_flow_and_velocity_raises(self, hydraulic):
        params = {
            "method": "Darcy-Weisbach",
            "friction_factor": 0.02,
            "pipe_length": 100,
            "diameter": 100,
        }
        with pytest.raises(ValueError, match="flow rate"):
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
        res = hydraulic.hydraulic_diameter({"shape": "rectangular", "width": 0.1, "height": 0.05})
        # 4A/P = 4(0.005)/0.3 = 0.06666 m
        assert res.magnitude == pytest.approx(0.06666666666666667, rel=1e-6)

        # Annular
        res = hydraulic.hydraulic_diameter({"shape": "annular", "outer_diameter": 0.1, "inner_diameter": 0.05})
        # Do - Di = 0.05 m
        assert res.magnitude == 0.05

    def test_get_calculated_diameter(self, hydraulic):
        # D = sqrt(4Q / pi V)
        # Q=0.01, V=1 -> D=sqrt(0.0127) ~= 0.112 m = 112mm
        res = hydraulic.get_calculated_diameter({"flow_rate": 0.01, "velocity": 1})
        assert res.magnitude > 100

    def test_build_moody_curve_points_returns_positive_log_samples(self, hydraulic):
        points = hydraulic.build_moody_curve_points(
            relative_roughness=0.0002,
            start_reynolds=4_000,
            end_reynolds=100_000,
            sample_count=8,
        )

        assert len(points) == 8
        assert points[0]["x"] == pytest.approx(4_000)
        assert points[-1]["x"] == pytest.approx(100_000)
        assert all(point["y"] > 0 for point in points)

    def test_build_system_headloss_curve_uses_method_exponent(self, hydraulic):
        points = hydraulic.build_system_headloss_curve(
            method="Hazen-Williams",
            flow_rate=0.04,
            headloss=12.5,
        )

        assert [point["x"] for point in points] == pytest.approx([0.02, 0.03, 0.04, 0.05, 0.06])
        assert points[2]["y"] == pytest.approx(12.5)
        assert points[-1]["y"] > 12.5

    def test_build_pump_curve_points_creates_shutoff_and_tail_samples(self, hydraulic):
        points = hydraulic.build_pump_curve_points(
            operating_flow_rate=0.04,
            operating_head=12.5,
            max_flow_rate=0.06,
        )

        assert len(points) == 5
        assert points[0]["x"] == pytest.approx(0.0)
        assert points[0]["y"] > 12.5
        assert points[-1]["x"] == pytest.approx(0.06)
        assert points[-1]["y"] >= 0


class TestHydraulicEdgeCases:

    @pytest.mark.parametrize("velocity", [0, -1])
    def test_reynolds_non_positive_velocity_raises(self, hydraulic, velocity):
        params = {
            "characteristic_diameter": 100,
            "velocity": velocity,
            "density": 1000,
            "dynamic_viscosity": 0.001,
        }
        with pytest.raises(ValueError, match="Reynolds number must be positive"):
            hydraulic.reynolds(params)

    def test_reynolds_negative_viscosity_raises(self, hydraulic):
        params = {
            "characteristic_diameter": 100,
            "velocity": 2,
            "density": 1000,
            "dynamic_viscosity": -0.001,
        }
        with pytest.raises(ValueError, match="Reynolds number must be positive"):
            hydraulic.reynolds(params)

    def test_head_loss_darcy_negative_friction_factor_raises(self, hydraulic):
        params = {
            "method": "Darcy-Weisbach",
            "friction_factor": -0.02,
            "pipe_length": 100,
            "diameter": 100,
            "velocity": 2,
        }
        with pytest.raises(ValueError, match="Head loss cannot be negative"):
            hydraulic.head_loss(params)

    def test_head_loss_hazen_zero_flow_raises(self, hydraulic):
        params = {
            "method": "Hazen-Williams",
            "flow_rate": 0,
            "roughness_coefficient": 140,
            "pipe_length": 100,
            "diameter": 100,
        }
        with pytest.raises(ValueError, match="Flow rate must be positive"):
            hydraulic.head_loss(params)


    def test_head_loss_invalid_method_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Invalid method"):
            hydraulic.head_loss({"method": "Unknown", "friction_factor": 0.02})

    def test_head_loss_missing_method_returns_options(self, hydraulic):
        assert hydraulic.head_loss({}) == ["Darcy-Weisbach", "Hazen-Williams"]

    def test_friction_factor_invalid_method_raises(self, hydraulic):
        params = {
            "method": "Invalid",
            "roughness": 0.05,
            "diameter": 100,
            "reynolds": 100000,
        }
        with pytest.raises(ValueError, match="Invalid friction factor method"):
            hydraulic.friction_factor(params)

    def test_friction_factor_missing_method_returns_options(self, hydraulic):
        assert hydraulic.friction_factor({}) == ["ColebrookWhite", "SwameeJain", "Haaland"]

    def test_get_calculated_diameter_zero_velocity_raises(self, hydraulic):
        with pytest.raises(ZeroDivisionError):
            hydraulic.get_calculated_diameter({"flow_rate": 0.01, "velocity": 0})

    def test_get_calculated_diameter_zero_flow_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Diameter must be positive"):
            hydraulic.get_calculated_diameter({"flow_rate": 0, "velocity": 1})

    def test_get_calculated_diameter_negative_velocity_raises(self, hydraulic):
        with pytest.raises((ValueError, TypeError)):
            hydraulic.get_calculated_diameter({"flow_rate": 0.01, "velocity": -1})

    def test_get_real_diameter_no_match_raises(self, hydraulic):
        with pytest.raises(ValueError, match="No diameter in schedule"):
            hydraulic.get_real_diameter({"calculated_diameter": 99999, "schedule": "SCH40"})

    def test_get_real_diameter_zero_picks_smallest_nominal(self, hydraulic):
        result = hydraulic.get_real_diameter({"calculated_diameter": 0, "schedule": "SCH40"})
        assert result.magnitude > 0

    def test_hydraulic_diameter_discovery_mode(self, hydraulic):
        shapes = hydraulic.hydraulic_diameter({})
        assert "circular" in shapes
        assert "circularCap" in shapes

    def test_hydraulic_diameter_annular_inner_equals_outer_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Inner diameter must be smaller"):
            hydraulic.hydraulic_diameter(
                {"shape": "annular", "outer_diameter": 0.1, "inner_diameter": 0.1}
            )

    def test_hydraulic_diameter_annular_inner_gt_outer_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Inner diameter must be smaller"):
            hydraulic.hydraulic_diameter(
                {"shape": "annular", "outer_diameter": 0.05, "inner_diameter": 0.1}
            )

    def test_hydraulic_diameter_degenerate_triangle_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Invalid triangle"):
            hydraulic.hydraulic_diameter(
                {"shape": "triangular", "side_a": 0.1, "side_b": 0.2, "side_c": 1.0}
            )

    def test_hydraulic_diameter_circular_cap_zero_height_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Height must be greater than 0"):
            hydraulic.hydraulic_diameter(
                {"shape": "circularCap", "diameter": 0.1, "height": 0}
            )

    def test_hydraulic_diameter_circular_cap_height_gt_diameter_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Height cannot be greater than diameter"):
            hydraulic.hydraulic_diameter(
                {"shape": "circularCap", "diameter": 0.05, "height": 0.06}
            )

    def test_hydraulic_diameter_invalid_shape_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Invalid shape"):
            hydraulic.hydraulic_diameter({"shape": "hexagonal", "diameter": 100})

    def test_hydraulic_diameter_rectangular_zero_dimensions(self, hydraulic):
        result = hydraulic.hydraulic_diameter({"shape": "rectangular", "width": 0, "height": 0.05})
        assert result.magnitude == 0

    def test_hydraulic_diameter_circular_zero_diameter(self, hydraulic):
        result = hydraulic.hydraulic_diameter({"shape": "circular", "diameter": 0})
        assert result.magnitude == 0

    def test_hydraulic_diameter_triangular_valid(self, hydraulic):
        """Equilateral triangle has hydraulic diameter side / sqrt(3) in meters."""
        result = hydraulic.hydraulic_diameter(
            {"shape": "triangular", "side_a": 0.1, "side_b": 0.1, "side_c": 0.1}
        )
        assert result.magnitude == pytest.approx(0.1 / (3 ** 0.5), rel=1e-6)

    def test_hydraulic_diameter_circular_cap_valid(self, hydraulic):
        """Valid circular cap (height < diameter) returns a positive diameter in meters."""
        result = hydraulic.hydraulic_diameter(
            {"shape": "circularCap", "diameter": 0.1, "height": 0.03}
        )
        assert result.magnitude == pytest.approx(0.038187, abs=1e-6)
        assert str(result.units) == "meter"

    def test_hydraulic_diameter_circular_cap_full_pipe_matches_circular(self, hydraulic):
        """A fully filled circular cap must reduce to the circular diameter in meters."""
        result = hydraulic.hydraulic_diameter(
            {"shape": "circularCap", "diameter": 1.0, "height": 1.0}
        )
        assert result.magnitude == pytest.approx(1.0, rel=1e-6)
        assert str(result.units) == "meter"


class TestHydraulicHead:

    def test_head_basic(self, hydraulic):
        """With equal pressures and velocities, head reduces to (z2-z1) + head_loss."""
        result = hydraulic.head({
            "pressure1": 101325, "pressure2": 101325,
            "elevation1": 0, "elevation2": 10,
            "velocity1": 2, "velocity2": 2,
            "density": 1000, "head_loss": 5,
        })
        assert result.magnitude == pytest.approx(15.0, rel=1e-6)

    def test_head_pressure_and_velocity_terms(self, hydraulic):
        """Higher downstream pressure and velocity both increase the head."""
        result = hydraulic.head({
            "pressure1": 100000, "pressure2": 150000,
            "elevation1": 0, "elevation2": 0,
            "velocity1": 1, "velocity2": 3,
            "density": 1000, "head_loss": 0,
        })
        # pressure term = 50000/(1000*9.81) ~= 5.097 m ; velocity term = (9-1)/(2*9.81) ~= 0.408 m
        assert result.magnitude == pytest.approx(5.505, abs=0.05)


if __name__ == "__main__":
    pytest.main([__file__])
