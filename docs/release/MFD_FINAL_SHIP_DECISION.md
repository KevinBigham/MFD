# MFD Final Ship Decision

Date: 2026-05-05 19:49:59 CDT
Repo: `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`
Branch: `codex/chip-public-release-recovery`
Starting commit: `ea1d7a2`
Evidence folder: `.codex/MFD/evidence/final-ship-decision-20260505-193901/`

Do not use, repair, clean, delete, or edit the corrupt original checkout at `/Users/tkevinbigham/Documents/GitHub/MFD`.

## Current Recommendation

Ship candidate after Kevin playtest.

No P0 blockers were found in the final pass. The two known P1s were resolved or made release-safe: live Week 9 deadline UI was verified in the running app, and invalid import copy now stays calm and save-safe. The remaining risks are public-delivery chunk size warnings and deeper offseason/postseason depth, both acceptable non-blockers for this candidate.

## How To Run Locally

```bash
VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false \
npx --yes pnpm@9.15.9 --filter @mfd/web dev -- --host 127.0.0.1
```

Open the printed Vite URL, usually `http://localhost:5173/MFD/`.

## How To Run Production Preview

```bash
VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false \
npx --yes pnpm@9.15.9 build

VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false \
npx --yes pnpm@9.15.9 --filter @mfd/web preview -- --host 127.0.0.1
```

Open the printed preview URL, usually `http://localhost:4173/MFD/`.

`VITE_CHIP_ENABLED` is a build-time flag. Set it on the build command.

## Kevin's 45-Minute Playtest

1. Start a fresh dynasty.
2. Confirm Chip welcomes you during setup.
3. Finish setup and land on Monday Briefing.
4. Read Monday Briefing and Chip's first post-setup guidance.
5. Visit Roster.
6. Visit Depth Chart.
7. Visit Game Plan.
8. Advance Week 1.
9. Confirm Chip explains what changed after the week.
10. Visit Trade Center.
11. Visit Cap Lab.
12. Create a save slot.
13. Reload the page.
14. Continue the latest autosave.
15. Load the manual save slot.
16. Export a cartridge or download `.mfd`.
17. Import the valid exported cartridge.
18. Try invalid import text and confirm this message: `That file does not look like a valid MFD save. Your current dynasty was not changed. Try exporting again or choose a different file.`
19. If a Week 9 fixture or dev save is provided, load it and check the live trade-deadline countdown, trade impact, and cap/future-cost copy. Do not block ship only because there is no public Week 9 jump button.
20. Launch the Convention Demo for the Week 14 late-season path.
21. Check Trade Center, Standings, Power Rankings, League Pulse, Records, Scouting, and Draft.
22. Advance into the playoff sample if practical.
23. Visit Playoff Lore and Super Bowl.
24. Try mobile width once.
25. Write down any moment where you ask, `What do I click next?`

## Ship / Hold Checklist

Ship only if:

- no crash appears in the first hour;
- save, load, export, and import all feel trustworthy;
- `/MFD/` production preview loads;
- Chip appears and helps without blocking play;
- Week 1 does not leave you stuck;
- trade, cap, standings, records, scouting, and draft routes load;
- public copy is not embarrassing;
- you enjoy the game enough to play again.

Hold if any P0 appears: build failure, production preview failure, missing Chip when enabled, save/load/import/export failure, corrupted save state, broken Week Advance, Trade Center crash, Cap Lab crash, standings/records crash, broken `/MFD/` asset path, `SAVE_VERSION` change, save schema change, RNG/determinism change, secret exposure, push/deploy without approval, or use of the corrupt original checkout.

## Known Non-Blockers

- Existing Vite chunk-size warnings remain and should be watched after public traffic, not fixed in this final pass.
- TTS and share are scaffolded but intentionally disabled by default.
- Deeper postseason and offseason content can grow after release.
- More Chip route/copy variants can be added after release.
- Full mobile parity is still a later polish slice; the final pass only spot-checked phone width.

## Deploy Checklist For Later

Do not deploy from this pass. When Kevin approves a release:

- verify the active repo is `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`;
- verify branch `codex/chip-public-release-recovery`;
- verify the final commit list and no unexpected dirty files;
- exclude evidence, `.mfd`, screenshots, `dist`, `node_modules`, caches, and secrets;
- run `git diff --check`;
- run `npx --yes pnpm@9.15.9 typecheck`;
- run `npx --yes pnpm@9.15.9 --filter @mfd/design-system test`;
- run `npx --yes pnpm@9.15.9 --filter @mfd/web test`;
- run `npx --yes pnpm@9.15.9 --filter @mfd/engine test`;
- run `npx --yes pnpm@9.15.9 build`;
- run `VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false npx --yes pnpm@9.15.9 build`;
- preview `/MFD/` from the flagged build;
- confirm `manifest.json` is JSON and `/MFD/assets/...` paths resolve;
- confirm no obvious secrets or production data are in `apps/web/dist`;
- confirm the GitHub Pages target;
- push only after Kevin approval;
- deploy only after Kevin approval.

## Rollback / Safety

Keep the previous published game available until the new `/MFD/` smoke passes. Tag the release commit before any deploy. Before public smoke, keep at least one local `.mfd` export from the previous live build so a long-running dynasty can be recovered if a deployment has to roll back.

## Final Notes

Review the first 10 minutes first: setup, Monday Briefing, Chip, Game Plan, Week Advance, and Save/Load. If that loop feels clear and the final checklist stays green, the release candidate is ready to ship.
