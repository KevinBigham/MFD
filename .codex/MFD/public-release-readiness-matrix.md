# MFD Public Release Readiness Matrix

Updated: 2026-05-05 19:49:59 CDT
Repo: `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`
Branch: `codex/chip-public-release-recovery`

## Summary

- Recovery status: green in clean clone; checkpoint commit `8516b05` preserves the Chip/public-release hardening baseline.
- P0 blockers: none remaining.
- Primary release strength: first-start, weekly Chip guidance, save/load/import/export trust, live Week 9 trade-deadline state, and production preview all survived current-code verification.
- Remaining risk: existing bundle size warnings and deeper postseason/offseason content depth.

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
- `npx --yes pnpm@9.15.9 --filter @mfd/web test` — 209 files / 1294 tests passed in the final rerun.
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

## Late-Season Release Rehearsal Matrix — 2026-05-05

| Feature | Status | Route / file | Evidence | Risk | P0/P1/P2 next action |
| --- | --- | --- | --- | --- | --- |
| Trade deadline | Pass with P1 follow-up | `/trades`, `/trade-deadline`, `TradeCenter.tsx` | Week 14 convention demo showed `Deadline Passed`, closed trade window, direct proposal shell, empty offers, idle deadline route, Chip visible, no crash | Medium | P1: test a live Week 9 countdown in a future hands-on pass |
| Playoff race | Pass | `/`, `/standings`, `/league-pulse`, `/week-advance` | Week 14 demo loaded 9-4 race, division chase copy, standings, pulse, and Week Advance stakes | Low | P0 none |
| Postseason entry | Pass | `/week-advance`, `/franchise/playoff-lore` | Advanced from Week 18 to Week 19 playoffs, then through one playoff game; no transition crash | Low | P2 deeper postseason presentation |
| Offseason teaser | Pass with P2 follow-up | `/draft`, `/scouting`, `/super-bowl` | Draft/scouting loaded safely before offseason; Super Bowl placeholder explained not-yet-played state | Medium | P2 deeper offseason/draft playable pass |
| Scouting | Pass | `/scouting` | Route loaded with board-size, actions, workouts, scout budget, filters, and no crash | Low | P0 none |
| Draft | Pass | `/draft` | Route loaded during regular-season/playoff phase with phase-gated empty state and no crash | Low | P0 none |
| Standings | Pass | `/standings`, `standings.ts` | Late-season and playoff samples loaded division tables and playoff picture; no sparse-stat crash | Low | P0 none |
| Power Rankings | Pass | `/power-rankings` | Empty/not-yet-generated state was clear and stable | Low | P0 none |
| League Pulse / News | Pass | `/league-pulse` | Rivalry heat and post-playoff rivalry movement loaded without console errors | Low | P0 none |
| Record Book / Legacy | Pass | `/records`, `/legacy`, `record-tracker.ts` | Record Book and Legacy loaded with empty states and no crash | Low | P0 none |
| Save/load/import-export | Pass with P1 fixed | `/dynasty`, `DynastyCartridge.tsx` | Manual save slot created; clipboard export fallback patched and focused test passed | Medium | P1: recheck invalid paste copy in a clean browser pass |
| Production preview | Pass | `/MFD/` | Fresh flagged build and preview loaded `http://localhost:4173/MFD/`; Chip dock appeared on sampled late-season routes; manifest returned JSON; no `localhost:4173` console warnings/errors | Low | P0 none; document that Chip flag must be set at build time |
| Bundle delivery | Pass with warning | `apps/web/vite.config.ts` | Baseline build passed; existing `index` and `engine` chunk warnings persist | Medium | P1 only if public metrics require bundle work |
| Kevin playtest script | Pass | `docs/release/KEVIN_PLAYTEST_SCRIPT.md` | New practical playtest path added | Low | P0 none |
| Public release handoff | Pass | `docs/release/MFD_RELEASE_CANDIDATE_HANDOFF.md` | New handoff added with branch, commands, risks, and no-push/no-deploy notes | Low | P0 none |

## Final Ship-Decision Matrix — 2026-05-05

| Feature | Status | Evidence | Risk | Next action | Ship impact |
| --- | --- | --- | --- | --- | --- |
| Live Week 9 trade-deadline countdown | Pass | Dev browser reached deterministic Week 9 regular season with active deadline state: 4:00 remaining, `CALM`, one pending offer, ticker copy, Accept/Reject controls, no console warnings/errors | Low | Kevin can spot-check Trade Deadline during playtest if desired | Non-blocker |
| Trade Center live deadline context | Pass | `/trades` showed `Deadline Live`, open trade window, no-offer empty state, `Propose Trade`, Decision Impact, and future pick/contract cost copy | Low | None before Kevin playtest | Non-blocker |
| Invalid import copy | Pass | Wrong-format JSON now shows `That file does not look like a valid MFD save. Your current dynasty was not changed. Try exporting again or choose a different file.` | Low | Keep exact copy in Kevin playtest | Non-blocker |
| Save/load/import/export | Pass | Invalid attempts left seed `808` / Week `9` unchanged; valid cartridge imported successfully afterward; focused test added | Low | Kevin should export/import once in 45-minute playtest | Non-blocker |
| Flagged production build | Pass with warning | `VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false npx --yes pnpm@9.15.9 build` passed with existing chunk warning | Medium | Bundle work only if real delivery metrics demand it | Non-blocker |
| Production preview `/MFD/` | Pass | `http://localhost:4173/MFD/` loaded after flagged build; clean first-run screen rendered; Week 14 demo launched; release routes, invalid import copy, Chip dock/actions, mobile spot checks, and console checks passed | Low | Recheck before any deploy | Non-blocker |
| Bundle warnings | Pass with warning | Vite warns about `index` and `engine` chunks above 500 kB; no new blocker found | Medium | Defer bundle splitting to post-release metrics slice | Non-blocker |
| Public manifest/assets | Pass | `/MFD/manifest.json` returned `application/json`; asset scripts used `/MFD/assets/...`; no `.map`, `.mfd`, `.env`, or obvious secret tokens found in `apps/web/dist` | Low | Recheck from final deploy target later | Non-blocker |
| Chip enabled at build time | Pass | Flagged build plus preview showed Chip; docs state `VITE_CHIP_ENABLED` must be set during build | Low | Kevin/deploy operator must use flagged build command | Required deploy step |
| TTS/share disabled flags | Pass | Preview found no TTS/share button labels with disabled flags | Low | Keep disabled until dedicated polish | Non-blocker |
| Kevin playtest script | Pass | `docs/release/MFD_FINAL_SHIP_DECISION.md` contains 45-minute path; existing script remains available | Low | Kevin runs playtest before ship/no-ship call | Required human gate |
| Final ship-decision doc | Pass | `docs/release/MFD_FINAL_SHIP_DECISION.md` created with recommendation, commands, checklist, deploy checklist, rollback notes | Low | Kevin reads before playtest | Required human gate |
| Release handoff | Pass | Handoff notes updated by final pass docs and this matrix | Low | Claude Code review can focus on docs + tiny import copy patch | Non-blocker |
| Deploy checklist | Pass | Final doc includes verify/build/preview/no-secrets/push-after-approval/deploy-after-approval checklist | Low | Use only after Kevin approval | Required deploy step |
| Remaining P1s | Pass | No unresolved P1s remain from this final pass; bundle review remains metrics-driven only | Low | None before Kevin playtest | Non-blocker |
| Remaining P2s | Documented | More Chip variants, TTS polish, share expansion, deeper postseason/offseason/draft, broader mobile parity | Medium | Post-release sprint backlog | Non-blocker |
