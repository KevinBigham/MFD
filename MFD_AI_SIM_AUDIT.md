# MFD AI And Simulation Audit

Verdict: YELLOW. The football and CPU management systems are real and broad, with deterministic release tooling and a 10-season fast tier showing zero high anomalies. The gaps are not "fake sim"; they are depth, explainability, long-horizon proof, and several high-emotion systems that are shallow or disconnected.

## Football Simulation Scoreboard

| System | Grade | Evidence | Notes |
| --- | --- | --- | --- |
| Core game sim | B | `game-sim.ts:884-1247` | Drive loop, weather, special teams, MVPs, contingencies, stats. |
| Game plan | B | `game-sim.ts:888-1011`, `game-plan.ts` | Plans and contingencies affect sim; trick plays do not. |
| Weather | B | `game-sim.ts:121-140` | Weather adjusts pass/run/fumble/FG; direct weather route exists. |
| Special teams | B | `game-sim.ts:1196-1206` | Return TDs affect score; route feedback could improve. |
| Playoffs | B | `franchise-week.ts:146-159`, `playoff-bracket.ts` | Bracket and momentum systems present. |
| Progression/development | B | `progression.ts:204-220`, `player-development.ts` | Position coach bonus exists; staff lifecycle incomplete. |
| Injuries/fatigue | B | `game-sim.ts:11`, `franchise-week.ts:123-127` | Unavailability and fatigue bonuses wired; long-horizon balance unproven. |
| Contracts/cap | A | `RELEASE_CONVERGENCE.md:19`, contract/cap systems | Strong G3 matrix evidence. |
| Trades | B | `trade-market.ts:352-477`, `trade-negotiation.ts` | Real, but intent/receipts/exploit coverage need improvement. |
| Free agency | B | `offseason.ts:1338-1377`, `1608-1625` | Real agent/offer mechanics; CPU behavior could explain more. |
| Draft | C/B | `draft-war-room.ts:154-223`, `334-378` | Draft systems broad; war-room trade acceptance is a concrete gap. |
| Long-horizon sim | C | `_canon/seeds/mfd/README.md:23-29`, `RELEASE_CONVERGENCE.md:64-67` | 10-season fast tier is clean; true 20/25/50 proof missing. |

## CPU Team AI Scoreboard

| AI area | Grade | Evidence | Risk |
| --- | --- | --- | --- |
| Rebuild/contend/fire-sale philosophy | B | `ai-philosophy.ts:60-138` | Good model; player-facing intent history is thin. |
| GM strategy shifts | B | `gm-strategies.ts:151-181` | Strategy events and tradeBlock flags; needs history/why UI. |
| Team needs analysis | B | `team-needs.ts:121-163` | Solid roster/cap report; route is read-only and cache-sensitive. |
| Trade offer generation | B | `trade-market.ts:352-403` | Need/value driven; capped and user-centered. |
| Trade acceptance/application | B/C | `trade-market.ts:406-477` | Mutates rosters/picks/news/social; `EngineOutput.events` unused. |
| Draft trade offers | D | `draft-war-room.ts:72-94`, `354-378` | Synthesized candidates and no-op draft-order update. |
| Agent negotiation | B | `player-agents.ts:89-247` | Agent demand, patience, holdouts, media leaks. |
| Free agency/offseason CPU | B | `offseason.ts:1412-1625` | Applies philosophies, strategies, trade offers, teamNeedsCache reset. |
| Waiver/practice squad AI | B | `franchise-week.ts:74`, `practice-squad.ts` | Present, needs more visible explanations. |
| Depth chart CPU | C | Source exists, but audited UI evidence is limited | Needs explicit CPU lineup/depth trust readouts. |

## High-Confidence Findings

| ID | Severity | Finding | Evidence | Player impact | Technical impact | Recommended slice |
| --- | --- | --- | --- | --- | --- | --- |
| A01 | HIGH | Draft war-room trade acceptance can desync draft order from pick assets | `draft-war-room.ts:354-378`, `game-store.ts:2320-2332` | Draft day trust break | State divergence | Transactional draft trade engine + tests |
| A02 | HIGH | Trick plays are not part of live game simulation | `GamePlanSetup.tsx:626-627`, `trick-plays.test.ts:198-230` | Choice feels cosmetic | Saved prep field lacks sim consumer | Integrate helper into drive loop |
| A03 | HIGH | Long-horizon balance is not proven past 10 clean seasons | `_canon/seeds/mfd/README.md:23-29`, `RELEASE_CONVERGENCE.md:64-67` | Deep dynasty players lack trust | Late-stage economy/history bugs can hide | 25-year and 50-year soak with anomaly budgets |
| A04 | MEDIUM | CPU intent is modeled but not explained enough across surfaces | `ai-philosophy.ts:123-134`, `gm-strategies.ts:166-177`, `TeamNeeds.tsx:153-157` | Players may not believe CPU teams are smart | AI state changes lack durable read model | CPU intent ledger and last-change reasons |
| A05 | MEDIUM | Trade engine returns empty `events`/`consequences` for accepted offers | `trade-market.ts:406-477` | Receipts can be inconsistent route-to-route | EngineOutput contract underused | Shared action receipt model |
| A06 | MEDIUM | Position coaches influence progression but lack lifecycle | `progression.ts:204-220`, `CoachingStaff.tsx:540-541` | Hidden/dead-feeling development lever | Optional state lacks seeding/commands | Seed/hire/upgrade position coaches |
| A07 | MEDIUM | Team Needs reports do not trigger AI recalculation from UI | `TeamNeeds.tsx:153-157`, `400-415` | Intent page may feel static | Cache/read-only boundary | Add recompute/explain command or clear timing |
| A08 | MEDIUM | Press conferences do not affect news/social/owner/player state | `PressConferenceModal.tsx:101-111`, `game-store.ts:2623-2631` | Roleplay lacks stakes | No consequence hooks | Add optional tiered morale/media effects |
| A09 | MEDIUM | Draft-war-room offer generator can use synthesized candidates | `draft-war-room.ts:72-94` | Non-real offers risk | Pick transfer no-op risk | Only generate transferable assets |
| A10 | MEDIUM | Shadow baseline contains 508 high anomalies by design | `RELEASE_CONVERGENCE.md:64-67` | Could be misread as acceptable long-run output | Drift detector not quality certificate | Separate quality soak from drift baseline |

## AI Believability Review

What works:

- CPU philosophy is derived from recent records, cap stress, roster age, and playoff appearances (`ai-philosophy.ts:60-100`).
- Non-user teams are skipped for user-controlled strategy changes and news is recorded on philosophy shifts (`ai-philosophy.ts:102-138`).
- GM strategy shifts use win percentage, roster average OVR, age, young stars, and recent franchise trends (`gm-strategies.ts:109-181`).
- Trade offers consider user trade block, position need, philosophy, rebuild/fire-sale posture, picks, conditional picks, and value evaluation (`trade-market.ts:155-256`, `294-403`).
- Free agency/offseason invokes agent initialization, strategy reevaluation, philosophy application, trade offers, and cache reset (`offseason.ts:1447`, `1590-1601`, `1614-1625`).

What blocks "smart AI" perception:

- CPU intent changes are scattered into news/headlines rather than a durable, inspectable "why this team is buying/selling" ledger.
- Trade/draft/free-agency decisions need visible acceptance thresholds, strategy labels, and cap pressure explanations.
- CPU lineup/depth decisions are not surfaced with enough confidence to prove teams avoid roster deadlocks.
- Long-horizon anomaly proof is insufficient for Year 25/50 claims.

## Balance And Exploit Risk

| Risk | Evidence | Why it matters |
| --- | --- | --- |
| Draft trade exploit/desync | `draft-war-room.ts:354-378` | Draft day is high leverage; any desync harms save trust. |
| Trick-play expectation exploit | `GamePlanSetup.tsx:626-627` | Players can spend attention on a non-impactful choice. |
| Trade offer simplification | `trade-market.ts:352-403` | Six offers and positionNeed heuristic may be exploitable. |
| Long-horizon cap/roster health | `_canon/seeds/mfd/README.md:23-29` | 50-year players need proof of generational turnover. |
| Sidecar history not in save | `DynastyCartridge.tsx:354-358` | Dynasty attachment systems can vanish on machine move. |

## Recommended AI/Sim Slices

1. Fix draft-war-room trade acceptance and add generated-offer application tests.
2. Wire trick plays into `game-sim.ts` with bounded frequency and postgame receipts.
3. Add a CPU intent ledger that records philosophy, strategy, key needs, cap posture, and last action reason.
4. Add a 25-year and 50-year deterministic soak with anomaly budgets separate from shadow drift.
5. Add shared action receipts for trades, draft trades, FA signings, cuts, depth changes, and press responses.
6. Add position coach lifecycle: seed, hire, upgrade, offseason development, and UI commands.
7. Expand trade-value fuzzing around cap, picks, aging veterans, and scenario constraints.
8. Add lineup/depth validity reports for CPU teams.

