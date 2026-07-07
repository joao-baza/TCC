import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import HTTPException, Request

# Import routers
from routers import piping, sizing, flow, pump, reactor, components_router, mass_balance
from routers.i18n import translate_error_message, translate_validation_errors

app = FastAPI(
    title="Chemical Engineering API",
    description="API for chemical engineering calculations",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tcc.homelab.sistemasj.com.br",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn")


def get_runtime_config() -> tuple[str, int]:
    host = os.getenv("DCOU_HOST", "127.0.0.1")
    port = int(os.getenv("DCOU_PORT", "5000"))
    return host, port

# Include routers
app.include_router(piping.router)
app.include_router(sizing.router)
app.include_router(flow.router)
app.include_router(pump.router)
app.include_router(reactor.router)
app.include_router(components_router.router)
app.include_router(mass_balance.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, str):
        detail = translate_error_message(detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": detail})


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": translate_validation_errors(exc.errors())},
    )


if __name__ == "__main__":
    import uvicorn

    host, port = get_runtime_config()
    uvicorn.run("app:app", host=host, port=port, reload=False)
