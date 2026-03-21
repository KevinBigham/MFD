# Mr. Football Dynasty

**The ultimate browser-based football franchise management simulator.**

Build a championship dynasty from the ground up. Draft 300-prospect classes through a live war room. Navigate a $255M+ salary cap with restructures, backloads, and void years. Outsmart 29 AI GMs in trades, free agency, and coaching hires. Watch your story unfold through broadcast commentary, press conferences, rivalry sagas, and Hall of Fame inductions — all in your browser, no install required.

> **Play Now:** [mr-football-dynasty](https://kevinbigham.github.io/mr-football-dynasty/?v=20260321a)

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
- **Press Conferences** — Postgame pressers where tone affects relationships and storylines (now trigger only on significant events)
- **Rivalry Sagas** — Multi-season rivalry arcs with trash talk, revenge games, and atmosphere management
- **Story Arc Engine** — Procedurally generated narratives (comebacks, breakout seasons, locker room drama, dynasty runs)
- **Power Rankings** — Weekly rankings with analyst commentary tracking your dominance (or decline)
- **Dynasty Moments** — Memorable plays, achievements, and milestones recorded for your franchise history
- **Hall of Fame & Ring of Honor** — Induction ceremonies with Bloomberg-style ASCII plaques and legacy tracking

---

## New in the GOAT Update (v100 — March 2026)

### Ceremony Overlays — Make Peaks Feel Like Peaks
Full-screen Bloomberg Terminal-style ceremony moments for the game's biggest events:
- **Championship Victory** — Team color flash, WORLD CHAMPIONS display, MVP spotlight, dynasty index
- **Draft Pick Reveal** — 2-second "ANALYZING SCOUT DATA..." tension delay, then snap reveal with MFSN analyst quote
- **Playoff Clinch** — Amber flash with record and seed
- **Hall of Fame Induction** — ASCII terminal plaque with career stats and speech excerpt
- **Season-Ending Injury** — Red flicker injury report
- **Fired / Game Over** — Static noise, TERMINAL SESSION TERMINATED, dynasty summary

### Dynasty Cartridge — Never Lose a Save Again
- **One-click export** — Copy compressed save string to clipboard or download as `.mfd` file
- **One-click import** — Paste a string or upload a file to restore any dynasty
- **Auto-backup prompts** — Gentle reminders after championships and draft completions

### Inbox Triage — Respect Your Time
- **3-tier inbox** — Urgent (holdouts, owner demands), Decision (extensions, trades), Intel (news, recaps)
- **Clear All Intel** — One click to dismiss informational items
- **Press Conference Reform** — Only fires on significant events (blowouts, rival games, streaks, hot seat). Routine weeks get a one-line auto-summary.

### Coming Attractions — "One More Week" Engine
- **Unresolved Hooks** — After each week, see 3 real narrative hooks from your game state (holdout deadlines, upcoming rivalries, playoff math, injury returns)
- **Nemesis Tag System** — AI GMs who wrong you (playoff elimination, stolen free agents) get tagged as your Nemesis with visual indicators and narrative callbacks
- **Draft Crush** — Generational prospects previewed in MFSN news 2-3 years before they're draft-eligible

### Consequence Ribbon & Safety Checklist
- **Consequence Ribbon** — Instant feedback strip showing real deltas after every action (CAP +$12.4M, OWNER -2)
- **Week Advance Checklist** — Preflight safety check catches roster violations, unresolved holdouts, and missed settings before you sim

### Shareable Artifacts — Take Your Dynasty Social
- **Dynasty Card** — One-click clipboard export of your full dynasty stats in ASCII art format
- **Draft Ticker** — Copy a formatted one-line draft pick summary for Discord/forums
- **MFSN Front Page Recap** — Terminal-styled season summary ready to share

### Scenario Seeds — Infinite Replayability
8 pre-configured starting scenarios with dramatically different challenges:
- **Cap Hell** — $40M over the cap with aging stars
- **Fallen Dynasty** — Former champs, demanding Win-Now owner
- **The Rebuild** — Worst record, loaded with picks
- **Toxic Locker Room** — Talent riddled with divas
- **The Heir Apparent** — Elite rookie QB, 4-year window
- **Small Market Squeeze** — Tight budget, no glamour
- **Last Dance** — Legend retiring, owner demands a farewell ring

### Legacy System — Meta-Progression Across Dynasties
- **Front Office XP** — 12 achievements across all saves (Champion, GOAT Status, Cap Wizard, and more)
- **Legacy Perks** — Unlock small bonuses for new dynasties (Scout's Eye, Silver Tongue, Culture Setter)
- **Rival GM Persistence** — Bring your nemesis to the next dynasty

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite 6 | Build system with HMR |
| Vitest | Testing (1,293 tests across 257 files) |
| GitHub Pages | Deployment |
| ES Modules | Modular architecture |

**Zero external gameplay dependencies** — just React and React DOM. Everything else is hand-built.

---

## By The Numbers

| Metric | Value |
|--------|-------|
| Source files | 440+ JS/JSX |
| Extracted modules | 220+ |
| Unit tests | 1,293 |
| Core systems | 95+ |
| Narrative/data modules | 50+ |
| Ceremony overlays | 6 |
| Scenario seeds | 8 |
| Legacy achievements | 12 |
| Play designs | 40+ |
| Player traits | 25 |
| Owner archetypes | 5 |
| NFL teams | 30 |
| Draft class size | 300 prospects |
| Salary cap | $255M+ |

---

## Architecture

MFD started as a single 42,000+ line React component — a true labor-of-love monolith. It has since been modularized into 220+ extracted modules while maintaining full backward compatibility with existing saves.

**Key architectural decisions:**

- **Seeded RNG with 6 isolated channels** (gameplay, draft, trade, injury, league, weather) — same seed = same results, channels never bleed into each other
- **Hybrid architecture** — modular code validates on boot, gameplay flows through the battle-tested original engine
- **Data-driven design** — all magic numbers in config, narrative text in separate modules, play definitions in structured data
- **Barrel exports** — clean import paths across the entire codebase
- **Legacy save compatibility** — old saves always load, never break
- **Bloomberg Terminal aesthetic** — amber/gold on near-black, monospace fonts, ASCII box-drawing, no gradients

```
src/
├── config/       → Game constants & configuration (9 modules)
├── systems/      → Core game logic (95+ modules)
├── data/         → Narrative text, names, templates (50+ modules)
├── components/   → Shared UI components & overlays
├── utils/        → Helpers, seeded RNG, LZW compression
└── app/          → Application-level logic
```

---

## Development

```bash
npm install
npm run dev       # Start dev server
npm test          # Run 1,293 tests
npm run build     # Production build
```

---

## How This Was Built

This project is an experiment in **AI-collaborative game development**. The workflow:

- **ChatGPT 5.4** serves as the project architect — designing systems, planning features, and coordinating the build
- **OpenAI Codex** handles comprehensive unit testing, formula validation, and edge case identification
- **Claude Code (Opus 4.6)** drives feature implementation, modularization, bug auditing, and the GOAT Game Development Plan (8 rounds of features built in a single session)

The humans vibe. The AIs build. The games ship.

---

## Status

**Fully playable.** Modern build system. Comprehensive test coverage. Active development. GOAT Update shipped March 2026.

---

## License

This project is a personal passion project by Kevin Bigham. All rights reserved.
