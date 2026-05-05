# MFD Public Release Readiness Matrix

Updated: 2026-05-05 18:24:09 CDT
Repo: `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`
Branch: `codex/chip-public-release-recovery`

## Summary

- Recovery status: green in clean clone; checkpoint commit `8516b05` preserves the Chip/public-release hardening baseline.
- P0 blockers: none remaining.
- Primary release strength: first-start and weekly Chip guidance now survive current-code browser play, reload, save/load, route sweep, and production preview.
- Remaining risk: bundle size warnings and deeper hands-on trade-deadline/playoff/offseason confidence.

| Feature | Status | Route / file | Evidence | Risk | P0/P1/P2 next action |
| --- | --- | --- | --- | --- | --- |
| Start / new game flow | Pass | `NewGameScreen`, setup wizard | Production preview and dev setup showed Chip onboarding and no console errors | Low | P0 none |
| First week shell | Pass | `/` Monday Briefing | Prior playthrough plus final route sweep | Low | P0 none |
| Week advance | Pass | `/week-advance` | Week 3-to-9 smoke advanced 6 weeks with no console/runtime errors | Low | P0 none |
| Monday Briefing | Pass | `/` | Desktop/mobile route sweep, multi-week smoke | Low | P0 none |
| Roster | Pass | `/roster`, `RosterManagement.tsx` | Explicit `Manage` action removed nested row/button interaction; focused and full web tests passed | Low | P0 none |
| Depth Chart | Pass | `/depth-chart` | Desktop/mobile sweep retained prior nested-button fix | Low | P0 none |
| Game Plan / coaching prep | Pass | `/game-plan` | Multi-week smoke repeatedly used Game Plan before advancing | Low | P0 none |
| Trades | Pass | `/trades` | Phone/desktop hardening pass and broad route sweep | Low | P0 none |
| Contracts / Cap Lab | Pass | `/cap-lab` | Phone/desktop hardening pass and broad route sweep | Low | P0 none |
| Save / load | Pass | `/dynasty` | Runtime smoke created manual save, reloaded browser, continued latest autosave, and loaded manual slot | Low | P0 none |
| Import / export | Pass | `/dynasty` | Runtime smoke downloaded `.mfd`, imported file, and showed safe copy for bad pasted import | Low | P0 none |
| Settings | Pass | `/settings` | Runtime smoke verified Settings after reload; route sweep found no blocking controls/errors | Low | P0 none |
| Chip controls in settings/dock | Pass | Chip dock/settings path | Runtime smoke clicked `Where am I?`, `What now?`, `Replay`, `Snooze`, and `Enable` after reload | Low | P0 none |
| Later-season feature introduction | Pass with P1 follow-up | route-coaching registry | Added beats for Inbox, Standings, Power Rankings, League Pulse/News, Record Book/Legacy, and Settings/Save Load; route-coaching tests passed | Medium | P1 deeper trade-deadline/playoff/offseason hands-on pass |
| News / league pulse | Pass | `/league-pulse`, `/news`, `/newsroom` | Route aliases and route beats added; broad route sweep passed | Low | P0 none |
| Standings / power rankings | Pass | `/standings`, `/power-rankings` | Sparse-stat standings crash fixed; route sweep passed | Low | P0 none |
| Record book / legacy | Pass | `/records`, `/legacy`, `/franchise` | Route beats added; record tracker sparse-stat crash fixed; engine tests passed | Low | P0 none |
| Accessibility basics | Pass | core routes | Desktop/mobile sweep found no unnamed visible buttons, nested interactive failures, page overflow failures, or route-blocking traps | Low | P0 none |
| Blank / loading / error states | Pass | core routes | Route sweep found no high-impact bad blank copy on checked routes; bad import uses safe player-facing copy | Low | P0 none |
| Bundle / build delivery | Pass with warning | Vite build | Final build passed; large chunk warnings persist and are documented as existing risk | Medium | P1 bundle pass if public delivery metrics require it |
| Multi-season playthrough | Pass for lock-in smoke | core routes | Current-code smoke advanced Week 3 to Week 9 and sampled 12 routes with Chip visible | Medium | P1 deeper late-season/offseason playthrough |
| Production preview | Pass | `http://localhost:4173/MFD/` | Chip-enabled fresh preview loaded, manifest `start_url`/`scope` were `/MFD/`, no console messages, TTS/share absent | Low | P0 none |
| Public release blockers | Pass | repo | Final diff check, typecheck, design-system/web/engine tests, build, browser verification all green | Low | P0 none |

## Command Evidence

- `git diff --check` — passed.
- `npx --yes pnpm@9.15.9 typecheck` — passed.
- `npx --yes pnpm@9.15.9 --filter @mfd/design-system test` — 14 files / 88 tests passed.
- `npx --yes pnpm@9.15.9 --filter @mfd/web test` — 209 files / 1292 tests passed.
- `npx --yes pnpm@9.15.9 --filter @mfd/engine test` — 201 files / 1852 tests passed.
- `npx --yes pnpm@9.15.9 build` — passed with existing chunk-size warnings.

## Save Safety

- `SAVE_VERSION` remains `35`.
- No save schema, migration, sample save fixture, deployment, production secret, or sim RNG changes were made.
- Save/load/import/export behavior was runtime-checked in the current dev build.

## Priority Readout

### P0

- None remaining.

### P1

- Deeper trade-deadline/playoff/offseason runtime pass.
- Bundle-splitting/performance pass only if public delivery metrics require it.

### P2

- TTS polish.
- Share payload expansion.
- Additional later-season Chip variants and copy flavor.
