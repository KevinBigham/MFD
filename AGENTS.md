# Codex Operating Notes for Mr. Football Dynasty

Read `CODEX_GAME_GUIDE.md` before making code changes. It is the repo map for engine, web, saves, content, tests, and known wiring.

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
- Do not silently change constants, probabilities, or formulas. Call them out and add focused tests.
- If touching gameplay math, provide before/after formula, sample outputs, and a sanity range check.

## Save Rules

- Current save schema version is `SAVE_VERSION = 37` in `packages/engine/src/config/difficulty.ts`.
- Persistent `GameState` changes require:
  - Type update.
  - Zod schema update.
  - Migration step.
  - Save/load tests, including old-save migration coverage.

## Verification Defaults

- Engine change: `pnpm --filter @mfd/engine test`
- Web change: `pnpm --filter @mfd/web test`
- Design system change: `pnpm --filter @mfd/design-system test`
- Sim-touching change: also run `pnpm test:perft` or explain why it was not run.
- If global `pnpm` is unavailable, use `npx --yes pnpm@9.15.9 ...`.
