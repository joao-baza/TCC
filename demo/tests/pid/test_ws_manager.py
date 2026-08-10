import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from pid.ws.manager import ConnectionManager


@pytest.mark.asyncio
async def test_connect_adds_websocket_to_room():
    redis = MagicMock()
    redis.pubsub.return_value = AsyncMock()
    manager = ConnectionManager(redis)
    manager._pubsub = AsyncMock()
    manager._pubsub.subscribe = AsyncMock()

    ws = AsyncMock()
    diagram_id = uuid4()

    await manager.connect(diagram_id, ws)
    assert diagram_id in manager._rooms
    assert ws in manager._rooms[diagram_id]
    ws.accept.assert_awaited_once()


@pytest.mark.asyncio
async def test_disconnect_removes_empty_room():
    redis = MagicMock()
    manager = ConnectionManager(redis)
    ws = AsyncMock()
    diagram_id = uuid4()
    manager._rooms[diagram_id] = {ws}

    manager.disconnect(diagram_id, ws)
    assert diagram_id not in manager._rooms


@pytest.mark.asyncio
async def test_broadcast_skips_excluded_websocket():
    redis = MagicMock()
    manager = ConnectionManager(redis)
    ws_a = AsyncMock()
    ws_b = AsyncMock()
    diagram_id = uuid4()
    manager._rooms[diagram_id] = {ws_a, ws_b}

    await manager.broadcast_local(diagram_id, b"hello", exclude=ws_a)
    ws_a.send_bytes.assert_not_awaited()
    ws_b.send_bytes.assert_awaited_once_with(b"hello")


@pytest.mark.asyncio
async def test_publish_sends_to_redis():
    redis = MagicMock()
    redis.publish = AsyncMock()
    manager = ConnectionManager(redis)
    diagram_id = uuid4()

    await manager.publish(diagram_id, b"test-data")
    redis.publish.assert_awaited_once()
