import math

from fastapi import APIRouter, HTTPException
from models.charting import build_chart_model, build_log_axis, build_series_model, ceil_log_tick, floor_log_tick
from models.components import Components
from models.hydraulic import Hydraulic, MOODY_REFERENCE_ROUGHNESS
from models.piping import Piping
from schemas import (
    AnnotationModel,
    ChartMetadataModel,
    ChartModel,
    FlowExampleResponse,
    FrictionFactorRequest,
    HydraulicDiameterPreviewResponse,
    HydraulicDiameterRequest,
    MarkerModel,
    MoodyChartRequest,
    ReynoldsRegimeVisualizationRequest,
    ReynoldsRegimeVisualizationResponse,
    ReynoldsRequest,
    SvgElementModel,
)
from .utils import serialize
from .i18n import SHAPE_LABELS, catalog_options

router = APIRouter(prefix="/flow", tags=["Flow"])
hydraulic = Hydraulic()
components_obj = Components()
piping = Piping()
MOODY_MIN_REYNOLDS = 1_000.0
MOODY_MAX_REYNOLDS = 100_000_000.0
LAMINAR_CUTOFF = 2_000.0
TURBULENT_START = 4_000.0
REGIME_RULER_MIN = 100.0
REGIME_RULER_MAX = 10_000.0
REGIME_RULER_START_X = 40.0
REGIME_RULER_END_X = 720.0
REGIME_LAMINAR_MAX = 2_300.0
REGIME_TRANSITION_MAX = 4_000.0
REGIME_TICKS = [100.0, 500.0, 1_000.0, 2_300.0, 4_000.0, 6_000.0, 8_000.0, 10_000.0]
REGIME_LABELS = {
    "laminar": "Laminar",
    "transition": "Transição",
    "turbulent": "Turbulento",
}
REGIME_COLORS = {
    "laminar": "#2563EB",
    "transition": "#D97706",
    "turbulent": "#DC2626",
}

PREVIEW_WIDTH = 320.0
PREVIEW_HEIGHT = 220.0
PREVIEW_VIEW_BOX = "0 0 320 220"
PREVIEW_PADDING = 32.0
PREVIEW_FLUID_COLOR = "#0F5E9C"
PREVIEW_FLUID_OUTLINE = "#0F172A"
PREVIEW_SOFT_OUTLINE = "#94A3B8"
PREVIEW_LABEL_COLOR = "#334155"

FLOW_EXAMPLE_RESPONSE = {
    "metadata": {
        "fluid": "Methane",
        "pressure": 101325,
        "regime": "transitional",
    },
    "reynolds": {
        "characteristic_diameter": 13.843,
        "velocity": 3.923,
        "density": 0.65688,
        "dynamic_viscosity": 0.0000111963,
    },
    "friction": {
        "method": "SwameeJain",
        "roughness_source": "composition",
        "composition": "Aço galvanizado",
        "diameter_source": "custom",
        "custom_diameter": 13.843,
    },
    "hydraulic_diameter": {
        "shape": "circularCap",
        "diameter": 0.125,
        "height": 0.08333,
    },
}

def validate_flow_example_catalogs() -> None:
    if "Methane" not in components_obj.list_all_components():
        raise RuntimeError("Fluid 'Methane' not found")

    if "Aço galvanizado" not in piping.compositions():
        raise RuntimeError("Composition 'Aço galvanizado' not found")


@router.get("/example", response_model=FlowExampleResponse)
def get_flow_example():
    return FLOW_EXAMPLE_RESPONSE


def _format_roughness_label(value: float) -> str:
    return f"ε/D = {value:.6g}"


def _format_decimal_pt(value: float) -> str:
    text = f"{float(value):.6g}"
    return text.replace(".", ",")


def _format_reynolds_label(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{float(value):.6g}"


def _round_svg(value: float) -> float:
    return round(float(value), 1)


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return min(max(float(value), minimum), maximum)


def _regime_x(value: float) -> float:
    safe_value = _clamp(value, REGIME_RULER_MIN, REGIME_RULER_MAX)
    ratio = (safe_value - REGIME_RULER_MIN) / (REGIME_RULER_MAX - REGIME_RULER_MIN)
    return round(REGIME_RULER_START_X + ratio * (REGIME_RULER_END_X - REGIME_RULER_START_X), 2)


def _classify_regime(reynolds: float) -> str:
    if reynolds < REGIME_LAMINAR_MAX:
        return "laminar"
    if reynolds >= REGIME_TRANSITION_MAX:
        return "turbulent"
    return "transition"


def _svg_element(element_type: str, attrs: dict, text: str | None = None) -> SvgElementModel:
    return SvgElementModel(type=element_type, attrs=attrs, text=text)


def _dimension_line(x1: float, x2: float, y1: float, y2: float) -> SvgElementModel:
    return _svg_element(
        "line",
        {
            "x1": _round_svg(x1),
            "x2": _round_svg(x2),
            "y1": _round_svg(y1),
            "y2": _round_svg(y2),
            "stroke": PREVIEW_SOFT_OUTLINE,
            "strokeWidth": "1.5",
        },
    )


def _preview_text(x: float, y: float, text: str, **attrs) -> SvgElementModel:
    merged_attrs = {
        "x": _round_svg(x),
        "y": _round_svg(y),
        "fill": PREVIEW_LABEL_COLOR,
        "fontSize": "12",
        **attrs,
    }
    return _svg_element("text", merged_attrs, text)


def _chip(label: str, value: float) -> dict:
    return {"label": label, "value": _format_decimal_pt(value)}


def _fit_points(points: list[dict], width: float, height: float) -> list[dict]:
    min_x = min(point["x"] for point in points)
    max_x = max(point["x"] for point in points)
    min_y = min(point["y"] for point in points)
    max_y = max(point["y"] for point in points)
    span_x = max(max_x - min_x, 1e-6)
    span_y = max(max_y - min_y, 1e-6)
    scale = min((width - PREVIEW_PADDING * 2) / span_x, (height - PREVIEW_PADDING * 2) / span_y)
    scaled_width = span_x * scale
    scaled_height = span_y * scale
    offset_x = (width - scaled_width) / 2 - min_x * scale
    offset_y = (height - scaled_height) / 2 - min_y * scale
    return [{"x": point["x"] * scale + offset_x, "y": point["y"] * scale + offset_y} for point in points]


def _flip_points_vertically(points: list[dict]) -> list[dict]:
    max_y = max(point["y"] for point in points)
    return [{"x": point["x"], "y": max_y - point["y"]} for point in points]


def _normalize_rotation(angle: float) -> float:
    if angle > 90:
        return angle - 180
    if angle < -90:
        return angle + 180
    return angle


def _edge_label(start: dict, end: dict, label: str) -> SvgElementModel:
    mid_x = (start["x"] + end["x"]) / 2
    mid_y = (start["y"] + end["y"]) / 2
    rotation = _normalize_rotation(math.degrees(math.atan2(end["y"] - start["y"], end["x"] - start["x"])))
    offsets = {
        "a": {"x": 26.0, "y": -22.0},
        "b": {"x": -26.0, "y": -22.0},
        "c": {"x": 0.0, "y": 24.0},
    }
    offset = offsets.get(label, {"x": 0.0, "y": 0.0})
    label_x = mid_x + offset["x"]
    label_y = mid_y + offset["y"]
    return _preview_text(
        label_x,
        label_y,
        label,
        textAnchor="middle",
        dominantBaseline="middle",
        transform=f"rotate({_round_svg(rotation)} {_round_svg(label_x)} {_round_svg(label_y)})",
    )


def _hydraulic_params_from_payload(payload: HydraulicDiameterRequest) -> dict:
    params = {"shape": payload.shape}

    if payload.shape == "circular":
        params["diameter"] = payload.diameter
    elif payload.shape == "rectangular":
        params["width"] = payload.width
        params["height"] = payload.height
    elif payload.shape == "annular":
        params["outer_diameter"] = payload.outer_diameter
        params["inner_diameter"] = payload.inner_diameter
    elif payload.shape == "triangular":
        params["side_a"] = payload.side_a
        params["side_b"] = payload.side_b
        params["side_c"] = payload.side_c
    elif payload.shape == "circularCap":
        params["diameter"] = payload.diameter
        params["height"] = payload.height

    return params


def _base_preview(title: str, description: str, summary: str, elements: list[SvgElementModel], chips: list[dict]):
    return {
        "title": title,
        "description": description,
        "summary": summary,
        "view_box": PREVIEW_VIEW_BOX,
        "elements": elements,
        "chips": chips,
    }


def _build_circular_preview(diameter: float) -> dict:
    radius = diameter / 2
    scale = min((PREVIEW_WIDTH - PREVIEW_PADDING * 2) / diameter, (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / diameter)
    scaled_radius = radius * scale
    cx = PREVIEW_WIDTH / 2
    cy = 92.0
    radius_guide_ratio = 0.72
    elements = [
        _svg_element(
            "circle",
            {
                "cx": _round_svg(cx),
                "cy": _round_svg(cy),
                "r": _round_svg(scaled_radius),
                "fill": PREVIEW_FLUID_COLOR,
                "stroke": PREVIEW_FLUID_OUTLINE,
                "strokeWidth": "2.5",
            },
        ),
        _dimension_line(cx - scaled_radius, cx + scaled_radius, cy + scaled_radius + 18, cy + scaled_radius + 18),
        _dimension_line(cx - scaled_radius, cx - scaled_radius, cy + scaled_radius + 14, cy + scaled_radius + 22),
        _dimension_line(cx + scaled_radius, cx + scaled_radius, cy + scaled_radius + 14, cy + scaled_radius + 22),
        _preview_text(cx, cy + scaled_radius + 36, "D", textAnchor="middle"),
        _dimension_line(cx, cx + scaled_radius * radius_guide_ratio, cy, cy - scaled_radius * radius_guide_ratio),
        _svg_element("circle", {"cx": _round_svg(cx), "cy": _round_svg(cy), "r": "2.5", "fill": PREVIEW_SOFT_OUTLINE}),
        _preview_text(cx + scaled_radius * radius_guide_ratio + 2, cy - scaled_radius * radius_guide_ratio - 2, "R"),
    ]
    return _base_preview(
        "Seção circular",
        "Representação proporcional da seção circular com fluido.",
        "Seção circular preenchida, com D e R destacados.",
        elements,
        [_chip("D", diameter), _chip("R", radius)],
    )


def _build_rectangular_preview(width: float, height: float) -> dict:
    scale = min((PREVIEW_WIDTH - PREVIEW_PADDING * 2) / width, (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / height)
    rect_width = width * scale
    rect_height = height * scale
    x = (PREVIEW_WIDTH - rect_width) / 2
    y = (PREVIEW_HEIGHT - rect_height) / 2 - 8
    bottom = y + rect_height
    right = x + rect_width
    elements = [
        _svg_element(
            "rect",
            {
                "x": _round_svg(x),
                "y": _round_svg(y),
                "width": _round_svg(rect_width),
                "height": _round_svg(rect_height),
                "rx": "6",
                "fill": PREVIEW_FLUID_COLOR,
                "stroke": PREVIEW_FLUID_OUTLINE,
                "strokeWidth": "2.5",
            },
        ),
        _dimension_line(x, right, bottom + 18, bottom + 18),
        _dimension_line(x, x, bottom + 14, bottom + 22),
        _dimension_line(right, right, bottom + 14, bottom + 22),
        _preview_text(PREVIEW_WIDTH / 2, bottom + 36, "a", textAnchor="middle"),
        _dimension_line(right + 18, right + 18, y, bottom),
        _dimension_line(right + 14, right + 22, y, y),
        _dimension_line(right + 14, right + 22, bottom, bottom),
        _preview_text(right + 28, (y + bottom) / 2, "b", dominantBaseline="middle"),
    ]
    return _base_preview(
        "Seção retangular",
        "Representação proporcional da seção retangular com fluido.",
        "Seção retangular preenchida, proporcional a a e b.",
        elements,
        [_chip("a", width), _chip("b", height), _chip("A = a·b", width * height)],
    )


def _build_annular_preview(outer_diameter: float, inner_diameter: float) -> dict:
    scale = min(
        (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / outer_diameter,
        (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / outer_diameter,
    )
    outer_radius = (outer_diameter / 2) * scale
    inner_radius = (inner_diameter / 2) * scale
    cx = PREVIEW_WIDTH / 2
    cy = 94.0
    elements = [
        _svg_element(
            "circle",
            {
                "cx": _round_svg(cx),
                "cy": _round_svg(cy),
                "r": _round_svg(outer_radius),
                "fill": PREVIEW_FLUID_COLOR,
                "stroke": PREVIEW_FLUID_OUTLINE,
                "strokeWidth": "2.5",
            },
        ),
        _svg_element(
            "circle",
            {
                "cx": _round_svg(cx),
                "cy": _round_svg(cy),
                "r": _round_svg(inner_radius),
                "fill": "#ffffff",
                "stroke": "#cbd5e1",
                "strokeWidth": "2",
            },
        ),
        _dimension_line(cx - outer_radius, cx + outer_radius, cy + outer_radius + 16, cy + outer_radius + 16),
        _preview_text(cx, cy + outer_radius + 34, "Dext", textAnchor="middle"),
        _dimension_line(cx, cx + inner_radius * 0.85, cy, cy),
        _preview_text(cx + inner_radius * 0.92, cy - 4, "Dint"),
    ]
    return _base_preview(
        "Seção anular",
        "Representação proporcional da seção anular com fluido.",
        "Geometria anular com a parede preenchida.",
        elements,
        [
            _chip("Dext", outer_diameter),
            _chip("Dint", inner_diameter),
            _chip("Rext", outer_diameter / 2),
            _chip("Rint", inner_diameter / 2),
        ],
    )


def _build_triangular_preview(side_a: float, side_b: float, side_c: float) -> dict:
    x = (side_b**2 + side_c**2 - side_a**2) / (2 * side_c)
    y = math.sqrt(max(side_b**2 - x**2, 0))
    points = [{"x": 0, "y": 0}, {"x": side_c, "y": 0}, {"x": x, "y": y}]
    fitted = _fit_points(_flip_points_vertically(points), PREVIEW_WIDTH, PREVIEW_HEIGHT - 16)
    a_point, b_point, c_point = fitted
    elements = [
        _svg_element(
            "polygon",
            {
                "points": " ".join(f"{_round_svg(point['x'])},{_round_svg(point['y'])}" for point in fitted),
                "fill": PREVIEW_FLUID_COLOR,
                "stroke": PREVIEW_FLUID_OUTLINE,
                "strokeWidth": "2.5",
            },
        ),
        _edge_label(b_point, c_point, "a"),
        _edge_label(a_point, c_point, "b"),
        _edge_label(a_point, b_point, "c"),
    ]
    return _base_preview(
        "Seção triangular",
        "Representação proporcional da seção triangular com fluido.",
        "Triângulo proporcional aos lados a, b e c, preenchido.",
        elements,
        [_chip("a", side_a), _chip("b", side_b), _chip("c", side_c)],
    )


def _build_circular_cap_preview(diameter: float, height: float) -> dict:
    radius = diameter / 2
    scale = min((PREVIEW_WIDTH - PREVIEW_PADDING * 2) / diameter, (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / diameter)
    scaled_radius = radius * scale
    scaled_height = _clamp(height * scale, 0, diameter * scale)
    is_full_circle = height >= diameter
    cx = PREVIEW_WIDTH / 2
    cy = 96.0
    chord_y = cy + scaled_radius - scaled_height
    half_chord = math.sqrt(max(0, 2 * scaled_radius * scaled_height - scaled_height * scaled_height))
    left_x = cx - half_chord
    right_x = cx + half_chord
    large_arc = 1 if scaled_height > scaled_radius else 0
    radius_guide_ratio = 0.72

    elements: list[SvgElementModel] = []
    if is_full_circle:
        elements.append(
            _svg_element(
                "circle",
                {
                    "cx": _round_svg(cx),
                    "cy": _round_svg(cy),
                    "r": _round_svg(scaled_radius),
                    "fill": PREVIEW_FLUID_COLOR,
                    "stroke": PREVIEW_FLUID_OUTLINE,
                    "strokeWidth": "2.5",
                },
            )
        )
    else:
        elements.append(
            _svg_element(
                "path",
                {
                    "d": (
                        f"M {_round_svg(left_x)} {_round_svg(chord_y)} "
                        f"A {_round_svg(scaled_radius)} {_round_svg(scaled_radius)} 0 {large_arc} 0 "
                        f"{_round_svg(right_x)} {_round_svg(chord_y)} "
                        f"L {_round_svg(left_x)} {_round_svg(chord_y)} Z"
                    ),
                    "fill": PREVIEW_FLUID_COLOR,
                    "stroke": PREVIEW_FLUID_OUTLINE,
                    "strokeWidth": "2.5",
                    "data-preview-id": "backend-cap-fill",
                },
            )
        )
        elements.append(
            _svg_element(
                "circle",
                {
                    "cx": _round_svg(cx),
                    "cy": _round_svg(cy),
                    "r": _round_svg(scaled_radius),
                    "fill": "none",
                    "stroke": PREVIEW_FLUID_OUTLINE,
                    "strokeWidth": "2.5",
                },
            )
        )

    elements.extend(
        [
            _dimension_line(cx - scaled_radius, cx + scaled_radius, cy + scaled_radius + 16, cy + scaled_radius + 16),
            _preview_text(cx, cy + scaled_radius + 34, "D", textAnchor="middle"),
            _dimension_line(right_x + 18, right_x + 18, chord_y, cy + scaled_radius),
            _preview_text(right_x + 28, (chord_y + cy + scaled_radius) / 2, "h", dominantBaseline="middle"),
            _dimension_line(cx, cx + scaled_radius * radius_guide_ratio, cy, cy - scaled_radius * radius_guide_ratio),
            _preview_text(cx + scaled_radius * radius_guide_ratio + 2, cy - scaled_radius * radius_guide_ratio - 2, "R"),
        ]
    )
    return _base_preview(
        "Canal circular",
        "Representação proporcional do canal circular com fluido.",
        "Segmento circular preenchido, com D, h e R destacados.",
        elements,
        [_chip("D", diameter), _chip("h", height), _chip("R", radius)],
    )


@router.post("/moody/chart", response_model=ChartModel)
def build_moody_chart(payload: MoodyChartRequest):
    try:
        x_max = max(MOODY_MAX_REYNOLDS, payload.reynolds * 1.25)
        laminar_points = hydraulic.build_laminar_friction_curve(
            start_reynolds=MOODY_MIN_REYNOLDS,
            end_reynolds=LAMINAR_CUTOFF,
        )

        selected_roughness = payload.roughness
        reference_roughness = [
            value
            for value in MOODY_REFERENCE_ROUGHNESS
            if abs(value - selected_roughness) > 1e-10
        ]
        roughness_values = sorted([*reference_roughness, selected_roughness])

        turbulent_series = []
        turbulent_y_values = []
        for roughness in roughness_values:
            points = hydraulic.build_moody_curve_points(
                relative_roughness=roughness,
                start_reynolds=TURBULENT_START,
                end_reynolds=x_max,
            )
            turbulent_y_values.extend(point["y"] for point in points)
            turbulent_series.append(
                build_series_model(
                    name=_format_roughness_label(roughness),
                    series_id="selected-roughness" if abs(roughness - selected_roughness) <= 1e-10 else None,
                    kind="line",
                    color=(
                        "#dc2626"
                        if abs(roughness - selected_roughness) <= 1e-10
                        else "#475569"
                        if roughness == 0
                        else "#94a3b8"
                    ),
                    points=points,
                )
            )

        all_y_values = [
            *(point["y"] for point in laminar_points),
            *turbulent_y_values,
            payload.friction_factor,
            hydraulic.colebrook_white_relative_friction_factor(0, x_max),
        ]
        y_min = max(0.001, floor_log_tick(min(all_y_values)))
        y_max = ceil_log_tick(max(all_y_values))
        if y_min >= y_max:
            y_min = y_max / 10

        axes = {
            "x": build_log_axis(
                [MOODY_MIN_REYNOLDS, payload.reynolds, x_max],
                label="Número de Reynolds",
                units="adimensional",
                domain={"min": MOODY_MIN_REYNOLDS, "max": x_max},
            ),
            "y": build_log_axis(
                all_y_values,
                label="Fator de atrito de Darcy",
                units="adimensional",
                domain={"min": y_min, "max": y_max},
            ),
        }

        return build_chart_model(
            chart_id="moody-chart",
            title="Ponto operacional - Diagrama de Moody",
            subtitle="Curvas de Colebrook-White por rugosidade relativa com faixa de transição.",
            axes=axes,
            series=[
                build_series_model(
                    name="Regime laminar",
                    series_id="laminar-regime",
                    kind="line",
                    color="#0f172a",
                    points=laminar_points,
                ),
                *turbulent_series,
            ],
            markers=[
                MarkerModel(
                    id="operating-point",
                    x=payload.reynolds,
                    y=payload.friction_factor,
                    label="Ponto operacional",
                    color="#dc2626",
                )
            ],
            annotations=[
                AnnotationModel(
                    id="transition-band",
                    text="Faixa de transição",
                    x=3_000,
                    y=y_max / 1.25,
                    tone="info",
                )
            ],
            metadata=ChartMetadataModel(
                version="1.0",
                units={"x": "adimensional", "y": "adimensional"},
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/reynolds")
def calculate_reynolds(payload: ReynoldsRequest):
    try:
        params = {
            "characteristic_diameter": payload.characteristic_diameter,  # mm
            "velocity": payload.velocity                                # m/s
        }

        if payload.density is not None and payload.dynamic_viscosity is not None:
            params["density"] = payload.density                  # kg/m³
            params["dynamic_viscosity"] = payload.dynamic_viscosity  # Pa·s
        elif payload.kinematic_viscosity is not None:
            params["kinematic_viscosity"] = payload.kinematic_viscosity  # m²/s

        result = hydraulic.reynolds(params)
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/reynolds/regime-visualization", response_model=ReynoldsRegimeVisualizationResponse)
def build_reynolds_regime_visualization(payload: ReynoldsRegimeVisualizationRequest):
    try:
        reynolds = float(payload.reynolds)
        regime = _classify_regime(reynolds)
        marker_x = _regime_x(reynolds)
        is_below_scale = reynolds < REGIME_RULER_MIN
        is_above_scale = reynolds > REGIME_RULER_MAX
        marker_status = (
            "abaixo da escala"
            if is_below_scale
            else "acima da escala"
            if is_above_scale
            else REGIME_LABELS[regime]
        )

        return {
            "title": "Regime do escoamento",
            "description": "Escala linear de Reynolds de 100 a 10.000. O marcador mostra a posição atual.",
            "domain": {"min": REGIME_RULER_MIN, "max": REGIME_RULER_MAX},
            "ticks": [
                {
                    "value": tick,
                    "label": _format_reynolds_label(tick),
                    "x": _regime_x(tick),
                }
                for tick in REGIME_TICKS
            ],
            "segments": [
                {
                    "regime": "laminar",
                    "label": REGIME_LABELS["laminar"],
                    "color": REGIME_COLORS["laminar"],
                    "x": REGIME_RULER_START_X,
                    "width": round(_regime_x(REGIME_LAMINAR_MAX) - REGIME_RULER_START_X, 2),
                },
                {
                    "regime": "transition",
                    "label": REGIME_LABELS["transition"],
                    "color": REGIME_COLORS["transition"],
                    "x": _regime_x(REGIME_LAMINAR_MAX),
                    "width": round(_regime_x(REGIME_TRANSITION_MAX) - _regime_x(REGIME_LAMINAR_MAX), 2),
                },
                {
                    "regime": "turbulent",
                    "label": REGIME_LABELS["turbulent"],
                    "color": REGIME_COLORS["turbulent"],
                    "x": _regime_x(REGIME_TRANSITION_MAX),
                    "width": round(REGIME_RULER_END_X - _regime_x(REGIME_TRANSITION_MAX), 2),
                },
            ],
            "marker": {
                "x": marker_x,
                "label": f"Re = {_format_reynolds_label(reynolds)}",
                "status": marker_status,
                "regime": regime,
                "regime_label": REGIME_LABELS[regime],
                "color": REGIME_COLORS[regime],
                "text_anchor": "start" if is_below_scale else "end" if is_above_scale else "middle",
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/friction-factor/methods")
def get_friction_factor_methods():
    return catalog_options(
        hydraulic.friction_factor({}),
        {
            "ColebrookWhite": "Colebrook-White",
            "SwameeJain": "Swamee-Jain",
            "Haaland": "Haaland",
        },
    )


@router.post("/friction-factor")
def calculate_friction_factor(payload: FrictionFactorRequest):
    try:
        result = hydraulic.friction_factor({
            "roughness": payload.roughness,    # mm
            "diameter": payload.diameter,     # mm
            "reynolds": payload.reynolds,     # dimensionless
            "method": payload.method
        })
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/hydraulic-diameter/shapes")
def get_hydraulic_diameter_shapes():
    return catalog_options(hydraulic.hydraulic_diameter({}), SHAPE_LABELS)


@router.post("/hydraulic-diameter")
def calculate_hydraulic_diameter(payload: HydraulicDiameterRequest):
    try:
        params = _hydraulic_params_from_payload(payload)
        result = hydraulic.hydraulic_diameter(params)
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/hydraulic-diameter/preview", response_model=HydraulicDiameterPreviewResponse)
def build_hydraulic_diameter_preview(payload: HydraulicDiameterRequest):
    try:
        params = _hydraulic_params_from_payload(payload)
        # Reuse the calculation path for the same shape-domain validation before drawing.
        hydraulic.hydraulic_diameter(params)

        if payload.shape == "circular":
            return _build_circular_preview(float(payload.diameter))
        if payload.shape == "rectangular":
            return _build_rectangular_preview(float(payload.width), float(payload.height))
        if payload.shape == "annular":
            return _build_annular_preview(float(payload.outer_diameter), float(payload.inner_diameter))
        if payload.shape == "triangular":
            return _build_triangular_preview(float(payload.side_a), float(payload.side_b), float(payload.side_c))
        if payload.shape == "circularCap":
            return _build_circular_cap_preview(float(payload.diameter), float(payload.height))

        raise ValueError("Unsupported hydraulic diameter shape")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
