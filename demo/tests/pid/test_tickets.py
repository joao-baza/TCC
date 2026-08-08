import json
import os
from uuid import uuid4

import pytest
import pytest_asyncio
from redis.asyncio import Redis
from redis.exceptions import RedisError

from pid.models import AccessScope
from pid.tickets import TicketPayload, TicketStore


@pytest_asyncio.fixture
async def redis_client() -> Redis:
    redis_url = os.getenv("PID_TEST_REDIS_URL")
    if not redis_url:
        pytest.skip("PID_TEST_REDIS_URL is required for Redis integration tests")

    client = Redis.from_url(redis_url, decode_responses=True)
    redis_is_available = False
    try:
        try:
            await client.ping()
        except RedisError as exc:
            pytest.skip(f"Redis integration service is unavailable: {exc}")
        redis_is_available = True
        await client.flushdb()
        yield client
    finally:
        try:
            if redis_is_available:
                await client.flushdb()
        finally:
            await client.aclose()


def test_ticket_store_requires_a_positive_ttl() -> None:
    with pytest.raises(ValueError, match="ttl_seconds must be greater than zero"):
        TicketStore(object(), ttl_seconds=0)  # type: ignore[arg-type]


async def test_ticket_can_be_consumed_exactly_once(
    redis_client: Redis,
) -> None:
    ttl_seconds = 60
    store = TicketStore(redis_client, ttl_seconds=ttl_seconds)
    payload = TicketPayload(
        diagram_id=uuid4(),
        token_id=uuid4(),
        scope=AccessScope.EDIT,
    )

    ticket = await store.issue(payload)
    keys = await redis_client.keys("pid:ticket:*")

    assert len(keys) == 1
    assert ticket not in keys[0]
    raw_payload = await redis_client.get(keys[0])
    assert raw_payload is not None
    assert ticket not in raw_payload
    assert json.loads(raw_payload) == {
        "diagram_id": str(payload.diagram_id),
        "token_id": str(payload.token_id),
        "scope": "edit",
    }
    assert 0 < await redis_client.ttl(keys[0]) <= ttl_seconds

    assert await store.consume(ticket) == payload
    assert await store.consume(ticket) is None
    assert await redis_client.keys("pid:ticket:*") == []


async def test_ticket_collision_keeps_the_original_payload(
    redis_client: Redis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from pid import tickets

    monkeypatch.setattr(tickets, "generate_secret", lambda: "repeated-secret")
    store = TicketStore(redis_client)
    original = TicketPayload(uuid4(), uuid4(), AccessScope.VIEW)

    ticket = await store.issue(original)

    with pytest.raises(RuntimeError, match="Ticket collision"):
        await store.issue(TicketPayload(uuid4(), uuid4(), AccessScope.EDIT))

    assert await store.consume(ticket) == original


async def test_malformed_payload_is_deleted_and_reported(
    redis_client: Redis,
) -> None:
    store = TicketStore(redis_client)
    ticket = "malformed-ticket"
    await redis_client.set(store._key(ticket), "not-json", ex=60)

    with pytest.raises(json.JSONDecodeError):
        await store.consume(ticket)

    assert await redis_client.exists(store._key(ticket)) == 0
