from fastapi import APIRouter, HTTPException
from models import Hydraulic
from schemas import CalculatedDiameterRequest, RealDiameterRequest
from .utils import serialize

router = APIRouter(prefix="/sizing", tags=["Sizing"])
hydraulic = Hydraulic()


@router.post("/calculated-diameter")
def calculate_diameter(payload: CalculatedDiameterRequest):
    try:
        result = hydraulic.get_calculated_diameter({
            "flow_rate": payload.flow_rate,  # m³/s
            "velocity": payload.velocity    # m/s
        })
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/real-diameter")
def get_real_diameter(payload: RealDiameterRequest):
    try:
        result = hydraulic.get_real_diameter({
            "calculated_diameter": payload.calculated_diameter,  # mm
            "schedule": payload.schedule
        })
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

