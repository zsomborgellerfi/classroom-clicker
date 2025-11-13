#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"

echo "Running backend tests..."
(cd "$ROOT_DIR/backend" && npm test -- --runInBand)

echo
echo "Running frontend tests..."
(cd "$ROOT_DIR/frontend" && npm run test:run)
