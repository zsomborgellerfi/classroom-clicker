#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"

echo "Running backend type-check (tsc)..."
(cd "$ROOT_DIR/backend" && npm run tsc -- "$@")

echo
echo "Running frontend type-check (tsc)..."
(cd "$ROOT_DIR/frontend" && npm run tsc -- "$@")
