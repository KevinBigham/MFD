#!/usr/bin/env bash
#
# Gate 8 / Playability Gate — full-season simulation smoke test.
#
# Runs the three engine-side simulation smoke tests as a standalone gate,
# separate from the full 1500+ engine suite. Designed to fail fast on the
# "is the game still playable?" class of regression that unit-level tests
# can miss:
#
#   season-smoke.test.ts      — 3-season multi-run determinism + stat bounds
#   full-season.test.ts       — 3-season integration loop with progression +
#                               retirement + AI strategy pivot assertions
#   save-round-trip.test.ts   — advance a full season, round-trip through
#                               JSON + SaveStateSchema + migrate chain,
#                               assert structural equivalence + resume works
#
# This is the engine-layer analog to smoke-test-built-page.sh (which covers
# the browser-layer "does the built page render?" gate).
#
# Rationale: OpenGame-Bench-inspired playability gate. Unit tests answer "is
# the code correct?" but miss "can a player actually finish a season and
# save+reload without state drift?" These three tests are the minimum set
# that answers that question at the engine layer.
#
# Usage:
#   bash scripts/smoke-full-season.sh
#
# Exit codes:
#   0 — all sim-smoke tests passed
#   1 — one or more sim-smoke tests failed (check stderr for vitest output)

set -euo pipefail

cd "$(dirname "$0")/.."

PNPM="${PNPM_BIN:-pnpm}"

echo "Running engine-layer playability gate (season-smoke + full-season + save-round-trip)..."

# Invoke vitest directly within the engine package so the positional file
# filters pass through cleanly. (pnpm's `-- <args>` routing doesn't forward
# positional args to vitest — it runs the full suite.)
if ! (cd packages/engine && "$PNPM" exec vitest run \
  season-smoke \
  full-season \
  save-round-trip); then
  echo "" >&2
  echo "FAIL: engine-layer playability gate failed." >&2
  echo "  One or more of the sim-smoke tests regressed." >&2
  echo "  This catches the class of bug where unit tests pass but a" >&2
  echo "  full-season playthrough or save/load cycle produces invalid state." >&2
  exit 1
fi

echo ""
echo "PASS: engine-layer playability gate (season-smoke + full-season + save-round-trip)."
