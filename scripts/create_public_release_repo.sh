#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <target-dir>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$1"

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "[error] working tree is not clean."
  echo "Commit or stash changes first so the snapshot is deterministic."
  exit 1
fi

"$ROOT_DIR/scripts/security_scan.sh"

if [[ -e "$TARGET_DIR" ]]; then
  echo "[error] target path already exists: $TARGET_DIR"
  exit 1
fi

mkdir -p "$TARGET_DIR"
git archive --format=tar HEAD | tar -x -C "$TARGET_DIR"

(
  cd "$TARGET_DIR"
  git init -b main
  git add .
  git commit -m "Initial public release: DeepNoise Flow showcase"
)

echo "[ok] created clean public repository at: $TARGET_DIR"
