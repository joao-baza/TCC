import CoolProp.CoolProp as CP
import numpy as np
from fastapi import APIRouter, HTTPException
from models.components import Components
from schemas import (
    ComponentsExampleResponse,
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


def validate_components_example_catalogs() -> None:
    available_components = set(components_obj.list_all_components())
    available_properties = set(components_obj.get_property_names().keys())
    available_mixture_properties = set(components_obj.get_property_mixture_names().keys())

    required_components = {
        "Air",
        "Acetone",
        "Ethanol",
        "Methanol",
        "R1234ze(E)",
        "Water",
    }
    required_properties = {"C", "D", "V", "Z", "M"}
    required_mixture_properties = {"D", "M", "V", "C"}

    missing_components = sorted(required_components - available_components)
    missing_properties = sorted(required_properties - available_properties)
    missing_mixture_properties = sorted(required_mixture_properties - available_mixture_properties)

    if missing_components or missing_properties or missing_mixture_properties:
        details = []
        if missing_components:
            details.append(f"Missing components: {', '.join(missing_components)}")
        if missing_properties:
            details.append(f"Missing properties: {', '.join(missing_properties)}")
        if missing_mixture_properties:
            details.append(
                f"Missing mixture properties: {', '.join(missing_mixture_properties)}"
            )
        raise RuntimeError("; ".join(details))


@router.get("/list")
def list_components():
    return catalog_options(components_obj.list_all_components())


@router.get("/property-names")
def get_property_names():
    return components_obj.get_property_names()


@router.get("/property-mixture-names")
def get_property_mixture_names():
    return components_obj.get_property_mixture_names()


@router.get("/example", response_model=ComponentsExampleResponse)
def get_components_example():
    validate_components_example_catalogs()
    return {
        "pure_fluid": {
            "fluid": "Air",
            "property_names": ["C", "D", "V", "Z", "M"],
            "temperature": 353.15,
            "pressure": 101325,
        },
        "mixtures": {
            "fluid_fractions": {
                "Water": 0.7,
                "Ethanol": 0.29,
                "Methanol": 0.01,
            },
            "temperature": 303.15,
            "pressure": 101325,
            "properties": ["D", "M", "V", "C"],
        },
        "ternary_diagram": {
            "component_a": "Water",
            "component_b": "Ethanol",
            "component_c": "Methanol",
            "fraction_a": 0.7,
            "fraction_b": 0.29,
            "fraction_c": 0.1,
        },
        "binary_vle": {
            "fluid1": "Acetone",
            "fluid2": "Water",
            "pressure": 101325,
            "sample_count": 30,
        },
        "mccabe_thiele": {
            "distillate_composition": 0.95,
            "bottoms_composition": 0.05,
            "feed_composition": 0.7,
            "reflux_ratio": 3,
            "q_value": 1,
            "max_stages": 10,
        },
        "property_surface": {
            "fluid": "Ethanol",
            "property_name": "C",
            "temperature_min": 263.15,
            "temperature_max": 383.15,
            "pressure_min": 50662.5,
            "pressure_max": 101326,
            "temperature_samples": 20,
            "pressure_samples": 20,
        },
        "phase_envelope": {
            "fluid": "R1234ze(E)",
            "sample_count": 40,
        },
    }


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

