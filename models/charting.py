from __future__ import annotations

import math
import re
from typing import Dict, Iterable, List, Optional, Sequence

from schemas import (
    AnnotationModel,
    AxisModel,
    ChartMetadataModel,
    ChartModel,
    MarkerModel,
    SeriesModel,
)


def _coerce_values(values: Iterable[float], *, positive_only: bool = False) -> List[float]:
    numbers = [float(value) for value in values if math.isfinite(float(value))]
    if not numbers:
        raise ValueError("Axis values must include at least one finite number")
    if positive_only and any(value <= 0 for value in numbers):
        raise ValueError("Logarithmic axes require positive values")
    return numbers


def _build_domain_bounds(values: List[float], *, log_scale: bool = False) -> Dict[str, float]:
    lower = min(values)
    upper = max(values)

    if log_scale:
        min_power = math.floor(math.log10(lower))
        max_power = math.ceil(math.log10(upper))
        if min_power == max_power:
            min_power -= 1
            max_power += 1
        return {
            "min": float(10 ** min_power),
            "max": float(10 ** max_power),
        }

    if math.isclose(lower, upper):
        padding = max(abs(lower) * 0.05, 1.0)
    else:
        padding = (upper - lower) * 0.05

    return {
        "min": float(lower - padding),
        "max": float(upper + padding),
    }


def _validate_domain(domain: Dict[str, float], *, positive_only: bool = False) -> Dict[str, float]:
    lower = float(domain["min"])
    upper = float(domain["max"])

    if not math.isfinite(lower) or not math.isfinite(upper):
        raise ValueError("Axis domain bounds must be finite")
    if upper <= lower:
        raise ValueError("Axis domain max must be greater than min")
    if positive_only and lower <= 0:
        raise ValueError("Logarithmic axes require positive bounds")

    return {"min": lower, "max": upper}


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "series"


def _coerce_point(point: Dict[str, float]) -> Dict[str, float]:
    if "x" not in point or "y" not in point:
        raise ValueError("Each series point must include 'x' and 'y'")

    x = float(point["x"])
    y = float(point["y"])
    if not math.isfinite(x) or not math.isfinite(y):
        raise ValueError("Each series point must use finite coordinates")

    return {"x": x, "y": y}


def sample_log_space(minimum: float, maximum: float, count: int) -> List[float]:
    if minimum <= 0 or maximum <= 0:
        raise ValueError("Logarithmic samples require positive bounds")
    if maximum < minimum:
        raise ValueError("Maximum must be greater than or equal to minimum")
    if count <= 0:
        raise ValueError("Sample count must be positive")

    if count == 1:
        return [float(minimum)]

    log_min = math.log10(minimum)
    log_max = math.log10(maximum)
    return [
        float(10 ** (log_min + ((log_max - log_min) * index / (count - 1))))
        for index in range(count)
    ]


def build_log_ticks(
    minimum: float,
    maximum: float,
    *,
    multipliers: Sequence[int] = (1, 2, 5),
) -> List[float]:
    if minimum <= 0 or maximum <= 0:
        raise ValueError("Logarithmic ticks require positive bounds")
    if maximum < minimum:
        raise ValueError("Maximum must be greater than or equal to minimum")

    ticks: List[float] = []
    min_exponent = math.floor(math.log10(minimum))
    max_exponent = math.ceil(math.log10(maximum))

    for exponent in range(min_exponent, max_exponent + 1):
        decade = 10 ** exponent
        for multiplier in multipliers:
            value = float(multiplier * decade)
            if value < minimum or value > maximum:
                continue
            ticks.append(value)

    return ticks


def floor_log_tick(value: float) -> float:
    if not math.isfinite(value) or value <= 0:
        return 0.001

    exponent = math.floor(math.log10(value))
    decade = 10 ** exponent
    mantissa = value / decade

    if mantissa >= 5:
        return float(5 * decade)
    if mantissa >= 2:
        return float(2 * decade)
    return float(decade)


def ceil_log_tick(value: float) -> float:
    if not math.isfinite(value) or value <= 0:
        return 0.01

    exponent = math.floor(math.log10(value))
    decade = 10 ** exponent
    mantissa = value / decade

    if mantissa <= 1:
        return float(decade)
    if mantissa <= 2:
        return float(2 * decade)
    if mantissa <= 5:
        return float(5 * decade)
    return float(10 * decade)


def build_linear_axis(
    values: List[float],
    *,
    label: str = "",
    units: Optional[str] = None,
    tick_count: int = 5,
    tick_format: Optional[str] = None,
    domain: Optional[Dict[str, float]] = None,
) -> AxisModel:
    numbers = _coerce_values(values)
    axis_domain = _validate_domain(domain) if domain is not None else _build_domain_bounds(numbers)
    tick_count = max(2, tick_count)
    step = (axis_domain["max"] - axis_domain["min"]) / (tick_count - 1)
    ticks = [float(axis_domain["min"] + (index * step)) for index in range(tick_count)]

    return AxisModel(
        scale="linear",
        label=label,
        units=units,
        domain=axis_domain,
        ticks=ticks,
        major_ticks=ticks,
        tick_format=tick_format,
    )


def build_log_axis(
    values: List[float],
    *,
    label: str = "",
    units: Optional[str] = None,
    tick_format: Optional[str] = None,
    domain: Optional[Dict[str, float]] = None,
    tick_multipliers: Sequence[int] = (1, 2, 5),
) -> AxisModel:
    numbers = _coerce_values(values, positive_only=True)
    axis_domain = (
        _validate_domain(domain, positive_only=True)
        if domain is not None
        else _build_domain_bounds(numbers, log_scale=True)
    )
    min_power = int(round(math.log10(axis_domain["min"])))
    max_power = int(round(math.log10(axis_domain["max"])))
    major_ticks = [float(10 ** exponent) for exponent in range(min_power, max_power + 1)]
    ticks = build_log_ticks(
        axis_domain["min"],
        axis_domain["max"],
        multipliers=tick_multipliers,
    )

    return AxisModel(
        scale="log",
        label=label,
        units=units,
        domain=axis_domain,
        ticks=ticks,
        major_ticks=major_ticks,
        tick_format=tick_format,
    )


def build_series_model(
    name: str,
    points: List[Dict[str, float]],
    *,
    series_id: Optional[str] = None,
    color: Optional[str] = None,
    kind: str = "line",
) -> SeriesModel:
    normalized_points = [_coerce_point(point) for point in points]

    return SeriesModel(
        id=series_id or _slugify(name),
        name=name,
        kind=kind,
        points=normalized_points,
        color=color,
    )


def build_chart_model(
    *,
    chart_id: Optional[str] = None,
    title: str,
    axes: Optional[Dict[str, AxisModel]] = None,
    series: List[SeriesModel],
    markers: Optional[List[MarkerModel]] = None,
    annotations: Optional[List[AnnotationModel]] = None,
    subtitle: Optional[str] = None,
    approximation_notice: Optional[str] = None,
    metadata: Optional[ChartMetadataModel] = None,
) -> ChartModel:
    if axes is None:
        x_values = [point.x for current_series in series for point in current_series.points]
        y_values = [point.y for current_series in series for point in current_series.points]
        axes = {
            "x": build_linear_axis(x_values, label="x"),
            "y": build_linear_axis(y_values, label="y"),
        }

    return ChartModel(
        id=chart_id or _slugify(title),
        title=title,
        subtitle=subtitle,
        approximation_notice=approximation_notice,
        axes=axes,
        series=series,
        markers=markers or [],
        annotations=annotations or [],
        metadata=metadata or ChartMetadataModel(version="1.0"),
    )
