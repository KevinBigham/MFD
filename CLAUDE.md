# CLAUDE.md — Mr. Football Dynasty (MFD)

TypeScript pnpm monorepo for a browser football franchise sim.
Live: kevinbigham.github.io/MFD/. AGENTS.md is binding here too —
this file adds the Claude Code layer. Never edit AGENTS.md.

## Map

- apps/web — React 19 app (Vite dev server, port 5173)
- packages/engine — pure deterministic sim. No I/O, no Date.now(),
  no Math.random().
- packages/content, packages/design-system
- scripts/ — CI gates & tooling · _canon/seeds — canonical seed data
- docs/audits · docs/release · docs/sprint-logs · docs/verification

## Prime Laws

1. DETERMINISM. Same seed + same inputs → same outcomes. All
   randomness flows through packages/engine/src/rng/index.ts
   (8 named channels). Math.random() is banned — enforced by
   scripts/check-math-random.sh (sole exception: synth-sounds.ts)
   and by a PostToolUse hook after every TS edit.
2. SAVE SCHEMA. SAVE_VERSION = 36
   (packages/engine/src/config/difficulty.ts:93). Any persistent
   GameState change requires ALL of: type update, Zod schema,
   migration, seed default, old-save tests — and is a Kevin gate.
3. NO SILENT MATH CHANGES. Constants, probabilities, and formulas
   change only with before/after formula, sample outputs, and a
   sanity range check in the packet.

## Landmines (hook-enforced)

- NEVER modify, move, or delete: CODEX_GAME_GUIDE.md,
  CODEX_IMPROVEMENT_PLAN.md, CODEX_GOAT_MARATHON_PROMPT.md.
  save-version-drift.test.ts (lines 63–65) hard-reads them; the
  engine suite breaks without them. Reading/grepping them is fine.
- NEVER read wholesale (context bombs) — grep sections instead:
  STATUS.md (41k lines), RELEASE_CONVERGENCE.md,
  CODEX_GAME_GUIDE.md (730KB). Where AGENTS.md says "read
  CODEX_GAME_GUIDE.md before changes," that means: grep the
  sections relevant to your packet, never cat the file.

## Commands

- pnpm dev | build | test | test:engine | lint | typecheck
- pnpm playtest · playtest:all · test:perft (sim-touching work)
- pnpm test:shadow — shadow regression
- node scripts/release-gate.mjs --list | --dry-run | --only <ids>
  (full run ≈ 90+ min — CI's job; never run full locally unasked)
- bash scripts/check-math-random.sh

## Verification defaults

engine → pnpm test:engine · web → pnpm --filter @mfd/web test ·
design-system → pnpm --filter @mfd/design-system test ·
sim-touching → also test:perft, or state why not.

## How work arrives

Work arrives as packets: CONTEXT / OBJECTIVE / CONSTRAINTS /
VERIFICATION / DELIVERABLE / STOP CONDITIONS. No VERIFICATION
section = not a packet — ask for one. /phase-packet generates one
from the GOAT roadmap. Before requesting merge, invoke the
goat-reviewer subagent: the builder never grades its own work.

Parallel work: reads parallelize freely; writes to shared files
serialize or take separate worktrees (.claude/worktrees/ is
gitignored). Schema-window items never run in parallel with
anything that reads the schema.

## Kevin gates — STOP and ask

Schema/save-format changes · gameplay constants or formulas ·
edits to CI jobs (test, determinism-gate, release-gate) or
release-gate.mjs · deploys/prod · the three CODEX files ·
scope or cost doubling mid-packet.
