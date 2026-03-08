#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/.runlogs"
MODE="${1:-demo}"

API_HOST="${DEEPNOISE_API_HOST:-127.0.0.1}"
API_PORT="${DEEPNOISE_API_PORT:-8000}"
UI_HOST="${DEEPNOISE_UI_HOST:-127.0.0.1}"
UI_PORT="${DEEPNOISE_UI_PORT:-5173}"
DEMO_PORT="${DEEPNOISE_DEMO_PORT:-8080}"

if [[ "$MODE" != "core" && "$MODE" != "demo" ]]; then
  echo "Usage: ./run.sh [core|demo]"
  exit 1
fi

mkdir -p "$LOG_DIR"

kill_port() {
  local port="$1"
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi
  local pids
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill -9 >/dev/null 2>&1 || true
  fi
}

cleanup_logs() {
  rm -f "$LOG_DIR"/*.log "$LOG_DIR"/*.pid 2>/dev/null || true
}

clean_temp_dirs() {
  mkdir -p "$ROOT/tmp" "$ROOT/temp"
  rm -rf "$ROOT/tmp"/* "$ROOT/temp"/* 2>/dev/null || true
}

resolve_python() {
  if [[ -x "$ROOT/.venv/bin/python" ]]; then
    echo "$ROOT/.venv/bin/python"
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    echo "$(command -v python3)"
    return 0
  fi
  if command -v python >/dev/null 2>&1; then
    echo "$(command -v python)"
    return 0
  fi
  echo ""
}

require_python_modules() {
  if ! "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
import fastapi
import uvicorn
PY
  then
    echo "Missing Python dependencies for API server."
    echo "Create .venv and install requirements:"
    echo "  python -m venv .venv"
    echo "  source .venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
  fi
}

PYTHON_BIN="$(resolve_python)"
if [[ -z "$PYTHON_BIN" ]]; then
  echo "Python not found. Install Python 3 and optional .venv dependencies first."
  exit 1
fi
require_python_modules

echo "Stopping previous instances..."
kill_port "$API_PORT"
kill_port "$UI_PORT"
kill_port "$DEMO_PORT"
cleanup_logs
clean_temp_dirs

echo "Starting core API on $API_HOST:$API_PORT..."
PYTHONPATH="$ROOT/core/src" "$PYTHON_BIN" -m uvicorn core.api_server:app --host "$API_HOST" --port "$API_PORT" \
  > "$LOG_DIR/api.log" 2>&1 &
echo $! > "$LOG_DIR/api.pid"

sleep 1
if ! kill -0 "$(cat "$LOG_DIR/api.pid")" >/dev/null 2>&1; then
  echo "API failed to start. See log: $LOG_DIR/api.log"
  exit 1
fi

if [[ "$MODE" == "demo" ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required for demo mode."
    exit 1
  fi

  if [[ ! -d "$ROOT/ui/node_modules" ]]; then
    echo "Installing UI dependencies..."
    (cd "$ROOT/ui" && npm install)
  fi

  echo "Starting UI on $UI_HOST:$UI_PORT..."
  (
    cd "$ROOT/ui"
    VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://$API_HOST:$API_PORT}" \
      npm run dev -- --host "$UI_HOST" --port "$UI_PORT" \
      > "$LOG_DIR/ui.log" 2>&1 &
    echo $! > "$LOG_DIR/ui.pid"
  )

  echo "Starting showcase demo server on 127.0.0.1:$DEMO_PORT..."
  (
    cd "$ROOT/demo"
    "$PYTHON_BIN" -m http.server "$DEMO_PORT" > "$LOG_DIR/demo.log" 2>&1 &
    echo $! > "$LOG_DIR/demo.pid"
  )
fi

echo ""
echo "Mode: $MODE"
echo "API:  http://$API_HOST:$API_PORT"
if [[ "$MODE" == "demo" ]]; then
  echo "UI:   http://$UI_HOST:$UI_PORT"
  echo "Demo: http://127.0.0.1:$DEMO_PORT"
fi
echo "Logs: $LOG_DIR"
