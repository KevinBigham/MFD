# Mr. Football Dynasty

**The ultimate browser-based football franchise management simulator.**

Build a championship dynasty from the ground up. Draft 300-prospect classes through a live war room. Navigate a $255M+ salary cap with restructures, backloads, and void years. Outsmart 29 AI GMs in trades, free agency, and coaching hires. Watch your story unfold through broadcast commentary, press conferences, rivalry sagas, and Hall of Fame inductions — all in your browser, no install required.

> **Play Now:** [mr-football-dynasty](https://kevinbigham.github.io/mr-football-dynasty/?v=0c82c6c)

---

## What Is This?

Mr. Football Dynasty is a deep, narrative-driven football management sim where you are the GM. Every decision matters — from draft-day trade-ups to halftime adjustments to whether you restructure your franchise QB's contract or let him walk in free agency.

This isn't a stats spreadsheet. It's a living football world with broadcast networks, locker room drama, owner mandates, coaching trees, and dynasty legacies that span decades.

### Core Gameplay Loop

- **Draft War Room** — 7-round drafts with 300 prospects, live trade offers, MFSN broadcast coverage, and bust/steal reveals
- **Salary Cap Management** — Full NFL-style economics: restructures, backloading, void years, franchise tags, dead money, and compensatory pick formulas
- **Trade Engine** — AI-driven trade proposals with counter-offers, value calculations, and deadline frenzy mechanics
- **Free Agency** — Multi-round bidding, restricted free agent tenders, team visits, and market dynamics
- **Game Simulation** — Play-by-play engine with 40+ play designs, scheme counters, halftime adjustments, momentum swings, and weather effects
- **Coaching System** — Hire/fire head coaches, coordinators, and position coaches with archetypes, skill trees, and coaching DNA lineage
- **Scouting Network** — Deploy scouts with accuracy/confidence modeling, film breakdown, and intelligence reports
- **Owner Dynamics** — 5 owner archetypes (Win-Now, Patient Builder, Profit-First, Fan-Favorite, Legacy Builder) with approval ratings, mandates, and hot-seat mechanics

### The Narrative Engine

What makes MFD different is that every season tells a story:

- **MFSN Broadcast Network** — Multiple broadcast voices providing real-time color commentary on your games
- **Press Conferences** — Postgame pressers where tone affects relationships and storylines
- **Rivalry Sagas** — Multi-season rivalry arcs with trash talk, revenge games, and atmosphere management
- **Story Arc Engine** — Procedurally generated narratives (comebacks, breakout seasons, locker room drama, dynasty runs)
- **Power Rankings** — Weekly rankings with analyst commentary tracking your dominance (or decline)
- **Dynasty Moments** — Memorable plays, achievements, and milestones recorded for your franchise history
- **Hall of Fame & Ring of Honor** — Induction ceremonies and legacy tracking across eras

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite 6 | Build system with HMR |
| Vitest | Testing (2,446 tests) |
| GitHub Pages | Deployment |
| ES Modules | Modular architecture |

**Zero external gameplay dependencies** — just React and React DOM. Everything else is hand-built.

---

## By The Numbers

| Metric | Value |
|--------|-------|
| Source files | 427 JS/JSX |
| Extracted modules | 212 |
| Unit tests | 2,446 |
| Core systems | 91 |
| Narrative/data modules | 50+ |
| Play designs | 40+ |
| Player traits | 25 |
| Owner archetypes | 5 |
| NFL teams | 30 |
| Draft class size | 300 prospects |
| Salary cap | $255M+ |

---

## Architecture

MFD started as a single 46,127-line React component — a true labor-of-love monolith. It has since been modularized into 212 extracted modules while maintaining full backward compatibility with existing saves.

**Key architectural decisions:**

- **Seeded RNG with 6 isolated channels** (gameplay, draft, trade, injury, league, weather) — same seed = same results, channels never bleed into each other
- **Hybrid architecture** — modular code validates on boot, gameplay flows through the battle-tested original engine
- **Data-driven design** — all magic numbers in config, narrative text in separate modules, play definitions in structured data
- **Barrel exports** — clean import paths across the entire codebase
- **Legacy save compatibility** — old saves always load, never break

```
src/
├── config/       → Game constants & configuration (9 modules)
├── systems/      → Core game logic (91 modules, 8,200+ lines)
├── data/         → Narrative text, names, templates (50+ modules)
├── components/   → Shared UI components
├── utils/        → Helpers, seeded RNG, LZW compression
└── app/          → Application-level logic
```

---

## Development

```bash
npm install
npm run dev       # Start dev server
npm test          # Run 2,446 tests
npm run build     # Production build
```

---

## How This Was Built

This project is an experiment in **AI-collaborative game development**. The workflow:

- **ChatGPT 5.4** serves as the project architect — designing systems, planning features, and coordinating the build
- **OpenAI Codex** handles comprehensive unit testing (2,446 tests), formula validation, and edge case identification
- **Claude Code** drives modularization, build system setup, integration testing, and feature implementation

The humans vibe. The AIs build. The games ship.

---

## Status

**Fully playable.** Modern build system. Comprehensive test coverage. Active development.

---

## License

This project is a personal passion project by Kevin Bigham. All rights reserved.
