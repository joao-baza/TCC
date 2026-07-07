from fastapi import APIRouter, HTTPException
from models.hydraulic import Hydraulic
from schemas import ReynoldsRequest, FrictionFactorRequest, HydraulicDiameterRequest
from .utils import serialize
from .i18n import catalog_options

router = APIRouter(prefix="/flow", tags=["Flow"])
hydraulic = Hydraulic()


@router.post("/reynolds")
def calculate_reynolds(payload: ReynoldsRequest):
    try:
        params = {
            "characteristic_diameter": payload.characteristic_diameter,  # mm
            "velocity": payload.velocity                                # m/s
        }
        
        if payload.density is not None and payload.dynamic_viscosity is not None:
            params["density"] = payload.density                  # kg/m³
            params["dynamic_viscosity"] = payload.dynamic_viscosity  # Pa·s
        elif payload.kinematic_viscosity is not None:
            params["kinematic_viscosity"] = payload.kinematic_viscosity  # m²/s

        result = hydraulic.reynolds(params)
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/friction-factor/methods")
def get_friction_factor_methods():
    return catalog_options(
        hydraulic.friction_factor({}),
        {
            "ColebrookWhite": "Colebrook-White",
            "SwameeJain": "Swamee-Jain",
            "Haaland": "Haaland",
        },
    )


@router.post("/friction-factor")
def calculate_friction_factor(payload: FrictionFactorRequest):
    try:
        result = hydraulic.friction_factor({
            "roughness": payload.roughness,    # mm
            "diameter": payload.diameter,     # mm
            "reynolds": payload.reynolds,     # dimensionless
            "method": payload.method
        })
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/hydraulic-diameter/shapes")
def get_hydraulic_diameter_shapes():
    return catalog_options(
        hydraulic.hydraulic_diameter({}),
        {
            "circular": "Circular",
            "rectangular": "Retangular",
            "annular": "Anular",
            "triangular": "Triangular",
            "circularCap": "Tampa circular",
        },
    )


@router.post("/hydraulic-diameter")
def calculate_hydraulic_diameter(payload: HydraulicDiameterRequest):
    try:
        params = {
            "shape": payload.shape
        }
        
        # Add parameters based on shape
        if payload.shape == "circular":
            params["diameter"] = payload.diameter
        
        elif payload.shape == "rectangular":
            params["width"] = payload.width
            params["height"] = payload.height
        
        elif payload.shape == "annular":
            params["outer_diameter"] = payload.outer_diameter
            params["inner_diameter"] = payload.inner_diameter
        
        elif payload.shape == "triangular":
            params["side_a"] = payload.side_a
            params["side_b"] = payload.side_b
            params["side_c"] = payload.side_c
        
        elif payload.shape == "circularCap":
            params["diameter"] = payload.diameter
            params["height"] = payload.height
        
        result = hydraulic.hydraulic_diameter(params)
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

