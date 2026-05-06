# Kevin Playtest Script

Goal: decide ship / no-ship for the MFD public release candidate.

Use only:

`/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`

Do not use:

`/Users/tkevinbigham/Documents/GitHub/MFD`

## Start

```bash
VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false \
npx --yes pnpm@9.15.9 --filter @mfd/web dev -- --host 127.0.0.1
```

Open the Vite URL, usually `http://localhost:5173/MFD/`.

## First 10 Minutes

1. Start a fresh dynasty.
2. Confirm Chip welcomes you during setup.
3. Finish setup without fighting the UI.
4. Confirm Monday Briefing appears.
5. Read Chip's first post-setup guidance.
6. Visit Roster.
7. Visit Depth Chart.
8. Visit Game Plan.
9. Visit Week Advance.
10. Advance Week 1.
11. Confirm post-week Chip guidance changes.

## Core Loop

1. Save the game from Save/Load.
2. Reload the page.
3. Continue the latest autosave.
4. Load the manual save slot.
5. Use Settings and Chip controls.
6. Visit Trade Center.
7. Visit Cap Lab.
8. Check Standings.
9. Check Power Rankings.
10. Check League Pulse.
11. Check Record Book and Legacy.

## Late Season

Fast path: launch the Convention Demo from the title screen.

1. Confirm Week 14 playoff-race setup is understandable.
2. Visit Trade Center and confirm deadline status is clear.
3. Visit Week Advance and read Decision Impact.
4. Visit Standings and confirm the playoff picture matters.
5. Visit League Pulse and Power Rankings.
6. Advance toward playoffs if practical.
7. Visit Playoff Lore after a playoff game.
8. Visit Super Bowl and confirm the empty state is acceptable if it has not been played.
9. Visit Scouting and Draft and confirm the route states are clear.

## Save / Export

1. Create Save Slot.
2. Click Copy Cartridge.
3. If the browser blocks clipboard, use Download `.mfd`.
4. Try Upload `.mfd Backup` or paste a backup code in a clean browser session.

## Review Checklist

- Did I ever wonder what to click next?
- Did Chip help without annoying me?
- Did decisions feel consequential?
- Did the weekly loop stay clear after Week 1?
- Did standings and playoff pressure matter?
- Did trade deadline copy make the window clear?
- Did scouting/draft feel like future roster planning, not noise?
- Did save/load feel safe?
- Did the game feel realistic and cinematic?
- Did anything feel embarrassing for public release?

## Ship Call

Ship if no P0 appears and the first hour feels guided, stable, and worth continuing.

Do not ship if save/load breaks, Week Advance breaks, Chip blocks core actions, production preview fails, or a late-season route crashes.
