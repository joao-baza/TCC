import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import pytest
from fastapi.testclient import TestClient

from app import app

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

