import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from models.charting import build_chart_model, build_linear_axis, build_log_axis, build_series_model


def test_build_linear_axis_expands_flat_domain():
    axis = build_linear_axis([12, 12, 12], label="Vazao", units="m3/s")

    assert axis.scale == "linear"
    assert axis.domain.min < 12 < axis.domain.max
    assert axis.ticks[0] == axis.domain.min
    assert axis.ticks[-1] == axis.domain.max
    assert len(axis.ticks) >= 2


def test_build_log_axis_produces_major_ticks():
    axis = build_log_axis([1, 1_000], label="Re", units="adimensional")

    assert axis.scale == "log"
    assert axis.domain.min <= 1
    assert axis.domain.max >= 1_000
    assert axis.major_ticks[:4] == [1, 10, 100, 1_000]
    assert set(axis.major_ticks).issubset(set(axis.ticks))


def test_build_series_model_preserves_points_and_kind():
    points = [{"x": 0.0, "y": 1.0}, {"x": 1.5, "y": 3.0}]

    series = build_series_model(name="Feed", points=points, kind="line", color="#0f172a")

    assert series.name == "Feed"
    assert series.id == "feed"
    assert series.kind == "line"
    assert series.points[0].x == 0.0
    assert series.points[1].y == 3.0
    assert series.color == "#0f172a"


def test_build_series_model_rejects_non_finite_points():
    with pytest.raises(ValueError, match="finite coordinates"):
        build_series_model(name="Feed", kind="line", points=[{"x": 0.0, "y": float("nan")}])


def test_build_chart_model_uses_axes_and_series():
    series = [
        build_series_model(
            name="Feed",
            kind="line",
            points=[{"x": 1.0, "y": 2.0}, {"x": 4.0, "y": 6.0}],
        )
    ]
    axes = {
        "x": build_linear_axis([1.0, 4.0], label="Volume", units="m3"),
        "y": build_linear_axis([2.0, 6.0], label="Conversao", units="adimensional"),
    }

    chart = build_chart_model(chart_id="example", title="Example", axes=axes, series=series)

    assert chart.id == "example"
    assert chart.title == "Example"
    assert chart.axes == axes
    assert chart.series == series
    assert chart.metadata.version == "1.0"
