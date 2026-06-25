import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import pytest
from pydantic import ValidationError

from schemas import (
    ReynoldsRequest,
    HydraulicDiameterRequest,
    ReactorRequest,
    ReactorPlotRequest,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _reactor_base():
    """Valid reactor payload WITHOUT the input-type-specific parameter."""
    return dict(
        input_type="conversion_and_kinetics",
        components=[dict(
            state="liquid",
            component_name="Water",
            flow_rate_inlet=1.0,
            molar_concentration_inlet=1.0,
        )],
        stoichiometric_coefficients=[-1.0],
        reaction_rate_params={"k": 0.1, "reaction_orders": [1]},
        operation_conditions={
            "initial_temperature": 298.15,
            "initial_pressure": 101325.0,
            "final_temperature": 298.15,
            "final_pressure": 101325.0,
        },
    )


def _plot_base():
    base = _reactor_base()
    base.pop("input_type")
    return base


# ---------------------------------------------------------------------------
# ReynoldsRequest.check_viscosity
# ---------------------------------------------------------------------------

class TestReynoldsRequest:

    def test_valid_with_dynamic_viscosity(self):
        req = ReynoldsRequest(
            characteristic_diameter=0.05, velocity=2.0,
            density=998.0, dynamic_viscosity=0.001,
        )
        assert req.dynamic_viscosity == 0.001

    def test_valid_with_kinematic_viscosity(self):
        req = ReynoldsRequest(
            characteristic_diameter=0.05, velocity=2.0,
            kinematic_viscosity=1e-6,
        )
        assert req.kinematic_viscosity == 1e-6

    def test_missing_both_viscosities_raises(self):
        with pytest.raises(ValidationError, match="dynamic viscosity or kinematic viscosity"):
            ReynoldsRequest(characteristic_diameter=0.05, velocity=2.0)


# ---------------------------------------------------------------------------
# HydraulicDiameterRequest validators
# ---------------------------------------------------------------------------

class TestHydraulicDiameterRequest:

    def test_invalid_shape_raises(self):
        with pytest.raises(ValidationError, match="Shape must be"):
            HydraulicDiameterRequest(shape="hexagonal")

    # --- circular ---
    def test_circular_valid(self):
        req = HydraulicDiameterRequest(shape="circular", diameter=50.0)
        assert req.diameter == 50.0

    def test_circular_missing_diameter_raises(self):
        with pytest.raises(ValidationError, match="Diameter is required for circular shape"):
            HydraulicDiameterRequest(shape="circular", diameter=None)

    # --- rectangular ---
    def test_rectangular_valid(self):
        req = HydraulicDiameterRequest(shape="rectangular", width=100.0, height=50.0)
        assert req.width == 100.0 and req.height == 50.0

    def test_rectangular_missing_width_raises(self):
        with pytest.raises(ValidationError, match="Width is required"):
            HydraulicDiameterRequest(shape="rectangular", width=None, height=50.0)

    def test_rectangular_missing_height_raises(self):
        with pytest.raises(ValidationError, match="Height is required"):
            HydraulicDiameterRequest(shape="rectangular", width=100.0, height=None)

    # --- annular ---
    def test_annular_valid(self):
        req = HydraulicDiameterRequest(shape="annular", outer_diameter=100.0, inner_diameter=50.0)
        assert req.outer_diameter == 100.0

    def test_annular_missing_outer_raises(self):
        with pytest.raises(ValidationError, match="Outer diameter is required"):
            HydraulicDiameterRequest(shape="annular", outer_diameter=None, inner_diameter=50.0)

    def test_annular_missing_inner_raises(self):
        with pytest.raises(ValidationError, match="Inner diameter is required"):
            HydraulicDiameterRequest(shape="annular", outer_diameter=100.0, inner_diameter=None)

    # --- triangular ---
    def test_triangular_valid(self):
        req = HydraulicDiameterRequest(shape="triangular", side_a=3.0, side_b=4.0, side_c=5.0)
        assert req.side_a == 3.0

    def test_triangular_missing_side_a_raises(self):
        with pytest.raises(ValidationError, match="Side A is required"):
            HydraulicDiameterRequest(shape="triangular", side_a=None, side_b=4.0, side_c=5.0)

    def test_triangular_missing_side_b_raises(self):
        with pytest.raises(ValidationError, match="Side B is required"):
            HydraulicDiameterRequest(shape="triangular", side_a=3.0, side_b=None, side_c=5.0)

    def test_triangular_missing_side_c_raises(self):
        with pytest.raises(ValidationError, match="Side C is required"):
            HydraulicDiameterRequest(shape="triangular", side_a=3.0, side_b=4.0, side_c=None)

    # --- circularCap ---
    def test_circular_cap_valid(self):
        req = HydraulicDiameterRequest(shape="circularCap", diameter=100.0, height=30.0)
        assert req.diameter == 100.0 and req.height == 30.0

    def test_circular_cap_missing_diameter_raises(self):
        with pytest.raises(ValidationError, match="Diameter is required for circular cap"):
            HydraulicDiameterRequest(shape="circularCap", diameter=None, height=30.0)

    def test_circular_cap_missing_height_raises(self):
        with pytest.raises(ValidationError, match="Height is required for circular cap"):
            HydraulicDiameterRequest(shape="circularCap", diameter=100.0, height=None)


# ---------------------------------------------------------------------------
# ReactorRequest validators
# ---------------------------------------------------------------------------

class TestReactorRequest:

    def test_valid_conversion_and_kinetics(self):
        req = ReactorRequest(**_reactor_base(), conversion=0.5)
        assert req.input_type == "conversion_and_kinetics"
        assert req.conversion == 0.5

    def test_valid_volume_and_kinetics(self):
        base = _reactor_base()
        base["input_type"] = "volume_and_kinetics"
        req = ReactorRequest(**base, volume=1.0)
        assert req.volume == 1.0

    def test_valid_residence_time_and_kinetics(self):
        base = _reactor_base()
        base["input_type"] = "residence_time_and_kinetics"
        req = ReactorRequest(**base, residence_time=10.0)
        assert req.residence_time == 10.0

    def test_invalid_input_type_raises(self):
        base = _reactor_base()
        base["input_type"] = "magic"
        with pytest.raises(ValidationError, match="Input type must be"):
            ReactorRequest(**base, conversion=0.5)

    def test_reaction_rate_params_missing_k_raises(self):
        base = _reactor_base()
        base["reaction_rate_params"] = {"reaction_orders": [1]}
        with pytest.raises(ValidationError, match="must include 'k'"):
            ReactorRequest(**base, conversion=0.5)

    def test_reaction_rate_params_missing_orders_raises(self):
        base = _reactor_base()
        base["reaction_rate_params"] = {"k": 0.1}
        with pytest.raises(ValidationError, match="must include 'reaction_orders'"):
            ReactorRequest(**base, conversion=0.5)

    def test_operation_conditions_missing_key_raises(self):
        base = _reactor_base()
        base["operation_conditions"] = {
            "initial_temperature": 298.15,
            "initial_pressure": 101325.0,
            "final_temperature": 298.15,
            # final_pressure missing
        }
        with pytest.raises(ValidationError, match="must include 'final_pressure'"):
            ReactorRequest(**base, conversion=0.5)

    def test_conversion_required_when_input_is_conversion(self):
        with pytest.raises(ValidationError, match="Conversion is required"):
            ReactorRequest(**_reactor_base())  # no conversion provided

    def test_volume_required_when_input_is_volume(self):
        base = _reactor_base()
        base["input_type"] = "volume_and_kinetics"
        with pytest.raises(ValidationError, match="Volume is required"):
            ReactorRequest(**base)  # no volume provided

    def test_residence_time_required_when_input_is_residence_time(self):
        base = _reactor_base()
        base["input_type"] = "residence_time_and_kinetics"
        with pytest.raises(ValidationError, match="Residence time is required"):
            ReactorRequest(**base)  # no residence_time provided


# ---------------------------------------------------------------------------
# ReactorPlotRequest validators
# ---------------------------------------------------------------------------

class TestReactorPlotRequest:

    def test_valid_defaults_max_conversion(self):
        req = ReactorPlotRequest(**_plot_base())
        assert req.max_conversion == pytest.approx(0.99999)

    def test_reaction_rate_params_missing_k_raises(self):
        base = _plot_base()
        base["reaction_rate_params"] = {"reaction_orders": [1]}
        with pytest.raises(ValidationError, match="must include 'k'"):
            ReactorPlotRequest(**base)

    def test_reaction_rate_params_missing_orders_raises(self):
        base = _plot_base()
        base["reaction_rate_params"] = {"k": 0.1}
        with pytest.raises(ValidationError, match="must include 'reaction_orders'"):
            ReactorPlotRequest(**base)

    def test_operation_conditions_missing_key_raises(self):
        base = _plot_base()
        base["operation_conditions"] = {
            "initial_temperature": 298.15,
            "initial_pressure": 101325.0,
            "final_temperature": 298.15,
            # final_pressure missing
        }
        with pytest.raises(ValidationError, match="must include 'final_pressure'"):
            ReactorPlotRequest(**base)


if __name__ == "__main__":
    pytest.main([__file__])
