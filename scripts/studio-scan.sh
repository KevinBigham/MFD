#!/bin/bash
# ============================================================
# MFD Studio Scan — Read-Only Health Report
# ============================================================
# This script NEVER modifies code. It only reports signals.
# Run from the mr-football-dynasty-deploy/ directory.
#
# Usage:
#   ./scripts/studio-scan.sh           # Run all 4 scan types
#   ./scripts/studio-scan.sh code      # Code health only
#   ./scripts/studio-scan.sh build     # Build health only
#   ./scripts/studio-scan.sh arch      # Architecture drift only
#   ./scripts/studio-scan.sh gameplay  # Gameplay opportunities only
#
# Output: scan-results.md (overwritten each run)
# ============================================================

set -e

SCAN_TYPE="${1:-all}"
OUTPUT="scan-results.md"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Verify we're in the right directory
if [ ! -f "mr-football-v100.jsx" ]; then
  echo "ERROR: Run this script from mr-football-dynasty-deploy/"
  echo "Usage: ./scripts/studio-scan.sh [all|code|build|arch|gameplay]"
  exit 1
fi

echo "# Studio Scan Results" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "**Timestamp:** $TIMESTAMP" >> "$OUTPUT"
echo "**Scan type:** $SCAN_TYPE" >> "$OUTPUT"
echo "**Branch:** $(git branch --show-current 2>/dev/null || echo 'unknown')" >> "$OUTPUT"
echo "**Commit:** $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# ---- CODE HEALTH SCAN ----
run_code_scan() {
  echo "---" >> "$OUTPUT"
  echo "## Code Health" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Math.random() in modular src/" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  rg -c "Math\\.random" src/ 2>/dev/null >> "$OUTPUT" || echo "None found" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Math.random() in monolith" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  MONOLITH_RANDOM=$(grep -c "Math\\.random" mr-football-v100.jsx 2>/dev/null || echo "0")
  echo "Count: $MONOLITH_RANDOM (expected: 21 UI-only)" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Console statements in production src/" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  rg -c "console\\.(log|warn|error)" src/ --glob '!src/dev/*' 2>/dev/null >> "$OUTPUT" || echo "None found" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Largest files in src/" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  find src/ -name "*.js" -o -name "*.jsx" | xargs wc -l 2>/dev/null | sort -rn | head -10 >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### TODO/FIXME markers" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  TODO_COUNT=$(rg -c "TODO|FIXME" src/ 2>/dev/null | wc -l || echo "0")
  echo "Files with TODOs: $TODO_COUNT" >> "$OUTPUT"
  rg -c "TODO|FIXME" src/ 2>/dev/null >> "$OUTPUT" || echo "None found" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"
}

# ---- BUILD HEALTH SCAN ----
run_build_scan() {
  echo "---" >> "$OUTPUT"
  echo "## Build Health" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Test Suite" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  npm test 2>&1 >> "$OUTPUT" || echo "TESTS FAILED" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Production Build" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  npm run build 2>&1 >> "$OUTPUT" || echo "BUILD FAILED" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Dependency Drift" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  npm outdated 2>&1 >> "$OUTPUT" || echo "All dependencies current" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"
}

# ---- ARCHITECTURE DRIFT SCAN ----
run_arch_scan() {
  echo "---" >> "$OUTPUT"
  echo "## Architecture Drift" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Monolith Size" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  MONOLITH_LINES=$(wc -l < mr-football-v100.jsx 2>/dev/null || echo "unknown")
  echo "mr-football-v100.jsx: $MONOLITH_LINES lines (target: <40,000)" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Entry Point Size" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  MAIN_LINES=$(wc -l < src/main.jsx 2>/dev/null || echo "unknown")
  echo "src/main.jsx: $MAIN_LINES lines (target: <100)" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Circular Import Candidates" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  rg "from.*\.\./systems/" src/systems/ --type js -l 2>/dev/null >> "$OUTPUT" || echo "None found" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Remaining Inline Definitions in Monolith" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  INLINE_COUNT=$(rg -c "^var [A-Z_]+_986" mr-football-v100.jsx 2>/dev/null || echo "0")
  echo "Inline var *_986 definitions: $INLINE_COUNT" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Module Count" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  SRC_COUNT=$(find src/ -name "*.js" -o -name "*.jsx" | wc -l)
  echo "Files in src/: $SRC_COUNT" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"
}

# ---- GAMEPLAY OPPORTUNITY SCAN ----
run_gameplay_scan() {
  echo "---" >> "$OUTPUT"
  echo "## Gameplay Opportunities" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### auto_tasks/DISCOVERED/ count" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  DISCOVERED=$(ls ../auto_tasks/DISCOVERED/ 2>/dev/null | wc -l || echo "0")
  echo "DISCOVERED: $DISCOVERED / 10 capacity" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### Engagement TODOs in src/" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  rg -c "TODO.*engagement|TODO.*sharing|TODO.*challenge" src/ 2>/dev/null >> "$OUTPUT" || echo "None found" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  echo "### BACKLOG.md task count" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  BACKLOG_COUNT=$(grep -c "^## PRIORITY" ../BACKLOG.md 2>/dev/null || echo "0")
  echo "Queued tasks: $BACKLOG_COUNT" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  echo "" >> "$OUTPUT"
}

# ---- EXECUTE ----
echo "Running studio scan ($SCAN_TYPE)..."

case "$SCAN_TYPE" in
  code)     run_code_scan ;;
  build)    run_build_scan ;;
  arch)     run_arch_scan ;;
  gameplay) run_gameplay_scan ;;
  all)
    run_code_scan
    run_arch_scan
    run_gameplay_scan
    echo "---" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo "*Build health scan skipped in 'all' mode. Run \`./scripts/studio-scan.sh build\` separately (it modifies node_modules via npm).*" >> "$OUTPUT"
    ;;
  *)
    echo "Unknown scan type: $SCAN_TYPE"
    echo "Usage: ./scripts/studio-scan.sh [all|code|build|arch|gameplay]"
    exit 1
    ;;
esac

echo "" >> "$OUTPUT"
echo "---" >> "$OUTPUT"
echo "*Generated by studio-scan.sh at $TIMESTAMP. This file is overwritten each run.*" >> "$OUTPUT"

echo "Scan complete. Results written to $OUTPUT"
