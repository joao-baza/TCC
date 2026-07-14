import math
import base64
from io import BytesIO
from fastapi import APIRouter, HTTPException
from models.charting import build_chart_model, build_linear_axis, build_series_model
from models.reactor import ReactorIsothermalHeterogeneous
from schemas import (
    ChartMetadataModel,
    ChartModel,
    MarkerModel,
    ReactorArrheniusChartRequest,
    ReactorPlotRequest,
    ReactorRecycleProfileRequest,
    ReactorRequest,
    ReactorSpatialProfileRequest,
)
from .utils import serialize
from .i18n import catalog_options

router = APIRouter(prefix="/reactor", tags=["Reactor"])
reactor_isothermal = ReactorIsothermalHeterogeneous()


def _components_to_dicts(components):
    return [
        {
            "state": comp.state,
            "component_name": comp.component_name,
            "flow_rate_inlet": comp.flow_rate_inlet,
            "molar_concentration_inlet": comp.molar_concentration_inlet,
        }
        for comp in components
    ]


def _format_recycling_ratio(value: float) -> str:
    formatted = f"{value:.6f}".rstrip("0").rstrip(".")
    return formatted.replace(".", ",")


@router.get("/cstr/calculation-types")
def get_cstr_calculation_types():
    return catalog_options(
        reactor_isothermal.cstr({}),
        {
            "conversion_and_kinetics": "Conversão e cinética",
            "volume_and_kinetics": "Volume e cinética",
            "residence_time_and_kinetics": "Tempo de residência e cinética",
        },
    )


@router.post("/cstr")
def calculate_cstr(payload: ReactorRequest):
    try:
        components = _components_to_dicts(payload.components)
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
    return catalog_options(
        reactor_isothermal.pfr({}),
        {
            "conversion_and_kinetics": "Conversão e cinética",
            "volume_and_kinetics": "Volume e cinética",
            "residence_time_and_kinetics": "Tempo de residência e cinética",
        },
    )


@router.post("/pfr")
def calculate_pfr(payload: ReactorRequest):
    try:
        components = _components_to_dicts(payload.components)
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


@router.post("/pfr/recycle-profile")
def calculate_pfr_recycle_profile(payload: ReactorRecycleProfileRequest):
    try:
        components = _components_to_dicts(payload.components)
        points = reactor_isothermal.sample_pfr_recycle_profile(
            {
                "components": components,
                "stoichiometric_coefficients": payload.stoichiometric_coefficients,
                "reaction_rate_params": payload.reaction_rate_params,
                "operation_conditions": payload.operation_conditions,
                "volume": payload.volume,
                "recycle_ratios": payload.recycle_ratios,
            }
        )
        return serialize({"points": points})
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/pfr/spatial-profile")
def calculate_pfr_spatial_profile(payload: ReactorSpatialProfileRequest):
    try:
        components = _components_to_dicts(payload.components)
        result = reactor_isothermal.pfr_spatial_profile(
            {
                "components": components,
                "stoichiometric_coefficients": payload.stoichiometric_coefficients,
                "reaction_rate_params": payload.reaction_rate_params,
                "operation_conditions": payload.operation_conditions,
                "volume": payload.volume,
                "recycling_ratio": payload.recycling_ratio,
                "axial_positions": payload.axial_positions,
            }
        )
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/levenspiel/chart", response_model=ChartModel)
def build_levenspiel_chart(payload: ReactorPlotRequest):
    try:
        components = _components_to_dicts(payload.components)
        recycling_ratio = float(payload.recycling_ratio or 0.0)
        subtitle = (
            "Volume necessário em função da conversão para a mesma cinética sem reciclo."
            if recycling_ratio <= 0
            else "Volume necessário em função da conversão para a mesma cinética, "
            f"com razão de reciclo R = {_format_recycling_ratio(recycling_ratio)} no PFR."
        )
        chart_data = reactor_isothermal.conversion_vs_volume_data(
            {
                "components": components,
                "stoichiometric_coefficients": payload.stoichiometric_coefficients,
                "reaction_rate_params": payload.reaction_rate_params,
                "operation_conditions": payload.operation_conditions,
                "max_conversion": payload.max_conversion,
                "num_points": 50,
                "recycling_ratio_pfr": recycling_ratio,
            }
        )
        cstr_points = [{"x": point["y"], "y": point["x"]} for point in chart_data["cstr"]]
        pfr_points = [{"x": point["y"], "y": point["x"]} for point in chart_data["pfr"]]
        all_points = [*cstr_points, *pfr_points]
        x_values = [0.0, *(point["x"] for point in all_points), chart_data["max_conversion"]]
        y_values = [0.0, *(point["y"] for point in all_points)]
        markers = []

        if payload.cstr_conversion is not None:
            cstr_result = reactor_isothermal.cstr(
                {
                    "input_type": "conversion_and_kinetics",
                    "components": components,
                    "stoichiometric_coefficients": payload.stoichiometric_coefficients,
                    "reaction_rate_params": payload.reaction_rate_params,
                    "operation_conditions": payload.operation_conditions,
                    "conversion": payload.cstr_conversion,
                }
            )
            markers.append(
                MarkerModel(
                    id="cstr-operating-point",
                    x=float(payload.cstr_conversion),
                    y=float(cstr_result["volume"].to(reactor_isothermal.ureg.m**3).magnitude),
                    label="CSTR operacional",
                    color="#2563eb",
                )
            )

        if payload.pfr_conversion is not None:
            pfr_result = reactor_isothermal.pfr(
                {
                    "input_type": "conversion_and_kinetics",
                    "components": components,
                    "stoichiometric_coefficients": payload.stoichiometric_coefficients,
                    "reaction_rate_params": payload.reaction_rate_params,
                    "operation_conditions": payload.operation_conditions,
                    "recycling_ratio": recycling_ratio,
                    "conversion": payload.pfr_conversion,
                }
            )
            markers.append(
                MarkerModel(
                    id="pfr-operating-point",
                    x=float(payload.pfr_conversion),
                    y=float(pfr_result["volume"].to(reactor_isothermal.ureg.m**3).magnitude),
                    label="PFR operacional",
                    color="#dc2626",
                )
            )

        return build_chart_model(
            chart_id="reactor-levenspiel-chart",
            title="Comparação Levenspiel CSTR vs PFR",
            subtitle=subtitle,
            axes={
                "x": build_linear_axis(
                    x_values,
                    label="Conversão",
                    units="adimensional",
                    domain={"min": 0.0, "max": 1.0},
                ),
                "y": build_linear_axis(
                    [0.0, *y_values],
                    label="Volume",
                    units="m³",
                    domain={"min": 0.0, "max": max(y_values) * 1.05 if y_values else 1.0},
                ),
            },
            series=[
                build_series_model(
                    name="CSTR",
                    series_id="cstr-volume",
                    color="#2563eb",
                    points=cstr_points,
                ),
                build_series_model(
                    name="PFR",
                    series_id="pfr-volume",
                    color="#dc2626",
                    points=pfr_points,
                ),
            ],
            markers=markers,
            metadata=ChartMetadataModel(version="1.0", units={"x": "adimensional", "y": "m³"}),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/arrhenius/chart", response_model=ChartModel)
def build_arrhenius_chart(payload: ReactorArrheniusChartRequest):
    try:
        gas_constant = 8.314462618
        lower_temperature = max(payload.min_temperature or payload.reference_temperature * 0.8, 1.0)
        upper_temperature = max(
            payload.max_temperature or payload.reference_temperature * 1.2,
            lower_temperature + 1.0,
        )
        pre_exponential_factor = payload.reference_rate_constant * pow(
            math.e,
            payload.activation_energy / (gas_constant * payload.reference_temperature),
        )

        sample_temperatures = [
            lower_temperature + ((upper_temperature - lower_temperature) * index) / 7
            for index in range(8)
        ]
        sample_points = []
        for temperature in sample_temperatures:
            rate_constant = pre_exponential_factor * pow(
                math.e,
                -payload.activation_energy / (gas_constant * temperature),
            )
            sample_points.append(
                {
                    "x": 1000 / temperature,
                    "y": float(math.log(rate_constant)),
                }
            )

        reference_point = {
            "x": 1000 / payload.reference_temperature,
            "y": float(math.log(payload.reference_rate_constant)),
        }
        x_values = [point["x"] for point in sample_points]
        y_values = [point["y"] for point in sample_points]

        return build_chart_model(
            chart_id="reactor-arrhenius-chart",
            title="Arrhenius",
            subtitle="Curva semilog de Arrhenius: 1000 / T versus ln(k).",
            axes={
                "x": build_linear_axis(
                    x_values,
                    label="1000 / T",
                    units="10^3 K^-1",
                    domain={"min": min(x_values), "max": max(x_values)},
                ),
                "y": build_linear_axis(
                    y_values,
                    label="ln(k)",
                    units="adimensional",
                    domain={"min": min(y_values), "max": max(y_values)},
                ),
            },
            series=[
                build_series_model(
                    name="Curva de Arrhenius",
                    series_id="arrhenius-curve",
                    color="#0f766e",
                    points=sample_points,
                )
            ],
            markers=[
                MarkerModel(
                    id="reference-point",
                    x=reference_point["x"],
                    y=reference_point["y"],
                    label="Ponto de referência",
                    color="#dc2626",
                )
            ],
            metadata=ChartMetadataModel(
                version="1.0",
                units={"x": "10^3 K^-1", "y": "adimensional"},
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/pfr/profile/chart", response_model=ChartModel)
def build_pfr_profile_chart(payload: ReactorSpatialProfileRequest):
    try:
        components = _components_to_dicts(payload.components)
        profile = reactor_isothermal.pfr_spatial_profile(
            {
                "components": components,
                "stoichiometric_coefficients": payload.stoichiometric_coefficients,
                "reaction_rate_params": payload.reaction_rate_params,
                "operation_conditions": payload.operation_conditions,
                "volume": payload.volume,
                "recycling_ratio": payload.recycling_ratio,
                "axial_positions": payload.axial_positions,
            }
        )

        component_series = []
        concentration_values = []
        for component in payload.components:
            series_id = f"component-{component.component_name.lower()}"
            points = []
            for station in profile["stations"]:
                concentration = float(station["concentrations"][component.component_name].magnitude)
                concentration_values.append(concentration)
                points.append({"x": float(station["relative_volume"]), "y": concentration})
            component_series.append(
                build_series_model(
                    name=f"Concentração de {component.component_name}",
                    series_id=series_id,
                    color="#2563eb" if component.component_name == "A" else "#16a34a",
                    points=points,
                )
            )

        temperature_points = [
            {
                "x": float(station["relative_volume"]),
                "y": float(station["temperature"].magnitude),
            }
            for station in profile["stations"]
        ]
        temperature_values = [point["y"] for point in temperature_points]

        return build_chart_model(
            chart_id="reactor-pfr-profile-chart",
            title="Perfil espacial do PFR",
            subtitle="Concentrações e temperatura ao longo do volume relativo do reator.",
            axes={
                "x": build_linear_axis(
                    [0.0, 1.0],
                    label="Posição relativa no reator",
                    units="adimensional",
                    domain={"min": 0.0, "max": 1.0},
                ),
                "y": build_linear_axis(
                    concentration_values,
                    label="Concentração",
                    units="mol/m³",
                ),
                "temperature": build_linear_axis(
                    temperature_values,
                    label="Temperatura",
                    units="K",
                ),
            },
            series=[
                *component_series,
                build_series_model(
                    name="Temperatura",
                    series_id="temperature-profile",
                    color="#ea580c",
                    points=temperature_points,
                ),
            ],
            markers=[],
            metadata=ChartMetadataModel(
                version="1.0",
                units={"x": "adimensional", "y": "mol/m³", "temperature": "K"},
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/pfr/recycle-profile/chart", response_model=ChartModel)
def build_pfr_recycle_profile_chart(payload: ReactorRecycleProfileRequest):
    try:
        components = _components_to_dicts(payload.components)
        points = reactor_isothermal.sample_pfr_recycle_profile(
            {
                "components": components,
                "stoichiometric_coefficients": payload.stoichiometric_coefficients,
                "reaction_rate_params": payload.reaction_rate_params,
                "operation_conditions": payload.operation_conditions,
                "volume": payload.volume,
                "recycle_ratios": payload.recycle_ratios,
            }
        )
        x_values = [point["recycling_ratio"] for point in points]
        y_values = [float(point["conversion"].magnitude) for point in points]

        return build_chart_model(
            chart_id="reactor-pfr-recycle-profile-chart",
            title="Conversão em função do reciclo",
            subtitle="Perfil de sensibilidade da conversão ao variar a razão de reciclo.",
            axes={
                "x": build_linear_axis(
                    x_values,
                    label="Razão de reciclo",
                    units="adimensional",
                    domain={"min": 0.0, "max": max(x_values)},
                ),
                "y": build_linear_axis(y_values, label="Conversão", units="adimensional"),
            },
            series=[
                build_series_model(
                    name="Conversão",
                    series_id="conversion-vs-recycle",
                    color="#2563eb",
                    points=[
                        {
                            "x": point["recycling_ratio"],
                            "y": float(point["conversion"].magnitude),
                        }
                        for point in points
                    ],
                )
            ],
            markers=[
                MarkerModel(
                    id="baseline-recycle",
                    x=points[0]["recycling_ratio"],
                    y=float(points[0]["conversion"].magnitude),
                    label="Sem reciclo",
                    color="#dc2626",
                )
            ],
            metadata=ChartMetadataModel(version="1.0", units={"x": "adimensional", "y": "adimensional"}),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/limiting-reagent")
def calculate_limiting_reagent(payload: ReactorRequest):
    try:
        components = _components_to_dicts(payload.components)
        params = {
            "components": components,
            "stoichiometric_coefficients": payload.stoichiometric_coefficients
        }
        
        limiting_index = reactor_isothermal.determine_limiting_reagent(params)
        return {
            "reagente_limitante": components[limiting_index]["component_name"]
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/plot-conversion-vs-volume")
def plot_conversion_vs_volume(payload: ReactorPlotRequest):
    try:
        components = _components_to_dicts(payload.components)
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
