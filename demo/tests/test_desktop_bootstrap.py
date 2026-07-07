import socket
import runpy
import sys
from types import SimpleNamespace

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


def test_find_available_port_skips_occupied_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as occupied:
        occupied.bind(("127.0.0.1", 0))
        occupied.listen(1)
        start_port = occupied.getsockname()[1]

        selected_port = app.find_available_port("127.0.0.1", start_port, max_attempts=5)

    assert selected_port > start_port


def test_main_passes_the_loaded_app_to_uvicorn(monkeypatch):
    calls = []

    def fake_run(*args, **kwargs):
        calls.append((args, kwargs))

    monkeypatch.setitem(sys.modules, "uvicorn", SimpleNamespace(run=fake_run))

    runpy.run_module("app", run_name="__main__")

    assert len(calls) == 1
    args, kwargs = calls[0]
    assert args
    assert not isinstance(args[0], str)
    assert getattr(args[0], "title", None) == "Chemical Engineering API"
    assert kwargs["reload"] is False
