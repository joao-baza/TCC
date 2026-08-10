import asyncio
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect, Query
from pid.tickets import TicketStore


async def pid_websocket_handler(
    websocket: WebSocket,
    diagram_id: UUID,
    ticket: str = Query(...),
) -> None:
    manager = websocket.app.state.pid_ws_manager
    runtime = websocket.app.state.pid_runtime
    if manager is None or runtime is None:
        await websocket.close(code=1011)
        return

    store = TicketStore(runtime.redis)
    payload = await store.consume(ticket)
    if payload is None or payload.diagram_id != diagram_id:
        await websocket.close(code=4003)
        return

    read_only = payload.scope.value == "view"
    await manager.connect(diagram_id, websocket)

    try:
        while True:
            if read_only:
                await asyncio.sleep(0.5)
                continue
            data = await websocket.receive_bytes()
            await manager.broadcast_local(diagram_id, data, exclude=websocket)
            await manager.publish(diagram_id, data)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        manager.disconnect(diagram_id, websocket)
