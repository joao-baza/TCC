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
        assert "flow rate" in response.json()["detail"].lower()

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
        assert "friction factor" in response.json()["detail"].lower()

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
        assert "roughness coefficient" in response.json()["detail"].lower()

    def test_headloss_methods_endpoint(self):
        response = client.get("/pump/headloss/methods")
        assert response.status_code == 200
        methods = response.json()
        assert "Darcy-Weisbach" in methods
        assert "Hazen-Williams" in methods


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
