# AGENTS.md — Mr. Football Dynasty (MFD)

Single source of truth for ALL coding agents (Claude, Codex, Cursor,
Copilot, anyone). Claude Code additionally reads CLAUDE.md, which
adds a thin Claude-only layer on top of this file. If any other
document contradicts this file, this file wins — flag the conflict
to Kevin instead of guessing.

TypeScript pnpm monorepo for a browser football franchise sim.
Repo: github.com/KevinBigham/MFD · Live: kevinbigham.github.io/MFD/
Working copy on Kevin's Mac: /Users/kevin/Projects/MFD-main
Pinned toolchain: pnpm@9.15.9 (package.json "packageManager").

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
   (named channels). Math.random() is banned — enforced by
   scripts/check-math-random.sh (sole exception: synth-sounds.ts).
2. SAVE SCHEMA. SAVE_VERSION = 37
   (packages/engine/src/config/difficulty.ts:93) — confirm the
   local value before any save work. Any persistent GameState
   change requires ALL of: type update, Zod schema, migration,
   seed default, old-save tests — and is a Kevin gate.
3. NO SILENT MATH CHANGES. Constants, probabilities, and formulas
   change only with before/after formula, sample outputs, and a
   sanity range check in the packet.

## Landmines

- NEVER modify, move, or delete: CODEX_GAME_GUIDE.md,
  CODEX_IMPROVEMENT_PLAN.md, CODEX_GOAT_MARATHON_PROMPT.md.
  save-version-drift.test.ts (lines 63–65) hard-reads them; the
  engine suite breaks without them. Reading/grepping is fine.
- NEVER read wholesale (context bombs) — grep the sections
  relevant to your task instead: STATUS.md (41k lines),
  RELEASE_CONVERGENCE.md, CODEX_GAME_GUIDE.md (730KB),
  CODEX_IMPROVEMENT_PLAN.md, CODEX_GOAT_MARATHON_PROMPT.md.
  (This replaces the old "read CODEX_GAME_GUIDE.md before making
  code changes" rule — grepping the relevant sections IS the
  required pre-read.)
- The legacy mr-football-dynasty game.js monolith is RETIRED.
  There is no game.js, no legacy copy, no three-file delivery in
  this repo. If any instruction mentions them, stop and tell Kevin.

## Default Mode

- Ship small, low-risk changes. Preserve existing patterns unless
  they are clearly broken.
- Do not invent product requirements. If ambiguous, make the
  smallest safe assumption and state it.
- No heavy dependencies unless explicitly requested.
- Response shape, kept concise: Understanding · Plan · Patch ·
  Verification · Risks/Rollback.

## Commands

- pnpm dev | build | test | test:engine | lint | typecheck
- pnpm playtest · playtest:all · test:perft (sim-touching work)
- pnpm test:shadow — shadow regression
- node scripts/release-gate.mjs --list | --dry-run | --only <ids>
  (full run ≈ 90+ min — CI's job; never run full locally unasked)
- bash scripts/check-math-random.sh

## Verification defaults

- engine → pnpm test:engine (≡ pnpm --filter @mfd/engine test)
- web → pnpm --filter @mfd/web test
- design-system → pnpm --filter @mfd/design-system test
- sim-touching → also pnpm test:perft, or state why not.

## How work arrives

Work arrives as packets: CONTEXT / OBJECTIVE / CONSTRAINTS /
VERIFICATION / DELIVERABLE / STOP CONDITIONS. No VERIFICATION
section = not a packet — ask for one. The phase-packet skill
(.claude/skills and .agents/skills — identical copies) generates
one from the GOAT roadmap. The builder never grades its own work:
get an independent review before requesting merge.

## Kevin gates — STOP and ask

Schema/save-format changes · gameplay constants or formulas ·
edits to CI jobs (test, determinism-gate, release-gate) or
release-gate.mjs · deploys/prod · the three CODEX files ·
scope or cost doubling mid-packet.

## Handoff protocol (multi-computer)

Kevin works from three computers; GitHub is the single source of
truth and local clones are just keyboards.

- "pickup" → git pull, then report: current branch, last commit,
  any uncommitted files found (if any exist, STOP and ask — they
  may be from a crashed or forgotten session).
- "handoff" → git status, commit ALL work-in-progress with a
  wip(scope): message, pull --rebase, push, then confirm: branch,
  commit hash, "clean — safe to switch computers."
- Never leave work uncommitted or unpushed at session end.
- Never work from a downloaded zip copy — ~/Projects/<repo> only.

## Projects HQ

Machine-wide conventions and the working-with-Kevin guide live at
~/Projects/AGENTS START HERE - Projects HQ/KEVIN.md — read it when
present (it won't exist in CI or cloud checkouts; that's fine).
