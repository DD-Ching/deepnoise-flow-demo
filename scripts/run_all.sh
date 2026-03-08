#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[compat] scripts/run_all.sh is deprecated. Use ./run.sh demo"
exec "$ROOT/run.sh" demo
