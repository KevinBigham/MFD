#!/usr/bin/env bash
# check-math-random.sh — CI gate that fails on any Math.random() usage
# outside the one approved exception (synth-sounds.ts).
#
# Sprint 39 deliverable: determinism enforcement in CI.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Math.random() lint ban ==="

# Search .ts and .tsx files for Math.random(), excluding synth-sounds.ts
# Also exclude .test.ts files that assert Math.random is forbidden (meta-tests)
hits=$(grep -rn 'Math\.random()' \
  --include='*.ts' --include='*.tsx' \
  packages apps \
  | grep -v 'synth-sounds\.ts' \
  | grep -v '\.test\.ts:' \
  | grep -v '// .* Math\.random' \
  | grep -v 'No Math\.random' \
  || true)

if [ -n "$hits" ]; then
  echo "FAIL: Math.random() found outside synth-sounds.ts:" >&2
  echo "$hits" >&2
  echo "" >&2
  echo "All randomness must flow through @mfd/engine/rng channels." >&2
  echo "See packages/engine/src/rng/index.ts for the 8 named channels." >&2
  exit 1
fi

echo "PASS: No unauthorized Math.random() usage found."
