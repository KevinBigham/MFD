#!/usr/bin/env bash
#
# Sprint 40 "The Straight Line" — bundle size gate.
#
# Enforces a ceiling on the engine chunk gzip size. Run after
# `pnpm --filter @mfd/web build`. Fails if engine-*.js gzip exceeds
# BUNDLE_CEILING_KB, warns when it's within WARN_WINDOW_KB of ceiling.
#
# Baseline as of 2026-04-16: 282 KB gzip.
# Phase 4 deploy hotfix (2026-04-20): briefly bumped ceiling 312 -> 360 KB
#   while the engine-content chunk split was reverted. Sprint 52 restored a
#   safe split (content-loader + content-schemas + /packages/content/ only,
#   broadcast-commentary stays in engine), so the engine chunk is back under
#   the 312 KB Phase 4 baseline ceiling. The engine-content sibling is
#   excluded below — its ~80 KB lives outside the engine budget.
# Ceiling: 312 KB (baseline +30 KB per GOAT roadmap).
# Schema ratchet bump (2026-08-05): 312 -> 320 KB. The any-free ratchet
#   (PR #98, schema islands 1-12) typed twelve z.any() save-file fields with
#   real Zod schemas, adding ~1 KB of permanent validation code that tipped
#   the engine chunk to 313 KB. Kevin-approved bump keeps ~7 KB headroom.
# Warn window: 10 KB below ceiling.
#
# Usage:
#   cd mfd && bash scripts/check-bundle-size.sh
#
# Override for experiments:
#   BUNDLE_CEILING_KB=400 bash scripts/check-bundle-size.sh

set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_CEILING_KB="${BUNDLE_CEILING_KB:-320}"
WARN_WINDOW_KB=10
DIST_DIR="apps/web/dist/assets"

if [ ! -d "$DIST_DIR" ]; then
  echo "FAIL: $DIST_DIR missing. Run 'pnpm --filter @mfd/web build' first." >&2
  exit 1
fi

# Only the shared engine chunk counts toward the ceiling. Sprint 52 restored
# the `engine-content-*.js` sibling (Muse Spark content + Zod schemas +
# content-loader) which lives in its own budget and never imports back into
# the engine chunk. The glob excludes it explicitly so an accidental second
# engine sibling is loud rather than silently picked.
engine_chunks=$(find "$DIST_DIR" -maxdepth 1 -name 'engine-*.js' ! -name 'engine-content-*.js' | wc -l | tr -d ' ')
if [ "$engine_chunks" -eq 0 ]; then
  echo "FAIL: No engine-*.js chunk in $DIST_DIR (excluding engine-content)." >&2
  exit 1
fi
if [ "$engine_chunks" -gt 1 ]; then
  echo "FAIL: Expected exactly one shared engine chunk, found ${engine_chunks}." >&2
  echo "Update this script's glob or the vite manualChunks config." >&2
  find "$DIST_DIR" -maxdepth 1 -name 'engine-*.js' ! -name 'engine-content-*.js' >&2
  exit 1
fi
engine_chunk=$(find "$DIST_DIR" -maxdepth 1 -name 'engine-*.js' ! -name 'engine-content-*.js' | head -n1)

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
