#!/usr/bin/env bash
# PostToolUse — re-run the Math.random() ban after any TypeScript edit,
# reusing the exact CI gate so hook and CI can never disagree.
set -uo pipefail
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
input=$(cat)
case "$input" in
  *'.ts'*|*'.tsx'*) ;;
  *) exit 0 ;;
esac
if ! bash "$root/scripts/check-math-random.sh" 1>&2; then
  echo "BLOCKED: Math.random() ban failed after this edit. Route all" \
       "randomness through packages/engine/src/rng/index.ts channels," \
       "then re-edit." >&2
  exit 2
fi
exit 0
