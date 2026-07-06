# MFD GOAT Gap Analysis

Current 2026-06-24 feature ratings, green-gate snapshot, and next-AI operating guide live in `MFD_GOAT_HANDOFF_BIBLE.md`. Keep this gap analysis as a historical companion unless it has been explicitly refreshed.

Goal: identify what separates current MFD from a legendary browser-only football dynasty sim.

## Current Strengths

| Strength | Evidence | Why it matters |
| --- | --- | --- |
| Browser-only deterministic engine | `README.md:24-35`, `game-sim.ts`, `rng` rules in `AGENTS.md:27-33` | Strong technical identity. |
| Huge franchise surface | `App.tsx:167-224`, `1890-1900` | The game already has breadth: cap, draft, HOF, records, CBA, Chip, history. |
| Local and CI release gate | `scripts/release-gate.mjs:76-202`, `.github/workflows/ci.yml`, `RELEASE_CONVERGENCE.md:23` | A real shipping discipline exists and now has a remote workflow path. |
| Save import pipeline | `persistence.ts:24-41`, `db.ts:1-72` | Trust foundation is better than typical prototypes. |
| One-click combined backup | `dynasty-combined-backup.ts`, `DynastyCartridge.tsx`, `dynasty-sidecar-archive.ts` | The main `.mfd` cartridge and emotional sidecars now travel together without breaking old `.mfd` imports. |
| CPU intent ledger | `TeamNeeds.tsx`, `TeamNeeds.test.tsx` | The Team Needs route now explains a selected CPU team's saved market posture from philosophy, GM strategy, cap, needs, and trade-block flags without mutating AI state. |
| CPU strategy history | `TeamNeeds.tsx`, `TeamNeeds.test.tsx` | The Team Needs route now reads saved strategy-shift events and philosophy news into a selected CPU team's Strategy History without rerunning AI. |
| Trade-block market receipts | `TradeBlockTicker.tsx`, `TradeBlockTicker.test.tsx` | League trade-block targets now explain the saved CPU intent and valuation reason behind each visible advisory target. |
| Draft market receipts | `DraftBoard.tsx`, `DraftBoard.test.tsx` | Incoming draft war-room offers now package saved CPU reasoning, urgency, assets, and pick-chart confidence into read-only receipts before Accept or Reject. |
| Draft war-room transaction proof | `draft-war-room.ts`, `game-store.ts`, `DraftBoard.tsx`, `smoke-test-post-setup-route.mjs`, focused tests | Generated offers require source-backed live picks, future sweeteners require owned future picks, accepted live current-year offers update both team pick ledgers and `offseasonState.draftOrder` ownership, stale accepts do not commit or autosave, accepted deals write durable `leagueNews` trade receipts, `/draft` now routes post-draft players into recap finalization/review, and focused browser smokes prove the draft route plus future-sweetener accept paths. |
| Trade-deadline completed-deal receipts | `TradeDeadline.tsx`, `TradeDeadline.test.tsx` | Completed deadline deals now explain saved buyer/seller, package, grade, timing, and movement boundary before Finalize applies roster or pick changes. |
| Free-agency bid-resolution summary | `FreeAgencyHub.tsx`, `FreeAgencyHub.test.tsx` | Saved won/lost bid rows now explain who won the free-agent market, how many bids were saved, and whether the user was outbid without re-resolving the market. |
| Postgame decision receipt | `GameDayRecap.tsx`, `GameDayRecap.test.tsx` | Game Day now summarizes saved prep, health, carryover, and next-focus fields from the latest `GameDayPackage` without recalculating Film Room or mutating game state. |
| Named-game postgame memory CTA | `GameDayRecap.tsx`, `GameDayRecap.test.tsx`, `NamedGamesBrowser.tsx` | Saved named games attached to a game-day package now get an immediate archive CTA and source/no-rerun receipt on `/game-day`. |
| Record-memory postgame CTA | `GameDayRecap.tsx`, `GameDayRecap.test.tsx`, `RecordBook.tsx` | Saved record and milestone moments attached to a game-day package now get an immediate `/records` CTA and source/no-recalculation receipt on `/game-day`. |
| Game Day player-arc follow-up | `GameDayRecap.tsx`, `GameDayRecap.test.tsx` | Saved top performers, record breakers, and milestone players attached to a game-day package now get de-duplicated profile callbacks and existing Player Development / Record Book routes without writing new history. |
| Draft recap/profile/timeline/week follow-through memory links | `DraftRecap.tsx`, `DraftRecap.test.tsx`, `WeekAdvance.tsx`, `WeekAdvance.test.tsx`, `PlayerProfile.tsx`, `PlayerProfile.test.tsx`, `PlayerTimeline.tsx`, `PlayerTimeline.test.tsx` | Saved draft recap picks now link from `/draft-recap` into player profiles, show selected-class follow-through from current `game.players` on `/draft-recap`, surface as opening-window rookie follow-up on `/week-advance`, and echo into matching player profiles/timelines as `Draft Class Memory` without generating or repairing recaps. |
| Position coach lifecycle actions | `CoachingStaff.tsx`, `game-store.ts`, `position-coaches.ts`, `franchise-week.ts` | `/coaching` now lets the user initialize and upgrade saved position-coach rooms through explicit committed actions, and championship rollover advances existing saved position-coach tenure. |
| Scrapbook auto-authoring | `scrapbook.ts`, `scrapbook.test.ts`, `scrapbook-rollover.ts` | Existing league news, named-game timeline events, bloodline draft timeline events, saved individual award winners, saved story-arc beats, saved season-report grades/overviews, completed-season record notes, saved Hall of Fame inductions, and heated league-rivalry chapters now become season scrapbook moments automatically at rollover without a new save field or sidecar schema. |
| Long-horizon benchmark proof | `quality-benchmarks.ts`, `harness.ts`, `RELEASE_CONVERGENCE.md` | Release-gate `goat-release-sentinel` passed focused 4-season budget proof with 0 high anomalies, while opt-in `goat-25y` and `goat-50y` profiles completed 25/50-season runs with 0 high anomalies and all named budgets PASS. |
| Story/history systems | records, HOF, legends, bloodlines, named games, scrapbook, eras, rivalry routes | Gives raw material for obsession. |

## GOAT Gaps

| Rank | Gap | Current evidence | Why it blocks legendary status | Highest-leverage move |
| ---: | --- | --- | --- | --- |
| 1 | Long-horizon gate refresh and balance follow-through | Shadow 20y remains a frozen 800-step corpus by design. `goat-release-sentinel` now gives the release gate a runtime-bounded long-horizon budget sample with 0 high anomalies, while opt-in `goat-25y` / `goat-50y` quality profiles completed 25/50-season proof with 0 high anomalies and all named budgets PASS. Medium roster-minimum windows remain budgeted, not eliminated. | A legendary dynasty sim must keep long-save trust repeatable without making normal release checks unusably slow. | Run full 36/36 local gate proof when warranted, keep 25/50 profiles opt-in unless runtime changes, and reduce medium roster-minimum windows only through explicit balance work. |
| 2 | Backup portability edge cases | `mfd.dynastyCombinedBackup.v1` now carries the `.mfd` cartridge plus complete sidecar archive, while watch lists/preferences remain intentionally outside the complete-dynasty archive (`dynasty-combined-backup.ts`, `CODEX_GAME_GUIDE.md`) | Emotional history is now portable, but optional browser-local preferences need an explicit privacy/product decision before joining it | Decide whether watch list/preferences belong in a future opt-in bundle |
| 3 | AI explainability beyond route-local readouts | CPU philosophy/strategy exists, `/team-needs` renders a read-only intent ledger plus saved Strategy History, `/trade-block` renders market receipts, `/trades` renders generated Trade Finder receipts, `/draft` renders incoming-offer receipts, `/fa-targets` renders FA market receipts, `/trade-deadline` renders completed-deal receipts, and `/free-agency` renders saved bid-resolution summaries (`ai-philosophy.ts`, `TeamNeeds.tsx`, `TradeBlockTicker.tsx`, `TradeFinder.tsx`, `DraftBoard.tsx`, `FATargetBoard.tsx`, `TradeDeadline.tsx`, `FreeAgencyHub.tsx`) | Players must eventually see CPU plans change behavior across windows, not only route-local explanations | Change CPU trade/FA/draft behavior only with focused downstream tests, or add durable cross-window history with the full save-schema path |
| 4 | Draft-day trust | Generated draft war-room offers now require source-backed live picks, future sweeteners require owned future picks, accepted live current-year offers update team `draftPicks` plus live `offseasonState.draftOrder` ownership with stale no-op store guards, accepted deals append durable `leagueNews` trade receipts, `/draft` has a post-draft recap CTA/finalization path, `/draft-recap` links saved picks back to player profiles and now shows current-player class follow-through from `game.players`/`selectTeams`, `/week-advance` now surfaces saved recap rookies at the season-opening follow-up point, and saved draft recap picks echo into matching Player Profile `Signature Moments` plus Player Timeline `Draft Class Memory` (`draft-war-room.ts`, `game-store.ts`, `DraftBoard.tsx`, `DraftRecap.tsx`, `WeekAdvance.tsx`, `PlayerProfile.tsx`, `PlayerTimeline.tsx`, `smoke-test-post-setup-route.mjs`) | Draft is sacred in dynasty games, and the transaction/closure boundary is now trustworthy; remaining lift is broader player arcs outside recap/profile/timeline surfaces | Add broader player-arc memory or full-gate refresh when draft behavior changes |
| 5 | Player attachment engine | Many history routes are read-only/direct-only (`LegacyTimeline.tsx:229`, `nav-items.test.ts:9-35`), though Game Day now routes saved named games and record/milestone moments back to archives immediately, gives saved top performers/record breakers/milestone players profile callbacks through Player Arc Follow-Up, `/draft-recap` links saved recap picks to profiles and shows class follow-through, `/week-advance` surfaces opening-window rookie follow-up, and Player Profile plus Player Timeline echo saved draft recap picks into `Draft Class Memory` | Lists are not memories unless surfaced at emotional moments | Automatic story cards and CTAs after seasons, playoff swings, legends, and archives outside already-covered Game Day/draft surfaces |
| 6 | Weekly loop restraint | All primary nav visible; unlock metadata unused (`App.tsx:167-224`, `nav-items.test.ts:195-211`) | New players need confidence, not an operations maze | Progressive guidance without hiding depth permanently |
| 7 | High-drama mechanics are shallow | Trick plays not simulated; press is quote-only (`GamePlanSetup.tsx:626-627`, `PressConferenceModal.tsx:101-111`) | Big fantasies need consequences | Wire trick plays; add small press effects |
| 8 | Staff identity depth | Position coaches influence progression math, `/coaching` now initializes or upgrades saved `team.positionCoaches` through explicit action buttons, and championship rollover advances existing tenure, but position coaches still lack poaching, trees, and durable long-term history. | Great franchise sims make staff part of the dynasty | Position coach poaching/history and coach-tree continuity |
| 9 | Release channel enforcement | Full gate is now wired into CI, but first remote pass/protected-check status is still an operational follow-up (`.github/workflows/ci.yml`) | Public confidence needs the release gate to stay required, not merely available | Require the CI `release-gate` job after first remote pass |
| 10 | Dynasty archive authorship | HOF/legacy/scrapbook/eras are split, though scrapbook now auto-carries saved league news, named games, bloodline draft memories, individual award winners, story-arc beats, season reports, record notes, Hall of Fame inductions, and heated league-rivalry chapters, and `/game-day` now links saved named games, record/milestone moments, and player-arc follow-up rows directly back to profiles/archives | The game should write more of the legend back to the player | More auto-authored Franchise Book/scrapbook/chronicle moments from legends, player arcs, and playoff swings outside already-covered route callbacks |

## What Would Make Players Say "One More Week"

1. A weekly decision stack with real consequences: injuries, owner, cap, player morale, scouting, opponent mismatch, and one high-stakes optional bet.
2. Deeper postgame/offseason receipts that show exactly which decisions mattered beyond the shipped Game Day source/decision receipts and `/week-advance` offseason command snapshot.
3. CPU rivals with visible intent: "Detroit is all-in because their QB is 34 and cap peaks this year."
4. Player arcs that recur: grudges, mentors, agents, injuries, playoff failures, comeback seasons.
5. A single "dynasty memory" archive that follows the save everywhere.
6. Long-horizon confidence: no dread that Year 17 breaks the economy.

## What Would Make Players Say "One More Offseason"

1. Offseason dashboard with retirements, cap cliffs, expiring cores, draft needs, free-agent tiers, and owner mandate pressure.
2. Draft prospects with stories, bloodlines, volatility, and team-specific rumors.
3. Staff carousel, position coach development, and position-coach history.
4. CPU team windows changing visibly.
5. Free agency agents with grudges, loyalty, media leaks, and counterfactuals.

## What Would Make Players Recommend It

1. "My save survived 30 years and the game remembered everything."
2. "The CPU teams made moves that made sense."
3. "Every week I knew what mattered."
4. "The draft and offseason made me care about fake players."
5. "The browser save/export system never scared me."

## Top GOAT Investment Bets

| Bet | Why it compounds | Dependencies |
| --- | --- | --- |
| Long-horizon gate refresh and backup-edge polish | Converts trust into permission to obsess | Full 36-step release-gate refresh after sentinel addition, optional roster-minimum balance pass, explicit watch-list/preference portability decision |
| AI behavior proof beyond route-local receipts | Makes every AI move content | AI philosophy, GM strategy, saved bid results, downstream trade/FA/draft tests |
| Franchise book and scrapbook auto-authoring | Turns data into memory | records, HOF, rivalries, social/news, scrapbook, chronicle |
| Transactional draft/trade receipts | Fixes trust and improves drama | shipped real-backed war-room generation, live order ownership, durable accepted war-room `leagueNews` receipts, and browser accepted-offer proof; remaining trade-market receipt depth or post-draft recap payoff |
| Progressive weekly guidance | Converts breadth into approachability | nav unlock metadata, Monday Briefing, Chip |
| Staff/position coach lifecycle | Adds a second long-term roster layer | shipped initialize/upgrade actions and season-tenure rollover; remaining poaching, history, and coach-tree continuity |
