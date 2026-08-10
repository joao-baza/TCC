"""Deterministic importer for the pinned Draw.io P&ID stencil library."""

from __future__ import annotations

from dataclasses import dataclass, replace
from html import escape
import json
from pathlib import Path
import re
import unicodedata
import xml.etree.ElementTree as ET


DRAWIO_COMMIT = "a1f615b7f5a5237da71de2ce2f057b5fa70b0aeb"
DRAWIO_REPOSITORY = "https://github.com/jgraph/drawio"
CATALOG_VERSION = "local-v1"

CATEGORY_LABELS = {
    "agitators": "Agitadores",
    "apparatus_elements": "Elementos de aparelhos",
    "centrifuges": "Centrífugas",
    "compressors": "Compressores",
    "compressors_iso": "Compressores ISO",
    "crushers_grinding": "Britagem e moagem",
    "driers": "Secadores",
    "engines": "Motores e acionamentos",
    "feeders": "Alimentadores",
    "filters": "Filtros",
    "fittings": "Conexões e acessórios",
    "flow_sensors": "Sensores de vazão",
    "heat_exchangers": "Trocadores de calor",
    "instruments": "Instrumentação",
    "misc": "Equipamentos diversos",
    "mixers": "Misturadores",
    "piping": "Tubulações e acessórios",
    "pumps": "Bombas",
    "pumps_din": "Bombas DIN",
    "pumps_iso": "Bombas ISO",
    "separators": "Separadores",
    "shaping_machines": "Máquinas de conformação",
    "valves": "Válvulas",
    "vessels": "Vasos e tanques",
}

FALLBACK_PORTS = (
    ("n", 0.5, 0.0),
    ("e", 1.0, 0.5),
    ("s", 0.5, 1.0),
    ("w", 0.0, 0.5),
)


@dataclass(frozen=True)
class PaintState:
    fill: str = "#ffffff"
    stroke: str = "currentColor"
    stroke_width: float = 1.0
    dashed: bool = False
    dash_pattern: str = "3 3"
    line_join: str = "round"
    line_cap: str = "round"
    font_size: float = 12.0
    font_color: str = "currentColor"


def slugify(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug or "symbol"


def import_drawio_catalog(source_root: Path, frontend_root: Path) -> list[dict[str, object]]:
    """Generates the bundled manifest and SVG assets from a Draw.io checkout."""
    stencil_root = source_root / "src/main/webapp/stencils/pid"
    if not stencil_root.is_dir():
        raise ValueError(f"Draw.io stencil directory not found: {stencil_root}")

    asset_root = frontend_root / "public/pid/symbols"
    manifest_path = frontend_root / "src/features/pid/catalog/generated/drawio-catalog.json"
    asset_root.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    for stale in asset_root.glob("drawio-*.svg"):
        if not stale.name.startswith("drawio-pid2-"):
            stale.unlink()

    symbols: list[dict[str, object]] = []
    used_keys: set[str] = set()
    for xml_path in sorted(stencil_root.glob("*.xml")):
        category_key = xml_path.stem
        root = ET.parse(xml_path).getroot()
        for shape in root.findall("shape"):
            symbol = _catalog_symbol(shape, category_key, used_keys)
            used_keys.add(str(symbol["key"]))
            asset_path = asset_root / Path(str(symbol["assetUrl"])).name
            asset_path.write_text(render_shape_svg(shape), encoding="utf-8")
            symbols.append(symbol)

    symbols.sort(key=lambda symbol: str(symbol["key"]))
    manifest_path.write_text(
        json.dumps(symbols, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    license_source = source_root / "LICENSE"
    if license_source.is_file():
        (asset_root / "DRAWIO-LICENSE.txt").write_text(
            license_source.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    return symbols


def _catalog_symbol(shape: ET.Element, category_key: str, used_keys: set[str]) -> dict[str, object]:
    name = shape.attrib["name"].strip()
    name_slug = slugify(name)
    key = f"drawio.pid.{slugify(category_key)}.{name_slug}"
    suffix = 2
    while key in used_keys:
        key = f"drawio.pid.{slugify(category_key)}.{name_slug}-{suffix}"
        suffix += 1
    width = _positive_number(shape.attrib.get("w"), "shape width")
    height = _positive_number(shape.attrib.get("h"), "shape height")
    default_width, default_height = _default_size(width, height)
    constraints = shape.findall("./connections/constraint")
    raw_ports = [
        (
            constraint.attrib.get("name", f"port-{index + 1}"),
            _normalized_number(constraint.attrib.get("x"), "constraint x"),
            _normalized_number(constraint.attrib.get("y"), "constraint y"),
        )
        for index, constraint in enumerate(constraints)
    ] or list(FALLBACK_PORTS)
    connection_class = "signal" if category_key == "instruments" else "process"
    ports = []
    used_port_keys: set[str] = set()
    for index, (port_name, x, y) in enumerate(raw_ports):
        port_key = slugify(port_name)
        if port_key in used_port_keys:
            port_key = f"{port_key}-{index + 1}"
        used_port_keys.add(port_key)
        ports.append({
            "key": port_key,
            "direction": "bidirectional",
            "connectionClass": connection_class,
            "capacity": 8,
            "anchor": {"x": x, "y": y},
        })
    standards = ["free"]
    filename = f"drawio-{slugify(category_key)}-{name_slug}.svg"
    aliases = list(dict.fromkeys([name.lower(), name_slug.replace("-", " "), category_key.replace("_", " ")]))
    return {
        "key": key,
        "name": name,
        "aliases": aliases,
        "category": CATEGORY_LABELS.get(category_key, category_key.replace("_", " ").title()),
        "assetUrl": f"/pid/symbols/{filename}",
        "viewBox": f"0 0 {_number(width)} {_number(height)}",
        "defaultSize": {"width": default_width, "height": default_height},
        "portTemplates": ports,
        "standards": standards,
        "catalogVersion": CATALOG_VERSION,
        "source": {
            "sourceKind": "drawio",
            "sourceName": "Draw.io P&ID",
            "license": {
                "name": "Apache-2.0",
                "reference": f"{DRAWIO_REPOSITORY}/blob/{DRAWIO_COMMIT}/LICENSE",
            },
            "attribution": f"Draw.io P&ID stencil, commit {DRAWIO_COMMIT}.",
        },
    }


def _default_size(width: float, height: float) -> tuple[float, float]:
    scale = min(1.0, 120.0 / max(width, height))
    scaled_width = width * scale
    scaled_height = height * scale
    if min(scaled_width, scaled_height) < 40:
        scale *= 40 / min(scaled_width, scaled_height)
    return round(width * scale, 6), round(height * scale, 6)


def render_shape_svg(shape: ET.Element) -> str:
    width = _positive_number(shape.attrib.get("w"), "shape width")
    height = _positive_number(shape.attrib.get("h"), "shape height")
    rendered: list[str] = []
    state = PaintState(stroke_width=_stencil_stroke_width(shape.attrib.get("strokewidth")))
    stack: list[PaintState] = []
    for section_name in ("background", "foreground"):
        section = shape.find(section_name)
        if section is not None:
            state = _render_children(section, state, stack, rendered, width, height)
    body = "".join(rendered)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {_number(width)} {_number(height)}">{body}</svg>\n'
    )


def _render_children(
    parent: ET.Element,
    state: PaintState,
    stack: list[PaintState],
    rendered: list[str],
    shape_width: float,
    shape_height: float,
) -> PaintState:
    pending: list[str] = []
    for element in parent:
        tag = element.tag
        if tag == "path":
            pending.append(f'<path d="{_path_data(element)}"')
        elif tag == "ellipse":
            pending.append(
                f'<ellipse cx="{_number(_number_attr(element, "x") + _number_attr(element, "w") / 2)}" '
                f'cy="{_number(_number_attr(element, "y") + _number_attr(element, "h") / 2)}" '
                f'rx="{_number(_number_attr(element, "w") / 2)}" ry="{_number(_number_attr(element, "h") / 2)}"'
            )
        elif tag == "rect":
            x = _number_attr(element, "x", 0)
            y = _number_attr(element, "y", 0)
            width = _number_attr(element, "w", shape_width)
            height = _number_attr(element, "h", shape_height)
            pending.append(
                f'<rect x="{_number(x)}" y="{_number(y)}" '
                f'width="{_number(width)}" height="{_number(height)}"'
            )
        elif tag in {"fillstroke", "stroke", "fill"}:
            _paint_pending(pending, rendered, state, tag)
        elif tag == "fillcolor":
            state = replace(state, fill=_paint_color(element.attrib.get("color"), "none"))
        elif tag == "fontcolor":
            state = replace(state, font_color=_paint_color(element.attrib.get("color"), "currentColor"))
        elif tag == "fontsize":
            state = replace(state, font_size=_positive_number(element.attrib.get("size"), "font size"))
        elif tag == "strokewidth":
            state = replace(state, stroke_width=_positive_number(element.attrib.get("width"), "stroke width"))
        elif tag == "dashed":
            state = replace(state, dashed=element.attrib.get("dashed") == "1")
        elif tag == "dashpattern":
            state = replace(state, dash_pattern=_safe_number_list(element.attrib.get("pattern", "3 3")))
        elif tag == "linejoin":
            state = replace(state, line_join=_enum(element.attrib.get("join"), {"round", "miter", "bevel"}, "round"))
        elif tag == "linecap":
            state = replace(state, line_cap=_enum(element.attrib.get("cap"), {"round", "butt", "square"}, "round"))
        elif tag == "save":
            stack.append(state)
        elif tag == "restore":
            if not stack:
                raise ValueError("Draw.io stencil restore without save")
            state = stack.pop()
        elif tag == "text":
            rendered.append(_render_text(element, state))
        elif tag == "miterlimit":
            continue
        else:
            raise ValueError(f"Unsupported Draw.io stencil element: {tag}")
    if pending:
        _paint_pending(pending, rendered, state, "stroke")
    return state


def _paint_pending(pending: list[str], rendered: list[str], state: PaintState, mode: str) -> None:
    fill = state.fill if mode in {"fill", "fillstroke"} else "none"
    stroke = state.stroke if mode in {"stroke", "fillstroke"} else "none"
    dash = f' stroke-dasharray="{state.dash_pattern}"' if state.dashed and stroke != "none" else ""
    style = (
        f' fill="{fill}" stroke="{stroke}" stroke-width="{_number(state.stroke_width)}"'
        f' stroke-linejoin="{state.line_join}" stroke-linecap="{state.line_cap}"{dash}/>'
    )
    rendered.extend(item + style for item in pending)
    pending.clear()


def _path_data(path: ET.Element) -> str:
    commands: list[str] = []
    for command in path:
        if command.tag == "move":
            commands.append(f'M {_number_attr_text(command, "x")} {_number_attr_text(command, "y")}')
        elif command.tag == "line":
            commands.append(f'L {_number_attr_text(command, "x")} {_number_attr_text(command, "y")}')
        elif command.tag == "arc":
            commands.append(
                f'A {_number_attr_text(command, "rx")} {_number_attr_text(command, "ry")} '
                f'{_number_attr_text(command, "x-axis-rotation")} {int(_number_attr(command, "large-arc-flag"))} '
                f'{int(_number_attr(command, "sweep-flag"))} {_number_attr_text(command, "x")} {_number_attr_text(command, "y")}'
            )
        elif command.tag == "curve":
            commands.append(
                f'C {_number_attr_text(command, "x1")} {_number_attr_text(command, "y1")} '
                f'{_number_attr_text(command, "x2")} {_number_attr_text(command, "y2")} '
                f'{_number_attr_text(command, "x3")} {_number_attr_text(command, "y3")}'
            )
        elif command.tag == "close":
            commands.append("Z")
        else:
            raise ValueError(f"Unsupported Draw.io path command: {command.tag}")
    return " ".join(commands)


def _render_text(element: ET.Element, state: PaintState) -> str:
    align = {"left": "start", "center": "middle", "right": "end"}.get(element.attrib.get("align"), "middle")
    baseline = {"top": "hanging", "middle": "middle", "bottom": "auto"}.get(element.attrib.get("valign"), "auto")
    return (
        f'<text x="{_number_attr_text(element, "x")}" y="{_number_attr_text(element, "y")}" '
        f'fill="{state.font_color}" font-size="{_number(state.font_size)}" text-anchor="{align}" '
        f'dominant-baseline="{baseline}">{escape(element.attrib.get("str", ""))}</text>'
    )


def _number_attr(element: ET.Element, name: str, default: float | None = None) -> float:
    value = element.attrib.get(name)
    if value is None:
        if default is not None:
            return default
        raise ValueError(f"Missing Draw.io numeric attribute: {element.tag}.{name}")
    try:
        return float(value)
    except ValueError as error:
        raise ValueError(f"Invalid Draw.io numeric attribute: {element.tag}.{name}") from error


def _number_attr_text(element: ET.Element, name: str) -> str:
    return _number(_number_attr(element, name))


def _positive_number(value: str | None, label: str) -> float:
    try:
        number = float(value or "")
    except ValueError as error:
        raise ValueError(f"Invalid {label}") from error
    if number <= 0:
        raise ValueError(f"Invalid {label}")
    return number


def _normalized_number(value: str | None, label: str) -> float:
    try:
        number = float(value or "")
    except ValueError as error:
        raise ValueError(f"Invalid {label}") from error
    if number < 0 or number > 1:
        raise ValueError(f"Invalid {label}")
    return number


def _stencil_stroke_width(value: str | None) -> float:
    if value in {None, "inherit"}:
        return 1.0
    return _positive_number(value, "stroke width")


def _paint_color(value: str | None, fallback: str) -> str:
    if value is None:
        return fallback
    if value == "stroke":
        return "currentColor"
    if value == "none" or re.fullmatch(r"#[0-9a-fA-F]{3,8}", value):
        return value
    raise ValueError(f"Unsupported Draw.io paint color: {value}")


def _safe_number_list(value: str) -> str:
    if not re.fullmatch(r"[-+0-9.eE, ]+", value):
        raise ValueError("Invalid Draw.io dash pattern")
    return " ".join(value.replace(",", " ").split())


def _enum(value: str | None, allowed: set[str], fallback: str) -> str:
    return value if value in allowed else fallback


def _number(value: float) -> str:
    rounded = round(value, 6)
    return str(int(rounded)) if rounded.is_integer() else str(rounded)
