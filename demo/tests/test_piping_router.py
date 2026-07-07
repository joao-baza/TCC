import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_piping_example_returns_input_presets_only():
    response = client.get("/piping/example")

    assert response.status_code == 200
    assert response.json() == {
        "composition": "Aço galvanizado",
        "schedule": "SCH40",
        "diameter": 125.0,
        "fitting": "Válvula de esfera",
    }
