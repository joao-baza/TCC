import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import pytest
from fastapi.testclient import TestClient

from app import app
from models.reactor import ReactorIsothermalHeterogeneous

client = TestClient(app)


def _reactor_payload(recycling_ratio: float = 0.0):
    return {
        "input_type": "conversion_and_kinetics",
        "components": [
            {
                "state": "liquid",
                "component_name": "A",
                "flow_rate_inlet": 0.01,
                "molar_concentration_inlet": 1000,
            },
            {
                "state": "liquid",
                "component_name": "B",
                "flow_rate_inlet": 0.0,
                "molar_concentration_inlet": 0.0,
            },
        ],
        "stoichiometric_coefficients": [-1, 1],
        "reaction_rate_params": {"k": 0.05, "reaction_orders": [1, 0]},
        "operation_conditions": {
            "initial_temperature": 300,
            "final_temperature": 300,
            "initial_pressure": 101325,
            "final_pressure": 101325,
        },
        "recycling_ratio": recycling_ratio,
        "conversion": 0.5,
    }


def _recycle_profile_payload():
    return {
        "components": [
            {
                "state": "liquid",
                "component_name": "A",
                "flow_rate_inlet": 1.2,
                "molar_concentration_inlet": 5,
            },
            {
                "state": "liquid",
                "component_name": "B",
                "flow_rate_inlet": 0.0,
                "molar_concentration_inlet": 0.0,
            },
        ],
        "stoichiometric_coefficients": [-1, 1],
        "reaction_rate_params": {"k": 0.003167435796702044, "reaction_orders": [1, 0.5]},
        "operation_conditions": {
            "initial_temperature": 300,
            "final_temperature": 450,
            "initial_pressure": 101325,
            "final_pressure": 101325,
        },
        "volume": 0.4369597326850339,
    }


def _spatial_profile_payload():
    payload = _recycle_profile_payload()
    payload["recycling_ratio"] = 0.0
    payload["axial_positions"] = [0.0, 0.25, 0.5, 1.0]
    return payload


@pytest.mark.parametrize(
    "path",
    [
        "/reactor/cstr",
        "/reactor/pfr",
    ],
)
def test_reactor_routes_expose_english_and_pt_br_aliases(path):
    response = client.post(path, json=_reactor_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["conversion"] == body["conversao"]
    assert body["flow_rate_outlet"] == body["vazao_de_saida"]
    assert body["residence_time"] == body["tempo_de_residencia"]


def test_pfr_route_returns_physical_units_for_conversion_mode_volume_and_residence_time():
    response = client.post("/reactor/pfr", json=_reactor_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["volume"]["units"] == "meter ** 3"
    assert body["residence_time"]["units"] == "second"


def test_pfr_recycle_profile_route_returns_default_sampled_points():
    response = client.post("/reactor/pfr/recycle-profile", json=_recycle_profile_payload())

    assert response.status_code == 200
    body = response.json()
    assert [point["recycling_ratio"] for point in body["points"]] == [0, 0.25, 0.5, 1, 2, 5, 10]


def test_pfr_recycle_profile_route_can_increase_conversion_with_recycle():
    response = client.post("/reactor/pfr/recycle-profile", json=_recycle_profile_payload())

    assert response.status_code == 200
    body = response.json()
    conversions = [point["conversion"]["value"] for point in body["points"]]
    assert conversions[-1] > conversions[0]


def test_pfr_spatial_profile_returns_requested_relative_volume_positions():
    reactor = ReactorIsothermalHeterogeneous()

    result = reactor.pfr_spatial_profile(_spatial_profile_payload())

    assert all(
        {"relative_volume", "conversion", "temperature", "concentrations"} <= set(station)
        for station in result["stations"]
    )
    assert [station["relative_volume"] for station in result["stations"]] == [0.0, 0.25, 0.5, 1.0]


def test_pfr_spatial_profile_reduces_reactant_concentration_toward_outlet():
    reactor = ReactorIsothermalHeterogeneous()

    result = reactor.pfr_spatial_profile(_spatial_profile_payload())

    stations = result["stations"]
    assert stations[0]["concentrations"]["A"].magnitude > stations[-1]["concentrations"]["A"].magnitude


def test_pfr_spatial_profile_outlet_matches_pfr_volume_mode_outlet_concentration():
    reactor = ReactorIsothermalHeterogeneous()
    payload = _spatial_profile_payload()

    profile = reactor.pfr_spatial_profile(payload)
    pfr_result = reactor.pfr(
        {
            **payload,
            "input_type": "volume_and_kinetics",
        }
    )

    outlet_station = profile["stations"][-1]
    assert outlet_station["concentrations"]["A"].magnitude == pytest.approx(
        pfr_result["outlet_concentrations"]["A"].magnitude
    )
