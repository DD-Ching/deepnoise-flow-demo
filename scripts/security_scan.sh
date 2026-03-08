#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "[error] ripgrep (rg) is required."
  exit 1
fi

has_issues=0

report_issue() {
  has_issues=1
  echo "[warn] $1"
}

echo "[scan] scanning tracked paths for forbidden files..."
forbidden_path_matches="$(
  find . -type f \
    \( \
      -name ".env" -o \
      -name ".env.*" -o \
      -name "*.pem" -o \
      -name "*.key" -o \
      -name "*.p12" -o \
      -name "*.crt" -o \
      -name "*.cer" -o \
      -name "*.der" -o \
      -name "*.log" -o \
      -name "*.pid" -o \
      -name "*.ckpt" -o \
      -name "*.pt" -o \
      -name "*.pth" -o \
      -name "*.onnx" \
    \) \
    -not -path "./.git/*" \
    -not -path "./ui/node_modules/*" \
    -not -path "./ui/dist/*" \
    -not -path "./ui/.vite/*" \
    -not -path "./.venv/*" | sed 's|^\./||'
)"
if [[ -n "$forbidden_path_matches" ]]; then
  report_issue "forbidden tracked files found:"
  echo "$forbidden_path_matches"
fi

echo "[scan] scanning tracked content for secret-like patterns..."
secret_matches="$(
  rg -n \
    -e '(?i)(api[_-]?key|access[_-]?token|secret|password|passwd)\s*[:=]\s*["'"'"']?[A-Za-z0-9_\-]{8,}' \
    -e 'AKIA[0-9A-Z]{16}' \
    -e 'sk-[A-Za-z0-9]{20,}' \
    -e 'xox[baprs]-[A-Za-z0-9-]{10,}' \
    -e 'ghp_[A-Za-z0-9]{20,}' \
    -e 'BEGIN [A-Z ]*PRIVATE KEY' \
    --glob '!.git/**' \
    --glob '!ui/node_modules/**' \
    --glob '!ui/dist/**' \
    --glob '!ui/.vite/**' \
    --glob '!**/*.lock' \
    --glob '!scripts/security_scan.sh' \
    --glob '!scripts/public_release_check.sh' \
    --glob '!SECURITY_NOTE.md' \
    --glob '!RELEASE_CHECKLIST.md' \
    --glob '!PUBLIC_RELEASE_PLAN.md' \
    . || true
)"
if [[ -n "$secret_matches" ]]; then
  report_issue "secret-like content found:"
  echo "$secret_matches"
fi

echo "[scan] scanning tracked content for local absolute paths..."
path_matches="$(
  rg -n \
    -e '/Users/' \
    -e 'C:\\\\' \
    -e 'file://' \
    -e 'https?://(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' \
    --glob '!.git/**' \
    --glob '!ui/node_modules/**' \
    --glob '!ui/dist/**' \
    --glob '!ui/.vite/**' \
    --glob '!**/*.lock' \
    --glob '!scripts/security_scan.sh' \
    . || true
)"
if [[ -n "$path_matches" ]]; then
  report_issue "local absolute paths or file URLs found:"
  echo "$path_matches"
fi

if [[ "$has_issues" -ne 0 ]]; then
  echo "[result] FAILED: issues detected. Fix before public release."
  exit 1
fi

echo "[result] OK: no obvious sensitive content found in tracked files."
