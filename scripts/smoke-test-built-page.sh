#!/usr/bin/env bash
#
# Sprint 52 "Cleanup Crew Two" — built-page smoke test.
#
# Loads the production build in headless Chrome, captures the rendered DOM,
# and fails if #root is empty or a JS error showed up before paint. Catches
# the class of regression that shipped a blank-screen production site at
# Phase 4 (cross-chunk circular import → TDZ → page never mounted, but unit
# tests + bundle gate + build report all passed because none of them load
# the built JS in a real browser).
#
# Requires: a Chromium-class browser at one of the paths below (CI workers
# have google-chrome preinstalled). Also requires the build to be present
# at apps/web/dist/ — call `pnpm --filter @mfd/web build` first.
#
# Usage:
#   pnpm --filter @mfd/web build
#   bash scripts/smoke-test-built-page.sh

set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${SMOKE_PORT:-4318}"
TIMEOUT_MS="${SMOKE_TIMEOUT_MS:-15000}"
DIST_DIR="apps/web/dist"
PNPM="${PNPM_BIN:-pnpm}"

if [ ! -d "$DIST_DIR" ]; then
  echo "FAIL: $DIST_DIR missing. Run 'pnpm --filter @mfd/web build' first." >&2
  exit 1
fi

# Find a usable Chrome binary. CI ubuntu-latest ships google-chrome.
CHROME=""
for candidate in \
  google-chrome \
  google-chrome-stable \
  chromium \
  chromium-browser \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CHROME="$candidate"
    break
  fi
  if [ -x "$candidate" ]; then
    CHROME="$candidate"
    break
  fi
done

if [ -z "$CHROME" ]; then
  echo "FAIL: no Chrome / Chromium binary found. Install google-chrome or set the path manually." >&2
  exit 1
fi

# Spin up vite preview in the background.
echo "Starting preview server on :${PORT}..."
$PNPM --filter @mfd/web preview --port "$PORT" --strictPort >/tmp/mfd-preview.log 2>&1 &
PREVIEW_PID=$!

cleanup() {
  if kill -0 "$PREVIEW_PID" 2>/dev/null; then
    kill "$PREVIEW_PID" 2>/dev/null || true
    wait "$PREVIEW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Wait for the server to accept connections (max ~10s).
for _ in $(seq 1 50); do
  if curl -sf -o /dev/null "http://localhost:${PORT}/MFD/"; then
    break
  fi
  sleep 0.2
done
if ! curl -sf -o /dev/null "http://localhost:${PORT}/MFD/"; then
  echo "FAIL: preview server never responded on :${PORT}." >&2
  cat /tmp/mfd-preview.log >&2 || true
  exit 1
fi

# Headless Chrome dump-dom captures the page after JS execution. If the
# bundle blows up with a TDZ or any other init-time error, #root stays
# empty and the assertion below fires.
echo "Loading http://localhost:${PORT}/MFD/ in headless Chrome..."
DOM_FILE=$(mktemp -t mfd-smoke-dom.XXXXXX)
LOG_FILE=$(mktemp -t mfd-smoke-log.XXXXXX)
"$CHROME" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --hide-scrollbars \
  --enable-logging=stderr \
  --v=1 \
  --virtual-time-budget="$TIMEOUT_MS" \
  --dump-dom \
  "http://localhost:${PORT}/MFD/" \
  >"$DOM_FILE" 2>"$LOG_FILE" || true

# 1) #root must have at least one child element after JS runs.
if ! grep -qE '<div id="root"><[a-z]' "$DOM_FILE"; then
  echo "FAIL: #root rendered no children. Page is blank — likely a TDZ or other init-time error." >&2
  echo "----- DOM (head) -----" >&2
  head -c 2000 "$DOM_FILE" >&2
  echo >&2
  echo "----- Chrome log (last 40 lines) -----" >&2
  tail -n 40 "$LOG_FILE" >&2
  exit 1
fi

# 2) No init-time JS errors. Grep is intentionally narrow — we want to
#    catch the Phase 4 class of failure ("Cannot access '$' before
#    initialization") plus the usual Uncaught / ReferenceError / TypeError
#    that crash before paint. Don't widen this without thinking.
if grep -E "Uncaught (ReferenceError|TypeError|SyntaxError)|Cannot access .* before initialization" "$LOG_FILE" >/dev/null; then
  echo "FAIL: init-time JS error detected in browser console:" >&2
  grep -E "Uncaught (ReferenceError|TypeError|SyntaxError)|Cannot access .* before initialization" "$LOG_FILE" >&2
  exit 1
fi

echo "PASS: built page rendered #root with children and no init-time JS errors."
