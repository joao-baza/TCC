from fastapi import APIRouter, HTTPException
from models.charting import build_chart_model, build_linear_axis, build_series_model
from models.hydraulic import Hydraulic
from schemas import (
    AnnotationModel,
    ChartMetadataModel,
    ChartModel,
    HeadLossRequest,
    HeadRequest,
    MarkerModel,
    NpshGaugeChartRequest,
    NpshGaugeResponse,
    NpshGaugeStatusModel,
    NpshGaugeValueModel,
    NPSHAvailableRequest,
    PumpEfficiencyMapResponse,
    PumpExampleResponse,
)
from .utils import serialize
from .i18n import catalog_options

router = APIRouter(prefix="/pump", tags=["Pump"])
hydraulic = Hydraulic()


def validate_pump_example_catalogs() -> None:
    if "Aço galvanizado" not in hydraulic.piping.compositions():
        raise RuntimeError("Composição da tubulação 'Aço galvanizado' não encontrada")
    available_fittings = set(hydraulic.piping.fittings())
    for fitting in ("Cotovelo 45°", "Saída de tanque", "Válvula esfera"):
        if fitting not in available_fittings:
            raise RuntimeError(f"Acessório da tubulação '{fitting}' não encontrado")
    available_methods = hydraulic.friction_factor({})
    if "SwameeJain" not in available_methods:
        raise RuntimeError("Friction method 'SwameeJain' not found")


@router.get("/example", response_model=PumpExampleResponse)
def get_pump_example():
    validate_pump_example_catalogs()
    return {
        "headloss": {
            "method": "Darcy-Weisbach",
            "pipe_length": 100,
            "diameter": 125,
            "flow_rate": 0.04,
            "velocity": 3.259493234522017,
            "reynolds": 3186.1046722863807,
            "friction_factor": 0.04495094389484752,
            "friction_method": "SwameeJain",
            "composition": "Aço galvanizado",
            "fittings": [
                {"fitting": "Cotovelo 45°", "quantity": 5},
                {"fitting": "Saída de tanque", "quantity": 1},
                {"fitting": "Válvula esfera", "quantity": 2},
            ],
        },
        "npsh": {
            "manometric_pressure": 0,
            "atmospheric_pressure": 1.033,
            "vapor_pressure": 0.023,
            "density": 1000,
            "friction_factor": 10,
            "pump_inlet_velocity": 1.5,
            "gauge_elevation": 3,
            "required": 3,
        },
        "head": {
            "pressure1": 101325,
            "pressure2": 101325,
            "elevation1": 0,
            "elevation2": 5,
            "velocity1": 0,
            "velocity2": 3,
            "density": 1000,
            "friction_factor": 2.55887,
        },
    }


def _build_headloss_params(payload: HeadLossRequest) -> dict:
    params = {
        "pipe_length": payload.pipe_length,  # m
        "diameter": payload.diameter,  # mm
        "method": payload.method,
    }

    if payload.flow_rate is not None:
        params["flow_rate"] = payload.flow_rate  # m³/s
    if payload.velocity is not None:
        params["velocity"] = payload.velocity  # m/s

    if payload.flow_rate is None and payload.velocity is None:
        raise ValueError(
            "Informe vazão (m³/s) e/ou velocidade do escoamento (m/s); pelo menos um valor é obrigatório."
        )

    if payload.method == "Darcy-Weisbach":
        if payload.friction_factor is None:
            raise ValueError("Darcy-Weisbach requires friction factor")
        params["friction_factor"] = payload.friction_factor
    elif payload.method == "Hazen-Williams":
        if payload.roughness_coefficient is None:
            raise ValueError("Hazen-Williams requires roughness coefficient")
        params["roughness_coefficient"] = payload.roughness_coefficient

    if payload.fittings is not None:
        params["fittings"] = [
            {"quantity": item.quantity, "fitting": item.fitting}
            for item in payload.fittings
        ]

    return params


def _build_head_params(payload: HeadRequest) -> dict:
    return {
        "pressure1": payload.pressure1,
        "pressure2": payload.pressure2,
        "elevation1": payload.elevation1,
        "elevation2": payload.elevation2,
        "velocity1": payload.velocity1,
        "velocity2": payload.velocity2,
        "density": payload.density,
        "head_loss": payload.friction_factor,
    }


def _build_npsh_params(payload: NPSHAvailableRequest) -> dict:
    return {
        "manometric_pressure": payload.manometric_pressure,  # kgf/cm²
        "atmospheric_pressure": payload.atmospheric_pressure,  # kgf/cm²
        "vapor_pressure": payload.vapor_pressure,  # kgf/cm²
        "density": payload.density,  # kg/m³
        "head_loss": payload.friction_factor,  # m (perdas de carga)
        "pump_inlet_velocity": payload.pump_inlet_velocity,  # m/s
        "gauge_elevation": payload.gauge_elevation,  # m
    }


def _build_npsh_status(available: float, required: float | None) -> NpshGaugeStatusModel:
    if required is None:
        return NpshGaugeStatusModel(
            tone="missing",
            label="Informe NPSHr para checar margem",
            message="NPSHr ausente",
        )

    if available >= required + 0.5:
        return NpshGaugeStatusModel(
            tone="safe",
            label="Margem segura (NPSHd ≥ NPSHr + 0,5 m) ✓",
            message="Margem segura para evitar cavitação.",
        )

    return NpshGaugeStatusModel(
        tone="risk",
        label="Risco de cavitação — NPSHd insuficiente ✗",
        message="NPSHd abaixo da margem segura; há risco de cavitação.",
    )


def _npsh_value(value: float) -> NpshGaugeValueModel:
    return NpshGaugeValueModel(value=value, units="meter")


def _interpolate(from_value: float, to_value: float, ratio: float) -> float:
    return from_value + (to_value - from_value) * ratio


def _efficiency_to_color(efficiency: float) -> str:
    normalized = max(0.0, min(1.0, efficiency))
    hue = _interpolate(218.0, 142.0, normalized)
    saturation = _interpolate(82.0, 90.0, normalized)
    lightness = _interpolate(96.0, 34.0, normalized)
    return f"hsl({hue:.3f} {saturation:.3f}% {lightness:.3f}%)"


def _build_relative_efficiency(
    *,
    flow: float,
    head: float,
    bep_flow: float,
    bep_head: float,
    max_flow: float,
    max_head: float,
) -> float:
    q = flow / max(max_flow, 1.0)
    h = head / max(max_head, 1.0)
    q_bep = bep_flow / max(max_flow, 1.0)
    h_bep = bep_head / max(max_head, 1.0)
    distance = ((q - q_bep) ** 2) * 3.4 + ((h - h_bep) ** 2) * 2.2
    return max(0.18, 0.92 - distance)


@router.get("/headloss/methods")
def get_headloss_methods():
    return catalog_options(
        hydraulic.head_loss({}),
        {
            "Darcy-Weisbach": "Darcy-Weisbach",
            "Hazen-Williams": "Hazen-Williams",
        },
    )


@router.post("/headloss")
def calculate_headloss(payload: HeadLossRequest):
    try:
        params = _build_headloss_params(payload)
        result = hydraulic.head_loss(params)
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/headloss/chart", response_model=ChartModel)
def build_headloss_chart(payload: HeadLossRequest):
    try:
        params = _build_headloss_params(payload)
        headloss = hydraulic.head_loss(params).to(hydraulic.ureg.m).magnitude
        flow_rate, _ = hydraulic._resolve_flow_velocity(params, payload.diameter)

        system_points = hydraulic.build_system_headloss_curve(
            method=payload.method,
            flow_rate=flow_rate,
            headloss=headloss,
        )
        data_max_flow_rate = max(flow_rate, *(point["x"] for point in system_points), 0.0)
        domain_max_flow_rate = max(data_max_flow_rate * 1.15, flow_rate * 1.25, 0.08)
        pump_points = hydraulic.build_pump_curve_points(
            operating_flow_rate=flow_rate,
            operating_head=headloss,
            max_flow_rate=domain_max_flow_rate,
        )

        y_values = [*(point["y"] for point in system_points), *(point["y"] for point in pump_points), headloss]
        y_min = min(y_values)
        y_max = max(y_values)
        if y_min == y_max:
            y_max += 1.0

        return build_chart_model(
            chart_id="pump-system-curve",
            title="Curva da bomba e do sistema",
            subtitle=f"Método de perda de carga: {payload.method}",
            approximation_notice="A curva da bomba usa uma aproximação quadrática didática. Para uma bomba real, um catálogo deve ser usado para analisar.",
            axes={
                "x": build_linear_axis(
                    [0.0, flow_rate, domain_max_flow_rate],
                    label="Vazão volumétrica",
                    units="m³/s",
                    domain={"min": 0.0, "max": domain_max_flow_rate},
                ),
                "y": build_linear_axis(
                    y_values,
                    label="Altura manométrica",
                    units="m",
                    domain={"min": y_min, "max": y_max},
                ),
            },
            series=[
                build_series_model(
                    name="Curva da bomba",
                    series_id="pump-curve",
                    kind="line",
                    color="#0f766e",
                    points=pump_points,
                ),
                build_series_model(
                    name="Curva do sistema",
                    series_id="system-curve",
                    kind="line",
                    color="#b45309",
                    points=system_points,
                ),
            ],
            markers=[
                MarkerModel(
                    id="operating-point",
                    x=flow_rate,
                    y=headloss,
                    label="Ponto de operação",
                    color="#dc2626",
                )
            ],
            metadata=ChartMetadataModel(
                version="1.0",
                units={"x": "m³/s", "y": "m"},
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/efficiency-map/chart", response_model=PumpEfficiencyMapResponse)
def build_efficiency_map_chart(payload: HeadLossRequest):
    try:
        params = _build_headloss_params(payload)
        headloss = hydraulic.head_loss(params).to(hydraulic.ureg.m).magnitude
        flow_rate, _ = hydraulic._resolve_flow_velocity(params, payload.diameter)

        system_points = hydraulic.build_system_headloss_curve(
            method=payload.method,
            flow_rate=flow_rate,
            headloss=headloss,
        )
        data_max_flow_rate = max(flow_rate, *(point["x"] for point in system_points), 1.0)
        domain_max_flow_rate = max(data_max_flow_rate * 1.1, flow_rate * 1.1, 1.0)
        data_max_head = max(headloss, *(point["y"] for point in system_points), 1.0)
        domain_max_head = max(data_max_head * 1.1, headloss * 1.1, 1.0)

        bep_flow = flow_rate if flow_rate > 0 else domain_max_flow_rate * 0.55
        bep_head = headloss if headloss > 0 else domain_max_head * 0.62

        cols = 10
        rows = 7
        cell_width = domain_max_flow_rate / cols
        cell_height = domain_max_head / rows
        cells = []
        for row in range(rows):
            for col in range(cols):
                cell_x = col * cell_width
                cell_y = (rows - row - 1) * cell_height
                flow = cell_x + (cell_width / 2.0)
                head = cell_y + (cell_height / 2.0)
                efficiency = _build_relative_efficiency(
                    flow=flow,
                    head=head,
                    bep_flow=bep_flow,
                    bep_head=bep_head,
                    max_flow=domain_max_flow_rate,
                    max_head=domain_max_head,
                )
                cells.append(
                    {
                        "x": cell_x,
                        "y": cell_y,
                        "width": cell_width,
                        "height": cell_height,
                        "efficiency": efficiency,
                        "fill": _efficiency_to_color(efficiency),
                        "tooltip": f"Eficiência relativa ≈ {efficiency * 100:.1f}%",
                    }
                )

        cavitation_band = [
            {"x": 0.0, "y": 0.0},
            {"x": domain_max_flow_rate * 0.34, "y": 0.0},
            {"x": domain_max_flow_rate * 0.34, "y": domain_max_head * 0.3},
            {"x": 0.0, "y": domain_max_head * 0.3},
        ]

        return PumpEfficiencyMapResponse(
            id="pump-efficiency-map",
            title="Eficiência e BEP",
            subtitle="Mapa didático da região do BEP (Best Efficiency Point, ou Ponto de Melhor Eficiência) e da faixa aproximada de cavitação.",
            approximation_notice="BEP, campo relativo de eficiência e faixa de cavitação aproximada calculados.",
            x_axis=build_linear_axis(
                [0.0, flow_rate, domain_max_flow_rate],
                label="Vazão volumétrica (Q)",
                units="m³/s",
                domain={"min": 0.0, "max": domain_max_flow_rate},
            ),
            y_axis=build_linear_axis(
                [0.0, headloss, domain_max_head],
                label="Altura manométrica (H)",
                units="m",
                domain={"min": 0.0, "max": domain_max_head},
            ),
            cells=cells,
            system_curve=system_points,
            cavitation_band=cavitation_band,
            markers=[
                MarkerModel(
                    id="best-efficiency-point",
                    x=bep_flow,
                    y=bep_head,
                    label="BEP",
                    color="#16a34a",
                ),
                MarkerModel(
                    id="operating-point",
                    x=flow_rate,
                    y=headloss,
                    label="Operação",
                    color="#dc2626",
                ),
            ],
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/npsh-available")
def calculate_npsh_available(payload: NPSHAvailableRequest):
    try:
        result = hydraulic.npsh_available(_build_npsh_params(payload))
        return serialize({"head_loss": result})
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/npsh-gauge/chart", response_model=NpshGaugeResponse)
def build_npsh_gauge_chart(payload: NpshGaugeChartRequest):
    try:
        available = hydraulic.npsh_available(_build_npsh_params(payload)).to(
            hydraulic.ureg.m
        ).magnitude
        required = payload.required
        safe_threshold = required + 0.5 if required is not None else None
        domain_values = [
            0.0,
            1.0,
            available,
            *(value for value in (required, safe_threshold) if value is not None),
        ]
        domain_min = min(domain_values)
        domain_max = max(domain_values)
        if domain_min == domain_max:
            domain_max += 1.0

        markers = [
            MarkerModel(
                id="available",
                x=available,
                y=0.0,
                label="NPSHd",
                color="#1d4ed8",
            )
        ]
        if required is not None:
            markers.append(
                MarkerModel(
                    id="required",
                    x=required,
                    y=0.0,
                    label="NPSHr",
                    color="#b45309",
                )
            )
        if safe_threshold is not None:
            markers.append(
                MarkerModel(
                    id="safe-threshold",
                    x=safe_threshold,
                    y=0.0,
                    label="Margem segura",
                    color="#16a34a",
                )
            )

        return NpshGaugeResponse(
            id="pump-npsh-gauge",
            title="Margem de NPSH",
            available=_npsh_value(available),
            required=_npsh_value(required) if required is not None else None,
            safe_threshold=_npsh_value(safe_threshold) if safe_threshold is not None else None,
            status=_build_npsh_status(available, required),
            axis=build_linear_axis(
                domain_values,
                label="NPSH",
                units="m",
                domain={"min": domain_min, "max": domain_max},
            ),
            markers=markers,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/head")
def calculate_head(payload: HeadRequest):
    try:
        result = hydraulic.head(_build_head_params(payload))
        return serialize(result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/head/chart", response_model=ChartModel)
def build_head_chart(payload: HeadRequest):
    try:
        params = _build_head_params(payload)
        total_head = hydraulic.head(params).to(hydraulic.ureg.m).magnitude
        terms = hydraulic.build_head_terms(params)
        term_points = [
            {"x": float(index), "y": float(term["value"])}
            for index, term in enumerate(terms, start=1)
        ]
        cumulative = 0.0
        cumulative_points = []
        for index, term in enumerate(terms, start=1):
            cumulative += float(term["value"])
            cumulative_points.append({"x": float(index), "y": cumulative})

        y_values = [*(point["y"] for point in term_points), *(point["y"] for point in cumulative_points), total_head]
        y_min = min(y_values)
        y_max = max(y_values)
        if y_min == y_max:
            y_max += 1.0

        return build_chart_model(
            chart_id="pump-head-breakdown",
            title="Decomposição da altura manométrica",
            subtitle="Parcelas da equação de energia para o ponto informado.",
            axes={
                "x": build_linear_axis(
                    [1.0, 5.0],
                    label="Parcela",
                    units="índice",
                    domain={"min": 1.0, "max": 5.0},
                ),
                "y": build_linear_axis(
                    y_values,
                    label="Contribuição de altura",
                    units="m",
                    domain={"min": y_min, "max": y_max},
                ),
            },
            series=[
                build_series_model(
                    name="Parcelas",
                    series_id="head-terms",
                    kind="line",
                    color="#2563eb",
                    points=term_points,
                ),
                build_series_model(
                    name="Acumulado",
                    series_id="head-cumulative",
                    kind="line",
                    color="#0f766e",
                    points=cumulative_points,
                ),
            ],
            markers=[
                MarkerModel(
                    id="total-head",
                    x=5.0,
                    y=total_head,
                    label="H total",
                    color="#1d4ed8",
                )
            ],
            annotations=[
                AnnotationModel(
                    id=f"term-label-{index}",
                    text=str(term["label"]),
                    x=float(index),
                    y=y_min,
                    tone="info",
                )
                for index, term in enumerate(terms, start=1)
            ],
            metadata=ChartMetadataModel(
                version="1.0",
                units={"x": "índice", "y": "m"},
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
