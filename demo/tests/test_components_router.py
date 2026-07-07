import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import pytest
from fastapi import HTTPException

from routers.components_router import get_binary_vle, get_property_surface
from schemas import BinaryVLERequest, PropertySurfaceRequest


class TestComponentsBinaryVleRouter:

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
        assert response["property_label"] == "Density"
        assert response["property_units"] == "kg/m³"
        assert len(response["temperatures"]) == 5
        assert len(response["pressures"]) == 4
        assert len(response["values"]) == 4
        assert len(response["values"][0]) == 5
        assert response["value_min"] <= response["value_max"]
        assert any(value is not None for row in response["values"] for value in row)
