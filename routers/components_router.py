import CoolProp.CoolProp as CP
from fastapi import APIRouter, HTTPException
from models import Components
from schemas import FluidRequest, PropertyRequest, MixturePropertiesRequest, PropsStateRequest

router = APIRouter(prefix="/components", tags=["Components"])
components_obj = Components()


@router.get("/list")
def list_components():
    return components_obj.list_all_components()


@router.get("/property-names")
def get_property_names():
    return components_obj.get_property_names()


@router.get("/property-mixture-names")
def get_property_mixture_names():
    return components_obj.get_property_mixture_names()


@router.post("/critical-properties")
def get_critical_properties(payload: FluidRequest):
    try:
        props = components_obj.get_critical_properties(payload.fluid)
        return {
            "critical_temperature": props["critical_temperature"].magnitude,
            "critical_temperature_units": str(props["critical_temperature"].units),
            "critical_pressure": props["critical_pressure"].magnitude,
            "critical_pressure_units": str(props["critical_pressure"].units),
            "critical_density": props["critical_density"].magnitude,
            "critical_density_units": str(props["critical_density"].units),
            "triple_point_temperature": props["triple_point_temperature"].magnitude,
            "triple_point_temperature_units": str(props["triple_point_temperature"].units),
            "triple_point_pressure": props["triple_point_pressure"].magnitude,
            "triple_point_pressure_units": str(props["triple_point_pressure"].units)
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/property")
def get_property(payload: PropertyRequest):
    try:
        prop = components_obj.get_property(
            payload.fluid,
            payload.property_name,
            payload.temperature,
            payload.pressure
        )
        
        # Check if the property is a Pint Quantity object or a simple value
        if hasattr(prop, 'magnitude'):
            return {
                "value": prop.magnitude,
                "units": str(prop.units)
            }
        else:
            # For dimensionless properties like Z (compressibility factor)
            return {
                "value": prop,
                "units": "dimensionless"
            }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


PROPS_UNITS_MAP = {
    "H": "J/kg", "S": "J/(kg·K)", "D": "kg/m³", "T": "K", "P": "Pa",
    "C": "J/(kg·K)", "V": "Pa·s", "L": "W/(m·K)", "Q": "dimensionless",
    "U": "J/kg", "A": "m/s", "Z": "dimensionless",
}


@router.post("/props-by-state")
def get_props_by_state(payload: PropsStateRequest):
    try:
        value = CP.PropsSI(
            payload.output,
            payload.input1, payload.value1,
            payload.input2, payload.value2,
            payload.fluid,
        )
        units = PROPS_UNITS_MAP.get(payload.output, "SI")
        return {"value": value, "units": units}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/mixture-properties")
def get_mixture_properties(payload: MixturePropertiesRequest):
    try:
        props = components_obj.get_mixture_properties(
            payload.fluid_fractions,
            payload.temperature,
            payload.pressure,
            payload.properties
        )
        
        # Convert pint quantities to dictionaries with value and units
        result = {"properties": {}}
        for key, value in props.items():
            if hasattr(value, 'magnitude'):
                result["properties"][key] = {
                    "value": value.magnitude,
                    "units": str(value.units)
                }
            else:
                # For dimensionless properties like Z (compressibility factor)
                result["properties"][key] = {
                    "value": value,
                    "units": "dimensionless"
                } if key not in ["temperature", "pressure"] else value
        
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

