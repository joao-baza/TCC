import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import app
from routers.components_router import get_binary_vle, get_components_example, get_property_surface
from schemas import BinaryVLERequest, PropertySurfaceRequest

client = TestClient(app)


class TestComponentsBinaryVleRouter:

    def test_components_example_returns_input_presets_only(self):
        response = get_components_example()

        assert response["pure_fluid"]["fluid"] == "Air"
        assert response["pure_fluid"]["property_names"] == ["C", "D", "V", "Z", "M"]
        assert response["pure_fluid"]["temperature"] == pytest.approx(353.15)
        assert response["mixtures"]["fluid_fractions"] == {
            "Water": pytest.approx(0.7),
            "Ethanol": pytest.approx(0.29),
            "Methanol": pytest.approx(0.01),
        }
        assert response["ternary_diagram"]["component_a"] == "Water"
        assert response["binary_vle"]["fluid1"] == "Acetone"
        assert response["binary_vle"]["sample_count"] == 30
        assert response["phase_envelope"]["fluid"] == "R1234ze(E)"
        assert response["phase_envelope"]["sample_count"] == 40

    def test_binary_vle_diagram_returns_bubble_and_dew_points(self):
        response = get_binary_vle(
            BinaryVLERequest(
                fluid1="Water",
                fluid2="Ethanol",
                pressure=101325,
                sample_count=7,
            )
        )

        assert response["fluid1"] == "Water"
        assert response["fluid2"] == "Ethanol"
        assert response["pressure"] == 101325
        assert len(response["bubble_points"]) == 7
        assert len(response["dew_points"]) == 7
        assert response["bubble_points"][0]["liquid_fraction"] == pytest.approx(0)
        assert response["bubble_points"][-1]["liquid_fraction"] == pytest.approx(1)

    def test_binary_vle_diagram_rejects_identical_fluids(self):
        with pytest.raises(HTTPException) as exc_info:
            get_binary_vle(
                BinaryVLERequest(
                    fluid1="Water",
                    fluid2="Water",
                    pressure=101325,
                    sample_count=7,
                )
            )

        assert exc_info.value.status_code == 400
        assert "different fluids" in str(exc_info.value.detail).lower()

    def test_binary_vle_chart_endpoint_returns_raw_chart_model(self):
        binary = get_binary_vle(
            BinaryVLERequest(
                fluid1="Acetone",
                fluid2="Water",
                pressure=101325,
                sample_count=9,
            )
        )
        response = client.post(
            "/components/binary-vle/chart",
            json={
                "fluid1": "Acetone",
                "fluid2": "Water",
                "pressure": 101325,
                "sample_count": 9,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert "chart" not in payload
        assert payload["id"] == "components-binary-vle-chart"
        assert [series["id"] for series in payload["series"]] == ["bubble-curve", "dew-curve"]
        assert payload["axes"]["x"]["label"] == "Fração molar de Acetone"
        assert payload["axes"]["y"]["label"] == "Temperatura"
        assert payload["series"][0]["points"][4]["x"] == pytest.approx(
            binary["bubble_points"][4]["liquid_fraction"]
        )
        assert payload["series"][1]["points"][4]["x"] == pytest.approx(
            binary["dew_points"][4]["vapor_fraction"]
        )

    def test_ternary_chart_endpoint_returns_backend_projected_geometry(self):
        response = client.post(
            "/components/ternary-diagram/chart",
            json={
                "component_a": "Water",
                "component_b": "Ethanol",
                "component_c": "Methanol",
                "fraction_a": 0.7,
                "fraction_b": 0.2,
                "fraction_c": 0.1,
                "stream_name": "Corrente atual",
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == "components-ternary-diagram-chart"
        assert payload["component_labels"] == ["Water", "Ethanol", "Methanol"]
        assert len(payload["boundary"]) == 3
        assert len(payload["guide_lines"]) == 3
        assert payload["streams"][0]["label"] == "Corrente atual"
        assert payload["streams"][0]["summary"].startswith("Water:")

    def test_mccabe_thiele_chart_endpoint_returns_backend_stage_construction(self):
        response = client.post(
            "/components/mccabe-thiele/chart",
            json={
                "fluid1": "Acetone",
                "fluid2": "Water",
                "pressure": 101325,
                "sample_count": 9,
                "distillate_composition": 0.95,
                "bottoms_composition": 0.05,
                "feed_composition": 0.7,
                "reflux_ratio": 3,
                "q_value": 1,
                "max_stages": 10,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == "components-mccabe-thiele-chart"
        assert payload["axes"]["x"]["label"] == "x (líquido)"
        assert payload["axes"]["y"]["label"] == "y (vapor)"
        assert any(series["id"] == "equilibrium-curve" for series in payload["series"])
        assert any(series["id"] == "stage-steps" for series in payload["series"])
        assert any(marker["id"] == "xD" for marker in payload["markers"])

    def test_phase_envelope_chart_endpoint_returns_backend_projected_ts_dome(self):
        response = client.post(
            "/components/phase-envelope/chart",
            json={
                "fluid": "R1234ze(E)",
                "sample_count": 20,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == "components-phase-envelope-chart"
        assert payload["axes"]["x"]["label"] == "Entropia"
        assert payload["axes"]["y"]["label"] == "Temperatura"
        assert [series["id"] for series in payload["series"][:3]] == [
            "two-phase-region",
            "liquid-curve",
            "vapor-curve",
        ]
        assert any(marker["id"] == "triple-point" for marker in payload["markers"])
        assert any(marker["id"] == "critical-point" for marker in payload["markers"])

    def test_vapor_pressure_chart_endpoint_returns_backend_log_pressure_curve(self):
        response = client.post(
            "/components/vapor-pressure/chart",
            json={
                "fluid": "R1234ze(E)",
                "sample_count": 20,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == "components-vapor-pressure-chart"
        assert payload["axes"]["x"]["label"] == "Temperatura"
        assert payload["axes"]["y"]["scale"] == "log"
        assert payload["series"][0]["id"] == "vapor-pressure-curve"
        assert any(marker["id"] == "triple-point" for marker in payload["markers"])
        assert any(marker["id"] == "critical-point" for marker in payload["markers"])

    def test_property_surface_returns_grid_and_value_range(self):
        response = get_property_surface(
            PropertySurfaceRequest(
                fluid="Water",
                property_name="D",
                temperature_min=300,
                temperature_max=400,
                pressure_min=101325,
                pressure_max=500000,
                temperature_samples=5,
                pressure_samples=4,
            )
        )

        assert response["fluid"] == "Water"
        assert response["property_name"] == "D"
        assert response["property_label"] == "Massa específica"
        assert response["property_units"] == "kg/m³"
        assert len(response["temperatures"]) == 5
        assert len(response["pressures"]) == 4
        assert len(response["values"]) == 4
        assert len(response["values"][0]) == 5
        assert response["value_min"] <= response["value_max"]
        assert any(value is not None for row in response["values"] for value in row)

    def test_property_surface_chart_endpoint_returns_isobar_series(self):
        response = client.post(
            "/components/property-surface/chart",
            json={
                "fluid": "Water",
                "property_name": "D",
                "temperature_min": 300,
                "temperature_max": 360,
                "pressure_min": 101325,
                "pressure_max": 300000,
                "temperature_samples": 5,
                "pressure_samples": 4,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == "components-property-surface-chart"
        assert payload["fluid"] == "Water"
        assert payload["property_label"] == "Massa específica"
        assert payload["x_axis"]["label"] == "Temperatura"
        assert payload["y_axis"]["label"] == "Pressão"
        assert len(payload["cells"]) == 20
        assert len(payload["legend_stops"]) == 4
