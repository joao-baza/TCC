from fastapi import APIRouter, HTTPException
from models.hydraulic import Hydraulic
from schemas import (
    CalculatedDiameterRequest,
    RealDiameterRequest,
    SizingExampleResponse,
    VelocityProfileArrowModel,
    VelocityProfileRequest,
    VelocityProfileVisualizationResponse,
)
from .utils import serialize

router = APIRouter(prefix="/sizing", tags=["Sizing"])
hydraulic = Hydraulic()
REGIME_COLORS = {
    "laminar": "#2563EB",
    "transition": "#D97706",
    "turbulent": "#DC2626",
}
REGIME_LABELS = {
    "laminar": "Laminar",
    "transition": "Transição",
    "turbulent": "Turbulento",
}


def validate_sizing_example_catalogs() -> None:
    if not any(schedule["name"] == "SCH40" for schedule in hydraulic.piping.schedules()):
        raise RuntimeError("Schedule da tubulação 'SCH40' não encontrado")


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


def _classify_velocity_regime(reynolds: float) -> str:
    if reynolds < 2300:
        return "laminar"
    if reynolds >= 4000:
        return "turbulent"
    return "transition"


def _build_velocity_profile_arrows(reynolds: float) -> list[VelocityProfileArrowModel]:
    is_laminar = reynolds < 2300
    is_turbulent = reynolds >= 4000

    ys = [-0.85, -0.65, -0.45, -0.25, 0, 0.25, 0.45, 0.65, 0.85]
    max_length = 260
    start_x = 55
    center_y = 70
    half_radius = 48

    arrows: list[VelocityProfileArrowModel] = []
    for y in ys:
        if is_laminar:
          relative_velocity = 1 - y * y
        elif is_turbulent:
          relative_velocity = (1 - abs(y)) ** (1 / 7)
        else:
          transition_factor = (reynolds - 2300) / 1700
          relative_velocity = (1 - y * y) * (1 - transition_factor) + ((1 - abs(y)) ** (1 / 7)) * transition_factor

        length = max(14, relative_velocity * max_length)
        plotted_y = center_y + y * half_radius
        arrows.append(
            VelocityProfileArrowModel(
                x1=start_x,
                y1=plotted_y,
                x2=start_x + length,
                y2=plotted_y,
                tip=f"{start_x + length},{plotted_y}",
            )
        )

    return arrows


@router.post("/velocity-profile/chart", response_model=VelocityProfileVisualizationResponse)
def build_velocity_profile_chart(payload: VelocityProfileRequest):
    try:
        diameter_m = payload.diameter_mm / 1000
        reynolds = (1000 * payload.velocity * diameter_m) / 0.001
        regime = _classify_velocity_regime(reynolds)

        return {
            "title": "Perfil de Velocidade - Duto Circular",
            "regime": regime,
            "color": REGIME_COLORS[regime],
            "label": REGIME_LABELS[regime],
            "reynolds": reynolds,
            "arrows": _build_velocity_profile_arrows(reynolds),
            "diameter_mm": payload.diameter_mm,
            "velocity": payload.velocity,
        }
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

