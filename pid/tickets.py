from dataclasses import dataclass
import hashlib
import json
from uuid import UUID

from redis.asyncio import Redis

from pid.models import AccessScope
from pid.security import generate_secret


@dataclass(frozen=True)
class TicketPayload:
    diagram_id: UUID
    token_id: UUID
    scope: AccessScope


class TicketStore:
    def __init__(self, redis: Redis, ttl_seconds: int = 60) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be greater than zero")
        self._redis = redis
        self._ttl_seconds = ttl_seconds

    async def issue(self, payload: TicketPayload) -> str:
        ticket = generate_secret()
        stored = {
            "diagram_id": str(payload.diagram_id),
            "token_id": str(payload.token_id),
            "scope": payload.scope.value,
        }
        created = await self._redis.set(
            self._key(ticket),
            json.dumps(stored, separators=(",", ":")),
            ex=self._ttl_seconds,
            nx=True,
        )
        if not created:
            raise RuntimeError("Ticket collision")
        return ticket

    async def consume(self, ticket: str) -> TicketPayload | None:
        raw = await self._redis.getdel(self._key(ticket))
        if raw is None:
            return None
        stored = json.loads(raw)
        return TicketPayload(
            diagram_id=UUID(stored["diagram_id"]),
            token_id=UUID(stored["token_id"]),
            scope=AccessScope(stored["scope"]),
        )

    @staticmethod
    def _key(ticket: str) -> str:
        digest = hashlib.sha256(ticket.encode("utf-8")).hexdigest()
        return f"pid:ticket:{digest}"
