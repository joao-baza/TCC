import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import pytest
from fastapi.testclient import TestClient

from app import app
import routers.sizing as sizing_router

client = TestClient(app)


def test_sizing_example_returns_input_presets_only():
    response = client.get("/sizing/example")

    assert response.status_code == 200
    assert response.json() == {
        "calculated_diameter": {
            "flow_rate": 0.0166667,
            "velocity": 1.5,
        },
        "real_diameter": {
            "calculated_diameter": 118.94,
            "schedule": "SCH40",
        },
    }


def test_sizing_velocity_profile_returns_backend_owned_arrows():
    response = client.post(
        "/sizing/velocity-profile/chart",
        json={"velocity": 1.5, "diameter_mm": 126},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "Perfil de Velocidade - Duto Circular"
    assert payload["regime"] == "turbulent"
    assert payload["label"] == "Turbulento"
    assert payload["color"] == "#DC2626"
    assert payload["diameter_mm"] == 126.0
    assert payload["velocity"] == 1.5
    assert len(payload["arrows"]) == 9
    assert payload["arrows"][0]["x1"] == 55


def test_sizing_example_catalog_validation_raises_when_schedule_is_missing(monkeypatch):
    monkeypatch.setattr(sizing_router.hydraulic.piping, "schedules", lambda: [])

    with pytest.raises(RuntimeError, match="Schedule 'SCH40' not found"):
        sizing_router.validate_sizing_example_catalogs()


def test_sizing_calculated_diameter_matches_continuity_equation_example():
    response = client.post(
        "/sizing/calculated-diameter",
        json={"flow_rate": 0.0166667, "velocity": 1.5},
    )

    assert response.status_code == 200
    assert response.json() == {
        "value": pytest.approx(118.94172668506634),
        "units": "millimeter",
    }


def test_sizing_real_diameter_rounds_up_to_sch40_dn125_selection():
    response = client.post(
        "/sizing/real-diameter",
        json={"calculated_diameter": 118.94, "schedule": "SCH40"},
    )

    assert response.status_code == 200
    assert response.json() == {"value": 125, "units": "millimeter"}


@pytest.mark.parametrize(
    ("velocity", "expected_regime", "expected_label", "expected_color"),
    [
        (0.01, "laminar", "Laminar", "#2563EB"),
        (0.03, "transition", "Transição", "#D97706"),
    ],
)
def test_sizing_velocity_profile_covers_laminar_and_transition_regimes(
    velocity,
    expected_regime,
    expected_label,
    expected_color,
):
    response = client.post(
        "/sizing/velocity-profile/chart",
        json={"velocity": velocity, "diameter_mm": 100},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["regime"] == expected_regime
    assert payload["label"] == expected_label
    assert payload["color"] == expected_color
    assert payload["reynolds"] == pytest.approx(velocity * 100000)
