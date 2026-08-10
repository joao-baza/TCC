"""Connection manager for P&ID WebSocket rooms with Redis pub/sub relay."""

import asyncio
import json
from uuid import UUID

from redis.asyncio import Redis
from fastapi import WebSocket

REDIS_CHANNEL_PREFIX = "pid:ws:"


class ConnectionManager:
    def __init__(self, redis: Redis) -> None:
        self._redis = redis
        self._rooms: dict[UUID, set[WebSocket]] = {}
        self._pubsub = None
        self._listener_task: asyncio.Task | None = None

    async def start(self) -> None:
        self._pubsub = self._redis.pubsub()
        self._listener_task = asyncio.create_task(self._listen())

    async def stop(self) -> None:
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._pubsub:
            await self._pubsub.close()
        self._rooms.clear()

    async def connect(self, diagram_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        room = self._rooms.setdefault(diagram_id, set())
        room.add(websocket)
        if self._pubsub is not None and len(room) == 1:
            await self._pubsub.subscribe(self._channel(diagram_id))

    def disconnect(self, diagram_id: UUID, websocket: WebSocket) -> None:
        room = self._rooms.get(diagram_id)
        if room is None:
            return
        room.discard(websocket)
        if not room:
            del self._rooms[diagram_id]

    async def broadcast_local(
        self, diagram_id: UUID, message: bytes, *, exclude: WebSocket | None = None
    ) -> None:
        room = self._rooms.get(diagram_id, set())
        for ws in list(room):
            if ws is exclude:
                continue
            try:
                await ws.send_bytes(message)
            except Exception:
                self.disconnect(diagram_id, ws)

    async def publish(self, diagram_id: UUID, message: bytes) -> None:
        payload = json.dumps({
            "diagram_id": str(diagram_id),
            "data": message.hex(),
        })
        await self._redis.publish(self._channel(diagram_id), payload)

    async def _listen(self) -> None:
        if self._pubsub is None:
            return
        while True:
            raw = await self._pubsub.get_message(
                ignore_subscribe_messages=True, timeout=1.0
            )
            if raw is None:
                continue
            try:
                payload = json.loads(raw["data"])
                diagram_id = UUID(payload["diagram_id"])
                data = bytes.fromhex(payload["data"])
                await self.broadcast_local(diagram_id, data)
            except Exception:
                continue

    @staticmethod
    def _channel(diagram_id: UUID) -> str:
        return f"{REDIS_CHANNEL_PREFIX}{diagram_id}"
