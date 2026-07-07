from fastapi.testclient import TestClient

import app


def test_health_endpoint_reports_ok():
    client = TestClient(app.app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_runtime_config_reads_environment(monkeypatch):
    monkeypatch.setenv("DCOU_HOST", "127.0.0.1")
    monkeypatch.setenv("DCOU_PORT", "6123")

    host, port = app.get_runtime_config()

    assert host == "127.0.0.1"
    assert port == 6123

