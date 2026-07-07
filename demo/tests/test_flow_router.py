import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import pytest
from fastapi.testclient import TestClient

from app import app
import routers.flow as flow_router

client = TestClient(app)


def test_flow_example_returns_transitional_reynolds_scenario():
    response = client.get("/flow/example")

    assert response.status_code == 200
    assert response.json() == {
        "metadata": {
            "fluid": "Methane",
            "pressure": 101325.0,
            "regime": "transitional",
        },
        "reynolds": {
            "characteristic_diameter": 13.843,
            "velocity": 3.923,
            "density": 0.65688,
            "dynamic_viscosity": 1.11963e-05,
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


def test_flow_example_catalog_validation_raises_when_fluid_is_missing(monkeypatch):
    monkeypatch.setattr(flow_router.components_obj, "list_all_components", lambda: [])

    with pytest.raises(RuntimeError, match="Fluid 'Methane' not found"):
        flow_router.validate_flow_example_catalogs()


def test_flow_example_catalog_validation_raises_when_composition_is_missing(monkeypatch):
    monkeypatch.setattr(flow_router.piping, "compositions", lambda: [])

    with pytest.raises(RuntimeError, match="Composition 'Aço galvanizado' not found"):
        flow_router.validate_flow_example_catalogs()


def test_flow_hydraulic_diameter_returns_meters():
    response = client.post(
        "/flow/hydraulic-diameter",
        json={"shape": "circularCap", "diameter": 1.0, "height": 1.0},
    )

    assert response.status_code == 200
    assert response.json() == {"value": 1.0, "units": "meter"}


def test_flow_hydraulic_diameter_shapes_returns_pt_br_labels():
    response = client.get("/flow/hydraulic-diameter/shapes")

    assert response.status_code == 200
    assert response.json() == [
        {"value": "circular", "label": "Circular"},
        {"value": "rectangular", "label": "Retangular"},
        {"value": "annular", "label": "Anelar"},
        {"value": "triangular", "label": "Triangular"},
        {"value": "circularCap", "label": "Canal circular"},
    ]


def test_flow_hydraulic_diameter_validation_translates_shape_labels():
    response = client.post(
        "/flow/hydraulic-diameter",
        json={"shape": "hexagonal", "diameter": 0.1},
    )

    assert response.status_code == 422
    assert "canal circular" in response.json()["detail"]
