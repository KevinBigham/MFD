#!/usr/bin/env bash
#
# Sprint 40 "The Straight Line" — bundle size gate.
#
# Enforces a ceiling on the engine chunk gzip size. Run after
# `pnpm --filter @mfd/web build`. Fails if engine-*.js gzip exceeds
# BUNDLE_CEILING_KB, warns when it's within WARN_WINDOW_KB of ceiling.
#
# Baseline as of 2026-04-16: 282 KB gzip.
# Ceiling: 312 KB (baseline +30 KB per GOAT roadmap).
# Warn window: 10 KB below ceiling.
#
# Usage:
#   cd mfd && bash scripts/check-bundle-size.sh
#
# Override for experiments:
#   BUNDLE_CEILING_KB=400 bash scripts/check-bundle-size.sh

set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_CEILING_KB="${BUNDLE_CEILING_KB:-312}"
WARN_WINDOW_KB=10
DIST_DIR="apps/web/dist/assets"

if [ ! -d "$DIST_DIR" ]; then
  echo "FAIL: $DIST_DIR missing. Run 'pnpm --filter @mfd/web build' first." >&2
  exit 1
fi

engine_chunk=$(find "$DIST_DIR" -maxdepth 1 -name 'engine-*.js' | head -n1)

if [ -z "$engine_chunk" ]; then
  echo "FAIL: No engine-*.js chunk in $DIST_DIR." >&2
  exit 1
fi

gz_bytes=$(gzip -c "$engine_chunk" | wc -c | tr -d ' ')
gz_kb=$(( (gz_bytes + 1023) / 1024 ))

printf 'Engine chunk: %s\n' "$(basename "$engine_chunk")"
printf 'Gzip size: %s KB (ceiling %s KB)\n' "$gz_kb" "$BUNDLE_CEILING_KB"

if [ "$gz_kb" -gt "$BUNDLE_CEILING_KB" ]; then
  over=$(( gz_kb - BUNDLE_CEILING_KB ))
  echo "FAIL: engine chunk is ${over} KB over the ${BUNDLE_CEILING_KB} KB ceiling." >&2
  echo "Fix: code-split a new lazy route, tree-shake a heavy system, or bump the ceiling with justification." >&2
  exit 1
fi

warn_threshold=$(( BUNDLE_CEILING_KB - WARN_WINDOW_KB ))
if [ "$gz_kb" -gt "$warn_threshold" ]; then
  echo "WARN: engine chunk within ${WARN_WINDOW_KB} KB of the ${BUNDLE_CEILING_KB} KB ceiling. Budget is tightening." >&2
fi

echo "PASS: engine chunk size OK."
