#!/usr/bin/env node
// PreToolUse guard — blocks writes/moves/deletes of the three files
// hard-read by packages/engine/src/save/save-version-drift.test.ts
// (lines 63–65). Reads and greps remain allowed.
let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const PROTECTED = [
    'CODEX_GAME_GUIDE.md',
    'CODEX_IMPROVEMENT_PLAN.md',
    'CODEX_GOAT_MARATHON_PROMPT.md',
  ];
  const tool = input.tool_name || '';
  const ti = input.tool_input || {};
  const editPath = String(ti.file_path || ti.path || ti.notebook_path || '');
  const cmd = String(ti.command || '');
  let hit = null;
  if (tool === 'Bash') {
    // Block only destructive shell use of a protected file;
    // grep/cat/head stay allowed.
    const destructive =
      /(\brm\b|\bmv\b|\bunlink\b|\btruncate\b|sed\s+-i|perl\s+-i|>{1,2}\s*\S*CODEX|\btee\b)/;
    if (destructive.test(cmd)) {
      hit = PROTECTED.find((f) => cmd.includes(f)) || null;
    }
  } else {
    hit = PROTECTED.find((f) => editPath.includes(f)) || null;
  }
  if (hit) {
    console.error(
      `BLOCKED: ${hit} is hard-read by save-version-drift.test.ts ` +
      `(engine suite breaks if it is modified, moved, or deleted). ` +
      `See CLAUDE.md > Landmines. If Kevin has explicitly ordered this ` +
      `change, he must lift this hook first.`
    );
    process.exit(2);
  }
  process.exit(0);
});
