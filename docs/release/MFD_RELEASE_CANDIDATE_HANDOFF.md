# MFD Release Candidate Handoff

Date: 2026-05-05
Repo: `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`
Branch: `codex/chip-public-release-recovery`
Starting commit for this rehearsal: `0eed2cf`

## Release Confidence

Status: ship candidate, ready for Kevin playtest.

The release candidate passed baseline typecheck, design-system tests, web tests, engine tests, and build before the late-season rehearsal edits. Runtime rehearsal used Chip enabled with TTS/share disabled. No P0 blockers were found.

Final ship-decision pass: ship candidate after Kevin playtest. The pass verified the live Week 9 trade-deadline countdown in the running app, fixed clean-browser invalid import copy, reran focused Dynasty Cartridge coverage, rebuilt standard and flagged production bundles, and previewed `/MFD/` from the flagged build.

Do not use, repair, clean, delete, or edit the corrupt original checkout at `/Users/tkevinbigham/Documents/GitHub/MFD`.

## What Changed In This Rehearsal

- Added a guarded clipboard-export fallback in `DynastyCartridge` so browser clipboard permission denial does not leave an uncaught console error.
- Added focused test coverage for the clipboard fallback message.
- Added Kevin playtest script and this release-candidate handoff.
- Updated `.codex/MFD` release goal and readiness matrix with late-season rehearsal evidence.

## Local Run

```bash
npx --yes pnpm@9.15.9 install
VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false \
npx --yes pnpm@9.15.9 --filter @mfd/web dev -- --host 127.0.0.1
```

Open the actual Vite URL, usually `http://localhost:5173/MFD/`.

## Production Preview

```bash
VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false \
npx --yes pnpm@9.15.9 build

VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false \
npx --yes pnpm@9.15.9 --filter @mfd/web preview -- --host 127.0.0.1
```

Open the actual Vite preview URL and verify `/MFD/`.

Note: `VITE_CHIP_ENABLED` is a Vite build-time flag. Set it on the build command, not only on preview.

## Passed In Final Rerun

- `git diff --check`
- `npx --yes pnpm@9.15.9 typecheck`
- `npx --yes pnpm@9.15.9 --filter @mfd/design-system test`
- `npx --yes pnpm@9.15.9 --filter @mfd/web test`
- `npx --yes pnpm@9.15.9 --filter @mfd/engine test`
- `npx --yes pnpm@9.15.9 build`
- `VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false npx --yes pnpm@9.15.9 build`
- Focused `DynastyCartridge` test after clipboard fallback patch.
- Production preview at `http://localhost:4173/MFD/` with Chip visible on sampled late-season routes, `/MFD/manifest.json` returning JSON, `/MFD/assets/...` paths, and no preview console warnings/errors.

## Known P1/P2

- P1: none open from the final ship-decision pass.
- P2: postseason can be richer beyond playoff-lore cards and the Super Bowl placeholder.
- P2: offseason and draft can support a deeper playable package after release.
- P2: TTS/share polish and more Chip variants remain behind later slices.
- P2: larger bundle splitting remains deferred; current Vite chunk-size warnings are existing and should be revisited only if public delivery metrics require it.

## Final Ship-Decision Package

- Final doc: `docs/release/MFD_FINAL_SHIP_DECISION.md`
- Playtest script: `docs/release/KEVIN_PLAYTEST_SCRIPT.md`
- Readiness matrix: `.codex/MFD/public-release-readiness-matrix.md`
- Evidence folder: `.codex/MFD/evidence/final-ship-decision-20260505-193901/`

## Push / Deploy

No push performed.
No deploy performed.
No production secrets touched.
No `SAVE_VERSION` or save schema change.
