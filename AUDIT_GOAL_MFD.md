# MFD Audit Goal

## Mission

Determine what prevents **Mr. Football Dynasty** from becoming a legendary browser-only football dynasty sim.

This is an audit-first goal. Do **not** implement new features, refactor systems, change save schemas, or make cosmetic edits unless explicitly instructed after the audit is complete.

The audit should help Kevin decide what Codex should build next, in what order, and why.

---

## Core Question

If this game were being prepared for a public release, what would stop a player from:

1. Starting a new dynasty smoothly.
2. Understanding what to do each week.
3. Trusting the save file.
4. Enjoying the season/offseason loop.
5. Believing the AI teams are smart.
6. Feeling attached to players, teams, records, rivalries, and history.
7. Playing for 10, 25, or 50 seasons.
8. Recommending the game to another franchise-sim sicko.

---

## Audit Lenses

Audit the project through these lenses:

1. **Release readiness**  
   Can the game be safely shared with real players today?

2. **Save trust**  
   Are saves stable, versioned, migrated, exportable, importable, and protected from corruption?

3. **Weekly loop clarity**  
   Does the player always know what happened, what matters, and what the next good click is?

4. **Football simulation quality**  
   Do games, seasons, rosters, contracts, cap, injuries, trades, free agency, draft, and progression produce believable results?

5. **AI team intelligence**  
   Do CPU teams manage rosters, depth charts, contracts, trades, free agency, draft picks, and rebuild/contend windows intelligently?

6. **Feature wiring**  
   Find UI that is not backed by real data, systems that are not surfaced in UI, orphaned files, duplicate logic, dead routes, stale helpers, and half-wired mechanics.

7. **Player friction**  
   Identify screens, flows, or mechanics that are confusing, overwhelming, hidden, misleading, or under-explained.

8. **Dynasty history and immersion**  
   Does the game create long-term stories through records, awards, Hall of Fame, rivalries, team identity, player arcs, and league history?

9. **Replayability and obsession**  
   What would make someone say, “one more week,” “one more offseason,” or “one more rebuild”?

---

## Files To Read First

Read these before auditing source files:

- `AGENTS.md`
- `README.md`
- `DESIGN.md`
- `STATUS.md`
- `CHANGELOG.md`
- `CODEX_GAME_GUIDE.md`
- `CODEX_IMPROVEMENT_PLAN.md`
- Any existing release, audit, convergence, or roadmap files

Then inspect the actual code, tests, scripts, schemas, routes, and data. Source and tests are truth. Historical notes are context only.

---

## Required Audit Areas

### 1. Project Architecture

Map:

- apps
- packages
- contracts
- simulation core
- UI routes
- save/migration systems
- tests
- scripts
- generated data
- content/config files
- build and dev tooling

For each major system, identify:

- purpose
- inputs
- outputs
- dependencies
- UI surfaces
- save dependencies
- test coverage
- risk level

---

### 2. Feature Inventory

For every meaningful feature, assign a grade:

- **A** = production-ready
- **B** = strong but could improve
- **C** = functional but limited
- **D** = prototype / fragile / confusing
- **F** = broken, fake, dead, or misleading

Include:

- feature name
- player value
- implementation status
- files involved
- missing pieces
- evidence
- recommended next slice

---

### 3. Wiring Audit

Find every case where:

- UI exists but the simulation does not.
- Simulation exists but the UI does not.
- Data exists but nothing consumes it.
- Logic exists but the player never sees the result.
- Reports exist but are not connected to decisions.
- State changes happen without explanation.
- Screens appear complete but rely on placeholder values.
- Multiple systems calculate similar values differently.
- Save data is written but never read, or read but never written.

---

### 4. Player Journey Audit

Walk the game like a real player through:

- New Dynasty
- Week 1
- Regular Season
- Trade Deadline
- Playoffs
- Offseason
- Free Agency
- Draft
- Training Camp
- Preseason
- Year 2
- Year 5
- Year 10
- Year 25
- Year 50

For each stage, identify:

- what is clear
- what is confusing
- what is exciting
- what is boring
- what breaks trust
- what is missing emotionally
- what the next good click should be

---

### 5. Football Systems Audit

Evaluate:

- game simulation
- play/game results
- season simulation
- standings
- playoffs
- player progression
- aging
- injuries
- morale/personality if present
- contracts
- salary cap
- trades
- free agency
- draft
- scouting
- training
- facilities
- medical
- roster cuts
- depth charts
- Hall of Fame
- records
- awards
- league history

Identify:

- unrealistic outcomes
- dominant strategies
- exploits
- missing feedback
- disconnected mechanics
- systems that need balancing

---

### 6. AI Audit

Evaluate whether CPU teams behave intelligently in:

- roster construction
- depth chart decisions
- trades
- free agency
- draft
- cap management
- rebuild windows
- contender windows
- injury replacement
- aging veterans
- young player development

Flag:

- irrational behavior
- easy exploits
- roster deadlocks
- cap traps
- draft mistakes
- trade imbalance
- unrealistic team-building

---

### 7. Save System Audit

Review:

- current save version
- schemas
- migrations
- import/export
- local storage or persistence model
- save browser
- cartridge systems if present
- corruption risks
- schema drift
- future migration risks

Every save-related concern should be treated seriously. A dynasty sim lives or dies by save trust.

---

### 8. Release Audit

Determine whether MFD can be publicly released today.

Use this status system:

- **GREEN** = safe / ready / solid
- **YELLOW** = usable but needs improvement
- **RED** = blocker, broken, misleading, confusing, or fragile

Separate findings into:

- must fix before public release
- should fix before public release
- can fix after early public release
- long-term greatness work

---

## Required Evidence Standard

Do not make broad claims without evidence.

Every issue must include:

- exact file path(s)
- relevant function/component/test/script names when possible
- observed behavior or code evidence
- player impact
- technical impact
- severity
- recommended next vertical slice

Prefer commands and direct inspection over guesses.

---

## Required Output Files

Create or update:

- `MFD_PROJECT_MAP.md`
- `MFD_FEATURE_INVENTORY.md`
- `MFD_WIRING_AUDIT.md`
- `MFD_SAVE_SYSTEM_AUDIT.md`
- `MFD_AI_SIM_AUDIT.md`
- `MFD_PLAYER_JOURNEY_AUDIT.md`
- `MFD_RELEASE_AUDIT.md`
- `MFD_GOAT_GAP_ANALYSIS.md`
- `MFD_MASTER_AUDIT_REPORT.md`

---

## Master Report Format

`MFD_MASTER_AUDIT_REPORT.md` must include:

1. Executive summary
2. Current release verdict
3. Top 25 blockers or highest-leverage issues
4. Top 100 total findings if possible
5. RED/YELLOW/GREEN scoreboard
6. Feature grade table
7. Save-trust summary
8. AI/simulation summary
9. Player journey summary
10. GOAT gap analysis
11. Recommended next 25 Codex implementation slices

For every ranked issue include:

- severity
- title
- evidence
- affected files
- player impact
- technical impact
- recommended fix
- estimated implementation complexity

---

## Implementation Guardrail

Do not implement changes during this audit unless explicitly instructed later.

The only allowed file changes are audit/report markdown files.

The goal is to create the clearest possible map of what to fix next.
