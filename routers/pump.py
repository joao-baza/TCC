from fastapi import APIRouter, HTTPException
from models.hydraulic import Hydraulic
from schemas import (
    HeadLossRequest,
    HeadRequest,
    NPSHAvailableRequest,
    PumpExampleResponse,
)
from .utils import serialize
from .i18n import catalog_options

router = APIRouter(prefix="/pump", tags=["Pump"])
hydraulic = Hydraulic()


def validate_pump_example_catalogs() -> None:
    if "Aço galvanizado" not in hydraulic.piping.compositions():
        raise RuntimeError("Composition 'Aço galvanizado' not found")
    available_fittings = set(hydraulic.piping.fittings())
    for fitting in ("Cotovelo 45°", "Saída de tanque", "Válvula de esfera"):
        if fitting not in available_fittings:
            raise RuntimeError(f"Fitting '{fitting}' not found")
    available_methods = hydraulic.friction_factor({})
    if "SwameeJain" not in available_methods:
        raise RuntimeError("Friction method 'SwameeJain' not found")


@router.get("/example", response_model=PumpExampleResponse)
def get_pump_example():
    validate_pump_example_catalogs()
    return {
        "headloss": {
            "method": "Darcy-Weisbach",
            "pipe_length": 100,
            "diameter": 125,
            "flow_rate": 0.04,
            "velocity": 3.259493234522017,
            "reynolds": 3186.1046722863807,
            "friction_factor": 0.04495094389484752,
            "friction_method": "SwameeJain",
            "composition": "Aço galvanizado",
            "fittings": [
                {"fitting": "Cotovelo 45°", "quantity": 5},
                {"fitting": "Saída de tanque", "quantity": 1},
                {"fitting": "Válvula de esfera", "quantity": 2},
            ],
        },
        "npsh": {
            "manometric_pressure": 0,
            "atmospheric_pressure": 1.033,
            "vapor_pressure": 0.023,
            "density": 1000,
            "friction_factor": 10,
            "pump_inlet_velocity": 1.5,
            "gauge_elevation": 3,
            "required": 3,
        },
        "head": {
            "pressure1": 101325,
            "pressure2": 101325,
            "elevation1": 0,
            "elevation2": 5,
            "velocity1": 0,
            "velocity2": 3,
            "density": 1000,
            "friction_factor": 2.55887,
        },
    }


@router.get("/headloss/methods")
def get_headloss_methods():
    return catalog_options(
        hydraulic.head_loss({}),
        {
            "Darcy-Weisbach": "Darcy-Weisbach",
            "Hazen-Williams": "Hazen-Williams",
        },
    )


@router.post("/headloss")
def calculate_headloss(payload: HeadLossRequest):
    try:
        params = {
            "pipe_length": payload.pipe_length,  # m
            "diameter": payload.diameter,        # mm
            "method": payload.method
        }
        
        if payload.flow_rate is not None:
            params["flow_rate"] = payload.flow_rate  # m³/s
        if payload.velocity is not None:
            params["velocity"] = payload.velocity  # m/s

        if payload.flow_rate is None and payload.velocity is None:
            raise ValueError(
                "Provide flow rate (m³/s) and/or velocity (m/s); at least one is required."
            )

        if payload.method == "Darcy-Weisbach":
            if payload.friction_factor is None:
                raise ValueError("Darcy-Weisbach requires friction factor")
            params["friction_factor"] = payload.friction_factor  # dimensionless

        elif payload.method == "Hazen-Williams":
            if payload.roughness_coefficient is None:
                raise ValueError("Hazen-Williams requires roughness coefficient")
            params["roughness_coefficient"] = payload.roughness_coefficient  # dimensionless
            
        if payload.fittings is not None:
            params["fittings"] = [{"quantity": item.quantity, "fitting": item.fitting} for item in payload.fittings]
            
        result = hydraulic.head_loss(params)
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/npsh-available")
def calculate_npsh_available(payload: NPSHAvailableRequest):
    try:
        params = {
            "manometric_pressure": payload.manometric_pressure,    # kgf/cm²
            "atmospheric_pressure": payload.atmospheric_pressure,  # kgf/cm²
            "vapor_pressure": payload.vapor_pressure,              # kgf/cm²
            "density": payload.density,                          # kg/m³
            "head_loss": payload.friction_factor,                # m (perdas de carga)
            "pump_inlet_velocity": payload.pump_inlet_velocity      # m/s
        }
        
        if payload.gauge_elevation is not None:
            params["gauge_elevation"] = payload.gauge_elevation    # m
            
        result = hydraulic.npsh_available(params)
        return serialize({"head_loss": result})
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/head")
def calculate_head(payload: HeadRequest):
    try:
        result = hydraulic.head({
            "pressure1": payload.pressure1,          # Pa
            "pressure2": payload.pressure2,          # Pa
            "elevation1": payload.elevation1,        # m
            "elevation2": payload.elevation2,        # m
            "velocity1": payload.velocity1,          # m/s
            "velocity2": payload.velocity2,          # m/s
            "density": payload.density,              # kg/m³
            "head_loss": payload.friction_factor  # m (perdas de carga)
        })
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

