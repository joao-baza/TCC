import os
from dataclasses import dataclass

from dotenv import load_dotenv


TRUE_VALUES = {"1", "true", "yes", "on"}
FALSE_VALUES = {"0", "false", "no", "off"}


def _enabled_from_env(value: str | None) -> bool:
    if value is None:
        return False
    normalized = value.lower()
    if normalized in TRUE_VALUES:
        return True
    if normalized in FALSE_VALUES:
        return False
    raise ValueError("PID_ENABLED must be a recognized boolean value")


def _optional(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


@dataclass(frozen=True)
class PidSettings:
    enabled: bool
    database_url: str | None
    redis_url: str | None
    token_pepper: str | None
    allowed_origins: tuple[str, ...]
    ws_public_url: str | None

    @classmethod
    def from_env(cls, load_file: bool = True) -> "PidSettings":
        if load_file:
            load_dotenv(override=False)

        enabled_value = _optional("PID_ENABLED")
        allowed_origins_value = _optional("PID_ALLOWED_ORIGINS")
        settings = cls(
            enabled=_enabled_from_env(enabled_value),
            database_url=_optional("DATABASE_URL"),
            redis_url=_optional("REDIS_URL"),
            token_pepper=_optional("PID_TOKEN_PEPPER"),
            allowed_origins=tuple(
                origin.strip()
                for origin in (allowed_origins_value or "").split(",")
                if origin.strip()
            ),
            ws_public_url=_optional("PID_WS_PUBLIC_URL"),
        )
        settings.validate()
        return settings

    def validate(self) -> None:
        if not self.enabled:
            return

        missing = []
        if self.database_url is None:
            missing.append("DATABASE_URL")
        if self.redis_url is None:
            missing.append("REDIS_URL")
        if self.token_pepper is None:
            missing.append("PID_TOKEN_PEPPER")
        if not self.allowed_origins:
            missing.append("PID_ALLOWED_ORIGINS")
        if self.ws_public_url is None:
            missing.append("PID_WS_PUBLIC_URL")
        if missing:
            raise ValueError("Missing PID settings: " + ", ".join(missing))
        if len(self.token_pepper or "") < 32:
            raise ValueError("PID_TOKEN_PEPPER must be at least 32 characters")
