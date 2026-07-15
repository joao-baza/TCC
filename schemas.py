import math

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Dict, Any, Literal


# ---------------------------------------------------------------------------
# Shared Chart Models
# ---------------------------------------------------------------------------

class AxisDomainModel(BaseModel):
    min: float = Field(..., description="Lower domain bound")
    max: float = Field(..., description="Upper domain bound")

    @model_validator(mode="after")
    def validate_bounds(self):
        if not math.isfinite(self.min) or not math.isfinite(self.max):
            raise ValueError("Axis domain bounds must be finite")
        if self.max <= self.min:
            raise ValueError("Axis domain max must be greater than min")
        return self


class ChartPointModel(BaseModel):
    x: float = Field(..., description="Point x coordinate")
    y: float = Field(..., description="Point y coordinate")

    @model_validator(mode="after")
    def validate_coordinates(self):
        if not math.isfinite(self.x) or not math.isfinite(self.y):
            raise ValueError("Chart points must use finite coordinates")
        return self


class AxisModel(BaseModel):
    scale: Literal["linear", "log"] = Field(..., description="Axis scale type")
    label: str = Field(..., description="Axis label")
    units: Optional[str] = Field(None, description="Axis units")
    domain: AxisDomainModel = Field(..., description="Axis domain as min/max bounds")
    ticks: List[float] = Field(..., description="Tick values rendered on the axis")
    major_ticks: List[float] = Field(
        default_factory=list,
        description="Primary tick values, especially useful for logarithmic axes",
    )
    tick_format: Optional[str] = Field(None, description="Suggested display format")

    @model_validator(mode="after")
    def validate_axis(self):
        if any(not math.isfinite(value) for value in self.ticks):
            raise ValueError("Axis ticks must be finite")
        if any(not math.isfinite(value) for value in self.major_ticks):
            raise ValueError("Axis major ticks must be finite")
        if self.scale == "log" and self.domain.min <= 0:
            raise ValueError("Logarithmic axes require a positive domain")
        return self


class SeriesModel(BaseModel):
    id: str = Field(..., description="Series identifier")
    name: str = Field(..., description="Series display label")
    kind: Literal["line", "scatter", "area", "band", "bar"] = Field(
        ...,
        description="Series rendering kind",
    )
    points: List[ChartPointModel] = Field(..., description="Series points as x/y coordinates")
    color: Optional[str] = Field(None, description="Series display color")


class MarkerModel(BaseModel):
    id: str = Field(..., description="Marker identifier")
    x: float = Field(..., description="Marker x coordinate")
    y: float = Field(..., description="Marker y coordinate")
    label: str = Field(..., description="Marker display label")
    color: Optional[str] = Field(None, description="Marker display color")

    @model_validator(mode="after")
    def validate_marker(self):
        if not math.isfinite(self.x) or not math.isfinite(self.y):
            raise ValueError("Markers must use finite coordinates")
        return self


class AnnotationModel(BaseModel):
    id: str = Field(..., description="Annotation identifier")
    text: str = Field(..., description="Annotation content")
    x: Optional[float] = Field(None, description="Optional x anchor")
    y: Optional[float] = Field(None, description="Optional y anchor")
    tone: Optional[str] = Field(None, description="Annotation semantic tone")


class ChartMetadataModel(BaseModel):
    units: Dict[str, str] = Field(default_factory=dict, description="Units keyed by series or axis")
    version: str = Field(..., description="Chart contract version")


class ChartModel(BaseModel):
    id: str = Field(..., description="Chart identifier")
    title: str = Field(..., description="Chart title")
    subtitle: Optional[str] = Field(None, description="Optional chart subtitle")
    approximation_notice: Optional[str] = Field(
        None,
        description="Optional notice for didactic approximations",
    )
    axes: Dict[str, AxisModel] = Field(..., description="Chart axes keyed by semantic axis name")
    series: List[SeriesModel] = Field(..., description="Series rendered in the chart")
    markers: List[MarkerModel] = Field(default_factory=list, description="Highlighted chart markers")
    annotations: List[AnnotationModel] = Field(default_factory=list, description="Chart annotations")
    metadata: ChartMetadataModel = Field(..., description="Chart metadata block")


class FlowChartResponse(BaseModel):
    chart: ChartModel = Field(..., description="Flow visualization payload")


class PumpChartResponse(BaseModel):
    chart: ChartModel = Field(..., description="Pump visualization payload")


class ReactorChartResponse(BaseModel):
    chart: ChartModel = Field(..., description="Reactor visualization payload")


class ComponentsChartResponse(BaseModel):
    chart: ChartModel = Field(..., description="Components visualization payload")


class PumpEfficiencyMapCellModel(BaseModel):
    x: float = Field(..., description="Cell x-coordinate in data space")
    y: float = Field(..., description="Cell y-coordinate in data space")
    width: float = Field(..., gt=0, description="Cell width in data-space units")
    height: float = Field(..., gt=0, description="Cell height in data-space units")
    efficiency: float = Field(..., ge=0, le=1, description="Relative efficiency from 0 to 1")
    fill: str = Field(..., description="Precomputed fill color")
    tooltip: str = Field(..., description="Tooltip text shown for the cell")


class PumpEfficiencyMapResponse(BaseModel):
    id: str = Field(..., description="Visualization identifier")
    title: str = Field(..., description="Chart title")
    subtitle: Optional[str] = Field(None, description="Chart subtitle")
    approximation_notice: Optional[str] = Field(
        None,
        description="Optional notice for didactic approximations",
    )
    x_axis: AxisModel = Field(..., description="Flow-rate axis configuration")
    y_axis: AxisModel = Field(..., description="Head axis configuration")
    cells: List[PumpEfficiencyMapCellModel] = Field(..., description="Efficiency-map cells")
    system_curve: List[ChartPointModel] = Field(..., description="System-curve samples in data space")
    cavitation_band: List[ChartPointModel] = Field(..., description="Polygon for the didactic cavitation band")
    markers: List[MarkerModel] = Field(default_factory=list, description="Highlighted operating markers")


class TernaryDiagramChartRequest(BaseModel):
    component_a: str = Field(..., description="First ternary component")
    component_b: str = Field(..., description="Second ternary component")
    component_c: str = Field(..., description="Third ternary component")
    fraction_a: float = Field(..., description="Fraction for component A")
    fraction_b: float = Field(..., description="Fraction for component B")
    fraction_c: float = Field(..., description="Fraction for component C")
    stream_name: str = Field("Corrente atual", description="Rótulo exibido para a corrente projetada")


class TernaryGuideLineModel(BaseModel):
    start: ChartPointModel = Field(..., description="Ponto inicial da linha-guia")
    end: ChartPointModel = Field(..., description="Ponto final da linha-guia")


class TernaryStreamPointModel(BaseModel):
    label: str = Field(..., description="Rótulo da corrente projetada")
    summary: str = Field(..., description="Formatted composition summary")
    x: float = Field(..., description="Coordenada x projetada no plano ternário")
    y: float = Field(..., description="Coordenada y projetada no plano ternário")
    color: str = Field(..., description="Marker color")


class TernaryDiagramChartResponse(BaseModel):
    id: str = Field(..., description="Visualization identifier")
    title: str = Field(..., description="Chart title")
    subtitle: Optional[str] = Field(None, description="Chart subtitle")
    component_labels: List[str] = Field(..., description="Ordered labels for the ternary vertices")
    boundary: List[ChartPointModel] = Field(..., description="Triangle boundary coordinates")
    guide_lines: List[TernaryGuideLineModel] = Field(..., description="Linhas-guia para leitura da projeção")
    streams: List[TernaryStreamPointModel] = Field(..., description="Marcadores das correntes projetadas")


class McCabeThieleChartRequest(BaseModel):
    fluid1: str = Field(..., description="First binary component")
    fluid2: str = Field(..., description="Second binary component")
    pressure: float = Field(..., gt=0, description="Operating pressure in Pa")
    sample_count: int = Field(..., ge=5, le=60, description="Number of binary-equilibrium samples")
    distillate_composition: float = Field(..., description="Distillate composition")
    bottoms_composition: float = Field(..., description="Bottoms composition")
    feed_composition: float = Field(..., description="Feed composition")
    reflux_ratio: float = Field(..., ge=0, description="Reflux ratio")
    q_value: float = Field(..., description="Thermal state line parameter")
    max_stages: int = Field(10, ge=1, le=30, description="Maximum number of theoretical stages")


class PropertySurfaceCellModel(BaseModel):
    x: float = Field(..., description="Cell x-coordinate in data space")
    y: float = Field(..., description="Cell y-coordinate in data space")
    width: float = Field(..., gt=0, description="Cell width in data-space units")
    height: float = Field(..., gt=0, description="Cell height in data-space units")
    value: Optional[float] = Field(None, description="Property value represented by the cell")
    fill: str = Field(..., description="Precomputed fill color")
    tooltip: str = Field(..., description="Tooltip text shown for the cell")


class PropertySurfaceLegendStopModel(BaseModel):
    offset: float = Field(..., ge=0, le=1, description="Legend offset from 0 to 1")
    color: str = Field(..., description="Legend color")
    value: float = Field(..., description="Value represented by the stop")


class PropertySurfaceChartResponse(BaseModel):
    id: str = Field(..., description="Visualization identifier")
    title: str = Field(..., description="Chart title")
    subtitle: Optional[str] = Field(None, description="Chart subtitle")
    fluid: str = Field(..., description="Fluid label")
    property_label: str = Field(..., description="Property label")
    property_units: str = Field(..., description="Property units")
    x_axis: AxisModel = Field(..., description="Temperature axis configuration")
    y_axis: AxisModel = Field(..., description="Pressure axis configuration")
    cells: List[PropertySurfaceCellModel] = Field(..., description="Heatmap cells")
    legend_stops: List[PropertySurfaceLegendStopModel] = Field(..., description="Legend gradient stops")
    value_min: float = Field(..., description="Minimum finite value")
    value_max: float = Field(..., description="Maximum finite value")


class MassBalanceChartResponse(BaseModel):
    chart: ChartModel = Field(..., description="Mass-balance visualization payload")


# ---------------------------------------------------------------------------
# Mass Balance Models
# ---------------------------------------------------------------------------

class StreamModel(BaseModel):
    name: str = Field(..., description="Nome da corrente")
    direction: int = Field(..., description="Direção da corrente: +1 para entrada, -1 para saída")
    flow_rate: Optional[float] = Field(None, description="Vazão da corrente (pode usar unidades mássicas como kg/h, g/min ou molares como mol/s)")
    compositions: Dict[str, Optional[float]] = Field(..., description="Dictionary of component compositions (mass fractions when using mass flow units, molar fractions when using molar flow units)")


class ReactionModel(BaseModel):
    stoichiometry: Dict[str, float] = Field(..., description="Stoichiometric coefficients for each component")
    key_component: str = Field(..., description="Key component for the reaction")
    conversion: float = Field(..., ge=0, le=1, description="Conversion of the key component (0-1)")


class SplitModel(BaseModel):
    parent_stream: str = Field(..., description="Nome da corrente principal")
    recycle_stream: str = Field(..., description="Nome da corrente de reciclo")
    purge_stream: str = Field(..., description="Nome da corrente de purga")
    fraction: float = Field(..., ge=0, le=1, description="Recycle fraction (0-1)")


class MassBalanceRequest(BaseModel):
    components: List[str] = Field(..., description="List of component names")
    streams: List[StreamModel] = Field(..., description="Lista de correntes do processo")
    reactions: Optional[List[ReactionModel]] = Field(None, description="List of reactions")
    splits: Optional[List[SplitModel]] = Field(None, description="List of splits (recycles)")


# ---------------------------------------------------------------------------
# Sizing Models
# ---------------------------------------------------------------------------

class CalculatedDiameterRequest(BaseModel):
    flow_rate: float = Field(..., description="Vazão em m³/s")
    velocity: float = Field(..., description="Velocidade do escoamento em m/s")


class RealDiameterRequest(BaseModel):
    calculated_diameter: float = Field(..., description="Calculated diameter in mm")
    schedule: str = Field(..., description="Schedule da tubulação")


class VelocityProfileRequest(BaseModel):
    velocity: float = Field(..., gt=0, description="Velocidade do escoamento em m/s")
    diameter_mm: float = Field(..., gt=0, description="Internal diameter in mm")


class VelocityProfileArrowModel(BaseModel):
    x1: float = Field(..., description="Arrow start x coordinate")
    y1: float = Field(..., description="Arrow start y coordinate")
    x2: float = Field(..., description="Arrow end x coordinate")
    y2: float = Field(..., description="Arrow end y coordinate")
    tip: str = Field(..., description="Arrow tip polygon points")


class VelocityProfileVisualizationResponse(BaseModel):
    title: str = Field(..., description="Visualization title")
    regime: Literal["laminar", "transition", "turbulent"] = Field(..., description="Regime de escoamento")
    color: str = Field(..., description="Regime color")
    label: str = Field(..., description="Regime label")
    reynolds: float = Field(..., description="Calculated Reynolds number")
    arrows: List[VelocityProfileArrowModel] = Field(..., description="Vetores das setas calculados pelo backend")
    diameter_mm: float = Field(..., description="Internal diameter in mm")
    velocity: float = Field(..., description="Fluid velocity in m/s")


class PipingExampleResponse(BaseModel):
    composition: str = Field(..., description="Composição da tubulação selecionada para o exemplo")
    schedule: str = Field(..., description="Schedule da tubulação selecionado para o exemplo")
    diameter: float = Field(..., description="Nominal diameter in mm")
    fitting: str = Field(..., description="Acessório da tubulação selecionado para o exemplo")


class SizingExampleCalculatedDiameter(BaseModel):
    flow_rate: float = Field(..., description="Vazão em m³/s")
    velocity: float = Field(..., description="Velocidade do escoamento em m/s")


class SizingExampleRealDiameter(BaseModel):
    calculated_diameter: float = Field(..., description="Calculated diameter in mm")
    schedule: str = Field(..., description="Schedule da tubulação")


class SizingExampleResponse(BaseModel):
    calculated_diameter: SizingExampleCalculatedDiameter = Field(
        ...,
        description="Worked example for the calculated diameter form",
    )
    real_diameter: SizingExampleRealDiameter = Field(
        ...,
        description="Worked example for the real diameter form",
    )


# ---------------------------------------------------------------------------
# Flow Models
# ---------------------------------------------------------------------------

class ReynoldsRequest(BaseModel):
    characteristic_diameter: float = Field(..., description="Characteristic diameter in m")
    velocity: float = Field(..., description="Velocidade do escoamento em m/s")
    density: Optional[float] = Field(None, description="Density in kg/m³")
    dynamic_viscosity: Optional[float] = Field(None, description="Dynamic viscosity in kg/(m·s) or Pa·s")
    kinematic_viscosity: Optional[float] = Field(None, description="Kinematic viscosity in m²/s")

    @model_validator(mode='after')
    def check_viscosity(self):
        if self.dynamic_viscosity is None and self.kinematic_viscosity is None:
            raise ValueError("Either dynamic viscosity or kinematic viscosity must be provided")
        return self


class ReynoldsRegimeVisualizationRequest(BaseModel):
    reynolds: float = Field(..., ge=0, description="Reynolds number to place on the regime ruler")


class ReynoldsRegimeTick(BaseModel):
    value: float = Field(..., description="Tick value in Reynolds units")
    label: str = Field(..., description="Preformatted tick label")
    x: float = Field(..., description="Precomputed SVG x coordinate")


class ReynoldsRegimeSegment(BaseModel):
    regime: Literal["laminar", "transition", "turbulent"] = Field(..., description="Chave do regime de escoamento")
    label: str = Field(..., description="Display label")
    color: str = Field(..., description="Segment color")
    x: float = Field(..., description="Precomputed SVG x coordinate")
    width: float = Field(..., ge=0, description="Precomputed SVG segment width")


class ReynoldsRegimeMarker(BaseModel):
    x: float = Field(..., description="Precomputed SVG marker x coordinate")
    label: str = Field(..., description="Preformatted Reynolds label")
    status: str = Field(..., description="Marker status text")
    regime: Literal["laminar", "transition", "turbulent"] = Field(..., description="Chave do regime de escoamento")
    regime_label: str = Field(..., description="Display label for the current regime")
    color: str = Field(..., description="Marker regime color")
    text_anchor: Literal["start", "middle", "end"] = Field(..., description="SVG text-anchor")


class ReynoldsRegimeVisualizationResponse(BaseModel):
    title: str = Field(..., description="Visualization title")
    description: str = Field(..., description="Visualization description")
    domain: AxisDomainModel = Field(..., description="Backend-owned Reynolds scale domain")
    ticks: List[ReynoldsRegimeTick] = Field(..., description="Backend-owned ruler ticks")
    segments: List[ReynoldsRegimeSegment] = Field(..., description="Backend-owned regime bands")
    marker: ReynoldsRegimeMarker = Field(..., description="Backend-owned marker projection")


class FlowExampleMetadata(BaseModel):
    fluid: str = Field(..., description="Fluid used in the worked example")
    pressure: float = Field(..., description="Pressure in Pa")
    regime: Literal["transitional"] = Field(..., description="Regime de escoamento")


class FlowExampleReynolds(BaseModel):
    characteristic_diameter: float = Field(..., description="Characteristic diameter in mm")
    velocity: float = Field(..., description="Velocidade do escoamento em m/s")
    density: float = Field(..., description="Density in kg/m³")
    dynamic_viscosity: float = Field(..., description="Dynamic viscosity in Pa·s")


class FlowExampleFriction(BaseModel):
    method: Literal["SwameeJain"] = Field(..., description="Método do fator de atrito do escoamento")
    roughness_source: Literal["composition"] = Field(..., description="Fonte da rugosidade da tubulação")
    composition: str = Field(..., description="Composição da tubulação")
    diameter_source: Literal["custom"] = Field(..., description="Source for the diameter used in friction")
    custom_diameter: float = Field(..., description="Custom diameter in mm")


class FlowExampleHydraulicDiameter(BaseModel):
    shape: Literal["circularCap"] = Field(..., description="Hydraulic diameter worked example shape")
    diameter: float = Field(..., description="Diâmetro geométrico em m")
    height: float = Field(..., description="Height in m")


class FlowExampleResponse(BaseModel):
    metadata: FlowExampleMetadata = Field(..., description="Example metadata")
    reynolds: FlowExampleReynolds = Field(..., description="Reynolds input parameters")
    friction: FlowExampleFriction = Field(..., description="Parâmetros de entrada do fator de atrito do escoamento")
    hydraulic_diameter: FlowExampleHydraulicDiameter = Field(
        ...,
        description="Hydraulic diameter input parameters",
    )


class MoodyChartRequest(BaseModel):
    reynolds: float = Field(..., gt=0, description="Reynolds number for the operating point")
    friction_factor: float = Field(..., gt=0, description="Darcy friction factor for the operating point")
    roughness: float = Field(..., ge=0, le=1, description="Rugosidade relativa ε/D no ponto de operação")


class PumpExampleFitting(BaseModel):
    fitting: str = Field(..., description="Acessório da tubulação")
    quantity: int = Field(..., ge=1, description="Quantidade de acessórios")


class PumpExampleHeadloss(BaseModel):
    method: Literal["Darcy-Weisbach"] = Field(..., description="Head loss method")
    pipe_length: float = Field(..., description="Comprimento da tubulação em m")
    diameter: float = Field(..., description="Diâmetro da tubulação em mm")
    flow_rate: float = Field(..., description="Vazão em m³/s")
    velocity: float = Field(..., description="Velocidade do escoamento em m/s")
    reynolds: float = Field(..., description="Número de Reynolds usado na entrada do fator de atrito do escoamento")
    friction_factor: float = Field(..., description="Fator de atrito do escoamento usado no exemplo resolvido")
    friction_method: Literal["ColebrookWhite", "SwameeJain"] = Field(
        ...,
        description="Friction-factor method",
    )
    composition: str = Field(..., description="Composição da tubulação")
    fittings: List[PumpExampleFitting] = Field(..., description="Acessórios do exemplo resolvido")


class PumpExampleNpsh(BaseModel):
    manometric_pressure: float = Field(..., description="Manometric pressure")
    atmospheric_pressure: float = Field(..., description="Atmospheric pressure")
    vapor_pressure: float = Field(..., description="Vapor pressure")
    density: float = Field(..., description="Fluid density in kg/m³")
    friction_factor: float = Field(..., description="Head loss in meters")
    pump_inlet_velocity: float = Field(..., description="Pump inlet velocity in m/s")
    gauge_elevation: float = Field(..., description="Gauge elevation in m")
    required: float = Field(..., description="Required NPSH in m")


class PumpExampleHead(BaseModel):
    pressure1: float = Field(..., description="Pressure at point 1 in Pa")
    pressure2: float = Field(..., description="Pressure at point 2 in Pa")
    elevation1: float = Field(..., description="Elevation at point 1 in m")
    elevation2: float = Field(..., description="Elevation at point 2 in m")
    velocity1: float = Field(..., description="Velocidade no ponto 1 em m/s")
    velocity2: float = Field(..., description="Velocidade no ponto 2 em m/s")
    density: float = Field(..., description="Fluid density in kg/m³")
    friction_factor: float = Field(..., description="Head loss in meters")


class PumpExampleResponse(BaseModel):
    headloss: PumpExampleHeadloss = Field(..., description="Worked example for head loss")
    npsh: PumpExampleNpsh = Field(..., description="Worked example for NPSH available")
    head: PumpExampleHead = Field(..., description="Worked example for manometric head")


class FrictionFactorRequest(BaseModel):
    roughness: float = Field(..., description="Rugosidade da tubulação em mm")
    diameter: float = Field(..., description="Diâmetro em mm")
    reynolds: float = Field(..., description="Reynolds number (dimensionless)")
    method: str = Field(..., description="Method for calculating friction factor")


class HydraulicDiameterRequest(BaseModel):
    shape: str = Field(..., description="Shape type: circular, rectangular, annular, triangular, or circularCap")

    # Circular parameters
    diameter: Optional[float] = Field(None, gt=0, description="Diâmetro geométrico da forma circular (m)")

    # Rectangular parameters
    width: Optional[float] = Field(None, gt=0, description="Width for rectangular shape (m)")
    height: Optional[float] = Field(None, gt=0, description="Height for rectangular shape (m)")

    # Annular parameters
    outer_diameter: Optional[float] = Field(None, gt=0, description="Outer diameter for annular shape (m)")
    inner_diameter: Optional[float] = Field(None, gt=0, description="Inner diameter for annular shape (m)")

    # Triangular parameters
    side_a: Optional[float] = Field(None, gt=0, description="Side A for triangular shape (m)")
    side_b: Optional[float] = Field(None, gt=0, description="Side B for triangular shape (m)")
    side_c: Optional[float] = Field(None, gt=0, description="Side C for triangular shape (m)")

    @field_validator("shape")
    @classmethod
    def validate_shape(cls, v):
        if v not in ["circular", "rectangular", "annular", "triangular", "circularCap"]:
            raise ValueError("Shape must be 'circular', 'rectangular', 'annular', 'triangular', or 'circularCap'")
        return v

    @field_validator("diameter")
    @classmethod
    def validate_circular(cls, v, info):
        field_values = info.data
        if field_values.get("shape") == "circular" and v is None:
            raise ValueError("Diameter is required for circular shape")
        return v

    @field_validator("width", "height")
    @classmethod
    def validate_rectangular(cls, v, info):
        field_name = info.field_name
        field_values = info.data

        if field_values.get("shape") == "rectangular":
            if field_name == "width" and v is None:
                raise ValueError("Width is required for rectangular shape")
            if field_name == "height" and v is None:
                raise ValueError("Height is required for rectangular shape")
        return v

    @field_validator("outer_diameter", "inner_diameter")
    @classmethod
    def validate_annular(cls, v, info):
        field_name = info.field_name
        field_values = info.data

        if field_values.get("shape") == "annular":
            if field_name == "outer_diameter" and v is None:
                raise ValueError("Outer diameter is required for annular shape")
            if field_name == "inner_diameter" and v is None:
                raise ValueError("Inner diameter is required for annular shape")
        return v

    @field_validator("side_a", "side_b", "side_c")
    @classmethod
    def validate_triangular(cls, v, info):
        field_name = info.field_name
        field_values = info.data

        if field_values.get("shape") == "triangular":
            if field_name == "side_a" and v is None:
                raise ValueError("Side A is required for triangular shape")
            if field_name == "side_b" and v is None:
                raise ValueError("Side B is required for triangular shape")
            if field_name == "side_c" and v is None:
                raise ValueError("Side C is required for triangular shape")
        return v

    @field_validator("diameter", "height")
    @classmethod
    def validate_circularCap(cls, v, info):
        field_name = info.field_name
        field_values = info.data

        if field_values.get("shape") == "circularCap":
            if field_name == "diameter" and v is None:
                raise ValueError("Diameter is required for circular cap")
            if field_name == "height" and v is None:
                raise ValueError("Height is required for circular cap")
        return v


class SvgElementModel(BaseModel):
    type: Literal["circle", "line", "path", "polygon", "rect", "text"] = Field(
        ...,
        description="SVG primitive type",
    )
    attrs: Dict[str, Any] = Field(..., description="SVG attributes precomputed by the backend")
    text: Optional[str] = Field(None, description="Text content for text elements")


class HydraulicDiameterPreviewChip(BaseModel):
    label: str = Field(..., description="Chip label")
    value: str = Field(..., description="Preformatted chip value")


class HydraulicDiameterPreviewResponse(BaseModel):
    title: str = Field(..., description="Preview title")
    description: str = Field(..., description="Accessible SVG description")
    summary: str = Field(..., description="Short UI summary shown above the preview")
    view_box: str = Field(..., description="SVG viewBox")
    elements: List[SvgElementModel] = Field(..., description="Backend-owned SVG primitives")
    chips: List[HydraulicDiameterPreviewChip] = Field(..., description="Chips de exibição calculados pelo backend")


# ---------------------------------------------------------------------------
# Pump Models
# ---------------------------------------------------------------------------

class FittingItem(BaseModel):
    quantity: int = Field(..., gt=0, description="Quantity")
    fitting: str = Field(..., description="Tipo de acessório")


class HeadLossRequest(BaseModel):
    # Darcy‑Weisbach parameters
    friction_factor: Optional[float] = Field(None, ge=0, description="Fator de atrito do escoamento (adimensional)")
    velocity: Optional[float] = Field(None, ge=0, description="Velocidade do escoamento (m/s)")

    # Hazen‑Williams parameters
    flow_rate: Optional[float] = Field(None, ge=0, description="Vazão (m³/s)")
    roughness_coefficient: Optional[float] = Field(None, ge=0, description="Coeficiente de rugosidade (adimensional)")

    # Common parameters
    pipe_length: float = Field(..., ge=0, description="Comprimento da tubulação em m")
    diameter: float = Field(..., ge=0, description="Internal diameter (mm)")
    fittings: Optional[List[FittingItem]] = Field(None, description="Lista de acessórios da tubulação")
    method: str = Field(..., description="Method: Darcy‑Weisbach | Hazen‑Williams")


class NPSHAvailableRequest(BaseModel):
    manometric_pressure: float = Field(..., description="Manometric pressure in kgf/cm²")
    atmospheric_pressure: float = Field(..., description="Atmospheric pressure in kgf/cm²")
    vapor_pressure: float = Field(..., description="Vapor pressure in kgf/cm²")
    density: float = Field(..., description="Density in kg/m³")
    friction_factor: float = Field(..., description="Perda de carga em m")
    pump_inlet_velocity: float = Field(..., description="Pump inlet velocity in m/s")
    gauge_elevation: float = Field(..., description="Gauge elevation in m")


class NpshGaugeChartRequest(NPSHAvailableRequest):
    required: Optional[float] = Field(None, ge=0, description="Required NPSH in m")


class NpshGaugeValueModel(BaseModel):
    value: float = Field(..., description="NPSH value")
    units: str = Field(..., description="NPSH units")


class NpshGaugeStatusModel(BaseModel):
    tone: Literal["safe", "risk", "missing"] = Field(..., description="Semantic status")
    label: str = Field(..., description="Status label")
    message: str = Field(..., description="Status explanation")


class NpshGaugeResponse(BaseModel):
    id: str = Field(..., description="Visualization identifier")
    title: str = Field(..., description="Gauge title")
    available: NpshGaugeValueModel = Field(..., description="Available NPSH")
    required: Optional[NpshGaugeValueModel] = Field(None, description="Required NPSH")
    safe_threshold: Optional[NpshGaugeValueModel] = Field(None, description="Safe NPSH threshold")
    status: NpshGaugeStatusModel = Field(..., description="Backend-owned NPSH status")
    axis: AxisModel = Field(..., description="Gauge axis, domain, and ticks")
    markers: List[MarkerModel] = Field(default_factory=list, description="Gauge markers")


class HeadRequest(BaseModel):
    pressure1: float = Field(..., description="Pressure at point 1 in Pa")
    pressure2: float = Field(..., description="Pressure at point 2 in Pa")
    elevation1: float = Field(..., description="Elevation at point 1 in m")
    elevation2: float = Field(..., description="Elevation at point 2 in m")
    velocity1: float = Field(..., description="Velocidade no ponto 1 em m/s")
    velocity2: float = Field(..., description="Velocidade no ponto 2 em m/s")
    density: float = Field(..., description="Density of fluid in kg/m³")
    friction_factor: float = Field(..., description="Perda de carga em m")


# ---------------------------------------------------------------------------
# Reactor Models
# ---------------------------------------------------------------------------

class ComponentRequest(BaseModel):
    state: str = Field(..., description="State of the component (liquid or gaseous)")
    component_name: str = Field(..., description="Component name")
    flow_rate_inlet: float = Field(..., description="Vazão de entrada em m³/s")
    molar_concentration_inlet: float = Field(..., description="Molar concentration inlet in mol/m³")


class ReactorRequest(BaseModel):
    input_type: str = Field(..., description="Type of calculation: conversion_and_kinetics, volume_and_kinetics, or residence_time_and_kinetics")
    components: List[ComponentRequest] = Field(..., description="List of all components in the reaction")
    stoichiometric_coefficients: List[float] = Field(..., description="Stoichiometric coefficients (negative for reactants, positive for products)")
    reaction_rate_params: Dict[str, Any] = Field(..., description="Parameters for reaction rate calculation (k, reaction_orders)")
    recycling_ratio: Optional[float] = Field(0, ge=0, description="Recycling ratio for PFR (default: 0)")
    conversion: Optional[float] = Field(None, ge=0, lt=1, description="Conversion (dimensionless), required for conversion_and_kinetics")
    volume: Optional[float] = Field(None, gt=0, description="Reactor volume (m³), required for volume_and_kinetics")
    residence_time: Optional[float] = Field(None, gt=0, description="Residence time (s), required for residence_time_and_kinetics")
    operation_conditions: Dict[str, float] = Field(..., description="Operation conditions (initial_temperature, initial_pressure, final_temperature, final_pressure)")

    @field_validator("input_type")
    @classmethod
    def check_input_type(cls, v):
        if v not in ["conversion_and_kinetics", "volume_and_kinetics", "residence_time_and_kinetics"]:
            raise ValueError("Input type must be 'conversion_and_kinetics', 'volume_and_kinetics', or 'residence_time_and_kinetics'")
        return v

    @field_validator("reaction_rate_params")
    @classmethod
    def check_reaction_rate_params(cls, v):
        if "k" not in v:
            raise ValueError("Reaction rate parameters must include 'k'")
        if "reaction_orders" not in v:
            raise ValueError("Reaction rate parameters must include 'reaction_orders'")
        return v

    @field_validator("operation_conditions")
    @classmethod
    def check_operation_conditions(cls, v):
        required_keys = ["initial_temperature", "initial_pressure", "final_temperature", "final_pressure"]
        for key in required_keys:
            if key not in v:
                raise ValueError(f"Operation conditions must include '{key}'")
        return v

    @model_validator(mode='after')
    def check_required_parameters(self):
        if self.input_type == "conversion_and_kinetics" and self.conversion is None:
            raise ValueError("Conversion is required for conversion_and_kinetics input type")

        if self.input_type == "volume_and_kinetics" and self.volume is None:
            raise ValueError("Volume is required for volume_and_kinetics input type")

        if self.input_type == "residence_time_and_kinetics" and self.residence_time is None:
            raise ValueError("Residence time is required for residence_time_and_kinetics input type")

        return self


class ReactorPlotRequest(BaseModel):
    components: List[ComponentRequest] = Field(..., description="List of all components in the reaction")
    stoichiometric_coefficients: List[float] = Field(..., description="Stoichiometric coefficients (negative for reactants, positive for products)")
    reaction_rate_params: Dict[str, Any] = Field(..., description="Parameters for reaction rate calculation (k, reaction_orders)")
    recycling_ratio: Optional[float] = Field(0, ge=0, description="Recycling ratio for PFR (default: 0)")
    operation_conditions: Dict[str, float] = Field(..., description="Operation conditions (initial_temperature, initial_pressure, final_temperature, final_pressure)")
    max_conversion: Optional[float] = Field(0.99999, ge=0, lt=1, description="Maximum conversion value for the plot (default: 0.99999)")
    cstr_conversion: Optional[float] = Field(None, ge=0, lt=1, description="Optional CSTR operating conversion marker")
    pfr_conversion: Optional[float] = Field(None, ge=0, lt=1, description="Optional PFR operating conversion marker")

    @field_validator("reaction_rate_params")
    @classmethod
    def check_reaction_rate_params(cls, v):
        if "k" not in v:
            raise ValueError("Reaction rate parameters must include 'k'")
        if "reaction_orders" not in v:
            raise ValueError("Reaction rate parameters must include 'reaction_orders'")
        return v

    @field_validator("operation_conditions")
    @classmethod
    def check_operation_conditions(cls, v):
        required_keys = ["initial_temperature", "initial_pressure", "final_temperature", "final_pressure"]
        for key in required_keys:
            if key not in v:
                raise ValueError(f"Operation conditions must include '{key}'")
        return v


class ReactorArrheniusChartRequest(BaseModel):
    activation_energy: float = Field(..., gt=0, description="Activation energy in J/mol")
    reference_temperature: float = Field(..., gt=0, description="Reference temperature in K")
    reference_rate_constant: float = Field(..., gt=0, description="Reference rate constant")
    min_temperature: Optional[float] = Field(None, gt=0, description="Optional minimum sampling temperature in K")
    max_temperature: Optional[float] = Field(None, gt=0, description="Optional maximum sampling temperature in K")


class ReactorRecycleProfileRequest(BaseModel):
    components: List[ComponentRequest] = Field(..., description="List of all components in the reaction")
    stoichiometric_coefficients: List[float] = Field(
        ...,
        description="Stoichiometric coefficients (negative for reactants, positive for products)",
    )
    reaction_rate_params: Dict[str, Any] = Field(
        ...,
        description="Parameters for reaction rate calculation (k, reaction_orders)",
    )
    operation_conditions: Dict[str, float] = Field(
        ...,
        description="Operation conditions (initial_temperature, initial_pressure, final_temperature, final_pressure)",
    )
    volume: float = Field(..., gt=0, description="Fixed reactor volume in m³")
    recycle_ratios: List[float] = Field(
        default_factory=lambda: [0, 0.25, 0.5, 1, 2, 5, 10],
        description="Recycle ratios sampled for the current PFR case",
    )

    @field_validator("reaction_rate_params")
    @classmethod
    def check_recycle_profile_reaction_rate_params(cls, v):
        if "k" not in v:
            raise ValueError("Reaction rate parameters must include 'k'")
        if "reaction_orders" not in v:
            raise ValueError("Reaction rate parameters must include 'reaction_orders'")
        return v

    @field_validator("operation_conditions")
    @classmethod
    def check_recycle_profile_operation_conditions(cls, v):
        required_keys = ["initial_temperature", "initial_pressure", "final_temperature", "final_pressure"]
        for key in required_keys:
            if key not in v:
                raise ValueError(f"Operation conditions must include '{key}'")
        return v

    @field_validator("recycle_ratios")
    @classmethod
    def check_recycle_ratios(cls, v):
        if len(v) == 0:
            raise ValueError("Recycle ratios must include at least one value")
        if any(value < 0 for value in v):
            raise ValueError("Recycle ratios must be non-negative")
        return v


class ReactorSpatialProfileRequest(BaseModel):
    components: List[ComponentRequest] = Field(..., description="List of all components in the reaction")
    stoichiometric_coefficients: List[float] = Field(
        ...,
        description="Stoichiometric coefficients (negative for reactants, positive for products)",
    )
    reaction_rate_params: Dict[str, Any] = Field(
        ...,
        description="Parameters for reaction rate calculation (k, reaction_orders)",
    )
    operation_conditions: Dict[str, float] = Field(
        ...,
        description="Operation conditions (initial_temperature, initial_pressure, final_temperature, final_pressure)",
    )
    volume: float = Field(..., gt=0, description="Fixed reactor volume in m³")
    recycling_ratio: float = Field(0.0, ge=0, description="Recycle ratio R")
    axial_positions: List[float] = Field(
        ...,
        min_length=2,
        description="Relative axial positions in the interval [0, 1]",
    )

    @field_validator("reaction_rate_params")
    @classmethod
    def check_spatial_profile_reaction_rate_params(cls, v):
        if "k" not in v:
            raise ValueError("Reaction rate parameters must include 'k'")
        if "reaction_orders" not in v:
            raise ValueError("Reaction rate parameters must include 'reaction_orders'")
        return v

    @field_validator("operation_conditions")
    @classmethod
    def check_spatial_profile_operation_conditions(cls, v):
        required_keys = ["initial_temperature", "initial_pressure", "final_temperature", "final_pressure"]
        for key in required_keys:
            if key not in v:
                raise ValueError(f"Operation conditions must include '{key}'")
        return v

    @field_validator("axial_positions")
    @classmethod
    def check_axial_positions(cls, values):
        if any(value < 0 or value > 1 for value in values):
            raise ValueError("Axial positions must be between 0 and 1")
        if values != sorted(values):
            raise ValueError("Axial positions must be sorted")
        return values


# ---------------------------------------------------------------------------
# Components Models
# ---------------------------------------------------------------------------

class PropertyRequest(BaseModel):
    fluid: str = Field(..., description="Name of the fluid")
    property_name: str = Field(..., description="Name of the property to retrieve (CoolProp format)")
    temperature: float = Field(..., gt=0, description="Temperature in K")
    pressure: float = Field(..., gt=0, description="Pressure in Pa")


class MixturePropertiesRequest(BaseModel):
    fluid_fractions: Dict[str, float] = Field(..., description="Dictionary with fluid names as keys and their mass fractions as values")
    temperature: float = Field(..., gt=0, description="Temperature in K")
    pressure: float = Field(..., gt=0, description="Pressure in Pa")
    properties: Optional[List[str]] = Field(None, description="List of property keys to retrieve. If None, returns all available properties")


class FluidRequest(BaseModel):
    fluid: str = Field(..., description="Name of the fluid")


class SaturationEnvelopeRequest(BaseModel):
    fluid: str = Field(..., description="Name of the fluid")
    sample_count: int = Field(
        60,
        ge=10,
        le=200,
        description="Number of samples between triple and critical points",
    )


class PropsStateRequest(BaseModel):
    fluid: str = Field(..., description="Name of the fluid")
    input1: str = Field(..., description="First state variable key (CoolProp format, e.g. 'P', 'T', 'S', 'Q')")
    value1: float = Field(..., description="Value of the first state variable (SI units)")
    input2: str = Field(..., description="Second state variable key (CoolProp format)")
    value2: float = Field(..., description="Value of the second state variable (SI units)")
    output: str = Field(..., description="Output property key (CoolProp format, e.g. 'H', 'S', 'T', 'D')")


class BinaryVLERequest(BaseModel):
    fluid1: str = Field(..., description="First binary component")
    fluid2: str = Field(..., description="Second binary component")
    pressure: float = Field(..., gt=0, description="Operating pressure in Pa")
    sample_count: int = Field(
        21,
        ge=5,
        le=60,
        description="Number of composition samples for each curve",
    )


class PropertySurfaceRequest(BaseModel):
    fluid: str = Field(..., description="Name of the fluid")
    property_name: str = Field(..., description="CoolProp property key")
    temperature_min: float = Field(..., gt=0, description="Lower temperature bound in K")
    temperature_max: float = Field(..., gt=0, description="Upper temperature bound in K")
    pressure_min: float = Field(..., gt=0, description="Lower pressure bound in Pa")
    pressure_max: float = Field(..., gt=0, description="Upper pressure bound in Pa")
    temperature_samples: int = Field(
        12,
        ge=4,
        le=40,
        description="Number of temperature samples",
    )
    pressure_samples: int = Field(
        10,
        ge=4,
        le=40,
        description="Number of pressure samples",
    )


class ComponentsExamplePureFluid(BaseModel):
    fluid: str = Field(..., description="Fluid selected for the pure-fluid example")
    property_names: List[str] = Field(..., description="Property keys selected for the example")
    temperature: float = Field(..., description="Temperature in K")
    pressure: float = Field(..., description="Pressure in Pa")


class ComponentsExampleMixtures(BaseModel):
    fluid_fractions: Dict[str, float] = Field(
        ...,
        description="Mixture composition selected for the example",
    )
    temperature: float = Field(..., description="Temperature in K")
    pressure: float = Field(..., description="Pressure in Pa")
    properties: List[str] = Field(..., description="Property keys selected for the example")


class ComponentsExampleTernary(BaseModel):
    component_a: str = Field(..., description="First ternary component")
    component_b: str = Field(..., description="Second ternary component")
    component_c: str = Field(..., description="Third ternary component")
    fraction_a: float = Field(..., description="Molar fraction for component A")
    fraction_b: float = Field(..., description="Molar fraction for component B")
    fraction_c: float = Field(..., description="Molar fraction for component C")


class ComponentsExampleBinaryVle(BaseModel):
    fluid1: str = Field(..., description="First binary component")
    fluid2: str = Field(..., description="Second binary component")
    pressure: float = Field(..., description="Operating pressure in Pa")
    sample_count: int = Field(..., description="Number of composition samples")


class ComponentsExampleMccabeThiele(BaseModel):
    distillate_composition: float = Field(..., description="Distillate composition")
    bottoms_composition: float = Field(..., description="Bottoms composition")
    feed_composition: float = Field(..., description="Feed composition")
    reflux_ratio: float = Field(..., description="Reflux ratio")
    q_value: float = Field(..., description="Valor da linha q")
    max_stages: int = Field(..., description="Maximum number of stages")


class ComponentsExamplePropertySurface(BaseModel):
    fluid: str = Field(..., description="Fluid selected for the surface example")
    property_name: str = Field(..., description="Property key selected for the example")
    temperature_min: float = Field(..., description="Lower temperature bound in K")
    temperature_max: float = Field(..., description="Upper temperature bound in K")
    pressure_min: float = Field(..., description="Lower pressure bound in Pa")
    pressure_max: float = Field(..., description="Upper pressure bound in Pa")
    temperature_samples: int = Field(..., description="Temperature sample count")
    pressure_samples: int = Field(..., description="Pressure sample count")


class ComponentsExamplePhaseEnvelope(BaseModel):
    fluid: str = Field(..., description="Fluid selected for the phase-envelope example")
    sample_count: int = Field(..., description="Number of saturation points")


class ComponentsExampleResponse(BaseModel):
    pure_fluid: ComponentsExamplePureFluid = Field(..., description="Pure-fluid example inputs")
    mixtures: ComponentsExampleMixtures = Field(..., description="Mixture example inputs")
    ternary_diagram: ComponentsExampleTernary = Field(..., description="Ternary diagram example inputs")
    binary_vle: ComponentsExampleBinaryVle = Field(..., description="Binary VLE example inputs")
    mccabe_thiele: ComponentsExampleMccabeThiele = Field(..., description="McCabe-Thiele example inputs")
    property_surface: ComponentsExamplePropertySurface = Field(..., description="Property surface example inputs")
    phase_envelope: ComponentsExamplePhaseEnvelope = Field(..., description="Phase envelope example inputs")
