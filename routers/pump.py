from fastapi import APIRouter, HTTPException
from models import Hydraulic
from schemas import HeadLossRequest, NPSHAvailableRequest, HeadRequest
from .utils import serialize

router = APIRouter(prefix="/pump", tags=["Pump"])
hydraulic = Hydraulic()


@router.get("/headloss/methods")
def get_headloss_methods():
    return hydraulic.head_loss({})


@router.post("/headloss")
def calculate_headloss(payload: HeadLossRequest):
    try:
        params = {
            "pipe_length": payload.pipe_length,  # m
            "diameter": payload.diameter,        # mm
            "method": payload.method
        }
        
        if payload.method == "Darcy-Weisbach":
            if payload.friction_factor is None or payload.velocity is None:
                raise ValueError("Darcy-Weisbach requires friction factor and velocity")
                
            params["friction_factor"] = payload.friction_factor  # dimensionless
            params["velocity"] = payload.velocity               # m/s
            
        elif payload.method == "Hazen-Williams":
            if payload.flow_rate is None or payload.roughness_coefficient is None:
                raise ValueError("Hazen-Williams requires flow rate and roughness coefficient")
                
            params["flow_rate"] = payload.flow_rate                      # m³/s
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
            "specific_mass": payload.specific_mass,              # kg/m³
            "friction_factor": payload.friction_factor,            # m
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
            "specific_mass": payload.specific_mass,  # kg/m³
            "friction_factor": payload.friction_factor  # m
        })
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

