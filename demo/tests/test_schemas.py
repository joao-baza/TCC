import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import pytest
from pydantic import ValidationError

from schemas import (
    AxisModel,
    ChartMetadataModel,
    ChartModel,
    ComponentRequest,
    ComponentsExampleResponse,
    FlowExampleResponse,
    FlowChartResponse,
    PipingExampleResponse,
    PumpExampleResponse,
    ReynoldsRequest,
    HydraulicDiameterRequest,
    SeriesModel,
    SizingExampleResponse,
    HeadLossRequest,
    ReactorRequest,
    ReactorRecycleProfileRequest,
    ReactorSpatialProfileRequest,
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
# HeadLossRequest
# ---------------------------------------------------------------------------

class TestHeadLossRequest:

    def test_valid_darcy_with_velocity_only(self):
        req = HeadLossRequest(
            method="Darcy-Weisbach",
            pipe_length=100,
            diameter=100,
            velocity=2.0,
            friction_factor=0.02,
        )
        assert req.velocity == 2.0
        assert req.flow_rate is None

    def test_valid_hazen_with_flow_rate_only(self):
        req = HeadLossRequest(
            method="Hazen-Williams",
            pipe_length=100,
            diameter=100,
            flow_rate=0.01,
            roughness_coefficient=140,
        )
        assert req.flow_rate == 0.01
        assert req.velocity is None

    def test_negative_velocity_rejected(self):
        with pytest.raises(ValidationError):
            HeadLossRequest(
                method="Darcy-Weisbach",
                pipe_length=100,
                diameter=100,
                velocity=-1.0,
                friction_factor=0.02,
            )


# ---------------------------------------------------------------------------
# HydraulicDiameterRequest validators
# ---------------------------------------------------------------------------

class TestHydraulicDiameterRequest:

    def test_invalid_shape_raises(self):
        with pytest.raises(ValidationError, match="Shape must be"):
            HydraulicDiameterRequest(shape="hexagonal")

    # --- circular ---
    def test_circular_valid(self):
        req = HydraulicDiameterRequest(shape="circular", diameter=0.5)
        assert req.diameter == 0.5

    def test_circular_missing_diameter_raises(self):
        with pytest.raises(ValidationError, match="Diameter is required for circular shape"):
            HydraulicDiameterRequest(shape="circular", diameter=None)

    # --- rectangular ---
    def test_rectangular_valid(self):
        req = HydraulicDiameterRequest(shape="rectangular", width=0.1, height=0.05)
        assert req.width == 0.1 and req.height == 0.05

    def test_rectangular_missing_width_raises(self):
        with pytest.raises(ValidationError, match="Width is required"):
            HydraulicDiameterRequest(shape="rectangular", width=None, height=50.0)

    def test_rectangular_missing_height_raises(self):
        with pytest.raises(ValidationError, match="Height is required"):
            HydraulicDiameterRequest(shape="rectangular", width=100.0, height=None)

    # --- annular ---
    def test_annular_valid(self):
        req = HydraulicDiameterRequest(shape="annular", outer_diameter=0.1, inner_diameter=0.05)
        assert req.outer_diameter == 0.1

    def test_annular_missing_outer_raises(self):
        with pytest.raises(ValidationError, match="Outer diameter is required"):
            HydraulicDiameterRequest(shape="annular", outer_diameter=None, inner_diameter=50.0)

    def test_annular_missing_inner_raises(self):
        with pytest.raises(ValidationError, match="Inner diameter is required"):
            HydraulicDiameterRequest(shape="annular", outer_diameter=100.0, inner_diameter=None)

    # --- triangular ---
    def test_triangular_valid(self):
        req = HydraulicDiameterRequest(shape="triangular", side_a=0.3, side_b=0.4, side_c=0.5)
        assert req.side_a == 0.3

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
        req = HydraulicDiameterRequest(shape="circularCap", diameter=1.0, height=0.3)
        assert req.diameter == 1.0 and req.height == 0.3

    def test_circular_cap_missing_diameter_raises(self):
        with pytest.raises(ValidationError, match="Diameter is required for circular cap"):
            HydraulicDiameterRequest(shape="circularCap", diameter=None, height=30.0)

    def test_circular_cap_missing_height_raises(self):
        with pytest.raises(ValidationError, match="Height is required for circular cap"):
            HydraulicDiameterRequest(shape="circularCap", diameter=100.0, height=None)


# ---------------------------------------------------------------------------
# Worked example response models
# ---------------------------------------------------------------------------

class TestWorkedExampleResponseModels:

    def test_piping_example_response_validates(self):
        response = PipingExampleResponse.model_validate(
            {
                "composition": "Aço galvanizado",
                "schedule": "SCH40",
                "diameter": 125,
                "fitting": "Válvula de esfera",
            }
        )

        assert response.model_dump() == {
            "composition": "Aço galvanizado",
            "schedule": "SCH40",
            "diameter": 125.0,
            "fitting": "Válvula de esfera",
        }

    def test_sizing_example_response_validates(self):
        response = SizingExampleResponse.model_validate(
            {
                "calculated_diameter": {
                    "flow_rate": 0.0166667,
                    "velocity": 1.5,
                },
                "real_diameter": {
                    "calculated_diameter": 118.94,
                    "schedule": "SCH40",
                },
            }
        )

        assert response.calculated_diameter.flow_rate == pytest.approx(0.0166667)
        assert response.real_diameter.schedule == "SCH40"


class TestReactorSchemas:

    def test_component_request_documents_molar_concentration_in_mol_per_cubic_meter(self):
        description = ComponentRequest.model_fields["molar_concentration_inlet"].description

        assert description == "Molar concentration inlet in mol/m³"

    def test_flow_example_response_validates(self):
        response = FlowExampleResponse.model_validate(
            {
                "metadata": {
                    "fluid": "Methane",
                    "pressure": 101325,
                    "regime": "transitional",
                },
                "reynolds": {
                    "characteristic_diameter": 13.843,
                    "velocity": 3.923,
                    "density": 0.65688,
                    "dynamic_viscosity": 0.0000111963,
                },
                "friction": {
                    "method": "SwameeJain",
                    "roughness_source": "composition",
                    "composition": "Aço galvanizado",
                    "diameter_source": "custom",
                    "custom_diameter": 13.843,
                },
                "hydraulic_diameter": {
                    "shape": "circularCap",
                    "diameter": 0.125,
                    "height": 0.08333,
                },
            }
        )

        assert response.metadata.fluid == "Methane"
        assert response.friction.method == "SwameeJain"
        assert response.hydraulic_diameter.shape == "circularCap"

    def test_pump_example_response_validates(self):
        response = PumpExampleResponse.model_validate(
            {
                "headloss": {
                    "method": "Darcy-Weisbach",
                    "pipe_length": 100,
                    "diameter": 125,
                    "flow_rate": 0.04,
                    "velocity": 3.259493234522017,
                    "reynolds": 3186.1046722863807,
                    "friction_factor": 0.04495094389484752,
                    "friction_method": "SwameeJain",
                    "composition": "Aço galvanizado",
                    "fittings": [
                        {"fitting": "Cotovelo 45°", "quantity": 5},
                        {"fitting": "Saída de tanque", "quantity": 1},
                        {"fitting": "Válvula de esfera", "quantity": 2},
                    ],
                },
                "npsh": {
                    "manometric_pressure": 0,
                    "atmospheric_pressure": 1.033,
                    "vapor_pressure": 0.023,
                    "density": 1000,
                    "friction_factor": 10,
                    "pump_inlet_velocity": 1.5,
                    "gauge_elevation": 3,
                    "required": 3,
                },
                "head": {
                    "pressure1": 101325,
                    "pressure2": 101325,
                    "elevation1": 0,
                    "elevation2": 5,
                    "velocity1": 0,
                    "velocity2": 3,
                    "density": 1000,
                    "friction_factor": 2.55887,
                },
            }
        )

        assert response.headloss.friction_method == "SwameeJain"
        assert len(response.headloss.fittings) == 3
        assert response.npsh.required == pytest.approx(3)

    def test_components_example_response_validates(self):
        response = ComponentsExampleResponse.model_validate(
            {
                "pure_fluid": {
                    "fluid": "Air",
                    "property_names": ["C", "D", "V", "Z", "M"],
                    "temperature": 353.15,
                    "pressure": 101325,
                },
                "mixtures": {
                    "fluid_fractions": {
                        "Water": 0.7,
                        "Ethanol": 0.29,
                        "Methanol": 0.01,
                    },
                    "temperature": 303.15,
                    "pressure": 101325,
                    "properties": ["D", "M", "V", "C"],
                },
                "ternary_diagram": {
                    "component_a": "Water",
                    "component_b": "Ethanol",
                    "component_c": "Methanol",
                    "fraction_a": 0.7,
                    "fraction_b": 0.29,
                    "fraction_c": 0.1,
                },
                "binary_vle": {
                    "fluid1": "Acetone",
                    "fluid2": "Water",
                    "pressure": 101325,
                    "sample_count": 30,
                },
                "mccabe_thiele": {
                    "distillate_composition": 0.95,
                    "bottoms_composition": 0.05,
                    "feed_composition": 0.7,
                    "reflux_ratio": 3,
                    "q_value": 1,
                    "max_stages": 10,
                },
                "property_surface": {
                    "fluid": "Ethanol",
                    "property_name": "C",
                    "temperature_min": 263.15,
                    "temperature_max": 383.15,
                    "pressure_min": 50662.5,
                    "pressure_max": 101326,
                    "temperature_samples": 20,
                    "pressure_samples": 20,
                },
                "phase_envelope": {
                    "fluid": "R1234ze(E)",
                    "sample_count": 40,
                },
            }
        )

        assert response.pure_fluid.fluid == "Air"
        assert response.binary_vle.sample_count == 30
        assert response.phase_envelope.sample_count == 40


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


class TestReactorRecycleProfileRequest:

    def test_valid_defaults_recycle_ratios(self):
        req = ReactorRecycleProfileRequest(**_plot_base(), volume=1.0)

        assert req.volume == pytest.approx(1.0)
        assert req.recycle_ratios == [0, 0.25, 0.5, 1, 2, 5, 10]


class TestReactorSpatialProfileRequest:

    def test_reactor_spatial_profile_request_accepts_axial_positions(self):
        payload = ReactorSpatialProfileRequest(
            components=[
                {
                    "state": "liquid",
                    "component_name": "Water",
                    "flow_rate_inlet": 1.2,
                    "molar_concentration_inlet": 5000,
                },
                {
                    "state": "liquid",
                    "component_name": "Ethanol",
                    "flow_rate_inlet": 0.0,
                    "molar_concentration_inlet": 0.0,
                },
            ],
            stoichiometric_coefficients=[-1, 1],
            reaction_rate_params={"k": 0.5, "reaction_orders": [1, 0]},
            operation_conditions={
                "initial_temperature": 300,
                "final_temperature": 450,
                "initial_pressure": 101325,
                "final_pressure": 101325,
            },
            volume=9.6,
            recycling_ratio=2.0,
            axial_positions=[0.0, 0.25, 0.5, 0.75, 1.0],
        )

        assert payload.axial_positions == [0.0, 0.25, 0.5, 0.75, 1.0]

    def test_reactor_spatial_profile_request_rejects_axial_positions_below_zero(self):
        with pytest.raises(ValidationError, match="Axial positions must be between 0 and 1"):
            ReactorSpatialProfileRequest(
                components=[
                    {
                        "state": "liquid",
                        "component_name": "Water",
                        "flow_rate_inlet": 1.2,
                        "molar_concentration_inlet": 5000,
                    }
                ],
                stoichiometric_coefficients=[-1],
                reaction_rate_params={"k": 0.5, "reaction_orders": [1]},
                operation_conditions={
                    "initial_temperature": 300,
                    "final_temperature": 450,
                    "initial_pressure": 101325,
                    "final_pressure": 101325,
                },
                volume=9.6,
                recycling_ratio=2.0,
                axial_positions=[-0.1, 0.5, 1.0],
            )

    def test_reactor_spatial_profile_request_rejects_axial_positions_above_one(self):
        with pytest.raises(ValidationError, match="Axial positions must be between 0 and 1"):
            ReactorSpatialProfileRequest(
                components=[
                    {
                        "state": "liquid",
                        "component_name": "Water",
                        "flow_rate_inlet": 1.2,
                        "molar_concentration_inlet": 5000,
                    }
                ],
                stoichiometric_coefficients=[-1],
                reaction_rate_params={"k": 0.5, "reaction_orders": [1]},
                operation_conditions={
                    "initial_temperature": 300,
                    "final_temperature": 450,
                    "initial_pressure": 101325,
                    "final_pressure": 101325,
                },
                volume=9.6,
                recycling_ratio=2.0,
                axial_positions=[0.0, 0.5, 1.1],
            )

    def test_reactor_spatial_profile_request_rejects_unsorted_axial_positions(self):
        with pytest.raises(ValidationError, match="Axial positions must be sorted"):
            ReactorSpatialProfileRequest(
                components=[
                    {
                        "state": "liquid",
                        "component_name": "Water",
                        "flow_rate_inlet": 1.2,
                        "molar_concentration_inlet": 5000,
                    }
                ],
                stoichiometric_coefficients=[-1],
                reaction_rate_params={"k": 0.5, "reaction_orders": [1]},
                operation_conditions={
                    "initial_temperature": 300,
                    "final_temperature": 450,
                    "initial_pressure": 101325,
                    "final_pressure": 101325,
                },
                volume=9.6,
                recycling_ratio=2.0,
                axial_positions=[0.0, 0.75, 0.5, 1.0],
            )

    def test_reactor_spatial_profile_request_rejects_too_few_axial_positions(self):
        with pytest.raises(ValidationError):
            ReactorSpatialProfileRequest(
                components=[
                    {
                        "state": "liquid",
                        "component_name": "Water",
                        "flow_rate_inlet": 1.2,
                        "molar_concentration_inlet": 5000,
                    }
                ],
                stoichiometric_coefficients=[-1],
                reaction_rate_params={"k": 0.5, "reaction_orders": [1]},
                operation_conditions={
                    "initial_temperature": 300,
                    "final_temperature": 450,
                    "initial_pressure": 101325,
                    "final_pressure": 101325,
                },
                volume=9.6,
                recycling_ratio=2.0,
                axial_positions=[0.0],
            )


class TestChartSchemas:

    def test_chart_model_accepts_axes_series_and_metadata(self):
        chart = ChartModel(
            id="moody",
            title="Moody Chart",
            axes={
                "x": AxisModel(
                    scale="log",
                    label="Re",
                    units="adimensional",
                    domain={"min": 1_000, "max": 1_000_000},
                    ticks=[1_000, 10_000, 100_000, 1_000_000],
                    major_ticks=[1_000, 10_000, 100_000, 1_000_000],
                ),
                "y": AxisModel(
                    scale="linear",
                    label="f",
                    domain={"min": 0.01, "max": 0.08},
                    ticks=[0.01, 0.03, 0.05, 0.08],
                ),
            },
            series=[
                SeriesModel(
                    id="curve",
                    name="Curva",
                    kind="line",
                    points=[{"x": 1_000, "y": 0.06}, {"x": 10_000, "y": 0.03}],
                )
            ],
            metadata=ChartMetadataModel(version="1.0", units={"x": "adimensional", "y": "adimensional"}),
        )

        assert chart.axes["x"].scale == "log"
        assert chart.axes["x"].domain.min == 1_000
        assert chart.series[0].points[0].x == 1_000
        assert chart.metadata.version == "1.0"

    def test_axis_model_rejects_malformed_domain_shape(self):
        with pytest.raises(ValidationError):
            AxisModel(
                scale="linear",
                label="f",
                domain={"minimum": 0.01, "maximum": 0.08},
                ticks=[0.01, 0.03, 0.05, 0.08],
            )

    def test_series_model_rejects_points_missing_y(self):
        with pytest.raises(ValidationError):
            SeriesModel(
                id="curve",
                name="Curva",
                kind="line",
                points=[{"x": 1_000}],
            )

    def test_flow_chart_response_wraps_chart_payload(self):
        payload = FlowChartResponse(
            chart=ChartModel(
                id="moody",
                title="Moody Chart",
                axes={
                    "x": AxisModel(
                        scale="log",
                        label="Re",
                        domain={"min": 1_000, "max": 1_000_000},
                        ticks=[1_000, 10_000, 100_000, 1_000_000],
                    ),
                    "y": AxisModel(
                        scale="linear",
                        label="f",
                        domain={"min": 0.01, "max": 0.08},
                        ticks=[0.01, 0.03, 0.05, 0.08],
                    ),
                },
                series=[
                    SeriesModel(
                        id="curve",
                        name="Curva",
                        kind="line",
                        points=[{"x": 1_000, "y": 0.06}],
                    )
                ],
                metadata=ChartMetadataModel(version="1.0"),
            )
        )

        assert payload.chart.id == "moody"
        assert payload.chart.title == "Moody Chart"


if __name__ == "__main__":
    pytest.main([__file__])
