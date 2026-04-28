#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VITE_NODE="node_modules/.pnpm/vite-node@3.2.4/node_modules/vite-node/vite-node.mjs"
if [[ ! -f "$VITE_NODE" ]]; then
  VITE_NODE="$(find node_modules/.pnpm -type f -name vite-node.mjs 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "${VITE_NODE:-}" || ! -f "$VITE_NODE" ]]; then
  echo "vite-node not found — run 'pnpm install' first." >&2
  exit 1
fi

exec node "$VITE_NODE" scripts/shadow-regression.ts "$@"
