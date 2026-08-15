import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import pytest
from starlette.middleware.cors import CORSMiddleware
from app import app, create_app


def _cors_kwargs(target_app=app):
    """Return the keyword options the CORSMiddleware was configured with."""
    for mw in target_app.user_middleware:
        if mw.cls is CORSMiddleware:
            # Starlette >=0.35 stores them in .kwargs; older in .options
            kwargs = getattr(mw, "kwargs", None)
            if kwargs is not None:
                return kwargs
            options = getattr(mw, "options", None)
            if options is not None:
                return options
            return {}
    raise AssertionError("CORSMiddleware is not configured on the app")


def test_cors_does_not_allow_wildcard_origin():
    origins = _cors_kwargs().get("allow_origins", [])
    assert "*" not in origins, "CORS must not allow all origins"


def test_cors_allows_production_frontend():
    origins = _cors_kwargs().get("allow_origins", [])
    assert "https://tcc.joao.baza.dev.br" in origins


def test_cors_keeps_credentials_enabled():
    assert _cors_kwargs().get("allow_credentials") is True


def test_cors_adds_exact_custom_origins_once_and_filters_wildcard(monkeypatch):
    monkeypatch.setenv(
        "PID_ALLOWED_ORIGINS",
        "https://editor.example.test, http://localhost:8080, *, "
        "https://editor.example.test",
    )

    origins = _cors_kwargs(create_app()).get("allow_origins", [])

    assert origins == [
        "https://tcc.joao.baza.dev.br",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://editor.example.test",
    ]
    assert "*" not in origins


if __name__ == "__main__":
    pytest.main([__file__])
