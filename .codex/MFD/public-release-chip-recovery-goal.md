# MFD Public Release + Chip Recovery Goal

Started: 2026-05-05 11:09:17 CDT
Repo path: `/Users/tkevinbigham/Documents/GitHub/MFD`
Product identity: Mr. Football Dynasty / MFD
Published game link from docs: `https://kevinbigham.github.io/MFD/`
Current branch: pending safe git inspection
Checkout classification: original local checkout, treated as unsafe until git and toolchain are proven reliable

## Prior Blocker Summary

- Previous Chip marathon implemented substantial onboarding, weekly guidance, decision-impact, replay/reset/snooze, TTS, share, and feature-visibility work.
- The local checkout could not be marked release-ready because `git status` and `git diff` hung, a Git pack was reported corrupt, fresh Vitest/TypeScript/Vite commands stalled or failed before useful output, and browser inspection reached only stale `dist`.
- The stale browser build did not have Chip enabled, so no current Chip-enabled first-3-week playthrough was completed.
- Existing checkpoint: `.codex/MFD/chip-onboarding-goal.md`.

## Salvage Plan

1. Confirm this checkout is MFD and not another project.
2. Run read-only, time-boxed git inspection.
3. If git is unreliable, copy Chip-related source and `.codex/MFD` notes to a timestamped salvage folder outside the repo.
4. Clone a clean MFD recovery checkout next to this repo.
5. Reapply salvaged Chip files into a dedicated `codex/chip-public-release-recovery` branch.
6. Verify install, tests, typecheck, build, and current-code Chip browser behavior from the clean clone.

## Verification Plan

- Package install: repo-defined pnpm/npm command after clean clone.
- Targeted tests: companion/Chip, onboarding machine, route coaching, weekly guidance, decision impact, dock controls, WeekAdvance, CapLaboratory, TradeCenter, App route wiring where present.
- Full gates where practical: typecheck, lint, test, build, math-random check, bundle check.
- Browser: current source or fresh preview with `VITE_CHIP_ENABLED=true`, `VITE_CHIP_TTS_ENABLED=false`, and `VITE_MFD_SHARE_ENABLED=false`; first-3-week playthrough or documented blocker.
- Product audit: first-start clarity, weekly loop, post-week guidance, decision-impact clarity, feature visibility, tone, spam/repetition, replay/reset/snooze, runtime stability, release confidence.

## Commands Run

- `pwd`: `/Users/tkevinbigham/Documents/GitHub/MFD`.
- `ls`: showed MFD repo files including `README.md`, `apps`, `packages`, `package.json`, `pnpm-lock.yaml`, and `.codex/MFD`.
- `sed -n '1,80p' README.md`: confirmed `# Mr. Football Dynasty` and published link.
- `cat package.json`: confirmed package name `mfd`.
- `find . -maxdepth 3 ...`: found `.codex/MFD/chip-onboarding-goal.md`; no checked-in `AGENTS.md` or `CLAUDE.md` found.
- Read `README.md`, `CHANGELOG.md`, root `package.json`, `apps/web/package.json`, `apps/web/src/app/App.tsx`, and `.codex/MFD/chip-onboarding-goal.md`.

## Git Diagnosis

- `git rev-parse --show-toplevel`, `git remote -v`, `git branch --show-current`, and `git log -1 --oneline` returned normally.
- Branch: `main`.
- Last commit: `dc7740a Sprint 46: Polish standings signals (#54)`.
- `git -c core.fsmonitor=false status --short --untracked-files=no`: timed out after 30s.
- `git -c core.fsmonitor=false diff --stat`: exited 128 after 12.12s with `fatal: mmap failed: Operation canceled`.
- Conclusion: original checkout is still unsafe; do not continue build/test work here.

## Disk / Local Environment

- `df -h /Users/tkevinbigham/Documents/GitHub/MFD`: only 113 MiB available, capacity 100%.
- Partial salvage attempts using `/bin/cp -p` blocked on local file copies; no complete manifest was produced.
- `apps/web/dist` is stale generated output and 79 MiB. Because the goal forbids trusting stale `dist`, this generated output is being removed only to free MFD-local space for salvage and clean recovery.

## Salvage Results

- Complete salvage manifest created: `/Users/tkevinbigham/Documents/GitHub/MFD-chip-salvage-20260505-111937/MFD_CHIP_SALVAGE_MANIFEST.md`.
- Salvage folder: `/Users/tkevinbigham/Documents/GitHub/MFD-chip-salvage-20260505-111937`.
- Method: targeted `ditto --norsrc --noextattr`, no git diff/status dependency.
- Copied: 8 files.
- Missing: 0 files.
- Failed: 0 files.
- Unreadable/timeouts: 62 files.
- Readable salvaged files include `.codex/MFD/chip-onboarding-goal.md`, this recovery log, `chipShare`, `chipVoice`, `featureVisibilityMatrix`, and `WeekAdvance.tsx`.
- Important blocker: most companion, route-coaching, App, TradeCenter, CapLab, and test files timed out on direct file copy/read. The clean clone must preserve readable salvage and reconstruct missing Chip behavior from the checkpoint/spec rather than trusting the original checkout as a complete source.

## Clean Clone Results

Pending.

## Test / Build / Browser Results

Pending.

## Product Playthrough Notes

Pending.

## Remaining Issues

### P0

- Pending recovery verification.

### P1

- Pending recovery verification.

### P2

- Pending recovery verification.

## Exact Resume Instructions

1. Work only on MFD.
2. Re-read this file and `.codex/MFD/chip-onboarding-goal.md`.
3. Continue from the latest non-pending section.
4. If the original checkout is still corrupt, do not build inside it; salvage and continue in `../MFD-clean-chip-recovery`.
5. Do not mark release-ready until current-code Chip-enabled browser verification and clean command evidence exist.
