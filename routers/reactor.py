import base64
from io import BytesIO
from fastapi import APIRouter, HTTPException
from models import ReactorIsothermalHeterogeneous
from schemas import ReactorRequest, ReactorPlotRequest
from .utils import serialize

router = APIRouter(prefix="/reactor", tags=["Reactor"])
reactor_isothermal = ReactorIsothermalHeterogeneous()


@router.get("/cstr/calculation-types")
def get_cstr_calculation_types():
    return reactor_isothermal.cstr({})


@router.post("/cstr")
def calculate_cstr(payload: ReactorRequest):
    try:
        # Convert from pydantic model to the expected format
        components = []
        for comp in payload.components:
            component_dict = {
                "state": comp.state,
                "component_name": comp.component_name,
                "flow_rate_inlet": comp.flow_rate_inlet,
                "molar_concentration_inlet": comp.molar_concentration_inlet
            }
            components.append(component_dict)
        
        params = {
            "input_type": payload.input_type,
            "components": components,
            "stoichiometric_coefficients": payload.stoichiometric_coefficients,
            "reaction_rate_params": payload.reaction_rate_params,
            "operation_conditions": payload.operation_conditions
        }
        
        # Add conditional parameters based on input_type
        if payload.input_type == "conversion_and_kinetics":
            params["conversion"] = payload.conversion
        elif payload.input_type == "volume_and_kinetics":
            params["volume"] = payload.volume
        elif payload.input_type == "residence_time_and_kinetics":
            params["residence_time"] = payload.residence_time
        
        result = reactor_isothermal.cstr(params)
        
        # Use the serialize function to convert pint quantities to serializable format
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/pfr/calculation-types")
def get_pfr_calculation_types():
    return reactor_isothermal.pfr({})


@router.post("/pfr")
def calculate_pfr(payload: ReactorRequest):
    try:
        # Convert from pydantic model to the expected format
        components = []
        for comp in payload.components:
            component_dict = {
                "state": comp.state,
                "component_name": comp.component_name,
                "flow_rate_inlet": comp.flow_rate_inlet,
                "molar_concentration_inlet": comp.molar_concentration_inlet
            }
            components.append(component_dict)
        
        params = {
            "input_type": payload.input_type,
            "components": components,
            "stoichiometric_coefficients": payload.stoichiometric_coefficients,
            "reaction_rate_params": payload.reaction_rate_params,
            "recycling_ratio": payload.recycling_ratio,
            "operation_conditions": payload.operation_conditions
        }
        
        # Add conditional parameters based on input_type
        if payload.input_type == "conversion_and_kinetics":
            params["conversion"] = payload.conversion
        elif payload.input_type == "volume_and_kinetics":
            params["volume"] = payload.volume
        elif payload.input_type == "residence_time_and_kinetics":
            params["residence_time"] = payload.residence_time
        
        result = reactor_isothermal.pfr(params)
        
        # Use the serialize function to convert pint quantities to serializable format
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/limiting-reagent")
def calculate_limiting_reagent(payload: ReactorRequest):
    try:
        # Convert from pydantic model to the expected format
        components = []
        for comp in payload.components:
            component_dict = {
                "state": comp.state,
                "component_name": comp.component_name,
                "flow_rate_inlet": comp.flow_rate_inlet,
                "molar_concentration_inlet": comp.molar_concentration_inlet
            }
            components.append(component_dict)
        
        params = {
            "components": components,
            "stoichiometric_coefficients": payload.stoichiometric_coefficients
        }
        
        limiting_index = reactor_isothermal.determine_limiting_reagent(params)
        return {
            "limiting_reagent": components[limiting_index]["component_name"]
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/plot-conversion-vs-volume")
def plot_conversion_vs_volume(payload: ReactorPlotRequest):
    try:
        # Convert from pydantic model to the expected format
        components = []
        for comp in payload.components:
            component_dict = {
                "state": comp.state,
                "component_name": comp.component_name,
                "flow_rate_inlet": comp.flow_rate_inlet,
                "molar_concentration_inlet": comp.molar_concentration_inlet
            }
            components.append(component_dict)
        
        params = {
            "components": components,
            "stoichiometric_coefficients": payload.stoichiometric_coefficients,
            "reaction_rate_params": payload.reaction_rate_params,
            "operation_conditions": payload.operation_conditions,
            "max_conversion": payload.max_conversion,
            "num_points": 50,        # Default value
            "recycling_ratio_pfr": payload.recycling_ratio
        }
        
        fig, ax = reactor_isothermal.plot_conversion_vs_volume(params)
        
        # Save the figure to a BytesIO object and encode as base64
        buffer = BytesIO()
        fig.savefig(buffer, format='png')
        buffer.seek(0)
        
        # Encode the image to base64
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return {"image_base64": image_base64}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

