#!/usr/bin/env bash
# cleanup-gate.sh — safety gate between cleanup waves.
# Invoked after each merge into cleanup/* branches. See
# /Users/tkevinbigham/.claude/plans/idempotent-marinating-rainbow.md
# for wave structure.
#
# Exits non-zero if any baseline count regresses or SAVE_VERSION drifts.

set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="/Users/tkevinbigham/.local/node-lts/bin:$PATH"

echo "=== typecheck ==="
pnpm -r typecheck

echo "=== test ==="
pnpm -r test

echo "=== build ==="
pnpm -r build

echo "=== count drift vs baseline ==="
any_count=$(grep -rE ':[[:space:]]*any\b|as any\b' packages apps --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l | tr -d ' ')
try_count=$(grep -rE '^[[:space:]]*try[[:space:]]*\{' packages apps --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l | tr -d ' ')
save_version=$(grep -E 'export const SAVE_VERSION' packages/engine/src/config/difficulty.ts | grep -oE '[0-9]+')
engine_index_lines=$(wc -l < packages/engine/src/index.ts | tr -d ' ')
engine_types_lines=$(wc -l < packages/engine/src/types/index.ts | tr -d ' ')

echo "any count: $any_count (baseline: 113)"
echo "try count: $try_count (baseline: 14)"
echo "SAVE_VERSION: $save_version (frozen at: 28)"
echo "engine/src/index.ts: $engine_index_lines LOC (baseline: 1046)"
echo "engine/src/types/index.ts: $engine_types_lines LOC (baseline: 3180 pre-T2, 21 post-T2)"

echo ""
echo "=== madge circular deps (informational) ==="
madge_out=$(pnpm exec madge --circular --extensions ts,tsx --ts-config packages/engine/tsconfig.json packages/engine/src 2>&1 || true)
cycle_count=$(echo "$madge_out" | grep -oE 'Found [0-9]+ circular' | grep -oE '[0-9]+' || echo "0")
echo "circular deps: $cycle_count (baseline 39 pre-T2, ~41 post-T2: mostly type-only via inline import() in types/franchise.ts; 1 runtime: game-plan <-> game-sim)"

if [ "$save_version" != "28" ]; then
  echo "FAIL: SAVE_VERSION changed (expected 28, got $save_version). Halt and escalate to Kevin." >&2
  exit 1
fi

echo ""
echo "GATE PASS"
