import CoolProp.CoolProp as CP
import numpy as np
from fastapi import APIRouter, HTTPException
from models.components import Components
from schemas import (
    BinaryVLERequest,
    FluidRequest,
    MixturePropertiesRequest,
    PropertyRequest,
    PropertySurfaceRequest,
    PropsStateRequest,
    SaturationEnvelopeRequest,
)
from .i18n import catalog_options

router = APIRouter(prefix="/components", tags=["Components"])
components_obj = Components()

PROPERTY_SURFACE_META = {
    "D": {"label": "Densidade", "units": "kg/m³"},
    "C": {"label": "Calor específico", "units": "J/(kg·K)"},
    "V": {"label": "Viscosidade", "units": "Pa·s"},
    "L": {"label": "Condutividade térmica", "units": "W/(m·K)"},
    "H": {"label": "Entalpia", "units": "J/kg"},
    "S": {"label": "Entropia", "units": "J/(kg·K)"},
    "U": {"label": "Energia interna", "units": "J/kg"},
    "A": {"label": "Velocidade do som", "units": "m/s"},
    "Z": {"label": "Fator de compressibilidade", "units": "adimensional"},
}


@router.get("/list")
def list_components():
    return catalog_options(components_obj.list_all_components())


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


@router.post("/saturation-envelope")
def get_saturation_envelope(payload: SaturationEnvelopeRequest):
    try:
        props = components_obj.get_critical_properties(payload.fluid)
        triple_temperature = props["triple_point_temperature"].magnitude
        critical_temperature = props["critical_temperature"].magnitude

        lower_bound = triple_temperature * 1.0001
        upper_bound = critical_temperature * 0.9999

        if upper_bound <= lower_bound:
            raise ValueError("Invalid saturation range for the selected fluid.")

        temperatures = np.linspace(lower_bound, upper_bound, payload.sample_count)
        points = []

        for temperature in temperatures:
            try:
                pressure = CP.PropsSI("P", "T", float(temperature), "Q", 0, payload.fluid)
                liquid_entropy = CP.PropsSI("S", "T", float(temperature), "Q", 0, payload.fluid)
                vapor_entropy = CP.PropsSI("S", "T", float(temperature), "Q", 1, payload.fluid)
                liquid_enthalpy = CP.PropsSI("H", "T", float(temperature), "Q", 0, payload.fluid)
                vapor_enthalpy = CP.PropsSI("H", "T", float(temperature), "Q", 1, payload.fluid)
            except Exception:
                continue

            points.append(
                {
                    "temperature": float(temperature),
                    "pressure": float(pressure),
                    "liquid_entropy": float(liquid_entropy),
                    "vapor_entropy": float(vapor_entropy),
                    "liquid_enthalpy": float(liquid_enthalpy),
                    "vapor_enthalpy": float(vapor_enthalpy),
                }
            )

        if len(points) < 2:
            raise ValueError("Could not generate enough saturation points for the selected fluid.")

        return {
            "fluid": payload.fluid,
            "critical": {
                "temperature": props["critical_temperature"].magnitude,
                "pressure": props["critical_pressure"].magnitude,
                "density": props["critical_density"].magnitude,
            },
            "triple": {
                "temperature": props["triple_point_temperature"].magnitude,
                "pressure": props["triple_point_pressure"].magnitude,
            },
            "points": points,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/binary-vle")
def get_binary_vle(payload: BinaryVLERequest):
    try:
        if payload.fluid1 == payload.fluid2:
            raise ValueError("Select two different fluids for the binary VLE diagram.")

        props1 = components_obj.get_critical_properties(payload.fluid1)
        props2 = components_obj.get_critical_properties(payload.fluid2)
        lower_temperature = max(
            props1["triple_point_temperature"].magnitude,
            props2["triple_point_temperature"].magnitude,
        )
        upper_temperature = min(
            props1["critical_temperature"].magnitude,
            props2["critical_temperature"].magnitude,
        )

        if upper_temperature <= lower_temperature:
            raise ValueError("Invalid overlap between the selected fluids.")

        pressure = float(payload.pressure)
        sample_values = np.linspace(0.0, 1.0, payload.sample_count)

        def psat(fluid: str, temperature: float) -> float:
            return float(CP.PropsSI("P", "T", float(temperature), "Q", 0, fluid))

        def bracket_root(function):
            left = float(lower_temperature) * 1.0001
            right = float(upper_temperature) * 0.9999
            f_left = function(left)
            f_right = function(right)

            if f_left == 0:
                return left
            if f_right == 0:
                return right
            if f_left * f_right > 0:
                raise ValueError("Could not bracket the equilibrium temperature for this pressure.")

            for _ in range(80):
                mid = (left + right) / 2
                f_mid = function(mid)
                if abs(f_mid) < 1e-7 or abs(right - left) < 1e-7:
                    return mid
                if f_left * f_mid <= 0:
                    right = mid
                    f_right = f_mid
                else:
                    left = mid
                    f_left = f_mid

            return (left + right) / 2

        bubble_points = []
        dew_points = []

        for value in sample_values:
            x1 = float(value)
            x2 = 1.0 - x1

            bubble_temperature = bracket_root(
                lambda temperature: x1 * psat(payload.fluid1, temperature)
                + x2 * psat(payload.fluid2, temperature)
                - pressure
            )
            bubble_psat1 = psat(payload.fluid1, bubble_temperature)
            bubble_psat2 = psat(payload.fluid2, bubble_temperature)
            bubble_y1 = (x1 * bubble_psat1) / pressure if pressure else 0.0
            bubble_y2 = (x2 * bubble_psat2) / pressure if pressure else 0.0
            bubble_total = bubble_y1 + bubble_y2
            if bubble_total > 0:
                bubble_y1 /= bubble_total
                bubble_y2 /= bubble_total

            bubble_points.append(
                {
                    "liquid_fraction": x1,
                    "vapor_fraction": float(bubble_y1),
                    "temperature": float(bubble_temperature),
                }
            )

            y1 = float(value)
            y2 = 1.0 - y1
            dew_temperature = bracket_root(
                lambda temperature: (y1 / psat(payload.fluid1, temperature))
                + (y2 / psat(payload.fluid2, temperature))
                - (1.0 / pressure)
            )
            dew_psat1 = psat(payload.fluid1, dew_temperature)
            dew_psat2 = psat(payload.fluid2, dew_temperature)
            dew_x1 = (y1 * pressure) / dew_psat1 if dew_psat1 else 0.0
            dew_x2 = (y2 * pressure) / dew_psat2 if dew_psat2 else 0.0
            dew_total = dew_x1 + dew_x2
            if dew_total > 0:
                dew_x1 /= dew_total
                dew_x2 /= dew_total

            dew_points.append(
                {
                    "liquid_fraction": float(dew_x1),
                    "vapor_fraction": y1,
                    "temperature": float(dew_temperature),
                }
            )

        return {
            "fluid1": payload.fluid1,
            "fluid2": payload.fluid2,
            "pressure": pressure,
            "bubble_points": bubble_points,
            "dew_points": dew_points,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/property-surface")
def get_property_surface(payload: PropertySurfaceRequest):
    try:
        if payload.temperature_max <= payload.temperature_min:
            raise ValueError("Temperature max must be greater than temperature min.")
        if payload.pressure_max <= payload.pressure_min:
            raise ValueError("Pressure max must be greater than pressure min.")
        if payload.property_name not in PROPERTY_SURFACE_META:
            raise ValueError("Unsupported property for the surface map.")

        components_obj.get_critical_properties(payload.fluid)

        temperatures = np.linspace(payload.temperature_min, payload.temperature_max, payload.temperature_samples)
        pressures = np.linspace(payload.pressure_min, payload.pressure_max, payload.pressure_samples)
        values = []
        finite_values = []

        for pressure in pressures:
            row = []
            for temperature in temperatures:
                try:
                    value = float(
                        CP.PropsSI(payload.property_name, "T", float(temperature), "P", float(pressure), payload.fluid)
                    )
                except Exception:
                    value = None

                row.append(value)
                if value is not None and np.isfinite(value):
                    finite_values.append(value)

            values.append(row)

        if not finite_values:
            raise ValueError("Could not generate a valid property surface for the selected fluid.")

        property_meta = PROPERTY_SURFACE_META[payload.property_name]

        return {
            "fluid": payload.fluid,
            "property_name": payload.property_name,
            "property_label": property_meta["label"],
            "property_units": property_meta["units"],
            "temperatures": [float(value) for value in temperatures],
            "pressures": [float(value) for value in pressures],
            "values": values,
            "value_min": float(min(finite_values)),
            "value_max": float(max(finite_values)),
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


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
                "units": "adimensional"
            }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


PROPS_UNITS_MAP = {
    "H": "J/kg", "S": "J/(kg·K)", "D": "kg/m³", "T": "K", "P": "Pa",
    "C": "J/(kg·K)", "V": "Pa·s", "L": "W/(m·K)", "Q": "adimensional",
    "U": "J/kg", "A": "m/s", "Z": "adimensional",
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
                    "units": "adimensional"
                } if key not in ["temperature", "pressure"] else value
        
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

