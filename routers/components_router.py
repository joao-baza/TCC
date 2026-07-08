import CoolProp.CoolProp as CP
import numpy as np
from fastapi import APIRouter, HTTPException
from models.charting import build_chart_model, build_linear_axis, build_log_axis, build_series_model
from models.components import Components
from schemas import (
    ComponentsExampleResponse,
    BinaryVLERequest,
    ChartMetadataModel,
    ChartModel,
    McCabeThieleChartRequest,
    FluidRequest,
    MixturePropertiesRequest,
    PropertyRequest,
    PropertySurfaceChartResponse,
    PropertySurfaceRequest,
    PropsStateRequest,
    SaturationEnvelopeRequest,
    TernaryDiagramChartRequest,
    TernaryDiagramChartResponse,
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

TERNARY_LEFT = {"x": 0.0, "y": 0.0}
TERNARY_RIGHT = {"x": 1.0, "y": 0.0}
TERNARY_TOP = {"x": 0.5, "y": 0.8660254037844386}


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


def _format_fraction(value: float) -> str:
    return f"{float(value):.3g}"


def _safe_clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _interpolate_color(start: float, end: float, ratio: float) -> float:
    return start + ((end - start) * ratio)


def _property_surface_color(value: float | None, minimum: float, maximum: float) -> str:
    if value is None or not np.isfinite(value):
        return "#e2e8f0"

    if np.isclose(minimum, maximum):
        return "hsl(180 55% 44%)"

    ratio = max(0.0, min(1.0, (float(value) - minimum) / (maximum - minimum)))
    hue = _interpolate_color(232, 34, ratio)
    saturation = _interpolate_color(58, 82, ratio)
    lightness = _interpolate_color(94, 42, ratio)
    return f"hsl({hue:.0f} {saturation:.0f}% {lightness:.0f}%)"


def _format_pressure_label(value: float) -> str:
    if value >= 1_000_000:
        return f"{value / 1_000_000:.3g} MPa"
    if value >= 1000:
        return f"{value / 1000:.3g} kPa"
    return f"{value:.3g} Pa"


def _build_ternary_projection(payload: TernaryDiagramChartRequest) -> TernaryDiagramChartResponse:
    raw = [float(payload.fraction_a), float(payload.fraction_b), float(payload.fraction_c)]
    total = sum(raw)
    if total <= 0:
        raise ValueError("At least one ternary fraction must be positive.")

    a, b, c = [value / total for value in raw]
    boundary = [TERNARY_LEFT, TERNARY_RIGHT, TERNARY_TOP]
    guide_lines = [
        {
            "start": {"x": 0.125, "y": 0.21650635094610965},
            "end": {"x": 0.875, "y": 0.21650635094610965},
        },
        {
            "start": {"x": 0.25, "y": 0.4330127018922193},
            "end": {"x": 0.75, "y": 0.4330127018922193},
        },
        {
            "start": {"x": 0.375, "y": 0.649519052838329},
            "end": {"x": 0.625, "y": 0.649519052838329},
        },
    ]
    point = {
        "x": b + (c / 2.0),
        "y": c * TERNARY_TOP["y"],
    }
    summary = " · ".join(
        [
            f"{payload.component_a}: {_format_fraction(a)}",
            f"{payload.component_b}: {_format_fraction(b)}",
            f"{payload.component_c}: {_format_fraction(c)}",
        ]
    )

    return TernaryDiagramChartResponse(
        id="components-ternary-diagram-chart",
        title="Diagrama ternário",
        component_labels=[payload.component_a, payload.component_b, payload.component_c],
        boundary=boundary,
        guide_lines=guide_lines,
        streams=[
            {
                "label": payload.stream_name.strip() or "Corrente atual",
                "summary": summary,
                "x": point["x"],
                "y": point["y"],
                "color": "#2563eb",
            }
        ],
    )


def _sort_equilibrium_points(points: list[dict[str, float]]) -> list[dict[str, float]]:
    return sorted(
        [
            point
            for point in points
            if np.isfinite(point["liquid_fraction"]) and np.isfinite(point["vapor_fraction"])
        ],
        key=lambda point: point["liquid_fraction"],
    )


def _interpolate_x_for_y(points: list[dict[str, float]], y_value: float) -> float | None:
    if not points:
        return None

    clean_points = _sort_equilibrium_points(points)
    first = clean_points[0]
    last = clean_points[-1]

    if y_value <= first["vapor_fraction"]:
        return float(first["liquid_fraction"])
    if y_value >= last["vapor_fraction"]:
        return float(last["liquid_fraction"])

    for left, right in zip(clean_points, clean_points[1:]):
        min_y = min(left["vapor_fraction"], right["vapor_fraction"])
        max_y = max(left["vapor_fraction"], right["vapor_fraction"])
        if y_value < min_y or y_value > max_y:
            continue

        span = right["vapor_fraction"] - left["vapor_fraction"]
        ratio = 0.0 if np.isclose(span, 0.0) else (y_value - left["vapor_fraction"]) / span
        return float(left["liquid_fraction"] + ((right["liquid_fraction"] - left["liquid_fraction"]) * ratio))

    return float(last["liquid_fraction"])


def _line_intersection(first_slope: float, first_intercept: float, second_slope: float, second_intercept: float):
    slope_delta = first_slope - second_slope
    if abs(slope_delta) < 1e-9:
        return None

    x_value = (second_intercept - first_intercept) / slope_delta
    y_value = (first_slope * x_value) + first_intercept
    return {"x": x_value, "y": y_value}


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


@router.post("/binary-vle/chart", response_model=ChartModel)
def get_binary_vle_chart(payload: BinaryVLERequest):
    try:
        data = get_binary_vle(payload)
        bubble_points = [
            {"x": float(point["liquid_fraction"]), "y": float(point["temperature"])}
            for point in data["bubble_points"]
        ]
        dew_points = [
            {"x": float(point["vapor_fraction"]), "y": float(point["temperature"])}
            for point in data["dew_points"]
        ]
        temperatures = [point["y"] for point in bubble_points] + [point["y"] for point in dew_points]

        return build_chart_model(
            chart_id="components-binary-vle-chart",
            title="Diagrama T-x-y binário",
            subtitle=f"{payload.fluid1} / {payload.fluid2} a {payload.pressure:.0f} Pa",
            axes={
                "x": build_linear_axis(
                    [0.0, 1.0],
                    label=f"Fração molar de {payload.fluid1}",
                    units="adimensional",
                    domain={"min": 0.0, "max": 1.0},
                ),
                "y": build_linear_axis(
                    temperatures,
                    label="Temperatura",
                    units="K",
                ),
            },
            series=[
                build_series_model(
                    name="Curva de bolha",
                    series_id="bubble-curve",
                    color="#2563eb",
                    points=bubble_points,
                ),
                build_series_model(
                    name="Curva de orvalho",
                    series_id="dew-curve",
                    color="#dc2626",
                    points=dew_points,
                ),
            ],
            metadata=ChartMetadataModel(version="1.0", units={"x": "adimensional", "y": "K"}),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/ternary-diagram/chart", response_model=TernaryDiagramChartResponse)
def get_ternary_diagram_chart(payload: TernaryDiagramChartRequest):
    try:
        return _build_ternary_projection(payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/mccabe-thiele/chart", response_model=ChartModel)
def get_mccabe_thiele_chart(payload: McCabeThieleChartRequest):
    try:
        binary = get_binary_vle(
            BinaryVLERequest(
                fluid1=payload.fluid1,
                fluid2=payload.fluid2,
                pressure=payload.pressure,
                sample_count=payload.sample_count,
            )
        )
        equilibrium_points = _sort_equilibrium_points(binary["bubble_points"])
        if not equilibrium_points:
            raise ValueError("Could not generate equilibrium points for McCabe-Thiele.")

        distillate = _safe_clamp01(payload.distillate_composition)
        bottoms = _safe_clamp01(payload.bottoms_composition)
        feed = _safe_clamp01(payload.feed_composition)
        reflux = max(float(payload.reflux_ratio), 0.0)
        q_value = float(payload.q_value)

        rectifying_slope = reflux / (reflux + 1.0)
        rectifying_intercept = distillate / (reflux + 1.0)
        q_line = None
        if abs(q_value - 1.0) >= 1e-9:
            q_slope = q_value / (q_value - 1.0)
            q_intercept = -feed / (q_value - 1.0)
            q_line = {"slope": q_slope, "intercept": q_intercept}

        feed_intersection = (
            _line_intersection(rectifying_slope, rectifying_intercept, q_line["slope"], q_line["intercept"])
            if q_line is not None
            else {"x": feed, "y": (rectifying_slope * feed) + rectifying_intercept}
        )
        feed_switch_x = _safe_clamp01(feed_intersection["x"] if feed_intersection else feed)

        if feed_intersection is not None and abs(feed_intersection["x"] - bottoms) >= 1e-9:
            stripping_slope = (feed_intersection["y"] - bottoms) / (feed_intersection["x"] - bottoms)
        else:
            stripping_slope = 1.0
        stripping_intercept = bottoms - (stripping_slope * bottoms)

        stage_points = [{"x": distillate, "y": distillate}]
        stage_count = 0
        current_x = distillate
        current_y = distillate

        for _ in range(payload.max_stages):
            x_equilibrium = _interpolate_x_for_y(equilibrium_points, current_y)
            if x_equilibrium is None:
                break

            horizontal_end = {"x": _safe_clamp01(x_equilibrium), "y": _safe_clamp01(current_y)}
            stage_points.append(horizontal_end)
            if horizontal_end["x"] <= bottoms + 1e-3:
                break

            use_rectifying = horizontal_end["x"] >= feed_switch_x or feed_intersection is None
            slope = rectifying_slope if use_rectifying else stripping_slope
            intercept = rectifying_intercept if use_rectifying else stripping_intercept
            vertical_end = {
                "x": horizontal_end["x"],
                "y": _safe_clamp01((slope * horizontal_end["x"]) + intercept),
            }
            stage_points.append(vertical_end)
            current_x = vertical_end["x"]
            current_y = vertical_end["y"]
            stage_count += 1

            if current_x <= bottoms + 1e-3 or current_y <= bottoms + 1e-3:
                break

        series = [
            build_series_model(
                name="Diagonal",
                series_id="diagonal",
                color="#94a3b8",
                points=[{"x": 0.0, "y": 0.0}, {"x": 1.0, "y": 1.0}],
            ),
            build_series_model(
                name="Equilíbrio",
                series_id="equilibrium-curve",
                color="#2563eb",
                points=[
                    {"x": float(point["liquid_fraction"]), "y": float(point["vapor_fraction"])}
                    for point in equilibrium_points
                ],
            ),
            build_series_model(
                name="Linha de retificação",
                series_id="rectifying-line",
                color="#0f766e",
                points=[
                    {"x": 0.0, "y": rectifying_intercept},
                    {"x": 1.0, "y": rectifying_slope + rectifying_intercept},
                ],
            ),
            build_series_model(
                name="Linha de esgotamento",
                series_id="stripping-line",
                color="#b45309",
                points=[
                    {"x": 0.0, "y": stripping_intercept},
                    {"x": 1.0, "y": stripping_slope + stripping_intercept},
                ],
            ),
            build_series_model(
                name="Estágios",
                series_id="stage-steps",
                color="#dc2626",
                points=stage_points,
            ),
        ]
        if q_line is not None:
            series.append(
                build_series_model(
                    name="Linha q",
                    series_id="q-line",
                    color="#7c3aed",
                    points=[
                        {"x": 0.0, "y": q_line["intercept"]},
                        {"x": 1.0, "y": q_line["slope"] + q_line["intercept"]},
                    ],
                )
            )
        else:
            series.append(
                build_series_model(
                    name="Linha q",
                    series_id="q-line",
                    color="#7c3aed",
                    points=[{"x": feed, "y": 0.0}, {"x": feed, "y": 1.0}],
                )
            )

        return build_chart_model(
            chart_id="components-mccabe-thiele-chart",
            title="McCabe-Thiele",
            subtitle=f"{payload.fluid1} / {payload.fluid2}",
            axes={
                "x": build_linear_axis([0.0, 1.0], label="x (líquido)", units="fração molar", domain={"min": 0.0, "max": 1.0}),
                "y": build_linear_axis([0.0, 1.0], label="y (vapor)", units="fração molar", domain={"min": 0.0, "max": 1.0}),
            },
            series=series,
            markers=[
                {"id": "xD", "x": distillate, "y": distillate, "label": "xD", "color": "#0f766e"},
                {"id": "xB", "x": bottoms, "y": bottoms, "label": "xB", "color": "#b45309"},
                {"id": "zF", "x": feed, "y": feed_intersection["y"] if feed_intersection else feed, "label": "zF", "color": "#7c3aed"},
            ],
            annotations=[
                {"id": "stage-count", "text": f"N teórico ≈ {stage_count}"},
                {"id": "operating-note", "text": f"q = {_format_fraction(q_value)} · R = {_format_fraction(reflux)}"},
            ],
            metadata=ChartMetadataModel(version="1.0", units={"x": "fração molar", "y": "fração molar"}),
        )
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


@router.post("/property-surface/chart", response_model=PropertySurfaceChartResponse)
def get_property_surface_chart(payload: PropertySurfaceRequest):
    try:
        data = get_property_surface(payload)
        temperatures = data["temperatures"]
        pressures = data["pressures"]
        if len(temperatures) < 2 or len(pressures) < 2:
            raise ValueError("Surface chart requires at least two temperatures and two pressures.")

        temp_step = float(temperatures[1] - temperatures[0])
        pressure_step = float(pressures[1] - pressures[0])
        cells = []
        for row_index, pressure in enumerate(pressures):
            for column_index, temperature in enumerate(temperatures):
                value = data["values"][row_index][column_index]
                tooltip = (
                    f"{float(temperature):.3g} K · {_format_pressure_label(float(pressure))} · sem solução"
                    if value is None
                    else f"{float(temperature):.3g} K · {_format_pressure_label(float(pressure))} · {data['property_label']} = {float(value):.3g} {data['property_units']}"
                )
                cells.append(
                    {
                        "x": float(temperature),
                        "y": float(pressure),
                        "width": temp_step,
                        "height": pressure_step,
                        "value": None if value is None else float(value),
                        "fill": _property_surface_color(value, data["value_min"], data["value_max"]),
                        "tooltip": tooltip,
                    }
                )

        legend_offsets = [0.0, 0.33, 0.66, 1.0]
        legend_stops = [
            {
                "offset": offset,
                "color": _property_surface_color(
                    data["value_min"] + ((data["value_max"] - data["value_min"]) * offset),
                    data["value_min"],
                    data["value_max"],
                ),
                "value": data["value_min"] + ((data["value_max"] - data["value_min"]) * offset),
            }
            for offset in legend_offsets
        ]

        return PropertySurfaceChartResponse(
            id="components-property-surface-chart",
            title="Superfície T-P",
            subtitle=f"{payload.fluid} · {data['property_label']}",
            fluid=payload.fluid,
            property_label=data["property_label"],
            property_units=data["property_units"],
            x_axis=build_linear_axis(
                temperatures,
                label="Temperatura",
                units="K",
                domain={"min": min(temperatures), "max": max(temperatures)},
            ),
            y_axis=build_linear_axis(
                pressures,
                label="Pressão",
                units="Pa",
                domain={"min": min(pressures), "max": max(pressures)},
            ),
            cells=cells,
            legend_stops=legend_stops,
            value_min=data["value_min"],
            value_max=data["value_max"],
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/phase-envelope/chart", response_model=ChartModel)
def get_phase_envelope_chart(payload: SaturationEnvelopeRequest):
    try:
        data = get_saturation_envelope(payload)
        entropy_values = [point["liquid_entropy"] for point in data["points"]] + [
            point["vapor_entropy"] for point in data["points"]
        ]
        temperature_values = [point["temperature"] for point in data["points"]] + [
            data["triple"]["temperature"],
            data["critical"]["temperature"],
        ]
        liquid_points = [
            {"x": float(point["liquid_entropy"]), "y": float(point["temperature"])}
            for point in data["points"]
        ]
        vapor_points = [
            {"x": float(point["vapor_entropy"]), "y": float(point["temperature"])}
            for point in data["points"]
        ]
        band_points = liquid_points + list(reversed(vapor_points))

        return build_chart_model(
            chart_id="components-phase-envelope-chart",
            title="Envelope de fase",
            subtitle=data["fluid"],
            axes={
                "x": build_linear_axis(entropy_values, label="Entropia", units="J/(kg·K)"),
                "y": build_linear_axis(temperature_values, label="Temperatura", units="K"),
            },
            series=[
                build_series_model(
                    name="Região bifásica",
                    series_id="two-phase-region",
                    kind="band",
                    color="#93c5fd",
                    points=band_points,
                ),
                build_series_model(
                    name="Curva de líquido saturado",
                    series_id="liquid-curve",
                    color="#0f766e",
                    points=liquid_points,
                ),
                build_series_model(
                    name="Curva de vapor saturado",
                    series_id="vapor-curve",
                    color="#b45309",
                    points=vapor_points,
                ),
            ],
            markers=[
                {
                    "id": "triple-point",
                    "x": liquid_points[0]["x"],
                    "y": float(data["triple"]["temperature"]),
                    "label": "Ponto tríplice",
                    "color": "#0f766e",
                },
                {
                    "id": "critical-point",
                    "x": vapor_points[-1]["x"],
                    "y": float(data["critical"]["temperature"]),
                    "label": "Ponto crítico",
                    "color": "#b45309",
                },
            ],
            annotations=[],
            metadata=ChartMetadataModel(version="1.0", units={"x": "J/(kg·K)", "y": "K"}),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/vapor-pressure/chart", response_model=ChartModel)
def get_vapor_pressure_chart(payload: SaturationEnvelopeRequest):
    try:
        data = get_saturation_envelope(payload)
        temperature_values = [point["temperature"] for point in data["points"]]
        pressure_values = [point["pressure"] for point in data["points"]]
        curve_points = [
            {"x": float(point["temperature"]), "y": float(point["pressure"])}
            for point in data["points"]
        ]

        return build_chart_model(
            chart_id="components-vapor-pressure-chart",
            title="Curva de pressão de vapor",
            subtitle=f"Relação P_sat(T) para {data['fluid']}.",
            axes={
                "x": build_linear_axis(
                    [*temperature_values, float(data["triple"]["temperature"]), float(data["critical"]["temperature"])],
                    label="Temperatura",
                    units="K",
                ),
                "y": build_log_axis(
                    [*pressure_values, float(data["triple"]["pressure"]), float(data["critical"]["pressure"])],
                    label="Pressão de saturação",
                    units="Pa",
                ),
            },
            series=[
                build_series_model(
                    name="Pressão de vapor",
                    series_id="vapor-pressure-curve",
                    color="#0f766e",
                    points=curve_points,
                )
            ],
            markers=[
                {
                    "id": "triple-point",
                    "x": float(data["triple"]["temperature"]),
                    "y": float(data["triple"]["pressure"]),
                    "label": "Ponto tríplice",
                    "color": "#b45309",
                },
                {
                    "id": "critical-point",
                    "x": float(data["critical"]["temperature"]),
                    "y": float(data["critical"]["pressure"]),
                    "label": "Ponto crítico",
                    "color": "#1d4ed8",
                },
            ],
            annotations=[],
            metadata=ChartMetadataModel(version="1.0", units={"x": "K", "y": "Pa"}),
        )
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
