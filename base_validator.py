from typing import Dict, Sequence, List

class BaseValidator:
    def _require_keys(self, params: Dict[str, object], keys: Sequence[str]) -> None:
        missing = [k for k in keys if k not in params]
        if missing:
            raise ValueError(f"Missing parameter(s): {', '.join(missing)}")

    def _validate_numeric(self, params: Dict[str, object], keys: Sequence[str]) -> None:
        if not all(isinstance(params[k], (int, float)) for k in keys):
            raise TypeError("All parameters must be numeric (int or float).")