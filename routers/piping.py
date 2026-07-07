from fastapi import APIRouter, HTTPException
from models.piping import Piping
from .utils import serialize
from .i18n import catalog_options, option

router = APIRouter(prefix="/piping", tags=["Piping"])
piping = Piping()


@router.get("/compositions")
def get_compositions():
    return catalog_options(piping.compositions())


@router.get("/composition/{name}")
def get_composition_specifications(name: str):
    try:
        # Return enhanced composition details
        return serialize(piping.composition_specifications(name))
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/schedules")
def get_schedules():
    # Returns an array of schedules with their available diameters
    return [
        option(
            schedule["name"],
            schedule["name"].replace("SCH", "Schedule "),
            diameters=schedule["diameters"],
            description=schedule["description"],
        )
        for schedule in piping.schedules()
    ]


@router.get("/schedule/{schedule}/diameters")
def get_schedule_diameters(schedule: str):
    try:
        # Returns diameters with basic information
        return piping.diameters(schedule)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/schedule/{schedule}/diameter/{diameter}")
def get_schedule_diameter_specifications(schedule: str, diameter: float):
    try:
        return serialize(piping.diameter_specifications(schedule, diameter))
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/fittings")
def get_fittings():
    return catalog_options(piping.fittings())


@router.get("/fitting/{name}")
def get_fitting_specifications(name: str):
    try:
        # Return enhanced fitting details
        return serialize(piping.fitting_specifications(name))
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))

