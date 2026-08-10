# CLAUDE.md — Mr. Football Dynasty (MFD)

Read AGENTS.md first. It is the single source of truth — map,
Prime Laws, landmines, commands, verification defaults, packet
workflow, Kevin gates — and every word of it is binding here.
This file adds ONLY the Claude Code layer. Shared rules live in
AGENTS.md, never here; if the two ever disagree, AGENTS.md wins
and the disagreement is a bug to flag to Kevin.

## Hooks (enforced automatically — .claude/settings.json)

- PreToolUse: .claude/hooks/protect-canon-files.mjs blocks any
  edit, move, or destructive shell use of the three CODEX_*.md
  files. If it fires, you hit a landmine — stop, don't route
  around it.
- PostToolUse: .claude/hooks/post-edit-determinism.sh runs the
  Math.random() ban check after every TS edit.

## Subagents & skills

- goat-reviewer (.claude/agents/goat-reviewer.md): invoke before
  requesting merge — the builder never grades its own work.
- /phase-packet (.claude/skills/phase-packet): generates a work
  packet from the GOAT roadmap. An identical copy lives at
  .agents/skills/phase-packet for other tools — any edit to one
  must be mirrored to the other.

## Parallel work

- Reads parallelize freely; writes to shared files serialize or
  take separate worktrees (.claude/worktrees/ is gitignored).
- Schema-window items never run in parallel with anything that
  reads the schema.
