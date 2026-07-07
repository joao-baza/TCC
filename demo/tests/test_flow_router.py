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
    }


def test_flow_example_catalog_validation_runs_at_startup(monkeypatch):
    monkeypatch.setattr(flow_router.components_obj, "list_all_components", lambda: [])

    with pytest.raises(RuntimeError, match="Fluid 'Methane' not found"):
        flow_router.validate_flow_example_catalogs()


def test_flow_example_catalog_validation_is_registered_on_startup():
    assert flow_router.validate_flow_example_catalogs_on_startup in flow_router.router.on_startup
