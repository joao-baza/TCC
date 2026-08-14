import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from pid.models import AccessScope
from routers.pid import create_ws_ticket, WsTicketRequest


@pytest.mark.asyncio
async def test_ws_ticket_returns_ticket_on_valid_token():
    diagram_id = uuid4()
    body = WsTicketRequest(token="valid-edit-token")

    mock_request = MagicMock()
    mock_service = MagicMock()
    mock_service.authorize = AsyncMock(return_value=AccessScope.EDIT)
    mock_redis = MagicMock()

    mock_runtime = MagicMock()
    mock_runtime.redis = mock_redis
    mock_request.app.state.pid_runtime = mock_runtime

    with (
        patch("routers.pid._service", return_value=mock_service),
        patch("pid.tickets.TicketStore") as MockStore,
    ):
        mock_store = AsyncMock()
        mock_store.issue.return_value = "ticket-abc123"
        MockStore.return_value = mock_store

        response = await create_ws_ticket(diagram_id, body, mock_request)

    assert response.ticket == "ticket-abc123"
    mock_service.authorize.assert_awaited_once_with(diagram_id, "valid-edit-token")


@pytest.mark.asyncio
async def test_ws_ticket_returns_403_on_invalid_token():
    from fastapi import HTTPException

    diagram_id = uuid4()
    body = WsTicketRequest(token="bad-token")

    mock_request = MagicMock()
    mock_service = MagicMock()
    mock_service.authorize = AsyncMock(return_value=None)

    with patch("routers.pid._service", return_value=mock_service):
        with pytest.raises(HTTPException) as exc:
            await create_ws_ticket(diagram_id, body, mock_request)

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_ws_ticket_returns_503_when_pid_not_configured():
    from fastapi import HTTPException

    diagram_id = uuid4()
    body = WsTicketRequest(token="any-token")

    mock_request = MagicMock()
    mock_service = MagicMock()
    mock_service.authorize = AsyncMock(return_value=AccessScope.EDIT)
    mock_request.app.state.pid_runtime = None

    with patch("routers.pid._service", return_value=mock_service):
        with pytest.raises(HTTPException) as exc:
            await create_ws_ticket(diagram_id, body, mock_request)

    assert exc.value.status_code == 503
