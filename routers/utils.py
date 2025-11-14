from typing import Any
from pint import Quantity


def serialize(obj: Any) -> Any:
    """Recursively convert pint.Quantity into JSON‑serialisable structures."""
    if Quantity is not None and isinstance(obj, Quantity):
        return {"value": obj.magnitude, "units": str(obj.units)}
    if isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize(i) for i in obj]
    return obj

