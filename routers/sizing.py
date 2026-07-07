from fastapi import APIRouter, HTTPException
from models.hydraulic import Hydraulic
from schemas import (
    CalculatedDiameterRequest,
    RealDiameterRequest,
    SizingExampleResponse,
)
from .utils import serialize

router = APIRouter(prefix="/sizing", tags=["Sizing"])
hydraulic = Hydraulic()


def validate_sizing_example_catalogs() -> None:
    if not any(schedule["name"] == "SCH40" for schedule in hydraulic.piping.schedules()):
        raise RuntimeError("Schedule 'SCH40' not found")


@router.get("/example", response_model=SizingExampleResponse)
def get_sizing_example():
    validate_sizing_example_catalogs()
    return {
        "calculated_diameter": {
            "flow_rate": 0.0166667,
            "velocity": 1.5,
        },
        "real_diameter": {
            "calculated_diameter": 118.94,
            "schedule": "SCH40",
        },
    }


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

