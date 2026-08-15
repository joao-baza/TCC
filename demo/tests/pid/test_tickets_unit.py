import json
from uuid import uuid4

import pytest

from pid.models import AccessScope
from pid.tickets import TicketPayload, TicketStore


class ByteRedisStub:
    """Minimal Redis contract matching the production client's byte responses."""

    def __init__(self) -> None:
        self.values: dict[str, bytes] = {}
        self.set_calls: list[tuple[str, int, bool]] = []

    async def set(
        self,
        key: str,
        value: str,
        *,
        ex: int,
        nx: bool,
    ) -> bool:
        self.set_calls.append((key, ex, nx))
        if nx and key in self.values:
            return False
        self.values[key] = value.encode("utf-8")
        return True

    async def getdel(self, key: str) -> bytes | None:
        return self.values.pop(key, None)


async def test_ticket_round_trip_accepts_production_redis_byte_payloads() -> None:
    redis = ByteRedisStub()
    store = TicketStore(redis, ttl_seconds=45)  # type: ignore[arg-type]
    payload = TicketPayload(uuid4(), uuid4(), AccessScope.EDIT)

    ticket = await store.issue(payload)

    assert len(redis.values) == 1
    key, raw_payload = next(iter(redis.values.items()))
    assert key.startswith("pid:ticket:")
    assert ticket not in key
    assert ticket.encode() not in raw_payload
    assert json.loads(raw_payload) == {
        "diagram_id": str(payload.diagram_id),
        "token_id": str(payload.token_id),
        "scope": "edit",
    }
    assert redis.set_calls == [(key, 45, True)]
    assert await store.consume(ticket) == payload
    assert await store.consume(ticket) is None


async def test_ticket_collision_does_not_replace_existing_byte_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from pid import tickets

    monkeypatch.setattr(tickets, "generate_secret", lambda: "fixed-ticket")
    redis = ByteRedisStub()
    store = TicketStore(redis)  # type: ignore[arg-type]
    original = TicketPayload(uuid4(), uuid4(), AccessScope.VIEW)

    await store.issue(original)
    with pytest.raises(RuntimeError, match="Ticket collision"):
        await store.issue(TicketPayload(uuid4(), uuid4(), AccessScope.EDIT))

    assert await store.consume("fixed-ticket") == original


async def test_corrupt_byte_payload_is_consumed_before_validation_failure() -> None:
    redis = ByteRedisStub()
    store = TicketStore(redis)  # type: ignore[arg-type]
    ticket = "corrupt-ticket"
    key = store._key(ticket)
    redis.values[key] = b"not-json"

    with pytest.raises(json.JSONDecodeError):
        await store.consume(ticket)

    assert key not in redis.values
    assert await store.consume(ticket) is None
