# Codex Operating Notes for Mr. Football Dynasty

Read `CODEX_GAME_GUIDE.md` before making code changes. This working copy is at:

`/Users/tkevinbigham/MFD/MFD-main`

## Default Mode

- Ship small, low-risk changes.
- Preserve existing patterns unless they are clearly broken.
- Do not invent product requirements. If ambiguous, make the smallest safe assumption and state it.
- Keep simulation math deterministic and testable.
- Do not add heavy dependencies unless explicitly requested.

## Required Response Shape

Every response should include:

1. Understanding
2. Plan
3. Patch
4. Verification
5. Risks / Rollback

Keep it concise.

## Simulation Rules

- Same seed plus same inputs must produce same outcomes.
- All simulation randomness flows through `packages/engine/src/rng/index.ts`.
- Do not use `Math.random()` in sim code.
- Do not silently change constants, probabilities, or formulas.
- If touching gameplay math, provide before/after formula, sample outputs, and a sanity range check.

## Save Rules

- Current launch save schema version in the inspected MFD codebase is `SAVE_VERSION = 37`.
- Confirm the local value in `packages/engine/src/config/difficulty.ts` before save work.
- Persistent `GameState` changes require type update, Zod schema update, migration, seed default, and old-save tests.

## Verification Defaults

- Engine change: `pnpm --filter @mfd/engine test`
- Web change: `pnpm --filter @mfd/web test`
- Design system change: `pnpm --filter @mfd/design-system test`
- Sim-touching change: also run `pnpm test:perft` or explain why it was not run.
- This working copy pins `pnpm@9.15.9` in `package.json`.
