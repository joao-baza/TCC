import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import math

import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def _pipe_area_m2(diameter_mm: float) -> float:
    d_m = diameter_mm / 1000
    return math.pi * d_m ** 2 / 4


def _headloss_payload(**overrides):
    base = {
        "method": "Darcy-Weisbach",
        "pipe_length": 100,
        "diameter": 100,
        "velocity": 2.0,
        "friction_factor": 0.02,
    }
    base.update(overrides)
    return base


class TestPumpHeadlossRouter:
    def test_example_returns_input_presets_only(self):
        response = client.get("/pump/example")

        assert response.status_code == 200
        assert response.json() == {
            "headloss": {
                "method": "Darcy-Weisbach",
                "pipe_length": 100.0,
                "diameter": 125.0,
                "flow_rate": 0.04,
                "velocity": 3.259493234522017,
                "reynolds": 3186.1046722863807,
                "friction_factor": 0.04495094389484752,
                "friction_method": "SwameeJain",
                "composition": "Aço galvanizado",
                "fittings": [
                    {"fitting": "Cotovelo 45°", "quantity": 5},
                    {"fitting": "Saída de tanque", "quantity": 1},
                    {"fitting": "Válvula esfera", "quantity": 2},
                ],
            },
            "npsh": {
                "manometric_pressure": 0.0,
                "atmospheric_pressure": 1.033,
                "vapor_pressure": 0.023,
                "density": 1000.0,
                "friction_factor": 10.0,
                "pump_inlet_velocity": 1.5,
                "gauge_elevation": 3.0,
                "required": 3.0,
            },
            "head": {
                "pressure1": 101325.0,
                "pressure2": 101325.0,
                "elevation1": 0.0,
                "elevation2": 5.0,
                "velocity1": 0.0,
                "velocity2": 3.0,
                "density": 1000.0,
                "friction_factor": 2.55887,
            },
        }

    def test_headloss_darcy_velocity_only(self):
        response = client.post("/pump/headloss", json=_headloss_payload())
        assert response.status_code == 200
        body = response.json()
        assert body["value"] > 0
        assert body["units"] == "meter"

    def test_headloss_darcy_flow_rate_only(self):
        d_mm = 100
        v = 2.0
        q = v * _pipe_area_m2(d_mm)
        payload = _headloss_payload(flow_rate=q)
        del payload["velocity"]
        response = client.post("/pump/headloss", json=payload)
        assert response.status_code == 200
        assert response.json()["value"] > 0

    def test_headloss_hazen_velocity_only(self):
        d_mm = 100
        v = 2.0
        response = client.post(
            "/pump/headloss",
            json={
                "method": "Hazen-Williams",
                "pipe_length": 100,
                "diameter": d_mm,
                "velocity": v,
                "roughness_coefficient": 140,
            },
        )
        assert response.status_code == 200
        assert response.json()["value"] > 0

    def test_headloss_hazen_flow_rate_only(self):
        response = client.post(
            "/pump/headloss",
            json={
                "method": "Hazen-Williams",
                "pipe_length": 100,
                "diameter": 100,
                "flow_rate": 0.01,
                "roughness_coefficient": 140,
            },
        )
        assert response.status_code == 200
        assert response.json()["value"] > 0

    def test_headloss_missing_flow_and_velocity_returns_400(self):
        payload = _headloss_payload()
        del payload["velocity"]
        response = client.post("/pump/headloss", json=payload)
        assert response.status_code == 400
        assert "vazão" in response.json()["detail"].lower()

    def test_headloss_inconsistent_flow_velocity_returns_400(self):
        payload = _headloss_payload(flow_rate=0.5)
        response = client.post("/pump/headloss", json=payload)
        assert response.status_code == 400
        assert "inconsistent" in response.json()["detail"].lower()

    def test_headloss_darcy_missing_friction_factor_returns_400(self):
        payload = _headloss_payload()
        del payload["friction_factor"]
        response = client.post("/pump/headloss", json=payload)
        assert response.status_code == 400
        assert "fator de atrito" in response.json()["detail"].lower()

    def test_headloss_hazen_missing_roughness_coefficient_returns_400(self):
        response = client.post(
            "/pump/headloss",
            json={
                "method": "Hazen-Williams",
                "pipe_length": 100,
                "diameter": 100,
                "flow_rate": 0.01,
            },
        )
        assert response.status_code == 400
        assert "coeficiente de rugosidade" in response.json()["detail"].lower()

    def test_headloss_methods_endpoint(self):
        response = client.get("/pump/headloss/methods")
        assert response.status_code == 200
        methods = response.json()
        assert any(method["value"] == "Darcy-Weisbach" for method in methods)
        assert any(method["value"] == "Hazen-Williams" for method in methods)

    def test_head_chart_endpoint_returns_terms_chart(self):
        response = client.post(
            "/pump/head/chart",
            json={
                "pressure1": 101325,
                "pressure2": 101325,
                "elevation1": 0,
                "elevation2": 5,
                "velocity1": 0,
                "velocity2": 3,
                "density": 1000,
                "friction_factor": 2.55887,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["axes"]["x"]["scale"] == "linear"
        assert payload["series"]
        assert payload["markers"]
        assert len(payload["annotations"]) == 4

    def test_headloss_chart_endpoint_returns_curve_model(self):
        response = client.post(
            "/pump/headloss/chart",
            json={
                "method": "Darcy-Weisbach",
                "pipe_length": 100,
                "diameter": 125,
                "flow_rate": 0.04,
                "velocity": 3.259493234522017,
                "friction_factor": 0.04495094389484752,
                "fittings": [
                    {"fitting": "Cotovelo 45°", "quantity": 5},
                    {"fitting": "Saída de tanque", "quantity": 1},
                ],
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert "chart" not in payload
        assert payload["title"] == "Curva da bomba e do sistema"
        assert payload["axes"]["x"]["scale"] == "linear"
        assert payload["axes"]["y"]["scale"] == "linear"
        assert [series["id"] for series in payload["series"]] == ["pump-curve", "system-curve"]
        assert len(payload["markers"]) == 1
        assert payload["markers"][0]["id"] == "operating-point"
        assert payload["markers"][0]["x"] == pytest.approx(0.04)
        assert payload["markers"][0]["y"] > 0
        assert payload["markers"][0]["label"] == "Ponto de operação"
        assert payload["markers"][0]["color"] == "#dc2626"
        assert payload["approximation_notice"] == (
            "A curva da bomba usa uma aproximação quadrática didática. Para uma bomba real, um catálogo deve ser usado para analisar."
        )

    def test_efficiency_map_chart_endpoint_returns_backend_cells_and_markers(self):
        response = client.post(
            "/pump/efficiency-map/chart",
            json={
                "method": "Darcy-Weisbach",
                "pipe_length": 100,
                "diameter": 125,
                "flow_rate": 0.04,
                "velocity": 3.259493234522017,
                "friction_factor": 0.04495094389484752,
                "fittings": [
                    {"fitting": "Cotovelo 45°", "quantity": 5},
                    {"fitting": "Saída de tanque", "quantity": 1},
                ],
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == "pump-efficiency-map"
        assert payload["x_axis"]["label"] == "Vazão volumétrica (Q)"
        assert payload["y_axis"]["label"] == "Altura manométrica (H)"
        assert len(payload["cells"]) == 70
        assert payload["system_curve"]
        assert [marker["id"] for marker in payload["markers"]] == [
            "best-efficiency-point",
            "operating-point",
        ]

    def test_npsh_gauge_chart_endpoint_returns_backend_status_axis_and_markers(self):
        response = client.post(
            "/pump/npsh-gauge/chart",
            json={
                "manometric_pressure": 1.2,
                "atmospheric_pressure": 1.0,
                "vapor_pressure": 0.03,
                "density": 998,
                "friction_factor": 2.1,
                "pump_inlet_velocity": 1.4,
                "gauge_elevation": 3,
                "required": 3,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == "pump-npsh-gauge"
        assert payload["available"]["value"] > 0
        assert payload["required"]["value"] == pytest.approx(3)
        assert payload["safe_threshold"]["value"] == pytest.approx(3.5)
        assert payload["status"]["tone"] in {"safe", "risk"}
        assert "NPSHd" in payload["status"]["label"]
        assert payload["axis"]["scale"] == "linear"
        assert payload["axis"]["domain"]["min"] == pytest.approx(0)
        assert payload["axis"]["domain"]["max"] >= payload["available"]["value"]
        assert [marker["id"] for marker in payload["markers"]] == [
            "available",
            "required",
            "safe-threshold",
        ]

    def test_npsh_available_endpoint_returns_expected_head_for_example_scenario(self):
        response = client.post(
            "/pump/npsh-available",
            json={
                "manometric_pressure": 0.0,
                "atmospheric_pressure": 1.033,
                "vapor_pressure": 0.023,
                "density": 1000.0,
                "friction_factor": 10.0,
                "pump_inlet_velocity": 1.5,
                "gauge_elevation": 3.0,
            },
        )

        assert response.status_code == 200
        assert response.json() == {
            "head_loss": {
                "value": pytest.approx(3.2147180739600167),
                "units": "meter",
            }
        }

    def test_npsh_gauge_chart_marks_example_scenario_as_risk_when_below_safe_margin(self):
        response = client.post(
            "/pump/npsh-gauge/chart",
            json={
                "manometric_pressure": 0.0,
                "atmospheric_pressure": 1.033,
                "vapor_pressure": 0.023,
                "density": 1000.0,
                "friction_factor": 10.0,
                "pump_inlet_velocity": 1.5,
                "gauge_elevation": 3.0,
                "required": 3.0,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["available"]["value"] == pytest.approx(3.2147180739600167)
        assert payload["status"]["tone"] == "risk"
        assert payload["safe_threshold"]["value"] == pytest.approx(3.5)

    def test_npsh_gauge_chart_handles_missing_required_without_safe_limit(self):
        response = client.post(
            "/pump/npsh-gauge/chart",
            json={
                "manometric_pressure": 1.2,
                "atmospheric_pressure": 1.0,
                "vapor_pressure": 0.03,
                "density": 998,
                "friction_factor": 2.1,
                "pump_inlet_velocity": 1.4,
                "gauge_elevation": 3,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["required"] is None
        assert payload["safe_threshold"] is None
        assert payload["status"]["tone"] == "missing"
        assert [marker["id"] for marker in payload["markers"]] == ["available"]


class TestResolveFlowVelocity:

    @pytest.fixture
    def hydraulic(self):
        from models.hydraulic import Hydraulic
        return Hydraulic()

    def test_velocity_only_derives_flow(self, hydraulic):
        d_mm = 100
        v = 2.0
        q, v_out = hydraulic._resolve_flow_velocity({"velocity": v}, d_mm)
        assert v_out == pytest.approx(v)
        assert q == pytest.approx(v * _pipe_area_m2(d_mm), rel=1e-9)

    def test_flow_only_derives_velocity(self, hydraulic):
        d_mm = 100
        q = 0.01
        q_out, v = hydraulic._resolve_flow_velocity({"flow_rate": q}, d_mm)
        assert q_out == pytest.approx(q)
        assert v == pytest.approx(q / _pipe_area_m2(d_mm), rel=1e-9)

    def test_both_consistent_accepted(self, hydraulic):
        d_mm = 100
        v = 1.5
        q = v * _pipe_area_m2(d_mm)
        q_out, v_out = hydraulic._resolve_flow_velocity(
            {"flow_rate": q, "velocity": v}, d_mm
        )
        assert q_out == pytest.approx(q)
        assert v_out == pytest.approx(v)

    def test_both_inconsistent_raises(self, hydraulic):
        with pytest.raises(ValueError, match="inconsistent"):
            hydraulic._resolve_flow_velocity(
                {"flow_rate": 0.5, "velocity": 2.0}, 100
            )

    def test_neither_raises(self, hydraulic):
        with pytest.raises(ValueError, match="flow rate"):
            hydraulic._resolve_flow_velocity({}, 100)

    def test_non_positive_diameter_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Diameter must be positive"):
            hydraulic._resolve_flow_velocity({"velocity": 2.0}, 0)

    def test_non_positive_velocity_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Velocity must be positive"):
            hydraulic._resolve_flow_velocity({"velocity": 0}, 100)

    def test_non_positive_flow_rate_raises(self, hydraulic):
        with pytest.raises(ValueError, match="Flow rate must be positive"):
            hydraulic._resolve_flow_velocity({"flow_rate": -0.01}, 100)

    def test_tolerance_boundary_inside_accepted(self, hydraulic):
        d_mm = 100
        v = 2.0
        q_exact = v * _pipe_area_m2(d_mm)
        q_slightly_off = q_exact * 1.0005  # 0.05% relative error < 0.1% tolerance
        q_out, v_out = hydraulic._resolve_flow_velocity(
            {"flow_rate": q_slightly_off, "velocity": v}, d_mm
        )
        assert q_out == pytest.approx(q_slightly_off)
        assert v_out == pytest.approx(v)


if __name__ == "__main__":
    pytest.main([__file__])
