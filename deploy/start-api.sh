#!/bin/sh
set -eu

case "${PID_ENABLED:-}" in
  1|[tT][rR][uU][eE]|[yY][eE][sS]|[oO][nN])
    alembic upgrade head
    ;;
esac

exec uvicorn app:app --host 0.0.0.0 --port 5000
