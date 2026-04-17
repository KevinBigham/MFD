#!/usr/bin/env bash
# Sprint 48 — Age-curve telemetry runner.
#
# Runs the deterministic age-curve harness and writes the result to
# .codex/MFD/age-curve-report.{json,csv} for design review.
#
# Usage (from repo root):
#   bash mfd/scripts/age-curve-report.sh                 # 1000 careers, seed 42
#   bash mfd/scripts/age-curve-report.sh --careers 500   # custom career count
#   bash mfd/scripts/age-curve-report.sh --seed 7        # custom seed

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VITE_NODE="node_modules/.pnpm/vite-node@3.2.4/node_modules/vite-node/vite-node.mjs"
if [[ ! -f "$VITE_NODE" ]]; then
  # Fallback: resolve via pnpm (handles future vite-node version bumps).
  VITE_NODE="$(find node_modules/.pnpm -type f -name vite-node.mjs 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "${VITE_NODE:-}" || ! -f "$VITE_NODE" ]]; then
  echo "vite-node not found — run 'pnpm install' first." >&2
  exit 1
fi

exec node "$VITE_NODE" scripts/age-curve-report.ts "$@"
