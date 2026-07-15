import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import pytest
from fastapi.testclient import TestClient

from app import app
import routers.piping as piping_router

client = TestClient(app)


def test_piping_example_returns_input_presets_only():
    response = client.get("/piping/example")

    assert response.status_code == 200
    assert response.json() == {
        "composition": "Aço galvanizado",
        "schedule": "SCH40",
        "diameter": 125.0,
        "fitting": "Válvula esfera",
    }


def test_piping_example_catalog_validation_raises_when_schedule_is_missing(monkeypatch):
    monkeypatch.setattr(piping_router.piping, "schedules", lambda: [])

    with pytest.raises(RuntimeError, match="Schedule da tubulação 'SCH40' não encontrado"):
        piping_router.validate_piping_example_catalogs()


def test_piping_compositions_return_catalog_options():
    response = client.get("/piping/compositions")

    assert response.status_code == 200
    options = response.json()
    assert {"value": "Aço galvanizado", "label": "Aço galvanizado"} in options


def test_piping_composition_specifications_return_roughness_data():
    response = client.get("/piping/composition/Aço galvanizado")

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "Aço galvanizado"
    assert payload["specifications"]["roughness"] == {
        "value": 0.16,
        "units": "millimeter",
    }
    assert payload["specifications"]["roughness_coefficient"]["value"] == 125


def test_piping_schedule_40_exposes_nominal_and_dimensional_data_for_dn125():
    response = client.get("/piping/schedule/SCH40/diameters")

    assert response.status_code == 200
    payload = response.json()
    assert payload["125"] == {
        "nominal_diameter": 125,
        "external_diameter": 141.3,
        "units": "mm",
    }


def test_piping_schedule_40_dn125_specifications_match_example_selection():
    response = client.get("/piping/schedule/SCH40/diameter/125")

    assert response.status_code == 200
    payload = response.json()
    assert payload["external_diameter"] == {"value": 141.3, "units": "millimeter"}
    assert payload["thickness"] == {"value": 6.55, "units": "millimeter"}
    assert payload["weight"]["value"] == pytest.approx(21.77)


def test_piping_fitting_specifications_return_equivalent_length_data():
    response = client.get("/piping/fitting/Válvula esfera")

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "Válvula esfera"
    assert payload["specifications"]["equivalentLength"] == {
        "value": 18,
        "units": "dimensionless",
    }
