import os
import sys
import math

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


def _unsorted_spatial_profile_payload():
    payload = _spatial_profile_payload()
    payload["axial_positions"] = [0.0, 0.75, 0.5, 1.0]
    return payload


def _levenspiel_payload():
    payload = _reactor_payload()
    payload.pop("input_type")
    payload.pop("conversion")
    payload["max_conversion"] = 0.85
    payload["cstr_conversion"] = 0.5
    payload["pfr_conversion"] = 0.5
    return payload


def _arrhenius_chart_payload():
    return {
        "activation_energy": 75_000,
        "reference_temperature": 350,
        "reference_rate_constant": 0.5,
        "min_temperature": 300,
        "max_temperature": 420,
    }


def _profile_chart_payload():
    payload = _recycle_profile_payload()
    payload["recycling_ratio"] = 0.5
    payload["axial_positions"] = [0.0, 0.25, 0.5, 0.75, 1.0]
    return payload


def _recycle_spatial_profile_payload():
    payload = _recycle_profile_payload()
    payload["recycling_ratio"] = 0.5
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


def test_cstr_first_order_design_matches_analytical_residence_time_and_volume():
    payload = _reactor_payload()
    payload["conversion"] = 0.8

    response = client.post("/reactor/cstr", json=payload)

    assert response.status_code == 200
    body = response.json()
    expected_tau = payload["conversion"] / (
        payload["reaction_rate_params"]["k"] * (1 - payload["conversion"])
    )
    expected_volume = payload["components"][0]["flow_rate_inlet"] * expected_tau
    assert body["residence_time"]["value"] == pytest.approx(expected_tau)
    assert body["volume"]["value"] == pytest.approx(expected_volume)


def test_pfr_first_order_design_matches_analytical_residence_time_and_volume():
    payload = _reactor_payload()
    payload["conversion"] = 0.8

    response = client.post("/reactor/pfr", json=payload)

    assert response.status_code == 200
    body = response.json()
    expected_tau = -math.log(1 - payload["conversion"]) / payload["reaction_rate_params"]["k"]
    expected_volume = payload["components"][0]["flow_rate_inlet"] * expected_tau
    assert body["residence_time"]["value"] == pytest.approx(expected_tau)
    assert body["volume"]["value"] == pytest.approx(expected_volume)


def test_higher_temperature_reduces_required_volume_for_same_conversion():
    cold_payload = _reactor_payload()
    hot_payload = _reactor_payload()

    cold_payload["conversion"] = 0.8
    hot_payload["conversion"] = 0.8
    cold_payload["reaction_rate_params"]["k"] = 0.02
    hot_payload["reaction_rate_params"]["k"] = 0.08

    cold = client.post("/reactor/pfr", json=cold_payload)
    hot = client.post("/reactor/pfr", json=hot_payload)

    assert cold.status_code == 200
    assert hot.status_code == 200
    assert hot.json()["volume"]["value"] < cold.json()["volume"]["value"]
    assert hot.json()["residence_time"]["value"] < cold.json()["residence_time"]["value"]


def test_pfr_requires_less_volume_than_cstr_for_same_first_order_case():
    payload = _reactor_payload()
    payload["conversion"] = 0.8

    cstr = client.post("/reactor/cstr", json=payload)
    pfr = client.post("/reactor/pfr", json=payload)

    assert cstr.status_code == 200
    assert pfr.status_code == 200
    assert pfr.json()["volume"]["value"] < cstr.json()["volume"]["value"]
    assert pfr.json()["residence_time"]["value"] < cstr.json()["residence_time"]["value"]


def test_selected_recycle_ratios_increase_required_pfr_volume_in_current_model():
    baseline = _reactor_payload(recycling_ratio=0.0)
    mild_recycle = _reactor_payload(recycling_ratio=0.5)
    strong_recycle = _reactor_payload(recycling_ratio=2.0)

    baseline["conversion"] = 0.95
    mild_recycle["conversion"] = 0.95
    strong_recycle["conversion"] = 0.95

    result_0 = client.post("/reactor/pfr", json=baseline).json()
    result_05 = client.post("/reactor/pfr", json=mild_recycle).json()
    result_2 = client.post("/reactor/pfr", json=strong_recycle).json()

    assert result_05["volume"]["value"] >= result_0["volume"]["value"]
    assert result_2["volume"]["value"] >= result_05["volume"]["value"]


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


def test_pfr_spatial_profile_route_returns_serialized_backend_stations():
    response = client.post("/reactor/pfr/spatial-profile", json=_profile_chart_payload())

    assert response.status_code == 200
    payload = response.json()
    assert [station["relative_volume"] for station in payload["stations"]] == [0.0, 0.25, 0.5, 0.75, 1.0]
    assert payload["stations"][0]["concentrations"]["A"]["units"] == "mole / meter ** 3"
    assert payload["stations"][-1]["temperature"]["value"] == pytest.approx(450.0)


def test_reactor_levenspiel_chart_endpoint_returns_raw_chart_model():
    response = client.post("/reactor/levenspiel/chart", json=_levenspiel_payload())

    assert response.status_code == 200
    payload = response.json()
    assert "chart" not in payload
    assert payload["id"] == "reactor-levenspiel-chart"
    assert payload["axes"]["x"]["label"] == "Conversão"
    assert payload["axes"]["x"]["units"] == "adimensional"
    assert payload["axes"]["x"]["domain"] == {"min": 0.0, "max": 1.0}
    assert payload["axes"]["x"]["ticks"][0] == 0.0
    assert payload["axes"]["x"]["ticks"][-1] == 1.0
    assert payload["axes"]["y"]["label"] == "Volume"
    assert payload["axes"]["y"]["units"] == "m³"
    assert payload["metadata"]["units"] == {"x": "adimensional", "y": "m³"}
    max_conversion = max(
        point["x"] for series in payload["series"] for point in series["points"]
    )
    max_volume = max(point["y"] for series in payload["series"] for point in series["points"])
    assert max_conversion <= payload["axes"]["x"]["domain"]["max"]
    assert max_volume <= payload["axes"]["y"]["domain"]["max"]
    assert [series["id"] for series in payload["series"]] == ["cstr-volume", "pfr-volume"]
    assert [marker["id"] for marker in payload["markers"]] == [
        "cstr-operating-point",
        "pfr-operating-point",
    ]


@pytest.mark.parametrize("recycling_ratio", [0, None])
def test_reactor_levenspiel_chart_subtitle_keeps_no_recycle_text_for_empty_ratio(
    recycling_ratio,
):
    payload = _levenspiel_payload()
    payload["recycling_ratio"] = recycling_ratio

    response = client.post("/reactor/levenspiel/chart", json=payload)

    assert response.status_code == 200
    assert response.json()["subtitle"] == (
        "Volume necessário em função da conversão para a mesma cinética sem reciclo."
    )


def test_reactor_levenspiel_chart_subtitle_reports_positive_recycle_ratio():
    payload = _levenspiel_payload()
    payload["recycling_ratio"] = 0.5

    response = client.post("/reactor/levenspiel/chart", json=payload)

    assert response.status_code == 200
    assert response.json()["subtitle"] == (
        "Volume necessário em função da conversão para a mesma cinética, "
        "com razão de reciclo R = 0,5 no PFR."
    )


@pytest.mark.parametrize(
    ("path", "payload_factory"),
    [
        ("/reactor/pfr", _reactor_payload),
        ("/reactor/levenspiel/chart", _levenspiel_payload),
    ],
)
def test_reactor_routes_reject_negative_recycle_ratio(path, payload_factory):
    payload = payload_factory()
    payload["recycling_ratio"] = -0.5

    response = client.post(path, json=payload)

    assert response.status_code == 422
    assert "recycling_ratio" in response.json()["detail"]


def test_reactor_pfr_profile_chart_endpoint_returns_component_and_temperature_series():
    response = client.post("/reactor/pfr/profile/chart", json=_profile_chart_payload())

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "reactor-pfr-profile-chart"
    assert payload["axes"]["x"]["label"] == "Posição relativa no reator"
    assert payload["axes"]["y"]["units"] == "mol/m³"
    assert [series["id"] for series in payload["series"]] == [
        "component-a",
        "component-b",
        "temperature-profile",
    ]
    assert payload["markers"] == []


def test_reactor_pfr_recycle_profile_chart_endpoint_returns_conversion_curve():
    response = client.post("/reactor/pfr/recycle-profile/chart", json=_recycle_profile_payload())

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "reactor-pfr-recycle-profile-chart"
    assert payload["axes"]["x"]["label"] == "Razão de reciclo"
    assert payload["axes"]["x"]["domain"]["min"] == 0.0
    assert payload["axes"]["y"]["label"] == "Conversão"
    assert [series["id"] for series in payload["series"]] == ["conversion-vs-recycle"]
    assert payload["markers"][0]["x"] == pytest.approx(0.0)


def test_reactor_arrhenius_chart_endpoint_returns_raw_chart_model():
    response = client.post("/reactor/arrhenius/chart", json=_arrhenius_chart_payload())

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "reactor-arrhenius-chart"
    assert payload["axes"]["x"]["label"] == "1000 / T"
    assert payload["axes"]["y"]["label"] == "ln(k)"
    assert [series["id"] for series in payload["series"]] == ["arrhenius-curve"]
    assert payload["markers"][0]["id"] == "reference-point"
    assert payload["markers"][0]["color"] == "#dc2626"


def test_reactor_arrhenius_chart_preserves_reference_point_and_temperature_trend():
    payload = _arrhenius_chart_payload()

    response = client.post("/reactor/arrhenius/chart", json=payload)

    assert response.status_code == 200
    chart = response.json()
    points = chart["series"][0]["points"]
    reference = chart["markers"][0]
    assert reference["x"] == pytest.approx(1000 / payload["reference_temperature"])
    assert reference["y"] == pytest.approx(math.log(payload["reference_rate_constant"]))
    assert points[0]["x"] > points[-1]["x"]
    assert points[0]["y"] < points[-1]["y"]


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


def test_pfr_spatial_profile_first_station_matches_inlet_concentrations_without_recycle():
    reactor = ReactorIsothermalHeterogeneous()

    profile = reactor.pfr_spatial_profile(_spatial_profile_payload())

    first_station = profile["stations"][0]
    assert first_station["temperature"].to("kelvin").magnitude == pytest.approx(300.0)
    assert first_station["concentrations"]["A"].to("mol/m^3").magnitude == pytest.approx(5.0)
    assert first_station["concentrations"]["B"].to("mol/m^3").magnitude == pytest.approx(0.0)


def test_pfr_spatial_profile_recycle_case_starts_at_mixer_inlet_conversion():
    reactor = ReactorIsothermalHeterogeneous()

    profile = reactor.pfr_spatial_profile(_recycle_spatial_profile_payload())

    first_station = profile["stations"][0]
    expected_inlet_conversion = (
        0.5 / (0.5 + 1.0) * profile["outlet_conversion"].magnitude
    )
    assert first_station["conversion"].magnitude == pytest.approx(expected_inlet_conversion)


def test_pfr_spatial_profile_rejects_unsorted_axial_positions():
    reactor = ReactorIsothermalHeterogeneous()

    with pytest.raises(ValueError, match="axial_positions must be sorted"):
        reactor.pfr_spatial_profile(_unsorted_spatial_profile_payload())


def test_pfr_spatial_profile_rejects_negative_recycling_ratio():
    reactor = ReactorIsothermalHeterogeneous()
    payload = _spatial_profile_payload()
    payload["recycling_ratio"] = -0.1

    with pytest.raises(ValueError, match="recycling_ratio must be non-negative"):
        reactor.pfr_spatial_profile(payload)


def test_pfr_spatial_profile_rejects_non_numeric_axial_position():
    reactor = ReactorIsothermalHeterogeneous()
    payload = _spatial_profile_payload()
    payload["axial_positions"] = [0.0, "mid", 1.0]

    with pytest.raises(ValueError, match="axial_positions must contain only numeric values"):
        reactor.pfr_spatial_profile(payload)


def test_pfr_spatial_profile_rejects_non_positive_volume():
    reactor = ReactorIsothermalHeterogeneous()
    payload = _spatial_profile_payload()
    payload["volume"] = 0.0

    with pytest.raises(ValueError, match="volume must be positive"):
        reactor.pfr_spatial_profile(payload)


def test_pfr_spatial_profile_rejects_axial_positions_with_fewer_than_two_points():
    reactor = ReactorIsothermalHeterogeneous()
    payload = _spatial_profile_payload()
    payload["axial_positions"] = [0.0]

    with pytest.raises(ValueError, match="at least 2 numeric values"):
        reactor.pfr_spatial_profile(payload)


def test_pfr_spatial_profile_rejects_out_of_range_axial_positions():
    reactor = ReactorIsothermalHeterogeneous()
    payload = _spatial_profile_payload()
    payload["axial_positions"] = [0.0, 1.2]

    with pytest.raises(ValueError, match="axial_positions must be within \\[0, 1\\]"):
        reactor.pfr_spatial_profile(payload)


def test_pfr_spatial_profile_rejects_boolean_axial_positions():
    reactor = ReactorIsothermalHeterogeneous()
    payload = _spatial_profile_payload()
    payload["axial_positions"] = [0.0, True, 1.0]

    with pytest.raises(ValueError, match="axial_positions must contain only numeric values"):
        reactor.pfr_spatial_profile(payload)
