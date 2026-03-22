# Mr. Football Dynasty

**The ultimate browser-based football franchise management simulator.**

Build a championship dynasty from the ground up. Draft 300-prospect classes through a live war room. Navigate a $255M+ salary cap with restructures, backloads, and void years. Outsmart 29 AI GMs in trades, free agency, and coaching hires. Watch your story unfold through broadcast commentary, press conferences, rivalry sagas, and Hall of Fame inductions — all in your browser, no install required.

> **Play Now:** [mr-football-dynasty](https://kevinbigham.github.io/mr-football-dynasty/?v=20260321c)

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
- **Hall of Fame & Ring of Honor** — Induction ceremonies with Bloomberg-style ASCII plaques and legacy tracking

---

## New in the GOAT Update (v100 — March 2026)

### Ceremony Overlays — Make Peaks Feel Like Peaks
Full-screen Bloomberg Terminal-style ceremony moments for the game's biggest events:
- **Championship Victory** — Team color flash, WORLD CHAMPIONS display, MVP spotlight, dynasty index
- **Draft Pick Reveal** — 2-second tension delay, then snap reveal with MFSN analyst quote
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
- **Press Conference Reform** — Only fires on significant events

### Coming Attractions — "One More Week" Engine
- **Unresolved Hooks** — Narrative hooks from your game state after each week
- **Nemesis Tag System** — AI GMs who wrong you get tagged with visual indicators
- **Draft Crush** — Generational prospects previewed years before draft eligibility

### Consequence Ribbon & Safety Checklist
- **Consequence Ribbon** — Instant feedback strip showing real deltas after every action
- **Week Advance Checklist** — Preflight safety check before simming

### Shareable Artifacts — Take Your Dynasty Social
- **Dynasty Card** — One-click clipboard export of dynasty stats in ASCII art
- **Draft Ticker** — Formatted draft pick summary for Discord/forums
- **MFSN Front Page Recap** — Terminal-styled season summary ready to share

### Scenario Seeds — Infinite Replayability
8 pre-configured starting scenarios with dramatically different challenges:
Cap Hell, Fallen Dynasty, The Rebuild, Toxic Locker Room, The Heir Apparent, Small Market Squeeze, Last Dance, and more.

### Legacy System — Meta-Progression Across Dynasties
- **Front Office XP** — 12 achievements across all saves
- **Legacy Perks** — Unlock bonuses for new dynasties
- **Rival GM Persistence** — Bring your nemesis to the next dynasty

---

## Terminal Maximalism 2.0 — UI Evolution (Sprint 9-18)

A 10-sprint UI overhaul introducing 7 best-in-class open-source libraries, all wrapped in MFD adapter components with the Terminal Maximalism design language (amber/gold on near-black, monospace data, sharp Bloomberg-style corners).

### New UI Component Library (15 adapter components)

| Component | Powered By | Purpose |
|-----------|-----------|---------|
| LucideIcon | lucide-react | 48-icon SVG registry replacing emoji in UI chrome |
| MfdToaster | sonner | Modern toast notifications with type-coded styling |
| Dialog | @radix-ui/react-dialog | Accessible modals with focus trapping and ESC |
| DropdownMenu | @radix-ui/react-dropdown-menu | Keyboard-navigable dropdown menus |
| Select | @radix-ui/react-select | Accessible select inputs with search |
| AnimatedPresence | motion (Framer Motion) | Enter/exit transitions for screen swaps |
| AnimatedPanel | motion | Keyed panel fade+slide animations |
| AnimatedList | motion | Staggered list item enter/exit |
| DataTable | @tanstack/react-table | Sortable, filterable data grids |
| LineChart | @nivo/line | Lazy-loaded trend visualization |
| BarChart | @nivo/bar | Lazy-loaded cap/stat breakdowns |
| RadarChart | @nivo/radar | Lazy-loaded scouting profiles |
| DraggableList | @dnd-kit | Drag-and-drop reordering with keyboard support |
| useBreakpoint | custom | Responsive layout hook (mobile/tablet/desktop) |

### What Changed In The Monolith

- **40+ emoji** replaced with crisp Lucide SVG icons across buttons, headers, badges
- **15+ title=** attributes replaced with rich Tooltip hover cards
- **8 player name locations** wrapped with HoverCard (roster, scouting, depth chart, trade, FA)
- **HOME dashboard** upgraded with KpiCard + KpiGrid
- **Roster cap bar** replaced with RingProgress (multi-section ring)
- **Indicator badges** on Inbox/Trade tabs showing unread counts
- **LoadingButton** on the main action FAB
- **Modal** upgraded to Radix Dialog (focus trapping, ESC, screen-reader support)
- **Debug ribbon removed** — clean game-only view

---

## Sprint 9: Determinism & Balance Blitz

A deep code review uncovered 34 `Math.random()` violations breaking the seeded RNG contract, plus multiple exploitable game balance issues. This sprint fixed them all.

### Determinism Restored
- **34 Math.random() callsites eliminated** — every random call now routes through the 7-channel seeded RNG system (play, ai, ui, draft, injury, dev, trade)
- **Grep audit test** — automated test that fails if `Math.random()` ever reappears in the codebase

### Game Balance Fixes
- **Trade acceptance threshold** raised from 90% to 95% — closes low-ball exploit
- **Trade cap-hit formula** fixed — expensive contracts now properly penalized (was reversed)
- **Trick play nerf** — Jet Sweep max yards 18→14, WR Reverse 22→16, Hail Mary INT rate 12%→18%
- **Sack rate boost** — base rate 5%→6%, OL-DL modifier doubled — pass rush matters more
- **Incompletion cap** raised 75%→85% — elite defense can shut down passing games
- **QB draft board bonus** — +12 value for QB prospects, AI now properly values franchise QBs
- **Rookie difficulty fixed** — tradeMod was 0.85 (harder!), now 1.15 (easier, as intended)
- **Owner patience rebalanced** — drain rates reduced ~30%, playoff appearances add +15 buffer

---

## Sprint 10: Onboarding Overhaul — 3-Step Wizard

Replaced the overwhelming 7-screen onboarding with a clean 3-step guided wizard.

### Before (too much)
Title → Team Pick → Draft Mode (5 options) → Game Guide (7 tabs, 100+ items) → FO Setup (8 roles) → Draft → Play

### After (just right)
Title → **Step 1: Pick Team** → **Step 2: Choose Style** → **Step 3: Quick Tips** → Play!

### The 3 Steps
1. **Pick Your Team** — Clean 30-team flat grid, one click to select
2. **Choose Your Style** — 3 cards combining difficulty + draft mode:
   - Easy (Rookie + pre-built roster, instant Week 1)
   - Standard (Pro + 10-pick snake draft)
   - Challenge (All-Pro + full 53-man draft)
   - Hidden Legend toggle (Legend + auction draft) for veterans
3. **Quick Tips** — 5 swipeable cards covering core gameplay essentials

Advanced Options link preserves full access to God Mode, League DNA, FO Setup, and all 5 original draft modes for power users.

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite 6 | Build system with HMR |
| Vitest | Testing (1,373 tests across 279 files) |
| Lucide React | SVG icon system |
| Sonner | Toast notifications |
| Radix UI | Accessible dialog, dropdown, select, popover, tabs |
| Motion (Framer) | Layout animations and transitions |
| TanStack Table | Headless data grid |
| nivo | Data visualization (lazy-loaded) |
| dnd-kit | Drag-and-drop |
| GitHub Pages | Deployment |

---

## By The Numbers

| Metric | Value |
|--------|-------|
| Source files | 490+ JS/JSX |
| Extracted modules | 220+ |
| UI components | 45+ |
| Unit tests | 1,373 |
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

MFD started as a single 43,000+ line React component — a true labor-of-love monolith. It has since been modularized into 220+ extracted modules while maintaining full backward compatibility with existing saves.

**Key architectural decisions:**

- **Seeded RNG with 7 isolated channels** (play, draft, trade, injury, ai, dev, ui) — same seed = same results, zero Math.random() in codebase
- **Hybrid architecture** — modular code validates on boot, gameplay flows through the battle-tested original engine
- **Adapter-first UI** — every external library wrapped in MFD adapters using theme tokens, never imported directly
- **Inline styles only** — no CSS files, all styling via JavaScript objects with centralized theme tokens
- **Lazy-loaded charts** — nivo charts load on-demand, zero impact on initial bundle
- **Legacy save compatibility** — old saves always load, never break (SAVE_VERSION = 986)
- **Terminal Maximalism aesthetic** — amber/gold on near-black, IBM Plex fonts, sharp corners, atmospheric depth

```
src/
├── config/       → Game constants, theme tokens, configuration
├── systems/      → Core game logic (95+ modules)
├── data/         → Narrative text, names, templates (50+ modules)
├── components/   → 45+ UI components, overlays, chart adapters
├── utils/        → Helpers, seeded RNG, LZW compression
└── app/          → Application launcher, play screen, nav
```

---

## Development

```bash
npm install
npm run dev       # Start dev server on port 3000
npm test          # Run 1,373 tests
npm run build     # Production build
```

---

## How This Was Built

This project is an experiment in **AI-collaborative game development**. The workflow:

- **ChatGPT 5.4 Pro** serves as the project architect — designing systems, planning features, and coordinating the build
- **OpenAI Codex 5.4** handles code implementation, testing, and module extraction
- **Claude Code (Opus 4.6)** drives feature implementation, UI evolution, bug auditing, and the 10-sprint Terminal Maximalism 2.0 overhaul
- **Claude Cowork (Opus 4.6)** manages operations, process, and git workflow

The humans vibe. The AIs build. The games ship.

---

## Status

**Fully playable.** Modern build system. 1,373 tests across 279 files. Active development. GOAT Update + Terminal Maximalism 2.0 + Determinism & Balance Blitz + Onboarding Wizard shipped March 2026.

---

## License

This project is a personal passion project by Kevin Bigham. All rights reserved.
