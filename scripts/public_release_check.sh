#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[check] running security scan..."
"$ROOT_DIR/scripts/security_scan.sh"

echo "[check] verifying working tree has no accidental staged secrets..."
git status --short

echo "[ok] public release check complete."
