#!/bin/sh
set -eu

pid_enabled="$(
  printf '%s' "${PID_ENABLED:-}" \
    | LC_ALL=C sed 's/^[[:space:]]*//;s/[[:space:]]*$//' \
    | LC_ALL=C tr '[:upper:]' '[:lower:]'
)"

case "$pid_enabled" in
  1|true|yes|on)
    alembic upgrade head
    ;;
  ""|0|false|no|off)
    ;;
  *)
    echo "PID_ENABLED must be a recognized boolean value." >&2
    exit 1
    ;;
esac

exec uvicorn app:app --host 0.0.0.0 --port 5000
