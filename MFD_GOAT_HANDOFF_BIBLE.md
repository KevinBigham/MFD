# MFD GOAT Handoff Bible

Last updated: 2026-07-21

Workspace inspected for the GOAT master-plan build: `/Users/tkevinbigham/Downloads/MFD-main`

Purpose: give the next AI friend a clear, current, source-backed map of what MFD already does, how ready each feature feels, what evidence matters, and where the highest-leverage future work lives.

## Current Shipped-State Snapshot

- Product: browser-only single-player football franchise dynasty sim.
- Public play link from README: `https://kevinbigham.github.io/MFD/`.
- Latest targeted player-attachment slice added Game Day Player Arc Follow-Up to `/game-day`: `GameDayRecap.tsx` reads saved `GameDayPackage.topPerformers`, `recordsMoments`, and `milestoneMoments` through `buildGameDayPlayerArcFollowUps`, de-duplicates player ids, links saved player rows to profiles with `PixelPlayerLink`, keeps record/milestone narratives and top-performer stat lines, and routes only to existing Player Development or Record Book screens. It is read-only display: no player history, timeline, scrapbook, record/milestone, game-day package, autosave, route, sim, RNG, or sidecar writer runs on render. The prior targeted player-attachment slice added current-player class follow-through to `/draft-recap`: `DraftRecap.tsx` reads the selected saved user-team `draftRecaps` row plus current `game.players` and `selectTeams` through `buildDraftRecapFollowThrough`, then renders a read-only `Class Follow-Through` panel with de-duplicated top pick, best value, reach watch, and steal follow-up rows, profile links, current team, current OVR, age, experience, and OVR delta. Missing live player rows are labeled without inferring retirements, releases, or history events. The prior targeted player-attachment slice added saved draft-recap rookie follow-up to `/week-advance`: `WeekAdvance.tsx` reads saved user-team `draftRecaps` through `selectDraftRecaps` and renders a read-only `Rookie Class Follow-Up` panel during training camp, preseason, or regular-season Weeks 1-4, linking de-duplicated top pick, best value, reach watch, and steal follow-up rows to existing profile/development/training/draft recap routes. The prior targeted recap slice added saved draft-recap profile links to `/draft-recap`: `DraftRecap.tsx` renders best value, biggest reach, steals, league highlights, and Pick By Pick player names through `PixelPlayerLink` using saved recap `playerId`/`playerName`/`ovr`, and labels player profile links as selected-recap presentation in `Draft Recap Sources`. The prior targeted timeline slice added saved draft-recap callback memory to `/player/$playerId/timeline`: `PlayerTimeline.tsx` reads user-team `draftRecaps` through `selectDraftRecaps`, renders a matching pick as `Draft Class Memory`, and labels the saved draft-recap source/no-render-write boundary in `Timeline Sources`. The prior targeted player-profile slice added the same saved recap callback to `/player/$playerId` Signature Moments and Profile Sources. The prior targeted draft closure slice added a `Draft Closure` panel on `/draft` during `phase = post_draft`: it routes to `/draft-recap` when the current-year user recap is saved, or calls the existing `advanceWeek` post-draft finalization path before routing when the recap is not archived yet. The prior targeted draft trust slice added durable accepted-trade receipts for draft war-room offers: after a valid accepted offer transfers real `draftPicks` and updates current-year `offseasonState.draftOrder`, `draft-war-room.ts` writes a deterministic `draft-trade-*` `leagueNews` trade item through existing `recordNewsItem`. `SMOKE_DRAFT_WAR_ROOM_TRADE=1` stages a source-backed generated `/draft` offer with live CPU pick #9 plus an owned future round 3 sweetener, clicks the route's `Accept` button, verifies team `draftPicks`, live draft-order owner/id updates, the saved receipt in the latest autosave, hard-reloads, and sees zero browser errors.
  The preceding draft trust proof removed fabricated war-room offer packages: generated draft trade-down offers require real live draft-order rows backed by source `draftPicks`, and future round sweeteners appear only when the source team owns a transferable future pick. Prior draft trust proof made accepted live draft war-room offers transactional across team `draftPicks` and current-year `offseasonState.draftOrder` owner/id entries; stale/no-op accepts now return the original engine state and the web store skips war-room rebuild, trade audio, commit, and autosave. Prior targeted tooling proof promoted a runtime-bounded long-horizon quality-budget sample into the release gate: `goat-release-sentinel` is a 4-season `SPEEDRUNNER` seed-42 benchmark with `MAX_PLAYTEST_STEPS`, `saveRoundTripEvery=10`, the same named budget domains as the GOAT stress profiles, a 120 roster-minimum budget, and zero high-severity tolerance. The current uninterrupted gate passed it with 4/4 seasons, 113 weeks, 53 medium signals, 0 high, 1,910/1,910 CPU receipts, zero starter shortages, and every named budget PASS. Prior targeted route proof made saved position-coach tenure legible on `/coaching`: `Coaching Source Context` and the `Position Coach Report` footer now name championship rollover as the saved-tenure source and preserve the no-render-write boundary. Prior staff-lifecycle proof wired saved position-coach tenure into championship rollover: `advanceSeasonEndCoaching` now calls existing `advancePositionCoachSeason` for teams with saved `team.positionCoaches`, incrementing `yearsWithTeam` before the next offseason year. Prior Game Day route proofs added read-only record/milestone and named-game archive CTAs. Latest targeted pure-engine memory proof before that expanded `buildScrapbookEntry` so completed-season scrapbook entries auto-author notable moments from saved `leagueNews`, named-game `dynastyTimeline` events, bloodline `draft_pick` timeline events, individual `game.awardsHistory` winners, saved `game.storyArcs` stage beats, saved `game.seasonReports` grades/Season Overview summaries, `franchiseHistory.recordsBroken`, saved `game.hallOfFame` inductions, and heated `game.leagueRivalries` rows for the recap team/year. Opt-in long-horizon proof remains green with 0 high-severity anomalies: the prior `goat-25y` receipt completed 25/25 seasons in 743 weeks with 403 medium signals, while the current 50-year receipt completed 50/50 seasons in 1493 weeks with 1303 medium signals, 0 starter shortages, and 67,800/67,800 CPU transaction receipts.
- Save schema: `SAVE_VERSION = 37`.
- Package manager: `pnpm@9.15.9`; in this shell, use `corepack pnpm`.
- Git: this extracted checkout has no `.git`; do not assume `git status` works.
- Build artifact: `apps/web/dist/index.html` and current hashed assets were rebuilt by the passing 37-step release gate; engine gzip is 310 KB against the 312 KB ceiling.
- Release gates: `RELEASE_CONVERGENCE.md` marks G1-G7 GREEN.
- Full local release command: `node scripts/release-gate.mjs`.
- Completion receipt: `MFD_GOAT_COMPLETION_REPORT.md` records all 28 plan deliverables, save safety, formulas, 50-year performance, headed screenshots, and remaining remote-only handoff work.
- CI release gate: `.github/workflows/ci.yml` now runs `node scripts/release-gate.mjs` as a dependent `release-gate` job after fast CI and determinism pass, with `workflow_dispatch` available for manual remote proof.
- Current release contract: 37 steps. The current uninterrupted receipt is 37/37 in 1997.8 seconds; historical 35/35 and focused sentinel proof predate the GOAT master-plan build.

## How To Read The Ratings

Scores are 1-10 engineering/product judgment based on current docs, route registration, feature folders, engine systems, tests, and release-gate evidence. They are not player telemetry.

- Effectiveness: does the feature solve the player job clearly?
- Fun: does it create franchise-sim emotion, tension, or "one more week" pull?
- Wiring: is it actually connected through engine/store/route/persistence/tests/smokes?
- GOAT-readiness: how close it feels to legendary public-release quality, not just "it mounts."

Score bands:

- 9-10: Green. Strong enough to trust, extend, and show players.
- 7-8: Yellow-green. Real and useful, but polish, explainability, or depth can still compound.
- 5-6: Yellow. Functional but thin, hidden, or not yet exciting.
- 1-4: Red. Prototype, misleading, broken, or risky.

## Overall Read

MFD is public-release ready locally, and unusually broad for a browser-only franchise sim. The biggest win is no longer "make the game start"; that is green. The next level is making the breadth feel authored, inevitable, and emotionally sticky.

Overall GOAT-readiness: 9.4/10.

The game now has a canonical seeded snap ledger, five-room GM shell, durable CPU FranchisePlans, universal decision receipts, hard roster/ecology certification, and a memory graph on top of its deterministic seasons and stable saves. Remaining work after this packet is additive polish and telemetry-driven balance, not missing master-plan architecture.

## Feature Scoreboard

### Launch, Setup, Guidance, And Core Week

| Feature | Effectiveness | Fun | Wiring | GOAT | Read | Best next lift |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Title / New Dynasty entry | 9 | 8 | 9 | 8 | Public link, local build, setup smokes, and launch docs are coherent. | Keep first-screen hierarchy tight after any new mode is added. |
| Franchise select / team identity | 8 | 8 | 8 | 8 | 32 team content files, logos, colors, divisions, and filters are real. | Keep sorting/filtering behavior tested when team UI changes. |
| Difficulty / setup path selection | 9 | 7 | 9 | 8 | Standard/Fast Lane/scenario boundaries are documented and tested. | Better explain what Fast Lane skips without creating fear. |
| Full Setup wizard | 9 | 8 | 10 | 9 | G1 desktop/mobile proof reaches playable Year 1 Week 1. | Preserve the current smoke as blocking proof after setup edits. |
| Assistant GM hire | 9 | 8 | 9 | 8 | Recently polished for Chip prominence, consequences, and mobile scroll. | Add more candidate personality payoff later, not more filler. |
| Setup phases: intel, roster, coach, scout, schemes, lineup, cap, goals, blueprint | 9 | 8 | 9 | 8 | Engine read models and setup UI phases are wired and source-guarded. | Make each phase leave a memorable receipt in the final setup blueprint. |
| Chip intro / first-ten onboarding | 9 | 8 | 9 | 8 | Chip has intro, dismiss/restore, receipts, route guidance, and smoke proof. | Keep copy consequence-first; stop auditing wording unless a real stale phrase appears. |
| Chip Dock / Ask Chip / not-now behavior | 9 | 8 | 10 | 9 | Mute, receipts, restore handle, keyboard, reduced motion, and hard reload are covered. | Add optional player-facing "why this matters this week" history if requested. |
| Monday Briefing | 10 | 8 | 10 | 9 | Living Week board has Must Do / Recommended / Optional with what/why/consequence/where. | Add more post-action "done because..." receipts, not parallel state. |
| Action Center | 10 | 8 | 10 | 9 | Weekly guidance preserves freedom and only true blockers prevent advance. | Continue deriving from live state. |
| Inbox / decision queue | 8 | 7 | 8 | 7 | Route, decision messages, deadlines, and Chip summaries exist. | Durable read/defer state would make it feel more trustworthy. |
| Watch List | 8 | 7 | 8 | 7 | Registered route and scouting/acquisition use cases exist. | Add weekly reminder hooks for watched players near deadlines/draft. |
| Week Advance | 10 | 9 | 10 | 9 | G4 and G7 prove multi-year advance, same-seed replay, migration, Zod, no week-advance `Math.random`, and `/week-advance` now has an offseason command snapshot plus opening-window rookie class follow-up over saved draft recaps. | Treat behavior changes here as high-risk and rerun G4/release gate; read-only route snapshots can stay focused. |
| Post-week / recap command flow | 9 | 8 | 9 | 8 | Chip and Monday copy point to recap, injuries, morale, lineup, and game-plan consequences; `/game-day` now shows saved-package `Postgame Source Receipt`, `Postgame Decision Receipt`, and saved player-arc follow-up panels. | Make deeper decision-causality receipts more emotional only when backed by new saved inputs. |

### Team, Roster, Staff, And Development

| Feature | Effectiveness | Fun | Wiring | GOAT | Read | Best next lift |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Roster management | 9 | 8 | 10 | 9 | Primary route, source-backed selectors, G3 roster path proof. | Add stronger compare/actions from player cards without clutter. |
| Player profile | 8 | 8 | 8 | 8 | Player routes, timeline, profile systems, injuries, awards, and memory hooks exist. | Surface "why I care about this player" moments more often. |
| Player timeline | 8 | 8 | 8 | 8 | Direct route and dynasty-memory helpers are present. | Push big timeline events from game recap/season recap CTAs. |
| Player comparison | 8 | 7 | 8 | 7 | Registered route and compare context exist. | Add clearer decision use: extension, trade, depth, draft replacement. |
| Depth Chart | 9 | 7 | 10 | 8 | G3 proves depth path; weekly guidance names lineup consequences. | More formation/role validation would raise it from strong to elite. |
| Special teams roles | 8 | 7 | 8 | 8 | Sim and depth surfaces cover special teams. | Explain returner/kicker/coverage tradeoffs before kickoff. |
| Training / weekly prep | 9 | 8 | 10 | 8 | G3 proves training/prep path; game-plan guidance names locks. | Add stronger before/after receipts for prep decisions. |
| Game Plan | 9 | 8 | 10 | 9 | Core weekly route, setup smoke, and G3 weekly prep proof. | Keep consequence copy clear when adding tactics. |
| Contingencies | 8 | 8 | 9 | 8 | Contingency builder and sim hooks exist. | Postgame should show which contingency fired and why. |
| Trick plays | 9 | 9 | 10 | 9 | Planned trick situations execute as bounded canonical snap events with turnover/upside/tendency cost, broadcast lines, and postgame receipts. | Add authored play variants only when each retains seeded outcome tests. |
| Injuries / IR / medical | 9 | 7 | 10 | 8 | G3 proves IR/medical/staff path; weekly guidance names injury consequences. | Add a season-long medical ROI view. |
| Fatigue / snap management | 9 | 8 | 10 | 9 | Canonical snap allocation, weekly prep, injury availability, and game-plan receipts share the production ledger. | Keep calibration and no-regression performance gates blocking. |
| Player development | 8 | 8 | 8 | 8 | Development route and engine progression systems exist. | Tie growth to mentors, coaches, snaps, and training receipts. |
| Training Camp | 8 | 8 | 9 | 8 | Feature route and engine camp systems exist. | Make camp stories persist into player timelines. |
| Locker Room | 8 | 8 | 8 | 8 | Morale/chemistry systems and route guidance exist. | Make morale actions show exact weekly opportunity cost. |
| Coaching staff | 8 | 8 | 9 | 8 | Staff/facility/medical path is covered by G3; `/coaching` now has HC/OC/DC actions, clinic/skill receipts, position-coach initialize/upgrade actions, source copy for the tenure lifecycle, and championship rollover advances existing position-coach tenure. | Position-coach poaching/history and coach-tree continuity are the best staff-depth upgrades. |
| Coaching tree | 8 | 8 | 8 | 7 | Direct route and coach legacy systems exist. | Surface it from coaching when a staff member matters. |
| Coaching relationships | 7 | 7 | 8 | 7 | Direct route and relationship graph exist. | Explain consequences in player-facing terms. |
| Alumni mentors | 8 | 8 | 9 | 8 | Route guidance and focused tests were recently tightened. | Add longer-term mentor payoff history. |
| Facilities / medical investment | 8 | 7 | 9 | 8 | G3 proves staff/facility/medical workflow. | Add ROI timelines and owner/cap tradeoff framing. |

### Money, Contracts, Owner, And Business

| Feature | Effectiveness | Fun | Wiring | GOAT | Read | Best next lift |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Contracts hub | 10 | 8 | 10 | 9 | G3 covers extensions, tags, restructures, cuts, and persistence. | Keep cap math tests mandatory after edits. |
| Standard and Post-June-1 cuts | 10 | 8 | 10 | 9 | G3 football-ops matrix proves both. | Add clearer "future dead money" education for new players. |
| Extensions | 10 | 8 | 10 | 9 | G3 proves extension path. | Add agent/personality context on the offer screen. |
| Franchise tag | 9 | 8 | 9 | 8 | Contract/governance systems cover it. | Compare tag vs extension vs let-walk outcomes. |
| Restructure / backload / void years | 10 | 8 | 10 | 9 | G3 proves restructure and backload/void paths. | Keep warnings blunt about future cap pain. |
| Cap Lab batch planning | 9 | 8 | 10 | 9 | G3 proves batch flow. | Add one-click "explain this plan" summary. |
| Front Office contract tools | 9 | 8 | 10 | 9 | G3 plus route guidance prove cap/contract operations. | Keep destructive actions visibly reversible only where true. |
| Owner expectations / patience | 8 | 8 | 9 | 8 | Owner route, mandates, and Chip consequence copy are active. | Add clearer owner patience forecast before Advance Week. |
| Handshakes / promises | 8 | 8 | 9 | 8 | Route and weekly consequence copy name promise/deadline lock. | Add "at risk" owner/player promise alerting. |
| Endorsements | 7 | 7 | 8 | 7 | Registered route and business engine system exist. | Tie revenue to facilities, owner, or market identity more visibly. |
| Relocation | 7 | 8 | 7 | 7 | Direct route exists and franchise business systems are present. | Needs careful public-facing stakes before expansion. |
| Expansion draft | 7 | 8 | 8 | 7 | Direct route and engine system exist. | Better onboarding and save safety proof if expanded. |

### Acquisition, Offseason, Draft, And AI Teams

| Feature | Effectiveness | Fun | Wiring | GOAT | Read | Best next lift |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Trades | 9 | 9 | 10 | 9 | G3 proves trade/counter/block path, and Trade Finder rows now show generated-offer receipts. | Deeper trade-value audit work only with focused balance tests. |
| Trade Block | 9 | 8 | 10 | 9 | G3 proves block/counter persistence, and league ticker rows now show saved-intent market receipts. | Improve behavior only if offer balance evidence justifies it. |
| Trade deadline | 8 | 9 | 8 | 8 | Direct route and deadline systems exist; completed-deal rows now show saved-field Deadline Deal Receipts before Finalize applies movement. | Add a dramatic but safe deadline command deck. |
| Conditional picks | 8 | 8 | 8 | 8 | Engine systems exist and route context has been improved. | Make conditions obvious in trade receipts and draft recap. |
| Free Agency | 9 | 9 | 10 | 9 | G3 proves re-sign, bid, open-market, and street signing paths; FA target rows show market receipts, and `/free-agency` now shows saved bid-resolution summaries. | Add strategy-history context or deeper CPU bidding behavior only with focused tests. |
| FA target board | 8 | 7 | 8 | 8 | Route and planning systems exist. | Make target reminders appear at offseason decision points. |
| Waiver Wire | 9 | 7 | 10 | 8 | G3 proves waiver claim path. | Explain claim priority and CPU claims better. |
| Practice Squad | 8 | 7 | 10 | 8 | G3 proves add/elevate/release path. | Make PS development and poaching risk visible. |
| Scouting | 9 | 8 | 9 | 8 | G3 proves draft/scouting path; content/report copy was tightened. | Stronger scout identity and year-over-year report accuracy. |
| Draft Board | 9 | 9 | 9 | 8 | Draft/scouting smoke, G4 multi-year proof, and focused war-room accept smoke cover core flow; incoming war-room offers show Draft Market Receipts, generated offers are real-backed, accepted live offers update live draft order ownership through `/draft`, accepted deals write durable `leagueNews` trade receipts, and `/draft` now has a post-draft recap CTA/finalization panel. | Add prospect memory if the product needs more closure. |
| Draft War Room / trade offers | 8 | 9 | 9 | 8 | Generated offers require live source-backed picks, future sweeteners require owned future picks, accepted current-year offers update pick ledgers plus `offseasonState.draftOrder` transactionally, stale accepts do not commit, accepted deals write durable news receipts, and the focused `/draft` smoke proves a future-sweetener accept plus receipt survives hard reload. | Next trust lift is broader release proof or post-draft payoff, not redoing accepted-offer receipts. |
| Draft Recap | 8 | 8 | 8 | 8 | Direct route, saved recap systems, source panel, route coaching, `/draft` post-draft CTA, saved-pick profile links, current-player `Class Follow-Through`, `/week-advance` rookie class follow-up, and Player Profile/Timeline draft-class memory callbacks are wired. | Add broader player arcs outside already covered draft and Game Day surfaces. |
| Compensatory picks | 8 | 7 | 9 | 8 | G4 diagnosis/fix path exists in current gate history. | Keep old-save and deterministic coverage around any formula changes. |
| Team Needs | 8 | 7 | 9 | 8 | Route, cache invalidation, comparison filters, scenario planning copy, read-only CPU intent ledger, and saved Strategy History display exist. | Next lift is a deliberate recompute trigger or deeper behavior only if source ownership stays clear. |
| CPU GM strategy / philosophy | 8 | 7 | 8 | 8 | AI strategy systems exist, and `/team-needs`, `/trade-block`, `/trades`, `/draft`, `/fa-targets`, completed deadline deals, and `/free-agency` bid results now expose saved intent/read-model reasons and saved event/news history without mutating AI state. | Behavior changes only with focused downstream tests, or durable history with schema/migration coverage. |
| Offseason calendar | 8 | 8 | 9 | 8 | Selectors and action routes are guarded. | Make offseason "next decision" as legible as Monday Briefing. |

### Game Day, Broadcast, Analytics, And League Context

| Feature | Effectiveness | Fun | Wiring | GOAT | Read | Best next lift |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Game simulation | 9 | 9 | 10 | 9 | Engine sim, special teams, weather, fatigue, and deterministic gates exist. | Add deeper long-horizon balance reports only when changing formulas. |
| Game Day route | 9 | 8 | 9 | 8 | G6 route proof and route guidance cover game-day context; saved package source/decision receipts now make prep, health, carryover, and next focus easier to scan, saved named games get an immediate archive CTA, saved record/milestone moments get a Record Book CTA, and saved top performer/record/milestone players now get profile callbacks through Player Arc Follow-Up. | Add richer emotional payoff after playoff swings outside already covered Game Day follow-up. |
| Broadcast | 8 | 9 | 9 | 8 | Broadcast routes, commentary, presentation systems, and Chip reactions exist. | Clarify what is replayable/exported vs lightweight recap. |
| Presentation / cinematic layer | 8 | 9 | 8 | 8 | Registered route and broadcast presentation components exist. | More authored moments after championships and rival games. |
| Play-by-Play | 8 | 8 | 9 | 8 | Registered route with sim output. | Better search/filter for decisive plays. |
| Game Flow | 8 | 8 | 9 | 8 | Registered route with drive/swing data. | Attach "this changed because..." receipts from prep/contingencies. |
| Film Room | 8 | 8 | 8 | 8 | Route and analysis systems exist. | Convert analysis into next-week Game Plan suggestions. |
| Schedule | 9 | 7 | 9 | 8 | Registered route and weekly flow integration. | Add future opponent prep links. |
| Weather | 8 | 7 | 8 | 8 | Direct route plus regional weather and sim hooks. | Better Game Plan CTA when weather is extreme. |
| Super Bowl | 7 | 9 | 7 | 7 | Registered route and engine systems exist. | More ceremony/broadcast/postseason payoff. |
| Standings | 9 | 7 | 10 | 9 | Core league route and visual smoke evidence. | Add rivalry/playoff race storytelling. |
| Power Rankings | 8 | 8 | 9 | 8 | Route and media cycle systems exist. | Add causal rank-change labels. |
| League Pulse | 8 | 8 | 9 | 8 | Route and league news/social systems exist. | Link pulses to actionable routes. |
| Analytics | 8 | 7 | 9 | 8 | Registered route with stat systems. | Keep advanced data from overwhelming first-week players. |
| Stat Central | 8 | 7 | 9 | 8 | Registered route and stat systems. | Add quick filters by team/player/era. |
| Record Book | 9 | 8 | 9 | 9 | Records, stat tracking, route, opt-in long-horizon record-book sanity budgets, and Game Day record/milestone archive CTA are shipped. | Add ceremony/storytelling after broken records only with saved inputs or a full writer path. |
| League News | 8 | 8 | 8 | 8 | News, newsroom, breaking-news, and story systems exist. | Make stories more often attach to decisions. |
| Newsroom digest | 8 | 8 | 8 | 8 | Route and feed systems exist. | Add "why this matters to me" team filters. |
| Social / MFSN | 8 | 8 | 8 | 8 | Social feed templates and transaction/game posts exist. | Let major posts become scrapbook entries. |
| Inbox badges / notifications | 8 | 7 | 8 | 8 | Shell badge guards and route-local counts exist. | Persist read/defer choices if players ask. |

### Governance, Rules, CBA, And League Control

| Feature | Effectiveness | Fun | Wiring | GOAT | Read | Best next lift |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| CBA negotiation | 9 | 8 | 10 | 9 | G5 browser smoke and governance tests cover negotiations/votes/effective years. | Keep old-save and cap-refresh coverage tied to changes. |
| Commissioner Office | 9 | 7 | 10 | 8 | G5 browser smoke proves route. | Add guided examples for non-power users. |
| League Rules | 8 | 7 | 9 | 8 | First-class nav route and rule systems exist. | Any rules that affect saves need migration/default coverage. |
| Labor interruptions | 8 | 8 | 9 | 8 | G5 covers labor interruption behavior. | Make interruption consequences clearer in weekly/offseason UI. |
| Cap refresh rules | 9 | 7 | 10 | 9 | G5 and contract systems cover cap refresh. | Keep cap deltas visible after rule changes. |
| Adaptive difficulty | 7 | 7 | 7 | 7 | Engine system exists. | Be conservative; do not hide rubber-banding from players. |

### Dynasty Memory, Legacy, Achievements, And World Flavor

| Feature | Effectiveness | Fun | Wiring | GOAT | Read | Best next lift |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Franchise Hub | 8 | 8 | 8 | 8 | Main dynasty route and subroutes exist. | Make it the emotional home for long saves. |
| Franchise Book | 7 | 8 | 7 | 7 | Direct route and hook systems exist; scrapbook now auto-carries saved records, awards, story arcs, season reports, HOF, bloodline draft, and heated rivalry moments separately. | Auto-author chapters from playoff lore, legends, and player arcs. |
| GM Career | 8 | 8 | 8 | 8 | Direct route and sidecar/career systems exist, and combined backup now carries the career sidecar with the cartridge. | Add stronger career milestones and decision CTAs. |
| Scrapbook | 8 | 8 | 9 | 8 | Route and sidecar systems exist; season rollover now carries saved league news, named games, bloodline draft memories, individual award winners, story-arc beats, season-report grades/overviews, record notes, HOF inductions, and heated league-rivalry chapters into scrapbook notable moments. | Keep extending from saved legends and postgame receipts without changing sidecar shape casually. |
| Hall of Fame | 8 | 9 | 8 | 8 | HOF directory/detail and engine systems exist; saved inductions now feed season scrapbook moments. | Better ceremony and player-story context. |
| Trophy Room | 8 | 8 | 8 | 8 | Direct route and trophy components exist. | Add championship route CTAs. |
| Franchise Eras | 8 | 8 | 8 | 8 | Era route/reveal systems exist. | Add era comparison summaries. |
| Franchise MVPs | 8 | 8 | 8 | 8 | Direct route and MVP plaque wall exist. | Link MVP seasons to player timelines. |
| Playoff Lore | 8 | 8 | 8 | 8 | Direct route and playoff-lore systems exist. | Bigger postgame pushes after playoff games. |
| Dynasty Chronicle | 8 | 8 | 8 | 8 | Chronicle route, filters, detail modal, and event systems exist. | Make it searchable and more automatically authored. |
| Legends | 8 | 9 | 8 | 8 | Route and franchise-legends systems exist. | Add "legend moment" story cards. |
| Legacy timeline | 7 | 8 | 8 | 7 | Route and legacy systems exist. | Needs more generated emotional moments. |
| Named Games | 8 | 9 | 8 | 8 | Direct route, named-game detection, source panel, and postgame archive CTA exist. | Add richer named-game follow-up only with saved inputs. |
| Bloodlines | 8 | 9 | 8 | 8 | Direct route, engine bloodline systems, scrapbook bloodline draft moments, and opt-in bloodline parent-reference budget checks passed 25/50-season proof. | Needs stronger family storytelling beyond draft-day memory. |
| Awards Hub | 8 | 8 | 9 | 8 | Route and awards systems exist; saved individual winners now feed season scrapbook moments. | Add awards-night ceremony flow and richer player-story context. |
| Achievements | 8 | 8 | 9 | 8 | Gallery/toast/save fields are wired. | Keep hidden achievements mystery-safe and truthful. |
| Rivalries | 8 | 9 | 8 | 8 | Player/league rivalry systems and sidecar heat-map work exist. | Durable all-time head-to-head persistence would be a GOAT upgrade. |
| Team/stadium/fan content | 8 | 8 | 9 | 8 | 32 team files, standalone stadium content, Zod schemas, inventory guards. | More stadium flavor only after current release priorities. |
| Chip art / poses | 9 | 9 | 9 | 9 | README documents 36 poses and procedural rig; design-system owns assets. | Add poses only when a new in-game state truly needs one. |
| Audio cues | 8 | 7 | 8 | 8 | Audio controller/assets/tests exist. | Keep accessibility and opt-in behavior strong. |

### Persistence, Settings, Meta, And Release Tooling

| Feature | Effectiveness | Fun | Wiring | GOAT | Read | Best next lift |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Autosave / current save | 10 | 6 | 10 | 9 | Persistence pipeline, Dexie, migration, Zod, and G4/G7 proof. | Do not touch without focused old-save/import tests. |
| Save slots | 10 | 6 | 10 | 9 | G3 proves local save-slot restore. | Clearer copy around slot vs cartridge vs sidecar. |
| Cartridge export/import | 10 | 7 | 10 | 9 | G3 proves copy/import/hard reload; migration/schema are tested, and `/dynasty` now adds `mfd.dynastyCombinedBackup.v1` around the existing `.mfd` cartridge plus sidecars without changing old `.mfd` compatibility. | Keep old-save/import and sidecar validation tests around any future backup UX changes. |
| Sidecar archive | 9 | 7 | 9 | 8 | Complete sidecar archive still works alone, and one-click combined backup now carries it with the cartridge after validating every sidecar payload. | Watch list/preferences remain intentionally outside the complete-dynasty sidecar archive unless a new privacy/portability decision says otherwise. |
| Save migrations | 10 | 4 | 10 | 9 | v1 to v37 chain, v36→v37 causal-spine migration, fixtures, defaults, drift tests, and current-version recovery guards. | Tighten loose schema islands gradually and keep v37 golden fixtures current. |
| Settings | 8 | 6 | 9 | 8 | Registered route, preferences, Chip/reduced-motion behavior. | Keep every preference persistent and reversible. |
| About / FAQ / Credits | 8 | 5 | 8 | 8 | Meta routes derive save version and explain product. | Keep copy aligned with source truth. |
| Command palette / keyboard shortcuts | 8 | 6 | 9 | 8 | App shell tests lock commands and keyboard ownership. | Expand command search only with real destinations. |
| Mobile nav / More drawer | 9 | 6 | 9 | 8 | G6 visual/focus/mobile smokes cover 480px. | Keep adding route-specific mobile checks after layout changes. |
| Accessibility states | 8 | 5 | 9 | 8 | G6 covers focus sweep, reduced motion, loading/empty/error/success states. | Improve route-by-route screen-reader labeling over time. |
| Release gate | 10 | 4 | 10 | 9 | `node scripts/release-gate.mjs` passed the complete 37/37 local contract in 1997.8s; CI calls the same command and uploads the exact Pages artifact after it passes. | Obtain the first remote `release-gate` pass from the real repository, make it protected, and retain exact-artifact deploy wiring. |
| Determinism / same-seed replay | 10 | 4 | 10 | 9 | G4 proves 10-season same-seed replay and save round trips; release-gate `goat-release-sentinel` passed focused long-horizon budget proof; opt-in `goat-25y` / `goat-50y` quality profiles passed full 25/50-season proof with 0 high anomalies. | Keep 25/50 profiles opt-in unless runtime changes, and reduce roster-minimum windows only through explicit balance work. |
| Bundle/build tooling | 9 | 4 | 9 | 8 | Production build and bundle-size gate are included. | Chunk-size polish only if delivery metrics require it. |
| Content loader / Zod schemas | 10 | 5 | 10 | 9 | Content fails fast at import and inventory guards classify JSON. | Never bypass loader ownership for "quick" content. |

## Highest-Leverage GOAT Bets

Recently shipped: Game Day Player Arc Follow-Up on `/game-day`; Draft Recap Class Follow-Through on `/draft-recap`; Week Advance Rookie Class Follow-Up on `/week-advance`; Draft Recap Player Profile Links on `/draft-recap`; Player Timeline Draft Recap Memory on `/player/$playerId/timeline`; Player Profile Draft Recap Signature Memory on `/player/$playerId`; Draft Post-Draft Recap CTA on `/draft`; Draft War-Room Durable Accepted-Trade Receipt through `leagueNews`; Draft War-Room Browser Accepted Offer Proof; Draft War-Room Real-Backed Offer Generation; Draft War-Room Live Order Ownership for accepted live draft trades; GOAT Release Sentinel Benchmark in the release gate; Position-Coach Tenure Source Clarity on `/coaching`; Position-Coach Season Tenure Rollover at championship rollover; Record-Memory Postgame CTA and Named-Game Postgame Memory CTA on `/game-day`; scrapbook auto-authoring through `buildScrapbookEntry` for saved league news, named games, bloodline draft events, individual award winners, story-arc beats, season reports, record notes, HOF inductions, and heated league rivalries; Position Coach Lifecycle Actions on `/coaching`; Postgame Decision Receipt on `/game-day`; opt-in Long-Horizon Quality Benchmark Proof (`goat-25y` / `goat-50y`) in playtesting tooling; Offseason Command Snapshot on `/week-advance`; Postgame Source Receipt on `/game-day`; CPU Strategy History on `/team-needs`; free-agency bid-resolution summaries on `/free-agency`; Draft Board market receipts on `/draft`; trade-deadline completed-deal receipts on `/trade-deadline`; FA target-board market receipts on `/fa-targets`; Trade Finder generated-offer receipts on `/trades`; trade-block AI market receipts; read-only CPU intent ledger on `/team-needs`; one-click combined backup package on `/dynasty` exports/imports the existing `.mfd` cartridge plus complete sidecar archive as `mfd.dynastyCombinedBackup.v1`; CI release-gate wiring also now runs `node scripts/release-gate.mjs` from `.github/workflows/ci.yml`.

1. Continue dynasty memory auto-authoring.
   Named games, saved league news, bloodline draft memories, individual award winners, story-arc beats, season-report grades/overviews, record notes, HOF inductions, and heated league rivalries now fold into season scrapbook entries, and Game Day now sends saved named games, record/milestone moments, and player-arc follow-up rows back to profile/archive screens. The next GOAT move is pushing legends and playoff swings back to the player automatically outside the already covered Game Day/draft surfaces.

2. Deepen postgame and offseason receipts.
   The player should leave every week knowing which roster, depth, training, cap, game-plan, morale, injury, owner, and scouting choices actually mattered. Game Day now has saved package source/decision receipts plus player-arc follow-up; future work should add new saved inputs or more emotional surfacing rather than repeating those panels.

3. Refresh and refine very-long-horizon quality proof.
   G4's double 10-season deterministic soak is release-grade, the short `goat-release-sentinel` profile runs inside the gate, opt-in `goat-25y` / `goat-50y` profiles are green, and the complete local 37/37 gate passed. Next work is remote/protected CI proof or explicit balance work that reduces medium roster-minimum repair windows without weakening the zero-shortage floor.

4. Expand staff identity beyond the shipped position-coach actions and tenure.
   Coaches already affect development, position-coach initialize/upgrade is manageable from `/coaching`, and existing position coaches now gain tenure at championship rollover. The next staff layer is position-coach poaching/history, coach-tree continuity, or career receipts.

5. Treat draft-day trade complexity as a trust zone.
   Draft is sacred. Post-draft recap CTA, durable accepted-trade receipts, browser accepted-offer proof, live-order ownership, real-backed generation, recap profile links, Draft Recap class follow-through, and Week Advance rookie follow-up are shipped: generated offers no longer fabricate non-live picks, future sweeteners require owned future picks, accepted current-year offers update pick ledgers and live draft order, stale accepts do not commit, accepted deals write `leagueNews` receipts, and a focused `/draft` smoke proves a future-sweetener accept plus receipt survives hard reload. Remaining work should focus on broader player arcs outside already covered draft/Game Day surfaces or broader gate refresh when draft behavior changes.

6. Extend AI behavior only with proof.
   Team Needs, Trade Block, Trade Center Trade Finder rows, Draft Board incoming offers, FA Target Board rows, completed deadline deals, free-agency bid results, and saved Strategy History now show saved/read-model reasons or outcomes. The next AI lift should either change behavior with downstream trade/FA/draft tests or add durable cross-window history with the full save-schema path.

## Next AI Operating Bible

Start here every time:

1. Read `AGENTS.md`.
2. Read `CODEX_GAME_GUIDE.md`.
3. Read `RELEASE_CONVERGENCE.md`.
4. Read the top of `STATUS.md`.
5. Read the touched source and tests before editing.
6. Confirm `SAVE_VERSION`, package manager, build artifact, and whether `.git` exists.

Use this priority order:

1. Correctness, save safety, deterministic sim integrity, broken routes, impossible user decisions.
2. High-frequency weekly clarity and end-to-end playable loop depth.
3. Football-ops trust: cap, trade, waiver, practice squad, FA, draft, roster, training, medical.
4. Dynasty memory and AI explainability.
5. Presentation, content expansion, flavor, and polish.

Do not casually touch:

- `SAVE_VERSION`, save schema, migrations, fixtures, or import/export.
- Week advance, offseason, draft, CBA, or cap math.
- Route tree/nav in `apps/web/src/app/App.tsx`.
- `game-store.ts` commit/autosave paths.
- Content loader ownership or raw JSON imports.
- Release gate scripts unless you are improving the gate itself.

Hard rule for persistent `GameState` changes:

Types, Zod schema, deterministic defaults, migration, old-save/import coverage, save round trip, focused tests, and rollback notes all ship together. No exceptions.

Hard rule for sim/math changes:

Centralized RNG only, deterministic sample coverage, before/after sanity output, no render-time randomness, and relevant soak/gate proof.

Hard rule for UI/Chip changes:

No filler. Tell the player what to do, why it matters, consequence/deadline, and where to act. Verify desktop and 480px/mobile behavior when layout changes.

## Copy-Paste Handoff Prompt For The Next AI

```text
/goal Continue Mr. Football Dynasty in /Users/tkevinbigham/MFD/MFD-main.

Start from the current green release-gate state, not from old assumptions. Read AGENTS.md, CODEX_GAME_GUIDE.md, RELEASE_CONVERGENCE.md, the top of STATUS.md, and MFD_GOAT_HANDOFF_BIBLE.md. Source/tests are truth; docs are maps.

Confirm cwd, .git availability, SAVE_VERSION, package manager, build artifact, and whether the release-gate CI job has a remote GitHub Actions pass. Pick exactly one high-leverage slice from the handoff bible. Do not redo Game Day Player Arc Follow-Up, Draft Recap Class Follow-Through, Week Advance Rookie Class Follow-Up, Draft Recap Player Profile Links, Player Timeline Draft Recap Memory, Player Profile Draft Recap Signature Memory, Draft Post-Draft Recap CTA, Draft War-Room Durable Accepted-Trade Receipt, Draft War-Room Browser Accepted Offer Proof, Draft War-Room Real-Backed Offer Generation, Draft War-Room Live Order Ownership, the one-click combined backup package, the `/team-needs` CPU intent ledger or Strategy History, `/coaching` Position Coach Lifecycle Actions, Position-Coach Season Tenure Rollover, Position-Coach Tenure Source Clarity, `/game-day` Postgame Source Receipt, Postgame Decision Receipt, Named-Game Memory CTA, Record-Memory Postgame CTA, or Player Arc Follow-Up, `/week-advance` Offseason Command Snapshot, GOAT Release Sentinel Benchmark, opt-in `goat-25y` / `goat-50y` benchmark profile wiring or completed 25/50 proof, league-news/named-game/bloodline-draft/award-winner/story-arc/season-report/record/HOF/rivalry scrapbook auto-authoring, `/trade-block` market receipts, `/trades` Trade Finder generated-offer receipts, `/fa-targets` FA market receipts, `/draft` Draft Market Receipts, `/trade-deadline` Deadline Deal Receipts, or `/free-agency` Bid Resolution Summary unless a regression is found. Prefer correctness, save safety, weekly clarity, football-ops trust, AI behavior proof, dynasty memory, remote 37-step gate receipt/protection, roster-minimum balance follow-through, player arcs outside already covered Game Day/draft surfaces, or deeper saved-input receipts over broad flavor/content expansion.

Before edits, state the slice contract: source owner, state touched, tests to run, browser proof if needed, docs touched, and rollback. Keep changes small and reversible. Persistent GameState changes require type + Zod + defaults + migration + old-save/import + determinism + round-trip tests. Sim math requires deterministic samples and RNG discipline.

After implementation, run focused tests, relevant typecheck/build, and the narrow browser smoke needed for the slice. Update docs/ledgers only when the shipped state changed. Do not call a gate green without repeatable evidence.
```

## Verification Menu

Use the narrowest relevant checks first:

- Engine focused tests: `corepack pnpm --filter @mfd/engine test -- --run <files>`
- Web focused tests: `corepack pnpm --filter @mfd/web test -- --run <files>`
- Web typecheck: `corepack pnpm --filter @mfd/web typecheck`
- Engine typecheck: `corepack pnpm --filter @mfd/engine typecheck`
- Chip-enabled production build: `VITE_CHIP_ENABLED=true corepack pnpm --filter @mfd/web build`
- Route/browser smoke: `VITE_CHIP_ENABLED=true SMOKE_TIMEOUT_MS=120000 node scripts/smoke-test-post-setup-route.mjs`
- Full release gate: `node scripts/release-gate.mjs`

Use full release gate after:

- save/schema/migration changes,
- week advance/offseason/draft/CBA/cap changes,
- route shell/navigation changes,
- release tooling changes,
- broad UI work affecting many routes,
- any fix that claims a release gate is now green.

## Current Non-Blocking Backlog

- Make the CI `release-gate` job a protected required check after its first remote GitHub Actions pass.
- Deeper CPU trade/FA/draft behavior only with focused downstream tests, or durable cross-window AI history only with schema/migration/import coverage. The read-only `/team-needs` Strategy History display is already shipped.
- Franchise book auto-authoring from playoff lore, legends, player arcs, and postgame/offseason receipts.
- Deeper postgame/offseason receipts that show exactly which decisions mattered beyond the shipped Game Day source/decision receipts and offseason-command source snapshot.
- Keep `goat-25y` / `goat-50y` stress profiles opt-in while the nightly 10-seed x 5-persona x 25/50/100 matrix carries hard certification; refresh the full 37-step gate whenever simulation, save, navigation, or release tooling changes.
- Position-coach poaching/history, coach-tree continuity, and stronger staff identity beyond the shipped initialize/upgrade/tenure/source actions.
- Draft-day trade/order transactional hardening.
- More ceremony payoff for Super Bowl, awards, Hall of Fame, and rival games.

## Final Guidance

The game is no longer a fragile prototype. Treat it like a release candidate with real player trust at stake.

Do not redo green gates for theater. Do rerun them when touched systems require it.

Do not add parallel state when selectors/store/engine already own the truth.

Do not make Chip louder unless Chip becomes clearer.

Do not expand content unless the core loop stays understandable.

Do make every week, every offseason, and every big player decision leave behind a reason the player remembers.
