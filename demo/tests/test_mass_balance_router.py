import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def _mass_balance_payload():
    return {
        "components": ["Water"],
        "streams": [
            {
                "name": "Feed",
                "direction": 1,
                "flow_rate": 100.0,
                "compositions": {"Water": 1.0},
            },
            {
                "name": "Product",
                "direction": -1,
                "flow_rate": None,
                "compositions": {"Water": None},
            },
        ],
    }


@pytest.mark.parametrize(
    ("path", "expected_root_key"),
    [
        ("/mass-balance/calculate", "metricas"),
        ("/mass-balance/yields", "rendimentos"),
    ],
)
def test_mass_balance_endpoints_preserve_legacy_stream_aliases(path, expected_root_key):
    response = client.post(path, json=_mass_balance_payload())

    assert response.status_code == 200
    body = response.json()
    assert "resultados" in body
    assert expected_root_key in body
    assert body["resultados"]["Feed"]["vazao"] == 100.0
    assert body["resultados"]["Feed"]["composicoes"] == {"Water": 1.0}
    assert body["resultados"]["Product"]["vazao"] == 100.0
    assert body["resultados"]["Product"]["composicoes"] == {"Water": 1.0}


def test_mass_balance_calculate_returns_fresh_feed_and_product_metrics():
    response = client.post("/mass-balance/calculate", json=_mass_balance_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["metricas"]["alimentacao_fresca"] == 100.0
    assert body["metricas"]["vazao_produto"] == 100.0

