import logging
import os
import socket
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import HTTPException, Request

# Import routers
from routers import (
    piping,
    sizing,
    flow,
    pump,
    reactor,
    components_router,
    mass_balance,
    pid as pid_router,
)
from routers.i18n import translate_error_message, translate_validation_errors
from pid.config import PidSettings
from pid.runtime import PidRuntime


DEFAULT_CORS_ORIGINS = (
    "https://tcc.joao.baza.dev.br",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
)


def get_root_path() -> str:
    root_path = os.getenv("DCOU_ROOT_PATH", "").strip()
    if not root_path or root_path == "/":
        return ""

    return "/" + root_path.strip("/")


logger = logging.getLogger("uvicorn")


def get_runtime_config() -> tuple[str, int]:
    host = os.getenv("DCOU_HOST", "127.0.0.1")
    port = int(os.getenv("DCOU_PORT", "5000"))
    return host, port


def is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False

    return True


def find_available_port(host: str, start_port: int, max_attempts: int = 50) -> int:
    for port in range(start_port, start_port + max_attempts):
        if is_port_available(host, port):
            return port

    raise RuntimeError(
        f"Could not find an available port for {host} starting at {start_port}"
    )

def health():
    return {"status": "ok"}


async def ready(request: Request):
    settings: PidSettings = request.app.state.pid_settings
    if not settings.enabled:
        return {"status": "ok", "pid": "disabled"}

    runtime: PidRuntime = request.app.state.pid_runtime
    try:
        await runtime.check_ready()
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="PID dependencies unavailable",
        ) from error
    return {"status": "ok", "pid": "ready"}


async def http_exception_handler(_: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, str):
        detail = translate_error_message(detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": detail})


async def request_validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": translate_validation_errors(exc.errors())},
    )


def create_app() -> FastAPI:
    settings = PidSettings.from_env()

    @asynccontextmanager
    async def lifespan(created_app: FastAPI):
        if not settings.enabled:
            yield
            return

        runtime = PidRuntime.from_settings(settings)
        created_app.state.pid_runtime = runtime
        try:
            yield
        finally:
            await runtime.close()

    created_app = FastAPI(
        title="Chemical Engineering API",
        description="API for chemical engineering calculations",
        version="1.0.0",
        root_path=get_root_path(),
        lifespan=lifespan,
    )
    created_app.state.pid_settings = settings
    custom_origins = (
        origin for origin in settings.allowed_origins if origin != "*"
    )
    allowed_origins = list(dict.fromkeys((*DEFAULT_CORS_ORIGINS, *custom_origins)))
    created_app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    created_app.include_router(piping.router)
    created_app.include_router(sizing.router)
    created_app.include_router(flow.router)
    created_app.include_router(pump.router)
    created_app.include_router(reactor.router)
    created_app.include_router(components_router.router)
    created_app.include_router(mass_balance.router)
    created_app.include_router(pid_router.router)
    created_app.add_api_route("/health", health, methods=["GET"])
    created_app.add_api_route("/ready", ready, methods=["GET"])
    created_app.add_exception_handler(HTTPException, http_exception_handler)
    created_app.add_exception_handler(
        RequestValidationError, request_validation_exception_handler
    )
    return created_app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    host, port = get_runtime_config()
    selected_port = find_available_port(host, port)

    if selected_port != port:
        logger.warning("Port %s is in use; falling back to %s", port, selected_port)

    uvicorn.run(app, host=host, port=selected_port, reload=False)
