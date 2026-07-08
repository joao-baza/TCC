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


def test_flow_moody_chart_endpoint_returns_axes_series_and_markers():
    response = client.post(
        "/flow/moody/chart",
        json={"reynolds": 50_000, "friction_factor": 0.0215, "roughness": 0.045},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "Ponto operacional - Diagrama de Moody"
    assert payload["axes"]["x"]["scale"] == "log"
    assert payload["axes"]["y"]["scale"] == "log"
    assert len(payload["series"]) >= 2
    assert payload["markers"]


def test_flow_moody_chart_endpoint_returns_raw_chart_model():
    response = client.post(
        "/flow/moody/chart",
        json={
            "reynolds": 50_000,
            "friction_factor": 0.0215,
            "roughness": 0.045,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "chart" not in payload
    assert payload["id"] == "moody-chart"
    assert payload["title"] == "Ponto operacional - Diagrama de Moody"
    assert payload["axes"]["x"]["scale"] == "log"
    assert payload["axes"]["y"]["scale"] == "log"
    assert len(payload["series"]) >= 3
    assert payload["markers"] == [
        {
            "id": "operating-point",
            "x": 50_000.0,
            "y": 0.0215,
            "label": "Ponto operacional",
            "color": "#dc2626",
        }
    ]


def test_flow_reynolds_regime_visualization_returns_backend_owned_ruler():
    response = client.post("/flow/reynolds/regime-visualization", json={"reynolds": 50_000})

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "Regime do escoamento"
    assert payload["domain"] == {"min": 100.0, "max": 10_000.0}
    assert [tick["value"] for tick in payload["ticks"]] == [
        100.0,
        500.0,
        1_000.0,
        2_300.0,
        4_000.0,
        6_000.0,
        8_000.0,
        10_000.0,
    ]
    assert [segment["regime"] for segment in payload["segments"]] == [
        "laminar",
        "transition",
        "turbulent",
    ]
    assert payload["marker"] == {
        "x": 720.0,
        "label": "Re = 50000",
        "status": "acima da escala",
        "regime": "turbulent",
        "regime_label": "Turbulento",
        "color": "#DC2626",
        "text_anchor": "end",
    }


def test_flow_hydraulic_diameter_preview_returns_backend_owned_geometry():
    response = client.post(
        "/flow/hydraulic-diameter/preview",
        json={"shape": "circularCap", "diameter": 0.1, "height": 0.03},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "Canal circular"
    assert payload["description"] == "Representação proporcional do canal circular com fluido."
    assert payload["view_box"] == "0 0 320 220"
    assert payload["chips"] == [
        {"label": "D", "value": "0,1"},
        {"label": "h", "value": "0,03"},
        {"label": "R", "value": "0,05"},
    ]
    filled_path = next(
        element
        for element in payload["elements"]
        if element["type"] == "path" and element["attrs"].get("fill") == "#0F5E9C"
    )
    assert filled_path["attrs"]["d"].startswith("M ")
    assert " A " in filled_path["attrs"]["d"]
    assert payload["elements"][-1] == {
        "type": "text",
        "attrs": {
            "x": 218.2,
            "y": 37.8,
            "fill": "#334155",
            "fontSize": "12",
        },
        "text": "R",
    }
