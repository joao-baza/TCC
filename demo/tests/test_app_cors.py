import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import pytest
from starlette.middleware.cors import CORSMiddleware
from app import app


def _cors_kwargs():
    """Return the keyword options the CORSMiddleware was configured with."""
    for mw in app.user_middleware:
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


if __name__ == "__main__":
    pytest.main([__file__])
