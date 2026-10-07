# MFD Documentation

Use this index for current work. [AGENTS.md](../AGENTS.md) remains the operating-policy authority; [CLAUDE.md](../CLAUDE.md) adds the Claude-specific layer.

## Start here

| Reader / task | Current entry point |
| --- | --- |
| Player | [Play Guide](PLAY_GUIDE.md) |
| Agent picking up approved repair work | [Current handoff](../CODEX_FINISH_GAME_MARATHON_PROMPT.md) and [consistency repair plan](plans/file-consistency-2026-10-07.md) |
| Simulation verification | [Fast tier](verification/fast-tier.md) and [shadow comparison/update policy](verification/shadow-tier.md) |
| Supported development tooling | [Toolchain, browser checks, and retained reference tools](verification/tooling.md) |
| Baseline evidence | [Stored corpus, metrics, and provenance limits](../_canon/seeds/mfd/README.md) |
| Release workflow | [CI source](../.github/workflows/ci.yml), [Pages source](../.github/workflows/deploy.yml), and the current candidate's actual run receipts |
| Retained root manifest | [Legacy test-material note](../public/README.md) |

## Current work and evidence

The active repair queue uses **MFD-01 through MFD-16**, from the October 7, 2026 file-consistency sweep at `a51aac1dd2c3e048893a5d897b0cef19ba97f57a`. It is a newly adopted queue, not the missing 100-item GOAT Rev-2 roadmap. Use the plan's finding rows and packet rules; do not translate a legacy GOAT number into an MFD finding.

Implementation preparation is authorized. A prepared patch is not proof of a passing test, merge, or deployment. Record the actual candidate SHA, environment, command, result, and limits in the [repair ledger](plans/file-consistency-2026-10-07.md#evidence-and-closeout). Check the current session's authorization before actions that create hosted workload or publish a release.

## Runtime facts come from source

| Fact | Authority |
| --- | --- |
| Node, pnpm and root commands | [package.json](../package.json) |
| Web commands and dependencies | [web package](../apps/web/package.json) |
| Current save version | [difficulty.ts](../packages/engine/src/config/difficulty.ts) |
| Persistence validation and migration | [save schema](../packages/engine/src/save/schema.ts), [migrations](../packages/engine/src/save/migrations.ts), and [normalization boundary](../apps/web/src/app/store/persistence.ts) |
| Release steps | [release-gate.mjs](../scripts/release-gate.mjs) |
| Configured Claude hooks | [settings.json](../.claude/settings.json) |

Do not copy a historical version, test count, green verdict, or local path into a new packet without checking its source and date.

## Historical material

The root audits, earlier GOAT plans, May release runbooks, [STATUS.md](../STATUS.md), and [RELEASE_CONVERGENCE.md](../RELEASE_CONVERGENCE.md) retain earlier observations. Their old feature gaps, machine paths, test receipts, and PR states are historical evidence, not current work orders.

The three protected CODEX documents remain reference material with compatibility markers required by the save-version drift test. Embedded marathon instructions do not override AGENTS or expand an approved packet. Search only the relevant sections of those large files. Historical links to ignored local evidence, generated build assets, and unmerged proposals do not establish missing production dependencies.
