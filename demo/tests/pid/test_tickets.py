import asyncio
import json
import os
from uuid import uuid4

import pytest
import pytest_asyncio
from redis.asyncio import Redis

from pid.models import AccessScope
from pid.tickets import TicketPayload, TicketStore


@pytest_asyncio.fixture
async def redis_client() -> Redis:
    redis_url = os.getenv("PID_TEST_REDIS_URL")
    if not redis_url:
        pytest.skip("PID_TEST_REDIS_URL is required for Redis integration tests")

    client = Redis.from_url(redis_url, decode_responses=True)
    database_was_prepared = False
    try:
        await client.ping()
        await client.flushdb()
        database_was_prepared = True
        yield client
    finally:
        try:
            if database_was_prepared:
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


async def test_concurrent_consumers_receive_a_ticket_exactly_once(
    redis_client: Redis,
) -> None:
    redis_url = os.environ["PID_TEST_REDIS_URL"]
    clients = [
        Redis.from_url(redis_url, decode_responses=True)
        for _ in range(4)
    ]
    store = TicketStore(redis_client)
    payload = TicketPayload(uuid4(), uuid4(), AccessScope.EDIT)
    ticket = await store.issue(payload)
    ready = asyncio.Event()
    ready_count = 0
    ready_lock = asyncio.Lock()

    async def consume_when_ready(client: Redis) -> TicketPayload | None:
        nonlocal ready_count
        async with ready_lock:
            ready_count += 1
            if ready_count == len(clients):
                ready.set()
        await ready.wait()
        return await TicketStore(client).consume(ticket)

    try:
        results = await asyncio.gather(
            *(consume_when_ready(client) for client in clients)
        )
    finally:
        await asyncio.gather(*(client.aclose() for client in clients))

    assert results.count(payload) == 1
    assert results.count(None) == len(clients) - 1
    assert await redis_client.keys("pid:ticket:*") == []


@pytest.mark.parametrize(
    ("raw_payload", "expected_error", "error_match"),
    [
        ("not-json", json.JSONDecodeError, "Expecting value"),
        ("{}", KeyError, "diagram_id"),
        (
            json.dumps(
                {
                    "diagram_id": "not-a-uuid",
                    "token_id": "00000000-0000-0000-0000-000000000002",
                    "scope": "view",
                }
            ),
            ValueError,
            "badly formed hexadecimal UUID string",
        ),
        (
            json.dumps(
                {
                    "diagram_id": "00000000-0000-0000-0000-000000000001",
                    "token_id": "00000000-0000-0000-0000-000000000002",
                    "scope": "owner",
                }
            ),
            ValueError,
            "'owner' is not a valid AccessScope",
        ),
    ],
    ids=("invalid-json", "missing-field", "invalid-uuid", "invalid-scope"),
)
async def test_corrupt_payload_is_deleted_and_reported(
    redis_client: Redis,
    raw_payload: str,
    expected_error: type[BaseException],
    error_match: str,
) -> None:
    store = TicketStore(redis_client)
    ticket = f"corrupt-{uuid4()}"
    await redis_client.set(store._key(ticket), raw_payload, ex=60)

    with pytest.raises(expected_error, match=error_match):
        await store.consume(ticket)

    assert await redis_client.exists(store._key(ticket)) == 0
