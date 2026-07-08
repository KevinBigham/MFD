# Mr. Football Dynasty

Browser-based football franchise dynasty simulation. Build a team, manage the cap, survive the media cycle, and carry one save across seasons.

**Version:** v1.0.0  
**Play:** [kevinbigham.github.io/MFD](https://kevinbigham.github.io/MFD/)

## Screenshots

| Dashboard | Standings |
|---|---|
| ![MFD dashboard](apps/web/public/screenshots/v1/dashboard-desktop.png) | ![MFD standings](apps/web/public/screenshots/v1/standings.png) |

| Game Flow | Play-by-Play |
|---|---|
| ![MFD game flow](apps/web/public/screenshots/v1/game-flow.png) | ![MFD play-by-play](apps/web/public/screenshots/v1/play-by-play.png) |

More release shots:

- [GM career](apps/web/public/screenshots/v1/franchise-career.png)
- [Mobile dashboard](apps/web/public/screenshots/v1/dashboard-mobile.png)

## What It Is

MFD is a single-player franchise sim with deterministic seasons, seeded RNG, stable saves, and a client-side TypeScript engine.

- Draft, develop, extend, trade, and cut players across long-running dynasties.
- Manage cap space, dead money, restructures, extensions, franchise tags, CBA pressure, and owner patience.
- Build coaching staffs, weekly prep, game plans, locker room chemistry, facilities, and scouting departments.
- Watch games through broadcast packages, game flow, play-by-play, standings, records, awards, and media-cycle fallout.
- Preserve careers through Hall of Fame, franchise legends, bloodlines, timelines, scrapbook entries, and GM career history.

What it is not: a multiplayer service, a card collector, or a server-backed live-ops game. Everything runs in the browser.

## Start A Dynasty

1. Open [MFD](https://kevinbigham.github.io/MFD/).
2. Pick a franchise and difficulty, or launch the convention demo.
3. Finish setup, advance weeks, and make decisions when the dashboard flags them.
4. Use Save/Load to export portable dynasty backups before switching browsers or machines.

## Tech Stack

TypeScript monorepo, pure engine package, React 19 web app, Zustand state, Dexie/IndexedDB saves, Vite build, Vitest coverage, GitHub Pages deploy.

## Contributor Setup

```bash
git clone git@github.com:KevinBigham/MFD.git
cd MFD/mfd
pnpm install

pnpm dev
pnpm --filter @mfd/engine test
pnpm --filter @mfd/web test
pnpm -r typecheck
pnpm --filter @mfd/web build
```

Launch gates:

```bash
bash scripts/check-math-random.sh
bash scripts/check-bundle-size.sh
bash scripts/smoke-full-season.sh
pnpm playtest:all
```

## Release Notes

See [CHANGELOG.md](CHANGELOG.md). Current development uses save schema v37 with media-cycle caps and event-log retention.

## License

Private project by Kevin Bigham.
