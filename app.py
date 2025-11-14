import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from routers import piping, sizing, flow, pump, reactor, components_router, mass_balance

app = FastAPI(
    title="Chemical Engineering API",
    description="API for chemical engineering calculations",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn")

# Include routers
app.include_router(piping.router)
app.include_router(sizing.router)
app.include_router(flow.router)
app.include_router(pump.router)
app.include_router(reactor.router)
app.include_router(components_router.router)
app.include_router(mass_balance.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)
