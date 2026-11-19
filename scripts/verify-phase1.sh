#!/usr/bin/env bash
# =============================================================================
# CareBridge AI — Phase 1 Foundation Verification Script
# Runs type-checking, linting, formatting, build, and backend tests.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> [1/5] Frontend formatting check..."
npm --prefix "$ROOT_DIR/frontend" run format:check

echo "==> [2/5] Frontend TypeScript strict check..."
npm --prefix "$ROOT_DIR/frontend" run typecheck

echo "==> [3/5] Frontend ESLint check..."
npm --prefix "$ROOT_DIR/frontend" run lint

echo "==> [4/5] Frontend production build..."
npm --prefix "$ROOT_DIR/frontend" run build

echo "==> [5/5] Backend pytest suite..."
"$ROOT_DIR/backend/.venv/bin/pytest" -c "$ROOT_DIR/backend/pytest.ini" "$ROOT_DIR/backend/tests"

echo ""
echo "All Phase 1 foundation verification checks passed."
