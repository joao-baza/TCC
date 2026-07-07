import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from fastapi.testclient import TestClient

from app import app

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
