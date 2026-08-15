import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from pid.models import AccessScope
from pid.tickets import TicketPayload
from pid.ws.handler import pid_websocket_handler
from pid.ws.manager import ConnectionManager


@pytest.mark.asyncio
async def test_handler_closes_with_4003_on_invalid_ticket():
    diagram_id = uuid4()
    ws = AsyncMock()
    ws.app.state.pid_ws_manager = MagicMock(spec=ConnectionManager)
    ws.app.state.pid_runtime = MagicMock()

    mock_redis = MagicMock()
    ws.app.state.pid_runtime.redis = mock_redis

    with patch("pid.ws.handler.TicketStore") as MockStore:
        mock_store = AsyncMock()
        mock_store.consume.return_value = None
        MockStore.return_value = mock_store

        await pid_websocket_handler(ws, diagram_id, ticket="bad-ticket")

    ws.close.assert_awaited_once()
    call_args = ws.close.call_args
    assert call_args.kwargs.get("code") == 4003


@pytest.mark.asyncio
async def test_handler_closes_with_4003_on_diagram_mismatch():
    diagram_id = uuid4()
    ws = AsyncMock()
    ws.app.state.pid_ws_manager = MagicMock(spec=ConnectionManager)
    ws.app.state.pid_runtime = MagicMock()
    ws.app.state.pid_runtime.redis = MagicMock()

    wrong_payload = TicketPayload(diagram_id=uuid4(), token_id=uuid4(), scope=AccessScope.EDIT)

    with patch("pid.ws.handler.TicketStore") as MockStore:
        mock_store = AsyncMock()
        mock_store.consume.return_value = wrong_payload
        MockStore.return_value = mock_store

        await pid_websocket_handler(ws, diagram_id, ticket="valid-but-wrong-diagram")

    ws.close.assert_awaited_once()
    assert ws.close.call_args.kwargs.get("code") == 4003


@pytest.mark.asyncio
async def test_handler_closes_1011_when_manager_is_none():
    diagram_id = uuid4()
    ws = AsyncMock()
    ws.app.state.pid_ws_manager = None
    ws.app.state.pid_runtime = MagicMock()

    await pid_websocket_handler(ws, diagram_id, ticket="any")

    ws.close.assert_awaited_once()
    assert ws.close.call_args.kwargs.get("code") == 1011


@pytest.mark.asyncio
async def test_handler_connects_and_relays_for_edit_scope():
    diagram_id = uuid4()
    ws = AsyncMock()
    manager = MagicMock(spec=ConnectionManager)
    manager.connect = AsyncMock()
    manager.broadcast_local = AsyncMock()
    manager.publish = AsyncMock()
    manager.disconnect = MagicMock()
    ws.app.state.pid_ws_manager = manager
    ws.app.state.pid_runtime = MagicMock()
    ws.app.state.pid_runtime.redis = MagicMock()

    payload = TicketPayload(diagram_id=diagram_id, token_id=uuid4(), scope=AccessScope.EDIT)

    receive_count = 0

    async def receive_bytes():
        nonlocal receive_count
        receive_count += 1
        if receive_count == 1:
            return b"yjs-update-1"
        if receive_count == 2:
            return b"yjs-update-2"
        from fastapi import WebSocketDisconnect
        raise WebSocketDisconnect(code=1000)

    ws.receive_bytes = receive_bytes

    with patch("pid.ws.handler.TicketStore") as MockStore:
        mock_store = AsyncMock()
        mock_store.consume.return_value = payload
        MockStore.return_value = mock_store

        await pid_websocket_handler(ws, diagram_id, ticket="valid")

    manager.connect.assert_awaited_once_with(diagram_id, ws)
    assert manager.broadcast_local.await_count == 2
    assert manager.publish.await_count == 2
    manager.disconnect.assert_called_once_with(diagram_id, ws)


@pytest.mark.asyncio
async def test_handler_read_only_does_not_send():
    diagram_id = uuid4()
    ws = AsyncMock()
    manager = MagicMock(spec=ConnectionManager)
    manager.connect = AsyncMock()
    manager.broadcast_local = AsyncMock()
    manager.publish = AsyncMock()
    manager.disconnect = MagicMock()
    ws.app.state.pid_ws_manager = manager
    ws.app.state.pid_runtime = MagicMock()
    ws.app.state.pid_runtime.redis = MagicMock()

    payload = TicketPayload(diagram_id=diagram_id, token_id=uuid4(), scope=AccessScope.VIEW)

    async def receive_bytes():
        raise RuntimeError("should never be called for view scope")

    ws.receive_bytes = receive_bytes

    with patch("pid.ws.handler.TicketStore") as MockStore:
        with patch("pid.ws.handler.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            mock_sleep.side_effect = [None, None, Exception("stop")]
            mock_store = AsyncMock()
            mock_store.consume.return_value = payload
            MockStore.return_value = mock_store

            try:
                await pid_websocket_handler(ws, diagram_id, ticket="valid")
            except Exception:
                pass

    manager.broadcast_local.assert_not_awaited()
    manager.publish.assert_not_awaited()
    manager.disconnect.assert_called_once_with(diagram_id, ws)
