import os
import sys
import base64

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


def test_mass_balance_chart_endpoint_returns_component_stacked_series():
    response = client.post("/mass-balance/chart", json=_mass_balance_payload())

    assert response.status_code == 200
    payload = response.json()
    assert "chart" not in payload
    assert payload["id"] == "mass-balance-chart"
    assert payload["axes"]["x"]["label"] == "Corrente"
    assert payload["axes"]["flow"]["label"] == "Vazão mássica da corrente"
    assert payload["title"] == "Composição mássica das correntes"
    assert payload["subtitle"] == (
        "Cada barra representa a vazão da corrente, segmentada pela contribuição mássica dos componentes."
    )
    assert [series["id"] for series in payload["series"]] == ["component-water"]
    series_by_id = {series["id"]: series for series in payload["series"]}
    assert series_by_id["component-water"]["points"][0] == {"x": 1.0, "y": 100.0}
    assert series_by_id["component-water"]["points"][1] == {"x": 2.0, "y": 100.0}
    assert payload["markers"] == []


def test_mass_balance_example_exposes_reaction_and_recycle_contract():
    response = client.get("/mass-balance/example")

    assert response.status_code == 200
    payload = response.json()
    assert payload["components"] == ["A", "B", "C", "D"]
    assert payload["streams"][0]["name"] == "Alimentacao_Fresca"
    assert payload["reactions"] == [
        {
            "stoichiometry": {"A": -1, "C": 1},
            "key_component": "A",
            "conversion": 0.7,
        },
        {
            "stoichiometry": {"B": -1, "D": 1},
            "key_component": "B",
            "conversion": 0.85,
        },
    ]
    assert payload["splits"] == [
        {
            "parent_stream": "Saida_Do_Reator",
            "recycle_stream": "Reciclo",
            "purge_stream": "Produto",
            "fraction": 0.6,
        }
    ]


def test_mass_balance_plot_returns_base64_encoded_png():
    response = client.post("/mass-balance/plot", json=_mass_balance_payload())

    assert response.status_code == 200
    payload = response.json()
    image_bytes = base64.b64decode(payload["imagem_base64"])
    assert image_bytes.startswith(b"\x89PNG\r\n\x1a\n")


def test_mass_balance_yields_translates_underdetermined_errors_to_portuguese():
    payload = {
        "components": ["A"],
        "streams": [
            {
                "name": "In",
                "direction": 1,
                "flow_rate": None,
                "compositions": {"A": None},
            },
            {
                "name": "Out",
                "direction": -1,
                "flow_rate": None,
                "compositions": {"A": None},
            },
        ],
    }

    response = client.post("/mass-balance/yields", json=payload)

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail == (
        "O sistema está subdeterminado (soluções infinitas ou resultado simbólico). "
        "Verifique os graus de liberdade."
    )
    assert "underdetermined" not in detail
    assert "Check the degrees of freedom" not in detail
