#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v git-filter-repo >/dev/null 2>&1 && ! git filter-repo --help >/dev/null 2>&1; then
  echo "[error] git-filter-repo is required."
  echo "[hint] install: pip install git-filter-repo"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "[error] working tree is not clean."
  echo "Commit or stash changes before rewriting history."
  exit 1
fi

echo "[warn] this operation rewrites git history."
echo "[warn] all commit hashes will change."
echo "[warn] collaborators must re-clone after force-push."
echo "[warn] rotate any credentials that may have ever existed in history."

git filter-repo \
  --force \
  --invert-paths \
  --path .runlogs \
  --path .firebase \
  --path frontend/.vite \
  --path ui/.vite \
  --path _reactflow_examples \
  --path "Screenshot 2026-03-06 at 16.46.48.png" \
  --path "Screenshot 2026-03-06 at 16.47.03.png" \
  --path TEST0001.m4a \
  --path TEST0002.m4a \
  --path .firebaserc \
  --path firebase.json \
  --path AGENTS.md

echo "[ok] history rewrite complete."
echo "[next] run: git push --force --all && git push --force --tags"
