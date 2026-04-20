#!/usr/bin/env bash
#
# Sprint 40 "The Straight Line" — bundle size gate.
#
# Enforces a ceiling on the engine chunk gzip size. Run after
# `pnpm --filter @mfd/web build`. Fails if engine-*.js gzip exceeds
# BUNDLE_CEILING_KB, warns when it's within WARN_WINDOW_KB of ceiling.
#
# Baseline as of 2026-04-16: 282 KB gzip.
# Phase 4 deploy hotfix (2026-04-20): bumped ceiling 312 -> 360 KB.
#   Reason: Phase 4 ("The Broadcast") added ~30 KB of broadcast-commentary
#   plus content-loader expansion (team identity / rivalry / former-player /
#   relationship lines). An attempted Vite manualChunks split into a separate
#   engine-content chunk shipped a runtime TDZ ("Cannot access '$' before
#   initialization") because the engine barrel re-exports content-loader
#   symbols, creating a cross-chunk circular import. Reverted the split and
#   raised the ceiling rather than ship a broken site. Restoring a real
#   content-chunk split is a Phase 5 cleanup task.
# Ceiling: 360 KB (baseline +78 KB after Phase 4).
# Warn window: 15 KB below ceiling.
#
# Usage:
#   cd mfd && bash scripts/check-bundle-size.sh
#
# Override for experiments:
#   BUNDLE_CEILING_KB=400 bash scripts/check-bundle-size.sh

set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_CEILING_KB="${BUNDLE_CEILING_KB:-360}"
WARN_WINDOW_KB=15
DIST_DIR="apps/web/dist/assets"

if [ ! -d "$DIST_DIR" ]; then
  echo "FAIL: $DIST_DIR missing. Run 'pnpm --filter @mfd/web build' first." >&2
  exit 1
fi

# Single engine chunk after the Phase 4 hotfix revert. If a future split
# adds a sibling chunk, name it `engine-<purpose>-*.js` and exclude it
# below — the glob is intentionally strict so an accidental second engine
# chunk is loud rather than silently picked.
engine_chunks=$(find "$DIST_DIR" -maxdepth 1 -name 'engine-*.js' | wc -l | tr -d ' ')
if [ "$engine_chunks" -eq 0 ]; then
  echo "FAIL: No engine-*.js chunk in $DIST_DIR." >&2
  exit 1
fi
if [ "$engine_chunks" -gt 1 ]; then
  echo "FAIL: Expected exactly one engine-*.js chunk, found ${engine_chunks}." >&2
  echo "Update this script's glob or the vite manualChunks config." >&2
  find "$DIST_DIR" -maxdepth 1 -name 'engine-*.js' >&2
  exit 1
fi
engine_chunk=$(find "$DIST_DIR" -maxdepth 1 -name 'engine-*.js' | head -n1)

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
